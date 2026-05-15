from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums / literals
# ---------------------------------------------------------------------------

MarcaEnum = Literal["ford", "toyota", "vw", "chevrolet", "mitsubishi", "nissan"]
SegmentoEnum = Literal["pickup", "suv"]
CombustivelEnum = Literal["diesel", "gasolina", "flex", "hibrido", "eletrico"]
InducaoEnum = Literal["turbo", "biturbo", "aspirado", "supercharger"]
CambioTipoEnum = Literal["manual", "automatico", "cvt", "dct"]
TracaoEnum = Literal["4x2", "4x4", "4x4_tempo_integral", "awd"]
TetoSolarEnum = Literal["nenhum", "escotilha", "panoramico"]
BancosMaterialEnum = Literal["tecido", "couro_sintetico", "couro"]
ArCondicionadoEnum = Literal["simples", "digital", "dual_zone", "tri_zone"]
SchemaNivelEnum = Literal["core", "estendido"]
StatusEnum = Literal["confirma", "diverge", "complementa"]
CatalogoStatusEnum = Literal["completo", "parcial", "pendente_revisao"]


# ---------------------------------------------------------------------------
# Schema canônico principal
# ---------------------------------------------------------------------------

class CatalogoSchema(BaseModel):
    # Identificação
    marca: MarcaEnum
    modelo: str
    versao: str
    ano_modelo: int = Field(ge=2020, le=2030)
    segmento: SegmentoEnum

    # Motorização
    combustivel: CombustivelEnum | None = None
    cilindrada_l: float | None = Field(None, ge=1.0, le=6.5)
    configuracao_motor: str | None = None
    inducao: InducaoEnum | None = None
    potencia_cv: int | None = Field(None, ge=50, le=999)
    torque_nm: int | None = Field(None, ge=80, le=999)
    consumo_cidade_km_l: float | None = Field(None, ge=3.0, le=30.0)
    consumo_estrada_km_l: float | None = Field(None, ge=3.0, le=30.0)

    # Transmissão & Tração
    cambio_tipo: CambioTipoEnum | None = None
    cambio_marchas: int | None = Field(None, ge=4, le=10)
    tracao: TracaoEnum | None = None
    reducao: bool | None = None
    diferencial_bloqueio: bool | None = None

    # Dimensões & Capacidade
    comprimento_mm: int | None = Field(None, ge=3000, le=7000)
    largura_mm: int | None = Field(None, ge=1500, le=2500)
    altura_mm: int | None = Field(None, ge=1400, le=2500)
    entre_eixos_mm: int | None = Field(None, ge=2000, le=4000)
    peso_bruto_kg: int | None = Field(None, ge=1000, le=5000)
    capacidade_carga_kg: int | None = Field(None, ge=0, le=3000)
    capacidade_reboque_kg: int | None = Field(None, ge=0, le=5000)

    # Off-Road
    modos_conducao: list[str] | None = None
    controle_descida: bool | None = None
    angulo_ataque_graus: float | None = Field(None, ge=15.0, le=50.0)
    angulo_saida_graus: float | None = Field(None, ge=15.0, le=50.0)
    angulo_rampa_graus: float | None = Field(None, ge=10.0, le=40.0)
    profundidade_vadeo_mm: int | None = Field(None, ge=300, le=1000)

    # Segurança & ADAS
    airbags_quantidade: int | None = Field(None, ge=0, le=12)
    frenagem_autonoma: bool | None = None
    aviso_colisao_frontal: bool | None = None
    manutencao_faixa: bool | None = None
    monitoramento_ponto_cego: bool | None = None
    camera_re: bool | None = None
    camera_360: bool | None = None
    controle_cruzeiro_adaptativo: bool | None = None
    estacionamento_automatico: bool | None = None

    # Conforto & Conectividade
    tela_central_pol: float | None = Field(None, ge=5.0, le=20.0)
    painel_digital_pol: float | None = Field(None, ge=5.0, le=20.0)
    carplay: bool | None = None
    android_auto: bool | None = None
    conexao_sem_fio: bool | None = None
    teto_solar: TetoSolarEnum | None = None
    bancos_material: BancosMaterialEnum | None = None
    bancos_eletricos: bool | None = None
    bancos_aquecidos: bool | None = None
    bancos_ventilados: bool | None = None
    ar_condicionado: ArCondicionadoEnum | None = None
    carregador_wireless: bool | None = None

    # Precificação
    preco_tabela_brl: int | None = None
    data_referencia_preco: date | None = None


# ---------------------------------------------------------------------------
# Ranges para validação pós-LLM
# ---------------------------------------------------------------------------

RANGES_SEGMENTO: dict[str, tuple[float, float]] = {
    "cilindrada_l": (1.0, 6.5),
    "potencia_cv": (50, 999),
    "torque_nm": (80, 999),
    "consumo_cidade_km_l": (3.0, 30.0),
    "consumo_estrada_km_l": (3.0, 30.0),
    "cambio_marchas": (4, 10),
    "comprimento_mm": (3000, 7000),
    "largura_mm": (1500, 2500),
    "altura_mm": (1400, 2500),
    "entre_eixos_mm": (2000, 4000),
    "peso_bruto_kg": (1000, 5000),
    "capacidade_carga_kg": (0, 3000),
    "capacidade_reboque_kg": (0, 5000),
    "angulo_ataque_graus": (15.0, 50.0),
    "angulo_saida_graus": (15.0, 50.0),
    "angulo_rampa_graus": (10.0, 40.0),
    "profundidade_vadeo_mm": (300, 1000),
    "airbags_quantidade": (0, 12),
    "tela_central_pol": (5.0, 20.0),
    "painel_digital_pol": (5.0, 20.0),
    "preco_tabela_brl": (80_000, 1_500_000),
    "ano_modelo": (2020, 2030),
}

ATRIBUTOS_CORE: set[str] = {
    "potencia_cv",
    "torque_nm",
    "tracao",
    "cambio_tipo",
    "comprimento_mm",
    "largura_mm",
    "altura_mm",
    "entre_eixos_mm",
    "airbags_quantidade",
    "camera_re",
    "tela_central_pol",
    "carplay",
    "android_auto",
    "preco_tabela_brl",
}


# ---------------------------------------------------------------------------
# Metadados de rastreabilidade
# ---------------------------------------------------------------------------

@dataclass
class FonteSecundaria:
    url: str
    valor: Any
    status: StatusEnum
    confianca: float


@dataclass
class AtributoMeta:
    atributo: str
    valor: Any
    confianca: float
    fonte_primaria: str
    fontes_secundarias: list[FonteSecundaria] = field(default_factory=list)
    mercado_confirmado_br: bool = True
    divergente: bool = False
    revisado_humano: bool = False
    schema_nivel: SchemaNivelEnum = "core"


@dataclass
class CatalogoCompleto:
    schema: CatalogoSchema
    metadados: dict[str, AtributoMeta]
    cobertura_pct: float
    status: CatalogoStatusEnum
    data_extracao: datetime
    fontes_utilizadas: list[str]


@dataclass
class TermoDesconhecido:
    termo: str
    contexto: str
    atributo_sugerido: str | None
    fonte: str
    data_detectado: date


@dataclass
class ResultadoExtracao:
    catalogo: CatalogoCompleto
    termos_desconhecidos: list[TermoDesconhecido]
    gaps_restantes: list[str]
    log_decisoes: list[str]
    cobertura_live_pct: float = 0.0  # cobertura antes do seed KB fallback


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    exemplo = CatalogoSchema(
        marca="ford",
        modelo="Ranger",
        versao="Raptor",
        ano_modelo=2025,
        segmento="pickup",
        combustivel="gasolina",
        cilindrada_l=3.0,
        configuracao_motor="V6 biturbo",
        inducao="biturbo",
        potencia_cv=397,
        torque_nm=583,
        tracao="4x4",
        cambio_tipo="automatico",
        cambio_marchas=10,
        comprimento_mm=5362,
        largura_mm=1918,
        altura_mm=1873,
        entre_eixos_mm=3270,
        airbags_quantidade=7,
        camera_re=True,
        camera_360=True,
        tela_central_pol=12.0,
        carplay=True,
        android_auto=True,
        preco_tabela_brl=469_990,
    )
    print(exemplo.model_dump_json(indent=2))
    print(f"\nAtributos core preenchidos: {sum(1 for a in ATRIBUTOS_CORE if getattr(exemplo, a) is not None)}/{len(ATRIBUTOS_CORE)}")
