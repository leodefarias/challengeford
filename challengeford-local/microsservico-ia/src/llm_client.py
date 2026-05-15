from __future__ import annotations

import json
import logging
import time
from typing import Any, Protocol, runtime_checkable

from openai import OpenAI, OpenAIError

from config import (
    FALLBACK_COBERTURA_THRESHOLD,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_MODEL_FALLBACK,
)
from schema import ATRIBUTOS_CORE, CatalogoSchema

logger = logging.getLogger(__name__)

_EXTRACTION_SYSTEM = (
    "Você é um extrator de especificações técnicas automotivas especializado no mercado brasileiro. "
    "Fontes de dados (em ordem de prioridade): (1) o TEXTO DO DOCUMENTO, (2) o CONTEXTO DA BASE DE CONHECIMENTO. "
    "Se o texto mostrar 'N/D' ou ausência de valor para um atributo, verifique o CONTEXTO DA BASE DE CONHECIMENTO — "
    "se lá houver um valor para exatamente o mesmo modelo e versão, use-o. "
    "NUNCA invente valores que não estão em nenhuma das duas fontes. "
    "Regras de extração:\n"
    "- Airbags: 'Airbag motorista'=1, 'Airbag passageiro'=1, 'Airbag lateral'=2 (par), 'Airbag cortina'=2 (par). Some todos mencionados → 'airbags_quantidade'.\n"
    "- 'Apple CarPlay' ou 'CarPlay' ou 'Kit Multimídia' com marca Apple → carplay=true.\n"
    "- 'Android Auto' → android_auto=true.\n"
    "- 'sem fio', 'wireless', 'Wireless CarPlay' → conexao_sem_fio=true.\n"
    "- 'câmera de ré', 'câmera traseira', 'Câmera de Ré' → camera_re=true.\n"
    "- 'câmera 360', 'câmera surround', 'Around View' → camera_360=true.\n"
    "- 'multimídia de X pol', 'tela de X pol', 'central de X polegadas' → tela_central_pol=X.\n"
    "- 'Kit Multimídia' sem tamanho explícito: não preencha tela_central_pol.\n"
    "- Tração: '4x4' ou '4WD' → '4x4'; '4x2' ou '2WD' → '4x2'; '4MOTION', 'AWD', 'integral' → '4x4_tempo_integral'.\n"
    "- torque em kgf.m: multiplique por 9.806 para Nm (ex: 59.4 kgf.m × 9.806 = 583 Nm).\n"
    "- 'Piloto automático' sem qualificador → cambio_tipo não confirma adaptativo; use contexto KB.\n"
    "- 'Ford Co-Pilot360', 'Toyota Safety Sense', 'Safety Shield 360' — consulte o mapa de terminologia no contexto KB.\n"
    "Se houver ambiguidade, registre em 'notas'. "
    "Detecte termos técnicos desconhecidos (nomes comerciais, CamelCase) e liste em 'termos_desconhecidos'."
)

_EXTRACTION_USER_TEMPLATE = """\
VERSÃO ALVO: {versao}

CONTEXTO DA BASE DE CONHECIMENTO:
{contexto_rag}

TEXTO DO DOCUMENTO:
{texto}

IMPORTANTE: Se o texto listar múltiplas versões de um veículo (ex: GL MT, GLS, HPE, HPE-S), \
extraia SOMENTE os dados da versão "{versao}". Ignore especificações de outras versões.

Retorne um JSON com exatamente dois campos:
1. "atributos": objeto com os campos do schema canônico (use null para não encontrados)
2. "termos_desconhecidos": lista de objetos {{"termo": str, "contexto": str, "atributo_sugerido": str|null}}
3. "notas": string com observações sobre ambiguidades (pode ser vazia)
"""


def _build_json_schema() -> dict:
    """Generate JSON schema from CatalogoSchema for OpenAI structured output."""
    pydantic_schema = CatalogoSchema.model_json_schema()
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "ExtractionResult",
            "strict": False,
            "schema": {
                "type": "object",
                "properties": {
                    "atributos": pydantic_schema,
                    "termos_desconhecidos": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "termo": {"type": "string"},
                                "contexto": {"type": "string"},
                                "atributo_sugerido": {"type": ["string", "null"]},
                            },
                            "required": ["termo", "contexto", "atributo_sugerido"],
                        },
                    },
                    "notas": {"type": "string"},
                },
                "required": ["atributos", "termos_desconhecidos", "notas"],
            },
        },
    }


@runtime_checkable
class LLMClient(Protocol):
    def extrair(self, texto: str, contexto_rag: str, versao: str = "") -> dict[str, Any]: ...


class OpenAIClient:
    def __init__(self, model: str = OPENAI_MODEL) -> None:
        self._client = OpenAI(api_key=OPENAI_API_KEY)
        self._model = model
        self._response_format = _build_json_schema()

    def extrair(self, texto: str, contexto_rag: str, versao: str = "") -> dict[str, Any]:
        prompt = _EXTRACTION_USER_TEMPLATE.format(
            contexto_rag=contexto_rag or "(sem contexto disponível)",
            texto=texto,
            versao=versao or "não especificada",
        )
        for attempt in range(3):
            try:
                response = self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": _EXTRACTION_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    response_format=self._response_format,
                    temperature=0,
                    max_tokens=4096,
                )
                raw = response.choices[0].message.content or "{}"
                result = json.loads(raw)
                logger.debug("LLM(%s) extraiu %d atributos", self._model, len(result.get("atributos", {})))
                return result
            except (OpenAIError, json.JSONDecodeError) as exc:
                wait = 2 ** attempt
                logger.warning("LLM attempt %d falhou: %s — retry em %ds", attempt + 1, exc, wait)
                if attempt < 2:
                    time.sleep(wait)
        logger.error("LLM(%s) falhou após 3 tentativas", self._model)
        return {"atributos": {}, "termos_desconhecidos": [], "notas": "falha total de extração"}


def _cobertura_resultado(resultado: dict) -> float:
    atributos = resultado.get("atributos", {})
    preenchidos = sum(
        1 for a in ATRIBUTOS_CORE if atributos.get(a) is not None
    )
    return preenchidos / len(ATRIBUTOS_CORE) if ATRIBUTOS_CORE else 0.0


def get_llm_client() -> "LLMClientWithFallback":
    return LLMClientWithFallback()


class LLMClientWithFallback:
    """Tenta gpt-4.1-mini; se cobertura < threshold, re-tenta com gpt-4.1."""

    def __init__(self) -> None:
        self._mini = OpenAIClient(model=OPENAI_MODEL)
        self._full = OpenAIClient(model=OPENAI_MODEL_FALLBACK)

    def extrair(self, texto: str, contexto_rag: str, versao: str = "") -> dict[str, Any]:
        result = self._mini.extrair(texto, contexto_rag, versao)
        cobertura = _cobertura_resultado(result)
        logger.info("mini cobertura=%.0f%%", cobertura * 100)

        if cobertura < FALLBACK_COBERTURA_THRESHOLD:
            logger.info(
                "Cobertura %.0f%% abaixo do threshold — escalando para %s",
                cobertura * 100,
                OPENAI_MODEL_FALLBACK,
            )
            result = self._full.extrair(texto, contexto_rag, versao)
            cobertura = _cobertura_resultado(result)
            logger.info("fallback cobertura=%.0f%%", cobertura * 100)

        return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    client = get_llm_client()
    mock_texto = (
        "O Ford Ranger Raptor 2025 é equipado com motor 3.0 V6 bi-turbo gasolina "
        "de 397cv e 583Nm de torque. Transmissão automática de 10 marchas. "
        "Tração 4x4 com caixa de redução. Câmera 360° de série. "
        "Apple CarPlay e Android Auto sem fio. Tela central de 12 polegadas."
    )
    resultado = client.extrair(mock_texto, "")
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
