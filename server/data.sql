-- Arquivo para popular as tabelas de lookup com dados iniciais.
-- Execute este script no seu banco de dados 'SisCasa'.

-- Limpa as tabelas antes de inserir para evitar duplicatas se o script for executado novamente.
-- CUIDADO: Isso apaga todos os dados existentes nessas tabelas.
DELETE FROM MUNICIPIO;
DELETE FROM HOSPITAL;
DELETE FROM RELIGIAO;
DELETE FROM RACA;
DELETE FROM GRAU_PARENTESCO;
DELETE FROM TIPO_BENEFICIO;
DELETE FROM UF;

-- Populando a tabela UF (Unidade Federativa)
-- Assumindo que 1 = Rio de Janeiro. Adicione outros estados se necessário.
INSERT INTO UF (COD_UF, NOME_UF) VALUES (1, 'Rio de Janeiro');

-- Populando a tabela MUNICIPIO
INSERT INTO MUNICIPIO (COD_MUN, NOME_MUN, COD_UF) VALUES
(1, 'Niterói', 1),
(2, 'Rio de Janeiro', 1),
(3, 'São Gonçalo', 1),
(4, 'Maricá', 1);

-- Populando a tabela HOSPITAL
-- Note que 'Copa D''Or' usa duas aspas simples para escapar o caractere especial em SQL.
INSERT INTO HOSPITAL (COD_HOS, NOME_HOS) VALUES
(1, 'Hospital das Clínicas'),
(2, 'Hospital Copa D''Or'),
(3, 'Hospital Santa Marta'),
(4, 'Hospital Sírio-Libanês');

-- Populando a tabela RELIGIAO
INSERT INTO RELIGIAO (COD_REL, DESC_REL) VALUES
(1, 'Católica'),
(2, 'Evangélica'),
(3, 'Espírita'),
(4, 'Sem Religião'),
(5, 'Outra');

-- Populando a tabela RACA
INSERT INTO RACA (COD_RAC, DESC_RAC) VALUES
(1, 'Branca'),
(2, 'Preta'),
(3, 'Parda'),
(4, 'Amarela'),
(5, 'Indígena');

-- Populando a tabela TIPO_BENEFICIO
INSERT INTO TIPO_BENEFICIO (COD_TIB, DESC_TIB) VALUES
(1, 'Cesta Básica'),
(2, 'Hospedaria'),
(3, 'Apoio Psicológico');

-- Populando a tabela GRAU_PARENTESCO (valores de exemplo)
INSERT INTO GRAU_PARENTESCO (COD_GPA, DESC_GPA) VALUES
(1, 'Pai'),
(2, 'Mãe'),
(3, 'Filho(a)'),
(4, 'Irmão/Irmã'),
(5, 'Cônjuge'),
(6, 'Avô/Avó'),
(7, 'Tio(a)'),
(8, 'Primo(a)'),
(9, 'Outro');