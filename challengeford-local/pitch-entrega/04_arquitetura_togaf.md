# Arquitetura TOGAF — AutoSight

> Documento guia para criação do arquivo `.archimate` na ferramenta Archi (Sprint 4).
> As 4 visões abaixo mapeiam diretamente para as abas do TOGAF ADM no Archi.
> Todos os detalhes técnicos foram verificados contra o código-fonte do repositório.

---

## Visão Geral TOGAF ADM

```
Architecture Vision (Visão 1)
        ↓
Business Architecture (Visão 2)
        ↓
Application Architecture (Visão 3)
        ↓
Technology Architecture (Visão 4)
```

---

## Visão 1 — Architecture Vision (Visão da Arquitetura)

### Contexto Estratégico

**Driver de Negócio:**
Ford Brasil monitora manualmente 5 concorrentes no segmento pickup premium. Ciclo de análise: 3–5 dias úteis, ~80h/mês de analista sênior. O processo é não escalável, propenso a erros de transcrição e produz dados desatualizados até a próxima rodada mensal.

**Objetivo do Projeto:**
Automatizar a extração, normalização e comparação de especificações técnicas de catálogos automotivos com agente de IA, reduzindo o ciclo de análise para menos de 1 hora e o custo operacional estimado em 95% (de ~R$ 8.000/ciclo para < R$ 0,50/ciclo).

**Escopo do POC:**
- 6 pickups premium no mercado brasileiro: Ford Ranger Raptor, Toyota Hilux GR-S, Volkswagen Amarok, Chevrolet S10, Mitsubishi Nova Triton HPE-S, Nissan Frontier PRO-4X
- ~50 atributos técnicos por veículo organizados em schema canônico Pydantic v2
- 14 atributos "core" obrigatórios que determinam o percentual de cobertura
- 4 perfis de ranking competitivo pré-definidos: família, desempenho, custo_beneficio, offroad
- Interface mobile-first (iOS/Android) via React Native + Expo
- RAG em PT-BR com classificação adaptativa de consultas
- Período de desenvolvimento: 4 sprints × 2 semanas

**Stakeholders Principais:**

| Stakeholder | Interesse no Sistema |
|---|---|
| Time de Produto Ford | Dashboard de comparação e gaps para decisões de portfólio |
| Time de Marketing Ford | Rankings por perfil comprador para comunicação competitiva |
| Time de Estratégia Ford | Visão consolidada e timeline de mudanças de concorrentes |
| Time de Vendas Ford | Argumentos de venda baseados em dados objetivos |
| TI Ford | Segurança, integração e monitoramento da operação |
| Analista Especializado | Validação de termos pendentes e resolução de divergências |
| FIAP (Professores) | Avaliação de conformidade TOGAF e qualidade da solução |
| Equipe AutoSight | Desenvolvimento e manutenção da plataforma |

**Princípios de Arquitetura:**

| Princípio | Rationale |
|---|---|
| Separação de responsabilidades | Java para transações ACID e segurança; Python para IA sem estado crítico — falha de um não derruba o outro |
| Zero alucinação | `null` em vez de dado inventado; validação Pydantic pós-LLM obrigatória; descarte por range |
| Rastreabilidade por atributo | Todo valor tem fonte primária + fontes secundárias com status (confirma/diverge/complementa) e índice de confiança 0–1 |
| Mobile-first | Acesso em campo, qualquer hora, qualquer lugar; sem dependência de desktop corporativo |
| Custo marginal por chamada | LLM pago por uso; sem infraestrutura GPU dedicada; ChromaDB local evita custo de vector store gerenciado |
| Idempotência | Reexecução segura de extrações com X-Idempotency-Key; cache de 30 dias por veículo |
| Defense in depth | TLS + JWT + RBAC + Rate Limit + Input Sanitizer + AES-256 em camadas independentes |

**Restrições:**
- Banco de dados Oracle: servidor FIAP (`oracle.fiap.com.br:1521/ORCL`) durante o POC — sem controle de versão do servidor
- Sem orçamento para infraestrutura cloud dedicada (POC acadêmico)
- Timeline: Sprints 1–4 (concluídos); Sprint 4 entrega o arquivo `.archimate`
- Dados exclusivamente de fontes públicas: catálogos oficiais, FIPE API, sites dos fabricantes

---

## Visão 2 — Business Architecture (Arquitetura de Negócio)

### Processo AS-IS (Situação Atual)

```
┌─────────────────────────────────────────────────────────────────┐
│  PROCESSO ATUAL — ANÁLISE COMPETITIVA MANUAL                    │
│                                                       3-5 DIAS  │
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
│  Analista    →  Aciona        →  Agente IA     →  Oracle +     │
│  / Time         extração via     (9 passos)        ChromaDB    │
│  Produto        app mobile       extrai e          persiste    │
│                                  normaliza          ~50 attrs  │
│                                         ↓                      │
│  Insight     ←  Dashboard     ←  Score/Gap    ←  RAG Q&A      │
│  Imediato       comparativo      ranking          (Adaptive    │
│  Time Ford      app mobile       4 perfis          RAG PT-BR)  │
│                                                                 │
│  Atualização: ON-DEMAND (qualquer hora)                        │
│  Custo: ~R$ 0,10–0,50/extração × 6 modelos = < R$ 3/ciclo    │
│  Ganho: Analista passa de executor → validador estratégico      │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline TO-BE Detalhado (Fluxo Interno do Agente)

```
URL/PDF do veículo acionado pelo analista
        ↓
[PASSO 1] PERCEPÇÃO — construção de contexto CRAG inicial (ChromaDB specs)
        ↓
[PASSO 2] COLETA PDF — download + pdfplumber (site oficial do fabricante BR)
        ↓
[PASSO 3] COLETA SITE — Playwright ou Firecrawl (scraping site oficial BR)
        ↓
[PASSO 4] COLETA FIPE — FIPE API pública (preço de referência BR)
        ↓
[PASSO 5] EXTRAÇÃO LLM — GPT-4.1-mini + RAG → JSON estruturado (schema canônico)
        ↓ (cobertura < 70% → escalada automática para GPT-4.1)
[PASSO 5.5] CRAG REBUILD — reconstrói contexto focado nos gaps pós-PDF
        ↓
[PASSO 6] NORMALIZAÇÃO — terminology map + validação de ranges + resolução de conflitos
        ↓
[PASSO 7] SCHEMA — montagem do CatalogoSchema Pydantic; campos inválidos descartados
        ↓
[PASSO 7.5] KB FALLBACK — gaps core preenchidos com dados seed validados (ChromaDB)
        ↓
[PASSO 8] COBERTURA — cálculo % atributos core; status: completo/parcial/pendente_revisao
        ↓
[PASSO 9] ENRIQUECE KB — catálogo validado (confiança ≥ 0.7 + mercado BR) vetorizado no ChromaDB
        ↓
JSON retornado ao Java → Oracle persiste CATALOGOS + CATALOGO_ATRIBUTOS
```

### Mudança de Papel do Analista

| Atividade | AS-IS | TO-BE |
|---|---|---|
| Busca de catálogos | 20h/mês | 0h (automático) |
| Extração de atributos | 40h/mês | 0h (automático) |
| Normalização/consolidação | 15h/mês | 0h (automático) |
| Revisão de divergências | 2h/mês | 4h/mês (mais rigoroso) |
| Análise estratégica | 3h/mês | 76h/mês (foco no valor real) |

### Atores de Negócio e RBAC

| Ator | Role no Sistema | Permissões |
|---|---|---|
| Administrador TI | `admin` | Acesso total; Swagger UI; gestão de usuários |
| Analista Especializado | `analista` | Extração, comparação, ranking, Q&A, revisão de termos |
| Time Produto/Marketing/Estratégia | `viewer` | Leitura: listagem, comparação, ranking, Q&A |

Roles aplicados via `SecurityConfig.java` + `@EnableMethodSecurity` (Spring Security).

### Casos de Uso por Perfil Comprador

O sistema suporta 4 perfis pré-definidos de ranking (implementados em `PERFIS_PREDEFINIDOS` no serviço Python):

| Perfil | Critérios Principais (pesos) | Caso de Uso |
|---|---|---|
| `familia` | preco (35%), airbags (20%), tela (15%), ADAS (10%), carga (10%), emplacamentos (10%) | Qual pickup oferece melhor custo-segurança para família? |
| `desempenho` | potência (35%), torque (30%), reboque (20%), vadeo (15%) | Qual pickup performa melhor em testes de capacidade? |
| `custo_beneficio` | preco (40%), potência (20%), airbags (15%), emplacamentos (15%), tela (10%) | Qual pickup entrega mais por real investido? |
| `offroad` | vadeo (30%), ângulo ataque (20%), ângulo saída (20%), reboque (15%), potência (15%) | Qual pickup domina o fora-de-estrada? |

Ranking é determinístico: normalização min-max por critério + ponderação. Justificativa gerada via GPT-4.1-mini.

### Processos de Negócio Suportados

1. **Extração de Catálogo:** acionamento pelo analista → pipeline de 9 passos → persistência Oracle + ChromaDB
2. **Comparação Competitiva:** seleção de 2–6 veículos → análise side-by-side → destaques por atributo
3. **Ranking por Perfil:** seleção de perfil comprador ou pesos customizados → score ponderado → justificativa LLM
4. **Análise de Gaps:** identificar onde Ranger Raptor ganha ou perde vs. concorrentes por categoria
5. **Q&A sobre Catálogos:** pergunta em PT-BR → Adaptive RAG (factual/comparacao/recomendacao) → resposta com fontes
6. **Revisão de Termos Pendentes:** termos comerciais não mapeados → validação humana → atualização KB
7. **Monitoramento de Mudanças:** timeline de extrações → visualização de novidades por veículo

---

## Visão 3 — Application Architecture (Arquitetura de Sistema)

### Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Cliente)                              │
│         React Native 0.76 + Expo 54 + TypeScript 5                  │
│                                                                      │
│  Telas (Bottom Tab + Drawer):                                        │
│  ┌─────┐ ┌──────────┐ ┌───────┐ ┌───────┐ ┌──────┐ ┌──────────┐  │
│  │Login│ │Comparativo│ │ Score │ │ Gaps  │ │ Chat │ │ Timeline │  │
│  └─────┘ └──────────┘ └───────┘ └───────┘ └──────┘ └──────────┘  │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────┐ ┌───────┐  │
│  │ItensPendentes│ │ StatusDoAgente │ │EventosSeguranç│ │ Home  │  │
│  └──────────────┘ └────────────────┘ └──────────────┘ └───────┘  │
│                 (+ScoreSettings, DrawerMenu)                        │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ HTTPS (TLS 1.2/1.3) + Bearer JWT
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│              NGINX 1.27-alpine (API Gateway / Reverse Proxy)         │
│  Portas: 80 (redirect → HTTPS) e 443 (TLS)                         │
│  Função: terminação TLS, roteamento, headers de segurança           │
│  Config: nginx.conf (volume read-only), certificados em /certs      │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ HTTP interno (Docker network)
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│                  JAVA SPRING BOOT API — porta 8080                   │
│  Spring Boot 3.2.5 | Java 21 (Eclipse Temurin JRE Alpine)           │
│                                                                      │
│  Controllers:                                                        │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐ │
│  │  AuthController  │ │CatalogoController│ │    ChatController    │ │
│  │ POST /api/auth/  │ │ GET  /api/       │ │  POST /api/chat      │ │
│  │       login      │ │      catalogos   │ │                      │ │
│  └──────────────────┘ │ GET  /api/       │ └──────────────────────┘ │
│                       │      catalogos/  │                           │
│  ┌──────────────────┐ │      {id}        │ ┌──────────────────────┐ │
│  │ AdminController  │ │ POST /api/       │ │  HoneypotController  │ │
│  │ /api/admin/**    │ │      catalogos/  │ │  (decoy endpoints)   │ │
│  │ (role: admin)    │ │      extrair     │ └──────────────────────┘ │
│  └──────────────────┘ │ POST /api/       │                           │
│                       │      catalogos/  │                           │
│                       │      comparar    │                           │
│                       │ GET  /api/       │                           │
│                       │      catalogos/  │                           │
│                       │      ranking     │                           │
│                       └──────────────────┘                           │
│                                                                      │
│  Security Filter Chain (ordem de execução):                         │
│  TraceIdFilter → RateLimitFilter → IdempotencyFilter → JwtFilter    │
│                                                                      │
│  Services: AuthService, CatalogoService, ChatService                │
│  Flyway migrations: V1 (DDL) → V2 (índices) → V3 (seed) →          │
│                     V4 (views) → V5 (LGPD soft delete)              │
│                                                                      │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐ │
│  │  Oracle 12c+ (remoto)    │  │  PythonClientService             │ │
│  │  Tabelas:                │  │  HTTP POST com X-Internal-Token  │ │
│  │  USUARIOS                │  │  → python-ia:8000/extrair        │ │
│  │  CATALOGOS               │  │  → python-ia:8000/comparar       │ │
│  │  CATALOGO_ATRIBUTOS      │  │  → python-ia:8000/ranking        │ │
│  │  CATALOGO_FONTES_SEC.    │  │  → python-ia:8000/chat           │ │
│  │  CAPABILITY_SCORES       │  └──────────────────────────────────┘ │
│  │  SCORE_COMPETITIVO       │                                       │
│  │  CHAT_CACHE              │  /actuator/health → liveness Oracle  │
│  │  TERMOS_PENDENTES        │                                       │
│  │  Views: VW_CATALOGOS_    │                                       │
│  │  RESUMO, VW_ATRIBUTOS_   │                                       │
│  │  DIVERGENTES,            │                                       │
│  │  VW_CHAT_CACHE_ATIVO     │                                       │
│  └──────────────────────────┘                                       │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTP + X-Internal-Token (Docker network)
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│              PYTHON FASTAPI AI SERVICE — porta 8000                  │
│  Python 3.12 | FastAPI | Pydantic v2 | slowapi                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    AgenteCatalogo (ReAct)                   │    │
│  │  Passo 1: CRAG context (ChromaDB)                           │    │
│  │  Passo 2: Coleta PDF (pdfplumber + site oficial BR)         │    │
│  │  Passo 3: Coleta Site (Playwright / Firecrawl)             │    │
│  │  Passo 4: Coleta FIPE (FIPE API pública)                   │    │
│  │  Passo 5: Extração LLM (GPT-4.1-mini → GPT-4.1 fallback)  │    │
│  │  Passo 5.5: CRAG Rebuild (gaps pós-PDF)                     │    │
│  │  Passo 6: Normalização + terminology map + range check      │    │
│  │  Passo 7: Montagem CatalogoSchema (Pydantic)               │    │
│  │  Passo 7.5: KB Fallback (seed ChromaDB para gaps core)     │    │
│  │  Passo 8: Cálculo cobertura (status: completo/parcial/     │    │
│  │           pendente_revisao)                                  │    │
│  │  Passo 9: Enriquece KB (upsert ChromaDB confiança ≥ 0.7)  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Adaptive RAG (endpoint /chat):                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Classificação da pergunta:                                  │    │
│  │  "vs", "compar", "diferença"  → tipo: comparacao            │    │
│  │  "recomend", "qual o melhor"  → tipo: recomendacao          │    │
│  │  demais                       → tipo: factual               │    │
│  │                                                             │    │
│  │  Estratégia de contexto por tipo:                           │    │
│  │  factual     → atributos do veículo filtrado                │    │
│  │  comparacao  → atributos de todos + specs similares KB      │    │
│  │  recomendacao→ todos os atributos + capability definitions  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌───────────────────────┐  ┌───────────────────────────────────┐   │
│  │   ChromaDB (local)    │  │   LLM Client (OpenAI SDK)         │   │
│  │  4 coleções:          │  │  GPT-4.1-mini (primário)          │   │
│  │  - specs_normalizados │  │  GPT-4.1 (fallback automático     │   │
│  │  - terminologia       │  │  se cobertura < 70%)              │   │
│  │  - ranges_segmento    │  │  Temperature=0 (extração)         │   │
│  │  - capability_        │  │  Temperature=0.2–0.3 (chat/rank)  │   │
│  │    definitions        │  └───────────────────────────────────┘   │
│  │  Embedding: all-      │                                          │
│  │  MiniLM-L6-v2 (local)│                                          │
│  └───────────────────────┘                                          │
│                                                                      │
│  Tools do agente:                                                    │
│  ┌───────────────┐ ┌───────────────┐ ┌────────────────────────┐    │
│  │ pdf_extractor │ │  site_scraper │ │  fipe_api              │    │
│  │ (pdfplumber)  │ │  (Playwright  │ │  (FIPE pública)        │    │
│  │               │ │   + Firecrawl │ │                        │    │
│  │               │ │   fallback)   │ │  emplacamentos         │    │
│  └───────────────┘ └───────────────┘ │  (ranking de vendas)   │    │
│                                       └────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Interfaces e Contratos

| Interface | Protocolo | Autenticação | Formato |
|---|---|---|---|
| Usuário → nginx | HTTPS (TLS 1.2/1.3) | Nenhuma (terminação TLS) | HTTP/1.1 |
| nginx → Java API | HTTP (interno Docker) | Bearer JWT passado adiante | JSON |
| Mobile → Java API (efetivo) | HTTPS via nginx | Bearer JWT (8h TTL, RS256) | JSON |
| Java API → Python | HTTP REST (Docker network) | X-Internal-Token (HMAC compare) | JSON |
| Java API → Oracle | JDBC (ojdbc11 23.4.0) | Usuário/senha Oracle | SQL |
| Python → OpenAI | HTTPS | API Key (Authorization header) | JSON |
| Python → FIPE API | HTTPS | Nenhuma (pública) | JSON |
| Python → Sites fabricantes | HTTPS | Nenhuma (público) | HTML/PDF |

### Endpoints Completos

**Java API (porta 8080, exposta via nginx na 443):**

| Endpoint | Método | Descrição | Role Mínimo |
|---|---|---|---|
| `/api/auth/login` | POST | Login → JWT (5 req/min por IP) | Público |
| `/api/catalogos` | GET | Listar catálogos | viewer |
| `/api/catalogos/{id}` | GET | Detalhe do catálogo | viewer |
| `/api/catalogos/extrair` | POST | Acionar extração IA (10 req/min) | analista |
| `/api/catalogos/comparar` | POST | Comparar 2–6 veículos | viewer |
| `/api/catalogos/ranking` | GET | Ranking por perfil | viewer |
| `/api/chat` | POST | Q&A RAG (20 req/min) | viewer |
| `/actuator/health` | GET | Health check Java + Oracle conn | Público |
| `/swagger-ui/**` | GET | Documentação OpenAPI | admin |
| `/api/admin/**` | * | Administração de usuários | admin |

**Python FastAPI (porta 8000, acesso somente interno via Docker network):**

| Endpoint | Método | Rate Limit | Descrição |
|---|---|---|---|
| `/extrair` | POST | 5/min | Pipeline de 9 passos + agente IA |
| `/catalogos` | GET | 30/min | Lista catálogos processados em disco |
| `/catalogos/{marca}/{modelo}/{versao}` | GET | 30/min | Catálogo processado específico |
| `/comparar` | POST | 10/min | Comparação side-by-side N veículos |
| `/chat` | POST | 10/min | Adaptive RAG Q&A PT-BR |
| `/ranking` | POST | 20/min | Ranking ponderado com justificativa |
| `/health` | GET | — | Status FastAPI + ChromaDB collections |

### Telas do App Mobile

12 telas implementadas, verificadas em `/mobile/src/screens/`:

| Tela | Arquivo | Função |
|---|---|---|
| Login | `LoginScreen.tsx` | Autenticação JWT, formulário com validação |
| Home | `HomeScreen.tsx` | Dashboard de entrada, resumo de catálogos |
| Comparativo | `ComparativoScreen.tsx` | Comparação side-by-side de 2–6 veículos |
| Score | `ScoreScreen.tsx` | Scores competitivos por perfil |
| Score Settings | `ScoreSettingsScreen.tsx` | Configuração de pesos personalizados de ranking |
| Gaps | `GapsScreen.tsx` | Análise de lacunas competitivas do Ranger Raptor |
| Chat | `ChatScreen.tsx` | Q&A em linguagem natural (Adaptive RAG) |
| Timeline | `TimelineScreen.tsx` | Histórico de extrações e mudanças por veículo |
| Itens Pendentes | `PendingItemsScreen.tsx` | Fila de termos desconhecidos para validação humana |
| Status do Agente | `StatusAgentScreen.tsx` | Log em tempo real das execuções do agente IA |
| Eventos de Segurança | `SecurityEventsScreen.tsx` | Audit log de acessos, alertas JWT e rate limit |
| Menu Lateral | `DrawerMenuScreen.tsx` | Navegação via drawer |

### Fluxo de Dados — Extração de Catálogo (Fim a Fim)

```
1. Analista toca "Extrair" no app → POST /api/catalogos/extrair
   { marca: "toyota", modelo: "hilux", versao: "gr-s" }

2. nginx → TLS termination → forward para java-api:8080

3. Java: TraceIdFilter injeta X-Trace-Id → RateLimitFilter
   (10 req/min para /extrair) → IdempotencyFilter (X-Idempotency-Key)
   → JwtFilter valida Bearer token → RBAC verifica role=analista

4. InputSanitizer sanitiza campos → CatalogoService.solicitarExtracao()
   → auditoria: AUDIT|extracao_solicitada|... (logback JSON)

5. PythonClientService: POST http://python-ia:8000/extrair
   Header: X-Internal-Token (HMAC compare_digest no Python)

6. AgenteCatalogo.processar() executa os 9 passos:
   a. Contexto CRAG (ChromaDB specs_normalizados)
   b. Download PDF do site toyota.com.br
   c. Scraping site oficial BR (Playwright)
   d. FIPE API → preço tabela BR
   e. GPT-4.1-mini extrai ~50 atributos (temperatura=0)
      → cobertura < 70%? → escalada para GPT-4.1
   f. CRAG Rebuild: contexto focado nos gaps pós-PDF
   g. Normalização: terminology map + validação de ranges
   h. CatalogoSchema Pydantic (campos inválidos = null, não inventados)
   i. KB Fallback: gaps core preenchidos de seed ChromaDB
   j. Cobertura core calculada: completo(≥90%) / parcial(≥70%) / pendente
   k. KB enriquecida (upsert ChromaDB confiança ≥ 0.7)

7. Python retorna ResultadoExtracao JSON → Java CatalogoService
   → UPSERT CATALOGOS + CATALOGO_ATRIBUTOS no Oracle
   → Termos desconhecidos → TERMOS_PENDENTES

8. Mobile recebe CatalogoResponseDTO:
   { id, marca, modelo, versao, status, cobertura_pct, atributos[], capabilities[] }

9. UI atualiza dashboard com dados verificados e rastreáveis
```

### Fluxo de Dados — Q&A Chat (Adaptive RAG)

```
1. Usuário digita "Qual a potência da Hilux vs. Ranger Raptor?"

2. POST /api/chat → Java ChatService → POST python-ia:8000/chat

3. Python classifica a pergunta:
   "vs" encontrado → tipo: comparacao

4. Contexto "comparacao":
   - Carrega schemas de todos os catálogos em disco (data/validated/)
   - Busca specs similares no ChromaDB (distância coseno < 0.4)
   - Formata: "Toyota Hilux GR-S — potencia_cv: 204 ..."
              "Ford Ranger Raptor — potencia_cv: 397 ..."

5. GPT-4.1-mini recebe: system (analista automotivo BR) + user (contexto + pergunta)
   temperature=0.3 / max_tokens=1024

6. Resposta retorna para Mobile com:
   { resposta: "...", contexto_utilizado: true, query_type: "comparacao" }

7. Java ChatService faz cache na tabela CHAT_CACHE (hash SHA-256 da pergunta)
   → Próxima pergunta idêntica → cache hit (reduz ~60% chamadas LLM)
```

### Componentes de Segurança (Camadas Verificadas)

```
┌─────────────────────────────────────────────────────────────┐
│                CAMADAS DE SEGURANÇA                         │
├─────────────────────────────────────────────────────────────┤
│  Camada 1: HTTPS/TLS 1.2+1.3   — nginx (transporte)        │
│  Camada 2: Security Headers    — X-Frame-Options: DENY,     │
│                                  CSP, HSTS (1 ano), XCTO    │
│  Camada 3: JWT Bearer RS256    — TTL 8h, iss/aud, stateless │
│  Camada 4: RBAC Filter         — admin/analista/viewer       │
│  Camada 5: Rate Limit (Java)   — login:5/min, extrair:10/min│
│                                  chat:20/min por IP         │
│  Camada 6: Rate Limit (Python) — slowapi por endpoint        │
│            (extrair:5, comparar:10, chat:10, ranking:20,    │
│             catalogos:30 req/min)                            │
│  Camada 7: Input Sanitizer     — prevenção SQL injection/XSS│
│  Camada 8: Idempotency Filter  — X-Idempotency-Key          │
│  Camada 9: TraceId Filter      — X-Trace-Id por requisição  │
│  Camada 10: X-Internal-Token   — HMAC compare_digest Java↔Python │
│  Camada 11: BCrypt (cost=12)   — hash de senhas             │
│  Camada 12: AES-256            — criptografia de campos sens.│
│  Camada 13: Audit Log JSON     — logback: AUDIT|evento|...  │
│  Camada 14: Honeypot Endpoints — decoy para detectar scans  │
│  Camada 15: LGPD V5 (Flyway)   — soft delete + DELETED_AT  │
└─────────────────────────────────────────────────────────────┘

Nota: A tabela EVENTOS_SEGURANCA mencionada em protótipos anteriores
foi substituída por **logs estruturados** (`logback-spring.xml` JSON +
`AUDIT|...` / `[SECURITY_ALERT]`) e pela tela mobile de demonstração
(mock). Não há DDL Flyway `EVENTOS_SEGURANCA` nesta entrega.
```

---

## Visão 4 — Technology Architecture (Arquitetura de Tecnologia)

### Diagrama de Infraestrutura (Docker Compose)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  HOST MACHINE (Linux / Windows / Mac)               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   DOCKER COMPOSE v2                         │   │
│  │                                                             │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │           nginx — ford-nginx                          │ │   │
│  │  │  Image: nginx:1.27-alpine                             │ │   │
│  │  │  Ports: 80:80 (HTTP→HTTPS redirect)                  │ │   │
│  │  │         443:443 (TLS 1.2/1.3)                        │ │   │
│  │  │  Volumes: nginx.conf (ro), /certs (ro)               │ │   │
│  │  │  depends_on: java-api (healthy)                       │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  │                      ↑ depends_on (healthy)                 │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │           java-api — ford-java-api                    │ │   │
│  │  │  Build: ./backend-java/Dockerfile                     │ │   │
│  │  │  Image: Eclipse Temurin 21 JRE Alpine                 │ │   │
│  │  │  Port: 8080                                           │ │   │
│  │  │  Healthcheck: GET /actuator/health (30s/10s/5ret)    │ │   │
│  │  │  Env: ORACLE_URL, ORACLE_USER, ORACLE_PASSWORD,      │ │   │
│  │  │       PYTHON_SERVICE_URL=http://python-ia:8000,       │ │   │
│  │  │       RSA_PRIVATE/PUBLIC_KEY, ENCRYPTION_KEY,        │ │   │
│  │  │       INTERNAL_API_KEY, ORACLE_*, OPENAI_API_KEY     │ │   │
│  │  │       RSA_PRIVATE_KEY, RSA_PUBLIC_KEY,                │ │   │
│  │  │       CORS_ALLOWED_ORIGINS, FORD_ADMIN_PASSWORD       │ │   │
│  │  │  depends_on: python-ia (healthy)                      │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  │                      ↑ depends_on (healthy)                 │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │           python-ia — ford-python-ia                  │ │   │
│  │  │  Build: ./microsservico-ia/Dockerfile                 │ │   │
│  │  │  Image: Python 3.12-slim + Playwright + Chromium      │ │   │
│  │  │  Port: 8000                                           │ │   │
│  │  │  Healthcheck: GET /health (30s/10s/5ret/60s start)   │ │   │
│  │  │  Volumes: chroma_data → /app/data/chromadb (rw)      │ │   │
│  │  │           ./data/seed → /app/data/seed (ro)          │ │   │
│  │  │           ./data/pdfs → /app/data/pdfs (ro)          │ │   │
│  │  │  Env: ANTHROPIC_API_KEY (reservado), OPENAI_API_KEY, │ │   │
│  │  │       INTERNAL_API_KEY, LLM_PROVIDER=openai,          │ │   │
│  │  │       FIRECRAWL_API_KEY, CHROMA_PERSIST_DIR           │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  │                                                             │   │
│  │  Volumes nomeados:                                          │   │
│  │    ford_chromadb (chroma_data) — persistente               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└──────────┬──────────────────────────────────────────┬──────────────┘
           │ JDBC ojdbc11 (external)                  │ HTTPS API (external)
           ↓                                          ↓
┌────────────────────┐                   ┌──────────────────────────┐
│  Oracle 12c+       │                   │  APIs Externas           │
│  FIAP server       │                   │  - OpenAI (GPT-4.1-mini  │
│  oracle.fiap.      │                   │    primário; GPT-4.1     │
│  com.br:1521/ORCL  │                   │    fallback automático)  │
│                    │                   │  - FIPE API (pública)    │
│  8 tabelas + 3     │                   │  - Firecrawl (scraping   │
│  views Oracle      │                   │    fallback Playwright)  │
└────────────────────┘                   │  - Sites fabricantes BR  │
                                         │    (toyota.com.br, etc.) │
                                         └──────────────────────────┘
```

### Sequência de Inicialização

```
docker compose up
        │
        ├── python-ia inicia
        │     a. pip install -r requirements.txt
        │     b. playwright install chromium
        │     c. startup(): _seed_validated_from_seed_files()
        │        → data/seed/*.json → data/validated/ (idempotente)
        │     d. startup(): get_kb() → KBManager.inicializar()
        │        → ChromaDB: 4 coleções criadas/verificadas
        │        → Embedding model all-MiniLM-L6-v2 carregado
        │     e. uvicorn main:app --port 8000
        │     f. Healthcheck GET /health → OK
        │        → python-ia: healthy ✓
        │
        ├── java-api inicia (depends_on python-ia healthy)
        │     a. JVM startup (Eclipse Temurin 21)
        │     b. Flyway migrations: V1→V2→V3→V4→V5 (idempotente)
        │        → Oracle: 8 tabelas + 3 views + índices + LGPD
        │     c. DataInitializer: admin seed se não existir
        │     d. Spring Security + Filtros configurados
        │     e. Spring Boot started on port 8080
        │     f. Healthcheck GET /actuator/health → UP
        │        → java-api: healthy ✓
        │
        └── nginx inicia (depends_on java-api healthy)
              a. nginx.conf carregado (read-only volume)
              b. Certificados TLS carregados
              c. Listeners: 80 (redirect), 443 (proxy pass)
              → Sistema operacional em ~60–90 segundos
```

### Especificações de Infraestrutura

| Componente | Tecnologia | Versão Verificada | Observação |
|---|---|---|---|
| Container Runtime | Docker + Docker Compose | v2+ | Orquestração local |
| API Gateway | nginx | 1.27-alpine | TLS 1.2/1.3, HTTP→HTTPS |
| Java Runtime | Eclipse Temurin JRE Alpine | 21 (LTS) | ~512MB RAM estimado |
| Web Framework (Java) | Spring Boot | 3.2.5 | Spring Security + JPA + Actuator |
| JWT | jjwt | 0.12.5 | RS256, TTL 8h |
| ORM / Migrações | Spring Data JPA + Flyway | boot 3.2.5 | V1–V5, Oracle dialect |
| JDBC Driver | ojdbc11 | 23.4.0.24.05 | Compatível Oracle 12c+ |
| Documentação API | springdoc-openapi | 2.5.0 | Swagger UI (role=admin) |
| Python Runtime | Python | 3.12-slim | Base da imagem |
| AI Framework | FastAPI | Latest | Async, OpenAPI, docs em dev only |
| Validação | Pydantic | v2 | Structured output + schema canônico |
| Rate Limiting (Python) | slowapi | Latest | Por endpoint, por IP |
| LLM Primário | OpenAI GPT-4.1-mini | API | Temperatura=0, extração |
| LLM Fallback | OpenAI GPT-4.1 | API | Se cobertura < 70% |
| Scraping dinâmico | Playwright + Chromium | Latest | SPAs, sites JS-rendered |
| Scraping fallback | Firecrawl | API | Se Playwright bloqueado |
| Extração PDF | pdfplumber | Latest | PDFs de catálogos oficiais |
| Preços BR | FIPE API | Pública | Tabela FIPE de referência |
| Vector Store | ChromaDB PersistentClient | 0.5.0+ | 4 coleções, ~1GB/6 veículos |
| Embedding Model | all-MiniLM-L6-v2 | 3.0.0+ | Local (sentence-transformers) |
| Banco Relacional | Oracle 12c+ | 12c+ | Servidor FIAP (externo) |
| Mobile Framework | React Native | 0.76 | |
| Mobile Plataforma | Expo | 54 | Expo Router, TypeScript 5 |

**Nota sobre LLM:** O `ANTHROPIC_API_KEY` está declarado no `docker-compose.yml` como variável de ambiente reservada para uso futuro. O código atual (`llm_client.py`, `config.py`) utiliza exclusivamente a API OpenAI (SDK `openai`). A variável `LLM_PROVIDER` tem valor padrão `openai` em `config.py`.

### Modelo de Dados Oracle (Verificado via Flyway V1–V5)

```
USUARIOS (V1)
  ID | EMAIL | SENHA_HASH (BCrypt cost=12) | NOME | ROLE(admin/analista/viewer)
  ATIVO | DATA_CRIACAO | ULTIMO_ACESSO | DELETED_AT (V5 LGPD)

CATALOGOS (V1)
  ID | MARCA(6 allowed) | MODELO | VERSAO | ANO_MODELO | SEGMENTO
  STATUS(completo/parcial/pendente_revisao) | COBERTURA_PCT | COBERTURA_LIVE_PCT
  FONTES_UTILIZADAS | DATA_EXTRACAO | DATA_CRIACAO

CATALOGO_ATRIBUTOS (V1)
  ID | CATALOGO_ID | ATRIBUTO | VALOR_TEXT | VALOR_NUMBER | TIPO_VALOR
  CONFIANCA(0–1) | FONTE_PRIMARIA | MERCADO_CONFIRMADO_BR | DIVERGENTE
  REVISADO_HUMANO | SCHEMA_NIVEL(core/estendido)

CATALOGO_FONTES_SECUNDARIAS (V1)
  ID | ATRIBUTO_ID | URL | VALOR_TEXT | STATUS(confirma/diverge/complementa) | CONFIANCA

CAPABILITY_SCORES (V1)
  ID | CATALOGO_ID | CAPABILITY | NIVEL(0–3) | NIVEL_MAXIMO_CLUSTER
  SCORE_BRUTO | SCORE_AJUSTADO | LIDER_MARCA | DATA_CALCULO

SCORE_COMPETITIVO (V1)
  ID | CATALOGO_ID | SCORE_TECNICO | SCORE_VALOR | PERFIL_COMPETICAO | DATA_CALCULO

CHAT_CACHE (V1)
  ID | PERGUNTA_HASH(SHA-256) | PERGUNTA_ORIGINAL(CLOB) | RESPOSTA(CLOB)
  FONTES_CITADAS | DATA_CRIACAO | DATA_EXPIRACAO

TERMOS_PENDENTES (V1)
  ID | TERMO | CONTEXTO | ATRIBUTO_SUGERIDO | FONTE | DATA_DETECTADO
  STATUS(pendente/mapeado/descartado) | REVISADO_POR | DATA_REVISAO

Views (V4):
  VW_CATALOGOS_RESUMO       — join CATALOGOS + SCORE_COMPETITIVO (listagem mobile)
  VW_ATRIBUTOS_DIVERGENTES  — atributos com DIVERGENTE=1 (fila revisão humana)
  VW_CHAT_CACHE_ATIVO       — cache dentro da validade com horas restantes
```

### ChromaDB — Coleções e Função

| Coleção | Nome Interno | Função |
|---|---|---|
| Specs normalizados | `specs_normalizados` | Atributos extraídos e validados (seed + live); base para CRAG e KB fallback |
| Terminologia | `terminologia` | Mapeamento de termos comerciais → atributos canônicos (ex: "Toyota Safety Sense" → ADAS flags) |
| Ranges do segmento | `ranges_segmento` | Faixas esperadas por atributo (min/max/média) para contexto CRAG e validação |
| Capability definitions | `capability_definitions` | Definições de nível 0–3 por capability (ex: capacidade_offroad, sistema_multimidia) |

Embedding: `all-MiniLM-L6-v2` (384 dimensões, local, sem custo de API).
Similaridade: distância coseno (`hnsw:space: cosine`).

### Variáveis de Ambiente (`.env`)

```
# LLM (atual: OpenAI)
OPENAI_API_KEY=sk-...           # GPT-4.1-mini (primário) + GPT-4.1 (fallback)
LLM_PROVIDER=openai             # padrão: openai

# LLM (futuro — reservado)
ANTHROPIC_API_KEY=sk-ant-...    # Claude — declarado, não utilizado pelo código atual

# Scraping
FIRECRAWL_API_KEY=fc-...        # fallback se Playwright bloqueado

# Auth inter-serviços
INTERNAL_API_KEY=...            # validado com hmac.compare_digest

# Oracle FIAP
ORACLE_URL=jdbc:oracle:thin:@oracle.fiap.com.br:1521/ORCL
ORACLE_USER=...
ORACLE_PASSWORD=...

# JWT + Criptografia
RSA_PRIVATE_KEY=...             # PEM PKCS8 (RS256)
RSA_PUBLIC_KEY=...              # PEM X.509 (RS256)
RSA_PRIVATE_KEY=...             # reservado (RS256 futuro)
RSA_PUBLIC_KEY=...              # reservado (RS256 futuro)
ENCRYPTION_KEY=...              # 32 bytes AES-256

# App
CORS_ALLOWED_ORIGINS=http://localhost:8081
FORD_ADMIN_PASSWORD=Ford@2025   # seed do admin via DataInitializer
APP_ENV=production              # docs/swagger desabilitados em produção
```

### Monitoramento em Produção

| Mecanismo | Endpoint / Tela | O que Monitora |
|---|---|---|
| Spring Actuator | `/actuator/health` | Liveness/readiness Java + conexão Oracle |
| Python Health | `/health` | Status FastAPI + contagem por coleção ChromaDB |
| Docker healthcheck | `docker ps` | Estado dos 3 containers (nginx, java-api, python-ia) |
| Tela "Status do Agente" | App mobile | Log de decisões da última execução do agente IA |
| Tela "Eventos de Segurança" | App mobile | Audit log JSON: rate limit hits, JWT inválido, extrações |
| CHAT_CACHE | `VW_CHAT_CACHE_ATIVO` | Entradas ativas e horas restantes de validade |
| `cobertura_pct` | Oracle CATALOGOS | % de atributos extraídos por veículo |
| `confianca` médio | Oracle query | Qualidade média das extrações por fonte |
| `DIVERGENTE=1` | `VW_ATRIBUTOS_DIVERGENTES` | Fila de revisão humana de divergências entre fontes |

### Funcionalidades Planejadas (Não Implementadas)

Os itens a seguir foram considerados no escopo inicial mas **não foram implementados** na versão atual:

| Funcionalidade | Status | Observação |
|---|---|---|
| YouTube/Whisper transcrição | Planejado | Não existe código na tool list atual |
| JWT RS256 (assimétrico) | Entregue | RSA_PRIVATE/PUBLIC_KEY + JwtUtil RS256 + iss/aud |
| Anthropic Claude (extração) | Planejado | ANTHROPIC_API_KEY declarado, OpenAI em uso |
| RabbitMQ (fila de extrações) | Planejado | Mencionado em protótipos; não no docker-compose |
| CF Browser Rendering | Planejado | CF_ACCOUNT_ID/CF_API_TOKEN em config.py; sem uso ativo |

---

## Como a Arquitetura Contribui para a Qualidade

### 1. Separação de Responsabilidades

Java (transações ACID, segurança, RBAC) e Python (IA sem estado crítico) são serviços independentes em containers separados.
- Falha no serviço Python não derruba a API Java (dados já persistidos no Oracle continuam acessíveis)
- Manutenção de cada camada é independente
- Testes unitários podem ser feitos em isolamento por serviço

### 2. Resiliência por Design

- Fallback LLM: GPT-4.1-mini → GPT-4.1 (automático se cobertura < 70%)
- Fallback de extração: PDF → Site (Playwright) → Firecrawl
- KB Fallback: gaps core preenchidos de seed ChromaDB (dados pré-validados)
- Cache CHAT_CACHE: reduz chamadas LLM repetidas para a mesma pergunta
- Idempotência: X-Idempotency-Key evita reprocessamento acidental

### 3. Versionamento e Reprodutibilidade

- Flyway migrations V1–V5: esquema Oracle sempre na versão correta, idempotente
- Docker Compose: ambiente 100% reproduzível (`./start.sh` ou `./start.bat`)
- Seed idempotente: ChromaDB pode ser recriado a qualquer momento sem perda de dados históricos

### 4. Rastreabilidade de Dados (Princípio Central)

Cada atributo armazenado no Oracle carrega:
- `fonte_primaria`: URL exata da fonte que gerou o valor
- `confianca`: índice 0.0–1.0 por tipo de fonte (pdf_oficial=1.0, fipe=0.90, site_oficial=0.85, etc.)
- `divergente`: flag de conflito entre fontes
- `mercado_confirmado_br`: confirmação de domínio `.com.br`
- `revisado_humano`: flag de validação manual

### 5. Observabilidade

- Actuator metrics para health check automático pelo Docker Compose
- Dashboard "Status do Agente" expõe log de decisões sem acesso SSH
- Campo `cobertura_pct` por veículo visível no dashboard para qualidade de dados
- Views Oracle (`VW_ATRIBUTOS_DIVERGENTES`) facilitam priorização da revisão humana

### 6. Segurança em Camadas (Defense in Depth)

TLS → nginx headers → JWT → RBAC → Rate Limit → TraceId → Input Sanitizer → Encryption → Honeypot
- 15 camadas verificadas em código (SecurityConfig.java, RateLimitFilter, InputSanitizer, EncryptedStringConverter)
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
│   ├── TO-BE Pipeline Detail (9 passos do agente)
│   └── Business Function Map + RBAC roles
├── 03 - Application Architecture
│   ├── Application Component Diagram (nginx + Java + Python + ChromaDB)
│   ├── Application Cooperation viewpoint (interfaces e contratos)
│   ├── Data Flow — Extração (fim a fim)
│   └── Data Flow — Adaptive RAG Chat
└── 04 - Technology Architecture
    ├── Infrastructure viewpoint (3 containers Docker + Oracle externo)
    ├── Deployment viewpoint (volumes, ports, depends_on)
    └── Data Model (8 tabelas Oracle + 3 views)
```

### Elementos ArchiMate por Visão

**Motivation (Architecture Vision):**
- `Stakeholder`: Ford Produto, Ford Marketing, Ford Estratégia, Ford Vendas, Analista, TI Ford, FIAP
- `Driver`: Análise competitiva manual — 80h/mês, 3-5 dias
- `Goal`: Extração automatizada < 1h, < R$ 0,50/ciclo
- `Principle`: Zero alucinação, Rastreabilidade, Mobile-first

**Business Architecture:**
- `BusinessActor`: Analista Especializado, Time Produto Ford, Time Marketing Ford, Time Estratégia Ford
- `BusinessRole`: admin, analista, viewer (RBAC)
- `BusinessProcess`: Extração Catálogo (9 passos), Comparação Competitiva, Ranking por Perfil, Q&A RAG, Revisão de Termos
- `BusinessFunction`: Monitoramento Competitivo, Análise Estratégica, Validação de Dados
- `BusinessObject`: CatalogoSchema, AtributoMeta, ScoreCompetitivo, TermoPendente

**Application Architecture:**
- `ApplicationComponent`: Mobile App (React Native), nginx (API Gateway), Java API (Spring Boot), Python AI Service (FastAPI), ChromaDB
- `ApplicationService`: AuthService, CatalogoService, ChatService, AgenteCatalogo, KBManager, AdaptiveRAG
- `ApplicationInterface`: HTTPS REST (nginx:443), HTTP REST interna (8000), JDBC (Oracle), Mobile UI (12 telas)
- `DataObject`: CatalogoResponseDTO, AtributoDTO, ComparativoResponseDTO, RankingResult, ChatResponse

**Technology Architecture:**
- `Node`: Docker Host, Oracle Server FIAP (oracle.fiap.com.br), OpenAI Cloud
- `SystemSoftware`: Docker Compose v2, nginx 1.27-alpine, JVM 21 (Temurin), Python 3.12, ChromaDB, Playwright Chromium
- `TechnologyService`: HTTPS/TLS 1.2+1.3, JDBC (ojdbc11), OpenAI API, FIPE API, Firecrawl API
- `Artifact`: catalog-api-1.0.0.jar, Docker image python-ia, ford_chromadb volume, Flyway migrations V1–V5
- `CommunicationNetwork`: Docker bridge network (internal), Internet (APIs externas), FIAP network (Oracle JDBC)
