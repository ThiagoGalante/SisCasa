const express = require('express');
const pool = require('./db');
const cors = require('cors');
const getLookupId = require('./utils/getLookupId');

const app = express();

// --- Middlewares ---
// Permite que o servidor receba JSON no corpo das requisições
app.use(express.json());
// Habilita o CORS para permitir requisições do seu frontend
app.use(cors());

// --- Endpoints de Lookup ---

// Função genérica para criar endpoints de lookup
const createLookupEndpoint = (path, tableName, idColumn, nameColumn) => {
  app.get(path, async (req, res) => {
    try {
      // Usamos 'AS' para padronizar os nomes das colunas para o frontend
      const { rows } = await pool.query(`SELECT ${idColumn} as id, ${nameColumn} as nome FROM ${tableName} ORDER BY ${nameColumn}`);
      res.json(rows);
    } catch (error) {
      console.error(`Erro ao buscar dados de ${tableName}:`, error);
      res.status(500).json({ error: `Erro ao buscar dados de ${tableName}.` });
    }
  });
};

createLookupEndpoint('/api/tipos-beneficio', 'TIPO_BENEFICIO', 'COD_TIB', 'DESC_TIB');
createLookupEndpoint('/api/cidades', 'MUNICIPIO', 'NOME_MUN', 'NOME_MUN'); // Nome é o próprio valor
createLookupEndpoint('/api/racas', 'RACA', 'DESC_RAC', 'DESC_RAC'); // Nome é o próprio valor
createLookupEndpoint('/api/religioes', 'RELIGIAO', 'DESC_REL', 'DESC_REL'); // Nome é o próprio valor
createLookupEndpoint('/api/hospitais', 'HOSPITAL', 'NOME_HOS', 'NOME_HOS'); // Nome é o próprio valor
createLookupEndpoint('/api/graus-parentesco', 'GRAU_PARENTESCO', 'DESC_GPA', 'DESC_GPA'); // Nome é o próprio valor

// --- Endpoints da API ---

/**
 * Endpoint para cadastrar um novo beneficiário.
 * Recebe os dados do formulário e insere no banco de dados usando uma transação.
 */
app.post('/api/beneficiarios', async (req, res) => {
  const {
    nro_cad, data_cad, nome, endereco, cidade, cep, email, data_nasc, sexo,
    raca, religiao, fumante, cpf, rg, hospital, mat_hospital, patologia, tipo_beneficio,
    medicacao, profissao, fone, observacao, responsaveis, familia
  } = req.body;

  const client = await pool.connect();

  try {
    // Inicia a transação
    await client.query('BEGIN');

    // 1. Buscar os IDs das tabelas de lookup
    const codRel = await getLookupId(client, 'RELIGIAO', 'DESC_REL', religiao);
    const codRac = await getLookupId(client, 'RACA', 'DESC_RAC', raca);
    const codMun = await getLookupId(client, 'MUNICIPIO', 'NOME_MUN', cidade);
    const codHos = await getLookupId(client, 'HOSPITAL', 'NOME_HOS', hospital);

    // 2. Gerar um novo NUMCAD_PES (solução simples, não ideal para alta concorrência)
    const maxIdResult = await client.query('SELECT MAX(numcad_pes) as max_id FROM pessoas');
    const newNumCad = (maxIdResult.rows[0].max_id || 0) + 1;

    // 3. Inserir na tabela 'PESSOAS'
    const pessoaQuery = `
      INSERT INTO PESSOAS (
        numcad_pes, tipo_pes, datacad_pes, nome_pes, rg_pes, cpf_pes, sexo_pes,
        datanasc_pes, endereco_pes, cep_pes, email_pes, profissao_pes, fone_pes,
        patologia_pes, matricula_hosp_pes, medicamento_pes, flag_fumante_pes,
        observacoes_pes, cod_rel, cod_rac, cod_mun, cod_hos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `;
    const pessoaValues = [
      newNumCad, 'B', data_cad, nome, rg, cpf, sexo ? sexo.charAt(0) : null,
      data_nasc, endereco, cep, email, profissao, fone, 
      patologia, mat_hospital, medicacao, fumante === 'sim' ? '1' : '0',
      observacao, codRel, codRac, codMun, codHos
    ];
    await client.query(pessoaQuery, pessoaValues);

    // 4. Inserir na tabela 'BENEFICIARIOS' usando o tipo de benefício do formulário
    await client.query('INSERT INTO BENEFICIARIOS (cod_tib, numcad_pes) VALUES ($1, $2)', [tipo_beneficio, newNumCad]);

    // Função para inserir pessoas (responsáveis/familiares) e retornar o ID
    const inserirPessoaRelacionada = async (pessoa, tipo) => {
      const maxIdResult = await client.query('SELECT MAX(numcad_pes) as max_id FROM pessoas');
      const newId = (maxIdResult.rows[0].max_id || 0) + 1;
      const query = 'INSERT INTO PESSOAS (numcad_pes, tipo_pes, nome_pes, endereco_pes, fone_pes) VALUES ($1, $2, $3, $4, $5)';
      await client.query(query, [newId, tipo, pessoa.nome, pessoa.endereco, pessoa.fone]);
      return newId;
    };

    // 5. Insere na tabela 'RESPONSAVEIS'
    if (responsaveis && responsaveis.length > 0) {
      for (const resp of responsaveis) {
        if (resp.nome || resp.parentesco || resp.endereco || resp.fone) {
          const numcadRes = await inserirPessoaRelacionada(resp, 'R'); // 'R' para Responsável
          const codGpa = await getLookupId(client, 'GRAU_PARENTESCO', 'DESC_GPA', resp.parentesco);
          if (codGpa) {
            await client.query('INSERT INTO RESPONSAVEIS (numcad_ben, numcad_res, cod_gpa) VALUES ($1, $2, $3)', [newNumCad, numcadRes, codGpa]);
          }
        }
      }
    }

    // 6. Insere na tabela 'COMPOSICAO_FAMILIAR'
    if (familia && familia.length > 0) {
      for (const membro of familia) {
        if (membro.nome || membro.parentesco || membro.endereco || membro.fone) {
          const numcadFam = await inserirPessoaRelacionada(membro, 'F'); // 'F' para Familiar
          const codGpa = await getLookupId(client, 'GRAU_PARENTESCO', 'DESC_GPA', membro.parentesco);
          if (codGpa) {
            await client.query('INSERT INTO COMPOSICAO_FAMILIAR (numcad_ben, numcad_fam, cod_gpa) VALUES ($1, $2, $3)', [newNumCad, numcadFam, codGpa]);
          }
        }
      }
    }

    // Finaliza a transação com sucesso
    await client.query('COMMIT');
    res.status(201).json({ message: 'Beneficiário cadastrado com sucesso!', id: newNumCad });

  } catch (error) {
    // Desfaz a transação em caso de erro
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar beneficiário:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao salvar os dados.', details: error.message });
  } finally {
    // Libera a conexão com o banco de dados
    client.release();
  }
});

// Endpoint para listar todos os beneficiários
app.get('/api/beneficiarios', async (req, res) => {
  try {
    const query = `
    SELECT
      p.numcad_pes AS "id",
      p.numcad_pes AS "numeroCadastro",
      p.nome_pes AS "nome",
      p.cpf_pes AS "cpf",
      p.datacad_pes AS "dataCadastro",
      p.datanasc_pes AS "dataNascimento",
      p.endereco_pes AS "endereco",
      mun.nome_mun AS "cidade",
      p.cep_pes AS "cep",
      p.email_pes AS "email",
      CASE p.sexo_pes WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE '' END AS "sexo",
      r.desc_rac AS "raca",
      rel.desc_rel AS "religiao",
      p.flag_fumante_pes AS "fumante",
      p.rg_pes AS "rg",
      h.nome_hos AS "hospital",
      p.matricula_hosp_pes AS "matriculaHospital",
      p.patologia_pes AS "patologia",
      p.medicamento_pes AS "medicacao",
      p.profissao_pes AS "profissao",
      p.observacoes_pes AS "observacao",
      COALESCE(
        (SELECT json_agg(json_build_object(
            'nome', resp_p.nome_pes,
            'parentesco', gpa_r.desc_gpa,
            'endereco', resp_p.endereco_pes,
            'fone', resp_p.fone_pes
          ))
          FROM RESPONSAVEIS resp
          JOIN PESSOAS resp_p ON resp.numcad_res = resp_p.numcad_pes
          LEFT JOIN GRAU_PARENTESCO gpa_r ON resp.cod_gpa = gpa_r.cod_gpa
          WHERE resp.numcad_ben = p.numcad_pes),
        '[]'::json
      ) AS "responsaveis",
      COALESCE(
        (SELECT json_agg(json_build_object(
            'nome', fam_p.nome_pes,
            'parentesco', gpa_f.desc_gpa,
            'endereco', fam_p.endereco_pes,
            'fone', fam_p.fone_pes
          ))
          FROM COMPOSICAO_FAMILIAR cf
          JOIN PESSOAS fam_p ON cf.numcad_fam = fam_p.numcad_pes
          LEFT JOIN GRAU_PARENTESCO gpa_f ON cf.cod_gpa = gpa_f.cod_gpa
          WHERE cf.numcad_ben = p.numcad_pes),
        '[]'::json
      ) AS "familia"
    FROM 
      PESSOAS p
    JOIN 
      BENEFICIARIOS b ON p.numcad_pes = b.numcad_pes
    LEFT JOIN 
      RACA r ON p.cod_rac = r.cod_rac
    LEFT JOIN 
      RELIGIAO rel ON p.cod_rel = rel.cod_rel
    LEFT JOIN 
      MUNICIPIO mun ON p.cod_mun = mun.cod_mun
    LEFT JOIN 
      HOSPITAL h ON p.cod_hos = h.cod_hos
    WHERE 
      p.tipo_pes = 'B'
    ORDER BY 
      p.nome_pes;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar beneficiários:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar os dados.' });
  }
});

module.exports = app;

