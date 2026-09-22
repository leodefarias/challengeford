# Azure DevOps — Setup e convite do professor

Checklist obrigatório da disciplina **Testing, Compliance and Quality Assurance** (Sprint 3).

## 1. Criar organização e projeto

1. Acesse [https://dev.azure.com](https://dev.azure.com) com conta Microsoft (preferencialmente institucional FIAP).
2. **New organization** → nome sugerido: `fiap-autosight-<RM>` (único).
3. **New project** → nome: `AutoSight` → Visibility: **Private** → Work item process: **Agile** ou **Scrum**.
4. Em **Project settings → Teams**, confirme o time padrão.

## 2. Habilitar Backlogs hierárquicos

1. **Project settings → Team configuration → Backlogs**
2. Ative níveis: **Epics**, **Features**, **Stories** (PBIs).
3. Em **Sprints**, crie iterações:
   - `Sprint 1` (Foundation)
   - `Sprint 2` (Product Core)
   - `Sprint 3` (Qualidade / Segurança / Mobile APK) — **atual**
   - `Sprint 4` (Pitch / Vídeo)

## 3. Importar o backlog

Opção A — CSV:
1. Abra [backlog-import.csv](backlog-import.csv).
2. Boards → **Import work items** (ou extensão “CSV Import”) e mapeie colunas Work Item Type / Title / Description.

Opção B — manual:
1. Crie os Épicos E1–E6 conforme [09_azure_devops_backlog.md](../09_azure_devops_backlog.md).
2. Sob cada Épico, Features e PBIs com Parent link.
3. Cole os blocos Gherkin no campo **Acceptance Criteria** (ou Description).
4. Preencha **Priority**, **Story Points**, **Iteration Path** = Sprint prevista.
5. Crie Tasks T-301…T-309 sob a Sprint 3 e vincule aos PBIs pais.

## 4. Links e dependências

Para cada PBI com predecessor:
- **Add link → Predecessor** (ex.: PBI-102 predecessor PBI-101).
- Parent: Feature → Épico; PBI → Feature; Task → PBI.

## 5. Cadastrar o professor (obrigatório)

E-mail / identidade do Scrum Master / professor da disciplina (confirmar no Teams):

> **Prof. Yan Coelho** (e demais professores avaliadores da disciplina QA, se solicitado)

Passos:
1. **Organization settings → Users → Add users**
   - Access level: **Basic**
   - Add to projects: `AutoSight`
2. **Project settings → Permissions → Project Administrators → Members → Add**
   - Inclua o professor no grupo **Project Administrators** (acesso total ao projeto).
3. Envie o link do Boards no Teams:
   - `https://dev.azure.com/<ORG>/AutoSight/_backlogs/backlog`

## 6. Evidência para a nota

Entregar no Teams (Sprint 3 — disciplina QA):
- [ ] URL da organização / projeto
- [ ] Print mostrando Epics → Features → PBIs
- [ ] Print do Sprint 3 com Tasks
- [ ] Print do Release / Iteration Path
- [ ] Confirmação de que o professor aparece em Users (Basic) e Project Administrators

## 7. Espelho no repositório

Mesmo sem acesso cloud do avaliador ao Git, o Markdown [09_azure_devops_backlog.md](../09_azure_devops_backlog.md) reproduz o plano completo. O **link Azure** continua obrigatório na rubrica.
