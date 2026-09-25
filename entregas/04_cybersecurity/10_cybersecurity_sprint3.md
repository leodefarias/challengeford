# Cybersecurity Sprint 3 — AutoSight (Ford Challenge)

Documento único consolidado (4 subetapas). Segurança integrada ao ciclo commit → test → build → deploy do POC AutoSight.

**Mapeamento de perfis (rubrica → projeto):**

| Rubrica | Role implementado | Uso |
|---------|-------------------|-----|
| Administrador | `admin` | Usuários, Swagger, termos |
| Gestor | `analista` | Extração, ranking, chat |
| Brigadista / operador de campo | `viewer` | Consulta / comparativo (leitura) |

IoT/MQTT **não aplicável** neste desafio (catálogo competitivo via HTTPS REST, sem telemetria de dispositivos).

---

## 1. Pipeline DevSecOps Integrado (peso 3,0)

### 1.1 Diagrama do pipeline

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│ Commit  │───▶│ Secret   │───▶│  SCA    │───▶│  SAST    │───▶│Container│
│  push   │    │ Scanning │    │Dependabot│   │ Semgrep  │    │  Trivy  │
└─────────┘    │ Gitleaks │    │ npm/mvn │    │ + tests  │    │ images  │
               └──────────┘    └─────────┘    └──────────┘    └────┬────┘
                                                                   │
                                                                   ▼
                                                            ┌────────────┐
                                                            │ Deploy POC │
                                                            │ docker compose│
                                                            └────────────┘
```

Implementação: workflow na **raiz do monorepo** [`.github/workflows/devsecops.yml`](../../.github/workflows/devsecops.yml) + [`.github/dependabot.yml`](../../.github/dependabot.yml) (paths `challengeford-local/*`). Espelho legado em `challengeford-local/.github/` (não usado pelo GitHub Actions do remote root).

### 1.2 Etapas e redução de risco

| Etapa | Ferramenta | Risco que reduz | Como roda no Ford |
|-------|------------|-----------------|-------------------|
| **Secret Scanning** | Gitleaks | Credenciais Oracle/LLM no Git (STRIDE Information Disclosure) | Job `secrets` em todo push/PR; falha se achar key |
| **SCA** | Dependabot + OWASP Dependency-Check (Maven) + `audit-ci --high` (npm) | CVEs em libs (Log4Shell-class) | Gate npm falha em HIGH/CRITICAL (exceção documentada em `mobile/audit-ci.jsonc`); Dependency-Check publica relatório HTML; Dependabot abre PRs semanais Java/npm/pip/Actions |
| **SAST** | Semgrep (p/owasp-top-ten, `--error`) | Injection XSS path traversal no código próprio | Scan `backend-java` + `mobile` + `microsservico-ia`; falha o job se houver finding |
| **Testes** | `mvn test` | Regressão auth (401/403) | Job `tests` (Unit + MockMvc) |
| **Container Security** | Trivy fs + config | Dependências com CVE crítico / misconfig Dockerfile | Falha em CRITICAL; HIGH como relatório |

### 1.3 Execução no projeto Ford

1. Desenvolvedor faz push na branch.
2. GitHub Actions dispara workflow DevSecOps.
3. Achados críticos bloqueiam merge (policy do time).
4. Deploy local/demo: `./start.sh` / `start.bat` sobe stack com TLS nginx.
5. Segredos **nunca** no código: `.env` (gitignored em fluxo normal) + `RSA_PRIVATE_KEY` / `RSA_PUBLIC_KEY` / `ENCRYPTION_KEY` / `INTERNAL_API_KEY`.

---

## 2. Segurança em Código e Infraestrutura (peso 2,5)

### 2.1 Evidências no código

| Controle | Evidência | Arquivo |
|----------|-----------|---------|
| Criptografia em repouso AES-256 | Campos sensíveis via converter | `EncryptionService.java`, `EncryptedStringConverter.java` |
| Senhas BCrypt custo 12 | `PasswordEncoder` bean | `SecurityConfig.java` |
| JWT RS256 + iss/aud + TTL 8h | Assinatura assimétrica | `JwtUtil.java` |
| Filtro Bearer + brute-force token | 401 JSON | `JwtFilter.java` |
| Rate limit por IP | 100 req/min (e limites login) | `RateLimitFilter.java` |
| Validação / sanitização | SQL/XSS | `InputSanitizer.java` + Bean Validation DTOs |
| RBAC method security | `@PreAuthorize` | `CatalogoController`, `AdminController`, `AuthController` |
| TLS 1.2/1.3 + HSTS + CSP | Terminação HTTPS | `nginx/conf/nginx.conf` |
| Service-to-service token | `X-Internal-Token` timing-safe | `microsservico-ia/src/api/main.py` |
| Honeypot decoys | Paths falsos permitAll | `HoneypotController.java` |
| LGPD soft-delete / anonimização | Flyway + API | `V5__lgpd_soft_delete.sql`, `DELETE /api/auth/me` |
| Idempotência | Header Idempotency-Key | `IdempotencyFilter.java` |
| TraceId | Correlação de logs | `TraceIdFilter.java` |

### 2.2 IaC / containers

| Artefato | Boas práticas |
|----------|---------------|
| `backend-java/Dockerfile` | Multi-stage build, JRE non-root quando aplicável |
| `microsservico-ia/Dockerfile` | Deps pinadas, healthcheck |
| `docker-compose.yml` | Rede interna, secrets via env, healthchecks |
| `nginx/conf/nginx.conf` | TLS only, headers segurança, sem expor portas internas |

### 2.3 MQTT/IoT

Não faz parte do escopo AutoSight. Canal de dados: **HTTPS + JWT**. Justificativa registrada para avaliadores.

---

## 3. Observabilidade, Monitoramento e Resposta (peso 2,0)

### 3.1 Plano de monitoramento

**Logs estruturados (logback JSON):**
- Login sucesso/falha — `AuthService` (`AUDIT|...`)
- Token inválido / brute-force — `JwtFilter`
- Extrações e operações críticas — `CatalogoService`
- Campo `X-Trace-Id` correlaciona request ponta a ponta

**Métricas / health:**
- Java: `GET /actuator/health`
- Python: `GET /health`
- Docker Compose healthchecks nos serviços
- Mobile: tela **Status do Agente** (`StatusAgentScreen.tsx`) — dados reais da API

**Dashboards (equivalente POC):**
- Curto prazo: Actuator + `docker logs ford-java-api` / `ford-python-ia`
- Evolução: Prometheus + Grafana (métricas Actuator Micrometer) — roadmap pós-FIAP
- UI audit: `SecurityEventsScreen` (evoluir de mock para stream de logs AUDIT)

**Alertas sugeridos:**
| Sinal | Limiar | Ação |
|-------|--------|------|
| Taxa 401 | > 50/min por IP | Ban / rate limit mais agressivo |
| Extrair 502 | > 3 consecutivos | Verificar Python/LLM keys |
| Health down | 2 falhas | Restart container + page on-call |

### 3.2 Plano de resposta a incidentes

```
Detecção → Análise → Contenção → Erradicação → Recuperação → Lições
```

| Fase | Ações AutoSight |
|------|-----------------|
| **Detecção** | Log `SECURITY_ALERT`, health vermelho, Dependabot/Semgrep finding |
| **Análise** | TraceId + logs JSON; classificar (credencial, API abuse, dados) |
| **Contenção** | Rotacionar `RSA_*`, `ENCRYPTION_KEY`, `INTERNAL_API_KEY`, `OPENAI_API_KEY`; derrubar container comprometido; revogar usuários (`ativo=false`) |
| **Erradicação** | Patch CVE, fechar endpoint, limpar honeypot noise vs ataque real |
| **Recuperação** | Redeploy `docker compose up`; validar health; re-seed se necessário |
| **Lições** | Atualizar este doc + backlog Azure PBI segurança |

**SLA alvo (doc qualidade):** incidentes críticos de segurança — contenção inicial &lt; 4h em horário comercial do POC acadêmico.

### 3.3 Exemplos de log (formato)

```text
AUDIT|LOGIN_OK|email=analista@ford.com.br|role=analista|trace=a1b2c3
[SECURITY] JWT inválido: ... ip=10.0.0.5 failures=3
[SECURITY_ALERT] type=suspicious_token_reuse ip=10.0.0.5 failures=5
```

---

## 4. Compliance, Riscos e Segurança Contínua (peso 2,5)

### 4.1 STRIDE (revisão final)

| Ameaça | Exemplo no AutoSight | Mitigação |
|--------|----------------------|-----------|
| **S**poofing | Token forjado | JWT RS256 + iss/aud + user ativo no DB |
| **T**ampering | Atributo de catálogo alterado em trânsito | TLS nginx; validação server-side |
| **R**epudiation | Negar login/extração | Audit log + TraceId |
| **I**nfo disclosure | `.env` / Swagger público | Swagger só ADMIN; secrets env; honeypot |
| **D**enial of service | Flood login/chat | RateLimitFilter + slowapi |
| **E**levation of privilege | Viewer chama /extrair | `@PreAuthorize` + roles |

### 4.2 Mapeamento normas

#### OWASP ASVS (amostra L1/L2 relevante)

| Controle ASVS | Status |
|---------------|--------|
| V2 Auth (senha hash, sessão stateless JWT) | Atende |
| V3 Session (TTL, logout client-side) | Atende (TTL 8h) |
| V4 Access (RBAC) | Atende |
| V5 Validation | Atende (DTO + sanitizer) |
| V7 Error handling (sem stack em prod) | Atende (`server.error.include-stacktrace: never`) |
| V9 Communications (TLS) | Atende (nginx) |
| V13 API | Atende (OpenAPI + auth) |

#### OWASP API Top 10

| Risco | Mitigação |
|-------|-----------|
| Broken Object Level Auth | IDs via service + auth obrigatória |
| Broken Auth | JWT RS256 + 401 uniforme |
| BOLA/BFLA | Roles method-level |
| Unrestricted resource | Rate limit |
| Security misconfig | Headers CSP/HSTS; Actuator só health |
| SSRF | Python tools com allowlists de fontes |
| Improper inventory | OpenAPI 3 |

#### OWASP Mobile Top 10

| Risco | Mitigação |
|-------|-----------|
| Improper credential usage | Token em SecureStore |
| Insecure communication | HTTPS via nginx / tunnel demo |
| Insecure auth | Sem bypass local de RBAC |
| Insufficient cryptography | TLS + sem segredos hardcoded no app |
| Extraneous functionality | Demo mode explícito `EXPO_PUBLIC_DEMO` |

#### LGPD

| Princípio | Evidência |
|-----------|-----------|
| Minimização | Só e-mail/nome/role de usuário |
| Segurança | AES + BCrypt + TLS |
| Direitos do titular | `DELETE /api/auth/me` anonimização |
| Retenção | Soft-delete `deleted_at` (V5) |

### 4.3 Checklist de conformidade (entrega)

- [x] JWT + RBAC + rate limit + AES + BCrypt
- [x] TLS na borda
- [x] Pipeline DevSecOps versionado
- [x] STRIDE documentado
- [x] OWASP API/Mobile/ASVS mapeados
- [x] LGPD anonimização
- [x] Professor no Azure Boards (Basic)
- [x] Prints do workflow Actions verdes (pasta `prints/`, run DevSecOps #2)

### 4.4 Plano de segurança contínua

| Rotina | Frequência | Responsável |
|--------|------------|-------------|
| Revisar PRs Dependabot / CVEs | Semanal | Backend |
| Rodar workflow DevSecOps em main | Todo push | CI |
| Auditoria de roles (admin desnecessários) | Quinzenal | Admin projeto |
| Rotação de chaves RSA/ENCRYPTION/INTERNAL | Mensal ou incidente | Security |
| Backup Oracle / export seed JSON | Semanal | DevOps |
| Revisão access logs AUDIT | Semanal | Security |
| Teste restore `docker compose` cold start | Por release | DevOps |

---

## 5. Como anexar evidências no Teams

1. Print do workflow GitHub Actions (aba Actions).
2. Print `curl -k https://localhost/actuator/health` (ou via nginx).
3. Print login Swagger (admin) + tentativa viewer em /extrair = 403.
4. Link deste arquivo no repositório + PDF export se pedido.
