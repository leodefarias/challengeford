from __future__ import annotations

import logging
import time
from datetime import date, datetime
from typing import Any

from config import MIN_COBERTURA_PARA_KB
from knowledge_base.kb_manager import KBManager
from llm_client import get_llm_client
from schema import (
    ATRIBUTOS_CORE,
    RANGES_SEGMENTO,
    AtributoMeta,
    CatalogoCompleto,
    CatalogoSchema,
    FonteSecundaria,
    ResultadoExtracao,
    TermoDesconhecido,
)

logger = logging.getLogger(__name__)

_CONFIANCA_POR_FONTE = {
    "pdf_oficial": 1.0,
    "site_oficial": 0.85,
    "fipe": 0.90,
    "review_br": 0.75,
    "youtube": 0.50,
    "global": 0.40,
}

_DOMINIO_BR = {
    "ford.com.br", "toyota.com.br", "vw.com.br", "chevrolet.com.br",
    "mitsubishimotors.com.br", "nissan.com.br", "media.toyota.com.br",
    "vw-digital-cdn-br.itd.vw.com.br",
}


def _is_mercado_br(fonte: str) -> bool:
    return any(d in fonte for d in _DOMINIO_BR)


def _calcular_confianca_fonte(tipo_fonte: str) -> float:
    return _CONFIANCA_POR_FONTE.get(tipo_fonte, 0.5)


def _resolver_conflito(
    valor_pdf: Any, valor_site: Any, atributo: str
) -> tuple[Any, float, bool]:
    """Retorna (valor_final, confiança, divergente)."""
    if valor_pdf is None and valor_site is None:
        return None, 0.0, False
    if valor_pdf is None:
        return valor_site, _calcular_confianca_fonte("site_oficial"), False
    if valor_site is None:
        return valor_pdf, _calcular_confianca_fonte("pdf_oficial"), False

    # Ambos têm valor — verifica divergência
    if isinstance(valor_pdf, (int, float)) and isinstance(valor_site, (int, float)):
        if valor_pdf == 0:
            return valor_site, _calcular_confianca_fonte("site_oficial"), False
        divergencia = abs(valor_pdf - valor_site) / abs(valor_pdf)
        if divergencia > 0.05:
            logger.info("Conflito em %s: PDF=%s site=%s (%.1f%%) → PDF prevalece", atributo, valor_pdf, valor_site, divergencia * 100)
            return valor_pdf, _calcular_confianca_fonte("pdf_oficial"), True
        else:
            media = (valor_pdf + valor_site) / 2
            return (int(media) if isinstance(valor_pdf, int) else media), 0.9, False

    # Strings/bools — PDF prevalece
    if valor_pdf != valor_site:
        return valor_pdf, _calcular_confianca_fonte("pdf_oficial"), True
    return valor_pdf, 0.95, False


def _validar_valor(atributo: str, valor: Any) -> Any:
    """Retorna None se valor estiver fora do range esperado."""
    if valor is None:
        return None
    intervalo = RANGES_SEGMENTO.get(atributo)
    if intervalo and isinstance(valor, (int, float)):
        minv, maxv = intervalo
        if not (minv <= valor <= maxv):
            logger.warning("Valor fora do range: %s=%s (esperado %s–%s)", atributo, valor, minv, maxv)
            return None
    return valor


def _normalizar_bool(valor: Any) -> bool | None:
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, str):
        if valor.lower() in ("true", "sim", "yes", "1", "s"):
            return True
        if valor.lower() in ("false", "não", "no", "0", "n"):
            return False
    if isinstance(valor, int):
        return bool(valor)
    return None


def _mesclar_extraido(base: dict, novo: dict, fonte_tipo: str, fonte_url: str) -> dict:
    """Mescla valores extraídos pelo LLM com resolução de conflitos."""
    resultado = dict(base)
    for atributo, valor in novo.items():
        if valor is None:
            continue
        valor_existente = resultado.get(atributo)
        if valor_existente is None:
            resultado[atributo] = {"valor": valor, "fonte": fonte_url, "tipo_fonte": fonte_tipo, "fontes_sec": []}
        else:
            val_final, _, divergente = _resolver_conflito(valor_existente["valor"], valor, atributo)
            resultado[atributo] = {
                "valor": val_final,
                "fonte": valor_existente["fonte"],
                "tipo_fonte": valor_existente["tipo_fonte"],
                "fontes_sec": valor_existente["fontes_sec"] + [{
                    "url": fonte_url, "valor": valor,
                    "status": "diverge" if divergente else "confirma",
                    "confianca": _calcular_confianca_fonte(fonte_tipo),
                }],
            }
    return resultado


class AgenteCatalogo:
    def __init__(self, kb: KBManager | None = None) -> None:
        self._kb = kb or KBManager()
        self._llm = get_llm_client()

    async def processar(self, marca: str, modelo: str, versao: str) -> ResultadoExtracao:
        inicio = time.time()
        log: list[str] = []
        termos_desconhecidos: list[TermoDesconhecido] = []
        atributos_brutos: dict[str, dict] = {}
        fontes_utilizadas: list[str] = []

        log.append(f"Iniciando extração: {marca} {modelo} {versao}")
        logger.info("=== Agente: %s %s %s ===", marca, modelo, versao)

        # ------------------------------------------------------------------
        # PASSO 1 — PERCEPÇÃO: contexto CRAG inicial
        # ------------------------------------------------------------------
        atributos_faltantes = list(ATRIBUTOS_CORE)
        contexto_rag = self._kb.construir_contexto_crag(marca, modelo, versao, atributos_faltantes)
        log.append(f"Contexto CRAG construído ({len(contexto_rag)} chars)")

        # ------------------------------------------------------------------
        # PASSO 2 — COLETA PDF
        # ------------------------------------------------------------------
        texto_pdf = ""
        tipo_pdf = ""
        pdf_fonte_url = ""
        try:
            from agent.tools.pdf_extractor import download_pdf, extrair_texto_pdf, calcular_hash_pdf
            pdf_path = await download_pdf(marca, modelo, versao)
            if pdf_path:
                texto_pdf, tipo_pdf = extrair_texto_pdf(pdf_path)
                pdf_fonte_url = f"file://{pdf_path}"
                fontes_utilizadas.append(pdf_fonte_url)
                log.append(f"PDF extraído: tipo={tipo_pdf}, {len(texto_pdf)} chars")
            else:
                log.append("PDF não disponível para esta montadora")
        except Exception as exc:
            logger.warning("Erro na coleta PDF: %s", exc)
            log.append(f"PDF: erro ignorado — {exc}")

        # ------------------------------------------------------------------
        # PASSO 3 — COLETA SITE
        # ------------------------------------------------------------------
        texto_site = ""
        site_fonte_url = ""
        try:
            from agent.tools.site_scraper import scrape, ScraperBloqueadoError
            resultado_scrape = await scrape(marca, modelo, versao)
            if resultado_scrape:
                texto_site = resultado_scrape.get("texto_estruturado", "")
                site_fonte_url = resultado_scrape.get("fonte", f"https://site.oficial.{marca.lower()}.com.br")
                fontes_utilizadas.append(site_fonte_url)
                log.append(f"Site extraído: {len(texto_site)} chars, seções={resultado_scrape.get('secoes', [])}")
            else:
                log.append("Site: nenhum conteúdo retornado")
        except Exception as exc:
            if "ScraperBloqueadoError" in type(exc).__name__ or isinstance(exc, Exception):
                logger.warning("Scraper bloqueado para %s: %s", marca, exc)
                log.append(f"Site bloqueado: {exc}")

        # ------------------------------------------------------------------
        # PASSO 4 — COLETA FIPE
        # ------------------------------------------------------------------
        fipe_resultado = None
        try:
            from agent.tools.fipe_api import buscar_preco
            fipe_resultado = await buscar_preco(marca, modelo, versao)
            if fipe_resultado:
                fontes_utilizadas.append(fipe_resultado.fonte)
                log.append(f"FIPE: R$ {fipe_resultado.preco_brl:,} (conf={fipe_resultado.confianca})")
            else:
                log.append("FIPE: preço não encontrado (código pendente)")
        except Exception as exc:
            logger.warning("Erro FIPE: %s", exc)
            log.append(f"FIPE: erro — {exc}")

        # ------------------------------------------------------------------
        # PASSO 5 — EXTRAÇÃO LLM + RAG (por fonte)
        # ------------------------------------------------------------------
        if texto_pdf:
            log.append("LLM extraindo do PDF...")
            try:
                resultado_llm = self._llm.extrair(texto_pdf, contexto_rag, versao)
                atribs = resultado_llm.get("atributos", {})
                atributos_brutos = _mesclar_extraido(atributos_brutos, atribs, "pdf_oficial", pdf_fonte_url)
                for t in resultado_llm.get("termos_desconhecidos", []):
                    termos_desconhecidos.append(TermoDesconhecido(
                        termo=t.get("termo", ""),
                        contexto=t.get("contexto", ""),
                        atributo_sugerido=t.get("atributo_sugerido"),
                        fonte=pdf_fonte_url,
                        data_detectado=date.today(),
                    ))
                log.append(f"PDF LLM: {len(atribs)} atributos extraídos")
            except Exception as exc:
                logger.warning("LLM PDF falhou: %s", exc)
                log.append(f"LLM PDF: erro — {exc}")

        # ------------------------------------------------------------------
        # PASSO 5.5 — CRAG REBUILD: contexto focado nos gaps pós-PDF
        # ------------------------------------------------------------------
        contexto_rag_site = contexto_rag
        if texto_site:
            gaps_apos_pdf = [
                a for a in ATRIBUTOS_CORE
                if atributos_brutos.get(a, {}).get("valor") is None
            ]
            if gaps_apos_pdf:
                contexto_rag_site = self._kb.construir_contexto_crag(
                    marca, modelo, versao, gaps_apos_pdf
                )
                log.append(f"CRAG context rebuilt for site: focusing on {len(gaps_apos_pdf)} gaps")
            else:
                log.append("Passo 5.5: PDF preencheu todos os atributos core — contexto site omitido")

        if texto_site:
            log.append("LLM extraindo do site...")
            try:
                resultado_llm = self._llm.extrair(texto_site, contexto_rag_site, versao)
                atribs = resultado_llm.get("atributos", {})
                atributos_brutos = _mesclar_extraido(atributos_brutos, atribs, "site_oficial", site_fonte_url)
                for t in resultado_llm.get("termos_desconhecidos", []):
                    termos_desconhecidos.append(TermoDesconhecido(
                        termo=t.get("termo", ""),
                        contexto=t.get("contexto", ""),
                        atributo_sugerido=t.get("atributo_sugerido"),
                        fonte=site_fonte_url,
                        data_detectado=date.today(),
                    ))
                log.append(f"Site LLM: {len(atribs)} atributos extraídos")
            except Exception as exc:
                logger.warning("LLM site falhou: %s", exc)
                log.append(f"LLM site: erro — {exc}")

        # ------------------------------------------------------------------
        # PASSO 6 — NORMALIZAÇÃO via terminology map + validação pós-LLM
        # ------------------------------------------------------------------
        atributos_finais: dict[str, Any] = {}
        metadados: dict[str, AtributoMeta] = {}

        for atributo, info in atributos_brutos.items():
            valor_raw = info.get("valor")
            fonte_url = info.get("fonte", "")
            tipo_fonte = info.get("tipo_fonte", "site_oficial")

            # Normaliza booleans vindos como string
            campo_schema = CatalogoSchema.model_fields.get(atributo)
            if campo_schema:
                annotation = str(campo_schema.annotation)
                if "bool" in annotation:
                    valor_raw = _normalizar_bool(valor_raw)

            # Terminologia map
            if isinstance(valor_raw, str):
                mapeamento = self._kb.buscar_terminologia(valor_raw)
                if mapeamento:
                    log.append(f"Terminologia: '{valor_raw}' → {mapeamento}")
                    for k, v in mapeamento.items():
                        if k == atributo:
                            valor_raw = v

            # Validação de range
            valor_validado = _validar_valor(atributo, valor_raw)
            if valor_raw is not None and valor_validado is None:
                log.append(f"Anomalia detectada: {atributo}={valor_raw} — descartado")

            atributos_finais[atributo] = valor_validado

            fontes_sec = [
                FonteSecundaria(
                    url=f["url"],
                    valor=f["valor"],
                    status=f["status"],
                    confianca=f["confianca"],
                )
                for f in info.get("fontes_sec", [])
            ]

            metadados[atributo] = AtributoMeta(
                atributo=atributo,
                valor=valor_validado,
                confianca=_calcular_confianca_fonte(tipo_fonte),
                fonte_primaria=fonte_url,
                fontes_secundarias=fontes_sec,
                mercado_confirmado_br=_is_mercado_br(fonte_url),
                divergente=any(f.status == "diverge" for f in fontes_sec),
                schema_nivel="core" if atributo in ATRIBUTOS_CORE else "estendido",
            )

        # Injeta preço FIPE
        if fipe_resultado:
            atributos_finais["preco_tabela_brl"] = fipe_resultado.preco_brl
            atributos_finais["data_referencia_preco"] = fipe_resultado.data_consulta
            metadados["preco_tabela_brl"] = AtributoMeta(
                atributo="preco_tabela_brl",
                valor=fipe_resultado.preco_brl,
                confianca=fipe_resultado.confianca,
                fonte_primaria=fipe_resultado.fonte,
                mercado_confirmado_br=True,
                schema_nivel="core",
            )

        # Injeta identificação obrigatória
        atributos_finais.update({"marca": marca.lower(), "modelo": modelo, "versao": versao, "ano_modelo": 2025, "segmento": "pickup"})

        # ------------------------------------------------------------------
        # PASSO 7 — MONTA CatalogoSchema (ignora campos inválidos)
        # ------------------------------------------------------------------
        try:
            schema_valido = {k: v for k, v in atributos_finais.items() if k in CatalogoSchema.model_fields}
            catalogo_schema = CatalogoSchema(**schema_valido)
        except Exception as exc:
            logger.error("Erro ao montar CatalogoSchema: %s", exc)
            catalogo_schema = CatalogoSchema(marca=marca.lower(), modelo=modelo, versao=versao, ano_modelo=2025, segmento="pickup")

        # ------------------------------------------------------------------
        # PASSO 7.5 — FALLBACK KB: preenche gaps ATRIBUTOS_CORE com seed
        # ------------------------------------------------------------------
        core_live = [a for a in ATRIBUTOS_CORE if getattr(catalogo_schema, a, None) is not None]
        cobertura_live = len(core_live) / len(ATRIBUTOS_CORE)
        log.append(f"Cobertura live (antes do seed KB): {len(core_live)}/{len(ATRIBUTOS_CORE)} ({cobertura_live:.0%})")

        gaps_apos_llm = [a for a in ATRIBUTOS_CORE if getattr(catalogo_schema, a, None) is None]
        if gaps_apos_llm:
            valores_kb = self._kb.buscar_valores_kb(marca, modelo, versao, gaps_apos_llm)
            if valores_kb:
                schema_dict = catalogo_schema.model_dump()
                for atrib, valor in valores_kb.items():
                    if schema_dict.get(atrib) is None:
                        schema_dict[atrib] = valor
                        metadados[atrib] = AtributoMeta(
                            atributo=atrib,
                            valor=valor,
                            confianca=0.85,
                            fonte_primaria="kb_seed",
                            mercado_confirmado_br=True,
                            schema_nivel="core",
                        )
                        log.append(f"KB seed: {atrib}={valor}")
                try:
                    catalogo_schema = CatalogoSchema(**{k: v for k, v in schema_dict.items() if k in CatalogoSchema.model_fields})
                except Exception as exc:
                    logger.warning("Erro ao aplicar KB seed: %s", exc)

        # ------------------------------------------------------------------
        # PASSO 8 — CALCULA COBERTURA
        # ------------------------------------------------------------------
        core_preenchidos = [
            a for a in ATRIBUTOS_CORE if getattr(catalogo_schema, a, None) is not None
        ]
        cobertura_pct = len(core_preenchidos) / len(ATRIBUTOS_CORE)

        if cobertura_pct >= 0.9:
            status = "completo"
        elif cobertura_pct >= 0.7:
            status = "parcial"
        else:
            status = "pendente_revisao"

        gaps = [a for a in ATRIBUTOS_CORE if getattr(catalogo_schema, a, None) is None]
        log.append(f"Cobertura core: {len(core_preenchidos)}/{len(ATRIBUTOS_CORE)} ({cobertura_pct:.0%}) — status={status}")
        if gaps:
            log.append(f"Gaps restantes: {', '.join(gaps)}")

        # ------------------------------------------------------------------
        # PASSO 9 — ENRIQUECE KB
        # ------------------------------------------------------------------
        catalogo_completo = CatalogoCompleto(
            schema=catalogo_schema,
            metadados=metadados,
            cobertura_pct=cobertura_pct,
            status=status,
            data_extracao=datetime.now(),
            fontes_utilizadas=fontes_utilizadas,
        )

        if cobertura_pct >= MIN_COBERTURA_PARA_KB:
            try:
                self._kb.adicionar_catalogo_validado(catalogo_completo)
                log.append("KB enriquecida com catálogo validado")
            except Exception as exc:
                logger.warning("Erro ao enriquecer KB: %s", exc)

        # ------------------------------------------------------------------
        # RESULTADO
        # ------------------------------------------------------------------
        elapsed = time.time() - inicio
        log.append(f"Processamento concluído em {elapsed:.1f}s")
        logger.info("Agente finalizado: %s %s — %.0f%% cobertura em %.1fs", modelo, versao, cobertura_pct * 100, elapsed)

        return ResultadoExtracao(
            catalogo=catalogo_completo,
            termos_desconhecidos=termos_desconhecidos,
            gaps_restantes=gaps,
            log_decisoes=log,
            cobertura_live_pct=cobertura_live,
        )


if __name__ == "__main__":
    import asyncio
    import json
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )

    async def _main():
        kb = KBManager()
        kb.inicializar()

        agente = AgenteCatalogo(kb=kb)
        resultado = await agente.processar("nissan", "Frontier", "PRO-4X")

        print("\n" + "=" * 60)
        print("RESULTADO DA EXTRAÇÃO")
        print("=" * 60)
        print(f"Status:    {resultado.catalogo.status}")
        print(f"Cobertura: {resultado.catalogo.cobertura_pct:.0%}")
        print(f"Fontes:    {resultado.catalogo.fontes_utilizadas}")
        print(f"Gaps:      {resultado.gaps_restantes}")
        print(f"\nSchema preenchido:")
        schema_dict = resultado.catalogo.schema.model_dump(exclude_none=True)
        print(json.dumps(schema_dict, indent=2, default=str, ensure_ascii=False))
        print(f"\nTermos desconhecidos: {len(resultado.termos_desconhecidos)}")
        for t in resultado.termos_desconhecidos:
            print(f"  - {t.termo!r} ({t.atributo_sugerido})")
        print(f"\nLog de decisões:")
        for entrada in resultado.log_decisoes:
            print(f"  [{entrada}]")

    asyncio.run(_main())
