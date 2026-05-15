-- ============================================================
-- Ford Catálogos — DDL Oracle 12c+
-- Executar como: RM555211@oracle.fiap.com.br:1521/ORCL
-- ============================================================

-- 1. USUARIOS
CREATE TABLE USUARIOS (
    ID            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    EMAIL         VARCHAR2(200)  NOT NULL,
    SENHA_HASH    VARCHAR2(200)  NOT NULL,
    NOME          VARCHAR2(200),
    ROLE          VARCHAR2(20)   DEFAULT 'viewer' NOT NULL,
    ATIVO         NUMBER(1)      DEFAULT 1 NOT NULL,
    DATA_CRIACAO  TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    ULTIMO_ACESSO TIMESTAMP,
    CONSTRAINT uq_usuario_email UNIQUE (EMAIL),
    CONSTRAINT ck_usuario_role  CHECK (ROLE IN ('admin','analista','viewer')),
    CONSTRAINT ck_usuario_ativo CHECK (ATIVO IN (0,1))
);

COMMENT ON TABLE  USUARIOS                IS 'Usuários do sistema com autenticação JWT';
COMMENT ON COLUMN USUARIOS.ROLE           IS 'admin=acesso total, analista=pode extrair, viewer=somente leitura';
COMMENT ON COLUMN USUARIOS.SENHA_HASH     IS 'BCrypt strength=12';

-- 2. CATALOGOS
CREATE TABLE CATALOGOS (
    ID                 NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    MARCA              VARCHAR2(50)    NOT NULL,
    MODELO             VARCHAR2(100)   NOT NULL,
    VERSAO             VARCHAR2(100)   NOT NULL,
    ANO_MODELO         NUMBER(4)       NOT NULL,
    SEGMENTO           VARCHAR2(20)    NOT NULL,
    STATUS             VARCHAR2(30)    NOT NULL,
    COBERTURA_PCT      NUMBER(5,2),
    COBERTURA_LIVE_PCT NUMBER(5,2),
    FONTES_UTILIZADAS  VARCHAR2(2000),
    DATA_EXTRACAO      TIMESTAMP       NOT NULL,
    DATA_CRIACAO       TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_catalogo_veiculo UNIQUE (MARCA, MODELO, VERSAO, ANO_MODELO),
    CONSTRAINT ck_catalogo_marca   CHECK (MARCA IN ('ford','toyota','vw','chevrolet','mitsubishi','nissan')),
    CONSTRAINT ck_catalogo_status  CHECK (STATUS IN ('completo','parcial','pendente_revisao')),
    CONSTRAINT ck_catalogo_segmento CHECK (SEGMENTO IN ('pickup','suv'))
);

COMMENT ON TABLE  CATALOGOS                   IS 'Um registro por veículo monitorado (marca+modelo+versao+ano)';
COMMENT ON COLUMN CATALOGOS.COBERTURA_PCT     IS 'Cobertura total incluindo KB seed fallback (0-100)';
COMMENT ON COLUMN CATALOGOS.COBERTURA_LIVE_PCT IS 'Cobertura da extração ao vivo antes do seed KB fallback';
COMMENT ON COLUMN CATALOGOS.FONTES_UTILIZADAS IS 'JSON array de URLs usadas na extração';

-- 3. CATALOGO_ATRIBUTOS
CREATE TABLE CATALOGO_ATRIBUTOS (
    ID                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    CATALOGO_ID          NUMBER         NOT NULL,
    ATRIBUTO             VARCHAR2(100)  NOT NULL,
    VALOR_TEXT           VARCHAR2(4000),
    VALOR_NUMBER         NUMBER,
    TIPO_VALOR           VARCHAR2(20)   NOT NULL,
    CONFIANCA            NUMBER(3,2)    NOT NULL,
    FONTE_PRIMARIA       VARCHAR2(1000),
    MERCADO_CONFIRMADO_BR NUMBER(1)     DEFAULT 1 NOT NULL,
    DIVERGENTE           NUMBER(1)      DEFAULT 0 NOT NULL,
    REVISADO_HUMANO      NUMBER(1)      DEFAULT 0 NOT NULL,
    SCHEMA_NIVEL         VARCHAR2(20)   DEFAULT 'core' NOT NULL,
    CONSTRAINT fk_atr_catalogo   FOREIGN KEY (CATALOGO_ID) REFERENCES CATALOGOS(ID) ON DELETE CASCADE,
    CONSTRAINT uq_atr_catalogo   UNIQUE (CATALOGO_ID, ATRIBUTO),
    CONSTRAINT ck_atr_tipo_valor CHECK (TIPO_VALOR IN ('text','number','boolean','null')),
    CONSTRAINT ck_atr_schema_nivel CHECK (SCHEMA_NIVEL IN ('core','estendido')),
    CONSTRAINT ck_atr_confianca  CHECK (CONFIANCA BETWEEN 0 AND 1),
    CONSTRAINT ck_atr_divergente CHECK (DIVERGENTE IN (0,1)),
    CONSTRAINT ck_atr_revisado   CHECK (REVISADO_HUMANO IN (0,1)),
    CONSTRAINT ck_atr_mercado_br CHECK (MERCADO_CONFIRMADO_BR IN (0,1))
);

COMMENT ON TABLE  CATALOGO_ATRIBUTOS              IS 'Um registro por atributo do schema canônico por veículo';
COMMENT ON COLUMN CATALOGO_ATRIBUTOS.VALOR_TEXT   IS 'Usado para strings e booleans (true/false como texto)';
COMMENT ON COLUMN CATALOGO_ATRIBUTOS.VALOR_NUMBER IS 'Usado para valores numéricos (int e float)';
COMMENT ON COLUMN CATALOGO_ATRIBUTOS.CONFIANCA    IS 'Score de confiança da extração: 0.0 a 1.0';

-- 4. CATALOGO_FONTES_SECUNDARIAS
CREATE TABLE CATALOGO_FONTES_SECUNDARIAS (
    ID          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ATRIBUTO_ID NUMBER        NOT NULL,
    URL         VARCHAR2(1000),
    VALOR_TEXT  VARCHAR2(4000),
    STATUS      VARCHAR2(20)  NOT NULL,
    CONFIANCA   NUMBER(3,2),
    CONSTRAINT fk_fonte_atributo FOREIGN KEY (ATRIBUTO_ID) REFERENCES CATALOGO_ATRIBUTOS(ID) ON DELETE CASCADE,
    CONSTRAINT ck_fonte_status   CHECK (STATUS IN ('confirma','diverge','complementa')),
    CONSTRAINT ck_fonte_conf     CHECK (CONFIANCA IS NULL OR CONFIANCA BETWEEN 0 AND 1)
);

COMMENT ON TABLE CATALOGO_FONTES_SECUNDARIAS IS 'Fontes de validação cruzada por atributo';

-- 5. CAPABILITY_SCORES
CREATE TABLE CAPABILITY_SCORES (
    ID                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    CATALOGO_ID          NUMBER         NOT NULL,
    CAPABILITY           VARCHAR2(100)  NOT NULL,
    NIVEL                NUMBER(2)      NOT NULL,
    NIVEL_MAXIMO_CLUSTER NUMBER(2),
    SCORE_BRUTO          NUMBER(5,2),
    SCORE_AJUSTADO       NUMBER(5,2),
    LIDER_MARCA          VARCHAR2(50),
    DATA_CALCULO         TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_cap_catalogo FOREIGN KEY (CATALOGO_ID) REFERENCES CATALOGOS(ID) ON DELETE CASCADE
);

COMMENT ON TABLE  CAPABILITY_SCORES             IS 'Score por área de capability (offroad, segurança, conforto)';
COMMENT ON COLUMN CAPABILITY_SCORES.NIVEL       IS 'Nível absoluto da capability: 0 (ausente) a 3 (líder)';
COMMENT ON COLUMN CAPABILITY_SCORES.SCORE_AJUSTADO IS 'Score normalizado dentro do cluster comparativo';

-- 6. SCORE_COMPETITIVO
CREATE TABLE SCORE_COMPETITIVO (
    ID                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    CATALOGO_ID       NUMBER        NOT NULL,
    SCORE_TECNICO     NUMBER(5,2),
    SCORE_VALOR       NUMBER(5,2),
    PERFIL_COMPETICAO VARCHAR2(50),
    CLUSTER_IDS       VARCHAR2(500),
    DATA_CALCULO      TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_score_catalogo FOREIGN KEY (CATALOGO_ID) REFERENCES CATALOGOS(ID) ON DELETE CASCADE
);

COMMENT ON TABLE  SCORE_COMPETITIVO              IS 'Score técnico e de valor por perfil de competição';
COMMENT ON COLUMN SCORE_COMPETITIVO.CLUSTER_IDS  IS 'JSON array com IDs dos catálogos do cluster comparativo';

-- 7. CHAT_CACHE
CREATE TABLE CHAT_CACHE (
    ID               NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    PERGUNTA_HASH    VARCHAR2(64)   NOT NULL,
    PERGUNTA_ORIGINAL CLOB          NOT NULL,
    RESPOSTA         CLOB           NOT NULL,
    FONTES_CITADAS   VARCHAR2(2000),
    DATA_CRIACAO     TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    DATA_EXPIRACAO   TIMESTAMP      NOT NULL,
    CONSTRAINT uq_cache_hash UNIQUE (PERGUNTA_HASH),
    CONSTRAINT ck_cache_exp  CHECK (DATA_EXPIRACAO > DATA_CRIACAO)
);

COMMENT ON TABLE  CHAT_CACHE               IS 'Cache de respostas do RAG com TTL de 30 dias';
COMMENT ON COLUMN CHAT_CACHE.PERGUNTA_HASH IS 'SHA-256 hexadecimal da pergunta normalizada';

-- 8. TERMOS_PENDENTES
CREATE TABLE TERMOS_PENDENTES (
    ID                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    TERMO             VARCHAR2(200)  NOT NULL,
    CONTEXTO          VARCHAR2(2000),
    ATRIBUTO_SUGERIDO VARCHAR2(100),
    FONTE             VARCHAR2(1000),
    DATA_DETECTADO    TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    STATUS            VARCHAR2(20)   DEFAULT 'pendente' NOT NULL,
    REVISADO_POR      VARCHAR2(100),
    DATA_REVISAO      TIMESTAMP,
    CONSTRAINT ck_termo_status CHECK (STATUS IN ('pendente','mapeado','descartado'))
);

COMMENT ON TABLE TERMOS_PENDENTES IS 'Termos técnicos desconhecidos detectados pelo agente IA para revisão humana';
