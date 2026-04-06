-- Migration: Criar tabela USUARIOS para autenticação
-- Data: 2026-04-06
-- Descrição: Tabela para armazenar usuários do sistema vinculados ao Supabase Auth

CREATE TABLE IF NOT EXISTS USUARIOS (
    ID_USUARIO SERIAL PRIMARY KEY,
    SUPABASE_USER_ID UUID UNIQUE NOT NULL,
    EMAIL VARCHAR(255) NOT NULL UNIQUE,
    NOME_COMPLETO VARCHAR(100),
    ATIVO BOOLEAN DEFAULT TRUE,
    DATA_CRIACAO TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DATA_ATUALIZACAO TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_usuarios_supabase_id ON USUARIOS(SUPABASE_USER_ID);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON USUARIOS(EMAIL);

-- Comentários nas colunas
COMMENT ON TABLE USUARIOS IS 'Tabela de usuários do sistema vinculados ao Supabase Auth';
COMMENT ON COLUMN USUARIOS.SUPABASE_USER_ID IS 'ID do usuário no Supabase Auth (UUID)';
COMMENT ON COLUMN USUARIOS.EMAIL IS 'Email do usuário (deve corresponder ao email no Supabase)';
COMMENT ON COLUMN USUARIOS.NOME_COMPLETO IS 'Nome completo do usuário';
COMMENT ON COLUMN USUARIOS.ATIVO IS 'Indica se o usuário está ativo no sistema';
COMMENT ON COLUMN USUARIOS.DATA_CRIACAO IS 'Data e hora de criação do registro';
COMMENT ON COLUMN USUARIOS.DATA_ATUALIZACAO IS 'Data e hora da última atualização';
