from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any

# Carrega .env antes de qualquer import que leia variáveis de ambiente
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import VALIDATED_DIR
from knowledge_base.kb_manager import KBManager
from schema import CatalogoSchema, ATRIBUTOS_CORE, MarcaEnum

logger = logging.getLogger(__name__)

_INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
if not _INTERNAL_API_KEY:
    raise RuntimeError("INTERNAL_API_KEY env var não configurada — serviço não pode iniciar sem autenticação")
_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://java-api:8080",
]

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Ford Catálogos IA",
    description="API de extração e análise competitiva de catálogos automotivos — mercado BR",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Internal-Token"],
)


@app.middleware("http")
async def verify_internal_token(request: Request, call_next) -> Response:
    if request.url.path in ("/health", "/docs", "/redoc", "/openapi.json"):
        return await call_next(request)
    if _INTERNAL_API_KEY:
        token = request.headers.get("X-Internal-Token", "")
        if token != _INTERNAL_API_KEY:
            return JSONResponse(status_code=401, content={"detail": "Token interno inválido"})
    return await call_next(request)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Erro inesperado em %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Erro interno"})

# ---------------------------------------------------------------------------
# Estado compartilhado
# ---------------------------------------------------------------------------

_kb: KBManager | None = None
_processando: set[str] = set()
_idempotency_cache: dict[str, dict] = {}


def get_kb() -> KBManager:
    global _kb
    if _kb is None:
        _kb = KBManager()
        _kb.inicializar()
    return _kb


# ---------------------------------------------------------------------------
# Persistência local (JSON em data/validated/)
# ---------------------------------------------------------------------------

def _catalogo_key(marca: str, modelo: str, versao: str) -> str:
    return f"{marca}_{modelo}_{versao}".lower().replace(" ", "_")


def _salvar_resultado(resultado_dict: dict) -> None:
    VALIDATED_DIR.mkdir(parents=True, exist_ok=True)
    cat = resultado_dict.get("catalogo", {})
    schema = cat.get("schema", {})
    key = _catalogo_key(schema.get("marca", ""), schema.get("modelo", ""), schema.get("versao", ""))
    path = VALIDATED_DIR / f"{key}.json"
    path.write_text(json.dumps(resultado_dict, indent=2, default=str, ensure_ascii=False), encoding="utf-8")
    logger.info("Catálogo salvo: %s", path.name)


def _carregar_catalogo(marca: str, modelo: str, versao: str) -> dict | None:
    key = _catalogo_key(marca, modelo, versao)
    path = VALIDATED_DIR / f"{key}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _listar_catalogos() -> list[dict]:
    VALIDATED_DIR.mkdir(parents=True, exist_ok=True)
    catalogos = []
    for f in sorted(VALIDATED_DIR.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            schema = data.get("catalogo", {}).get("schema", {})
            catalogos.append({
                "marca": schema.get("marca"),
                "modelo": schema.get("modelo"),
                "versao": schema.get("versao"),
                "status": data.get("catalogo", {}).get("status"),
                "cobertura_pct": data.get("catalogo", {}).get("cobertura_pct"),
                "data_extracao": data.get("catalogo", {}).get("data_extracao"),
            })
        except Exception:
            pass
    return catalogos


def _resultado_to_dict(resultado: Any) -> dict:
    """Converte ResultadoExtracao para dict serializável."""
    cat = resultado.catalogo
    return {
        "catalogo": {
            "schema": cat.schema.model_dump(mode="json"),
            "cobertura_pct": cat.cobertura_pct,
            "cobertura_live_pct": resultado.cobertura_live_pct,
            "status": cat.status,
            "data_extracao": cat.data_extracao.isoformat(),
            "fontes_utilizadas": cat.fontes_utilizadas,
            "metadados": {
                k: {
                    "valor": str(v.valor) if v.valor is not None else None,
                    "confianca": v.confianca,
                    "fonte_primaria": v.fonte_primaria,
                    "mercado_confirmado_br": v.mercado_confirmado_br,
                    "divergente": v.divergente,
                    "schema_nivel": v.schema_nivel,
                }
                for k, v in cat.metadados.items()
            },
        },
        "termos_desconhecidos": [
            {
                "termo": t.termo,
                "contexto": t.contexto,
                "atributo_sugerido": t.atributo_sugerido,
                "fonte": t.fonte,
            }
            for t in resultado.termos_desconhecidos
        ],
        "gaps_restantes": resultado.gaps_restantes,
        "log_decisoes": resultado.log_decisoes,
    }


# ---------------------------------------------------------------------------
# Adaptive RAG helpers — query classification and context builders
# ---------------------------------------------------------------------------

_COMPARACAO_TOKENS = ("vs", "versus", "compar", "diferença", "melhor entre", "ou o")
_RECOMENDACAO_TOKENS = (
    "recomend", "qual o melhor", "indicar", "sugest",
    "devo escolher", "mais indicado", "vale mais",
)


def _classificar_pergunta(pergunta: str) -> str:
    p = pergunta.lower()
    if any(t in p for t in _COMPARACAO_TOKENS):
        return "comparacao"
    if any(t in p for t in _RECOMENDACAO_TOKENS):
        return "recomendacao"
    return "factual"


def _contexto_factual(
    pergunta: str,
    marcas_filtro: list[str],
    todos_catalogos: list[dict],
) -> str:
    partes: list[str] = []
    for info in todos_catalogos:
        if marcas_filtro and info["marca"] not in marcas_filtro:
            continue
        data = _carregar_catalogo(info["marca"], info["modelo"], info["versao"])
        if not data:
            continue
        schema = data["catalogo"]["schema"]
        nome = f"{schema['marca']} {schema['modelo']} {schema['versao']}"
        attrs = {k: v for k, v in schema.items() if v is not None and k not in ("marca", "modelo", "versao")}
        partes.append(f"\n{nome}:\n" + "\n".join(f"  {k}: {v}" for k, v in attrs.items()))
    return "\n".join(partes)


def _contexto_comparacao(
    pergunta: str,
    marcas_filtro: list[str],
    todos_catalogos: list[dict],
    kb,
) -> str:
    partes: list[str] = []
    for info in todos_catalogos:
        if marcas_filtro and info["marca"] not in marcas_filtro:
            continue
        data = _carregar_catalogo(info["marca"], info["modelo"], info["versao"])
        if not data:
            continue
        schema = data["catalogo"]["schema"]
        nome = f"{schema['marca']} {schema['modelo']} {schema['versao']}"
        attrs = {k: v for k, v in schema.items() if v is not None and k not in ("marca", "modelo", "versao")}
        partes.append(f"\n{nome}:\n" + "\n".join(f"  {k}: {v}" for k, v in attrs.items()))

    specs = kb.buscar_specs_similares(pergunta, n_results=6)
    specs_relevantes = [s for s in specs if s["distancia"] < 0.4]
    if specs_relevantes:
        partes.append("\nReferências da KB:")
        for s in specs_relevantes:
            partes.append(f"  - {s['documento']}")

    return "\n".join(partes)


def _contexto_recomendacao(
    pergunta: str,
    marcas_filtro: list[str],
    todos_catalogos: list[dict],
    kb,
) -> str:
    partes: list[str] = []
    for info in todos_catalogos:
        data = _carregar_catalogo(info["marca"], info["modelo"], info["versao"])
        if not data:
            continue
        schema = data["catalogo"]["schema"]
        nome = f"{schema['marca']} {schema['modelo']} {schema['versao']}"
        attrs = {k: v for k, v in schema.items() if v is not None and k not in ("marca", "modelo", "versao")}
        partes.append(f"\n{nome}:\n" + "\n".join(f"  {k}: {v}" for k, v in attrs.items()))

    capabilities = kb.buscar_capabilities(pergunta, n_results=3)
    if capabilities:
        partes.append("\nDefinições de capability relevantes:")
        for c in capabilities:
            partes.append(f"  - {c['documento']}")

    return "\n".join(partes)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ExtrairRequest(BaseModel):
    marca: MarcaEnum
    modelo: Annotated[str, Field(min_length=1, max_length=100)]
    versao: Annotated[str, Field(min_length=1, max_length=100)]
    forcar_reprocessamento: bool = False

    @field_validator("marca", "modelo", "versao", mode="before")
    @classmethod
    def normalizar(cls, v: str) -> str:
        return v.lower().strip()


class ComparacaoRequest(BaseModel):
    veiculos: Annotated[list[dict], Field(max_length=10)]
    atributos: Annotated[list[str], Field(max_length=30)] | None = None


class ChatRequest(BaseModel):
    pergunta: Annotated[str, Field(min_length=1, max_length=1000)]
    contexto_marcas: Annotated[list[str], Field(max_length=20)] | None = None


class RankingRequest(BaseModel):
    veiculos: Annotated[list[dict], Field(max_length=20)]
    criterios: dict[str, float] | None = None
    perfil: Annotated[str, Field(max_length=50)] | None = None
    incluir_justificativa: bool = True


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    try:
        kb = get_kb()
        contagem = kb.contagem()
        return {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "kb": contagem,
            "catalogos_salvos": len(_listar_catalogos()),
        }
    except Exception as exc:
        logger.error("Health check falhou: %s", exc, exc_info=True)
        return {"status": "degraded", "erro": "serviço indisponível"}


@app.post("/extrair")
@limiter.limit("5/minute")
async def extrair(request: Request, req: ExtrairRequest, background_tasks: BackgroundTasks):
    """
    Inicia ou retorna extração de catálogo para um veículo.
    Suporta X-Idempotency-Key: requisições duplicadas com a mesma chave retornam o mesmo resultado.
    Se já processado e `forcar_reprocessamento=False`, retorna cache.
    """
    idempotency_key = request.headers.get("X-Idempotency-Key")

    # Idempotency: retorna resultado já processado para a mesma chave
    if idempotency_key and idempotency_key in _idempotency_cache:
        logger.info("Idempotency hit: %s", idempotency_key)
        return JSONResponse(
            content={"fonte": "idempotente", **_idempotency_cache[idempotency_key]},
            headers={"X-Idempotency-Key-Status": "replayed"},
        )

    key = _catalogo_key(req.marca, req.modelo, req.versao)

    # Retorna cache se disponível
    if not req.forcar_reprocessamento:
        cached = _carregar_catalogo(req.marca, req.modelo, req.versao)
        if cached:
            logger.info("Cache hit: %s", key)
            return {"fonte": "cache", **cached}

    # Evita processamento duplicado simultâneo
    if key in _processando:
        raise HTTPException(status_code=409, detail=f"Processamento já em andamento para {key}")

    _processando.add(key)
    try:
        from agent.agent import AgenteCatalogo
        kb = get_kb()
        agente = AgenteCatalogo(kb=kb)
        resultado = await agente.processar(req.marca, req.modelo, req.versao)
        resultado_dict = _resultado_to_dict(resultado)
        _salvar_resultado(resultado_dict)

        if idempotency_key:
            _idempotency_cache[idempotency_key] = resultado_dict

        return {"fonte": "novo", **resultado_dict}
    except Exception as exc:
        logger.error("Erro ao processar %s: %s", key, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno no processamento")
    finally:
        _processando.discard(key)


@app.get("/catalogos")
@limiter.limit("30/minute")
async def listar_catalogos(request: Request):
    """Lista todos os catálogos já processados."""
    return {"catalogos": _listar_catalogos()}


@app.get("/catalogos/{marca}/{modelo}/{versao}")
@limiter.limit("30/minute")
async def obter_catalogo(request: Request, marca: str, modelo: str, versao: str):
    """Retorna catálogo processado ou 404."""
    data = _carregar_catalogo(marca, modelo, versao)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Catálogo não encontrado: {marca} {modelo} {versao}. Use POST /extrair primeiro."
        )
    return data


@app.post("/comparar")
@limiter.limit("10/minute")
async def comparar(request: Request, req: ComparacaoRequest):
    """
    Compara N veículos lado a lado nos atributos solicitados.
    Veículos não processados são ignorados (use /extrair antes).
    """
    atributos_alvo = req.atributos or list(ATRIBUTOS_CORE)
    tabela: dict[str, dict] = {}

    for v in req.veiculos:
        marca = v.get("marca", "")
        modelo = v.get("modelo", "")
        versao = v.get("versao", "")
        data = _carregar_catalogo(marca, modelo, versao)
        if not data:
            continue
        schema = data.get("catalogo", {}).get("schema", {})
        nome = f"{marca} {modelo} {versao}"
        tabela[nome] = {a: schema.get(a) for a in atributos_alvo}

    if not tabela:
        raise HTTPException(
            status_code=404,
            detail="Nenhum dos veículos solicitados foi encontrado. Execute /extrair para cada um."
        )

    # Destaca vencedor por atributo (para numéricos)
    destaques: dict[str, str] = {}
    atributos_maior_melhor = {
        "potencia_cv", "torque_nm", "capacidade_reboque_kg", "profundidade_vadeo_mm",
        "tela_central_pol", "airbags_quantidade",
    }
    atributos_menor_melhor = {"preco_tabela_brl", "consumo_cidade_km_l"}

    for atributo in atributos_alvo:
        valores = {nome: tabela[nome].get(atributo) for nome in tabela}
        valores_num = {n: v for n, v in valores.items() if isinstance(v, (int, float))}
        if len(valores_num) < 2:
            continue
        if atributo in atributos_maior_melhor:
            vencedor = max(valores_num, key=lambda n: valores_num[n])
        elif atributo in atributos_menor_melhor:
            vencedor = min(valores_num, key=lambda n: valores_num[n])
        else:
            continue
        destaques[atributo] = vencedor

    return {
        "atributos_comparados": atributos_alvo,
        "veiculos": list(tabela.keys()),
        "tabela": tabela,
        "destaques": destaques,
    }


@app.post("/chat")
@limiter.limit("10/minute")
async def chat(request: Request, req: ChatRequest):
    """
    Responde perguntas sobre os catálogos usando Adaptive RAG + LLM.
    Classifica automaticamente a pergunta e usa a estratégia de contexto adequada.
    """
    kb = get_kb()
    pergunta = req.pergunta
    marcas_filtro = [m.lower() for m in (req.contexto_marcas or [])]
    todos_catalogos = _listar_catalogos()

    query_type = _classificar_pergunta(pergunta)

    if query_type == "factual":
        contexto = _contexto_factual(pergunta, marcas_filtro, todos_catalogos)
    elif query_type == "comparacao":
        contexto = _contexto_comparacao(pergunta, marcas_filtro, todos_catalogos, kb)
    else:
        contexto = _contexto_recomendacao(pergunta, marcas_filtro, todos_catalogos, kb)

    contexto = contexto or "(sem dados processados ainda)"

    from openai import OpenAI
    from config import OPENAI_API_KEY, OPENAI_MODEL
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Você é um especialista em veículos automotivos do mercado brasileiro, "
                    "focado em pickups/caminhonetes. Responda de forma direta e objetiva, "
                    "usando apenas os dados fornecidos no contexto. "
                    "Se não houver dados suficientes, diga claramente."
                ),
            },
            {
                "role": "user",
                "content": f"CONTEXTO:\n{contexto}\n\nPERGUNTA: {pergunta}",
            },
        ],
        temperature=0.3,
        max_tokens=1024,
    )
    resposta = response.choices[0].message.content or ""
    return {"resposta": resposta, "contexto_utilizado": bool(contexto.strip()), "query_type": query_type}


# ---------------------------------------------------------------------------
# Ranking — constantes de scoring
# ---------------------------------------------------------------------------

_MAIOR_MELHOR: set[str] = {
    "potencia_cv", "torque_nm", "cambio_marchas",
    "capacidade_carga_kg", "capacidade_reboque_kg",
    "profundidade_vadeo_mm", "angulo_ataque_graus", "angulo_saida_graus", "angulo_rampa_graus",
    "airbags_quantidade", "tela_central_pol", "painel_digital_pol",
    "emplacamentos_mes_atual", "emplacamentos_acum_ano",
}

_MENOR_MELHOR: set[str] = {
    "preco_tabela_brl", "consumo_cidade_km_l", "consumo_estrada_km_l",
    "posicao_ranking_segmento",
}

_BOOLEAN_ATTRS: set[str] = {
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


def _normalizar_pesos(criterios: dict[str, float]) -> dict[str, float]:
    total = sum(criterios.values())
    if total <= 0:
        raise ValueError("Pesos devem ser positivos")
    return {k: v / total for k, v in criterios.items()}


def _score_criterio(
    valores: dict[str, Any],
    criterio: str,
) -> dict[str, float]:
    """Normaliza min-max os valores de um critério entre os veículos."""
    if criterio in _BOOLEAN_ATTRS:
        return {n: (1.0 if v is True else 0.0) for n, v in valores.items()}

    nums = {n: v for n, v in valores.items() if isinstance(v, (int, float))}
    ausentes = {n for n in valores if n not in nums}

    if not nums:
        return {n: 0.0 for n in valores}

    min_v = min(nums.values())
    max_v = max(nums.values())

    if max_v == min_v:
        scores = {n: 0.5 for n in nums}
    elif criterio in _MENOR_MELHOR:
        scores = {n: 1.0 - (v - min_v) / (max_v - min_v) for n, v in nums.items()}
    else:
        scores = {n: (v - min_v) / (max_v - min_v) for n, v in nums.items()}

    for n in ausentes:
        scores[n] = 0.0

    return scores


async def _calcular_ranking(
    veiculos_raw: list[dict],
    criterios: dict[str, float],
) -> list[dict]:
    # 1. Carrega catálogos
    veiculos_data: list[dict] = []
    for v in veiculos_raw:
        marca = v.get("marca", "")
        modelo = v.get("modelo", "")
        versao = v.get("versao", "")
        data = _carregar_catalogo(marca, modelo, versao)
        if not data:
            logger.warning("Ranking: catálogo não encontrado para %s %s %s", marca, modelo, versao)
            continue
        schema = dict(data["catalogo"]["schema"])
        veiculos_data.append({"nome": f"{marca} {modelo} {versao}", "schema": schema})

    if not veiculos_data:
        return []

    # 2. Injeta emplacamentos se necessário
    needs_emp = any(c.startswith("emplacamentos_") or c == "posicao_ranking_segmento" for c in criterios)
    if needs_emp:
        from agent.tools.emplacamentos import buscar_emplacamentos
        for vd in veiculos_data:
            s = vd["schema"]
            emp = await buscar_emplacamentos(s.get("marca", ""), s.get("modelo", ""))
            if emp:
                s["emplacamentos_mes_atual"] = emp.emplacamentos_mes
                s["emplacamentos_acum_ano"] = emp.emplacamentos_acum_ano
                s["posicao_ranking_segmento"] = emp.posicao_segmento

    # 3. Calcula scores por critério
    scores_map: dict[str, dict[str, float]] = {}
    valores_map: dict[str, dict[str, Any]] = {}

    for criterio in criterios:
        valores = {vd["nome"]: vd["schema"].get(criterio) for vd in veiculos_data}
        valores_map[criterio] = valores
        scores_map[criterio] = _score_criterio(valores, criterio)

    # 4. Pontuação ponderada
    resultados = []
    for vd in veiculos_data:
        nome = vd["nome"]
        pontuacao = sum(
            criterios[c] * scores_map[c].get(nome, 0.0)
            for c in criterios
        )
        breakdown = {
            c: {
                "valor": valores_map[c].get(nome),
                "score_normalizado": round(scores_map[c].get(nome, 0.0), 4),
                "peso": criterios[c],
                "score_ponderado": round(criterios[c] * scores_map[c].get(nome, 0.0), 4),
            }
            for c in criterios
        }
        resultados.append({"veiculo": nome, "pontuacao_total": round(pontuacao, 4), "breakdown": breakdown})

    resultados.sort(key=lambda x: x["pontuacao_total"], reverse=True)
    for i, r in enumerate(resultados):
        r["posicao"] = i + 1

    return resultados


async def _gerar_justificativa(resultados: list[dict], criterios: dict[str, float], perfil: str) -> str:
    from openai import OpenAI
    from config import OPENAI_API_KEY, OPENAI_MODEL

    tabela_linhas = []
    for r in resultados:
        breakdown_str = ", ".join(
            f"{c}={r['breakdown'][c]['valor']} (score={r['breakdown'][c]['score_normalizado']:.2f})"
            for c in criterios
        )
        tabela_linhas.append(f"  {r['posicao']}º {r['veiculo']} — pontuação {r['pontuacao_total']:.3f} | {breakdown_str}")

    pesos_str = ", ".join(f"{c}: {p:.0%}" for c, p in criterios.items())
    prompt = (
        f"Ranking de pickups — perfil '{perfil}'\n"
        f"Critérios e pesos: {pesos_str}\n\n"
        f"Resultado:\n" + "\n".join(tabela_linhas) +
        "\n\nJustifique cada posição em 1-2 frases, citando os números que a sustentam. "
        "Seja direto e objetivo."
    )

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "Você é analista automotivo especializado no mercado brasileiro de pickups."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=800,
    )
    return response.choices[0].message.content or ""


@app.post("/ranking")
@limiter.limit("20/minute")
async def ranking(request: Request, req: RankingRequest):
    """
    Ranking determinístico por critérios ponderados com justificativa LLM.
    Use 'perfil' para um preset (familia/desempenho/custo_beneficio/offroad)
    ou 'criterios' para pesos customizados. Se ambos forem fornecidos, criterios prevalece.
    """
    # Resolve critérios
    if req.criterios:
        criterios_raw = req.criterios
    elif req.perfil:
        if req.perfil not in PERFIS_PREDEFINIDOS:
            raise HTTPException(
                status_code=400,
                detail=f"Perfil '{req.perfil}' inválido. Disponíveis: {list(PERFIS_PREDEFINIDOS)}"
            )
        criterios_raw = PERFIS_PREDEFINIDOS[req.perfil]
    else:
        raise HTTPException(status_code=400, detail="Forneça 'criterios' ou 'perfil'.")

    criterios = _normalizar_pesos(criterios_raw)
    perfil_nome = req.perfil or "custom"

    if not req.veiculos:
        raise HTTPException(status_code=400, detail="Informe ao menos um veículo.")

    resultados = await _calcular_ranking(req.veiculos, criterios)

    if not resultados:
        raise HTTPException(
            status_code=404,
            detail="Nenhum dos veículos foi encontrado. Execute /extrair para cada um primeiro."
        )

    justificativa = None
    if req.incluir_justificativa:
        try:
            justificativa = await _gerar_justificativa(resultados, criterios, perfil_nome)
        except Exception as exc:
            logger.warning("Justificativa LLM falhou: %s", exc)

    return {
        "perfil": perfil_nome,
        "criterios_aplicados": {k: round(v, 4) for k, v in criterios.items()},
        "ranking": resultados,
        "justificativa": justificativa,
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )
    logger.info("API iniciando — inicializando KB...")
    get_kb()
    logger.info("API pronta.")


if __name__ == "__main__":
    import uvicorn
    from config import API_HOST, API_PORT
    uvicorn.run("api.main:app", host=API_HOST, port=API_PORT, reload=True)
