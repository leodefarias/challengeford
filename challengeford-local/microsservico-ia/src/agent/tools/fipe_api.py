from __future__ import annotations

# pip install httpx

import logging
import re
import sqlite3
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

import httpx

from config import FIPE_CACHE_DB

logger = logging.getLogger(__name__)

_FIPE_API_PRIMARY = "https://parallelum.com.br/fipe/api/v1"
_FIPE_API_FALLBACK = "https://fipe.parallelum.com.br/api/v1"

_FIPE_CACHE_DAYS = 7
_PRECO_MIN_BRL = 80_000
_PRECO_MAX_BRL = 1_500_000
_PRECO_MIN_PICKUP_NOVO = 180_000  # abaixo disso = proxy de carro usado, rejeitar

# Formato: {modelo_key: {"marca": cod_marca, "modelo": cod_modelo, "ano": cod_ano}}
# Códigos obtidos via API FIPE em maio/2026
CODIGOS_FIPE: dict[str, dict[str, str]] = {
    "ford_ranger_raptor":           {"marca": "22", "modelo": "10891", "ano": "2026-1"},
    "toyota_hilux_gr-s":            {"marca": "56", "modelo": "8554",  "ano": "2024-3"},
    "vw_amarok_v6_extreme":         {"marca": "59", "modelo": "9895",  "ano": "2026-3"},
    "chevrolet_s10_high_country":   {"marca": "23", "modelo": "7305",  "ano": "2024-3"},
    # Nova-Triton: lookup dinâmico na API (não usar proxy L200 2017)
    "mitsubishi_nova-triton_hpe-s": {"marca": "41", "lookup": "triton"},
    "nissan_frontier_pro-4x":       {"marca": "43", "modelo": "9792",  "ano": "2024-3"},
}

_HEADERS = {
    "User-Agent": "ford-catalog-poc/1.0",
    "Accept": "application/json",
}


@dataclass
class FipeResultado:
    preco_brl: int
    mes_referencia: str
    codigo_fipe: str
    fonte: str
    data_consulta: date
    confianca: float = 1.0


# ---------------------------------------------------------------------------
# Cache SQLite
# ---------------------------------------------------------------------------

def _init_cache() -> None:
    FIPE_CACHE_DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(FIPE_CACHE_DB) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS fipe_cache (
                codigo_fipe  TEXT PRIMARY KEY,
                preco_brl    INTEGER NOT NULL,
                mes_referencia TEXT NOT NULL,
                fonte        TEXT NOT NULL,
                data_consulta TEXT NOT NULL
            )
        """)


def _cache_get(codigo_fipe: str) -> FipeResultado | None:
    try:
        with sqlite3.connect(FIPE_CACHE_DB) as conn:
            row = conn.execute(
                "SELECT preco_brl, mes_referencia, fonte, data_consulta FROM fipe_cache WHERE codigo_fipe = ?",
                (codigo_fipe,),
            ).fetchone()
        if not row:
            return None
        data_consulta = date.fromisoformat(row[3])
        if date.today() - data_consulta > timedelta(days=_FIPE_CACHE_DAYS):
            return None
        return FipeResultado(
            preco_brl=row[0],
            mes_referencia=row[1],
            codigo_fipe=codigo_fipe,
            fonte=row[2],
            data_consulta=data_consulta,
        )
    except Exception as exc:
        logger.debug("Cache read error: %s", exc)
        return None


def _cache_set(resultado: FipeResultado) -> None:
    try:
        with sqlite3.connect(FIPE_CACHE_DB) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO fipe_cache
                   (codigo_fipe, preco_brl, mes_referencia, fonte, data_consulta)
                   VALUES (?, ?, ?, ?, ?)""",
                (resultado.codigo_fipe, resultado.preco_brl, resultado.mes_referencia,
                 resultado.fonte, resultado.data_consulta.isoformat()),
            )
    except Exception as exc:
        logger.debug("Cache write error: %s", exc)


# ---------------------------------------------------------------------------
# Normalização de preço
# ---------------------------------------------------------------------------

def _normalizar_preco(valor_str: str) -> int | None:
    limpo = re.sub(r"[R$\s]", "", str(valor_str))
    limpo = limpo.replace(".", "").replace(",", ".")
    try:
        return int(float(limpo))
    except (ValueError, TypeError):
        return None


def _validar_preco(preco: int) -> float:
    if preco < _PRECO_MIN_PICKUP_NOVO:
        logger.warning("FIPE: R$ %d abaixo do mínimo para pickup nova — provavelmente proxy de carro usado, rejeitado", preco)
        return 0.0
    if _PRECO_MIN_BRL <= preco <= _PRECO_MAX_BRL:
        return 1.0
    logger.warning("FIPE: R$ %d fora do range esperado para pickup BR", preco)
    return 0.3


# ---------------------------------------------------------------------------
# Requisições HTTP
# ---------------------------------------------------------------------------

async def _get_json(url: str) -> dict | None:
    try:
        async with httpx.AsyncClient(headers=_HEADERS, timeout=15) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        logger.debug("HTTP GET falhou %s: %s", url, exc)
        return None


async def _buscar_por_config(config: dict, base_url: str) -> FipeResultado | None:
    """Busca preço usando os códigos de marca/modelo/ano da config."""
    cod_marca = config.get("marca", "")
    cod_modelo = config.get("modelo", "")
    cod_ano = config.get("ano", "")
    if not (cod_marca and cod_modelo and cod_ano):
        return None

    url = f"{base_url}/carros/marcas/{cod_marca}/modelos/{cod_modelo}/anos/{cod_ano}"
    data = await _get_json(url)
    if not data:
        return None

    valor_str = data.get("Valor") or data.get("valor", "")
    preco = _normalizar_preco(str(valor_str))
    if preco is None:
        return None

    mes_referencia = data.get("MesReferencia") or data.get("mesReferencia", "")
    codigo_fipe = data.get("CodigoFipe") or data.get("codigoFipe", f"{cod_marca}-{cod_modelo}")
    confianca = _validar_preco(preco)

    if confianca == 0.0:
        return None

    return FipeResultado(
        preco_brl=preco,
        mes_referencia=str(mes_referencia),
        codigo_fipe=str(codigo_fipe),
        fonte=base_url,
        data_consulta=date.today(),
        confianca=confianca,
    )


async def _lookup_config(config: dict, base_url: str) -> dict | None:
    """Resolve marca/modelo/ano via listagem da API quando `lookup` está definido."""
    termo = (config.get("lookup") or "").lower()
    cod_marca = config.get("marca", "")
    if not termo or not cod_marca:
        return None
    data = await _get_json(f"{base_url}/carros/marcas/{cod_marca}/modelos")
    if not data:
        return None
    modelos = data.get("modelos") or data.get("Modelos") or []
    candidatos = []
    for m in modelos:
        nome = str(m.get("nome") or m.get("name") or "").lower()
        codigo = str(m.get("codigo") or m.get("code") or "")
        if termo in nome and codigo:
            score = 0
            if "hpe" in nome:
                score += 2
            if "triton" in nome:
                score += 2
            if "l200" in nome and "2017" in nome:
                score -= 5
            candidatos.append((score, codigo, nome))
    if not candidatos:
        logger.warning("FIPE lookup: nenhum modelo contendo %r na marca %s", termo, cod_marca)
        return None
    candidatos.sort(reverse=True)
    _, cod_modelo, nome = candidatos[0]
    anos = await _get_json(f"{base_url}/carros/marcas/{cod_marca}/modelos/{cod_modelo}/anos")
    if not isinstance(anos, list) or not anos:
        return None
    # Prefere anos 2024+ diesel/gasolina (código tipo YYYY-N)
    def _ano_rank(item: dict) -> tuple:
        codigo = str(item.get("codigo") or "")
        ano = int(codigo.split("-")[0]) if codigo[:4].isdigit() else 0
        return (ano, 1 if codigo.endswith("-3") else 0)

    anos_ok = [a for a in anos if _ano_rank(a)[0] >= 2020]
    escolhido = max(anos_ok or anos, key=_ano_rank)
    return {
        "marca": cod_marca,
        "modelo": cod_modelo,
        "ano": str(escolhido.get("codigo") or ""),
        "nome": nome,
    }


async def buscar_preco(marca: str, modelo: str, versao: str, ano: int = 2025) -> FipeResultado | None:
    _init_cache()

    key = f"{marca}_{modelo}_{versao}".lower().replace(" ", "_")
    config = CODIGOS_FIPE.get(key, {})
    if not config:
        logger.warning("FIPE: nenhuma config para %s", key)
        return None

    if config.get("lookup"):
        resolved = await _lookup_config(config, _FIPE_API_PRIMARY) or await _lookup_config(config, _FIPE_API_FALLBACK)
        if not resolved:
            logger.warning("FIPE: lookup falhou para %s — não sobrescrever preço seed", key)
            return None
        config = {**config, **resolved}

    codigo_cache = f"{config.get('marca','')}-{config.get('modelo','')}"

    # 1. Cache
    cached = _cache_get(codigo_cache)
    if cached:
        logger.info("FIPE cache hit: %s → R$ %d", key, cached.preco_brl)
        return cached

    # 2. API primária
    resultado = await _buscar_por_config(config, _FIPE_API_PRIMARY)
    if resultado:
        logger.info("FIPE primária: %s → R$ %d (conf=%.1f)", key, resultado.preco_brl, resultado.confianca)
        _cache_set(resultado)
        return resultado

    # 3. Fallback
    resultado = await _buscar_por_config(config, _FIPE_API_FALLBACK)
    if resultado:
        logger.info("FIPE fallback: %s → R$ %d", key, resultado.preco_brl)
        _cache_set(resultado)
        return resultado

    logger.warning("FIPE: preço não encontrado para %s", key)
    return None


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)

    async def _test():
        _init_cache()

        # Teste de normalização
        casos = [
            ("R$ 469.990,00", 469_990),
            ("R$340.000,00", 340_000),
            ("260990", 260_990),
            ("R$ 1.200.000,00", 1_200_000),
        ]
        print("=== Teste de normalização ===")
        for entrada, esperado in casos:
            resultado = _normalizar_preco(entrada)
            status = "OK" if resultado == esperado else f"ERRO (esperado {esperado})"
            print(f"  {entrada!r:25} → {resultado}  {status}")

        print("\n=== Teste de validação de range ===")
        for preco in [50_000, 200_000, 469_990, 2_000_000]:
            conf = _validar_preco(preco)
            print(f"  R$ {preco:>10,} → confiança={conf}")

        print("\n=== Códigos FIPE cadastrados ===")
        for key, config in CODIGOS_FIPE.items():
            status = "preenchido" if config.get("codigo") else "PENDENTE"
            print(f"  {key}: {status}")

    asyncio.run(_test())
