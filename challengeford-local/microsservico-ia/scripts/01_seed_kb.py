"""Popula o ChromaDB com dados seed + terminology map."""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from knowledge_base.kb_manager import KBManager
from schema import CatalogoSchema, ATRIBUTOS_CORE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s — %(message)s",
)

_SEED_DIR = Path(__file__).parent.parent / "data" / "seed"


def _seed_catalogos_direto(kb: KBManager) -> int:
    """Carrega os JSONs de seed diretamente via ChromaDB sem passar pelo agente."""
    if not _SEED_DIR.exists():
        return 0

    total = 0
    for json_file in sorted(_SEED_DIR.glob("*.json")):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            marca = data.get("marca", "")
            modelo = data.get("modelo", "")
            versao = data.get("versao", "")

            # Valida com o schema
            schema_data = {k: v for k, v in data.items() if k in CatalogoSchema.model_fields}
            catalogo = CatalogoSchema(**schema_data)

            # Insere cada atributo não-nulo como documento na KB
            for atributo, valor in catalogo.model_dump(exclude_none=True).items():
                doc_id = f"seed_{marca}_{modelo}_{versao}_{atributo}".replace(" ", "_").lower()
                doc_text = f"{marca} {modelo} {versao} — {atributo}: {valor}"
                try:
                    kb._specs.upsert(
                        documents=[doc_text],
                        ids=[doc_id],
                        metadatas=[{
                            "marca": marca,
                            "modelo": modelo,
                            "versao": versao,
                            "atributo": atributo,
                            "valor": str(valor),
                            "seed": "true",
                        }],
                    )
                    total += 1
                except Exception as exc:
                    logging.warning("Erro ao inserir %s.%s: %s", modelo, atributo, exc)

            # Cobertura core
            preenchidos = sum(1 for a in ATRIBUTOS_CORE if getattr(catalogo, a, None) is not None)
            logging.info("Seed %s %s %s: %d attrs (%d/%d core)", marca, modelo, versao,
                         len(catalogo.model_dump(exclude_none=True)), preenchidos, len(ATRIBUTOS_CORE))
        except Exception as exc:
            logging.warning("Erro ao carregar %s: %s", json_file.name, exc)

    return total


def main() -> None:
    kb = KBManager()
    kb.inicializar()

    # Seed catalogs com dados confiáveis
    total_docs = _seed_catalogos_direto(kb)
    logging.info("Seed direto: %d documentos inseridos", total_docs)

    contagem = kb.contagem()
    print("\nKB inicializada com sucesso:")
    for colecao, total in contagem.items():
        print(f"  - {colecao}: {total} documentos")

    # Smoke tests
    print("\nSmoke tests:")
    termo = kb.buscar_terminologia("Crawl Control")
    print(f"  'Crawl Control' → {termo}")

    termo2 = kb.buscar_terminologia("Safety Shield 360")
    print(f"  'Safety Shield 360' → {termo2}")

    range_cv = kb.buscar_ranges("potencia_cv")
    print(f"  Range potencia_cv → {range_cv}")

    specs = kb.buscar_specs_similares("pickup ford ranger motor", n_results=3)
    print(f"  Specs similares encontrados: {len(specs)}")
    for s in specs:
        print(f"    - {s['documento'][:90]}")

    print(f"\nAtributos core: {sorted(ATRIBUTOS_CORE)}")


if __name__ == "__main__":
    main()
