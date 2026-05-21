# Pitch do Projeto — AutoSight

---

## Slide 1 — Identificação

**Nome do Projeto:** AutoSight
**Subtítulo:** Inteligência Competitiva Automotiva Powered by AI

**Equipe: AutoSight**
| Nome | RM |
|---|---|
| [Nome 1] | RM XXXXX |
| [Nome 2] | RM XXXXX |
| [Nome 3] | RM XXXXX |
| [Nome 4] | RM XXXXX |
| [Nome 5] | RM XXXXX |

**Curso:** [Nome do Curso]
**Turma:** [Turma]
**Parceiro:** Ford Brasil
**Período:** 2025–2026
**Link Vídeo Pitch (≤ 3 min):** [inserir link aqui]

---

## Slide 2 — O Problema

### Análise Competitiva de Catálogos: Um Processo Manual e Ineficiente

A Ford Brasil monitora 5 concorrentes diretos no segmento de pickups premium:
- Toyota Hilux GR-S
- VW Amarok V6 Extreme
- Chevrolet S10 High Country
- Mitsubishi Nova-Triton HPE-S
- Nissan Frontier PRO-4X

**Processo atual (AS-IS):**
1. Analista busca PDFs de catálogos manualmente nos sites de fabricantes
2. Extrai ~50 atributos técnicos por veículo em planilha Excel
3. Atualização mensal — perda de janela competitiva
4. Alto risco de erro humano na transcrição
5. Impossível escalar para mais modelos/mercados

**Impacto:**
- Ciclo de análise: **3 a 5 dias úteis**
- Custo humano estimado: **80 horas/mês** de analista sênior
- Decisões de pricing e posicionamento baseadas em dados defasados

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
- McKinsey (2023): OEMs perdem **2-5% de margem** por erros de posicionamento competitivo
- Para Ford Brasil (estimativa): risco de R$ 40–80M/ano em decisões subótimas de pricing

**Benchmark de Indústria:**
- Gartner (2024): 67% das empresas ainda usam **processos manuais** para competitive intelligence
- Apenas 23% dos OEMs globais têm sistemas automatizados de monitoramento de catálogos

---

## Slide 4 — A Solução Proposta

### AutoSight — Visão Geral

**O que é:**
Plataforma de inteligência competitiva automotiva que automatiza a extração, normalização e comparação de especificações técnicas de catálogos de veículos usando Inteligência Artificial com RAG (Retrieval-Augmented Generation).

**Escopo do POC:**
- **6 pickups premium** no mercado brasileiro
- **~50 atributos técnicos** por veículo (motorização, tração, dimensões, off-road, ADAS, conectividade, preços)
- **4 perfis de ranking** (família, desempenho, custo-benefício, off-road)
- **Mobile-first** (iOS/Android) + REST API para integração

**Objetivos e Recursos da Solução:**

| Objetivo | Recurso que Atende |
|---|---|
| Eliminar extração manual | Agente IA multi-fonte (PDF, scraping, FIPE API) |
| Análise em tempo real | Extração on-demand via app mobile |
| Comparação técnica precisa | Dashboard comparativo com 50+ atributos |
| Q&A em linguagem natural | Chat RAG sobre catálogos em português |
| Rankings por perfil | Score competitivo por dimensão e perfil comprador |
| Detectar mudanças de concorrentes | Timeline de atualizações de catálogo |
| Rastreabilidade total | Metadados de fonte por cada atributo |
| Segurança corporativa | JWT + RBAC + criptografia + rate limiting |

**Ciclo TO-BE:**
Agente IA → Extração automática (< 5 min) → Oracle → Mobile App → Insight imediato

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

5. **Extração Multi-Fonte com Fallback Hierárquico**
   - PDF oficial → Playwright scraping → Firecrawl (SPA) → iCarros → FIPE → YouTube/Whisper
   - Nunca depende de uma única fonte

6. **Custo Marginal vs. Concorrentes**
   - ~$0.10 por extração completa de catálogo (LLM API)
   - vs. $30–50K/ano de soluções enterprise

---

## Slide 7 — Arquitetura da Solução (Ver `04_arquitetura_togaf.md`)

### Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Mobile | React Native 0.81 + Expo 54 + TypeScript |
| Backend API | Java 21 + Spring Boot 3.2.5 + Spring Security |
| AI Microservice | Python 3.12 + FastAPI + ChromaDB |
| LLM | Claude Sonnet (Anthropic) / GPT-4 fallback |
| Banco de Dados | Oracle 12c+ |
| Containerização | Docker Compose |
| Embeddings | all-MiniLM-L6-v2 (local, sem custo) |

---

## Slide 8 — Roadmap (Ver `07_roadmap_sprints.md`)

### Sprint 3 — Testing, Compliance & QA (atual)
- Testes unitários e integração (Java JUnit + Python pytest)
- Auditoria segurança OWASP Top 10
- Validação de acurácia de extração vs. PDFs originais
- Documentação TOGAF/Archi (.archimate)

### Sprint 4 — Entrega Final
- Pitch final (slides + vídeo)
- Arquivo .archimate finalizado com 4 visões TOGAF
- Deploy estável com 6 veículos e ≥ 85% cobertura de atributos
- Relatório de métricas e evidências de qualidade

---

## Slide 9 — Qualidade, Riscos e Métricas (Ver `05_qualidade_riscos_metricas.md`)

**Critérios de Qualidade:**
- Acurácia de extração ≥ 90%
- Latência API P95 < 2 segundos
- Disponibilidade ≥ 99%
- Cobertura de testes ≥ 80%

**Principais Riscos:**
- Bloqueio de scraping → fallback multi-fonte
- Alucinação LLM → validação Pydantic + confiança score
- Indisponibilidade Oracle → cache ChromaDB

**Métricas de Sucesso:**
- Tempo de análise: < 1h (vs. 80h manual) = redução de 98%
- NPS time Ford ≥ 8/10
- 100% atributos com fonte rastreável

---

## Slide 10 — Business Canvas (Ver `02_business_canvas.md`)

*(Incluir imagem do Canvas gerado em ferramenta externa)*

**Resumo:**
- **Para:** Times de Produto, Marketing, Estratégia e Vendas da Ford Brasil
- **Que:** Precisam de inteligência competitiva ágil e confiável
- **Nossa solução:** AutoSight automatiza 98% do processo de análise de catálogos
- **Diferente de:** Planilhas manuais e soluções enterprise caras
- **Por:** Extração IA + RAG Q&A + mobile-first + BR-first

---

## Slide 11 — Quadro de Valor (Ver `03_quadro_de_valor.md`)

*(Incluir tabela do Quadro de Valor com stakeholders, benefícios, métricas)*

---

## Slide 12 — Próximos Passos

1. **Sprint 3 (atual):** Testes, qualidade, segurança
2. **Sprint 4:** Entrega final, apresentação, vídeo pitch
3. **Pós-FIAP (visão):** Expansão para 20+ modelos, 3+ países, integração com sistemas Ford
