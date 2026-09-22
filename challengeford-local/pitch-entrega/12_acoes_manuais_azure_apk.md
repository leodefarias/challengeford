# Ação manual restante — Azure DevOps + APK

## Azure DevOps (obrigatório para nota QA)

O backlog completo está em Markdown/CSV no repo. O professor exige o **link cloud**:

1. Seguir [azure-devops/README_SETUP.md](azure-devops/README_SETUP.md)
2. Importar [azure-devops/backlog-import.csv](azure-devops/backlog-import.csv)
3. Convidar **Prof. Yan Coelho** (Basic org + Project Administrators)
4. Colar o URL em Teams e neste arquivo:

```
ORG: https://dev.azure.com/________________
PROJETO: AutoSight
BOARDS: https://dev.azure.com/________________/AutoSight/_backlogs
```

## APK EAS (obrigatório para nota Mobile)

1. `cd mobile && npx eas-cli login && npx eas-cli init`
2. `npm run build:apk`
3. Baixar APK do dashboard Expo → anexar no Teams
4. (Opcional) copiar para `mobile/dist/autosight-preview.apk`
