# Arquitetura TOGAF — AutoSight

> Documento guia para criação do arquivo `.archimate` na ferramenta Archi.
> Siga as 4 visões abaixo. Cada visão corresponde a uma aba no Archi.

---

## Visão Geral TOGAF ADM

```
Architecture Vision (Slide 1)
        ↓
Business Architecture (Slide 2)
        ↓
Application Architecture (Slide 3)
        ↓
Technology Architecture (Slide 4)
```

---

## Visão 1 — Architecture Vision (Visão da Arquitetura)

### Contexto Estratégico

**Driver de Negócio:**
Ford Brasil monitora manualmente 5 concorrentes no segmento pickup premium. Ciclo de análise: 3–5 dias úteis, 80h/mês de analista sênior. Sem escalabilidade.

**Objetivo do Projeto:**
Automatizar a extração, normalização e comparação de especificações técnicas de catálogos automotivos com IA, reduzindo o ciclo para < 1 hora e o custo operacional em 95%.

**Escopo do POC:**
- 6 pickups premium no mercado brasileiro
- ~50 atributos técnicos por veículo
- 4 perfis de ranking competitivo
- Mobile-first (iOS/Android)
- 1 ano de desenvolvimento

**Princípios de Arquitetura:**

| Princípio | Rationale |
|---|---|
| Separação de responsabilidades | Java para transações ACID; Python para IA sem estado crítico |
| Rastreabilidade | Todo atributo tem fonte primária + secundária auditável |
| Zero alucinação | `null` em vez de dado inventado; validação pós-LLM obrigatória |
| Mobile-first | Acesso a qualquer hora, qualquer lugar, para times de campo |
| Custo marginal | LLM por chamada; sem infraestrutura dedicada cara |
| Idempotência | Reexecução segura de extrações; cache de 30 dias |

**Restrições:**
- Banco de dados Oracle: servidor FIAP (`oracle.fiap.com.br:1521`) durante POC
- Sem orçamento para infraestrutura cloud dedicada (POC acadêmico)
- Timeline: 4 sprints × 2 semanas = ~2 meses (Sprints 1–4)
- Dados apenas de fontes públicas (catálogos oficiais, FIPE, sites públicos)

**Stakeholders Principais:**
- Ford Brasil: Times de Produto, Marketing, Estratégia, Vendas, TI
- FIAP: Professores avaliadores
- Equipe AutoSight: Desenvolvedores

---

## Visão 2 — Business Architecture (Arquitetura de Negócio)

### Processo AS-IS (Situação Atual)

```
┌─────────────────────────────────────────────────────────────────┐
│  PROCESSO ATUAL — ANÁLISE COMPETITIVA MANUAL                    │
│                                                        3-5 DIAS │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Analista    →  Busca manual   →  Download     →  Planilha     │
│  Sênior         PDF/sites         PDFs e           Excel       │
│                 fabricantes       catálogos         manual     │
│                                                         ↓       │
│  Reunião     ←  Consolidação   ←  Extração     ←  Transcrição │
│  Estratégia     relatório         ~50 attrs        dado a      │
│  Ford           Word/PPT          por modelo        dado       │
│                                                                 │
│  Atualização: MENSAL (gargalo humano)                          │
│  Custo: ~80h analista/mês × R$ 100/h = R$ 8.000/ciclo         │
│  Risco: Erro humano na transcrição; dados desatualizados        │
└─────────────────────────────────────────────────────────────────┘
```

### Processo TO-BE (Com AutoSight)

```
┌─────────────────────────────────────────────────────────────────┐
│  PROCESSO NOVO — ANÁLISE COMPETITIVA AUTOMATIZADA               │
│                                                        < 1 HORA │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Analista    →  Aciona        →  Agente IA     →  Oracle       │
│  / Time         extração via     extrai e          persiste    │
│  Produto        app mobile       normaliza          ~50 attrs  │
│                                  automaticamente    por modelo │
│                                         ↓                      │
│  Insight     ←  Dashboard     ←  Score/Gap    ←  ChromaDB     │
│  Imediato       comparativo      ranking          RAG Q&A      │
│  Time Ford      app mobile        perfis           suporte      │
│                                                                 │
│  Atualização: ON-DEMAND (qualquer hora)                        │
│  Custo: ~$0.10/extração × 6 modelos = ~R$ 3/ciclo             │
│  Ganho: Analista passa de executor → validador                  │
└─────────────────────────────────────────────────────────────────┘
```

### Mudança de Papel do Analista

| Atividade | AS-IS | TO-BE |
|---|---|---|
| Busca de catálogos | 20h/mês | 0h (automático) |
| Extração de atributos | 40h/mês | 0h (automático) |
| Normalização/consolidação | 15h/mês | 0h (automático) |
| Revisão de divergências | 2h/mês | 4h/mês (mais rigoroso) |
| Análise estratégica | 3h/mês | 76h/mês (foco no valor) |

### Atores de Negócio

- **Time Produto Ford:** consome dashboard de comparação e scores
- **Time Marketing Ford:** consome rankings por perfil e gaps
- **Time Estratégia Ford:** consome timeline e visão consolidada
- **Analista Especializado:** valida termos pendentes e divergências
- **TI Ford:** mantém integração e monitora operação

### Processos de Negócio Suportados

1. **Extração de Catálogo:** acionamento manual → pipeline IA → persistência Oracle
2. **Comparação Competitiva:** seleção de modelos → análise side-by-side → export
3. **Ranking por Perfil:** seleção de perfil comprador → score ponderado → visualização
4. **Análise de Gaps:** identificar onde Ranger Raptor perde/ganha vs. concorrentes
5. **Q&A sobre Catálogos:** pergunta em PT-BR → RAG → resposta com fontes citadas
6. **Revisão de Termos:** termo não mapeado → validação humana → atualização KB
7. **Monitoramento de Mudanças:** timeline de atualizações → alertas de novidades

---

## Visão 3 — Application Architecture (Arquitetura de Sistema)

### Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                    MOBILE APP                                    │
│            React Native 0.81 + Expo 54 + TypeScript              │
│  ┌──────┐ ┌──────────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│  │Login │ │Comparativo│ │Score │ │ Gaps │ │ Chat │ (+ 5 mais)  │
│  └──────┘ └──────────┘ └──────┘ └──────┘ └──────┘             │
└───────────────────────┬──────────────────────────────────────────┘
                        │ HTTPS + Bearer JWT
                        ↓
┌──────────────────────────────────────────────────────────────────┐
│                  JAVA SPRING BOOT API :8080                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  AuthController  │  │CatalogoController│  │  ChatController │ │
│  │  /api/auth/login │  │/api/catalogos/*  │  │  /api/chat      │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘ │
│           │                     │                      │          │
│  ┌────────▼──────────────────────▼──────────────────────▼──────┐ │
│  │          Security Layer: JWT Filter + RBAC + Rate Limit      │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Oracle 12c+     │  │   PythonClientService                │  │
│  │  - USUARIOS      │  │   (X-Internal-Token)                 │  │
│  │  - CATALOGOS     │  └──────────────┬───────────────────────┘  │
│  │  - ATRIBUTOS     │                 │                           │
│  │  - SCORES        │                 │                           │
│  │  - CHAT_CACHE    │                 │                           │
│  └──────────────────┘                 │                           │
└───────────────────────────────────────┼───────────────────────────┘
                                        │ HTTP + X-Internal-Token
                                        ↓
┌──────────────────────────────────────────────────────────────────┐
│                PYTHON FASTAPI AI SERVICE :8000                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    ReAct Agent                              │  │
│  │  1. Receive extraction request                              │  │
│  │  2. Select tool: PDF | Playwright | Firecrawl | FIPE | YT  │  │
│  │  3. Execute extraction                                      │  │
│  │  4. Validate with Pydantic (schema + ranges)               │  │
│  │  5. Embed to ChromaDB                                       │  │
│  │  6. Return CatalogoSchema JSON                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────┐  ┌──────────────────┐                    │
│  │   ChromaDB        │  │   LLM Client     │                    │
│  │  4 collections:   │  │  Claude Sonnet   │                    │
│  │  - specs          │  │  (Anthropic API) │                    │
│  │  - terminology    │  │  + OpenAI GPT-4  │                    │
│  │  - ranges         │  │  (fallback)      │                    │
│  │  - capabilities   │  └──────────────────┘                    │
│  └───────────────────┘                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │PDF Extractor│  │  Playwright  │  │  FIPE API / iCarros   │  │
│  │(pdfplumber) │  │  (scraping)  │  │  (preços BR)          │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Interfaces e Contratos

| Interface | Protocolo | Autenticação | Formato |
|---|---|---|---|
| Mobile → Java API | HTTPS REST | Bearer JWT (8h TTL) | JSON |
| Java API → Python | HTTP REST (interno) | X-Internal-Token header | JSON |
| Java API → Oracle | JDBC (ojdbc11) | Usuário/senha Oracle | SQL |
| Python → Claude API | HTTPS | API Key (header) | JSON |
| Python → FIPE API | HTTPS | Nenhuma (pública) | JSON |
| Python → Sites | HTTPS | Nenhuma (público) | HTML/PDF |

### Endpoints Principais

**Java API (porta 8080):**

| Endpoint | Método | Descrição | Role Mínimo |
|---|---|---|---|
| `/api/auth/login` | POST | Login → JWT | Público |
| `/api/catalogos` | GET | Listar catálogos | viewer |
| `/api/catalogos/{id}` | GET | Detalhe do catálogo | viewer |
| `/api/catalogos/extrair` | POST | Acionar extração IA | analista |
| `/api/catalogos/comparar` | POST | Comparar 2–6 veículos | viewer |
| `/api/catalogos/ranking` | GET | Ranking por perfil | viewer |
| `/api/chat` | POST | Q&A RAG | viewer |
| `/actuator/health` | GET | Health check | Público |

**Python FastAPI (porta 8000):**

| Endpoint | Método | Descrição | Auth |
|---|---|---|---|
| `/extrair` | POST | Pipeline de extração IA | X-Internal-Token |
| `/chat` | POST | RAG Q&A | X-Internal-Token |
| `/health` | GET | Status do serviço | Público |

### Fluxo de Dados — Extração de Catálogo

```
1. Usuário clica "Extrair" no app mobile
2. POST /api/catalogos/extrair { marca: "Toyota", modelo: "Hilux GR-S" }
3. Java valida JWT + RBAC (analista/admin)
4. CatalogoService chama PythonClientService
5. POST http://python-ia:8000/extrair (X-Internal-Token)
6. ReAct Agent executa pipeline:
   a. Busca PDF oficial no site Toyota BR
   b. Extrai ~50 atributos com pdfplumber + Claude
   c. Valida com Pydantic (schema + ranges)
   d. Busca FIPE para preço de referência BR
   e. Cross-valida em iCarros.com.br
   f. Persiste embeddings no ChromaDB
   g. Retorna CatalogoSchema JSON
7. Java persiste no Oracle (CATALOGOS + CATALOGO_ATRIBUTOS)
8. Mobile recebe CatalogoResponseDTO
9. UI atualiza dashboard com dados extraídos
```

### Componentes de Segurança

```
┌─────────────────────────────────────────────────────┐
│                CAMADAS DE SEGURANÇA                 │
├─────────────────────────────────────────────────────┤
│  1. HTTPS (TLS)        — transporte                 │
│  2. JWT Bearer Token   — autenticação stateless     │
│  3. RBAC Filter        — autorização por role       │
│  4. Rate Limit Filter  — prevenção DoS/brute-force  │
│  5. Input Sanitizer    — prevenção SQL injection/XSS│
│  6. Idempotency Filter — prevenção duplicatas       │
│  7. X-Internal-Token   — auth Java ↔ Python         │
│  8. BCrypt             — hash de senhas             │
│  9. AES-256            — criptografia de dados      │
│  10. Audit Log         — rastreabilidade de acessos │
└─────────────────────────────────────────────────────┘
```

---

## Visão 4 — Technology Architecture (Arquitetura de Tecnologia)

### Diagrama de Infraestrutura

```
┌──────────────────────────────────────────────────────────────────┐
│                     HOST MACHINE (Linux/Windows/Mac)             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   DOCKER COMPOSE v2                        │  │
│  │                                                            │  │
│  │  ┌───────────────────────────────────────────────────┐    │  │
│  │  │           python-ia container                     │    │  │
│  │  │  Image: Python 3.12-slim + Playwright + Chromium  │    │  │
│  │  │  Port: 8000                                       │    │  │
│  │  │  Healthcheck: GET /health (30s interval)          │    │  │
│  │  │  Volume mount: chroma_data → /app/data/chromadb   │    │  │
│  │  │  Volume mount: seed/ → /app/data/seed (read-only) │    │  │
│  │  │  Env: ANTHROPIC_API_KEY, INTERNAL_API_KEY,        │    │  │
│  │  │       OPENAI_API_KEY, FIRECRAWL_API_KEY           │    │  │
│  │  └───────────────────────────────────────────────────┘    │  │
│  │                          ↓ (depends_on: healthy)          │  │
│  │  ┌───────────────────────────────────────────────────┐    │  │
│  │  │           java-api container                      │    │  │
│  │  │  Image: Eclipse Temurin 21 JRE Alpine             │    │  │
│  │  │  Port: 8080                                       │    │  │
│  │  │  Healthcheck: GET /actuator/health (30s interval) │    │  │
│  │  │  Env: ORACLE_URL, ORACLE_USER, ORACLE_PASSWORD,   │    │  │
│  │  │       JWT_SECRET, ENCRYPTION_KEY, INTERNAL_API_KEY│    │  │
│  │  └───────────────────────────────────────────────────┘    │  │
│  │                                                            │  │
│  │  Volumes: chroma_data (named, persistent)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                    │                              │
                    ↓ JDBC                         ↓ HTTPS API
         ┌──────────────────┐           ┌──────────────────────┐
         │  Oracle 12c+     │           │  APIs Externas       │
         │  (FIAP server)   │           │  - Anthropic Claude  │
         │  oracle.fiap.    │           │  - OpenAI            │
         │  com.br:1521     │           │  - Firecrawl         │
         │  /ORCL           │           │  - FIPE API          │
         └──────────────────┘           │  - Sites fabricantes │
                                        └──────────────────────┘
```

### Especificações de Infraestrutura

| Componente | Tecnologia | Versão | Recursos |
|---|---|---|---|
| Container Runtime | Docker + Docker Compose | v2+ | — |
| Python Service | Python 3.12-slim + Playwright | 3.12 | ~500MB RAM |
| Java Service | Eclipse Temurin JRE Alpine | 21 | ~512MB RAM |
| Chromium (scraping) | Playwright Chromium | Latest | ~300MB disk |
| Vector Store | ChromaDB | 0.5.0+ | ~1GB disk (6 veículos) |
| Banco de Dados | Oracle 12c+ | 12c+ | FIAP server |
| Embeddings | sentence-transformers | 3.0.0+ | ~100MB (modelo local) |

### Variáveis de Ambiente (`.env`)

```
# LLM
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...         # fallback
LLM_PROVIDER=claude           # "claude" ou "openai"

# Scraping
FIRECRAWL_API_KEY=fc-...

# Auth inter-serviços
INTERNAL_API_KEY=...          # Java ↔ Python

# Oracle
ORACLE_URL=jdbc:oracle:thin:@oracle.fiap.com.br:1521/ORCL
ORACLE_USER=...
ORACLE_PASSWORD=...

# JWT + Criptografia
JWT_SECRET=...                # ≥ 256 bits
ENCRYPTION_KEY=...            # 32 bytes

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:8081
```

### Sequência de Inicialização

```
1. Docker Compose up
2. python-ia container starts
   a. pip install dependencies
   b. playwright install chromium
   c. python scripts/01_seed_kb.py (idempotente)
      → ChromaDB: 4 collections criadas/verificadas
      → Modelos de embedding carregados
   d. uvicorn main:app --port 8000
   e. Healthcheck passa → python-ia: healthy
3. java-api container starts (depends_on python-ia healthy)
   a. JVM startup
   b. Flyway migrations executadas (V1 → V4)
      → Oracle: tabelas criadas/atualizadas
      → Seed: usuário admin criado
   c. Spring Security configurado
   d. Spring Boot started on port 8080
   e. Healthcheck passa → java-api: healthy
4. Sistema pronto em ~60 segundos
```

### Monitoramento em Produção

| Mecanismo | Endpoint / Tela | O que Monitora |
|---|---|---|
| Spring Actuator | `/actuator/health` | Liveness/readiness Java + Oracle conn |
| Python Health | `/health` | Status FastAPI + ChromaDB collections |
| Docker healthcheck | `docker ps` | Status containers em tempo real |
| Tela "Status do Agente" | App mobile | Logs do agente IA em tempo real |
| Tela "Eventos de Segurança" | App mobile | Audit log de acessos e alertas JWT |
| CHAT_CACHE metrics | Oracle query | Hit/miss ratio de respostas RAG |
| `cobertura_pct` | Oracle `CATALOGOS` | % atributos extraídos por veículo |
| `confianca` médio | Oracle query | Qualidade média das extrações |

---

## Como a Arquitetura Contribui para a Qualidade

### 1. Separação de Responsabilidades

Java (transações ACID, segurança) e Python (IA sem estado crítico) são isolados.
- Falha no serviço de IA não derruba a API Java
- Manutenção de cada camada é independente
- Testes podem ser feitos em isolamento

### 2. Resiliência por Design

- Fallback LLM: Claude → OpenAI (automático)
- Fallback de extração: PDF → Playwright → Firecrawl → iCarros → FIPE
- Cache ChromaDB: funciona mesmo sem Oracle (para leitura)
- CHAT_CACHE: reduz ~60% chamadas LLM (latência + custo)

### 3. Versionamento e Reprodutibilidade

- Flyway migrations: esquema Oracle sempre na versão correta
- Docker Compose: ambiente 100% reproduzível (`./start.sh`)
- Seed idempotente: ChromaDB pode ser recriado a qualquer momento

### 4. Observabilidade

- Actuator metrics para SLA monitoring
- Dashboard "Status do Agente" expõe logs em tempo real sem acesso SSH
- Campo `confianca` por atributo permite análise de qualidade de dados

### 5. Segurança em Camadas (Defense in Depth)

- TLS → JWT → RBAC → Rate Limit → Input Sanitization → Encryption
- Nenhum ponto único de falha de segurança

---

## Guia para Criação no Archi (.archimate)

### Estrutura de Views no Archi

```
├── 01 - Architecture Vision
│   ├── Stakeholder Map (Motivation viewpoint)
│   └── Goal-Driver-Requirement diagram
├── 02 - Business Architecture
│   ├── AS-IS Business Process (Business Process viewpoint)
│   ├── TO-BE Business Process (Business Process viewpoint)
│   └── Business Function Map
├── 03 - Application Architecture
│   ├── Application Component Diagram
│   ├── Application Cooperation viewpoint
│   └── Data Flow diagram
└── 04 - Technology Architecture
    ├── Infrastructure viewpoint (containers + network)
    └── Deployment viewpoint
```

### Elementos ArchiMate por Visão

**Business Architecture:**
- `BusinessActor`: Analista Ford, Time Produto, Time Marketing
- `BusinessRole`: Analista, Viewer, Admin
- `BusinessProcess`: Extração Catálogo, Comparação, Ranking, Q&A
- `BusinessFunction`: Monitoramento Competitivo, Análise Estratégica
- `BusinessObject`: Catálogo, Especificação Técnica, Relatório Competitivo

**Application Architecture:**
- `ApplicationComponent`: Mobile App, Java API, Python AI Service, ChromaDB
- `ApplicationService`: AuthService, CatalogoService, ChatService, ExtractionAgent
- `ApplicationInterface`: REST API, Swagger UI, Mobile UI
- `DataObject`: CatalogoSchema, AtributoSchema, ScoreCompetitivo

**Technology Architecture:**
- `Node`: Docker Host, Oracle Server FIAP, Anthropic Cloud
- `SystemSoftware`: Docker Compose, JVM, Python Runtime, ChromaDB
- `TechnologyService`: JDBC, HTTPS, RabbitMQ (futuro)
- `Artifact`: JAR file, Python wheel, Docker image, .env
