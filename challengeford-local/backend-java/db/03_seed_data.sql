-- ============================================================
-- Ford Catálogos — Dados iniciais
-- Senha: Admin@Ford2025 (BCrypt strength=12)
-- ============================================================

-- Senha: Admin@Ford2025 (BCrypt strength=12)
INSERT INTO USUARIOS (EMAIL, SENHA_HASH, NOME, ROLE)
VALUES (
    'admin@ford.com.br',
    '$2b$12$J50eXmcWvRGLBV7fxNcnkO5mMV8IxGHfPkZOKPfjsqaDmPVtlT.le',
    'Administrador Ford',
    'admin'
);

INSERT INTO USUARIOS (EMAIL, SENHA_HASH, NOME, ROLE)
VALUES (
    'analista@ford.com.br',
    '$2b$12$J50eXmcWvRGLBV7fxNcnkO5mMV8IxGHfPkZOKPfjsqaDmPVtlT.le',
    'Analista Ford',
    'analista'
);

COMMIT;
