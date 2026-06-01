-- Migration: Atualizar modulo de beneficiarios conforme feedback do PO
-- Data: 2026-06-01
-- Estoria: Atualizar o modulo de beneficiarios conforme feedback do PO
-- Descricao: Adiciona campos de paridade com o sistema legado (bairro, contato/fone
--            de emergencia, medico, restricoes, foto) e o conceito de Projetos (N:N).

-- 1. Novos campos escalares em PESSOAS
--    (BAIRRO_PES ja existe no schema base; os demais sao novos)
ALTER TABLE PESSOAS ADD COLUMN IF NOT EXISTS CONTATO_EMG_PES VARCHAR(100);
ALTER TABLE PESSOAS ADD COLUMN IF NOT EXISTS FONE_EMG_PES    VARCHAR(50);
ALTER TABLE PESSOAS ADD COLUMN IF NOT EXISTS MEDICO_PES      VARCHAR(100);
ALTER TABLE PESSOAS ADD COLUMN IF NOT EXISTS RESTR_ALIM_PES  VARCHAR(250);
ALTER TABLE PESSOAS ADD COLUMN IF NOT EXISTS RESTR_MED_PES   VARCHAR(250);
ALTER TABLE PESSOAS ADD COLUMN IF NOT EXISTS FOTO_URL_PES    TEXT;

COMMENT ON COLUMN PESSOAS.CONTATO_EMG_PES IS 'Nome do contato de emergencia';
COMMENT ON COLUMN PESSOAS.FONE_EMG_PES IS 'Telefone do contato de emergencia';
COMMENT ON COLUMN PESSOAS.MEDICO_PES IS 'Medico responsavel';
COMMENT ON COLUMN PESSOAS.RESTR_ALIM_PES IS 'Restricao alimentar';
COMMENT ON COLUMN PESSOAS.RESTR_MED_PES IS 'Restricao medica';
COMMENT ON COLUMN PESSOAS.FOTO_URL_PES IS 'URL publica da foto do beneficiario (Supabase Storage)';

-- 2. Projetos (lookup) e relacao N:N com beneficiarios
CREATE TABLE IF NOT EXISTS PROJETOS (
    COD_PROJ     SERIAL PRIMARY KEY,
    NOME_PROJ    VARCHAR(100) NOT NULL UNIQUE,
    ATIVO_PROJ   BOOLEAN DEFAULT TRUE,
    DATA_CRIACAO TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS BENEFICIARIO_PROJETOS (
    NUMCAD_BEN INTEGER NOT NULL REFERENCES PESSOAS(NUMCAD_PES) ON DELETE CASCADE,
    COD_PROJ   INTEGER NOT NULL REFERENCES PROJETOS(COD_PROJ) ON DELETE RESTRICT,
    PRIMARY KEY (NUMCAD_BEN, COD_PROJ)
);

CREATE INDEX IF NOT EXISTS idx_benproj_proj ON BENEFICIARIO_PROJETOS(COD_PROJ);

COMMENT ON TABLE PROJETOS IS 'Projetos/programas da Casa do Aconchego (lookup)';
COMMENT ON TABLE BENEFICIARIO_PROJETOS IS 'Relacao N:N entre beneficiarios e projetos';

-- 3. Seed inicial de projetos (programas institucionais)
INSERT INTO PROJETOS (NOME_PROJ) VALUES
  ('Hospedaria'),
  ('Tempo de Aconchego'),
  ('De Volta para Casa'),
  ('Acolhimento da Crianca')
ON CONFLICT (NOME_PROJ) DO NOTHING;

-- 4. Storage: politicas do bucket de fotos (o bucket e criado via config.toml).
--    Permite upload/atualizacao por usuarios autenticados e leitura publica.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='fotos_beneficiarios_insert') THEN
    CREATE POLICY fotos_beneficiarios_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'fotos-beneficiarios');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='fotos_beneficiarios_update') THEN
    CREATE POLICY fotos_beneficiarios_update ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'fotos-beneficiarios');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='fotos_beneficiarios_select') THEN
    CREATE POLICY fotos_beneficiarios_select ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'fotos-beneficiarios');
  END IF;
END $$;
