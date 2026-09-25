# Cybersecurity — Sprint 3 (DevSecOps)

## Anexar no Teams

1. **Documento consolidado (4 subetapas):**  
   `10_cybersecurity_sprint3.md` (também no ZIP)  
2. **Link GitHub Actions:** https://github.com/leodefarias/challengeford/actions  
3. **ZIP:** `autosight-cyber-sprint3.zip`  
4. Prints do pipeline: pasta `prints/` (DevSecOps #2 — 6 jobs). Faltam `01-actions-lista.png`, `02-devsecops-run.png` e `08-sca-maven.png`, a capturar quando o job do Maven terminar; depois, regerar o ZIP.  

## Pipeline

Workflow na raiz: `.github/workflows/devsecops.yml`  
(Gitleaks, SCA Maven + npm, Semgrep, `mvn test`, Trivy) — detalhes em `evidencias/ci/README.md`

## Conteúdo do doc

| Subárea | Seção |
|---------|--------|
| Pipeline DevSecOps | §1 |
| Segurança código/infra | §2 |
| Observabilidade + IR | §3 |
| Compliance STRIDE/OWASP/LGPD | §4 |
