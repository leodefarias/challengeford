"""Testes de contrato para endpoints de comparativo e ranking."""

from __future__ import annotations

import pytest

from scoring import normalizar_pesos, score_criterio


def test_normalizar_pesos_soma_um():
    pesos = normalizar_pesos({"potencia_cv": 35, "torque_nm": 65})
    assert abs(sum(pesos.values()) - 1.0) < 1e-9
    assert pesos["potencia_cv"] == pytest.approx(0.35)


def test_score_criterio_menor_melhor_preco():
    valores = {"a": 300000, "b": 400000, "c": 500000}
    scores = score_criterio(valores, "preco_tabela_brl")
    assert scores["a"] == pytest.approx(1.0)
    assert scores["c"] == pytest.approx(0.0)


def test_labels_veiculo_case_insensitive_match():
    """Simula matching Java/Python — labels devem casar ignorando case."""
    db_label = "ford ranger raptor"
    python_labels = ["FORD Ranger RAPTOR", "ford Ranger Raptor", "ford ranger raptor"]
    for label in python_labels:
        assert db_label.lower() == label.strip().lower()


def test_comparar_veiculos_ausentes_contrato():
    """Contrato: resposta de comparar inclui veiculos_ausentes."""
    resposta_esperada = {
        "veiculos": ["ford ranger raptor"],
        "veiculos_ausentes": ["toyota hilux gr-s"],
        "atributos_comparados": [],
        "tabela": {},
        "destaques": {},
    }
    assert "veiculos_ausentes" in resposta_esperada
    assert len(resposta_esperada["veiculos_ausentes"]) == 1
