from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import chromadb
from chromadb.utils import embedding_functions

from config import CHROMA_EMBEDDING_MODEL, CHROMA_PERSIST_DIR, SEED_DIR
from schema import CatalogoCompleto

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Terminology map seed — termos comerciais → atributos canônicos
# ---------------------------------------------------------------------------

TERMINOLOGY_MAP: dict[str, Any] = {
    # Tração
    "4MOTION": {"tracao": "4x4_tempo_integral"},
    "4Runner": {"tracao": "4x4"},
    "AWD": {"tracao": "awd"},
    # Controle de descida
    "Crawl Control": {"controle_descida": True},
    "Trail Control": {"controle_descida": True},
    "DAC": {"controle_descida": True},
    "HDC": {"controle_descida": True},
    "Descida Assistida": {"controle_descida": True},
    # ADAS — pacotes
    "Safety Shield 360": {
        "frenagem_autonoma": True,
        "aviso_colisao_frontal": True,
        "manutencao_faixa": True,
        "monitoramento_ponto_cego": True,
    },
    "Ford Co-Pilot360": {
        "frenagem_autonoma": True,
        "aviso_colisao_frontal": True,
        "manutencao_faixa": True,
        "monitoramento_ponto_cego": True,
        "controle_cruzeiro_adaptativo": True,
    },
    "Toyota Safety Sense": {
        "frenagem_autonoma": True,
        "aviso_colisao_frontal": True,
        "manutencao_faixa": True,
        "controle_cruzeiro_adaptativo": True,
    },
    # ADAS — individuais
    "Lane Departure Warning": {"manutencao_faixa": True},
    "Lane Keeping Assist": {"manutencao_faixa": True},
    "Blind Spot Monitor": {"monitoramento_ponto_cego": True},
    "Blind Spot Warning": {"monitoramento_ponto_cego": True},
    "Monitoramento de Ponto Cego": {"monitoramento_ponto_cego": True},
    "AEB": {"frenagem_autonoma": True},
    "Frenagem Autônoma de Emergência": {"frenagem_autonoma": True},
    "Adaptive Cruise Control": {"controle_cruzeiro_adaptativo": True},
    "Cruise Control Adaptativo": {"controle_cruzeiro_adaptativo": True},
    # Conectividade
    "Wireless CarPlay": {"carplay": True, "conexao_sem_fio": True},
    "Wireless Android Auto": {"android_auto": True, "conexao_sem_fio": True},
    "Apple CarPlay": {"carplay": True},
    "Android Auto": {"android_auto": True},
    # Câmeras
    "Câmera de Ré": {"camera_re": True},
    "Câmera 360": {"camera_360": True},
    "Câmera Surround View": {"camera_360": True},
    "Around View Monitor": {"camera_360": True},
    # Transmissão
    "SelectShift": {"cambio_tipo": "automatico"},
    "PowerShift": {"cambio_tipo": "dct"},
    # Mitsubishi — pacote ADAS e termos específicos
    "MDAS-4": {
        "frenagem_autonoma": True,
        "aviso_colisao_frontal": True,
        "manutencao_faixa": True,
        "monitoramento_ponto_cego": True,
    },
    "FCM":  {"frenagem_autonoma": True},
    "FCTA": {"aviso_colisao_frontal": True},
    "LDW":  {"manutencao_faixa": True},
    "BSM":  {"monitoramento_ponto_cego": True},
    "BSW":  {"monitoramento_ponto_cego": True},
    "Piloto Automático Adaptativo": {"controle_cruzeiro_adaptativo": True},
    "Controle de Cruzeiro Adaptativo": {"controle_cruzeiro_adaptativo": True},
}

# Ranges médios do segmento pickup BR para contexto RAG
RANGES_CONTEXTO: dict[str, dict] = {
    "potencia_cv": {"min": 150, "max": 500, "media": 230, "unidade": "cv"},
    "torque_nm": {"min": 350, "max": 700, "media": 500, "unidade": "Nm"},
    "cilindrada_l": {"min": 2.0, "max": 3.5, "media": 2.8, "unidade": "L"},
    "comprimento_mm": {"min": 5000, "max": 5500, "media": 5300, "unidade": "mm"},
    "largura_mm": {"min": 1850, "max": 2000, "media": 1920, "unidade": "mm"},
    "entre_eixos_mm": {"min": 3000, "max": 3300, "media": 3200, "unidade": "mm"},
    "capacidade_reboque_kg": {"min": 2500, "max": 3500, "media": 3200, "unidade": "kg"},
    "profundidade_vadeo_mm": {"min": 600, "max": 900, "media": 800, "unidade": "mm"},
    "preco_tabela_brl": {"min": 250_000, "max": 600_000, "media": 380_000, "unidade": "BRL"},
}

CAPABILITY_DEFINITIONS: list[dict] = [
    {
        "capability": "visibilidade_traseira",
        "niveis": [
            "0: Apenas espelhos",
            "1: Câmera de ré",
            "2: Câmera 360°",
            "3: Câmera 360° + retrovisor digital",
        ],
    },
    {
        "capability": "frenagem_inteligente",
        "niveis": [
            "0: Sem assistência",
            "1: ABS + EBD",
            "2: + Frenagem autônoma de emergência",
            "3: + Frenagem autônoma + aviso de colisão frontal",
        ],
    },
    {
        "capability": "assistencia_faixa",
        "niveis": [
            "0: Sem assistência",
            "1: Aviso de saída de faixa",
            "2: Correção ativa de faixa",
            "3: + Monitoramento de ponto cego",
        ],
    },
    {
        "capability": "cruise_control",
        "niveis": [
            "0: Sem cruise",
            "1: Cruise control simples",
            "2: Cruise adaptativo",
            "3: Cruise adaptativo com stop&go",
        ],
    },
    {
        "capability": "capacidade_offroad",
        "niveis": [
            "0: 4x2 apenas",
            "1: 4x4 manual",
            "2: 4x4 + redução",
            "3: 4x4 + redução + diferencial bloqueante + controle descida",
        ],
    },
    {
        "capability": "sistema_multimidia",
        "niveis": [
            "0: Rádio simples",
            "1: Tela < 8pol",
            "2: Tela 8–10pol com CarPlay/Android Auto",
            "3: Tela > 10pol com CarPlay/Android Auto sem fio",
        ],
    },
]


class KBManager:
    def __init__(self) -> None:
        self._client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        self._ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=CHROMA_EMBEDDING_MODEL
        )
        self._specs = self._client.get_or_create_collection(
            "specs_normalizados", embedding_function=self._ef, metadata={"hnsw:space": "cosine"}
        )
        self._termos = self._client.get_or_create_collection(
            "terminologia", embedding_function=self._ef, metadata={"hnsw:space": "cosine"}
        )
        self._ranges = self._client.get_or_create_collection(
            "ranges_segmento", embedding_function=self._ef, metadata={"hnsw:space": "cosine"}
        )
        self._capabilities = self._client.get_or_create_collection(
            "capability_definitions", embedding_function=self._ef, metadata={"hnsw:space": "cosine"}
        )

    def inicializar(self) -> None:
        self._seed_terminologia()
        self._seed_ranges()
        self._seed_capabilities()
        self._seed_catalogos()
        logger.info(
            "KB inicializada — specs:%d termos:%d ranges:%d capabilities:%d",
            self._specs.count(),
            self._termos.count(),
            self._ranges.count(),
            self._capabilities.count(),
        )

    # ------------------------------------------------------------------
    # Seed
    # ------------------------------------------------------------------

    def _seed_terminologia(self) -> None:
        if self._termos.count() > 0:
            return
        docs, ids, metas = [], [], []
        for termo, mapeamento in TERMINOLOGY_MAP.items():
            docs.append(f"{termo}: {json.dumps(mapeamento, ensure_ascii=False)}")
            ids.append(f"termo_{termo.replace(' ', '_').lower()}")
            metas.append({"termo": termo, "mapeamento": json.dumps(mapeamento)})
        self._termos.add(documents=docs, ids=ids, metadatas=metas)
        logger.info("Terminologia: %d termos carregados", len(docs))

    def _seed_ranges(self) -> None:
        if self._ranges.count() > 0:
            return
        docs, ids, metas = [], [], []
        for atributo, info in RANGES_CONTEXTO.items():
            texto = (
                f"Atributo {atributo} em pickups BR: "
                f"mín={info['min']}, máx={info['max']}, média={info['media']} {info['unidade']}"
            )
            docs.append(texto)
            ids.append(f"range_{atributo}")
            metas.append({"atributo": atributo, **{k: str(v) for k, v in info.items()}})
        self._ranges.add(documents=docs, ids=ids, metadatas=metas)
        logger.info("Ranges: %d atributos carregados", len(docs))

    def _seed_capabilities(self) -> None:
        if self._capabilities.count() > 0:
            return
        docs, ids, metas = [], [], []
        for cap in CAPABILITY_DEFINITIONS:
            texto = f"Capability {cap['capability']}: " + " | ".join(cap["niveis"])
            docs.append(texto)
            ids.append(f"cap_{cap['capability']}")
            metas.append({"capability": cap["capability"]})
        self._capabilities.add(documents=docs, ids=ids, metadatas=metas)
        logger.info("Capabilities: %d definições carregadas", len(docs))

    def _seed_catalogos(self) -> None:
        seed_dir = Path(SEED_DIR)
        if not seed_dir.exists():
            return
        for json_file in seed_dir.glob("*.json"):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                marca = data.get("marca", "desconhecida")
                modelo = data.get("modelo", "desconhecido")
                versao = data.get("versao", "")
                for atributo, valor in data.items():
                    if valor is None:
                        continue
                    doc_id = f"seed_{marca}_{modelo}_{versao}_{atributo}".replace(" ", "_").lower()
                    if self._specs.get(ids=[doc_id])["ids"]:
                        continue
                    self._specs.add(
                        documents=[f"{marca} {modelo} {versao} — {atributo}: {valor}"],
                        ids=[doc_id],
                        metadatas=[{"marca": marca, "modelo": modelo, "atributo": atributo, "valor": str(valor), "seed": "true"}],
                    )
                logger.info("Seed carregado: %s %s %s", marca, modelo, versao)
            except Exception as exc:
                logger.warning("Erro ao carregar seed %s: %s", json_file.name, exc)

    # ------------------------------------------------------------------
    # Busca
    # ------------------------------------------------------------------

    def buscar_specs_similares(self, query: str, n_results: int = 3) -> list[dict]:
        if self._specs.count() == 0:
            return []
        results = self._specs.query(query_texts=[query], n_results=min(n_results, self._specs.count()))
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return [
            {"documento": d, "meta": m, "distancia": dist}
            for d, m, dist in zip(docs, metas, distances)
        ]

    def buscar_terminologia(self, termo: str) -> dict | None:
        if self._termos.count() == 0:
            return None
        # Exact match primeiro
        termo_lower = termo.lower().strip()
        for chave, mapeamento in TERMINOLOGY_MAP.items():
            if chave.lower() == termo_lower:
                return mapeamento
        # Busca semântica como fallback
        results = self._termos.query(query_texts=[termo], n_results=1)
        distances = results.get("distances", [[]])[0]
        if not distances or distances[0] > 0.35:
            return None
        metas = results.get("metadatas", [[]])[0]
        if metas:
            try:
                return json.loads(metas[0]["mapeamento"])
            except (KeyError, json.JSONDecodeError):
                return None
        return None

    def buscar_ranges(self, atributo: str) -> tuple[float, float] | None:
        meta = RANGES_CONTEXTO.get(atributo)
        if meta:
            return (float(meta["min"]), float(meta["max"]))
        return None

    def buscar_capabilities(self, query: str, n_results: int = 3) -> list[dict]:
        if self._capabilities.count() == 0:
            return []
        results = self._capabilities.query(
            query_texts=[query],
            n_results=min(n_results, self._capabilities.count()),
        )
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return [
            {"documento": d, "meta": m, "distancia": dist}
            for d, m, dist in zip(docs, metas, distances)
        ]

    def adicionar_catalogo_validado(self, catalogo: CatalogoCompleto) -> None:
        schema = catalogo.schema
        marca = schema.marca
        modelo = schema.modelo
        versao = schema.versao
        adicionados = 0
        for atributo, meta in catalogo.metadados.items():
            if meta.confianca < 0.7 or not meta.mercado_confirmado_br or meta.valor is None:
                continue
            doc_id = f"{marca}_{modelo}_{versao}_{atributo}".replace(" ", "_").lower()
            doc = f"{marca} {modelo} {versao} — {atributo}: {meta.valor}"
            try:
                self._specs.upsert(
                    documents=[doc],
                    ids=[doc_id],
                    metadatas=[{
                        "marca": marca,
                        "modelo": modelo,
                        "versao": versao,
                        "atributo": atributo,
                        "valor": str(meta.valor),
                        "confianca": str(meta.confianca),
                    }],
                )
                adicionados += 1
            except Exception as exc:
                logger.warning("Erro ao vetorizar %s.%s: %s", modelo, atributo, exc)
        logger.info("KB enriquecida: %d atributos de %s %s", adicionados, modelo, versao)

    def construir_contexto_crag(
        self, marca: str, modelo: str, versao: str, atributos_faltantes: list[str]
    ) -> str:
        partes: list[str] = []

        atributos_encontrados: set[str] = set()
        if atributos_faltantes and self._specs.count() > 0:
            partes.append(f"=== Valores de referência da KB para {marca} {modelo} {versao} ===")
            for atributo in atributos_faltantes:
                query = f"{marca} {modelo} {versao} {atributo}"
                results = self._specs.query(
                    query_texts=[query],
                    n_results=min(3, self._specs.count()),
                    where={"marca": marca.lower()},
                )
                docs = results.get("documents", [[]])[0]
                metas = results.get("metadatas", [[]])[0]
                dists = results.get("distances", [[]])[0]
                for doc, meta, dist in zip(docs, metas, dists):
                    if dist >= 0.5 or atributo not in doc:
                        continue
                    relevancia = self._avaliar_relevancia(meta, marca, modelo, versao)
                    if relevancia > 0.5:
                        partes.append(f"- {doc}")
                        atributos_encontrados.add(atributo)
                        break
                if atributo not in atributos_encontrados:
                    logger.debug(
                        "CRAG: nenhum doc relevante para '%s' (marca=%s modelo=%s versao=%s) — fallback ranges",
                        atributo, marca, modelo, versao,
                    )

        # Specs gerais como contexto adicional (com filtro de relevância)
        specs = self.buscar_specs_similares(
            f"pickup {marca} {modelo} {versao} motor tração dimensões multimedia", n_results=6
        )
        docs_ja_adicionados = set(partes)
        for s in specs:
            doc = f"- {s['documento']}"
            if doc not in docs_ja_adicionados and s["distancia"] < 0.4:
                relevancia = self._avaliar_relevancia(s.get("meta", {}), marca, modelo, versao)
                if relevancia > 0.5:
                    partes.append(doc)

        # Ranges do segmento — fallback corretivo para atributos sem doc relevante
        ranges_partes = []
        for atributo in atributos_faltantes:
            if atributo not in atributos_encontrados:
                info = RANGES_CONTEXTO.get(atributo)
                if info:
                    ranges_partes.append(
                        f"- {atributo}: min={info['min']}, max={info['max']}, média={info['media']} {info['unidade']}"
                    )
        if ranges_partes:
            partes.append("\n=== Ranges normais para pickup BR (fallback CRAG) ===")
            partes.extend(ranges_partes)

        return "\n".join(partes)

    def buscar_valores_kb(self, marca: str, modelo: str, versao: str, atributos: list[str]) -> dict[str, Any]:
        """Retorna valores exactos da KB para os atributos solicitados (seed ou extrações anteriores)."""
        resultado: dict[str, Any] = {}
        if not atributos or self._specs.count() == 0:
            return resultado

        for atributo in atributos:
            query = f"{marca} {modelo} {versao} {atributo}"
            results = self._specs.query(
                query_texts=[query],
                n_results=min(5, self._specs.count()),
                where={"marca": marca.lower()},
            )
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            dists = results.get("distances", [[]])[0]
            for doc, meta, dist in zip(docs, metas, dists):
                if dist > 0.45 or atributo not in doc:
                    continue
                # Hard-gate: rejeita docs de modelo/versao divergentes
                doc_modelo = meta.get("modelo", "").lower().strip()
                doc_versao = meta.get("versao", "").lower().strip()
                modelo_q = modelo.lower().strip()
                versao_q = versao.lower().strip()
                if modelo_q and doc_modelo:
                    if modelo_q not in doc_modelo and doc_modelo not in modelo_q:
                        continue
                if versao_q and doc_versao:
                    if versao_q not in doc_versao and doc_versao not in versao_q:
                        continue
                # Extrai valor do metadado (sempre str) e converte tipo
                valor_str = meta.get("valor", "")
                if not valor_str or valor_str == "None":
                    continue
                # Converte para o tipo correto
                if valor_str.lower() in ("true", "false"):
                    resultado[atributo] = valor_str.lower() == "true"
                else:
                    try:
                        resultado[atributo] = int(valor_str)
                    except ValueError:
                        try:
                            resultado[atributo] = float(valor_str)
                        except ValueError:
                            resultado[atributo] = valor_str
                break
        return resultado

    def _avaliar_relevancia(
        self, doc_meta: dict, marca: str, modelo: str, versao: str
    ) -> float:
        doc_marca = doc_meta.get("marca", "").lower().strip()
        doc_modelo = doc_meta.get("modelo", "").lower().strip()
        doc_versao = doc_meta.get("versao", "").lower().strip()
        marca_q = marca.lower().strip()
        modelo_q = modelo.lower().strip()
        versao_q = versao.lower().strip()

        if doc_marca and doc_marca != marca_q:
            return 0.0

        score = 1.0
        if modelo_q and doc_modelo:
            if modelo_q not in doc_modelo and doc_modelo not in modelo_q:
                score *= 0.3
        if versao_q and doc_versao:
            if versao_q not in doc_versao and doc_versao not in versao_q:
                score *= 0.6

        return score

    def contagem(self) -> dict[str, int]:
        return {
            "specs_normalizados": self._specs.count(),
            "terminologia": self._termos.count(),
            "ranges_segmento": self._ranges.count(),
            "capability_definitions": self._capabilities.count(),
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    kb = KBManager()
    kb.inicializar()
    print("Contagem:", kb.contagem())
    print("Terminologia 'Crawl Control':", kb.buscar_terminologia("Crawl Control"))
    print("Range potencia_cv:", kb.buscar_ranges("potencia_cv"))
