# Azure DevOps — Plano de Projeto Sprint 3 (AutoSight)

Documento espelho do backlog Scrum no Azure Boards, alinhado à arquitetura TOGAF ([04_arquitetura_togaf.md](04_arquitetura_togaf.md)).

**Entrega avaliativa:** link da organização Azure DevOps + professor com perfil Basic (org) e Administrador (projeto).

**Setup cloud:** [azure-devops/README_SETUP.md](azure-devops/README_SETUP.md)  
**Import CSV:** [azure-devops/backlog-import.csv](azure-devops/backlog-import.csv)

> Substitua `LINK_AZURE` abaixo pelo URL real após criar o projeto:
> `https://dev.azure.com/<ORG>/AutoSight`

---

## 1. Hierarquia do Product Backlog

```
Épico
 └── Feature
      └── Product Backlog Item (User Story / PBI)
           └── Task (Sprint)
```

### Épicos

| ID | Épico | Objetivo de negócio | Alinhamento TOGAF |
|----|-------|---------------------|-------------------|
| E1 | Autenticação e Controle de Acesso | Garantir acesso seguro por perfil Ford | Application Architecture — Security |
| E2 | Catálogo Competitivo | Extrair, persistir e consultar fichas de pickups | Application + Data Architecture |
| E3 | Análise e Ranking | Comparar veículos e ranquear por perfil | Business Capability — Competitive Intel |
| E4 | Assistente RAG | Perguntas em linguagem natural sobre catálogos | Technology — AI Service |
| E5 | Experiência Mobile | App Expo com todos os fluxos do desafio | Application — Mobile Channel |
| E6 | Qualidade, Segurança e Operação | Testes, DevSecOps, observabilidade, compliance | Technology + Security Architecture |

---

## 2. Features e PBIs (com BDD)

Convenções:
- **Prioridade:** Must / Should / Could (MoSCoW)
- **Esforço:** Planning Poker (Fibonacci: 1, 2, 3, 5, 8, 13)
- **DoR (Ready):** descrição clara, AC em BDD, deps resolvidas, esforço estimado
- **DoD (Done):** código em main, testes passando, Swagger atualizado (API), review feito

### E1 — Autenticação e Controle de Acesso

#### Feature F1.1 — Login JWT

| Campo | Valor |
|-------|-------|
| PBI | **PBI-101** Como analista Ford, quero autenticar com e-mail/senha para obter JWT |
| Prioridade | Must |
| Esforço | 5 |
| Dependências | — |
| Sprint | 1 (entregue) / manutenção Sprint 3 |

**Acceptance Criteria (BDD):**
```gherkin
Scenario: Login com credenciais válidas
  Given um usuário ativo com role "analista"
  When POST /api/auth/login com e-mail e senha corretos
  Then a resposta é 200
  And o body contém token JWT RS256, role e expiresIn

Scenario: Login com senha inválida
  Given um usuário ativo
  When POST /api/auth/login com senha incorreta
  Then a resposta é 401
  And nenhum token é emitido
```

#### Feature F1.2 — RBAC por perfil

| Campo | Valor |
|-------|-------|
| PBI | **PBI-102** Como administrador, quero restringir endpoints por role |
| Prioridade | Must |
| Esforço | 5 |
| Dependências | PBI-101 |
| Sprint | 1–2 |

**Mapeamento de perfis (rubrica Cyber ↔ AutoSight):**

| Rubrica genérica | Role AutoSight | Responsabilidade |
|------------------|----------------|------------------|
| Administrador | `admin` | Usuários, Swagger, termos pendentes |
| Gestor | `analista` | Extração, ranking, chat operacional |
| Brigadista / operador | `viewer` | Consulta catálogos e comparativo (somente leitura) |

**Acceptance Criteria (BDD):**
```gherkin
Scenario: Viewer não extrai catálogo
  Given um JWT com role "viewer"
  When POST /api/catalogos/extrair
  Then a resposta é 403

Scenario: Analista extrai catálogo
  Given um JWT com role "analista"
  When POST /api/catalogos/extrair com payload válido
  Then a resposta é 200
```

#### Feature F1.3 — LGPD anonimização

| Campo | Valor |
|-------|-------|
| PBI | **PBI-103** Como titular, quero anonimizar minha conta (Art. 16 LGPD) |
| Prioridade | Should |
| Esforço | 3 |
| Dependências | PBI-101 |
| Sprint | 3 |

```gherkin
Scenario: Anonimizar conta autenticada
  Given um JWT válido
  When DELETE /api/auth/me
  Then a resposta é 200
  And o e-mail é substituído por prefixo anonimizado_
  And ativo = false
```

---

### E2 — Catálogo Competitivo

#### Feature F2.1 — Extração via agente

| Campo | Valor |
|-------|-------|
| PBI | **PBI-201** Como analista, quero extrair fichas de pickups concorrentes |
| Prioridade | Must |
| Esforço | 13 |
| Dependências | PBI-101, serviço Python |
| Sprint | 2 |

```gherkin
Scenario: Extração bem-sucedida
  Given JWT analista e microsserviço IA saudável
  When POST /api/catalogos/extrair com marca/modelo/versão
  Then 200 e catálogo persistido no Oracle
  And atributos possuem fonte rastreável
```

#### Feature F2.2 — Consulta de catálogos

| Campo | Valor |
|-------|-------|
| PBI | **PBI-202** Como viewer, quero listar e abrir fichas |
| Prioridade | Must |
| Esforço | 3 |
| Dependências | PBI-201 |
| Sprint | 2 |

```gherkin
Scenario: Listar sem token
  When GET /api/catalogos sem Authorization
  Then 401
```

---

### E3 — Análise e Ranking

| ID | PBI | Prioridade | Esforço | Deps | Sprint |
|----|-----|------------|---------|------|--------|
| PBI-301 | Comparar 2–6 catálogos | Must | 5 | PBI-202 | 2 |
| PBI-302 | Ranking por perfil / pesos custom | Must | 8 | PBI-202 | 2 |
| PBI-303 | Gaps competitivos na UI | Should | 5 | PBI-302 | 2 |

```gherkin
Scenario: Comparativo com menos de 2 IDs
  Given JWT válido
  When POST /api/catalogos/comparar com 1 id
  Then 400 ou 422 com erro padronizado
```

---

### E4 — Assistente RAG

| ID | PBI | Prioridade | Esforço | Deps | Sprint |
|----|-----|------------|---------|------|--------|
| PBI-401 | Chat RAG autenticado | Must | 8 | PBI-101, Python | 2 |
| PBI-402 | Cache de respostas recorrentes | Should | 3 | PBI-401 | 3 |

---

### E5 — Experiência Mobile

| ID | PBI | Prioridade | Esforço | Deps | Sprint |
|----|-----|------------|---------|------|--------|
| PBI-501 | Login + tabs principais | Must | 8 | PBI-101 | 2 |
| PBI-502 | Comparativo, Score, Gaps, Chat | Must | 13 | PBI-301–401 | 2 |
| PBI-503 | Build APK EAS instalável | Must | 5 | PBI-502 | 3 |
| PBI-504 | Identidade visual consistente | Should | 5 | PBI-501 | 3 |
| PBI-505 | Demo visual / screenshots | Should | 3 | PBI-504 | 3 |

---

### E6 — Qualidade, Segurança e Operação

| ID | PBI | Prioridade | Esforço | Deps | Sprint |
|----|-----|------------|---------|------|--------|
| PBI-601 | Testes unitários Java (service/security) | Must | 8 | — | 3 |
| PBI-602 | Testes MockMvc 200/401/403 | Must | 8 | PBI-101 | 3 |
| PBI-603 | Pipeline DevSecOps (SAST/SCA/secrets) | Must | 8 | — | 3 |
| PBI-604 | Observabilidade + plano de IR | Should | 5 | PBI-603 | 3 |
| PBI-605 | Compliance STRIDE + OWASP + LGPD | Must | 5 | PBI-603 | 3 |
| PBI-606 | OpenAPI + README execução | Must | 3 | — | 3 |

---

## 3. Ordenação do backlog (sequência de implementação)

1. PBI-101 → PBI-102 → PBI-202  
2. PBI-201 → PBI-301 → PBI-302 → PBI-303  
3. PBI-401 → PBI-402  
4. PBI-501 → PBI-502 → PBI-504 → PBI-503 → PBI-505  
5. PBI-601 → PBI-602 → PBI-606  
6. PBI-603 → PBI-604 → PBI-605 → PBI-103  

**Soma esforço Must Sprint 3:** PBI-503(5)+601(8)+602(8)+603(8)+605(5)+606(3) = **37 pts**  
**Should Sprint 3:** 504(5)+505(3)+604(5)+103(3)+402(3) = **19 pts**  
Balanceamento: Sprint 3 ~56 pts; Sprint 4 (pitch/vídeo/Archi) ~21 pts (artefatos).

---

## 4. Release Plan / Roadmap

| Release | Sprint | Janela | Itens principais | Pontos |
|---------|--------|--------|------------------|--------|
| R0 Foundation | 1 | — | Auth JWT, Oracle, extração básica | ~26 |
| R1 Product Core | 2 | — | Comparativo, ranking, RAG, mobile 10+ telas | ~50 |
| **R2 Sprint 3** | **3** | **até 27/09** | Testes API, DevSecOps, APK, compliance, Azure Boards | **~56** |
| R3 Pitch | 4 | até 11/10 | Vídeo ≤6 min, Archi, métricas finais | ~21 |

---

## 5. Sprint 3 em curso — Tasks

| Task ID | Pai | Descrição | Esforço | Deps técnicas | Status |
|---------|-----|-----------|---------|---------------|--------|
| T-301 | PBI-602 | MockMvc Auth: login 200, sem token 401 | 3 | spring-security-test | Em andamento |
| T-302 | PBI-602 | MockMvc Catalogo: viewer 403 em /extrair | 3 | T-301 | Em andamento |
| T-303 | PBI-601 | Ampliar unit tests JwtUtil / Encryption | 5 | JUnit 5 | Em andamento |
| T-304 | PBI-603 | Workflow GitHub Actions SAST+SCA+gitleaks+trivy | 5 | Dockerfiles | Em andamento |
| T-305 | PBI-605 | Doc Cyber consolidado Sprint 3 | 5 | T-304 | Em andamento |
| T-306 | PBI-503 | eas.json + app.json package + build preview | 5 | Expo account | Em andamento |
| T-307 | PBI-505 | Galeria screenshots mobile | 2 | T-306 | Em andamento |
| T-308 | PBI-606 | Alinhar README JWT RS256 | 2 | — | Em andamento |
| T-309 | — | Publicar Boards Azure + convidar professor | 3 | Conta Azure edu | **Manual** |

**Dependências técnicas da sprint:** Oracle FIAP acessível para demos; Expo/EAS para APK; org Azure DevOps criada pelo grupo.

---

## 6. Links e acessos (preencher na entrega Teams)

| Item | Valor |
|------|-------|
| Organização Azure DevOps | `https://dev.azure.com/<ORG>` |
| Projeto | `AutoSight` |
| Boards (Backlog) | `https://dev.azure.com/<ORG>/AutoSight/_backlogs` |
| Sprint atual | `https://dev.azure.com/<ORG>/AutoSight/_sprints` |
| Professor (Basic org + Project Admin) | Convidado — ver checklist SETUP |

Espelho versionado deste plano: este arquivo + CSV de importação.
