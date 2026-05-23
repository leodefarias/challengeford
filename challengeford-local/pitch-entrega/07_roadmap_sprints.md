# Roadmap de Sprints — AutoSight

---

## Visão Geral do Projeto

| Sprint | Foco | Status |
|---|---|---|
| Sprint 1 | Fundação: arquitetura, banco, autenticação, extração básica | Concluído |
| Sprint 2 | Features: comparação, ranking, RAG Q&A, mobile 10 telas | Concluído |
| **Sprint 3** | **Testing, Compliance & Quality Assurance** | **Concluído (segurança e infra) / Em finalização (testes e docs)** |
| **Sprint 4** | **Entrega Final: pitch, vídeo, arquitetura TOGAF, deploy estável** | **Atual** |

---

## Sprint 3 — Testing, Compliance & Quality Assurance

**Objetivo:** Garantir que a solução é correta, segura e documentada o suficiente para avaliação e uso pelo parceiro Ford Brasil.

**Duração:** 2 semanas

### Entregas Sprint 3

| # | Entrega | Descrição Detalhada | Critério de Aceite | Responsável | Status |
|---|---|---|---|---|---|
| 3.1 | **Testes Unitários Java** | JUnit 5 + Mockito cobrindo: `AuthService`, `CatalogoService`, `ChatService`, `JwtUtil`, `InputSanitizer`, `EncryptionService` | Cobertura ≥ 80% (JaCoCo) nos packages `service` e `security` | Backend | Em finalização |
| 3.2 | **Testes de Integração Java** | Testes de controllers com MockMvc: fluxo login → JWT → endpoint protegido. Testar 401/403/200 | Todos os endpoints com teste de autorização | Backend | Em finalização |
| 3.3 | **Testes Python (pytest)** | `pytest` cobrindo: agente ReAct (mock LLM), validação Pydantic (valores inválidos rejeitados), normalizer | Cobertura ≥ 75% (pytest-cov); todos ranges hardcoded testados | IA/ML | Em finalização |
| 3.4 | **Validação de Acurácia de Extração** | Extração dos 6 veículos → comparação manual de amostra 20% dos atributos vs. PDFs originais | ≥ 90% dos atributos amostrados corretos | QA | Em finalização |
| 3.5 | **Auditoria de Segurança OWASP** | SQL Injection (`InputSanitizer.java`), XSS (sanitização), JWT (expiração 8h, assinatura HMAC-SHA256), Rate Limiting (100 req/min Java; slowapi Python), RBAC (3 roles), BCrypt, AES-256, headers HTTP, `X-Internal-Token` | Zero vulnerabilidades críticas; relatório de auditoria | Security | **Concluído** |
| 3.6 | **Testes Mobile (React Native)** | Jest + React Testing Library cobrindo: login flow, navegação entre telas, renderização de dados `null` | Telas principais cobertas; nenhum crash em atributo `null` | Mobile | Em finalização |
| 3.7 | **Documentação TOGAF/Archi** | Criação do arquivo `.archimate` na ferramenta Archi com as 4 visões: Architecture Vision, Business, Application, Technology | Arquivo `.archimate` exportável e abrível no Archi | Arquitetura | Em finalização |
| 3.8 | **Monitoramento de Produção** | Actuator `/actuator/health` + Python `/health` + tela "Status do Agente" exibindo dados reais | Health checks passam em cold start; tela exibe status correto | DevOps | **Concluído** |
| 3.9 | **Relatório de Qualidade** | Documento consolidando: % cobertura testes, acurácia de extração medida, vulnerabilidades resolvidas, métricas de performance | Documento em `pitch-entrega/` com evidências | Todos | Em finalização |
| 3.10 | **Testes de Performance** | Medir latência P95 dos endpoints críticos: `/comparar`, `/ranking`, `/chat` | P95 < 2s para `/comparar` e `/ranking`; < 10s para `/chat` novo | Backend | Em finalização |

**Entregas de segurança e infraestrutura concluídas na Sprint 3:**

| Item Implementado | Evidência no Código |
|---|---|
| JWT + RBAC (admin/analista/viewer) | `SecurityConfig.java` + `JwtUtil.java` |
| Rate Limiting 100 req/min por IP | `RateLimitFilter.java` |
| Input Sanitization (SQL Injection, XSS) | `InputSanitizer.java` |
| Criptografia AES-256 de dados sensíveis | `EncryptedStringConverter.java` |
| BCrypt para senhas de usuários | `UsuarioEntity.java` + `DataInitializer.java` |
| Audit Log de segurança (`EVENTOS_SEGURANCA`) | `logback-spring.xml` + tela "Eventos de Segurança" |
| Headers de segurança HTTP | `main.py` middleware + `nginx.conf` |
| Autenticação serviço-a-serviço (`X-Internal-Token`) | `main.py` middleware com `hmac.compare_digest` |
| Docker Compose estável (`./start.sh`) | `docker-compose.yml` + `start.sh` |
| 10 telas mobile implementadas | `mobile/src/screens/` (10 arquivos) |
| 6 veículos seeded e disponíveis | `microsservico-ia/data/seed/` + startup seed |

### Critérios de Conclusão da Sprint 3

- [ ] Cobertura de testes Java ≥ 80% — em finalização
- [ ] Cobertura de testes Python ≥ 75% — em finalização
- [x] Zero vulnerabilidades críticas OWASP Top 10 — **auditoria concluída**
- [x] JWT + RBAC + Rate Limiting + AES-256 + BCrypt + Audit Log — **implementados**
- [x] Docker Compose estável com 6 veículos e health checks — **funcional**
- [x] 10 telas mobile implementadas — **entregues**
- [ ] Acurácia extração ≥ 90% (amostra validada manualmente) — em finalização
- [ ] Arquivo `.archimate` criado com 4 visões — em finalização
- [ ] Relatório de qualidade escrito com evidências numéricas — em finalização
- [ ] Latência P95 endpoints críticos < 2 segundos — em medição

---

## Sprint 4 — Entrega Final (Sprint Atual)

**Objetivo:** Finalizar o produto para apresentação ao parceiro Ford Brasil e à banca FIAP. Produzir todos os artefatos de entrega: slides, vídeo, arquivo Archi, e deploy estável. A solução técnica está completa — esta sprint é de documentação, comunicação e validação final.

**Duração:** 2 semanas

### Entregas Sprint 4

| # | Entrega | Descrição Detalhada | Critério de Aceite | Responsável |
|---|---|---|---|---|
| 4.1 | **Pitch Final (10–15 slides)** | Apresentação PowerPoint/Canva com: Slide 1 (nome, RMs, link vídeo), Pitch do projeto, Business Canvas, Quadro de Valor, Arquitetura TOGAF | Slides 1–15; nome e RM no slide 1; link vídeo no slide 1; organização e clareza | Todos |
| 4.2 | **Vídeo de Pitch (≤ 3 min)** | Demonstração ao vivo da solução: login → extração → comparativo → chat RAG → score. Todos os integrantes participam | Vídeo ≤ 3 min; todos os membros aparecem; demo funcional ao vivo | Todos |
| 4.3 | **Arquivo Archi (.archimate)** | Refinamento do arquivo criado na Sprint 3: ajustes finais nas 4 visões; exportar como `.archimate` | Arquivo abre no Archi sem erros; 4 views completas | Arquitetura |
| 4.4 | **Deploy Estável do POC** | Docker Compose funcional com 6 veículos extraídos e ≥ 85% cobertura média. Script `./start.sh` funcional | `docker compose up` sobe tudo em < 60s; health checks verdes; 6 modelos disponíveis | DevOps |
| 4.5 | **Cobertura dos 6 Catálogos** | Todos os 6 veículos com `cobertura_pct ≥ 85%`: Ford Ranger Raptor, Toyota Hilux GR-S, VW Amarok V6 Extreme, Chevrolet S10 High Country, Mitsubishi Nova-Triton HPE-S, Nissan Frontier PRO-4X | Query: `SELECT MIN(cobertura_pct) FROM CATALOGOS` ≥ 85 | IA/ML |
| 4.6 | **Documentação Final** | README.md atualizado com setup completo, arquitetura, endpoints, variáveis de ambiente | README com: quick start, arquitetura, API reference | Todos |
| 4.7 | **Relatório de Métricas Final** | Evidências de atingimento de metas: acurácia, latência, uptime, cobertura de testes, segurança | Documento com prints/logs comprovando cada meta atingida | QA |
| 4.8 | **Submissão no Teams** | Enviar junto: apresentação (PPT/PDF), link do vídeo, arquivo `.archimate` | Enviado até deadline via Teams | Todos |
| 4.9 | **Business Canvas Visual** | Exportar o Canvas de uma ferramenta (Canvanizer/Miro/Canva) como imagem para incluir no slide | Imagem legível inserida no slide do Canvas | Produto |
| 4.10 | **Quadro de Valor Visual** | Tabela do Quadro de Valor formatada como slide ou imagem visual | Tabela clara com stakeholders, benefícios, métricas, prioridades | Produto |

### Critérios de Conclusão da Sprint 4

- [ ] Apresentação de 10–15 slides com nome/RM no slide 1 e link do vídeo
- [ ] Vídeo de até 3 min com todos os membros da equipe
- [ ] Arquivo `.archimate` com 4 visões TOGAF
- [ ] Docker Compose funcional com 6 veículos e cobertura ≥ 85%
- [ ] Todos os arquivos submetidos juntos no Teams antes do deadline
- [ ] Todos os integrantes participaram do vídeo

---

## Backlog Pós-FIAP (Visão de Produto)

> Itens fora do escopo do POC mas relevantes para contrato com Ford Brasil. O POC entrega a fundação técnica — estas features são incrementos sobre uma plataforma já funcional.

| Prioridade | Feature | Valor | Esforço Estimado |
|---|---|---|---|
| Alta | Expansão para 20+ modelos (SUVs, sedãs, elétricos) | Cobertura maior do portfólio Ford | Baixo — pipeline já genérico |
| Alta | Agendamento automático de re-extração (quando catálogo muda) | Detecção de mudanças sem intervenção | Médio — cron + detector de diff |
| Média | Integração com sistemas internos Ford (SAP, CRM) | Embeddear inteligência no fluxo existente | Alto — depende de APIs Ford |
| Média | Alertas por email/notificação push quando concorrente lança novo modelo | Proatividade para time de estratégia | Baixo — webhook + push notification |
| Média | Dashboard web (além do mobile) | Acesso em desktop para apresentações | Médio — React Web reaproveitando a API |
| Baixa | Expansão para outros países (Argentina, México, Chile) | Plataforma pan-americana | Médio — adaptar fontes e validações locais |
| Baixa | Análise de sentimento de reviews de vídeo (YouTube + Whisper ASR) | Percepção do consumidor além dos specs | Alto — novo módulo ASR + pipeline de áudio |
| Baixa | Análise de sentimento de reviews em blogs e fóruns | Voz do consumidor BR | Médio — extensão do agente de scraping |

---

## Resumo de Artefatos por Sprint

| Artefato | Sprint 3 | Sprint 4 | Status |
|---|---|---|---|
| Segurança OWASP + JWT + RBAC + AES-256 + Rate Limiting | ✅ Entregue | — | **Concluído** |
| Docker Compose estável + `./start.sh` | ✅ Entregue | ✅ Validar | **Concluído** |
| 10 telas mobile | ✅ Entregue | — | **Concluído** |
| 6 veículos seeded | ✅ Entregue | — | **Concluído** |
| Relatório de testes (cobertura) | ✅ Produzir | — | Em finalização |
| Relatório de auditoria de segurança | ✅ Produzir | — | Em finalização |
| Validação de acurácia (amostra 20%) | ✅ Produzir | — | Em finalização |
| Arquivo `.archimate` (4 visões TOGAF) | ✅ Criar (rascunho) | ✅ Finalizar | Em finalização |
| Pitch (10–15 slides) | — | ✅ Produzir | Sprint 4 |
| Vídeo de pitch (≤ 3 min, todos os membros) | — | ✅ Gravar | Sprint 4 |
| Business Canvas (visual exportado) | — | ✅ Produzir | Sprint 4 |
| Quadro de Valor (visual formatado) | — | ✅ Produzir | Sprint 4 |
| Relatório de métricas final (com evidências) | — | ✅ Produzir | Sprint 4 |
| README final com quick start e referências | Parcial | ✅ Finalizar | Sprint 4 |
