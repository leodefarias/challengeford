# Documentação resumida — Sprint 3 IA/ML · AutoSight

**Projeto:** AutoSight — Inteligência Competitiva Automotiva (Ford Brasil)  
**Entrega:** classificação multiclasse de perfil de pickup  
**Notebook:** `sprint3_autosight_ml.ipynb` (executar no Google Colab)  
**Equipe:** Leonardo de Farias (RM555211), Gustavo Laur (RM556603), Giancarlo Cestarolli (RM555248)

---

## 1. Compreensão do problema (1,5)

**Problema:** o AutoSight já define quatro perfis de ranking (`familia`, `desempenho`, `custo_beneficio`, `offroad`). Falta um modelo que, a partir das especificações técnicas normalizadas de uma pickup, **sugira automaticamente o perfil**.

**Objetivo:** maximizar a acurácia / F1 macro na previsão do perfil, com pipeline reprodutível alinhado à apostila de IA/ML.

**Dados:** sintéticos (1000 linhas brutas → 900 após limpeza), gerados com faixas do `CatalogoSchema` e distribuições distintas por perfil (rótulo = processo de geração).

**Tipo de problema:** **classificação multiclasse supervisionada** (4 classes).

**Features:** `potencia_cv`, `torque_nm`, `preco_tabela_brl`, `capacidade_carga_kg`, `capacidade_reboque_kg`, `profundidade_vadeo_mm`, `angulo_ataque_graus`, `angulo_saida_graus`, `airbags_quantidade`, `tela_central_pol`, `frenagem_autonoma`.  
**Alvo:** `perfil`.

---

## 2. Preparação dos dados (2,0)

| Etapa | Tratamento | Impacto |
|---|---|---|
| Valores ausentes | ~8% das linhas com 1–2 colunas nulas → `dropna()` | 80 linhas (8%) |
| Inconsistências | Filtro pelos ranges do schema | 18 linhas |
| Outliers | IQR nas contínuas; remove se outlier em ≥2 atributos | 2 linhas |
| Seleção | Features de negócio alinhadas a `PERFIS_PREDEFINIDOS`; booleanos 0/1 | 11 features |
| Transformação | `StandardScaler` no `Pipeline` (sklearn) / fit no treino (MLP) | — |
| Split | 80/20 estratificado, `random_state=42` | treino 720 / teste 180 |

Arquivo: `dados_sinteticos_pickups.csv`.

---

## 3. Desenvolvimento dos modelos (3,0)

| Modelo | Justificativa | Ajuste |
|---|---|---|
| LogisticRegression | Baseline linear + L1/L2/ElasticNet (apostila) | `GridSearchCV` + `StratifiedKFold(5)` |
| SVC | Margem máxima; kernels linear/RBF | idem |
| RandomForestClassifier | Interações não-lineares / ensemble | `n_estimators`, `max_features`, `max_depth` |
| MLP PyTorch | Rede do final da apostila (`Linear`+`ReLU`, Adam, CrossEntropy) | 3 configs (hidden 32/64, lr 0.01/0.001) |

Exploração: **KMeans + silhouette** (melhor k=2, silhouette≈0,30) — o alvo supervisionado permanece `perfil`.

---

## 4. Avaliação e comparação (2,0)

**Métricas:** accuracy (CV e teste), precision / recall / F1 (por classe e macro), matriz de confusão.

| Modelo | CV accuracy | Test accuracy | Test F1 macro |
|---|---:|---:|---:|
| **LogisticRegression** | **0,9847** | **0,9833** | **0,9835** |
| RandomForest | 0,9736 | 0,9833 | 0,9835 |
| MLP PyTorch | — | 0,9833 | 0,9835 |
| SVC | 0,9819 | 0,9722 | 0,9724 |

**Análise:** `desempenho` e `offroad` separam quase perfeitamente; as poucas confusões ficam entre `familia` e `custo_beneficio` (preço/conforto próximos). LR, RF e MLP empatam no holdout (~98,3%); SVC fica um pouco atrás.

---

## 5. Conclusão (1,5)

**Modelo selecionado:** `LogisticRegression` com ElasticNet  
`C=10`, `l1_ratio=0.5`, `solver=saga`  
**Test accuracy:** 98,33% · **F1 macro:** 0,9835 · **CV accuracy:** 98,47%

**Por quê:** empate no teste com RF/MLP; a regressão logística tem o **melhor CV**, é interpretável (coeficientes) e está alinhada à apostila — melhor custo/benefício para o time Ford.

**Uso no AutoSight:** após extrair/normalizar specs no microsserviço IA, o classificador sugere `perfil` para pré-preencher o ranking (`PERFIS_PREDEFINIDOS`) e encaminhar o chat Adaptive RAG ao fluxo de recomendação. Complementa regras/LLM; não substitui RAG.

**Deploy:**
1. Treino offline neste notebook.
2. Artefato: `modelo_final_perfil.joblib` (pipeline sklearn + scaler).
3. Carregar no FastAPI (`microsservico-ia`), endpoint sugerido `POST /perfil/sugerir`.
4. Inferência síncrona em CPU; sem retreino em produção.

**Melhorias futuras:** labels reais de analistas Ford; mais features (ADAS, emplacamentos); monitoramento de drift; calibração de probabilidade para UI de confiança.

---

## Entregáveis (pasta `entrega/`)

| Arquivo | Conteúdo |
|---|---|
| `sprint3_autosight_ml.ipynb` | Notebook completo (Colab) |
| `DOCUMENTACAO_SPRINT3.md` | Esta documentação resumida |

> Ao executar o notebook no Colab, ele regenera os dados sintéticos, treina os modelos e salva `dados_sinteticos_pickups.csv`, `metricas_comparacao.csv`, `resultado_final.txt` e `modelo_final_perfil.joblib` no runtime.
