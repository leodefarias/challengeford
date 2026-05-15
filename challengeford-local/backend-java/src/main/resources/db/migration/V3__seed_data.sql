-- ============================================================
-- Ford Catálogos — Dados iniciais (idempotente via MERGE)
-- Senha padrão: Admin@Ford2025 (BCrypt strength=12)
-- MERGE ignora silenciosamente se o e-mail já existir.
-- ============================================================

MERGE INTO USUARIOS t
USING (
    SELECT 'admin@ford.com.br'                                              AS EMAIL,
           '$2b$12$J50eXmcWvRGLBV7fxNcnkO5mMV8IxGHfPkZOKPfjsqaDmPVtlT.le' AS SENHA_HASH,
           'Administrador Ford'                                              AS NOME,
           'admin'                                                           AS ROLE
    FROM DUAL
) s ON (t.EMAIL = s.EMAIL)
WHEN NOT MATCHED THEN
    INSERT (EMAIL, SENHA_HASH, NOME, ROLE)
    VALUES (s.EMAIL, s.SENHA_HASH, s.NOME, s.ROLE);

MERGE INTO USUARIOS t
USING (
    SELECT 'analista@ford.com.br'                                           AS EMAIL,
           '$2b$12$J50eXmcWvRGLBV7fxNcnkO5mMV8IxGHfPkZOKPfjsqaDmPVtlT.le' AS SENHA_HASH,
           'Analista Ford'                                                   AS NOME,
           'analista'                                                        AS ROLE
    FROM DUAL
) s ON (t.EMAIL = s.EMAIL)
WHEN NOT MATCHED THEN
    INSERT (EMAIL, SENHA_HASH, NOME, ROLE)
    VALUES (s.EMAIL, s.SENHA_HASH, s.NOME, s.ROLE);

COMMIT;
