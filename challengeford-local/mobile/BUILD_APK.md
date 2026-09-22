# Build APK — AutoSight (Sprint 3)

Passo a passo para gerar o APK Android publicável via Expo EAS.

## Pré-requisitos

1. Conta em [expo.dev](https://expo.dev)
2. Node 18+ e dependências do app (`npm install` em `mobile/`)
3. CLI: `npx eas-cli login`

## Comandos

```bash
cd mobile
npx eas-cli login
npx eas-cli init          # cria/atualiza projectId em app.json (uma vez)
npm run build:apk         # perfil preview → APK
```

Quando o build terminar:

1. Abra o link do build no dashboard Expo
2. Baixe o `.apk`
3. Anexe no Teams **e** guarde cópia local em `mobile/dist/autosight-preview.apk` (pasta gitignored)

## Instalação de teste

```bash
adb install mobile/dist/autosight-preview.apk
```

Ou copie o APK para o celular e instale (fontes desconhecidas).

## Configuração já pronta no repo

| Arquivo | Conteúdo |
|---------|----------|
| `eas.json` | profiles `development` / `preview` (APK) / `production` (AAB) |
| `app.json` | `android.package=br.ford.autosight`, splash dark, nome AutoSight |
| `package.json` | scripts `build:apk` e `build:apk:local` |

## Sem conta Expo agora?

Use o demo web enquanto isso:

```bash
# raiz do monorepo
./start.sh --demo
# ou start.bat --demo
```

Galeria visual das telas: [screenshots/gallery.html](screenshots/gallery.html).
