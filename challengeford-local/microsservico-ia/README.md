# Microsserviço IA — Catálogos de Pickups

Microsserviço Python que extrai, normaliza e disponibiliza fichas técnicas comparativas dos 6 principais modelos de pickup do mercado brasileiro. Combina scraping multi-fonte, RAG com ChromaDB e extração via LLM para produzir um schema canônico com rastreabilidade por atributo.

## Veículos cobertos

| Marca | Modelo | Versão |
|---|---|---|
| Ford | Ranger | Raptor |
| Toyota | Hilux | GR-S |
| Volkswagen | Amarok | V6 Extreme |
| Chevrolet | S10 | High Country |
| Mitsubishi | Nova-Triton | HPE-S |
| Nissan | Frontier | PRO-4X |

## Como funciona

### Pipeline de extração (por veículo)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PDF Oficial │    │  Site Oficial│    │  API FIPE    │
│  (pdfplumber)│    │  (Scraper)   │    │  (preço ref) │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └──────────┬────────┘                   │
                  ▼                            │
         ┌────────────────┐                   │
         │  Agente ReAct  │◄──────────────────┘
         │                │
         │  1. RAG query  │◄── ChromaDB (seed + extrações anteriores)
         │  2. LLM extrai │──► GPT-4.1-mini (fallback: GPT-4.1)
         │  3. KB fallback│◄── Seed determinístico para gaps
         │  4. Validação  │    (ranges, cross-checks)
         └────────┬───────┘
                  ▼
         ┌────────────────┐
         │ CatalogoSchema │  ~50 atributos, Pydantic v2
         │ + metadados    │  confiança, fonte, mercado BR
         └────────────────┘
```

### Hierarquia de coleta (site scraper)

Para cada veículo, o scraper tenta as fontes nesta ordem, passando para a próxima em caso de bloqueio ou conteúdo insuficiente:

1. **Mitsubishi**: site oficial via httpx (200 OK direto)
2. **iCarros** (`icarros.com.br`): fonte universal BR, funciona via httpx para todos os 6 modelos
3. **Site oficial JS-rendered**:
   - **Playwright** (gratuito) — headless Chromium com scroll e anti-detecção básica
   - **Cloudflare Browser Rendering** — fallback pago, aceito somente se retornar >5000 chars com keywords de spec
   - **Firecrawl** — último recurso para SPAs que bloqueiam headless

### Hierarquia de coleta (PDF)

Para PDFs de fichas técnicas oficiais:

1. **httpx direto** — tenta download direto
2. **Cloudflare Browser Rendering** — se CDN retornar 403/429
3. **Firecrawl** — fallback final, salva conteúdo como `.txt`

### RAG + LLM

O LLM recebe dois contextos além do texto coletado:

- **Contexto RAG**: valores já conhecidos da KB (seed + extrações anteriores) consultados por atributo, com filtro por marca e threshold de distância coseno < 0.5
- **Ranges do segmento**: mínimos e máximos históricos de pickups BR para cada atributo numérico

Após extração LLM, um **fallback determinístico** consulta a KB diretamente para qualquer campo `ATRIBUTOS_CORE` ainda nulo — eliminando dependência de o LLM "lembrar" de usar o contexto RAG.

---

## Estrutura do projeto

```
microsservico-ia/
├── src/
│   ├── schema.py                   # CatalogoSchema Pydantic v2 (~50 atributos, 7 grupos)
│   ├── config.py                   # Variáveis de ambiente
│   ├── llm_client.py               # OpenAI SDK — GPT-4.1-mini + fallback GPT-4.1
│   ├── knowledge_base/
│   │   └── kb_manager.py           # ChromaDB — 4 coleções, RAG, seed, fallback KB
│   ├── agent/
│   │   ├── agent.py                # Orquestrador do pipeline (AgenteCatalogo)
│   │   └── tools/
│   │       ├── pdf_extractor.py    # Download + extração de PDFs (pdfplumber)
│   │       ├── site_scraper.py     # Playwright / Cloudflare / Firecrawl
│   │       └── fipe_api.py         # Preço de referência FIPE (cache SQLite 7 dias)
│   └── api/
│       └── main.py                 # FastAPI — 5 endpoints REST
├── scripts/
│   ├── 01_seed_kb.py               # Popula ChromaDB com seed + terminology map
│   └── 02_popular_validated.py     # Converte seeds → data/validated/ (bootstrap da API)
├── data/
│   ├── seed/                       # JSONs com dados base dos 6 veículos
│   ├── validated/                  # Catálogos processados (persistência da API)
│   ├── pdfs/                       # Cache de PDFs (30 dias)
│   ├── raw/                        # Cache de HTMLs (1 dia)
│   ├── chromadb/                   # Persistência ChromaDB
│   └── fipe_cache.sqlite           # Cache FIPE (7 dias)
├── requirements.txt
├── .env.example
├── start_api.sh                    # Inicialização Linux/macOS
├── start_api.bat                   # Inicialização Windows (Prompt de Comando)
└── start_api.ps1                   # Inicialização Windows (PowerShell)
```

---

## Configuração

### 1. Dependências

```bash
# Linux/macOS
pip install -r requirements.txt
playwright install chromium

# Windows
python -m pip install -r requirements.txt
python -m playwright install chromium
```

> No Windows use `python` em vez de `python3`. O PowerShell detecta automaticamente o comando correto.

### 2. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
# Obrigatório
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MODEL_FALLBACK=gpt-4.1

# ChromaDB (padrão: local)
CHROMA_PERSIST_DIR=data/chromadb
CHROMA_EMBEDDING_MODEL=all-MiniLM-L6-v2

# Opcionais — aumentam cobertura de scraping
FIRECRAWL_API_KEY=fc-...         # firecrawl.dev — para SPAs que bloqueiam headless
CF_ACCOUNT_ID=...                # Cloudflare Browser Rendering
CF_API_TOKEN=...                 # Cloudflare Browser Rendering
```

> Sem Firecrawl/Cloudflare, o sistema usa Playwright (gratuito) e iCarros como fontes primárias. A cobertura se mantém em 100% graças ao seed da KB.

### 3. Thresholds (opcionais)

```env
RAG_SIMILARITY_THRESHOLD=0.65   # distância coseno mínima para aceitar resultado RAG
MIN_COBERTURA_PARA_KB=0.70      # cobertura mínima para enriquecer a KB com o catálogo
SCRAPER_DELAY_MIN=1.0           # delay mínimo entre requisições (segundos)
SCRAPER_DELAY_MAX=3.0           # delay máximo entre requisições (segundos)
```

---

## Inicialização

**Linux / macOS**
```bash
./start_api.sh
```

**Windows — Prompt de Comando**
```bat
start_api.bat
```

**Windows — PowerShell**
```powershell
powershell -ExecutionPolicy Bypass -File start_api.ps1
```

Os scripts fazem automaticamente: instalar dependências → popular KB → popular catálogos validados → subir a API.

**Ou passo a passo (qualquer OS):**
```bash
python -m pip install -r requirements.txt
python -m playwright install chromium
python scripts/01_seed_kb.py
python scripts/02_popular_validated.py
# Linux/macOS:
PYTHONPATH=src python -m uvicorn api.main:app --port 8000 --app-dir src --reload
# Windows:
set PYTHONPATH=src && python -m uvicorn api.main:app --port 8000 --app-dir src --reload
```

A documentação interativa fica disponível em `http://localhost:8000/docs`.

---

## API REST

### `GET /health`

Retorna status da KB e quantidade de catálogos processados.

```json
{
  "status": "ok",
  "timestamp": "2026-05-06T09:27:11.153047",
  "kb": { "specs_normalizados": 328, "terminologia": 30 },
  "catalogos_salvos": 6
}
```

---

### `POST /extrair`

Extrai e normaliza o catálogo de um veículo. Retorna do cache se já processado.

```json
// Request
{ "marca": "ford", "modelo": "Ranger", "versao": "Raptor", "forcar_reprocessamento": false }
```

```json
// Response (resumido)
{
  "fonte": "cache",
  "catalogo": {
    "schema": {
      "marca": "ford", "modelo": "Ranger", "versao": "Raptor",
      "potencia_cv": 397, "torque_nm": 583, "tracao": "4x4",
      "cambio_tipo": "automatico", "cambio_marchas": 10,
      "preco_tabela_brl": 461748, "tela_central_pol": 12.0,
      "carplay": true, "android_auto": true, "airbags_quantidade": 7
    },
    "cobertura_pct": 1.0,
    "status": "completo"
  }
}
```

Marcas válidas: `ford`, `toyota`, `vw`, `chevrolet`, `mitsubishi`, `nissan`

---

### `GET /catalogos`

Lista todos os catálogos já processados.

```bash
curl http://localhost:8000/catalogos
```

---

### `GET /catalogos/{marca}/{modelo}/{versao}`

Retorna o catálogo completo de um veículo específico. Retorna 404 se não processado.

```bash
curl http://localhost:8000/catalogos/ford/Ranger/Raptor
```

---

### `POST /comparar`

Compara N veículos lado a lado. Destaca o vencedor por atributo numérico.

```json
// Request
{
  "veiculos": [
    { "marca": "ford",   "modelo": "Ranger",   "versao": "Raptor" },
    { "marca": "toyota", "modelo": "Hilux",    "versao": "GR-S" },
    { "marca": "nissan", "modelo": "Frontier", "versao": "PRO-4X" }
  ],
  "atributos": ["potencia_cv", "torque_nm", "preco_tabela_brl", "airbags_quantidade"]
}
```

```json
// Response
{
  "tabela": {
    "ford Ranger Raptor":   { "potencia_cv": 397, "torque_nm": 583, "preco_tabela_brl": 461748 },
    "toyota Hilux GR-S":   { "potencia_cv": 224, "torque_nm": 500, "preco_tabela_brl": 299953 },
    "nissan Frontier PRO-4X": { "potencia_cv": 200, "torque_nm": 450, "preco_tabela_brl": 214949 }
  },
  "destaques": {
    "potencia_cv": "ford Ranger Raptor",
    "torque_nm":   "ford Ranger Raptor",
    "preco_tabela_brl": "nissan Frontier PRO-4X"
  }
}
```

Atributos disponíveis para comparação: todos os campos de `CatalogoSchema` (ver `/docs`).

---

### `POST /chat`

Responde perguntas em linguagem natural sobre os catálogos usando RAG + LLM.

```json
// Request
{ "pergunta": "Qual pickup tem mais airbags?", "contexto_marcas": ["ford", "toyota"] }
```

```json
// Response
{
  "resposta": "A Ford Ranger Raptor possui 7 airbags, a maior quantidade entre as comparadas.",
  "contexto_utilizado": true
}
```

---

### `POST /ranking`

Ranking determinístico por critérios ponderados com justificativa LLM. Use `perfil` para um preset ou `criterios` para pesos customizados. Se ambos forem fornecidos, `criterios` prevalece. Pesos são normalizados automaticamente se não somarem 1.0.

**Perfis disponíveis:**

| Perfil | Critérios e pesos |
|---|---|
| `familia` | preço (35%), airbags (20%), tela (15%), frenagem autônoma (10%), emplacamentos (10%), capacidade carga (10%) |
| `desempenho` | potência (35%), reboque (20%), torque (30%), vadeo (15%) |
| `custo_beneficio` | preço (40%), potência (20%), emplacamentos (15%), airbags (15%), tela (10%) |
| `offroad` | vadeo (30%), ângulo ataque (20%), ângulo saída (20%), reboque (15%), potência (15%) |

```json
// Request — perfil predefinido
{
  "veiculos": [
    { "marca": "ford",   "modelo": "Ranger",   "versao": "Raptor" },
    { "marca": "toyota", "modelo": "Hilux",    "versao": "GR-S" },
    { "marca": "vw",     "modelo": "Amarok",   "versao": "V6 Extreme" }
  ],
  "perfil": "custo_beneficio",
  "incluir_justificativa": true
}
```

```json
// Request — critérios customizados (pesos livres, normalizados automaticamente)
{
  "veiculos": [...],
  "criterios": {
    "potencia_cv": 0.30,
    "preco_tabela_brl": 0.40,
    "emplacamentos_mes_atual": 0.30
  },
  "incluir_justificativa": false
}
```

```json
// Response
{
  "perfil": "custo_beneficio",
  "criterios_aplicados": { "preco_tabela_brl": 0.4, "potencia_cv": 0.2, "airbags_quantidade": 0.15, "tela_central_pol": 0.1, "emplacamentos_mes_atual": 0.15 },
  "ranking": [
    {
      "posicao": 1,
      "veiculo": "vw Amarok V6 Extreme",
      "pontuacao_total": 0.5923,
      "breakdown": {
        "preco_tabela_brl":      { "valor": 305451, "score_normalizado": 0.63, "peso": 0.4,  "score_ponderado": 0.253 },
        "potencia_cv":           { "valor": 258,    "score_normalizado": 0.36, "peso": 0.2,  "score_ponderado": 0.071 },
        "airbags_quantidade":    { "valor": 8,      "score_normalizado": 1.0,  "peso": 0.15, "score_ponderado": 0.15  },
        "tela_central_pol":      { "valor": 12.0,   "score_normalizado": 1.0,  "peso": 0.1,  "score_ponderado": 0.1   },
        "emplacamentos_mes_atual": { "valor": 900,  "score_normalizado": 0.12, "peso": 0.15, "score_ponderado": 0.018 }
      }
    }
  ],
  "justificativa": "1º VW Amarok V6 Extreme lidera pelo equilíbrio entre preço (R$ 305.451, score 0.63) e máxima segurança com 8 airbags (score 1.00)..."
}
```

**Atributos suportados como critérios:**
- Numéricos maiores-melhor: `potencia_cv`, `torque_nm`, `airbags_quantidade`, `tela_central_pol`, `capacidade_reboque_kg`, `profundidade_vadeo_mm`, `angulo_ataque_graus`, `angulo_saida_graus`, `emplacamentos_mes_atual`, `emplacamentos_acum_ano`
- Numéricos menores-melhor: `preco_tabela_brl`, `consumo_cidade_km_l`, `posicao_ranking_segmento`
- Booleanos (1.0 se `true`, 0.0 se `false`): `frenagem_autonoma`, `camera_360`, `controle_cruzeiro_adaptativo`, `monitoramento_ponto_cego`, `carplay`, `android_auto`, `reducao`, `diferencial_bloqueio` e demais campos bool do schema

---

## Emplacamentos (dados de mercado)

O critério `emplacamentos_mes_atual` é alimentado pelo tool `src/agent/tools/emplacamentos.py`, que mantém um seed com estimativas baseadas em dados públicos ANFAVEA/Fenabrave (referência mai/2026) e cache SQLite com TTL de 30 dias.

| Modelo | Emplacamentos/mês (est.) | Acum. ano (est.) | Posição no segmento |
|---|---|---|---|
| Toyota Hilux | ~4.800 | ~19.200 | 1º |
| Ford Ranger | ~1.900 | ~7.600 | 2º |
| Chevrolet S10 | ~1.700 | ~6.800 | 3º |
| VW Amarok | ~900 | ~3.600 | 4º |
| Nissan Frontier | ~700 | ~2.800 | 5º |
| Mitsubishi Nova-Triton | ~380 | ~1.520 | 6º |

> Os valores são estimativas aproximadas para fins de POC. Para produção, integrar com a API da Fenabrave ou parsing mensal dos relatórios PDF da ANFAVEA.

---

## Schema canônico — grupos de atributos

| Grupo | Atributos principais |
|---|---|
| Identificação | marca, modelo, versao, ano_modelo |
| Motorização | combustivel, cilindrada_l, potencia_cv, torque_nm, consumo_* |
| Transmissão & Tração | cambio_tipo, cambio_marchas, tracao, reducao, diferencial_bloqueio |
| Dimensões | comprimento_mm, largura_mm, altura_mm, entre_eixos_mm, peso_bruto_kg |
| Off-Road | controle_descida, angulo_ataque_graus, profundidade_vadeo_mm, modos_conducao |
| Segurança & ADAS | airbags_quantidade, frenagem_autonoma, camera_re, camera_360, monitoramento_ponto_cego |
| Conectividade | tela_central_pol, carplay, android_auto, painel_digital_pol |
| Precificação | preco_tabela_brl (via API FIPE, referência maio/2026) |

Os 14 **atributos core** (potencia_cv, torque_nm, tracao, cambio_tipo, dimensões, airbags, tela, carplay, android_auto, camera_re, preco) determinam o `status` do catálogo: `completo` ≥ 90%, `parcial` ≥ 70%, `pendente_revisao` < 70%.

---

## Base de conhecimento (ChromaDB)

Quatro coleções com embedding `all-MiniLM-L6-v2`:

| Coleção | Conteúdo |
|---|---|
| `specs_normalizados` | Atributos extraídos por veículo (seed + pipeline) |
| `terminologia` | Mapa de termos comerciais → atributos canônicos (ex: "4MOTION" → tracao: 4x4_tempo_integral) |
| `ranges_segmento` | Mínimos, máximos e médias históricas de pickups BR |
| `capability_definitions` | Definição de níveis de capabilities (ex: visibilidade_traseira 0–3) |

---

## Dependências principais

| Pacote | Uso |
|---|---|
| `openai` | Extração estruturada via GPT-4.1-mini/GPT-4.1 |
| `chromadb` | Base de conhecimento vetorial local |
| `sentence-transformers` | Embedding `all-MiniLM-L6-v2` |
| `pdfplumber` | Extração de texto/tabelas de PDFs |
| `playwright` | Scraping de sites JS-rendered |
| `httpx` | Requisições HTTP assíncronas |
| `firecrawl-py` | Fallback para SPAs protegidas por WAF |
| `fastapi` + `uvicorn` | API REST assíncrona |
| `pydantic v2` | Validação e schema canônico |
