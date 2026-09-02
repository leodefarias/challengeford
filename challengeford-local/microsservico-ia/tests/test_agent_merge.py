"""Testes de mescla multi-fonte no agente."""

from agent.merge_utils import mesclar_extraido, resolver_conflito


def test_pdf_prevalece_em_conflito_numerico_grande():
    val, conf, divergente = resolver_conflito(397, 350, "potencia_cv")
    assert val == 397
    assert divergente is True


def test_mesclar_duas_fontes_acumula_atributos():
    base = {
        "potencia_cv": {"valor": 397, "fonte": "pdf", "tipo_fonte": "pdf_oficial", "fontes_sec": []},
    }
    novo = {"torque_nm": 583}
    merged = mesclar_extraido(base, novo, "review_br", "https://icarros.com.br")
    assert merged["potencia_cv"]["valor"] == 397
    assert merged["torque_nm"]["valor"] == 583
    assert merged["torque_nm"]["tipo_fonte"] == "review_br"
