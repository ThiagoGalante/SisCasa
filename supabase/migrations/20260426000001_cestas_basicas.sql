-- Migration: Modulo de Cestas Basicas
-- Data: 2026-04-26
-- Descricao: Tabelas para gestao de itens, estoque, entregas de cestas basicas
--            e auditoria de movimentacoes.

-- Itens que podem compor uma cesta basica (lookup mestre)
CREATE TABLE IF NOT EXISTS ITENS_CESTA (
    COD_ITE SERIAL PRIMARY KEY,
    DESC_ITE VARCHAR(100) NOT NULL UNIQUE,
    UNIDADE_ITE VARCHAR(20),
    ATIVO_ITE BOOLEAN DEFAULT TRUE,
    DATA_CRIACAO TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quantidade atual em estoque por item
CREATE TABLE IF NOT EXISTS ESTOQUE_ITENS (
    COD_ITE INTEGER PRIMARY KEY REFERENCES ITENS_CESTA(COD_ITE) ON DELETE RESTRICT,
    QTD_EST INTEGER NOT NULL DEFAULT 0 CHECK (QTD_EST >= 0),
    DATA_ATUALIZACAO TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registro de cada entrega de cesta a um beneficiario
CREATE TABLE IF NOT EXISTS CESTAS (
    COD_CES SERIAL PRIMARY KEY,
    NUMCAD_BEN INTEGER NOT NULL REFERENCES PESSOAS(NUMCAD_PES) ON DELETE RESTRICT,
    DT_CES DATE NOT NULL,
    OBS_CES TEXT,
    DATA_CRIACAO TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DATA_ATUALIZACAO TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CESTAS_BEN_DATA_UQ UNIQUE (NUMCAD_BEN, DT_CES)
);

-- Composicao de cada cesta entregue (itens e quantidades)
CREATE TABLE IF NOT EXISTS CESTA_ITENS (
    COD_CES INTEGER NOT NULL REFERENCES CESTAS(COD_CES) ON DELETE CASCADE,
    COD_ITE INTEGER NOT NULL REFERENCES ITENS_CESTA(COD_ITE) ON DELETE RESTRICT,
    QTD INTEGER NOT NULL CHECK (QTD > 0),
    PRIMARY KEY (COD_CES, COD_ITE)
);

-- Auditoria de movimentacoes de estoque
CREATE TABLE IF NOT EXISTS ESTOQUE_MOV (
    COD_MOV SERIAL PRIMARY KEY,
    COD_ITE INTEGER NOT NULL REFERENCES ITENS_CESTA(COD_ITE),
    QTD_MOV INTEGER NOT NULL CHECK (QTD_MOV > 0),
    TIPO_MOV CHAR(1) NOT NULL CHECK (TIPO_MOV IN ('E','S')),
    DT_MOV TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    COD_CES INTEGER REFERENCES CESTAS(COD_CES) ON DELETE SET NULL,
    OBS_MOV TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_cestas_dt ON CESTAS(DT_CES);
CREATE INDEX IF NOT EXISTS idx_cestas_ben ON CESTAS(NUMCAD_BEN);
CREATE INDEX IF NOT EXISTS idx_cesta_itens_ite ON CESTA_ITENS(COD_ITE);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_ite ON ESTOQUE_MOV(COD_ITE);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_dt ON ESTOQUE_MOV(DT_MOV);

-- Comentarios
COMMENT ON TABLE ITENS_CESTA IS 'Itens disponiveis para compor cestas basicas (lookup mestre)';
COMMENT ON TABLE ESTOQUE_ITENS IS 'Quantidade atual em estoque por item';
COMMENT ON TABLE CESTAS IS 'Registro de cada entrega de cesta basica a um beneficiario';
COMMENT ON TABLE CESTA_ITENS IS 'Composicao de cada cesta entregue (itens e quantidades)';
COMMENT ON TABLE ESTOQUE_MOV IS 'Auditoria de movimentacoes de estoque (entradas por doacao, saidas por entrega)';
COMMENT ON COLUMN ITENS_CESTA.UNIDADE_ITE IS 'Unidade de medida do item (kg, L, un, pacote, etc.)';
COMMENT ON COLUMN ITENS_CESTA.ATIVO_ITE IS 'Indica se o item esta disponivel para uso em novas cestas';
COMMENT ON COLUMN CESTAS.OBS_CES IS 'Observacoes sobre a entrega (opcional)';
COMMENT ON CONSTRAINT CESTAS_BEN_DATA_UQ ON CESTAS IS 'Impede registro duplicado de entrega para o mesmo beneficiario na mesma data (US03)';
COMMENT ON COLUMN ESTOQUE_MOV.TIPO_MOV IS 'E=entrada (doacao recebida); S=saida (entrega de cesta)';
COMMENT ON COLUMN ESTOQUE_MOV.COD_CES IS 'Referencia a entrega que originou a saida; NULL para entradas';
