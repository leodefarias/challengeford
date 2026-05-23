# Quadro de Valor — AutoSight

> Este quadro mapeia os stakeholders do projeto, suas expectativas, o que a solução entrega,
> as métricas de avaliação e a prioridade de cada benefício.

---

## Quadro de Valor — Matriz Completa

| # | Stakeholder | O que Espera | O que a Solução Entrega | Métrica de Negócio | Meta Negócio | Métrica de Qualidade | Meta Qualidade | Prioridade |
|---|---|---|---|---|---|---|---|---|
| 1 | **Time de Produto Ford** | Análise competitiva ágil de specs técnicas | Dashboard comparativo: 6 veículos, 50+ atributos, gaps, scores — **implementado** | Redução de tempo de análise (h/ciclo) | 80h → < 4h (redução de 95%) | Latência API P95 | < 2 segundos | **Alta** |
| 2 | **Time de Marketing Ford** | Dados para posicionamento de campanha | Rankings por perfil comprador (4 perfis) + análise de gaps vs. Ranger Raptor — **implementado** | Insights acionáveis por semana | ≥ 2 insights/semana | Disponibilidade do serviço | ≥ 99% uptime | **Alta** |
| 3 | **Time de Estratégia Ford** | Visão de mercado em tempo real | Timeline de atualizações de catálogos + alertas de mudança — **implementado** | Tempo de detecção de mudança concorrente | < 24 horas | Acurácia de extração | ≥ 90% vs. PDF | **Alta** |
| 4 | **Vendas / Concessionárias** | Argumentos técnicos precisos e atualizados | Chat RAG Adaptativo em PT-BR sobre catálogos — **implementado** | Redução de tempo de treinamento técnico de vendas | Redução de 50% (40h → 20h) | Confiança de respostas RAG | ≥ 0.85/1.0 | **Média** |
| 5 | **TI Ford** | Integração com sistemas internos | REST API + Swagger UI + JWT + RBAC + Docker Compose — **implementado** | Tempo para integrar ao ecossistema Ford | < 1 sprint (2 semanas) | Cobertura de testes automatizados | ≥ 80% | **Média** |
| 6 | **Compliance / Jurídico** | Rastreabilidade e auditabilidade de dados | `fonte_primaria` + `confianca` por atributo + `EVENTOS_SEGURANCA` + RBAC — **implementado** | % de atributos com fonte rastreável | 100% | Completude do audit log | 100% eventos registrados | **Média** |
| 7 | **Gestão / Diretoria Ford** | ROI e redução de custo operacional | Economia de 76h/mês analista + custo de ~R$ 0,50/extração vs. R$ 8.000/ciclo manual — **mensurável** | Redução de custo operacional anual | ≥ R$ 40.000/ano | Custo por extração de catálogo | < R$ 0,50/extração | **Baixa** |
| 8 | **Equipe AutoSight (FIAP)** | Entregável completo dentro do prazo | Código funcional, segurança OWASP, Docker estável, 10 telas, 6 veículos, pitch + vídeo | Cumprimento do roadmap de sprints | 100% entregas Sprint 3 + 4 | Zero vulnerabilidades críticas OWASP Top 10 | Auditoria concluída — 0 críticos | **Alta** |

---

## Detalhamento por Stakeholder

---

### Stakeholder 1 — Time de Produto Ford

**Papel:** Gerentes de linha de produto (Ranger, Ranger Raptor)

**Expectativas:**
- Saber exatamente como o Ranger Raptor se compara aos concorrentes em cada atributo técnico
- Identificar lacunas que precisam ser endereçadas no próximo ciclo de produto
- Tomar decisões de especificação baseadas em dados, não em intuição

**O que a solução entrega (implementado):**
- Tela "Comparativo": até 6 veículos lado a lado com vencedor destacado por atributo — `endpoint POST /api/catalogos/comparar`
- Tela "Gaps": análise de lacunas de capability vs. líderes de segmento — `CAPABILITY_SCORES` Oracle
- Tela "Score": radar de pontuação ponderada por categoria (motorização, off-road, ADAS, conectividade, valor)
- 50+ atributos extraídos automaticamente, cada um com `confianca` (0–1) e `fonte_primaria` rastreável
- Pipeline de extração: agente ReAct com hierarquia de 5 fontes, executa em < 5 minutos por veículo

**Métricas:**

| Tipo | Indicador | Meta | Como Medir |
|---|---|---|---|
| **Negócio** | Horas/ciclo para análise competitiva completa | 80h → < 4h (–95%) | Timestamp Oracle: `data_extracao` início → relatório disponível no app |
| **Qualidade** | Latência P95 do endpoint `/api/catalogos/comparar` | < 2 segundos | Spring Actuator `/actuator/metrics` |
| **Negócio** | Número de ciclos de análise por mês | 1/mês → 4+/mês (extração on-demand) | Contagem de `data_extracao` distintos no Oracle |
| **Qualidade** | % atributos corretos vs. PDF oficial | ≥ 90% | Validação manual de amostra 20% — Sprint 3 |

**Prioridade: ALTA** — impacto direto em decisões de produto e posicionamento.

---

### Stakeholder 2 — Time de Marketing Ford

**Papel:** Diretores e analistas de marketing automotivo

**Expectativas:**
- Identificar rapidamente os pontos fortes do Ranger Raptor para campanhas
- Entender como concorrentes posicionam seus produtos
- Criar campanhas baseadas em diferenciais técnicos reais

**O que a solução entrega (implementado):**
- Tela "Score": rankings com scoring determinístico ponderado por perfil — família, desempenho, off-road, custo-benefício
- Tela "Gaps": onde o Ranger Raptor lidera e onde perde, por categoria de atributo
- Chat RAG Adaptativo: perguntas ad-hoc em PT-BR ("Qual pickup tem melhor sistema de som?") com classificação automática de tipo de consulta
- Tela "Timeline": histórico de atualizações de catálogos com `data_extracao` por veículo

**Métricas:**

| Tipo | Indicador | Meta | Como Medir |
|---|---|---|---|
| **Negócio** | Insights acionáveis por semana | ≥ 2 insights | Contagem de consultas únicas ao dashboard |
| **Qualidade** | Disponibilidade do serviço | ≥ 99% | Docker health check + `/actuator/health` |
| **Negócio** | Tempo para identificar mudança de concorrente | < 24h | Timeline: data_extracao vs. data publicação fabricante |
| **Qualidade** | Acurácia da extração (menos erros de posicionamento) | ≥ 90% | Validação amostral vs. PDF oficial |

**Prioridade: ALTA** — ciclos de campanha de marketing dependem de dados atualizados.

---

### Stakeholder 3 — Time de Estratégia Ford

**Papel:** Planejamento estratégico de longo prazo, roadmap de 3–5 anos

**Expectativas:**
- Visão consolidada do mercado de pickups premium no Brasil
- Identificar tendências: quais tecnologias (ADAS, eletrificação, conectividade) estão avançando nos concorrentes
- Embasar decisões de investimento em R&D com dados de mercado

**O que a solução entrega (implementado):**
- Tela "Timeline": histórico de todas as atualizações de catálogos com `data_extracao` por veículo
- Comparativo de tendências de atributos ao longo do tempo (baseado em registros históricos do Oracle)
- Score técnico agregado por marca/modelo para cada perfil de ranking — persistido em `SCORE_COMPETITIVO`

**Métricas:**

| Tipo | Indicador | Meta | Como Medir |
|---|---|---|---|
| **Negócio** | Tempo de detecção de atualização concorrente | < 24h após publicação | Comparar `data_extracao` Oracle vs. data publicação fabricante |
| **Qualidade** | Completude do histórico (cobertura temporal) | ≥ 12 meses de histórico ao final Sprint 4 | Registros na tabela `CATALOGOS` com `data_extracao` |
| **Negócio** | Redução de ciclos de pesquisa de mercado | 3–5 dias → < 1 hora | Timestamp de análise |
| **Qualidade** | Confiabilidade dos dados de tendência | `confianca` médio ≥ 0.85 | Query `AVG(confianca)` em `CATALOGO_ATRIBUTOS` |

**Prioridade: ALTA** — estratégia de longo prazo depende de inteligência de mercado confiável.

---

### Stakeholder 4 — Vendas / Concessionárias Ford

**Papel:** Vendedores e gerentes de concessionária

**Expectativas:**
- Ter argumentos técnicos precisos para responder perguntas de clientes
- Comparar Ranger Raptor com concorrentes em tempo real durante atendimento
- Reduzir tempo de treinamento sobre specs técnicas

**O que a solução entrega (implementado):**
- Chat RAG Adaptativo em PT-BR: "Por que o Ranger Raptor é melhor que o Amarok no off-road?" — classificação automática de pergunta para contexto mais relevante
- Tela "Comparativo" acessível no celular iOS/Android — interface mobile-first
- Respostas baseadas exclusivamente em dados extraídos dos catálogos, com fonte citável (credibilidade na venda)
- Cache de respostas recorrentes com TTL 30 dias — pergunta repetida respondida em < 1 segundo

**Métricas:**

| Tipo | Indicador | Meta | Como Medir |
|---|---|---|---|
| **Negócio** | Redução de tempo de treinamento técnico | 40h onboarding → 20h (-50%) | Comparação de tempo de treinamento antes/depois |
| **Qualidade** | Confiança das respostas do chat RAG | ≥ 0.85/1.0 | Campo de confiança na resposta do endpoint `/api/chat` |
| **Negócio** | Satisfação com precisão dos argumentos técnicos | NPS ≥ 7/10 | Survey com vendedores pós-piloto |
| **Qualidade** | Latência do chat (tempo de resposta) | < 3 segundos (cache) / < 10s (novo) | Actuator + CHAT_CACHE hit/miss |

**Prioridade: MÉDIA** — benefício real mas fora do escopo direto do POC.

---

### Stakeholder 5 — TI Ford

**Papel:** Times de tecnologia que integrarão a plataforma

**Expectativas:**
- API bem documentada e segura
- Facilidade de integração com sistemas legados
- Código mantível e com testes

**O que a solução entrega (implementado):**
- REST API documentada com Swagger UI / OpenAPI 3 em `/swagger-ui.html`
- Autenticação JWT padrão Bearer token + RBAC (admin/analista/viewer) implementados no Spring Security
- Docker Compose com `./start.sh` — setup completo em < 15 minutos em qualquer máquina com Docker
- Flyway migrations V1–V4 para versionamento de banco Oracle (8 tabelas)
- Nginx com TLS 1.2/1.3, HSTS e CSP — API exposta via HTTPS por padrão
- Segurança: AES-256 para dados sensíveis, BCrypt para senhas, `X-Internal-Token` entre serviços

**Métricas:**

| Tipo | Indicador | Meta | Como Medir |
|---|---|---|---|
| **Negócio** | Tempo para integrar ao ecossistema Ford | < 1 sprint (2 semanas) | Estimativa de esforço de integração |
| **Qualidade** | Cobertura de testes automatizados | ≥ 80% | JaCoCo (Java) + pytest-cov (Python) |
| **Negócio** | Redução de vulnerabilidades de segurança | Zero críticos OWASP Top 10 | Relatório de auditoria Sprint 3 |
| **Qualidade** | Documentação de API (endpoints cobertos) | 100% endpoints documentados | Swagger UI coverage |

**Prioridade: MÉDIA** — necessário para operacionalização, mas não bloqueia o valor do POC.

---

### Stakeholder 6 — Compliance / Jurídico Ford

**Papel:** Garantir que dados competitivos sejam usados dentro dos limites legais

**Expectativas:**
- Rastreabilidade de onde cada dado veio
- Garantia de que fontes são públicas e legais
- Proteção de dados estratégicos da Ford

**O que a solução entrega (implementado):**
- `fonte_primaria` por atributo (ex: "PDF oficial Toyota Hilux BR 2025") — rastreabilidade granular
- Tabela `CATALOGO_FONTES_SECUNDARIAS` com URL, status (confirma/diverge/complementa) e confiança
- RBAC implementado no Spring Security: roles admin, analista, viewer — nenhum endpoint acessível sem JWT válido
- Tabela `EVENTOS_SEGURANCA` no Oracle + tela "Eventos de Segurança" no app — auditoria completa de logins, falhas e acessos
- Política "null > inventar": dados apenas de fontes públicas verificáveis; dado incerto retorna `null`, nunca valor fabricado
- Campo `revisado_humano=true` obrigatório antes de qualquer atributo ser publicado externamente

**Métricas:**

| Tipo | Indicador | Meta | Como Medir |
|---|---|---|---|
| **Negócio** | % atributos com fonte rastreável | 100% | `SELECT COUNT(*) WHERE fonte_primaria IS NOT NULL` |
| **Qualidade** | Completude do audit log de acesso | 100% eventos registrados | Tabela de eventos de segurança Oracle |
| **Negócio** | Uso exclusivo de fontes públicas | 100% | Revisão de `CATALOGO_FONTES_SECUNDARIAS` URLs |
| **Qualidade** | Controle de acesso por role (RBAC) | Zero acessos não autorizados | Tela "Eventos de Segurança" + logs JWT |

**Prioridade: MÉDIA** — compliance é requisito não-funcional mandatório.

---

### Stakeholder 7 — Gestão / Diretoria Ford

**Papel:** Aprovação de orçamento e ROI do projeto

**Expectativas:**
- Evidência de redução de custo
- Justificativa do investimento no POC e eventual produção
- Potencial de expansão para outros segmentos/regiões

**O que a solução entrega (mensurável):**
- Redução de custo de trabalho manual: 76h analista/mês → < 4h/mês de supervisão — economiza ≥ R$ 7.600/mês ao custo de R$ 100/hora
- Custo marginal de extração: ~R$ 0,50/ciclo completo (LLM API) vs. ~R$ 8.000/ciclo manual (80h × R$ 100/h)
- Adição de novo modelo ao catálogo: < 30 minutos de extração automática vs. dias de trabalho manual
- Plataforma já containerizada e expansível: adicionar novos fabricantes ou mercados não requer reescrita da arquitetura

**Métricas:**

| Tipo | Indicador | Meta | Como Medir |
|---|---|---|---|
| **Negócio** | Redução custo operacional análise/ano | ≥ R$ 40.000/ano | Horas economizadas × custo hora analista |
| **Qualidade** | Custo por extração de catálogo | < R$ 0.50 | LLM API cost per call × volume |
| **Negócio** | ROI do POC (se convertido em produto) | Positivo em < 6 meses de uso | Custo licença vs. custo manual evitado |
| **Qualidade** | Tempo para adicionar novo modelo | < 30 min | Tempo de extração on-demand |

**Prioridade: BAIXA** — importante para continuidade, mas não é o foco do POC.

---

## Resumo de Prioridades

| Prioridade | Stakeholders | Principais Entregas |
|---|---|---|
| **Alta** | Time Produto, Marketing, Estratégia, AutoSight | Dashboard comparativo, rankings, timeline, acurácia ≥ 90% |
| **Média** | Vendas, TI, Compliance | Chat RAG, REST API, rastreabilidade de fontes |
| **Baixa** | Diretoria | ROI, custo por extração |
