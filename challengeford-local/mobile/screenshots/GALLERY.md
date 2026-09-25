# Galeria de telas — AutoSight Mobile

Prints reais do app (build web Expo, viewport 390x844) com a stack completa no ar: Java API + Oracle FIAP + microsserviço IA, via gateway nginx `:8082`.  
Wireframe interativo: [gallery.html](gallery.html).

| Tela | Print |
|------|-------|
| Login | ![Login](01-login.png) |
| Home / ficha técnica | ![Home](02-home.png) |
| Comparativo (Ford Ranger x Toyota Hilux) | ![Comparativo](03-comparativo.png) |
| Score competitivo (perfil desempenho) | ![Score](04-score.png) |
| Gaps acionáveis | ![Gaps](05-gaps.png) |
| Chat RAG | ![Chat](06-chat.png) |
| Timeline de mudanças | ![Timeline](07-timeline.png) |
| Termos pendentes (admin) | ![Pendentes](08-pending.png) |
| Status do agente | ![Status](09-status-agent.png) |
| Alertas de segurança | ![Segurança](10-security-events.png) |
| Configuração de score | ![Config score](11-score-settings.png) |
| Menu / drawer | ![Menu](12-drawer.png) |

## Como recapturar

```bash
./start.sh            # ou start.bat — sobe nginx, java-api, python-ia
cd mobile
EXPO_PUBLIC_API_URL=same-origin npx expo export --platform web
# abrir http://localhost:8082 em viewport 390x844 e percorrer as telas
```
