"""Mescla de atributos extraídos de múltiplas fontes (sem dependências pesadas)."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_CONFIANCA_POR_FONTE = {
    "pdf_oficial": 1.0,
    "site_oficial": 0.85,
    "fipe": 0.90,
    "review_br": 0.75,
    "youtube": 0.50,
    "global": 0.40,
}


def calcular_confianca_fonte(tipo_fonte: str) -> float:
    return _CONFIANCA_POR_FONTE.get(tipo_fonte, 0.5)


def resolver_conflito(
    valor_pdf: Any, valor_site: Any, atributo: str
) -> tuple[Any, float, bool]:
    """Retorna (valor_final, confiança, divergente)."""
    if valor_pdf is None and valor_site is None:
        return None, 0.0, False
    if valor_pdf is None:
        return valor_site, calcular_confianca_fonte("site_oficial"), False
    if valor_site is None:
        return valor_pdf, calcular_confianca_fonte("pdf_oficial"), False

    if isinstance(valor_pdf, (int, float)) and isinstance(valor_site, (int, float)):
        if valor_pdf == 0:
            return valor_site, calcular_confianca_fonte("site_oficial"), False
        divergencia = abs(valor_pdf - valor_site) / abs(valor_pdf)
        if divergencia > 0.05:
            logger.info(
                "Conflito em %s: PDF=%s site=%s (%.1f%%) → PDF prevalece",
                atributo, valor_pdf, valor_site, divergencia * 100,
            )
            return valor_pdf, calcular_confianca_fonte("pdf_oficial"), True
        media = (valor_pdf + valor_site) / 2
        return (int(media) if isinstance(valor_pdf, int) else media), 0.9, False

    if valor_pdf != valor_site:
        return valor_pdf, calcular_confianca_fonte("pdf_oficial"), True
    return valor_pdf, 0.95, False


def mesclar_extraido(base: dict, novo: dict, fonte_tipo: str, fonte_url: str) -> dict:
    """Mescla valores extraídos pelo LLM com resolução de conflitos."""
    resultado = dict(base)
    for atributo, valor in novo.items():
        if valor is None:
            continue
        valor_existente = resultado.get(atributo)
        if valor_existente is None:
            resultado[atributo] = {
                "valor": valor,
                "fonte": fonte_url,
                "tipo_fonte": fonte_tipo,
                "fontes_sec": [],
            }
        else:
            val_final, _, divergente = resolver_conflito(
                valor_existente["valor"], valor, atributo
            )
            resultado[atributo] = {
                "valor": val_final,
                "fonte": valor_existente["fonte"],
                "tipo_fonte": valor_existente["tipo_fonte"],
                "fontes_sec": valor_existente["fontes_sec"] + [{
                    "url": fonte_url,
                    "valor": valor,
                    "status": "diverge" if divergente else "confirma",
                    "confianca": calcular_confianca_fonte(fonte_tipo),
                }],
            }
    return resultado
