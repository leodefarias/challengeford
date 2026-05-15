# PROJETO FORD — Análise Competitiva de Catálogos

## Descritivo Técnico v5.0

#### Pickups & SUVs | Mercado Brasil | 2025

---

## 1. O Que Este Projeto É

Uma POC para demonstrar à Ford que é possível automatizar a análise competitiva de catálogos automotivos usando IA com RAG (Retrieval-Augmented Generation).

**O que a Ford faz hoje (manualmente):**
- Analistas assistem vídeos, visitam concessionárias, consultam sites
- Montam fichas técnicas à mão, uma por uma
- Comparam catálogos em planilhas sem padronização
- Processo lento, subjetivo, não escalável

**O que a POC demonstra:**
- Coleta de specs a partir de fontes públicas validadas (PDFs oficiais, APIs, sites)
- Base de conhecimento automotivo (RAG) com vetorização de documentos que se auto-enriquece a cada catálogo processado
- Agente de IA em Python que decide autonomamente quais ferramentas usar (PDF parser, scraping, API, transcrição de vídeo) baseado nos gaps detectados
- Normalização inteligente ancorada em evidências documentais (geração baseada em evidências)
- Sistema de Capability Areas que compara veículos mesmo quando features não têm equivalente direto
- Score competitivo com gaps acionáveis e contexto de mercado
- App mobile (React Native) com chat interativo sobre catálogos (RAG em ação)

**Contexto real:**
- Desenvolvido por 1 pessoa, timeline de 1 ano
- Sem acesso à infra Ford (sem Airflow, BigQuery, Power BI)
- Objetivo: demonstrar valor suficiente pra Ford contratar o desenvolvimento completo

---

## 2. Escopo da POC

### O que entra

| Item | Detalhe |
|------|---------|
| Segmento | Apenas pickups (mais uniforme, mais fácil de comparar) |
| Catálogos | 6 catálogos topo de linha — cluster mais relevante pra demonstrar valor |
| Schema | Atributos core + estendidos em 7 grupos + Capability Areas derivadas |
| Output | App mobile React Native + APIs Java + microsserviço Python |

### Os 6 catálogos da POC

| Marca | Modelo | Versão |
|-------|--------|--------|
| Ford | Ranger | Raptor |
| Toyota | Hilux | GR-S |
| VW | Amarok | V6 Extreme |
| Chevrolet | S10 | High Country |
| Mitsubishi | Nova Triton | HPE-S |
| Nissan | Frontier | PRO-4X |

> **Nota sobre Mitsubishi:** O catálogo da POC é a Nova Triton (6ª geração), não a L200 Triton Sport (5ª geração) que está saindo de linha. A Nova Triton tem motor 2.4L biturbo 205cv (vs. 190cv da geração anterior). Na coleta, o campo `potencia_cv` serve como discriminador: se extrair 190cv, a fonte está retornando dados da geração errada.

### O que NÃO entra na POC

- SUVs (expansão futura)
- Integração com infra Ford (Airflow, BigQuery, Power BI — só após contratação)
- Clustering automático com ML (6 catálogos — o cluster é fixo)
- Re-coleta automática periódica

---

## 3. Arquitetura Geral do Sistema

### 3.1 Visão Geral

A arquitetura é dividida em três camadas principais com comunicação assíncrona via fila de mensagens:

```
┌─────────────────────────────────────────────────────────────┐
│                   React Native (Mobile)                      │
│         App Ford — iOS & Android                             │
│  Ficha │ Comparativo │ Scores │ Gaps │ Chat RAG │ Auditoria  │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST / HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│                Java — Spring Boot                            │
│                API Principal                                 │
│  Auth │ CRUD Catálogos │ Scores │ Gaps │ Orquestração        │
│                        │                                     │
│               Oracle Database                                │
│  Catálogos │ Scores │ Histórico │ Usuários │ Cache Chat      │
└───────────────────────┬─────────────────────────────────────┘
                        │ RabbitMQ (fila assíncrona)
┌───────────────────────▼─────────────────────────────────────┐
│              Python — FastAPI (Microsserviço IA)             │
│  Agente │ RAG │ Extração │ Normalização │ Scoring │ Chat      │
│                        │                                     │
│               ChromaDB (banco vetorial)                      │
│  Specs │ Terminologia │ Ranges │ Capability Definitions      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Responsabilidades por Camada

**React Native**
- Interface do usuário (iOS e Android)
- Consumo da API Java via REST
- Autenticação com token JWT
- Exibição de fichas, comparativos, scores e chat RAG

**Java — Spring Boot**
- API REST principal consumida pelo app
- Autenticação e controle de acesso (JWT)
- CRUD de catálogos, versões e configurações
- Persistência no Oracle (catálogos validados, scores, histórico, cache do chat)
- Publicação de jobs na fila RabbitMQ (trigger de coleta, re-análise)
- Consumo de resultados publicados pelo Python na fila de retorno
- Orquestração de fluxo (quando acionar coleta, quando exibir dados)

**Python — FastAPI (Microsserviço IA)**
- Consumo de jobs da fila RabbitMQ (coleta, extração, scoring, chat)
- Agente de IA com loop percepção → decisão → ação → observação
- RAG com ChromaDB (4 coleções vetoriais)
- Extração de specs via PDF, scraping, API FIPE, YouTube/Whisper
- Normalização com LLM + contexto RAG
- Validação pós-LLM (ranges, cross-checks, flag de mercado BR)
- Scoring competitivo e gap detection
- Chat RAG com mecanismo de "não sei"
- Publicação de resultados na fila de retorno para o Java

**Oracle**
- Banco de dados principal do sistema
- Catálogos validados (schema canônico completo)
- Histórico de versões e changelog do segmento
- Scores técnicos, custo-benefício e gaps
- Usuários, permissões e audit log
- Cache de respostas do chat RAG
- Termos pendentes de mapeamento

**ChromaDB**
- Banco vetorial exclusivo do microsserviço Python
- Não é acessado diretamente pelo Java nem pelo app
- 4 coleções especializadas (ver seção 4.7)

**RabbitMQ**
- Fila assíncrona entre Java e Python
- Java publica jobs (coleta, extração, scoring, chat)
- Python consome jobs, processa e publica resultados
- Java consome resultados e persiste no Oracle
- Garante desacoplamento: coleta de catálogos é lenta e não pode travar a API

### 3.3 Fluxo de Comunicação — Coleta de Catálogo

```
App (React Native)
  → POST /api/catalogos/coletar (Java)
  → Java publica job na fila: { tipo: "COLETA", catalogo_id: "frontier_pro4x" }
  → Python consome job → executa agente → extrai → valida → puntua
  → Python publica resultado na fila de retorno
  → Java consome resultado → persiste no Oracle → notifica app via WebSocket ou polling
  → App exibe ficha técnica completa
```

### 3.4 Fluxo de Comunicação — Chat RAG

```
App (React Native)
  → POST /api/chat/perguntar (Java)
  → Java verifica cache no Oracle (pergunta similar?)
    → Cache hit: retorna resposta imediata
    → Cache miss: publica job na fila: { tipo: "CHAT", pergunta: "..." }
  → Python consome job → threshold RAG → LLM → validação → resposta
  → Python publica resposta na fila de retorno
  → Java consome → salva cache Oracle → retorna pro app
```

### 3.5 Estrutura de Filas RabbitMQ

| Fila | Direção | Payload |
|------|---------|---------|
| `ford.coleta.jobs` | Java → Python | `{ tipo, catalogo_id, prioridade }` |
| `ford.chat.jobs` | Java → Python | `{ tipo, pergunta, usuario_id, contexto }` |
| `ford.resultados` | Python → Java | `{ job_id, status, dados, erros }` |
| `ford.dlq` | Falhas | Jobs que falharam após 3 tentativas |

---

## 4. Fontes de Dados — Validadas por Teste Real

Cada fonte listada abaixo foi testada em março/2026 com requests reais. Os resultados determinaram a hierarquia de coleta.

### 4.1 Hierarquia de Fontes

```
PRIORIDADE 1 — PDFs Oficiais das Montadoras (download direto de CDN)
├─ Ford: ford.com.br/content/dam/... → E-book + Ficha técnica PDF
├─ Toyota: media.toyota.com.br/... → Ficha técnica tabular completa
├─ VW: vw-digital-cdn-br.itd.vw.com.br/... → Presskit com specs tabulares
├─ Mitsubishi: mitsubishimotors.com.br/static/pdfs/FOLDER/... → Folders por versão
├─ Nissan: Não encontrado PDF público → fallback pro site
└─ Chevrolet: Site fora do ar nos testes → fallback pra reviews

PRIORIDADE 2 — API FIPE (REST JSON)
└─ fipe.online / deividfortuna.github.io/fipe → Preço de referência BR

PRIORIDADE 3 — Sites Oficiais BR (Playwright quando necessário)
├─ mitsubishimotors.com.br → Specs por versão, features off-road
├─ nissan.com.br → Specs, Safety Shield 360°, Drive Modes
└─ Sites de outras montadoras como complemento

PRIORIDADE 4 — Sites de Review BR (sem bloqueio, boa qualidade)
├─ Mobiauto → Fichas técnicas detalhadas com ADAS e off-road
├─ Car.blog.br / Carro.blog.br → Fichas + dados de teste real
└─ iCarros → Specs básicos, acessível sem bloqueio

PRIORIDADE 5 — YouTube (gap-triggered, cirúrgico)
├─ Canais oficiais das montadoras (Ford Brasil, Toyota do Brasil)
├─ Reviews técnicos (Acelerados, Garagem do Bellote)
└─ Transcrição via Whisper → LLM extrai dados específicos faltantes

PRIORIDADE 6 — Fontes Globais (validação cruzada e ranges)
├─ Wikipedia → Contexto, variantes de motor, histórico
├─ Dimensions.com → Dimensões exatas com diagramas
├─ ZigWheels / AutoDeal / CarsGuide → Lista de ADAS, specs detalhados
└─ Auto-Data.net API → Ranges do segmento (120+ parâmetros, se custo viável)
```

### 4.2 Resultados dos Testes de Extração

| Montadora | Fonte Testada | Cobertura do Schema | Formato |
|-----------|--------------|--------------------|---------| 
| Toyota | PDF ficha técnica | ~95% | Tabela numérica perfeita |
| VW | PDF presskit CDN | ~90% | Tabela numérica perfeita |
| Ford | PDF e-book | ~85% | Texto marketing rico |
| Mitsubishi | Site oficial BR | ~80% | Texto semi-estruturado |
| Nissan | Site oficial BR | ~80% | Texto semi-estruturado |
| Chevrolet | Mobiauto (fallback) | ~85% | Review estruturado |

**Fontes descartadas:**

| Fonte | Motivo |
|-------|--------|
| CarrosNaWeb | Bloqueado (robots.txt) |
| Webmotors | 403 Forbidden |
| MagoDosCarros | Bloqueado (robots.txt) |
| iCarros | Specs básicos (~15 atributos), sem ADAS |

### 4.3 Proteção de Mercado: Flag de Origem

Fontes globais (Tier 6) podem listar specs de versões vendidas em outros mercados. Para evitar contaminação:

```python
@dataclass
class AtributoExtraido:
    atributo: str
    valor: Any
    fonte: str
    confianca: float
    mercado_confirmado_br: bool  # True = fonte BR, False = fonte global

# Regra: dados com mercado_confirmado_br = False:
# → NÃO entram no cálculo de score
# → Servem apenas como hint pra busca em fontes BR
# → Exibidos no app com badge "dado global — não confirmado BR"
# → Se fonte BR confirma posteriormente, flag muda pra True
```

### 4.4 Resolução de Conflitos Entre Fontes

```
Regra de resolução (por ordem de prioridade):

1. Fonte oficial BR (PDF/site montadora) sempre prevalece
2. Se apenas fontes secundárias BR existem:
   a. Se concordam (diferença ≤ 5%) → usar média, confiança 0.8
   b. Se divergem (> 5%) → usar mediana, confiança 0.5, divergente = true
3. Se apenas fontes globais existem:
   → mercado_confirmado_br = false, não entra no score

Exemplo real encontrado nos testes:
Ford Ranger Raptor potência:
  PDF Ford oficial: 397 cv → usar este (fonte oficial)
  MagoDosCarros:   405 cv → ignorar (diverge da fonte oficial)
  iCarros:         397 cv → confirma fonte oficial
```

### 4.5 Estratégia Anti-Fragilidade

```
Para cada catálogo:
1. Cache local tem < 30 dias? → usar cache (90% dos casos param aqui)
2. PDF oficial disponível?    → download direto do CDN (Ford, Toyota, VW)
3. Site oficial acessível?    → Playwright com delay humanizado
4. Site bloqueado?            → tentar fonte secundária (Mobiauto, iCarros)
5. Gaps específicos restam?   → YouTube (busca cirúrgica por atributo)
6. Tudo bloqueado?            → manter cache anterior + flag "dados_desatualizados"
```

Volume real: ~52 catálogos × ~3 fontes = ~150 requests por ciclo de coleta mensal, distribuídos em ~10 domínios. Isso dá ~15 requests/site/mês.

### 4.6 Versionamento de Catálogos e Detecção de Mudanças

```python
@dataclass
class VersaoCatalogo:
    catalogo_id: str    # "ranger_raptor_2025"
    data_coleta: date
    hash_fonte: str     # hash SHA-256 do PDF/HTML fonte
    atributos: dict     # schema completo nesta versão

# Na re-coleta mensal:
# 1. Baixar fonte novamente
# 2. Calcular hash do conteúdo
# 3. Se hash == hash anterior → nada mudou, skip
# 4. Se hash != hash anterior → publicar job de re-extração na fila
# 5. Python re-extrai e publica resultado
# 6. Java persiste nova versão no Oracle, versão anterior vai pro histórico
# 7. Diff entre versões é calculado e armazenado
# 8. App exibe badge: "Atualizado em DD/MM — ver mudanças"
```

Isso habilita tendências temporais — funcionalidade de alto valor pro time de produto:

- "Toyota adicionou câmera 360° na Hilux GR-S (atualização jul/2025)"
- "Chevrolet aumentou potência da S10 de 200cv para 207cv (MY2025)"
- "3 de 5 concorrentes agora oferecem câmera 360° de série"

### 4.7 YouTube como Gap-Filler

YouTube não é fonte de coleta massiva. É acionado cirurgicamente quando restam atributos null após as fontes primárias:

```
Trigger: atributo com valor null após fontes 1-4

Exemplo:
  Schema da Frontier PRO-4X preenchido via site Nissan
  Atributos faltantes: angulo_ataque_graus, profundidade_vadeo_mm

  Sistema busca: "Nissan Frontier PRO-4X ângulo ataque off-road"
  Encontra vídeo oficial ou review técnico
  Transcreve via Whisper (local, gratuito)
  LLM extrai especificamente os dados faltantes
  Valida contra ranges da KB
  Se passa → preenche com confiança 0.5 (fonte = vídeo)
```

---

## 5. Arquitetura RAG, Vetorização e Geração Baseada em Evidências

### 5.1 O Problema do LLM Puro

LLMs geram respostas baseadas em padrões aprendidos durante o treinamento. Isso causa problemas concretos quando usadas para extrair dados técnicos:

- **Alucinação de valores:** Um LLM pode responder que a Ranger Raptor tem 405cv quando são 397cv
- **Dados datados:** O treinamento tem corte temporal — modelos de 2024 podem não saber que a S10 2025 mudou de 200cv para 207cv
- **Sem conhecimento do domínio BR:** O LLM não sabe que "Trail Control" (Ford), "Crawl Control" (Toyota) e "DAC" (Mitsubishi) significam a mesma coisa: controle de descida
- **Sem referência do segmento:** Se o LLM extrair 1500cv de uma pickup, ele não detecta que é impossível

### 5.2 RAG Como Solução

Para resolver esses problemas, o microsserviço Python utiliza RAG: em vez de confiar na memória interna do LLM, o sistema fornece documentos validados como base obrigatória para a resposta.

```
Documento: "A Ranger Raptor tem motor 3.0 V6 biturbo com 397cv"
↓ modelo de embedding (sentence-transformers)
Vetor: [0.23, -0.45, 0.67, 0.12, ...] (768 dimensões)

Consulta: "Qual a potência da Ranger?"
↓ mesmo modelo de embedding
Vetor: [0.21, -0.42, 0.65, 0.14, ...]

Similaridade de cosseno: 0.94 → documento retornado como contexto
```

**Geração Baseada em Evidências:**

```
"Você é um extrator de specs automotivos. Extraia atributos APENAS a partir
do texto fornecido e dos documentos de referência da Knowledge Base.
Se um atributo não for mencionado em nenhuma fonte, retorne null.
NÃO use conhecimento interno para preencher valores.
Se houver ambiguidade, sinalize no campo 'notas_extracao'."
```

Toda informação no sistema é rastreável até uma fonte validada — eliminando o risco de alucinação e permitindo que o app cite a origem de cada dado.

### 5.3 Validação da Premissa RAG — Teste A/B

```
Teste A/B com o 4º catálogo (S10 High Country):

Grupo A — LLM puro (sem RAG):
  Input: texto bruto da S10 High Country
  Prompt: schema Pydantic + regras de extração
  Sem contexto da KB

Grupo B — LLM + RAG:
  Input: mesmo texto bruto
  Prompt: mesmo schema + mesmas regras
  + Contexto RAG: specs dos 3 seed (Ranger, Hilux, Amarok)
  + Terminologia mapeada + Ranges do segmento

Critério de sucesso:
  RAG deve reduzir taxa de erro em ≥ 15% OU
  RAG deve reduzir taxa de null em ≥ 20% OU
  RAG deve aumentar normalização correta em ≥ 30%

Se nenhum critério for atingido:
  → Simplificar arquitetura (LLM puro + validação, sem ChromaDB)
```

### 5.4 As 4 Coleções da KB (ChromaDB)

- **Coleção 1 — Specs Normalizados:** Cada documento = 1 atributo de 1 catálogo validado
- **Coleção 2 — Mapeamento Terminológico:** "4MOTION" → `tracao: 4x4_tempo_integral`, "Trail Control" → `controle_descida: true`
- **Coleção 3 — Ranges do Segmento:** O que é "normal" para pickups no BR. Ex: "potência pickup diesel: 170–400cv, média 230cv"
- **Coleção 4 — Capability Definitions:** Definições das áreas de capacidade com níveis de maturidade

### 5.5 O Ciclo de Enriquecimento

```
Catálogo 1: KB vazia → extração sem grounding (seed manual)
Catálogo 2: KB tem 1 ref → embeddings similares ancoram extração
Catálogo 6: KB tem 5 refs → grounding forte
Catálogo 52: KB robusta → extração altamente confiável
```

### 5.6 Detecção Automática de Termos Não-Mapeados

```python
@dataclass
class TermoDesconhecido:
    termo: str                  # "S-Flow", "MyMode Raptor"
    contexto: str               # frase onde apareceu
    atributo_sugerido: str|None # sugestão do LLM
    fonte: str
    data_detectado: date

# Fluxo:
# 1. LLM detecta termo desconhecido durante extração
# 2. Python publica na fila de retorno: { tipo: "TERMO_PENDENTE", ... }
# 3. Java persiste na tabela TERMOS_PENDENTES do Oracle
# 4. App exibe log de "Termos Pendentes de Mapeamento"
# 5. Após revisão humana, termo entra na KB Python (ChromaDB)
# 6. Próximas extrações já reconhecem o termo automaticamente
```

### 5.7 Fluxo de Extração — Agent Loop (Python)

```
Input: job da fila RabbitMQ { catalogo_id, texto_bruto }

PERCEPÇÃO:
  1. Busca na KB (Coleção 1): specs similares já validados
  2. Busca na KB (Coleção 2): termos relevantes no texto
  3. Busca na KB (Coleção 3): ranges do segmento

DECISÃO + AÇÃO:
  4. Chamada ao LLM com structured output + contexto RAG
  5. LLM retorna schema preenchido + termos_desconhecidos

OBSERVAÇÃO + VALIDAÇÃO:
  6. Validação pós-LLM (ranges hard-coded + regras cruzadas via Pydantic)
  7. Verificação de mercado (fonte BR? → mercado_confirmado_br = true)

ATUALIZAÇÃO:
  8. Dados que passam → vetorizados no ChromaDB
  9. Dados que falham → flag "pendente_revisao"
 10. Termos desconhecidos → publicados na fila de retorno

PUBLICAÇÃO:
 11. Resultado completo publicado na fila ford.resultados
 12. Java consome, persiste no Oracle, notifica o app

REPETIÇÃO:
 13. Se atributos core ainda são null → agente aciona próxima tool
     (site oficial → review BR → YouTube → fontes globais)
```

### 5.8 Abstração do LLM — Proteção Contra Lock-in

```python
class LLMClient(Protocol):
    def extract(self, text: str, schema: type, context: str) -> dict: ...

class ClaudeClient(LLMClient):
    """Implementação primária — Claude Sonnet via Anthropic API"""
    ...

class OpenAIClient(LLMClient):
    """Fallback — GPT-4o via OpenAI API"""
    ...

# config.py
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "claude")  # claude | openai | local
```

---

## 6. Schema Canônico

O schema é o contrato central. Todo dado é mapeado para este formato. Atributos atômicos, tipos estritos, enums fechados, `null` = não encontrado (≠ false).

### 6.1 Schema Adaptativo: Core vs. Estendido

```
Schema Core: Atributos preenchidos em ≥ 2 dos 3 seed
→ Sempre exibidos no app
→ Usados no cálculo de score
→ Atributos faltantes disparam gap-fill (YouTube, etc.)

Schema Estendido: Atributos preenchidos em < 2 dos 3 seed
→ Exibidos no app apenas quando têm valor
→ NÃO usados no score
→ Migram pra Core se passarem a ser preenchidos com frequência
```

### 6.2 Atributos Definidos

**Identificação:** `marca` (enum), `modelo` (string), `versao` (string), `ano_modelo` (int), `segmento` (enum: pickup|suv)

**Motorização:** `combustivel` (enum), `cilindrada_l` (float, 1.0–6.5), `configuracao_motor` (string), `inducao` (enum), `potencia_cv` (int, 50–999), `torque_nm` (int, 80–999), `consumo_cidade_km_l` (float|null), `consumo_estrada_km_l` (float|null)

**Transmissão & Tração:** `cambio_tipo` (enum), `cambio_marchas` (int, 4–10), `tracao` (enum: 4x2|4x4|4x4_tempo_integral|awd), `reducao` (bool), `diferencial_bloqueio` (bool)

**Dimensões & Capacidade:** `comprimento_mm` (int), `largura_mm` (int), `altura_mm` (int), `entre_eixos_mm` (int), `peso_bruto_kg` (int|null), `capacidade_carga_kg` (int|null), `capacidade_reboque_kg` (int|null)

**Off-Road:** `modos_conducao` (list[string]), `controle_descida` (bool), `angulo_ataque_graus` (float|null), `angulo_saida_graus` (float|null), `angulo_rampa_graus` (float|null), `profundidade_vadeo_mm` (int|null)

**Segurança & ADAS:** `airbags_quantidade` (int), `frenagem_autonoma` (bool), `aviso_colisao_frontal` (bool), `manutencao_faixa` (bool), `monitoramento_ponto_cego` (bool), `camera_re` (bool), `camera_360` (bool), `controle_cruzeiro_adaptativo` (bool), `estacionamento_automatico` (bool)

**Conforto & Conectividade:** `tela_central_pol` (float|null), `painel_digital_pol` (float|null), `carplay` (bool), `android_auto` (bool), `conexao_sem_fio` (bool), `teto_solar` (enum), `bancos_material` (enum), `bancos_eletricos` (bool), `bancos_aquecidos` (bool), `bancos_ventilados` (bool), `ar_condicionado` (enum), `carregador_wireless` (bool)

**Precificação:** `preco_tabela_brl` (int|null — via API FIPE), `data_referencia_preco` (date|null)

### 6.3 Metadados por Atributo (persistidos no Oracle)

```python
@dataclass
class AtributoMeta:
    valor: Any
    confianca: float          # 0.0–1.0
    fonte_primaria: str       # URL ou path do PDF
    fontes_secundarias: list  # outras fontes que confirmam/divergem
    mercado_confirmado_br: bool
    divergente: bool
    revisado_humano: bool
    schema_nivel: str         # "core" | "estendido"
```

---

## 7. Capability Areas — Comparação Além de Booleanos

### 7.1 O Problema

O schema trata features como campos isolados. Isso cria pontos cegos: features sem equivalente direto (retrovisor digital), mesma área com níveis diferentes (câmera ré vs. 360), features inéditas no segmento.

### 7.2 A Solução

Capability Areas com níveis de maturidade:

```
Capability: "Visibilidade Traseira"
  Nível 0: Apenas espelhos
  Nível 1: Câmera de ré
  Nível 2: Câmera 360°
  Nível 3: Câmera 360° + retrovisor digital

Ranger Raptor: Nível 2 (câmera 360°)
Hilux GR-S:   Nível 2 (câmera 360°)
Amarok V6:    Nível 1 (câmera de ré — a confirmar)
```

### 7.3 Capabilities Definidas

**Grupo Segurança:** visibilidade_traseira, frenagem_inteligente, assistencia_faixa, monitoramento_entorno, cruise_control, estacionamento

**Grupo Off-Road:** capacidade_offroad, suspensao

**Grupo Conforto:** sistema_multimidia, climatizacao, bancos

**Grupo Motorização:** performance_motor (score numérico direto), transmissao

### 7.4 Relação com o Schema

```
Camada 1: Atributos flat (schema canônico) → fato coletado  — Oracle
Camada 2: Capability levels (derivados)    → interpretação  — Oracle
Camada 3: Score (derivado dos levels)      → análise        — Oracle

Se a Ford discordar de como uma capability é definida,
muda a camada 2 sem tocar nos dados.
```

---

## 8. Score Competitivo

### 8.1 Score Técnico (0–100)

Calculado pelo microsserviço Python, persistido no Oracle:

```
score_capability = (nível_ford / nível_máximo_no_cluster) × 100
Score Técnico = Σ (score_capability × peso_grupo × modificador_perfil)
```

| Grupo | Peso base | Justificativa |
|-------|-----------|---------------|
| Motorização | 25% | Critério primário de compra |
| Segurança & ADAS | 20% | Diferenciador crescente |
| Off-Road | 15% | Core pra pickups |
| Conforto & Conectividade | 15% | Expectativa do consumidor |
| Transmissão & Tração | 10% | Pouca variação |
| Dimensões | 5% | Pouco diferenciador |
| Preço | 10% | Competitividade direta |

### 8.2 Perfis de Competição

```python
PERFIS = {
    "ranger_raptor": {
        "perfil": "performance_offroad",
        "modificadores": {
            "off_road": 2.0,
            "motorizacao": 1.5,
            "seguranca_adas": 1.0,
            "conforto": 0.5,
            "dimensoes": 0.5
        }
    },
    "ranger_limited": {
        "perfil": "premium_urbano",
        "modificadores": {
            "conforto": 1.5,
            "seguranca_adas": 1.5,
            "off_road": 0.5,
            "motorizacao": 1.0
        }
    }
}
```

### 8.3 Proteção Contra Viés de Completude

O score é calculado apenas sobre capabilities onde **todos** os catálogos do cluster têm dados suficientes. O app exibe claramente: "Score calculado sobre X de Y capabilities. Z capabilities excluídas por dados incompletos."

### 8.4 Score de Custo-Benefício

```
Score Valor = Score Técnico / preço_normalizado
Onde: preço_normalizado = preço_catálogo / preço_médio_do_cluster

Exemplo:
  Ranger Raptor: Score Técnico 82, preço R$470k
  Hilux GR-S:   Score Técnico 75, preço R$340k
  Preço médio cluster: R$370k

  Raptor: valor = 82 / (470/370) = 64.6
  Hilux:  valor = 75 / (340/370) = 81.5

→ Hilux entrega mais valor por real gasto
→ App exibe: "Raptor lidera em specs absolutos. Hilux lidera em custo-benefício."
```

---

## 9. Arquitetura Técnica — Stack Completo

### 9.1 Stack por Camada

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Mobile | React Native | iOS + Android com código compartilhado |
| API principal | Java 21 + Spring Boot 3 | Robusto, corporativo, ecossistema Oracle maduro |
| ORM | Hibernate / Spring Data JPA | Integração nativa com Oracle |
| Banco principal | Oracle Database | Padrão corporativo, confiabilidade, auditoria |
| Fila | RabbitMQ | Desacoplamento Java ↔ Python, jobs assíncronos |
| Microsserviço IA | Python 3.12 + FastAPI | Ecossistema IA/ML, LangChain, Whisper |
| LLM (primário) | Claude API (Sonnet) | Structured outputs, bom custo-benefício |
| LLM (fallback) | OpenAI GPT-4o | Testado no mês 2 como backup |
| RAG / Embeddings | ChromaDB + sentence-transformers | Vetorização local, busca semântica |
| PDF Parsing | pdfplumber | Bom pra PDFs com tabelas |
| Scraping | Playwright (async) | Só quando necessário |
| Transcrição | Whisper (local) | YouTube gap-filler, gratuito |
| Validação | Pydantic v2 | Type safety + structured outputs |
| Auth | JWT + Spring Security | Padrão de mercado |

### 9.2 Modelo de Agente (Python)

O microsserviço Python segue o padrão ReAct (Reasoning + Acting):

```
┌─────────────────────────────────────────────────────────────────┐
│              AGENTE ORQUESTRADOR (Python)                        │
│       (consome job da fila, decide quais tools acionar)          │
│                                                                  │
│  ┌──────────────────── TOOLS DISPONÍVEIS ─────────────────────┐ │
│  │                                                             │ │
│  │  pdf_extractor    → pdfplumber + LLM (PDFs oficiais)       │ │
│  │  site_scraper     → Playwright (sites das montadoras)      │ │
│  │  fipe_api         → REST JSON (preço de referência)        │ │
│  │  youtube_filler   → Whisper + LLM (gap-filler)             │ │
│  │  kb_search        → ChromaDB (consulta RAG)                │ │
│  │  validator        → Pydantic + ranges hard-coded           │ │
│  │  scorer           → Capability mapping + score calc        │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ▼                                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ChromaDB (vetorial) — 4 coleções especializadas           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ▼                                                               │
│  Publica resultado na fila ford.resultados (RabbitMQ)            │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Structured Outputs (Python)

```python
class CatalogoExtraido(BaseModel):
    potencia_cv: int | None = Field(ge=50, le=999)
    torque_nm: int | None = Field(ge=80, le=999)
    tracao: Literal["4x2", "4x4", "4x4_tempo_integral", "awd"] | None
    # ... demais atributos com tipos estritos e ranges

# Se o LLM retornar potencia_cv = "397 cavalos" (string),
# Pydantic rejeita e força re-extração.
# Se retornar potencia_cv = 2580 (fora do range),
# a validação pós-LLM flagga como anomalia.
```

### 9.4 Modelo de Dados Oracle (principais tabelas)

```sql
-- Catálogos validados
CATALOGO (id, marca, modelo, versao, ano_modelo, segmento, data_coleta,
          hash_fonte, status, score_tecnico, score_valor, perfil_competicao)

-- Atributos com metadados completos
CATALOGO_ATRIBUTO (id, catalogo_id, atributo, valor, confianca,
                   fonte_primaria, mercado_confirmado_br, divergente,
                   revisado_humano, schema_nivel)

-- Histórico de versões
CATALOGO_HISTORICO (id, catalogo_id, data_coleta, hash_fonte, atributos_json)

-- Gaps e scores por capability
CAPABILITY_SCORE (id, catalogo_id, capability, nivel, nivel_maximo_cluster,
                  score_bruto, score_ajustado, lider_id)

-- Cache do chat RAG
CHAT_CACHE (id, pergunta_hash, pergunta, resposta, fontes_citadas,
            created_at, expires_at)

-- Termos pendentes de mapeamento
TERMO_PENDENTE (id, termo, contexto, atributo_sugerido, fonte, data_detectado,
                status, revisado_por)

-- Jobs da fila (espelho para rastreabilidade)
FILA_JOB (id, tipo, catalogo_id, status, created_at, processed_at, erro)
```

### 9.5 Estrutura do Repositório

```
ford-catalog/
├── mobile/                          # React Native
│   ├── src/
│   │   ├── screens/
│   │   │   ├── FichaTecnicaScreen
│   │   │   ├── ComparativoScreen
│   │   │   ├── ScoreBoardScreen
│   │   │   ├── GapsScreen
│   │   │   ├── ChatScreen
│   │   │   └── AuditoriaScreen
│   │   ├── components/
│   │   └── services/                # HTTP clients para a API Java
│   └── package.json
│
├── backend-java/                    # Spring Boot
│   ├── src/main/java/br/ford/catalog/
│   │   ├── api/                     # Controllers REST
│   │   ├── domain/                  # Entidades JPA (Oracle)
│   │   ├── service/                 # Lógica de negócio
│   │   ├── queue/                   # Producers e Consumers RabbitMQ
│   │   ├── security/                # JWT + Spring Security
│   │   └── config/
│   └── pom.xml
│
├── microsservico-ia/                # Python FastAPI
│   ├── src/
│   │   ├── api/                     # Endpoints FastAPI + health check
│   │   ├── queue/                   # Consumer RabbitMQ (jobs)
│   │   ├── agent/                   # Orquestrador + tools
│   │   │   └── tools/
│   │   │       ├── pdf_extractor.py
│   │   │       ├── site_scraper.py
│   │   │       ├── fipe_api.py
│   │   │       ├── youtube_filler.py
│   │   │       └── kb_search.py
│   │   ├── schema.py                # Pydantic — schema canônico
│   │   ├── llm_client.py            # Interface abstrata LLM
│   │   ├── knowledge_base/          # ChromaDB + embeddings
│   │   ├── normalizer/              # Extração + validação + confiança
│   │   ├── analysis/                # Capability mapping + scoring
│   │   └── config.py
│   ├── data/
│   │   ├── seed/                    # 3 catálogos validados à mão (JSON)
│   │   ├── pdfs/                    # PDFs oficiais (cache)
│   │   └── validated/
│   └── requirements.txt
│
└── infra/
    ├── docker-compose.yml           # RabbitMQ + ChromaDB local
    └── scripts/
        ├── 01_seed_kb.py
        ├── 02_run_agent.py
        └── 03_test_rag_ab.py
```

---

## 10. Interface Mobile — React Native

### 10.1 Telas do App

| Tela | Conteúdo | Propósito na demo |
|------|----------|-------------------|
| Ficha Técnica | Schema completo, badges de confiança e mercado por dado | Prova que normalização funciona |
| Comparativo | Ford vs. até 3 concorrentes, highlights, capabilities | Prova valor da padronização |
| Score Board | Score técnico + custo-benefício, perfil de competição, radar | Prova análise competitiva |
| Gaps | Lista priorizada com impacto ajustado e relevância | Mostra insights acionáveis |
| Chat RAG | Perguntas livres sobre catálogos | Killer feature — RAG em ação |
| Auditoria | Drill-down de qualquer dado: fonte, confiança, histórico | Gera confiança institucional |
| Termos Pendentes | Log de termos não-mapeados detectados | Mostra que o sistema sabe o que não sabe |
| Changelog | Timeline de mudanças detectadas por montadora | Inteligência de mercado |

### 10.2 Modo de Auditoria — Rastreabilidade Ponta a Ponta

Cada valor na tela é tocável e abre um painel de auditoria:

```
AUDITORIA: potencia_cv
─────────────────────────────────────────
Valor final:             397 cv
Confiança:               1.0
Schema nível:            Core
Mercado confirmado BR:   Sim

Fonte primária:
  ford.com.br/.../fbr-ranger-raptor-ficha-ebook.pdf
  Trecho: "3.0 V6 bi-turbo gasolina de 397cv com 583Nm"

Fontes secundárias:
  iCarros:        397 cv (confirma)
  MagoDosCarros:  405 cv (diverge — ignorado)

Capability derivada: performance_motor
Contribuição pro score: percentil 100 no cluster

Histórico:
  Mar/2025: 397 cv (coleta inicial)
  Sem mudanças detectadas
```

### 10.3 Chat RAG — Mecanismo de "Não Sei"

**Camada 1 — Threshold de relevância (Java, antes de publicar na fila):**
```
ChromaDB similarity score < 0.65?
→ Resposta automática sem publicar job:
  "Não tenho essa informação na minha base de catálogos."
→ Custo: $0 (LLM não é chamado)
→ Risco de alucinação: 0%
```

**Camada 2 — Instrução explícita no prompt do LLM (Python):**
```
"Se a pergunta NÃO puder ser respondida com base nos documentos
fornecidos, responda EXATAMENTE:
'Essa informação não está na minha base de conhecimento.'
NUNCA invente dados."
```

**Camada 3 — Validação pós-resposta (Python):**
```
Verificar se a resposta contém valores numéricos que NÃO aparecem
em nenhum documento do contexto RAG.
Se sim → flag como "possível alucinação" → não publicar na fila de retorno
```

### 10.4 Cache de Respostas do Chat (Oracle)

```java
// Java verifica cache antes de publicar job
String hash = sha256(normalize(pergunta));
Optional<ChatCache> cache = chatCacheRepo.findByHashAndNotExpired(hash);

if (cache.isPresent()) {
    return cache.get().getResposta(); // resposta instantânea
}

// Cache miss → publica job na fila
rabbitTemplate.convertAndSend("ford.chat.jobs", new ChatJob(pergunta, usuarioId));
```

---

## 11. Plano de Execução — 1 Ano

### Trimestre 1 — Fundação + POC (Meses 1–3)

| Mês | Entregável |
|-----|-----------|
| 1 | Schema canônico v1, seed de 3 catálogos (manual + LLM), terminology map (~80 termos), KB ChromaDB populada, Oracle com modelo de dados inicial, classificação core/estendido |
| 2 | Pipeline de coleta Python + fila RabbitMQ, extração dos 6 catálogos com RAG, teste A/B do RAG, teste de fallback LLM (Claude vs. GPT-4o), API Java com endpoints básicos |
| 3 | App React Native com 8 telas, perfil de competição, score custo-benefício, auditoria drill-down, chat RAG com "não sei", ROI quantificado, deploy, 1ª demo pra Ford |

**Gate 1:** 6 catálogos com ≥90% de acurácia. RAG mostra melhoria mensurável. Chat com mecanismo "não sei" funcional. App funcional com auditoria. ROI apresentado.

### Trimestre 2 — Escala + Refinamento (Meses 4–6)

| Mês | Entregável |
|-----|-----------|
| 4 | Expandir pra 24 catálogos, reclassificar core/estendido, versionamento com detecção de mudanças via hash |
| 5 | YouTube gap-filler, calibrar capabilities com dados reais, changelog do segmento |
| 6 | Score de cobertura (entry/mid/top), 2ª demo pra Ford com 24 catálogos |

### Trimestre 3 — SUVs + Automação (Meses 7–9)

| Mês | Entregável |
|-----|-----------|
| 7 | Expandir pra SUVs (28 catálogos adicionais), adaptar schema e capabilities |
| 8 | 52 catálogos completos, re-coleta com detecção de mudanças |
| 9 | Clustering híbrido (regras + embeddings), 3ª demo pra Ford |

### Trimestre 4 — Produção + Entrega (Meses 10–12)

| Mês | Entregável |
|-----|-----------|
| 10 | Alertas de mudança, histórico de catálogos, polish UX do app |
| 11 | Documentação completa, runbook, testes end-to-end |
| 12 | Entrega final, plano de migração pra infra Ford, proposta de contrato |

```
Mês   1  2  3  │  4  5  6  │  7  8  9  │  10 11 12
──────────────┼───────────┼───────────┼────────────
              FUNDAÇÃO    │   ESCALA  │  SUVs+AUTO │ PRODUÇÃO
          6 cats          │  24 cats  │  52 cats   │ Entrega
     Fila + App básico    │ versiona  │  cluster   │ Runbook
             1ª demo      │  2ª demo  │  3ª demo   │ Final
```

---

## 12. Métricas de Sucesso

### Métricas do Sistema

| Métrica | Target Mês 3 | Target Mês 12 |
|---------|-------------|--------------|
| Acurácia de extração (vs. validação humana) | ≥ 90% | ≥ 95% |
| Cobertura de atributos core preenchidos | ≥ 80% | ≥ 90% |
| Tempo pra análise completa de 1 catálogo | < 30 min (semi-auto) | < 5 min (auto) |
| % de atributos que precisam revisão humana | ≤ 30% | ≤ 10% |

### Métricas do RAG (mês 2)

| Métrica | Critério de sucesso |
|---------|-------------------|
| Redução de taxa de erro (com RAG vs. sem) | ≥ 15% |
| Redução de atributos null (com RAG vs. sem) | ≥ 20% |
| Normalização correta de termos (com RAG vs. sem) | ≥ 30% |

### Métricas do Chat RAG

| Métrica | Target |
|---------|--------|
| % de perguntas fora do escopo corretamente rejeitadas (camada 1) | ≥ 90% |
| Taxa de alucinação detectada em respostas (camada 3) | < 5% |
| Tempo de resposta (cache hit — Oracle) | < 200ms |
| Tempo de resposta (cache miss — fila + LLM) | < 8s |

---

## 13. Limitações Honestas

O sistema **NÃO** faz:
- Análise de design ou estética
- Captura de opinião de mercado (reviews de consumidores, NPS)
- Previsão de preço futuro
- Análise de custo de propriedade (seguro, manutenção, peças)
- Comparação com mercados fora do Brasil
- Recomendações de posicionamento estratégico (o sistema identifica gaps — a decisão estratégica é do time Ford)

A qualidade depende diretamente das fontes públicas. Se uma montadora não publica uma spec, o sistema marca como `null` com confiança 0 — nunca inventa.

---

## 14. Compliance e Uso de Dados

**Natureza dos dados:** Todos os dados coletados são informações públicas publicadas voluntariamente pelas montadoras para fins comerciais. Nenhum dado pessoal é coletado, processado ou armazenado.

**Fontes e respeito a termos de uso:**
- PDFs oficiais: documentos públicos disponíveis para download sem restrição
- API FIPE: API pública com termos de uso permissivos
- Sites oficiais: o sistema respeita `robots.txt` — fontes que bloqueiam crawlers foram descartadas
- YouTube: apenas transcrição de áudio é extraída, sem download ou redistribuição de vídeo
- Fontes globais: Wikipedia (licença livre), sites de specs com informações públicas

**O que não é feito:**
- Nenhum bypass de bloqueios técnicos (captchas, rate limits, paywalls)
- Nenhuma coleta de dados pessoais
- Nenhuma redistribuição de conteúdo protegido por copyright
- Nenhum acesso a áreas restritas ou autenticadas

---

## 15. Custos Estimados

### POC (Trimestre 1)

| Item | Custo |
|------|-------|
| Claude API (Sonnet) | ~$20–50 |
| ChromaDB / SQLite local | $0 |
| RabbitMQ (Docker local) | $0 |
| Oracle (Oracle XE — dev) | $0 |
| Hospedagem API Java (Railway) | ~$10–20/mês |
| **Total** | **~$30–80** |

### Operação Anual (após 52 catálogos)

| Item | Custo/mês |
|------|-----------|
| Claude API | ~$50–150 |
| Hosting Java API (Railway/Cloud Run) | ~$30–60 |
| Hosting Python microsserviço | ~$20–40 |
| RabbitMQ gerenciado | ~$15–30 |
| Oracle Cloud (OLTP básico) | ~$20–50 |
| Auto-Data.net API (se usado) | ~$30–100 |
| **Total** | **~$165–430/mês** |

---

## 16. Estimativa de ROI

**Cenário atual (manual):**
- 1 analista sênior dedicado (~2 semanas por ciclo)
- Frequência: ~4x por ano (trimestral)
- Cobertura: ~20 catálogos por ciclo
- Custo do analista: ~R$15.000/mês → R$7.500 por ciclo
- Custo anual em horas de analista: ~R$30.000

**Com o sistema:**
- Ciclo completo (52 catálogos): ~2h de operação + revisão
- Frequência: mensal
- Cobertura: 52 catálogos (2.6x mais que manual)
- Custo operacional: ~R$2.500/mês (API + hosting)
- Custo anual: ~R$30.000

**Economia direta:** ~R$0 no custo total, mas com **2.6x mais cobertura e 3x mais frequência** pelo mesmo preço.

**Ganhos indiretos (não quantificáveis mas argumentáveis):**
- Dados padronizados, auditáveis e rastreáveis até a fonte
- Detecção automática de mudanças no mercado
- Score objetivo e reproduzível (elimina subjetividade)
- Chat RAG: qualquer pessoa do time consulta sem depender do analista
- App mobile: acesso aos dados de qualquer lugar, inclusive durante visitas a concessionárias

---

## 17. Riscos e Mitigações

| Risco | Prob. | Mitigação |
|-------|-------|-----------|
| RAG não melhora extração | Média | Teste A/B no mês 2, fallback pra LLM puro |
| Playwright quebra com mudança de site | Alta | Seletores versionados, alerta automático por hash |
| Fila com job travado | Média | Dead Letter Queue (DLQ) + retry com backoff |
| Oracle subutilizado na POC | Média | Usar Oracle XE gratuito; migrar pra cloud só na Fase 1 |
| Score enviesado por completude | Alta | Só calcular sobre capabilities com dados em todos os catálogos |
| Dados globais contaminam score BR | Média | Flag `mercado_confirmado_br`, excluídos do score |
| Termos novos escapam sem mapeamento | Alta | Detecção automática + log no Oracle + tela no app |
| Chat RAG alucina na demo | Média | Threshold (camada 1) + prompt "não sei" (camada 2) + validação (camada 3) |
| Model year update não detectado | Média | Hash de fonte + re-coleta mensal + versionamento Oracle |
| Lock-in de LLM provider | Baixa | Interface abstrata, teste de portabilidade no mês 2 |
| Escopo creep ao longo de 1 ano | Alta | Gates trimestrais com entregas demonstráveis |

---

## 18. Roteiro de Demo (1ª Apresentação — Mês 3)

20 minutos, orientado a insight:

1. **(3 min)** O problema — processo manual atual + ROI estimado
2. **(3 min)** LLM puro vs. RAG — demonstrar ao vivo: "Sem RAG, o LLM pode inventar que a Ranger tem 405cv. Com RAG, ele consulta o PDF oficial e responde 397cv, citando a fonte."
3. **(3 min)** Ficha técnica no app — Ranger Raptor com badges de confiança e flag de mercado (BR vs. global)
4. **(3 min)** Comparativo no app — Raptor vs. Hilux GR-S lado a lado, capability levels, auditoria de um dado (toque → fonte)
5. **(3 min)** Scores — técnico + custo-benefício, perfil "performance/off-road", gaps priorizados por relevância
6. **(3 min)** Chat RAG — perguntas ensaiadas + pergunta fora do escopo (demonstrar que o app diz "não sei" em vez de inventar)
7. **(2 min)** Visão de expansão — 52 catálogos, app nas mãos do time de produto, integração com Power BI

**O argumento:** "Isso são 6 catálogos, fontes públicas, 3 meses de trabalho. Imagina com 52 catálogos, atualização mensal, no celular de cada analista e integrado ao Power BI de vocês."

**O número:** "Hoje esse processo cobre 20 catálogos por trimestre. O sistema cobre 52 catálogos por mês — 2.6x mais abrangente, 3x mais frequente, pelo mesmo custo anual. E qualquer pessoa do time consulta via app, sem depender de um analista."

---

## 19. Expansão Pós-Contratação

| Fase | Escopo | Infra |
|------|--------|-------|
| POC (atual) | 6 pickups topo, fontes públicas, app com auditoria e chat RAG | Local + Railway |
| Fase 1 | 24 pickups + API FIPE + changelog + tendências | Oracle Cloud + RabbitMQ gerenciado |
| Fase 2 | + 28 SUVs = 52, clustering, alertas push no app | Power BI Ford (consome API Java) |
| Fase 3 | YouTube (Whisper), re-coleta automática, runbook operacional | Pipeline completo em produção |

---

*Descritivo técnico consolidado — POC Ford Catálogos — v5.0*
*Stack: React Native + Java Spring Boot + Python FastAPI + Oracle + RabbitMQ + ChromaDB*
*Projeto solo — 1 ano — Confidencial*
