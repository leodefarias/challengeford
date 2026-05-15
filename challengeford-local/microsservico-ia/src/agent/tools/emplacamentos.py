from __future__ import annotations

import logging
import sqlite3
from dataclasses import dataclass
from datetime import date, timedelta

from config import EMPLACAMENTOS_CACHE_DB

logger = logging.getLogger(__name__)

_CACHE_DAYS = 30  # dado mensal — TTL de 30 dias

# Estimativas baseadas em emplacamentos públicos ANFAVEA/Fenabrave — referência mai/2026
# Toyota Hilux lidera o segmento pickup há vários anos consecutivos no Brasil.
_SEED: dict[str, dict] = {
    "toyota_hilux": {
        "emplacamentos_mes": 4800,
        "emplacamentos_acum_ano": 19200,
        "posicao_segmento": 1,
    },
    "ford_ranger": {
        "emplacamentos_mes": 1900,
        "emplacamentos_acum_ano": 7600,
        "posicao_segmento": 2,
    },
    "chevrolet_s10": {
        "emplacamentos_mes": 1700,
        "emplacamentos_acum_ano": 6800,
        "posicao_segmento": 3,
    },
    "vw_amarok": {
        "emplacamentos_mes": 900,
        "emplacamentos_acum_ano": 3600,
        "posicao_segmento": 4,
    },
    "nissan_frontier": {
        "emplacamentos_mes": 700,
        "emplacamentos_acum_ano": 2800,
        "posicao_segmento": 5,
    },
    "mitsubishi_nova-triton": {
        "emplacamentos_mes": 380,
        "emplacamentos_acum_ano": 1520,
        "posicao_segmento": 6,
    },
}


@dataclass
class EmplacamentoResultado:
    marca: str
    modelo: str
    emplacamentos_mes: int
    emplacamentos_acum_ano: int
    posicao_segmento: int
    fonte: str
    data_consulta: date
    confianca: float = 0.8  # seed estimado — não oficial ANFAVEA


# ---------------------------------------------------------------------------
# Cache SQLite
# ---------------------------------------------------------------------------

def _init_cache() -> None:
    EMPLACAMENTOS_CACHE_DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(EMPLACAMENTOS_CACHE_DB) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS emplacamentos_cache (
                chave              TEXT PRIMARY KEY,
                marca              TEXT NOT NULL,
                modelo             TEXT NOT NULL,
                emplacamentos_mes  INTEGER NOT NULL,
                acum_ano           INTEGER NOT NULL,
                posicao_segmento   INTEGER NOT NULL,
                fonte              TEXT NOT NULL,
                data_consulta      TEXT NOT NULL
            )
        """)


def _cache_get(chave: str) -> EmplacamentoResultado | None:
    try:
        with sqlite3.connect(EMPLACAMENTOS_CACHE_DB) as conn:
            row = conn.execute(
                """SELECT marca, modelo, emplacamentos_mes, acum_ano,
                          posicao_segmento, fonte, data_consulta
                   FROM emplacamentos_cache WHERE chave = ?""",
                (chave,),
            ).fetchone()
        if not row:
            return None
        data_consulta = date.fromisoformat(row[6])
        if date.today() - data_consulta > timedelta(days=_CACHE_DAYS):
            return None
        return EmplacamentoResultado(
            marca=row[0],
            modelo=row[1],
            emplacamentos_mes=row[2],
            emplacamentos_acum_ano=row[3],
            posicao_segmento=row[4],
            fonte=row[5],
            data_consulta=data_consulta,
        )
    except Exception as exc:
        logger.debug("Emplacamentos cache read error: %s", exc)
        return None


def _cache_set(chave: str, resultado: EmplacamentoResultado) -> None:
    try:
        with sqlite3.connect(EMPLACAMENTOS_CACHE_DB) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO emplacamentos_cache
                   (chave, marca, modelo, emplacamentos_mes, acum_ano,
                    posicao_segmento, fonte, data_consulta)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    chave,
                    resultado.marca,
                    resultado.modelo,
                    resultado.emplacamentos_mes,
                    resultado.emplacamentos_acum_ano,
                    resultado.posicao_segmento,
                    resultado.fonte,
                    resultado.data_consulta.isoformat(),
                ),
            )
    except Exception as exc:
        logger.debug("Emplacamentos cache write error: %s", exc)


# ---------------------------------------------------------------------------
# Lookup
# ---------------------------------------------------------------------------

def _chave(marca: str, modelo: str) -> str:
    return f"{marca}_{modelo}".lower().replace(" ", "_").replace("-", "-")


async def buscar_emplacamentos(marca: str, modelo: str) -> EmplacamentoResultado | None:
    """Retorna dados de emplacamentos para marca/modelo. Usa cache 30 dias + seed estático."""
    _init_cache()

    chave = _chave(marca, modelo)

    # Cache
    cached = _cache_get(chave)
    if cached:
        logger.info("Emplacamentos cache hit: %s → %d/mês", chave, cached.emplacamentos_mes)
        return cached

    # Seed estático
    seed = _SEED.get(chave)
    if seed:
        resultado = EmplacamentoResultado(
            marca=marca.lower(),
            modelo=modelo,
            emplacamentos_mes=seed["emplacamentos_mes"],
            emplacamentos_acum_ano=seed["emplacamentos_acum_ano"],
            posicao_segmento=seed["posicao_segmento"],
            fonte="seed_anfavea_mai2026",
            data_consulta=date.today(),
        )
        _cache_set(chave, resultado)
        logger.info("Emplacamentos seed: %s → %d/mês (pos. %d)", chave, resultado.emplacamentos_mes, resultado.posicao_segmento)
        return resultado

    logger.warning("Emplacamentos: nenhum dado para %s", chave)
    return None
