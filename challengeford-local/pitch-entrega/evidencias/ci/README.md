# Evidência CI

Workflow DevSecOps na raiz do repositório:

- `.github/workflows/devsecops.yml`
- `.github/dependabot.yml`
- `.gitleaks.toml`
- `challengeford-local/mobile/audit-ci.jsonc` (gate do npm audit)

Actions: https://github.com/leodefarias/challengeford/actions

Espelho legado (não executado pelo remote root): `challengeford-local/.github/`

## Prints — DevSecOps #2 (commit `5c6ce73`, push em `main`)

| Arquivo | Job | Resultado |
|---------|-----|-----------|
| `01-actions-lista.png` | Lista de runs | OK — DevSecOps #2 sucesso (57m 36s) |
| `02-devsecops-run.png` | Resumo do run com os 6 jobs | OK — status Success |
| `03-gitleaks.png` | Secret Scanning (Gitleaks) | OK — *No leaks detected* |
| `04-sca-npm.png` | SCA — `audit-ci --high` (mobile) | OK |
| `05-semgrep.png` | SAST — Semgrep `p/owasp-top-ten` com `--error` | OK — 0 findings |
| `06-tests.png` | Java tests (Unit + MockMvc) | OK |
| `07-trivy.png` | Container Security (Trivy fs + config) | OK — 0 CRITICAL |
| `08-sca-maven.png` | SCA — OWASP Dependency-Check (Maven) | OK — job verde; aviso de NVD no resumo do run |

## Correções aplicadas no run #2

- `aquasecurity/trivy-action@0.28.0` não existia (as tags usam prefixo `v`) → `v0.36.0`.
- `semgrep/semgrep-action@v1` descontinuada e com `continue-on-error` → CLI `semgrep/semgrep` com `--error` (gate real).
- `npm audit` falhava com 28 vulnerabilidades → `npm audit fix` + `overrides` (`postcss`, `ws`); gate `audit-ci --high`. Exceção documentada: `image-size@1.x` (GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr), usado só pelo Metro no build — a correção existe apenas no 2.x, que quebra o bundler do Expo SDK 54.
- Actions atualizadas para runtime Node 24 (`checkout@v7`, `setup-java@v6`, `setup-node@v7`, `gitleaks-action@v3`).
- SAST e testes Java em jobs separados; cache do NVD e relatório do Dependency-Check publicado como artefato.
