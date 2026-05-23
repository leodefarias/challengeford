# Benchmarking — Análise Competitiva de Mercado

## AutoSight vs. Soluções Existentes

---

## 1. Panorama do Mercado

O problema de análise competitiva de catálogos automotivos é atendido por diferentes categorias de solução:

| Categoria | Descrição | Adequação para Ford BR |
|---|---|---|
| Enterprise Automotive Intelligence | Plataformas globais de dados automotivos | Parcial — foco em mercados EUA/Europa |
| Ferramentas de Monitoramento de Preço | Focadas em preço de venda (não specs técnicas) | Insuficiente — não cobre specs |
| Soluções de Business Intelligence Genéricas | Tableau, Power BI com feeds manuais | Requer processo manual de alimentação |
| Processos Internos (Excel/Planilha) | Solução atual da Ford Brasil | Gargalo — lento, caro, erro-prone |
| **AutoSight (nossa solução)** | IA + RAG + mobile-first + BR-first | **Específica para o problema** |

---

## 2. Matriz de Benchmarking

| Critério | IHS Markit Automotive | AutoPacific VDS | CarGurus Analytics | iCarros Pro | Power BI + Manual | **AutoSight** |
|---|---|---|---|---|---|---|
| **Cobertura Brasil** | Parcial | Não | Parcial | Sim | Sim | **Sim (BR-first nativo)** |
| **Specs técnicas** | Sim | Sim | Não | Não | Sim (manual) | **Sim (50+ attrs automatizados)** |
| **Tempo real** | Não (mensal) | Não (anual) | Parcial (preços) | Parcial | Não | **Sim (on-demand, < 5 min)** |
| **Q&A em linguagem natural** | Não | Não | Não | Não | Não | **Sim (RAG Adaptativo PT-BR)** |
| **Rastreabilidade de fonte** | Parcial | Parcial | Não | Não | Manual | **Sim (100% — `fonte_primaria` por attr)** |
| **Zero alucinação** | N/A | N/A | N/A | N/A | N/A | **Sim (política null > inventar)** |
| **Mobile-first** | Não | Não | Parcial (web) | Sim (app) | Não | **Sim (10 telas iOS/Android entregues)** |
| **Rankings por perfil comprador** | Não | Parcial | Não | Não | Manual | **Sim (4 perfis com scoring ponderado)** |
| **Segurança corporativa** | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Não aplicável | **JWT + RBAC + AES-256 + Audit Log** |
| **Idioma PT-BR** | Parcial | Não | Não | Sim | Sim | **Sim (nativo — não é tradução)** |
| **Custo estimado/ano** | $50K+ | $30K+ | N/D | N/D | R$ 120K+ (pessoal) | **~R$ 6K (API costs) — 95% mais barato** |
| **Tempo de setup** | Meses | Meses | Dias | Horas | Semanas | **< 15 min (`./start.sh`)** |
| **Já deployado** | Não | Não | Não | Não | Sim (planilha) | **Sim (Docker Compose, POC funcional)** |
| **Open/integrável** | Não | Não | Não | Não | Parcial | **Sim (REST API + Swagger UI)** |

---

## 3. Análise Detalhada dos Concorrentes

### IHS Markit Automotive Intelligence (S&P Global)

**O que é:** Plataforma global líder em dados automotivos — specs, vendas, previsões de mercado.

**Pontos fortes:**
- Cobertura global massiva (190+ países)
- Dados históricos de décadas
- Credibilidade institucional

**Limitações para Ford Brasil:**
- Foco em mercados EUA/Europa; dados BR são complementares, não primários
- Interface web complexa, não mobile
- Sem RAG ou Q&A em linguagem natural
- Atualização mensal/trimestral — não em tempo real
- Custo proibitivo para POC (US$ 50K+/ano)
- Não customizável para análise específica de segmento

---

### AutoPacific VDS (Vehicle Demand Studies)

**O que é:** Pesquisa de satisfação e inteligência de produto automotiva nos EUA.

**Pontos fortes:**
- Dados de satisfação do consumidor
- Rankings de produto

**Limitações para Ford Brasil:**
- **Mercado norte-americano exclusivamente**
- Sem dados do Brasil
- Foco em pesquisa de satisfação, não specs técnicas de catálogo
- Sem integração de API

---

### CarGurus Analytics

**O que é:** Plataforma de análise de mercado de veículos usados/novos focada em preços.

**Pontos fortes:**
- Dados de preço em tempo real
- Presença em múltiplos países

**Limitações para Ford Brasil:**
- Foco em **preços de venda**, não em specs técnicas
- Sem extração de atributos de catálogo
- Sem RAG ou análise competitiva de especificações
- Cobertura BR incompleta para segmento premium

---

### iCarros Pro (OLX Group)

**O que é:** Portal de comparação e listagem de veículos novo/usado no Brasil.

**Pontos fortes:**
- Cobertura Brasil nativa
- Preços e disponibilidade em tempo real
- App mobile

**Limitações para Ford Brasil:**
- **Apenas preços e disponibilidade** — sem specs técnicas detalhadas
- Sem análise competitiva de atributos (torque, tração, ADAS, off-road)
- Sem Q&A em linguagem natural
- Sem rankings por perfil de comprador
- Dados orientados ao consumidor final, não ao time de produto

---

### Power BI / Tableau + Alimentação Manual

**O que é:** Ferramenta de BI conectada a planilhas Excel preenchidas manualmente.

**Pontos fortes:**
- Flexível e customizável
- Familiar para times de estratégia
- Integra com sistemas Microsoft (Ford usa Office 365)

**Limitações:**
- **Processo manual** de coleta = 80h/mês de analista
- Sem automação de extração
- Sem Q&A em linguagem natural
- Atualização mensal (gargalo humano)
- Sem rastreabilidade automática de fontes
- Alto custo de manutenção humana

---

## 4. Diferenciais Competitivos AutoSight

### Diferencial 1 — BR-First por Design

Nenhum concorrente foi construído especificamente para o mercado brasileiro.

- Campo `mercado_confirmado_br = true` em todos os atributos — apenas dados confirmados para o Brasil
- Integração nativa com FIPE API (preços de referência oficiais BR) como camada de fallback e validação
- Fontes priorizadas: PDFs oficiais `.com.br`, sites brasileiros dos fabricantes, iCarros.com.br
- Lógica de validação com contexto específico do mercado brasileiro (ranges de potência, preço e dimensões calibrados para o segmento BR)
- Q&A em PT-BR nativo — não é tradução: o modelo responde em português com terminologia automotiva brasileira

---

### Diferencial 2 — Zero Alucinação Policy

Problema crítico em soluções de IA generativa: inventar dados quando não encontra.

**Nossa política:** Se não tem dados confiáveis → `null`, nunca dado inventado.

Implementação:
- Validação pós-LLM com Pydantic v2 (schema estrito)
- Ranges hardcoded por atributo (ex: torque válido: 100–1500 Nm)
- Campo `confianca` (0.0–1.0) por atributo
- Revisão humana obrigatória para `confianca < 0.8`
- Divergências marcadas: campo `divergente = true`

---

### Diferencial 3 — Rastreabilidade Total de Fontes

**Por quê importa:** Decisão corporativa baseada em dado errado = risco jurídico e financeiro.

Implementação:
- `fonte_primaria`: ex. "PDF oficial Toyota Hilux GR-S BR 2025"
- Tabela `CATALOGO_FONTES_SECUNDARIAS`: URL + status (confirma/diverge/complementa) + confiança
- Metadados completos: data de extração, método, URL de origem
- Auditoria de quem acessou quê (tabela de eventos de segurança)

---

### Diferencial 4 — RAG Q&A em Português Brasileiro

**Nenhum concorrente** oferece:

- Perguntas em linguagem natural em PT-BR
- Respostas baseadas em dados reais extraídos dos catálogos (não respostas genéricas)
- Citação de fontes na resposta ("De acordo com o catálogo oficial Toyota 2025...")
- Cache inteligente: respostas recorrentes em < 1 segundo

---

### Diferencial 5 — Rankings por Perfil de Comprador

**Único no mercado** para o segmento pickup premium BR:

- Perfil **Família**: segurança ADAS, conforto, capacidade de carga
- Perfil **Off-Road**: altura livre, ângulos de rampa/saída, 4x4, tração
- Perfil **Desempenho**: potência, torque, 0-100 km/h, suspensão
- Perfil **Custo-Benefício**: preço/potência, garantia, custo de manutenção

Scores ponderados, ajustáveis, com líder identificado por dimensão.

---

### Diferencial 6 — Custo Marginal vs. Soluções Enterprise

| Solução | Custo Estimado/Ano |
|---|---|
| IHS Markit Automotive | US$ 50.000+ |
| AutoPacific VDS | US$ 30.000+ |
| Custo interno manual (Ford) | R$ 120.000+ (analista sênior × 80h/mês) |
| **AutoSight (custo de operação)** | **~R$ 6.000/ano (API LLM + infra)** |

Redução de custo operacional: **95%+** vs. processo manual.

---

## 5. Posicionamento Estratégico

```
                    ALTO CUSTO
                        |
    IHS Markit ●        |
                        |
    AutoPacific ●       |
───────────────────────────────────── COBERTURA BR
         (fraca)        |                (forte)
                        |
    iCarros ●           |    ● AutoSight
                        |
    Excel Manual ●      |
                        |
                    BAIXO CUSTO
```

AutoSight ocupa o quadrante **baixo custo + alta cobertura BR** — posição única no mercado.

---

## 6. Conclusão

**AutoSight é a única solução que combina — e já entregou:**

1. Extração automática de specs técnicas com hierarquia de 5 fontes e fallback automático
2. Foco exclusivo no mercado brasileiro — BR-first por design, não por adaptação
3. RAG Q&A Adaptativo em português — classifica pergunta e usa contexto relevante
4. Zero alucinação com rastreabilidade total: `fonte_primaria` + `confianca` (0–1) por atributo
5. Mobile-first: 10 telas iOS/Android implementadas e funcionais
6. Custo marginal: ~R$ 0,50/extração vs. R$ 8.000/ciclo manual ou US$ 50K+/ano enterprise
7. Open e integrável via REST API + Swagger UI + Docker Compose — setup em < 15 minutos
8. **Já em produção (POC):** `docker compose up` sobe o sistema completo em < 60 segundos, com 6 veículos disponíveis e todos os controles de segurança corporativa ativos (JWT, RBAC, AES-256, audit log)
