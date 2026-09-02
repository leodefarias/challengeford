"""Normalização min-max e perfis de ranking competitivo."""

from __future__ import annotations

from typing import Any

MAIOR_MELHOR: set[str] = {
    "potencia_cv", "torque_nm", "cambio_marchas",
    "capacidade_carga_kg", "capacidade_reboque_kg",
    "profundidade_vadeo_mm", "angulo_ataque_graus", "angulo_saida_graus", "angulo_rampa_graus",
    "airbags_quantidade", "tela_central_pol", "painel_digital_pol",
    "emplacamentos_mes_atual", "emplacamentos_acum_ano",
    "consumo_cidade_km_l", "consumo_estrada_km_l",
}

MENOR_MELHOR: set[str] = {
    "preco_tabela_brl",
    "posicao_ranking_segmento",
}

BOOLEAN_ATTRS: set[str] = {
    "reducao", "diferencial_bloqueio", "controle_descida",
    "frenagem_autonoma", "aviso_colisao_frontal", "manutencao_faixa",
    "monitoramento_ponto_cego", "camera_re", "camera_360",
    "controle_cruzeiro_adaptativo", "estacionamento_automatico",
    "carplay", "android_auto", "conexao_sem_fio",
    "bancos_eletricos", "bancos_aquecidos", "bancos_ventilados", "carregador_wireless",
}

PERFIS_PREDEFINIDOS: dict[str, dict[str, float]] = {
    "familia": {
        "preco_tabela_brl": 0.35,
        "airbags_quantidade": 0.20,
        "frenagem_autonoma": 0.10,
        "tela_central_pol": 0.15,
        "emplacamentos_mes_atual": 0.10,
        "capacidade_carga_kg": 0.10,
    },
    "desempenho": {
        "potencia_cv": 0.35,
        "torque_nm": 0.30,
        "profundidade_vadeo_mm": 0.15,
        "capacidade_reboque_kg": 0.20,
    },
    "custo_beneficio": {
        "preco_tabela_brl": 0.40,
        "potencia_cv": 0.20,
        "airbags_quantidade": 0.15,
        "tela_central_pol": 0.10,
        "emplacamentos_mes_atual": 0.15,
    },
    "offroad": {
        "profundidade_vadeo_mm": 0.30,
        "angulo_ataque_graus": 0.20,
        "angulo_saida_graus": 0.20,
        "capacidade_reboque_kg": 0.15,
        "potencia_cv": 0.15,
    },
}


def normalizar_pesos(criterios: dict[str, float]) -> dict[str, float]:
    total = sum(criterios.values())
    if total <= 0:
        raise ValueError("Pesos devem ser positivos")
    return {k: v / total for k, v in criterios.items()}


def score_criterio(
    valores: dict[str, Any],
    criterio: str,
) -> dict[str, float]:
    """Normaliza min-max os valores de um critério entre os veículos."""
    if criterio in BOOLEAN_ATTRS:
        return {n: (1.0 if v is True else 0.0) for n, v in valores.items()}

    nums = {n: v for n, v in valores.items() if isinstance(v, (int, float))}
    ausentes = {n for n in valores if n not in nums}

    if not nums:
        return {n: 0.0 for n in valores}

    min_v = min(nums.values())
    max_v = max(nums.values())

    if max_v == min_v:
        scores = {n: 0.5 for n in nums}
    elif criterio in MENOR_MELHOR:
        scores = {n: 1.0 - (v - min_v) / (max_v - min_v) for n, v in nums.items()}
    else:
        scores = {n: (v - min_v) / (max_v - min_v) for n, v in nums.items()}

    for n in ausentes:
        scores[n] = 0.0

    return scores


def deve_usar_cache(cached: dict | None, forcar_reprocessamento: bool) -> bool:
    """Cache vale no boot (inclui seed). Extração forçada pelo analista ignora cache."""
    if forcar_reprocessamento or not cached:
        return False
    return True
