# Evidência — `mvn test` (Sprint 3)

**Data:** 2026-09-24  
**JDK:** Temurin 21  
**Resultado:** `BUILD SUCCESS` — **Tests run: 30, Failures: 0, Errors: 0, Skipped: 0** (revalidado na entrega Sprint 3)

## Suites

| Suite | Testes | Status |
|-------|--------|--------|
| `ApiAuthorizationMockMvcTest` | 7 | OK — 200 / 401 / 403 |
| `JwtUtilTest` | 3 | OK — RS256 gerar/validar/rejeitar |
| `AuthServiceTest` | 7 | OK |
| `CatalogoServiceTest` | 9 | OK |
| `ChatServiceTest` | 4 | OK |

## Cenários MockMvc cobertos

- Login sucesso → **200** + token
- Login senha inválida → **401**
- `GET /api/catalogos` sem auth → **401**
- `GET /api/catalogos` com VIEWER → **200**
- `POST /api/catalogos/extrair` VIEWER → **403**
- `POST /api/catalogos/extrair` ANALISTA → **200**
- `POST /api/auth/register` VIEWER → **403**

## Como reproduzir

```bash
# Preferir JDK 21 (Lombok / Spring Boot 3.2)
set JAVA_HOME=...\jdk-21
cd backend-java
mvn -B test
```

Relatórios gerados:

- Surefire: `backend-java/target/surefire-reports/`
- JaCoCo: `backend-java/target/site/jacoco/index.html`
- Log completo desta execução: conteúdo abaixo (trecho final)

```
Tests run: 30, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
Finished at: 2026-09-21T20:19:00-03:00
```

Anexar este arquivo + print do terminal / JaCoCo na entrega Teams (disciplina Arquitetura / Web Services).
