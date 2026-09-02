"""Testes unitários de normalização de ranking."""

from scoring import (
    MAIOR_MELHOR,
    MENOR_MELHOR,
    deve_usar_cache,
    score_criterio,
)


def test_consumo_cidade_maior_melhor():
    assert "consumo_cidade_km_l" in MAIOR_MELHOR
    assert "consumo_cidade_km_l" not in MENOR_MELHOR
    valores = {"a": 8.0, "b": 12.0}
    scores = score_criterio(valores, "consumo_cidade_km_l")
    assert scores["b"] > scores["a"]


def test_preco_menor_melhor():
    valores = {"barato": 200_000, "caro": 400_000}
    scores = score_criterio(valores, "preco_tabela_brl")
    assert scores["barato"] > scores["caro"]


def test_deve_usar_cache_respeita_forcar():
    cached = {"catalogo": {"schema": {"marca": "ford"}}}
    assert deve_usar_cache(cached, False) is True
    assert deve_usar_cache(cached, True) is False
    assert deve_usar_cache(None, False) is False
