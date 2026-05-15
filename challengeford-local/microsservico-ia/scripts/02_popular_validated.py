"""
Converte os JSONs de seed para o formato ResultadoExtracao salvo em data/validated/.
Permite que o endpoint /comparar funcione sem precisar rodar o pipeline completo.
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from schema import CatalogoSchema, ATRIBUTOS_CORE

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(message)s")

_SEED_DIR = Path(__file__).parent.parent / "data" / "seed"
_VALIDATED_DIR = Path(__file__).parent.parent / "data" / "validated"


def _seed_to_resultado(data: dict) -> dict:
    schema_data = {k: v for k, v in data.items() if k in CatalogoSchema.model_fields}
    catalogo = CatalogoSchema(**schema_data)
    schema_dict = catalogo.model_dump(mode="json")

    preenchidos = [a for a in ATRIBUTOS_CORE if getattr(catalogo, a, None) is not None]
    cobertura = len(preenchidos) / len(ATRIBUTOS_CORE)
    status = "completo" if cobertura >= 0.9 else "parcial"

    metadados = {}
    for atributo, valor in schema_dict.items():
        if valor is None:
            continue
        metadados[atributo] = {
            "valor": str(valor),
            "confianca": 0.95,
            "fonte_primaria": "seed_manual",
            "mercado_confirmado_br": True,
            "divergente": False,
            "schema_nivel": "core" if atributo in ATRIBUTOS_CORE else "estendido",
        }

    return {
        "catalogo": {
            "schema": schema_dict,
            "cobertura_pct": cobertura,
            "status": status,
            "data_extracao": datetime.now().isoformat(),
            "fontes_utilizadas": ["seed_manual"],
            "metadados": metadados,
        },
        "termos_desconhecidos": [],
        "gaps_restantes": [a for a in ATRIBUTOS_CORE if getattr(catalogo, a, None) is None],
        "log_decisoes": ["Carregado de seed manual"],
    }


def main() -> None:
    _VALIDATED_DIR.mkdir(parents=True, exist_ok=True)

    for json_file in sorted(_SEED_DIR.glob("*.json")):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            resultado = _seed_to_resultado(data)

            marca = data.get("marca", "")
            modelo = data.get("modelo", "")
            versao = data.get("versao", "")
            key = f"{marca}_{modelo}_{versao}".lower().replace(" ", "_")
            out_path = _VALIDATED_DIR / f"{key}.json"
            out_path.write_text(
                json.dumps(resultado, indent=2, default=str, ensure_ascii=False),
                encoding="utf-8"
            )

            cobertura = resultado["catalogo"]["cobertura_pct"]
            logging.info("Salvo: %s (cobertura %.0f%%)", out_path.name, cobertura * 100)
        except Exception as exc:
            logging.error("Erro em %s: %s", json_file.name, exc)

    arquivos = list(_VALIDATED_DIR.glob("*.json"))
    print(f"\n{len(arquivos)} catálogos salvos em {_VALIDATED_DIR}")
    for f in sorted(arquivos):
        print(f"  - {f.name}")


if __name__ == "__main__":
    main()
