# Qualidade, Riscos e Métricas — AutoSight

---

## 1. Critérios de Qualidade da Solução

### Dimensões de Qualidade

| Dimensão | Critério | Meta | Justificativa |
|---|---|---|---|
| **Performance** | Latência API P95 (`/comparar`, `/chat`) | < 2 segundos | Uso em reuniões — espera > 2s quebra fluxo |
| **Performance** | Extração completa de catálogo (~50 attrs) | < 5 minutos | Extração on-demand tolerável até 5 min |
| **Performance** | Chat RAG (cache hit) | < 1 segundo | Respostas recorrentes devem ser instantâneas |
| **Disponibilidade** | Uptime mensal | ≥ 99% | ~7h downtime/mês tolerado |
| **Acurácia** | % atributos corretos vs. PDF oficial | ≥ 90% | Abaixo disso, dado não é confiável para decisão |
| **Confiabilidade** | % atributos com fonte rastreável | 100% | Requisito compliance — zero atributo sem origem |
| **Segurança** | Autenticação JWT | Expiração 8h, RBAC por role | Acesso mínimo necessário por perfil |
| **Usabilidade** | Task completion rate (sem suporte) | ≥ 85% | Usuários devem operar sem treinamento extenso |
| **Manutenibilidade** | Cobertura de testes automatizados | ≥ 80% | Mudanças futuras sem regressão |
| **Portabilidade** | Setup em nova máquina | < 15 minutos via Docker | Demonstrações em máquinas externas |

### Critérios de Aceitação por Módulo

**Mobile App (React Native):**
- Todas as 10 telas funcionais sem crash em iOS e Android
- Navegação bottom tabs responsiva
- Autenticação JWT com refresh automático
- Exibição correta de atributos `null` (não ocultar, exibir "Não disponível")

**Java API (Spring Boot):**
- Todos os endpoints documentados no Swagger UI
- Respostas com HTTP status code correto (200, 201, 400, 401, 403, 404, 500)
- Rate limiting ativo (máx. 100 req/min por IP)
- Idempotência: mesma extração não gera duplicata no Oracle

**Python AI Service (FastAPI):**
- Agente ReAct executa fallback hierárquico automaticamente
- Validação Pydantic rejeita dados fora de range sem lançar exceção não tratada
- ChromaDB inicializa idempotentemente (script `01_seed_kb.py`)
- Custo máximo por extração: $0.20 (Claude API)

---

## 2. Principais Riscos e Impactos no Negócio

### Matriz de Risco

| # | Risco | Probabilidade | Impacto | Nível | Mitigação |
|---|---|---|---|---|---|
| R1 | Sites fabricadores bloqueiam scraping (bot detection) | **Alta** | **Alto** | Crítico | Playwright stealth + Firecrawl fallback + PDFs como fonte primária sempre disponível |
| R2 | LLM alucina valores de atributos (ex: inventa potência) | **Média** | **Crítico** | Crítico | Validação Pydantic pós-LLM + ranges hardcoded + campo `confianca` + revisão humana |
| R3 | Mudança de layout nos sites de fabricantes quebra scrapers | **Alta** | **Médio** | Alto | Múltiplas estratégias de extração; fallback hierárquico; alertas de falha |
| R4 | Oracle FIAP indisponível (manutenção/instabilidade) | **Média** | **Alto** | Alto | ChromaDB como cache de leitura; extração pode rodar e retornar sem persistir |
| R5 | Custo LLM excede orçamento do projeto | **Média** | **Médio** | Médio | CHAT_CACHE 30d TTL; OpenAI fallback mais barato; extração idempotente (sem duplicatas) |
| R6 | Dados desatualizados (catálogo mudou, sistema não detectou) | **Média** | **Alto** | Alto | Timeline de atualizações com `data_extracao`; política de re-extração periódica |
| R7 | Vazamento de dados estratégicos da Ford | **Baixa** | **Crítico** | Alto | RBAC + JWT + AES-256 + rate limiting + audit log completo |
| R8 | Dependência única da Anthropic API (indisponibilidade) | **Baixa** | **Alto** | Médio | Fallback automático para OpenAI GPT-4 via `LLM_PROVIDER` env var |
| R9 | Dados de concorrente incorretos publicados em campanha Ford | **Baixa** | **Crítico** | Alto | Campo `revisado_humano=true` obrigatório para publicação; política "null > inventar" |
| R10 | Crescimento de volume (mais modelos) degrada performance | **Baixa** | **Médio** | Baixo | ChromaDB escala horizontalmente; CHAT_CACHE absorve consultas recorrentes |

### Detalhamento dos Riscos Críticos

#### R1 — Bloqueio de Scraping

**Impacto no negócio:** Extração de catálogos falha → time Ford volta ao processo manual de 80h/mês.

**Impacto técnico:** Pipeline agente quebra na etapa Playwright/Firecrawl.

**Mitigação implementada:**
- Hierarquia de fontes: PDF oficial (mais estável) → Playwright → Firecrawl → iCarros → FIPE → YouTube
- PDFs oficiais são baixados e armazenados localmente (não dependem de scraping em tempo real)
- Firecrawl (pago) tem capacidade anti-bot profissional como fallback
- Campo `fonte_primaria` registra qual método conseguiu extrair

**Indicador de alerta:** Taxa de falha de extração > 20% em uma semana → revisar scrapers.

---

#### R2 — Alucinação de LLM

**Impacto no negócio:** Dado incorreto de concorrente usado em decisão de produto/pricing/campanha → perda de margem, constrangimento, risco jurídico.

**Impacto técnico:** Schema preenchido com valores plausíveis mas falsos.

**Mitigação implementada:**
- Validação Pydantic v2 com tipos estritos (float, int, str, bool — sem campos livres não tipados)
- Ranges hardcoded por atributo: ex. potência válida: 100–800 cv, torque: 100–1500 Nm
- Campo `confianca` (0.0–1.0): LLM retorna confiança por atributo
- Revisão humana obrigatória para `confianca < 0.8` (tela "Itens Pendentes")
- Campo `divergente=true` quando fontes secundárias conflitam com primária
- Política absoluta: `null` > dado inventado

**Indicador de alerta:** % atributos com `confianca < 0.8` > 15% em uma extração → revisar prompt do agente.

---

#### R9 — Dado Incorreto Publicado

**Impacto no negócio:** Ford publica campanha com dado errado sobre concorrente → processo judicial, reputação.

**Mitigação implementada:**
- Campo `revisado_humano` (boolean) em `CATALOGO_ATRIBUTOS`
- Política de publicação: nenhum atributo chega ao time de marketing sem `revisado_humano=true`
- Tela "Itens Pendentes" no app mobile lista todos atributos pendentes de revisão
- Rastreabilidade de fonte permite validação humana direta na fonte original

---

### Análise de Impacto por Categoria

| Categoria de Impacto | Riscos Associados | Custo Estimado se Materializar |
|---|---|---|
| **Operacional** | R1, R3, R4, R8 | Volta ao processo manual: R$ 8.000/ciclo perdido |
| **Financeiro** | R2, R9, R5 | Decisão errada de pricing: R$ 1M+ em margem; custo LLM fora controle: R$ 2.000+/mês |
| **Reputacional** | R7, R9 | Campanha incorreta: custo de retificação + dano de marca (incalculável) |
| **Qualidade de dados** | R2, R6 | Confiança na plataforma destruída se dados errados aparecerem sistematicamente |

---

## 3. Métricas de Sucesso da Solução

### Métricas Primárias (Produto)

| Métrica | Indicador | Linha de Base (AS-IS) | Meta (TO-BE) | Ferramenta de Medição |
|---|---|---|---|---|
| **Tempo de análise competitiva** | Horas por ciclo completo (6 veículos) | 80h/mês | < 4h/mês (-95%) | Timestamp `data_extracao` Oracle |
| **Acurácia de extração** | % atributos corretos vs. PDF oficial | N/A (manual) | ≥ 90% | Validação manual de amostra 10% por sprint |
| **Cobertura de catálogo** | % atributos preenchidos por veículo (`cobertura_pct`) | N/A | ≥ 85% | `SELECT AVG(cobertura_pct) FROM CATALOGOS` |
| **Detecção de mudanças** | Horas entre publicação fabricante e detecção | 30 dias (ciclo manual) | < 24h | Comparar `data_extracao` vs. data publicação |
| **Satisfação do usuário** | NPS time Ford | N/A | ≥ 8/10 | Survey pós-demo Sprint 4 |

### Métricas de Performance (SLA)

| Métrica | Indicador | Meta | Medido por |
|---|---|---|---|
| **Latência API** | Tempo resposta P95 endpoints principais | < 2 segundos | Spring Actuator `/actuator/metrics` |
| **Latência extração** | Tempo para extração completa (50 attrs) | < 5 minutos | Timestamp Java → Python → resposta |
| **Latência chat (cache)** | Tempo resposta RAG de cache | < 1 segundo | CHAT_CACHE hit latency |
| **Disponibilidade** | Uptime mensal | ≥ 99% | Docker health checks + logs |
| **Cache hit rate** | % queries RAG respondidas de cache | ≥ 40% | `SELECT COUNT(*) WHERE cache_hit=true` |

### Métricas de Qualidade de Dados

| Métrica | Indicador | Meta | Medido por |
|---|---|---|---|
| **Confiança média** | Média do campo `confianca` por extração | ≥ 0.85 | `SELECT AVG(confianca) FROM CATALOGO_ATRIBUTOS` |
| **Taxa de divergência** | % atributos marcados `divergente=true` | < 10% | `SELECT COUNT(*) WHERE divergente=true` |
| **Rastreabilidade** | % atributos com `fonte_primaria NOT NULL` | 100% | Query Oracle |
| **Revisão pendente** | % atributos com `confianca < 0.8` e `revisado_humano=false` | < 5% | Tela "Itens Pendentes" |

### Métricas de Segurança

| Métrica | Indicador | Meta | Medido por |
|---|---|---|---|
| **Vulnerabilidades críticas** | OWASP Top 10 sem falhas críticas | 0 críticos | Relatório de auditoria Sprint 3 |
| **Cobertura de testes** | % código coberto por testes automatizados | ≥ 80% | JaCoCo (Java) + pytest-cov (Python) |
| **Acessos não autorizados** | Tentativas de acesso sem JWT válido logadas | 100% logadas | Tela "Eventos de Segurança" |
| **Tempo de resposta a incidente** | SLA de resposta para incidentes de segurança | < 4 horas | Log de incidentes |

### Métricas de Negócio (ROI)

| Métrica | Indicador | Cálculo | Meta |
|---|---|---|---|
| **Economia de custo** | R$/mês economizados em trabalho manual | (80h - 4h) × R$ 100/h | ≥ R$ 7.600/mês |
| **Custo por extração** | R$ por ciclo completo de 6 veículos | LLM API cost + infra proporcional | < R$ 3/ciclo |
| **ROI do POC** | Meses para payback se convertido em produto | Custo dev / economia mensal | < 12 meses |
| **Escalonamento** | Tempo para adicionar novo modelo | Extração on-demand | < 30 minutos |

---

## 4. Dashboard de Acompanhamento

### Indicadores em Tempo Real (disponíveis no app mobile)

| Tela | Indicadores Exibidos |
|---|---|
| **Status do Agente** | Status Python service, ChromaDB collections, última extração, fila pendente |
| **Eventos de Segurança** | Logins, tentativas falhas, acessos por role, alertas JWT |
| **Home** | `cobertura_pct` por veículo, `data_extracao`, status geral |
| **Itens Pendentes** | Atributos com `confianca < 0.8`, divergências, termos não mapeados |

### Consultas Oracle para Monitoramento

```sql
-- Acurácia média por veículo
SELECT c.marca, c.modelo, AVG(a.confianca) as confianca_media, 
       c.cobertura_pct, COUNT(a.id) as total_atributos
FROM CATALOGOS c JOIN CATALOGO_ATRIBUTOS a ON c.id = a.catalogo_id
GROUP BY c.marca, c.modelo, c.cobertura_pct
ORDER BY confianca_media DESC;

-- Atributos pendentes de revisão
SELECT c.marca, c.modelo, a.atributo, a.confianca, a.divergente
FROM CATALOGO_ATRIBUTOS a JOIN CATALOGOS c ON a.catalogo_id = c.id
WHERE a.confianca < 0.8 AND a.revisado_humano = 0
ORDER BY a.confianca ASC;

-- Cache hit rate do chat
SELECT 
  COUNT(CASE WHEN data_expiracao > SYSDATE THEN 1 END) as cache_hits,
  COUNT(*) as total_queries,
  ROUND(COUNT(CASE WHEN data_expiracao > SYSDATE THEN 1 END) * 100.0 / COUNT(*), 2) as hit_rate_pct
FROM CHAT_CACHE;
```
