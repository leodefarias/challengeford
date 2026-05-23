# Business Model Canvas — AutoSight

> Ferramenta recomendada para renderizar: Canvanizer, Strategyzer, Miro, ou Canva (Business Model Canvas template).
> Preencha os blocos abaixo na ferramenta escolhida e exporte como imagem para o slide.

---

## Canvas — 9 Blocos

### 1. Segmentos de Clientes (Customer Segments)

**Segmento Primário — Ford Brasil:**
- Time de Produto: gerentes de linha de produto Ranger/Raptor
- Time de Marketing: criação de campanhas e posicionamento
- Time de Estratégia: planejamento de longo prazo e roadmap de produto
- Time de Vendas: material técnico para concessionárias

**Segmento Secundário (futura expansão):**
- Outros OEMs brasileiros (GM, VW, Toyota, Stellantis)
- Consultorias automotivas
- Distribuidores e importadores

---

### 2. Proposta de Valor (Value Proposition)

| Benefício | Detalhe |
|---|---|
| Velocidade | Ciclo completo em < 4h vs. 80h manuais (redução de 95%) |
| Cobertura | 50+ atributos técnicos por veículo, 6 modelos simultaneamente |
| Confiabilidade | Zero alucinação — `null` em vez de dados inventados |
| Rastreabilidade | Toda dado tem fonte primária e secundária auditável |
| Inteligência | RAG Q&A em português — perguntas em linguagem natural |
| Perfis | Rankings por família, off-road, desempenho, custo-benefício |
| Alerta | Detecção automática de mudanças nos catálogos concorrentes |
| Mobile | Acesso completo via smartphone iOS/Android |

---

### 3. Canais (Channels)

| Canal | Fase | Descrição |
|---|---|---|
| App Mobile (iOS/Android) | Entrega & Relacionamento | Interface principal, 10 telas, dark theme, bottom tabs |
| REST API + Swagger UI | Entrega técnica | Integração com sistemas internos Ford |
| Dashboard "Status do Agente" | Relacionamento | Monitoramento operacional em tempo real |
| Onboarding presencial | Aquisição | Demo ao time Ford + treinamento |
| Documentação técnica | Suporte | README, Swagger UI, OpenAPI 3 |

---

### 4. Relacionamento com Clientes (Customer Relationships)

- **Self-service SaaS:** Time Ford opera autonomamente via app
- **Revisão humana assistida:** Tela "Itens Pendentes" para termos não mapeados
- **Monitoramento ativo:** Tela "Eventos de Segurança" + "Status do Agente"
- **Suporte reativo:** Documentação técnica completa + equipe FIAP durante POC

---

### 5. Fontes de Receita / Redução de Custo (Revenue Streams)

| Fonte | Valor Estimado |
|---|---|
| Redução custo analista (80h → 4h/mês) | R$ 40.000–80.000/ano economizados |
| Melhoria decisão de pricing (1% margem) | R$ 80M+ (escala Ford Brasil) |
| Licença SaaS (pós-POC) | Negociação com Ford Brasil |
| Expansão outros OEMs | Novo contrato por cliente |

---

### 6. Recursos-Chave (Key Resources)

**Humanos:**
- 1 Eng. Backend Java/Spring Boot
- 1 Eng. AI/Python (FastAPI + ChromaDB + LLM)
- 1 Eng. Mobile React Native
- Opcional: 1 Data Engineer (pipeline de dados)

**Tecnológicos:**
- Servidor/Cloud para containers Docker
- Oracle 12c+ (FIAP durante POC, cloud em produção)
- ChromaDB (vector store, persistido em volume)
- Anthropic Claude API key
- Firecrawl API key (scraping SPA)

**Dados:**
- PDFs de catálogos oficiais (Ford, Toyota, VW, GM, Mitsubishi, Nissan)
- Sites oficiais dos fabricantes
- FIPE API (preços de referência Brasil)
- iCarros.com.br (fonte universal BR)

**Intelectuais:**
- Pipeline de extração multi-fonte proprietário
- Base de conhecimento ChromaDB com embeddings pré-treinados
- Lógica de validação pós-LLM (Pydantic schema + ranges hardcoded)

---

### 7. Atividades-Chave (Key Activities)

**Pipeline de Extração (já implementado):**
- Agente ReAct multi-ferramenta dispara hierarquia de 5 fontes: PDF oficial → Playwright headless → Firecrawl (SPA) → iCarros → FIPE API
- Validação pós-LLM com Pydantic v2: rejeita valores fora dos ranges hardcoded; retorna `null` em vez de dado inventado
- Idempotência garantida: cabeçalho `X-Idempotency-Key` evita duplicatas de extração
- RAG Adaptativo: classifica pergunta (factual/comparação/recomendação) e usa estratégia de contexto adequada

**Durante Desenvolvimento (conclusão):**
- Finalização de cobertura de testes JUnit 5 (Java) e pytest (Python)
- Validação de acurácia de extração vs. PDFs originais (amostra 20% dos atributos)
- Documentação TOGAF/Archi com 4 visões arquiteturais

**Em Operação (pós-POC):**
- Monitoramento de disponibilidade de fontes (sites/PDFs) — tela "Status do Agente" no app
- Atualização de scrapers quando layouts de fabricantes mudam
- Revisão de termos pendentes e mapeamento de terminologia — tela "Itens Pendentes"
- Atualização de catálogos ao lançar novos modelos/versões (extração on-demand < 30 min por modelo)
- Gestão de custos LLM: `CHAT_CACHE` (TTL 30 dias) reduz chamadas recorrentes; idempotência evita reprocessamento

---

### 8. Parceiros-Chave (Key Partners)

| Parceiro | Papel | Custo |
|---|---|---|
| **OpenAI** | LLM principal em produção (GPT-4.1-mini) — chat, ranking, justificativas | ~US$ 0,08/extração |
| **Anthropic** | LLM alternativo (Claude) — configurável via `LLM_PROVIDER` env var | Variável |
| **Firecrawl** | Scraping de SPAs JavaScript-heavy (4ª camada do fallback) | ~US$ 20–50/mês |
| **FIAP / Oracle** | Banco de dados Oracle 12c durante POC | Gratuito (incluso no challenge) |
| **FIPE** | Tabela de preços de referência Brasil (5ª camada do fallback) | Gratuito (API pública) |
| **iCarros.com.br** | Fonte universal BR para preços e disponibilidade (4ª camada) | Gratuito (scraping público) |
| **Microsoft Playwright** | Scraping headless de sites dos fabricantes (2ª camada) | Gratuito (open source) |
| **ChromaDB** | Vector store para RAG — embeddings persistidos em volume Docker | Gratuito (open source) |
| **Docker Hub** | Containerização e distribuição do POC | Gratuito |

---

### 9. Estrutura de Custos (Cost Structure)

| Item | Custo Durante POC | Custo Pós-POC |
|---|---|---|
| LLM — OpenAI GPT-4.1-mini | ~US$ 0,08/extração × 6 veículos = ~US$ 0,48/ciclo | Idem (escala linear por veículo) |
| Firecrawl API (scraping SPA) | ~US$ 20–50/mês (plano básico) | Idem |
| ChromaDB (vector store) | Gratuito (open source, volume Docker) | Gratuito |
| Oracle FIAP | Gratuito (incluso no challenge) | ~R$ 500–2.000/mês (Oracle cloud) |
| Infraestrutura cloud (VM) | Gratuito (máquina local / Docker) | ~R$ 300–800/mês |
| Embeddings (all-MiniLM-L6-v2) | Gratuito (modelo local, sem chamada externa) | Gratuito |
| Equipe de manutenção | Time FIAP durante POC | 4–8h/mês para scrapers + novos modelos |

**Custo total estimado por ciclo completo (6 veículos): ~R$ 2–3** (LLM + proporcional de Firecrawl).
**Custo anual de operação pós-POC: ~R$ 6.000–15.000/ano** — vs. R$ 120.000+/ano do processo manual ou US$ 50.000+/ano de soluções enterprise.

**Modelo de custo:** Baixo custo variável (LLM por chamada), zero custo em vetores e embeddings. A maior economia está na substituição de 76h/mês de analista sênior por < 4h/mês de supervisão.

---

## Análise de Impacto de Falhas na Cadeia de Valor

### Falhas Operacionais

| Componente | Falha | Impacto Operacional | Contingência |
|---|---|---|---|
| Agente de extração IA | Falha de scraping | Analistas retornam ao processo manual temporariamente | Fallback hierárquico de 5 camadas: PDF → Playwright → Firecrawl → iCarros → FIPE |
| LLM (OpenAI/Anthropic) | Indisponibilidade | Extração ou chat bloqueados | Troca automática via `LLM_PROVIDER` env var; fallback entre provedores |
| Oracle FIAP | Banco indisponível | Consultas falham, novas extrações não persistem | ChromaDB como cache de leitura; extração pode rodar sem Oracle |
| ChromaDB | Volume corrompido | RAG Q&A degradado | Reinicialização idempotente via script `01_seed_kb.py` |
| Mobile App | Bug crítico | Usuários sem acesso à interface | REST API acessível via Swagger UI como fallback |

### Falhas Financeiras

| Cenário | Impacto | Mitigação |
|---|---|---|
| Dado errado sobre preço concorrente | Decisão de pricing subótima → perda de margem | Validação FIPE, campo `confianca`, revisão humana para confiança < 0.8 |
| Dado de especificação incorreto em campanha | Retrabalho de marketing, possível recolhimento | Campo `divergente=true` exige aprovação antes de publicação |
| Custo LLM excede orçamento | Aumento de custos operacionais | CHAT_CACHE (30d TTL) reduz ~60% chamadas; limites de rate; fallback menor custo |

### Falhas Reputacionais

| Cenário | Impacto | Mitigação |
|---|---|---|
| Dado incorreto publicado sobre concorrente | Exposição jurídica, constrangimento de marca | Campo `revisado_humano=true` obrigatório para publicação; política "null > inventar" |
| Vazamento de dados de estratégia Ford | Perda de vantagem competitiva | RBAC (admin/analista/viewer), JWT, criptografia AES-256, rate limiting |
| Downtime em momento crítico (lançamento) | Impacto na tomada de decisão | Uptime ≥ 99%, health checks automatizados, Docker restart policies |

---

## Custos Associados à Qualidade

| Categoria | Atividade | Estimativa |
|---|---|---|
| **Prevenção** | Validação Pydantic pós-LLM, ranges hardcoded, testes automatizados | 20% do tempo de dev |
| **Detecção** | Campo `confianca`, `divergente`, tela "Itens Pendentes" | 10% do tempo de dev |
| **Retrabalho** | Revisão manual de atributos divergentes | ~4h/mês analista |
| **Manutenção** | Atualização scrapers (layout change), novos modelos | ~4–8h/mês |
| **Suporte** | Resposta a incidentes de produção | ~2h/incidente |
| **Incidentes** | Cache invalidation, extração falha | CHAT_CACHE + retry automático |
