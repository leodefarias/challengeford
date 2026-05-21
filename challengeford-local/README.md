# Ford Challenge — Análise Competitiva de Catálogos Automotivos

![Java](https://img.shields.io/badge/Java-21-orange) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-brightgreen) ![Python](https://img.shields.io/badge/Python-3.12-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal) ![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB) ![Expo](https://img.shields.io/badge/Expo-54-black) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

POC de análise competitiva de catálogos de pickups para Ford Brasil — FIAP Challenge Autosight. Extrai, normaliza e compara especificações técnicas de 6 modelos do mercado usando IA generativa e RAG.

---

## Arquitetura

```
┌─────────────────────────────────────────┐
│   App Mobile (React Native + Expo)      │
│   Porta: 8081 (dev server)              │
└──────────────────┬──────────────────────┘
                   │ REST + Bearer JWT
                   ▼
┌─────────────────────────────────────────┐
│   Java Spring Boot API                  │
│   Porta: 8080                           │
│   Autenticação JWT · RBAC · Swagger UI  │
│   Flyway Migrations · HikariCP Pool     │
└────────┬─────────────────┬──────────────┘
         │ REST interno    │ JPA / Hibernate
         │ X-Internal-Token│
         ▼                 ▼
┌──────────────────┐  ┌───────────────────┐
│ Python FastAPI   │  │ Oracle Database   │
│ Porta: 8000      │  │ oracle.fiap.com.br│
│                  │  │ :1521/ORCL        │
│ Agente ReAct     │  │                   │
│ RAG + LLM        │  │ 8 tabelas         │
│ PDF · Scraping   │  │ (Flyway V1-V4)    │
│ FIPE API         │  └───────────────────┘
└────────┬─────────┘
         │
    ┌────┴────┐
    │ChromaDB │  ← 4 coleções (embeddings all-MiniLM-L6-v2)
    │ volume  │     specs · terminologia · ranges · capabilities
    └─────────┘
```

**Veículos monitorados:** Ford Ranger Raptor · Toyota Hilux GR-S · VW Amarok V6 Extreme · Chevrolet S10 High Country · Mitsubishi Nova-Triton HPE-S · Nissan Frontier PRO-4X

---

## Stack por serviço

| Serviço | Tecnologia | Porta |
|---------|-----------|-------|
| Mobile | React Native 0.81 + Expo 54 + TypeScript | 8081 |
| Backend Java | Spring Boot 3.2.5 + Java 21 + Oracle JDBC | 8080 |
| Microsserviço IA | FastAPI + Python 3.12 + ChromaDB | 8000 |
| Banco de dados | Oracle 12c+ (remoto FIAP) | 1521 |
| Vector store | ChromaDB (embutido no container Python) | — |
| LLM | Claude (Anthropic) ou GPT-4.1-mini (OpenAI) | — |

---

## Pré-requisitos

- **Docker** com Docker Compose v2 (`docker compose`) ou v1 (`docker-compose`)
- **Node.js** ≥ 18 (para o app mobile)
- **Chave de API Anthropic** — obrigatória para extração por IA
- Acesso à rede FIAP (Oracle remoto em `oracle.fiap.com.br`)

Opcionais:
- Chave OpenAI — fallback de LLM
- Chave Firecrawl — scraping avançado de SPAs

---

## Configuração

### 1. Copiar o arquivo de variáveis de ambiente

```bash
cp .env.example .env
```

### 2. Preencher as variáveis obrigatórias no `.env`

```env
# ── LLM (obrigatório) ──────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...          # Chave Claude — obrigatória
LLM_PROVIDER=claude                    # "claude" ou "openai"

# ── Banco Oracle FIAP (obrigatório) ───────────────────────
ORACLE_URL=jdbc:oracle:thin:@oracle.fiap.com.br:1521/ORCL
ORACLE_USER=RM555211
ORACLE_PASSWORD=SUA_SENHA_FIAP

# ── Segredos de segurança (obrigatório) ────────────────────
# Gere com: openssl rand -base64 64
JWT_SECRET=<string-base64-minimo-256-bits>

# Gere com: openssl rand -base64 32
ENCRYPTION_KEY=<string-base64-32-bytes>

# Gere com: openssl rand -hex 32
INTERNAL_API_KEY=<token-comunicacao-interna-java-python>

# ── Opcionais ──────────────────────────────────────────────
OPENAI_API_KEY=                        # Fallback de LLM
FIRECRAWL_API_KEY=                     # Scraping avançado (SPAs)
```

> Gerar todos os segredos de uma vez:
> ```bash
> echo "JWT_SECRET=$(openssl rand -base64 64)"
> echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
> echo "INTERNAL_API_KEY=$(openssl rand -hex 32)"
> ```

---

## Como rodar

### Método rápido (recomendado)

```bash
# Linux / macOS
./start.sh

# Windows (Prompt de Comando)
start.bat

# Windows (PowerShell)
./start.ps1
```

O script faz automaticamente:
1. Valida pré-requisitos e variáveis de ambiente
2. Builda e sobe os containers Docker (`python-ia` + `java-api`)
3. Aguarda healthchecks (até 120s Python, 60s Java)
4. Instala dependências do mobile se necessário
5. Abre o Expo (`npx expo start`)

### Método manual (dois terminais)

**Terminal 1 — Backend:**
```bash
cd challengeford-local
docker compose up --build
```

**Terminal 2 — Mobile (aguardar backend saudável):**
```bash
cd challengeford-local/mobile
npm install
npx expo start
```

---

## Verificação após subir

| Serviço | URL | Esperado |
|---------|-----|---------|
| Java API — health | http://localhost:8080/actuator/health | `{"status":"UP"}` |
| Java API — Swagger UI | http://localhost:8080/swagger-ui.html | Interface OpenAPI |
| Python IA — health | http://localhost:8000/health | `{"status":"ok"}` |
| Python IA — docs | http://localhost:8000/docs | Interface FastAPI |

---

## Endpoints principais (Java API)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/login` | Autenticação — retorna JWT |
| `GET` | `/api/catalogos` | Lista todos os catálogos |
| `GET` | `/api/catalogos/{id}` | Detalhes de um veículo |
| `POST` | `/api/catalogos/comparar` | Comparação entre 2-6 veículos |
| `GET` | `/api/catalogos/ranking` | Ranking competitivo |
| `POST` | `/api/chat` | Chat RAG sobre os catálogos |

**Roles disponíveis:** `admin` · `analista` · `viewer`

Usuários semeados via Flyway V3. Consulte os arquivos de migração para as credenciais padrão.

---

## Telas do app mobile

| # | Tela | Descrição |
|---|------|-----------|
| 1 | Login | Autenticação com email/senha |
| 2 | Home | Specs do veículo — motorização, tração, segurança, off-road |
| 3 | Comparativo | Comparação lado a lado (Ford vs Toyota vs VW etc.) |
| 4 | Score | Radar de score competitivo por categoria |
| 5 | Gaps | Lacunas de capability vs. concorrentes |
| 6 | Chat | Q&A com RAG sobre os catálogos |
| 7 | Timeline | Histórico de atualizações dos catálogos |
| 8 | Itens Pendentes | Mapeamento de terminologia desconhecida |
| 9 | Status do Agente | Dashboard de monitoramento do agente IA |
| 10 | Eventos de Segurança | Feed de alertas do sistema |

---

## Estrutura de pastas

```
challengeford-local/
├── backend-java/               # Spring Boot API
│   ├── src/main/java/br/ford/catalog/
│   │   ├── api/controller/     # AuthController, CatalogoController, ChatController
│   │   ├── domain/entity/      # Entidades JPA
│   │   ├── service/            # Lógica de negócio
│   │   └── security/           # JWT + RBAC
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/       # Flyway V1-V4
│   └── Dockerfile
│
├── microsservico-ia/           # FastAPI + Agente IA
│   ├── src/
│   │   ├── api/main.py         # Entry point FastAPI
│   │   ├── agent/              # ReAct agent + tools
│   │   ├── knowledge_base/     # ChromaDB (4 coleções RAG)
│   │   ├── schema.py           # CatalogoSchema (~50 atributos, Pydantic v2)
│   │   └── llm_client.py       # Claude / OpenAI
│   ├── data/
│   │   ├── seed/               # JSON seed (6 veículos)
│   │   └── chromadb/           # Persistência vetorial
│   ├── scripts/
│   │   └── 01_seed_kb.py       # Inicializa ChromaDB (idempotente)
│   └── Dockerfile
│
├── mobile/                     # React Native + Expo
│   ├── src/
│   │   ├── screens/            # 10 telas
│   │   ├── components/         # 8 componentes reutilizáveis
│   │   ├── services/api.ts     # Cliente axios + interceptors JWT
│   │   ├── navigation/         # Stack + Bottom Tabs
│   │   └── theme/              # Design tokens (cores, tipografia, espaçamento)
│   ├── App.tsx
│   └── package.json
│
├── docker-compose.yml          # Orquestração dos serviços
├── .env.example                # Template de variáveis
├── start.sh                    # Script de inicialização (Linux/macOS)
├── start.bat                   # Script de inicialização (Windows)
└── start.ps1                   # Script de inicialização (PowerShell)
```

---

## Troubleshooting

**Python demora para subir (>60s)**
Primeiro boot baixa o modelo de embeddings `all-MiniLM-L6-v2` e o Chromium para Playwright. Normal só na primeira vez.

**Java retorna erro de conexão com Oracle**
Verifique se `ORACLE_URL`, `ORACLE_USER` e `ORACLE_PASSWORD` estão corretos no `.env` e se há acesso de rede a `oracle.fiap.com.br:1521`.

**App mobile não consegue chamar a API**
Confirme que `EXPO_PUBLIC_API_URL` aponta para `http://localhost:8080`. Em dispositivo físico, substitua `localhost` pelo IP da máquina na rede local.

**ChromaDB com erro ou dados corrompidos**
```bash
docker volume rm ford_chromadb
docker compose up --build
```
O seed repopula automaticamente na reinicialização.

**Flyway falha na migração**
```
FlywayException: Migration checksum mismatch
```
Significa que um arquivo SQL de migração foi alterado após ser aplicado. Não edite arquivos `V*.sql` já executados.

**Porta 8080 ou 8000 já em uso**
```bash
# Verificar processo usando a porta
lsof -i :8080
# Encerrar container anterior
docker compose down
```

---

## Equipe

FIAP — Challenge Autosight · 2025
