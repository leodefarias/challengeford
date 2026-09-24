# Captura de screenshots — AutoSight

## Ordem das 12 telas (GALLERY.md)

1. Login
2. Home / Catálogos
3. Comparativo
4. Score / Ranking
5. Gaps
6. Chat
7. Timeline
8. Pending Items (admin)
9. Status Agent
10. Security Events
11. Score Settings
12. Drawer Menu

## Automação preferida (Maestro + APK)

```bash
# Após baixar o APK
adb install -r mobile/dist/autosight-preview.apk
# Instalar Maestro: https://maestro.mobile.dev
maestro test mobile/.maestro/
```

Fluxos em `mobile/.maestro/` (criar se ausente).

## Fallback sem emulador

Abrir `mobile/screenshots/gallery.html` no browser e/ou demo web `./start.sh --demo`.
Anexar prints da galeria + do APK instalado no Teams.
