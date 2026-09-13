# Roteiro — AutoSight para o time de negócio da Ford

**Janela:** 5 min de pitch + 5 min de feedback  
**Ensaio alvo:** 4 min 30 s  
**Deck:** `autosight-ford-5min.html`  
**Arco:** problema da Ford → o que o app resolve → prova (6 modelos) → pedido  
**Regra:** resumir. Sem tour de tela. Sem slide de mercado genérico.

Se o relógio passar de **2:50 no slide 03**, ler as três setas em uma frase cada e ir ao 04. Nunca cortar o pedido.

---

## 0:00–0:25 — Slide 01 · AutoSight

**O que a sala vê:** nome e o recorte Ford.

**Fala:**

> AutoSight. Em cinco minutos: o problema que o time Ford tem ao posicionar o Ranger Raptor no cluster premium — e o que o app resolve.

**Não dizer:** FIAP, RM, sprint, stack, “já em produção”.

**Transição:** “O problema, do jeito que a gente entendeu.”

---

## 0:25–1:30 — Slide 02 · O problema da Ford

**O que a sala vê:** 3–5 dias, sem fonte, ciclo mensal.

**Fala:**

> A Ford compete nesse cluster: Raptor contra Hilux, Amarok, S10, Triton e Frontier. Produto, marketing e estratégia precisam saber onde o Raptor ganha e onde perde — potência, vadeo, ADAS, preço.
>
> Hoje isso é PDF do concorrente e planilha. O analista transcreve cerca de cinquenta specs. Três a cinco dias por rodada. O número na célula não tem fonte. E o ciclo é mensal: entre uma atualização e outra, a campanha ou a spec usa catálogo de ontem.
>
> Se o fluxo interno for outro, me corrijam no feedback. Estamos descrevendo o processo, não um timesheet da Ford.

**Não dizer:** 80 horas como fato, McKinsey, Gartner, R$ 8 bilhões.

**Transição:** “O que o AutoSight faz com isso.”

---

## 1:30–3:10 — Slide 03 · O que o app resolve

**O que a sala vê:** três setas Ford hoje → AutoSight.

**Fala:**

> Três coisas. Primeiro, tempo. Em vez de dias copiando spec, o analista dispara a extração e a ficha entra pronta. Ele valida. Não transcreve.
>
> Segundo, rastro. Cada spec aponta a fonte. Se o sistema não tem dado confiável, o campo fica vazio. Vocês não levam um chute de potência para a reunião.
>
> Terceiro, a pergunta seguinte. Hoje cada recorte — off-road, família, “quanto custa” — vira outra planilha. No app o cluster já compara lado a lado, rankeia por perfil, mostra o gap do Raptor e responde em português sobre o catálogo.
>
> Não é um dashboard genérico. É o trabalho de análise competitiva deste cluster, no celular, sem recomeçar o Excel.

**Se atrasar (relógio > 2:50):**

> Tira a transcrição, coloca fonte na spec, e a próxima pergunta não vira planilha nova. Próximo: o que já está no ar.

**Não dizer:** tour de telas, ReAct, 24h, 95%, Timeline.

**Transição:** “Isso já roda com os seis modelos.”

---

## 3:10–4:00 — Slide 04 · Já no app

**O que a sala vê:** os seis pickups + quatro saídas, em resumo.

**Fala:**

> POC, não produção Ford. Mas o cluster que vocês já monitoram está no app: Raptor e os cinco rivais.
>
> Compara spec a spec. Rankeia por família, off-road, desempenho e custo. Mostra onde o Raptor perde. Responde pergunta em português sobre esses catálogos.
>
> Extração é on-demand — o analista dispara. Não tem alerta sozinho quando o concorrente muda o PDF. O que já resolve é o ciclo manual deste cluster.

**Não dizer:** 12 telas, Eventos de Segurança, acurácia 90%.

**Transição:** “Duas perguntas de negócio.”

---

## 4:00–4:30 — Slide 05 · Feedback

**O que a sala vê:** três perguntas.

**Fala:**

> O time ainda perde dias no Excel deste cluster?
>
> O que o app deveria destravar primeiro — spec de produto, campanha ou argumento de venda?
>
> O que falta para um piloto de um ciclo?
>
> O QR abre o AutoSight no celular — dados móveis valem. Enquanto conversamos, entrem no comparativo.
>
> Fico nisso.

**Não dizer:** LatAm, SAP, ROI de R$ 40 mil.

---

## Se atrasar — mapa de corte

| Relógio | Ação |
|---|---|
| 2:50 ainda no 03 | Três setas, uma frase cada → 04 |
| 3:40 ainda no 04 | “Seis modelos no ar. Compara, rankeia, aponta gap.” → 05 |
| 4:20 no 05 | Só as três perguntas |

Nunca cortar o slide 05.

---

## QR no dia — app no celular, qualquer rede

`./start.sh --demo` (Windows: `start.bat --demo`) exporta o app, abre um túnel HTTPS público e mostra o QR. O celular pode estar no **4G**. Não precisa da Wi‑Fi da sala nem do hotspot do notebook.

1. Notebook com internet. Subir `./start.sh --demo` e esperar a página do QR.
2. Ensaio: um celular **fora** da Wi‑Fi da sala (dados móveis). O Comparativo Ranger Raptor vs Hilux GR-S deve abrir sozinho — sem login.
3. Abrir `autosight-ford-5min.html` em tela cheia. O QR dos slides lê `demo-url.js` gerado pelo start. `?app=` continua como override.
4. A URL do túnel muda a cada execução. Ctrl+C no terminal encerra o túnel.

Se o túnel falhar (rede corporativa bloqueando Cloudflare), a página do QR mostra o erro. Não caia para IP local — o celular não alcança.

Não mandar Timeline nem Eventos de Segurança.

---

## Demo (se Ford pedir no feedback, além do QR)

Não abrir no pitch de 5 min.

Se pedirem: Login → Comparativo Ranger Raptor vs Hilux GR-S → Score perfil off-road → Gaps → Chat “qual pickup tem melhor vadeo?”.

Não abrir Timeline. Não abrir Eventos de Segurança. São protótipo de tela, não operação ao vivo.

---

## Banco de respostas — 5 min de feedback

Respostas de 20–30 s. Se não souber, dizer que é hipótese — não completar com número inventado.

### Acurácia dos dados?

Ainda não medimos amostra contra PDF nesta reunião. A trava no produto é outra: validação de faixa, confiança por atributo, campo vazio se incerto, revisão humana no que não mapeou. Não afirmamos 90%.

### Tem alerta em 24 h quando o concorrente muda o catálogo?

Não. Extração é on-demand: alguém dispara. Re-extração agendada é o próximo passo se o piloto valer a pena.

### Dá para incluir SUV / outros mercados?

O pipeline não é específico de pickup. Hoje só estes seis modelos BR estão carregados. Incluir outro modelo é extração + validação, não reescrever o produto.

### Integra com SAP / CRM?

Existe API REST. Encaixe em sistema interno Ford é pós-piloto — precisamos saber qual sistema o time já usa.

### Scraping é legal?

Só fonte pública: PDF oficial, site .com.br, FIPE, iCarros. Dado incerto não é publicado. Se o jurídico tiver restrição de fonte, a gente corta a fonte — não o uso.

### Vi Timeline e Eventos de Segurança no app?

Protótipo de interface. Não é monitoramento ao vivo. Não usar como evidência operacional.

### Quanto custa?

O custo variável é chamada de modelo por extração — ordem de centavos de dólar por ficha. Não vendemos economia anual de dezenas de milhares como fato medido. O custo grande hoje é hora de analista transcrevendo.

### Quem usa no dia a dia?

Analista dispara extração e revisa o que ficou pendente. Produto, marketing e estratégia consultam comparativo, ranking, gaps e chat. Visualização não exige disparar extração.

### E se o site do fabricante bloquear coleta?

Há mais de uma fonte. PDF oficial e FIPE não dependem do scraper do site. Se uma via cai, a ficha pode ficar parcial — e parcial aparece como parcial, não como completo.

### Vocês substituem IHS / iCarros / Power BI?

Não. IHS não é BR-first nem tempo real. iCarros não entrega spec técnica profunda. Power BI continua útil se o time quiser dashboard — a gente alimenta o dado. O furo que fechamos é a extração e a comparação de catálogo.

### Vocês mediram as 80 horas / os 95%?

Não. Três a cinco dias descreve o fluxo de transcrição de catálogo, não um timesheet da Ford. O ganho que o POC entrega é esse: sair da planilha e passar a validar o que já foi extraído. As horas reais de vocês a gente calibra no piloto.

---

## Checklist de ensaio

- [ ] Ler o roteiro em voz alta com timer (alvo ≤ 4:30)
- [ ] Conferir corte do slide 03 no relógio 2:50 — a prova (04) e o pedido (05) não podem cair
- [ ] Combinar quem fala (uma voz no pitch; o resto no feedback)
- [ ] Ligar `./start.sh --demo` e confirmar o QR com um celular no 4G
- [ ] Abrir `autosight-ford-5min.html` em tela cheia (F11); setas ou espaço para avançar
