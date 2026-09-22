# AutoSight Mobile (React Native + Expo 54)

App Android/iOS do Ford Challenge — análise competitiva de catálogos (pickups).

## Stack

- Expo SDK 54 · React Native 0.81 · TypeScript
- React Navigation (tabs + stack)
- Design tokens: Syne / DM Sans / DM Mono — `src/theme/`

## Pré-requisitos

- Node 18+
- Conta [Expo](https://expo.dev) (para EAS Build / APK)
- Backend no ar (`../start.sh` ou `start.bat`) ou `EXPO_PUBLIC_API_URL` apontando para a API

## Desenvolvimento

```bash
cd mobile
cp .env.example .env   # se existir
npm install
npx expo start
```

Scripts:
| Comando | Uso |
|---------|-----|
| `npm start` | Metro / Expo Go |
| `npm run android` | Emulador Android |
| `npm run web` | Browser |
| `npm run build:apk` | EAS Build preview (APK) |

## Variáveis

| Var | Descrição |
|-----|-----------|
| `EXPO_PUBLIC_API_URL` | Base URL da API (ex. `https://localhost` via nginx) |
| `EXPO_PUBLIC_DEMO=1` | Demo mode (auto-login / pré-seleções) |

## Telas

| Tela | Arquivo | Backend |
|------|---------|---------|
| Login | `LoginScreen.tsx` | `POST /api/auth/login` |
| Home | `HomeScreen.tsx` | catálogos |
| Comparativo | `ComparativoScreen.tsx` | comparar |
| Score | `ScoreScreen.tsx` | ranking |
| Gaps | `GapsScreen.tsx` | ranking + catálogos |
| Chat | `ChatScreen.tsx` | chat RAG |
| Timeline | `TimelineScreen.tsx` | feed (conteúdo editorial) |
| Pendentes | `PendingItemsScreen.tsx` | admin termos |
| Status Agente | `StatusAgentScreen.tsx` | health / extrair |
| Eventos Segurança | `SecurityEventsScreen.tsx` | audit UI |
| Config Score | `ScoreSettingsScreen.tsx` | pesos ranking |
| Menu | `DrawerMenuScreen.tsx` | navegação / tema |

Galeria visual: [screenshots/GALLERY.md](screenshots/GALLERY.md) e [screenshots/gallery.html](screenshots/gallery.html).

## Build APK (Sprint 3)

Passo a passo completo: **[BUILD_APK.md](BUILD_APK.md)**.

Resumo:

```bash
cd mobile
npx eas-cli login
npx eas-cli init
npm run build:apk
```

Galeria visual: [screenshots/gallery.html](screenshots/gallery.html).

## Identidade visual

- Tema dark/light: `ThemeContext`
- Cores/spacing/tipografia: `src/theme/index.ts`
- Componentes compartilhados: `src/components/`

## Demo sem instalar APK

Na raiz do monorepo:

```bash
./start.sh --demo
# ou start.bat --demo
```

Export web + túnel Cloudflare + QR (`demo/qr.html`).
