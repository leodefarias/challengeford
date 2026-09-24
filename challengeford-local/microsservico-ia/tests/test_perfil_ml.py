"""Teste do classificador de perfil (joblib)."""
from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

from perfil_ml import sugerir_perfil  # noqa: E402


def test_sugerir_perfil_offroad_like():
    specs = {
        "potencia_cv": 250,
        "torque_nm": 600,
        "preco_tabela_brl": 280000,
        "capacidade_carga_kg": 1000,
        "capacidade_reboque_kg": 3500,
        "profundidade_vadeo_mm": 800,
        "angulo_ataque_graus": 30,
        "angulo_saida_graus": 25,
        "airbags_quantidade": 6,
        "tela_central_pol": 12,
        "frenagem_autonoma": 1,
    }
    out = sugerir_perfil(specs)
    assert "perfil" in out
    assert out["perfil"] in {"familia", "desempenho", "custo_beneficio", "offroad"}
    assert out["modelo"]  # nome vem do artefato joblib
