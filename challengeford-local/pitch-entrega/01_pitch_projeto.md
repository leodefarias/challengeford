# Pitch do Projeto — AutoSight

---

## Slide 1 — Identificação

**Nome do Projeto:** AutoSight
**Subtítulo:** Inteligência Competitiva Automotiva Powered by AI

**Equipe: AutoSight**
| Nome | RM |
|---|---|
| Leonardo de Farias | RM555211 |
| Gustavo Laur | RM556603 |
| Giancarlo Cestarolli | RM555248 |

**Curso:** [Nome do Curso]
**Turma:** [Turma]
**Parceiro:** Ford Brasil
**Período:** 2025–2026
**Link Vídeo Pitch (≤ 3 min):** [inserir link aqui]

---

## Slide 2 — O Problema

### Análise Competitiva de Catálogos: Um Processo Manual e Ineficiente

A Ford Brasil compete diretamente com 5 fabricantes no segmento de pickups premium — o de maior margem do portfólio de OEMs no Brasil:
- Toyota Hilux GR-S
- VW Amarok V6 Extreme
- Chevrolet S10 High Country
- Mitsubishi Nova-Triton HPE-S
- Nissan Frontier PRO-4X

**Processo atual (AS-IS):**
1. Analista sênior localiza e baixa PDFs de catálogos manualmente nos sites de cada fabricante
2. Extrai ~50 atributos técnicos por veículo em planilha Excel — sem controle de versão, sem rastreabilidade de fonte
3. Ciclo de atualização: mensal — durante 30 dias a Ford toma decisões com dados potencialmente desatualizados
4. Alto risco de erro humano na transcrição: um dígito errado em potência ou torque pode custar posicionamento e margem
5. Impossível escalar: adicionar um novo modelo ou mercado multiplica o esforço linear

**Impacto mensurável:**
- Ciclo de análise: **3 a 5 dias úteis** para um único ciclo completo
- Custo humano: **80 horas/mês** de analista sênior (≈ R$ 8.000/ciclo ao custo de R$ 100/hora)
- Janela de risco: **30 dias** com dados potencialmente desatualizados antes da próxima atualização
- Decisões de pricing e posicionamento tomadas com informação defasada em um mercado de R$ 8+ bilhões/ano

---

## Slide 3 — Tamanho do Problema

### Não é um Problema Exclusivo da Ford — É Global

**Mercado de Competitive Intelligence:**
- Mercado global: **US$ 10,2 bilhões** em 2024 (Grand View Research)
- Crescimento projetado: **11,4% CAGR** até 2030
- Setor automotivo: um dos maiores consumidores de inteligência competitiva

**Setor Automotivo Brasileiro:**
- Mercado de pickups no Brasil: **R$ 8+ bilhões/ano** em receita (FIPE/FENABRAVE)
- Pickup truck é o segmento de **maior margem** no portfólio de OEMs no Brasil
- Ford Ranger compete diretamente nas versões premium (Raptor vs. Hilux GR-S, Amarok V6)

**Impacto de Análise Defasada:**
- McKinsey (2023): OEMs perdem **2–5% de margem** por erros de posicionamento competitivo
- Para Ford Brasil (estimativa conservadora): exposição de R$ 40–80M/ano em decisões subótimas de pricing no segmento de pickups premium

**Benchmark de Indústria:**
- Gartner (2024): 67% das empresas ainda usam **processos manuais** para competitive intelligence
- Apenas 23% dos OEMs globais têm sistemas automatizados de monitoramento de catálogos

---

## Slide 4 — A Solução Proposta

### AutoSight — Visão Geral

**O que é:**
Plataforma de inteligência competitiva automotiva que automatiza a extração, normalização e comparação de especificações técnicas de catálogos de veículos usando Inteligência Artificial com RAG Adaptativo (Retrieval-Augmented Generation). O pipeline inteiro — da fonte bruta ao insight no celular do analista — está implementado, containerizado e funcional.

**Escopo do POC (já entregue):**
- **6 pickups premium** do mercado brasileiro, com dados seeded e disponíveis
- **~50 atributos técnicos** por veículo: motorização, tração, dimensões, off-road, ADAS, conectividade, preços
- **4 perfis de ranking** com scoring determinístico ponderado: família, desempenho, custo-benefício, off-road
- **10 telas mobile** (iOS/Android) com design system consistente + REST API para integração com sistemas Ford
- **Segurança corporativa** implementada: JWT + RBAC (admin/analista/viewer) + AES-256 + BCrypt + Rate Limiting + Audit Log

**Objetivos e Recursos da Solução:**

| Objetivo | Recurso Implementado | Status |
|---|---|---|
| Eliminar extração manual | Agente ReAct multi-fonte: PDF → Playwright → Firecrawl → iCarros → FIPE | Entregue |
| Análise em tempo real | Extração on-demand via app mobile, < 5 minutos | Entregue |
| Comparação técnica precisa | Dashboard comparativo com 50+ atributos, vencedor destacado por atributo | Entregue |
| Q&A em linguagem natural | Chat RAG Adaptativo em PT-BR sobre catálogos | Entregue |
| Rankings por perfil | Score competitivo ponderado por dimensão e perfil comprador | Entregue |
| Detectar mudanças de concorrentes | Timeline de atualizações de catálogo com `data_extracao` | Entregue |
| Rastreabilidade total | `fonte_primaria` + `confianca` (0–1) por atributo | Entregue |
| Segurança corporativa | JWT + RBAC + AES-256 + BCrypt + Rate Limiting + `EVENTOS_SEGURANCA` | Entregue |

**Ciclo TO-BE (implementado):**
Solicitação via App → Agente ReAct (extração automática em < 5 min) → Validação Pydantic v2 → Oracle 12c → Mobile App → Insight imediato com fonte rastreável

---

## Slide 5 — Benchmarking (Ver arquivo `06_benchmarking.md`)

### Soluções Existentes no Mercado

| Solução | Empresa | BR | Preço Est. | Limitação Principal |
|---|---|---|---|---|
| IHS Markit Automotive Intelligence | S&P Global | Parcial | $50K+/ano | Sem RAG, sem tempo real, sem português |
| AutoPacific VDS | AutoPacific | Não | $30K+/ano | Focado no mercado norte-americano |
| CarGurus Analytics | CarGurus | Parcial | N/D | Apenas preços de revenda, sem specs técnicas |
| iCarros Pro | OLX Group | Sim | N/D | Apenas preços e disponibilidade |
| JD Power Competitive Intelligence | J.D. Power | Parcial | $20K+/ano | Dados anuais, não em tempo real |
| Solução interna Excel | Ford Brasil | Sim | Custo humano | Manual, não escalável |
| **AutoSight** | **AutoSight** | **Sim (BR-first)** | **POC open-source** | **POC — 6 modelos (expansível)** |

---

## Slide 6 — Diferenciais Competitivos

### Por que AutoSight é Diferente?

1. **BR-First por Design**
   - Campo `mercado_confirmado_br = true` em todos os atributos
   - Apenas dados confirmados para o mercado brasileiro
   - Integração com FIPE API para preços oficiais BR

2. **Zero Alucinação Policy**
   - Valores `null` em vez de inventar dados incertos
   - Validação pós-LLM com Pydantic v2 + ranges hardcoded
   - Campo `confianca` (0–1) por atributo — rastreabilidade de incerteza

3. **Rastreabilidade Total de Fontes**
   - Cada atributo tem `fonte_primaria` + tabela `CATALOGO_FONTES_SECUNDARIAS`
   - Metadados de divergência (`divergente=true`) expõem conflitos para revisão humana
   - Auditoria completa de onde cada dado veio

4. **RAG Q&A em Português Brasileiro**
   - Chat em linguagem natural: "Qual pickup tem melhor torque a baixa rotação?"
   - ChromaDB com 4 bases de conhecimento semântico
   - Cache 30 dias para respostas recorrentes

5. **Extração Multi-Fonte com Fallback Hierárquico (5 fontes)**
   - PDF oficial → Playwright scraping → Firecrawl (SPA) → iCarros → FIPE
   - Cinco camadas de redundância: se uma fonte falha, a próxima assume automaticamente
   - Campo `fonte_primaria` registra qual método extraiu cada atributo

6. **Custo Marginal vs. Concorrentes**
   - ~US$ 0,08 por extração completa de catálogo (custo LLM API); ~R$ 0,50 por extração no total
   - vs. R$ 120K+/ano (80h × analista sênior × 12 meses) ou US$ 50K+/ano (soluções enterprise)
   - Economia estimada: ≥ R$ 40.000/ano apenas em custo de pessoal analista

---

## Slide 7 — Arquitetura da Solução (Ver `04_arquitetura_togaf.md`)

### Stack Tecnológico

| Camada | Tecnologia | Status |
|---|---|---|
| Mobile | React Native 0.81 + Expo 54 + TypeScript | 10 telas entregues |
| Reverse Proxy | Nginx com TLS 1.2/1.3 + HSTS + CSP | Entregue |
| Backend API | Java 21 + Spring Boot 3.2.5 + Spring Security | JWT + RBAC + Rate Limiting entregues |
| AI Microservice | Python 3.12 + FastAPI + Agente ReAct | Adaptive RAG + 5 fontes de fallback entregues |
| LLM | OpenAI GPT-4.1-mini (chat/ranking) + Claude via `LLM_PROVIDER` | Configurável via env var |
| Vector Store | ChromaDB com embeddings all-MiniLM-L6-v2 (local, sem custo) | 4 coleções semânticas |
| Banco de Dados | Oracle 12c+ (FIAP) — Flyway V1–V4 + 8 tabelas | 6 veículos seeded |
| Containerização | Docker Compose — `./start.sh` sobe tudo em < 60s | Funcional, testado |

---

## Slide 8 — Roadmap (Ver `07_roadmap_sprints.md`)

### Sprint 3 — Testing, Compliance & QA (concluída)

| Entrega | Status |
|---|---|
| Auditoria de segurança OWASP Top 10 | Concluído |
| JWT + RBAC (admin/analista/viewer) | Concluído |
| Rate Limiting (100 req/min por IP) | Concluído |
| Input Sanitization (SQL Injection, XSS) | Concluído |
| Criptografia AES-256 de dados sensíveis | Concluído |
| BCrypt para senhas de usuários | Concluído |
| Audit Log (`EVENTOS_SEGURANCA`) | Concluído |
| Docker Compose estável (`./start.sh`) | Concluído |
| 10 telas mobile implementadas | Concluído |
| 6 veículos seeded e disponíveis | Concluído |
| Testes unitários e integração (Java JUnit + Python pytest) | Em finalização |
| Validação de acurácia de extração vs. PDFs originais | Em finalização |
| Documentação TOGAF/Archi (.archimate) | Em finalização |

### Sprint 4 — Entrega Final
- Pitch final (10–15 slides + vídeo ≤ 3 min com todos os membros)
- Arquivo `.archimate` finalizado com 4 visões TOGAF
- Deploy estável com 6 veículos e ≥ 85% cobertura de atributos por veículo
- Relatório de métricas com evidências numéricas de qualidade e segurança

---

## Slide 9 — Qualidade, Riscos e Métricas (Ver `05_qualidade_riscos_metricas.md`)

**Critérios de Qualidade (SLA definidos):**
- Acurácia de extração ≥ 90% vs. PDFs originais
- Latência API P95 < 2 segundos para endpoints principais
- Latência extração completa (50 atributos) < 5 minutos
- Chat RAG com cache hit < 1 segundo
- Disponibilidade ≥ 99% (Docker health checks + restart policies)
- 100% atributos com `fonte_primaria` rastreável

**Principais Riscos e Mitigações Implementadas:**
- Bloqueio de scraping → hierarquia de 5 fontes com fallback automático (PDF → Playwright → Firecrawl → iCarros → FIPE)
- Alucinação LLM → validação Pydantic v2 + ranges hardcoded + `confianca` (0–1) + revisão humana obrigatória para `confianca < 0.8`
- Indisponibilidade Oracle → ChromaDB como cache de leitura; extração retorna resultado sem Oracle
- Dependência de LLM único → `LLM_PROVIDER` env var com troca automática

**Métricas de Sucesso:**
- Tempo de análise: < 4h (vs. 80h manual) — **redução de 95%**
- NPS time Ford ≥ 8/10 (survey pós-demo Sprint 4)
- 100% atributos com fonte rastreável
- Zero vulnerabilidades críticas OWASP Top 10

---

## Slide 10 — Business Canvas (Ver `02_business_canvas.md`)

*(Incluir imagem do Canvas gerado em ferramenta externa)*

**Resumo:**
- **Para:** Times de Produto, Marketing, Estratégia e Vendas da Ford Brasil
- **Que:** Precisam de inteligência competitiva ágil, confiável e rastreável sobre concorrentes
- **Nossa solução:** AutoSight automatiza 95% do processo de análise de catálogos — de 80h para < 4h por ciclo
- **Diferente de:** Planilhas manuais (R$ 120K+/ano em pessoal) e soluções enterprise inacessíveis (US$ 50K+/ano, sem PT-BR nativo)
- **Por:** Pipeline de IA com 5 fontes de fallback + RAG Q&A em PT-BR + mobile-first + zero alucinação + BR-first

---

## Slide 11 — Quadro de Valor (Ver `03_quadro_de_valor.md`)

*(Incluir tabela do Quadro de Valor com stakeholders, benefícios, métricas)*

---

## Slide 12 — Próximos Passos

1. **Sprint 3 (concluída):** Segurança OWASP, JWT + RBAC + AES-256, Docker estável, 10 telas mobile, 6 veículos seeded — tudo implementado e funcional
2. **Sprint 4 (atual):** Entrega final — 10–15 slides, vídeo ≤ 3 min, arquivo `.archimate`, relatório de métricas
3. **Pós-FIAP (visão de produto):** Expansão para 20+ modelos (SUVs, elétricos), alertas automáticos de re-extração, integração com sistemas internos Ford (SAP, CRM), expansão para Argentina e México
