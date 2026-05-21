# Quadro de Valor — AutoSight

> Este quadro mapeia os stakeholders do projeto, suas expectativas, o que a solução entrega,
> as métricas de avaliação e a prioridade de cada benefício.

---

## Quadro de Valor — Matriz Completa

| # | Stakeholder | O que Espera | O que a Solução Entrega | Métrica de Negócio | Meta Negócio | Métrica de Qualidade | Meta Qualidade | Prioridade |
|---|---|---|---|---|---|---|---|---|
| 1 | **Time de Produto Ford** | Análise competitiva ágil de specs técnicas | Dashboard comparativo: 6 veículos, 50+ atributos, gaps, scores | Redução de tempo de análise (h/ciclo) | 80h → < 4h (redução de 95%) | Latência API P95 | < 2 segundos | **Alta** |
| 2 | **Time de Marketing Ford** | Dados para posicionamento de campanha | Rankings por perfil comprador + análise de gaps vs. Ranger Raptor | Insights acionáveis por semana | ≥ 2 insights/semana | Disponibilidade do serviço | ≥ 99% uptime | **Alta** |
| 3 | **Time de Estratégia Ford** | Visão de mercado em tempo real | Timeline de atualizações de catálogos + alertas de mudança | Tempo de detecção de mudança concorrente | < 24 horas | Acurácia de extração | ≥ 90% vs. PDF | **Alta** |
| 4 | **Vendas / Concessionárias** | Argumentos técnicos precisos e atualizados | Chat RAG em português sobre catálogos | Redução de tempo de treinamento técnico de vendas | Redução de 50% (40h → 20h) | Confiança de respostas RAG | ≥ 0.85/1.0 | **Média** |
| 5 | **TI Ford** | Integração com sistemas internos | REST API REST + Swagger UI + JWT + Docker | Tempo para integrar ao ecossistema Ford | < 1 sprint (2 semanas) | Cobertura de testes automatizados | ≥ 80% | **Média** |
| 6 | **Compliance / Jurídico** | Rastreabilidade e auditabilidade de dados | Metadados de fonte por atributo + log de acesso | % de atributos com fonte rastreável | 100% | Completude do audit log | 100% eventos registrados | **Média** |
| 7 | **Gestão / Diretoria Ford** | ROI e redução de custo operacional | Relatório de economia: custo analista vs. custo plataforma | Redução de custo operacional anual | ≥ R$ 40.000/ano | Custo por extração de catálogo | < R$ 0.50/extração | **Baixa** |
| 8 | **Equipe AutoSight (FIAP)** | Entregável completo dentro do prazo | Código funcional, documentação TOGAF, pitch + vídeo | Cumprimento do roadmap de sprints | 100% entregas Sprint 3 + 4 | Cobertura de testes + sem vulnerabilidades críticas | OWASP Top 10 sem críticos | **Alta** |

---

## Detalhamento por Stakeholder

---

### Stakeholder 1 — Time de Produto Ford

**Papel:** Gerentes de linha de produto (Ranger, Ranger Raptor)

**Expectativas:**
- Saber exatamente como o Ranger Raptor se compara aos concorrentes em cada atributo técnico
- Identificar lacunas que precisam ser endereçadas no próximo ciclo de produto
- Tomar decisões de especificação baseadas em dados, não em intuição

**O que a solução entrega:**
- Dashboard "Comparativo" com até 6 veículos lado a lado
- Dashboard "Gaps" com análise de capacidades vs. líderes de segmento
- Dashboard "Score" com radar de pontuação por categoria (motorização, off-road, ADAS, etc.)
- 50+ atributos extraídos automaticamente com rastreabilidade de fonte

**Métricas:**

| Tipo | Indicador | Meta | Como Medir |
|---|---|---|---|
| **Negócio** | Horas/ciclo para análise competitiva completa | 80h → < 4h (-95%) | Timestamp Oracle: início extração → relatório disponível |
| **Qualidade** | Latência P95 do endpoint `/api/catalogos/comparar` | < 2 segundos | Spring Actuator `/actuator/metrics` |
| **Negócio** | Número de ciclos de análise por mês | 1/mês → 4+/mês | Contagem de comparações Oracle |
| **Qualidade** | % atributos corretos vs. PDF oficial | ≥ 90% | Validação manual de amostra 10% |

**Prioridade: ALTA** — impacto direto em decisões de produto.

---

### Stakeholder 2 — Time de Marketing Ford

**Papel:** Diretores e analistas de marketing automotivo

**Expectativas:**
- Identificar rapidamente os pontos fortes do Ranger Raptor para campanhas
- Entender como concorrentes posicionam seus produtos
- Criar campanhas baseadas em diferenciais técnicos reais

**O que a solução entrega:**
- Rankings por perfil de comprador (família, desempenho, off-road, custo-benefício)
- Análise de gaps: onde o Ranger Raptor lidera e onde perde
- Chat RAG para responder perguntas ad-hoc ("Qual pickup tem melhor sistema de som?")
- Timeline de mudanças — saber quando concorrente lança nova versão

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

**O que a solução entrega:**
- Timeline de todas as atualizações de catálogos (histórico)
- Comparativo de tendências de atributos ao longo do tempo
- Score técnico agregado por marca/modelo

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

**O que a solução entrega:**
- Chat RAG em português: "Por que o Ranger Raptor é melhor que o Amarok no off-road?"
- Dashboard de comparação lado a lado acessível no celular
- Respostas com fontes citadas (credibilidade na venda)

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

**O que a solução entrega:**
- REST API com Swagger UI / OpenAPI 3 em `/swagger-ui.html`
- Autenticação JWT padrão Bearer token
- Docker Compose para deploy reproduzível
- Flyway migrations para versionamento de banco
- Cobertura de testes ≥ 80%

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

**O que a solução entrega:**
- Tabela `CATALOGO_FONTES_SECUNDARIAS` com URL de cada fonte
- `fonte_primaria` por atributo (ex: "PDF oficial Toyota Hilux BR 2025")
- RBAC com roles (admin, analista, viewer) — nenhum acesso sem autenticação
- Audit log de todos os eventos de segurança (tela "Eventos de Segurança")
- Dados apenas de fontes públicas (catálogos oficiais, FIPE, sites públicos)

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

**O que a solução entrega:**
- Redução mensurável de custo: 76h analista/mês → 4h/mês
- Custo marginal de extração: ~R$ 0.50 vs. ~R$ 400 (custo hora analista sênior × 80h)
- Plataforma expansível: novos modelos em horas, não semanas

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
