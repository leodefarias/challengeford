# Roadmap de Sprints — AutoSight

---

## Visão Geral do Projeto

| Sprint | Foco | Status |
|---|---|---|
| Sprint 1 | Fundação: arquitetura, banco, autenticação, extração básica | Concluído |
| Sprint 2 | Features: comparação, ranking, RAG Q&A, mobile 10 telas | Concluído |
| **Sprint 3** | **Testing, Compliance & Quality Assurance** | **Atual** |
| **Sprint 4** | **Entrega Final: pitch, vídeo, arquitetura TOGAF, deploy estável** | **Próximo** |

---

## Sprint 3 — Testing, Compliance & Quality Assurance

**Objetivo:** Garantir que a solução é correta, segura e documentada o suficiente para avaliação e uso pelo parceiro Ford Brasil.

**Duração:** 2 semanas

### Entregas Sprint 3

| # | Entrega | Descrição Detalhada | Critério de Aceite | Responsável |
|---|---|---|---|---|
| 3.1 | **Testes Unitários Java** | JUnit 5 + Mockito cobrindo: `AuthService`, `CatalogoService`, `ChatService`, `JwtUtil`, `InputSanitizer`, `EncryptionService` | Cobertura ≥ 80% (JaCoCo) nos packages `service` e `security` | Backend |
| 3.2 | **Testes de Integração Java** | Testes de controllers com MockMvc: fluxo login → JWT → endpoint protegido. Testar 401/403/200 | Todos os endpoints com teste de autorização | Backend |
| 3.3 | **Testes Python (pytest)** | `pytest` cobrindo: agente ReAct (mock LLM), validação Pydantic (valores inválidos rejeitados), normalizer | Cobertura ≥ 75% (pytest-cov); todos ranges hardcoded testados | IA/ML |
| 3.4 | **Validação de Acurácia de Extração** | Extração dos 6 veículos → comparação manual de amostra 20% dos atributos vs. PDFs originais | ≥ 90% dos atributos amostrados corretos | QA |
| 3.5 | **Auditoria de Segurança OWASP** | Verificação manual das vulnerabilidades: SQL Injection (InputSanitizer), XSS (sanitização), JWT (expiração, assinatura), Rate Limiting (100 req/min), RBAC (endpoints sem autenticação), senhas (BCrypt) | Zero vulnerabilidades críticas; relatório de auditoria | Security |
| 3.6 | **Testes Mobile (React Native)** | Jest + React Testing Library cobrindo: login flow, navegação entre telas, renderização de dados `null` | Telas principais cobertas; nenhum crash em atributo `null` | Mobile |
| 3.7 | **Documentação TOGAF/Archi** | Criação do arquivo `.archimate` na ferramenta Archi com as 4 visões: Architecture Vision, Business, Application, Technology | Arquivo `.archimate` exportável e abrível no Archi | Arquitetura |
| 3.8 | **Monitoramento de Produção** | Validar: Actuator `/actuator/health` retornando status correto; Python `/health` retornando status ChromaDB; tela "Status do Agente" exibindo dados reais | Health checks passam em cold start; tela exibe status correto | DevOps |
| 3.9 | **Relatório de Qualidade** | Documento consolidando: % cobertura testes, acurácia de extração medida, vulnerabilidades resolvidas, métricas de performance | Documento em `pitch-entrega/` com evidências | Todos |
| 3.10 | **Testes de Performance** | Medir latência P95 dos endpoints críticos com carga simulada (10 usuários simultâneos): `/comparar`, `/ranking`, `/chat` | P95 < 2s para `/comparar` e `/ranking`; < 10s para `/chat` novo | Backend |

### Critérios de Conclusão da Sprint 3

- [ ] Cobertura de testes Java ≥ 80%
- [ ] Cobertura de testes Python ≥ 75%
- [ ] Zero vulnerabilidades críticas OWASP Top 10
- [ ] Acurácia extração ≥ 90% (amostra validada manualmente)
- [ ] Arquivo `.archimate` criado com 4 visões
- [ ] Relatório de qualidade escrito com evidências numéricas
- [ ] Latência P95 endpoints críticos < 2 segundos

---

## Sprint 4 — Entrega Final

**Objetivo:** Finalizar o produto para apresentação ao parceiro Ford Brasil e à banca FIAP. Produzir todos os artefatos de entrega: slides, vídeo, arquivo Archi, e deploy estável.

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

> Itens fora do escopo do POC mas relevantes para contrato com Ford Brasil.

| Prioridade | Feature | Valor |
|---|---|---|
| Alta | Expansão para 20+ modelos (SUVs, sedãs, elétricos) | Cobertura maior do portfólio Ford |
| Alta | Agendamento automático de re-extração (quando catálogo muda) | Detecção de mudanças sem intervenção |
| Média | Integração com sistemas internos Ford (SAP, CRM) | Embeddear inteligência no fluxo existente |
| Média | Alertas por email/notificação push quando concorrente lança novo modelo | Proatividade para time de estratégia |
| Média | Dashboard web (além do mobile) | Acesso em desktop para apresentações |
| Baixa | Expansão para outros países (Argentina, México, Chile) | Plataforma pan-americana |
| Baixa | Análise de sentimento de reviews (YouTube, blogs) | Percepção do consumidor além dos specs |

---

## Resumo de Artefatos por Sprint

| Artefato | Sprint 3 | Sprint 4 |
|---|---|---|
| Relatório de testes (cobertura) | ✅ Produzir | — |
| Relatório de auditoria de segurança | ✅ Produzir | — |
| Validação de acurácia (amostra) | ✅ Produzir | — |
| Arquivo `.archimate` | ✅ Criar (rascunho) | ✅ Finalizar |
| Pitch (slides) | — | ✅ Produzir |
| Vídeo de pitch | — | ✅ Gravar |
| Business Canvas (visual) | — | ✅ Produzir |
| Quadro de Valor (visual) | — | ✅ Produzir |
| Relatório de métricas final | — | ✅ Produzir |
| Deploy estável (Docker) | ✅ Testar | ✅ Finalizar |
| README final | Atualizar parcialmente | ✅ Finalizar |
