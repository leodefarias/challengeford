-- ============================================================
-- Ford Catálogos — Views Oracle
-- ============================================================

CREATE OR REPLACE VIEW VW_CATALOGOS_RESUMO AS
    SELECT
        c.ID,
        c.MARCA,
        c.MODELO,
        c.VERSAO,
        c.ANO_MODELO,
        c.SEGMENTO,
        c.STATUS,
        c.COBERTURA_PCT,
        c.COBERTURA_LIVE_PCT,
        c.DATA_EXTRACAO,
        s.SCORE_TECNICO,
        s.SCORE_VALOR,
        s.PERFIL_COMPETICAO
    FROM CATALOGOS c
    LEFT JOIN SCORE_COMPETITIVO s ON s.CATALOGO_ID = c.ID;

COMMENT ON TABLE VW_CATALOGOS_RESUMO IS 'Catálogos com score competitivo em uma linha — para listagem no app';

CREATE OR REPLACE VIEW VW_ATRIBUTOS_DIVERGENTES AS
    SELECT
        a.ID,
        a.ATRIBUTO,
        a.VALOR_TEXT,
        a.VALOR_NUMBER,
        a.CONFIANCA,
        a.FONTE_PRIMARIA,
        c.MARCA,
        c.MODELO,
        c.VERSAO
    FROM CATALOGO_ATRIBUTOS a
    JOIN CATALOGOS c ON c.ID = a.CATALOGO_ID
    WHERE a.DIVERGENTE = 1
    ORDER BY c.MARCA, c.MODELO, a.ATRIBUTO;

COMMENT ON TABLE VW_ATRIBUTOS_DIVERGENTES IS 'Atributos com divergência entre fontes — fila de revisão humana';

CREATE OR REPLACE VIEW VW_CHAT_CACHE_ATIVO AS
    SELECT
        ID,
        PERGUNTA_HASH,
        PERGUNTA_ORIGINAL,
        RESPOSTA,
        FONTES_CITADAS,
        DATA_CRIACAO,
        DATA_EXPIRACAO,
        ROUND((CAST(DATA_EXPIRACAO AS DATE) - CAST(SYSTIMESTAMP AS DATE)) * 24, 1) AS HORAS_RESTANTES
    FROM CHAT_CACHE
    WHERE DATA_EXPIRACAO > SYSTIMESTAMP;

COMMENT ON TABLE VW_CHAT_CACHE_ATIVO IS 'Entradas de cache do chat ainda dentro da validade';
