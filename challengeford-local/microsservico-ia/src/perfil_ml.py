"""Carrega modelo_final_perfil.joblib e sugere perfil de ranking."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_FEATURES = [
    "potencia_cv",
    "torque_nm",
    "preco_tabela_brl",
    "capacidade_carga_kg",
    "capacidade_reboque_kg",
    "profundidade_vadeo_mm",
    "angulo_ataque_graus",
    "angulo_saida_graus",
    "airbags_quantidade",
    "tela_central_pol",
    "frenagem_autonoma",
]

_ARTIFACT: dict | None = None
_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "modelo_final_perfil.joblib"


def _load_artifact() -> dict:
    global _ARTIFACT
    if _ARTIFACT is not None:
        return _ARTIFACT
    try:
        import joblib
    except ImportError as e:
        raise RuntimeError("joblib não instalado — adicione ao requirements.txt") from e
    if not _MODEL_PATH.exists():
        raise FileNotFoundError(f"Modelo não encontrado: {_MODEL_PATH}")
    raw = joblib.load(_MODEL_PATH)
    if isinstance(raw, dict) and "pipeline" in raw:
        _ARTIFACT = raw
    else:
        _ARTIFACT = {"pipeline": raw, "feature_cols": _DEFAULT_FEATURES, "modelo": "unknown", "params": {}}
    logger.info("Modelo ML carregado: %s (%s)", _MODEL_PATH, _ARTIFACT.get("modelo"))
    return _ARTIFACT


def sugerir_perfil(features: dict[str, Any]) -> dict[str, Any]:
    """Retorna perfil previsto + probabilidades por classe."""
    import numpy as np

    artifact = _load_artifact()
    model = artifact["pipeline"]
    feature_order = list(artifact.get("feature_cols") or _DEFAULT_FEATURES)

    row = []
    missing = []
    for name in feature_order:
        if name not in features or features[name] is None:
            missing.append(name)
            row.append(0.0)
        else:
            val = features[name]
            if isinstance(val, bool):
                val = 1.0 if val else 0.0
            row.append(float(val))

    # DataFrame-like via numpy; feature names set for scaler compatibility
    X = np.asarray([row], dtype=float)
    try:
        import pandas as pd

        X_in = pd.DataFrame(X, columns=feature_order)
    except ImportError:
        X_in = X

    pred = model.predict(X_in)[0]
    proba: dict[str, float] = {}
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_in)[0]
        classes = list(getattr(model, "classes_", []))
        if not classes and hasattr(model, "named_steps"):
            est = list(model.named_steps.values())[-1]
            classes = list(getattr(est, "classes_", []))
        for c, p in zip(classes, probs):
            proba[str(c)] = round(float(p), 4)

    return {
        "perfil": str(pred),
        "proba": proba,
        "modelo": artifact.get("modelo") or "LogisticRegression_ElasticNet",
        "params": artifact.get("params") or {},
        "features_usadas": feature_order,
        "features_faltantes": missing,
    }
