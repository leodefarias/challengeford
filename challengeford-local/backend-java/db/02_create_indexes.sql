-- ============================================================
-- Ford Catálogos — Índices Oracle
-- ============================================================

-- CATALOGOS
CREATE INDEX idx_cat_marca_modelo_versao ON CATALOGOS (MARCA, MODELO, VERSAO);
CREATE INDEX idx_cat_status             ON CATALOGOS (STATUS);
CREATE INDEX idx_cat_data_extracao      ON CATALOGOS (DATA_EXTRACAO DESC);

-- CATALOGO_ATRIBUTOS
CREATE INDEX idx_atr_catalogo_id  ON CATALOGO_ATRIBUTOS (CATALOGO_ID);
CREATE INDEX idx_atr_atributo     ON CATALOGO_ATRIBUTOS (ATRIBUTO);
CREATE INDEX idx_atr_divergente   ON CATALOGO_ATRIBUTOS (DIVERGENTE) WHERE DIVERGENTE = 1;

-- CATALOGO_FONTES_SECUNDARIAS
CREATE INDEX idx_fonte_atributo_id ON CATALOGO_FONTES_SECUNDARIAS (ATRIBUTO_ID);

-- CAPABILITY_SCORES
CREATE INDEX idx_cap_catalogo_id  ON CAPABILITY_SCORES (CATALOGO_ID);
CREATE INDEX idx_cap_capability   ON CAPABILITY_SCORES (CAPABILITY);

-- SCORE_COMPETITIVO
CREATE INDEX idx_score_catalogo_id ON SCORE_COMPETITIVO (CATALOGO_ID);

-- CHAT_CACHE
CREATE INDEX idx_cache_hash       ON CHAT_CACHE (PERGUNTA_HASH);
CREATE INDEX idx_cache_expiracao  ON CHAT_CACHE (DATA_EXPIRACAO);

-- TERMOS_PENDENTES
CREATE INDEX idx_termo_status       ON TERMOS_PENDENTES (STATUS);
CREATE INDEX idx_termo_data         ON TERMOS_PENDENTES (DATA_DETECTADO DESC);
