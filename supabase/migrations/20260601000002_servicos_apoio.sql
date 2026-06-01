-- Migration: Modulo de Servicos de Apoio (v0)
-- Data: 2026-06-01
-- Estoria: v0 do modulo de Servicos de Apoio
-- Descricao: Registro de atendimentos/servicos prestados a beneficiarios
--            (refeicao, lavanderia, banho, transporte, descanso, acolhimento).

-- 1. Catalogo de tipos de servico (lookup)
CREATE TABLE IF NOT EXISTS TIPO_SERVICO (
    COD_TSER   SERIAL PRIMARY KEY,
    NOME_TSER  VARCHAR(80) NOT NULL UNIQUE,
    ATIVO_TSER BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE TIPO_SERVICO IS 'Tipos de servico de apoio oferecidos pela Casa do Aconchego';

INSERT INTO TIPO_SERVICO (NOME_TSER) VALUES
  ('Refeicao'),
  ('Lavanderia'),
  ('Banho'),
  ('Transporte'),
  ('Descanso'),
  ('Acolhimento')
ON CONFLICT (NOME_TSER) DO NOTHING;

-- 2. Atendimentos (servicos prestados a um beneficiario)
CREATE TABLE IF NOT EXISTS SERVICO_APOIO (
    COD_SAP        SERIAL PRIMARY KEY,
    NUMCAD_BEN     INTEGER NOT NULL REFERENCES PESSOAS(NUMCAD_PES) ON DELETE RESTRICT,
    COD_TSER       INTEGER NOT NULL REFERENCES TIPO_SERVICO(COD_TSER) ON DELETE RESTRICT,
    DT_SAP         DATE NOT NULL,
    OBS_SAP        VARCHAR(500),
    DATA_CRIACAO   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DATA_ATUALIZACAO TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sap_ben  ON SERVICO_APOIO(NUMCAD_BEN);
CREATE INDEX IF NOT EXISTS idx_sap_tser ON SERVICO_APOIO(COD_TSER);
CREATE INDEX IF NOT EXISTS idx_sap_data ON SERVICO_APOIO(DT_SAP);

COMMENT ON TABLE SERVICO_APOIO IS 'Atendimentos: servicos de apoio prestados a beneficiarios';
