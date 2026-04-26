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


// --- Endpoints de Cestas Básicas (itens e estoque) ---

app.get('/api/cestas/itens', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT cod_ite     AS "id",
             desc_ite    AS "descricao",
             unidade_ite AS "unidade",
             ativo_ite   AS "ativo"
        FROM ITENS_CESTA
       WHERE ativo_ite = true
       ORDER BY desc_ite
    `);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar itens de cesta:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar itens de cesta.', details: error.message });
  }
});

app.get('/api/cestas/estoque', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.cod_ite               AS "id",
             i.desc_ite              AS "descricao",
             i.unidade_ite           AS "unidade",
             COALESCE(e.qtd_est, 0)  AS "qtdEst",
             e.data_atualizacao      AS "ultimaAtualizacao"
        FROM ITENS_CESTA i
        LEFT JOIN ESTOQUE_ITENS e ON e.cod_ite = i.cod_ite
       WHERE i.ativo_ite = true
       ORDER BY i.desc_ite
    `);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar estoque de cestas:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar estoque.', details: error.message });
  }
});

app.post('/api/cestas/estoque/entrada', async (req, res) => {
  const { itemId, quantidade, observacao } = req.body;

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ error: 'itemId deve ser um inteiro positivo.' });
  }
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ error: 'quantidade deve ser um inteiro positivo.' });
  }
  if (observacao && typeof observacao === 'string' && observacao.length > 500) {
    return res.status(400).json({ error: 'observacao deve ter no máximo 500 caracteres.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemResult = await client.query(
      'SELECT cod_ite FROM ITENS_CESTA WHERE cod_ite = $1 AND ativo_ite = true',
      [itemId]
    );
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item não encontrado ou inativo.' });
    }

    const estoqueResult = await client.query(`
      INSERT INTO ESTOQUE_ITENS (cod_ite, qtd_est, data_atualizacao)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (cod_ite) DO UPDATE
         SET qtd_est = ESTOQUE_ITENS.qtd_est + EXCLUDED.qtd_est,
             data_atualizacao = CURRENT_TIMESTAMP
      RETURNING qtd_est
    `, [itemId, quantidade]);

    const movResult = await client.query(`
      INSERT INTO ESTOQUE_MOV (cod_ite, qtd_mov, tipo_mov, obs_mov)
           VALUES ($1, $2, 'E', $3)
      RETURNING cod_mov
    `, [itemId, quantidade, observacao || null]);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Doação registrada com sucesso.',
      codMov: movResult.rows[0].cod_mov,
      qtdEstAtual: estoqueResult.rows[0].qtd_est
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar entrada de estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar doação.', details: error.message });
  } finally {
    client.release();
  }
});


// --- Endpoints de Cestas Básicas (CRUD de entregas) ---

app.get('/api/cestas', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const beneficiario = req.query.beneficiario || null;
    const dataInicio = req.query.dataInicio || null;
    const dataFim = req.query.dataFim || null;

    const filters = [];
    const params = [];
    let idx = 1;
    if (beneficiario) {
      filters.push(`p.nome_pes ILIKE $${idx++}`);
      params.push(`%${beneficiario}%`);
    }
    if (dataInicio) {
      filters.push(`c.dt_ces >= $${idx++}`);
      params.push(dataInicio);
    }
    if (dataFim) {
      filters.push(`c.dt_ces <= $${idx++}`);
      params.push(dataFim);
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM CESTAS c
         JOIN PESSOAS p ON p.numcad_pes = c.numcad_ben
         ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(
      `SELECT c.cod_ces       AS "id",
              c.numcad_ben    AS "beneficiarioId",
              p.nome_pes      AS "beneficiarioNome",
              c.dt_ces        AS "dtCes",
              c.obs_ces       AS "obsCes",
              c.data_criacao  AS "criadoEm",
              c.data_atualizacao AS "atualizadoEm",
              (SELECT COUNT(*)::int FROM CESTA_ITENS ci WHERE ci.cod_ces = c.cod_ces) AS "qtdTiposItens",
              (SELECT COALESCE(SUM(ci.qtd), 0)::int FROM CESTA_ITENS ci WHERE ci.cod_ces = c.cod_ces) AS "qtdTotalItens"
         FROM CESTAS c
         JOIN PESSOAS p ON p.numcad_pes = c.numcad_ben
         ${whereClause}
         ORDER BY c.dt_ces DESC, c.cod_ces DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erro ao listar cestas:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar cestas.', details: error.message });
  }
});

const validateCestaBody = (body) => {
  const { numcadBen, dtCes, itens } = body;
  if (!Number.isInteger(numcadBen) || numcadBen <= 0) {
    return 'numcadBen deve ser um inteiro positivo.';
  }
  if (!dtCes || !/^\d{4}-\d{2}-\d{2}$/.test(dtCes)) {
    return 'dtCes deve estar no formato YYYY-MM-DD.';
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return 'itens deve ser um array não-vazio.';
  }
  for (const it of itens) {
    if (!Number.isInteger(it.itemId) || it.itemId <= 0 ||
        !Number.isInteger(it.quantidade) || it.quantidade <= 0) {
      return 'cada item deve ter itemId e quantidade inteiros positivos.';
    }
  }
  const itemIds = itens.map(it => it.itemId);
  if (new Set(itemIds).size !== itemIds.length) {
    return 'cada itemId pode aparecer apenas uma vez por cesta.';
  }
  return null;
};

app.post('/api/cestas', async (req, res) => {
  const validationError = validateCestaBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { numcadBen, dtCes, obsCes, itens } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const benResult = await client.query(
      `SELECT numcad_pes FROM PESSOAS WHERE numcad_pes = $1 AND tipo_pes = 'B'`,
      [numcadBen]
    );
    if (benResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Beneficiário não encontrado.' });
    }

    for (const it of itens) {
      const stockResult = await client.query(
        `SELECT COALESCE(e.qtd_est, 0) AS qtd_est, i.ativo_ite
           FROM ITENS_CESTA i
           LEFT JOIN ESTOQUE_ITENS e ON e.cod_ite = i.cod_ite
          WHERE i.cod_ite = $1`,
        [it.itemId]
      );
      if (stockResult.rows.length === 0 || !stockResult.rows[0].ativo_ite) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Item ${it.itemId} não encontrado ou inativo.` });
      }
      if (stockResult.rows[0].qtd_est < it.quantidade) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Estoque insuficiente para item ${it.itemId}. Disponível: ${stockResult.rows[0].qtd_est}, solicitado: ${it.quantidade}.`
        });
      }
    }

    let cestaResult;
    try {
      cestaResult = await client.query(
        `INSERT INTO CESTAS (numcad_ben, dt_ces, obs_ces)
              VALUES ($1, $2, $3)
              RETURNING cod_ces`,
        [numcadBen, dtCes, obsCes || null]
      );
    } catch (err) {
      if (err.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Já existe uma entrega registrada para este beneficiário nesta data.' });
      }
      throw err;
    }
    const codCes = cestaResult.rows[0].cod_ces;

    for (const it of itens) {
      await client.query(
        `INSERT INTO CESTA_ITENS (cod_ces, cod_ite, qtd) VALUES ($1, $2, $3)`,
        [codCes, it.itemId, it.quantidade]
      );
      await client.query(
        `UPDATE ESTOQUE_ITENS
            SET qtd_est = qtd_est - $1, data_atualizacao = CURRENT_TIMESTAMP
          WHERE cod_ite = $2`,
        [it.quantidade, it.itemId]
      );
      await client.query(
        `INSERT INTO ESTOQUE_MOV (cod_ite, qtd_mov, tipo_mov, cod_ces, obs_mov)
              VALUES ($1, $2, 'S', $3, $4)`,
        [it.itemId, it.quantidade, codCes, `Entrega cesta #${codCes}`]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Entrega de cesta registrada com sucesso.', id: codCes });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar entrega de cesta:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar cesta.', details: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/cestas/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido.' });
  }
  try {
    const cestaResult = await pool.query(
      `SELECT c.cod_ces       AS "id",
              c.numcad_ben    AS "beneficiarioId",
              p.nome_pes      AS "beneficiarioNome",
              c.dt_ces        AS "dtCes",
              c.obs_ces       AS "obsCes",
              c.data_criacao  AS "criadoEm",
              c.data_atualizacao AS "atualizadoEm"
         FROM CESTAS c
         JOIN PESSOAS p ON p.numcad_pes = c.numcad_ben
        WHERE c.cod_ces = $1`,
      [id]
    );
    if (cestaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cesta não encontrada.' });
    }
    const itensResult = await pool.query(
      `SELECT ci.cod_ite     AS "itemId",
              i.desc_ite     AS "descricao",
              i.unidade_ite  AS "unidade",
              ci.qtd         AS "quantidade"
         FROM CESTA_ITENS ci
         JOIN ITENS_CESTA i ON i.cod_ite = ci.cod_ite
        WHERE ci.cod_ces = $1
        ORDER BY i.desc_ite`,
      [id]
    );
    res.json({ ...cestaResult.rows[0], itens: itensResult.rows });
  } catch (error) {
    console.error(`Erro ao buscar cesta ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.', details: error.message });
  }
});

app.put('/api/cestas/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido.' });
  }

  const validationError = validateCestaBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { numcadBen, dtCes, obsCes, itens } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cestaResult = await client.query(
      `SELECT cod_ces FROM CESTAS WHERE cod_ces = $1 FOR UPDATE`,
      [id]
    );
    if (cestaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cesta não encontrada.' });
    }

    const benResult = await client.query(
      `SELECT numcad_pes FROM PESSOAS WHERE numcad_pes = $1 AND tipo_pes = 'B'`,
      [numcadBen]
    );
    if (benResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Beneficiário não encontrado.' });
    }

    const oldItensResult = await client.query(
      `SELECT cod_ite, qtd FROM CESTA_ITENS WHERE cod_ces = $1`,
      [id]
    );
    for (const old of oldItensResult.rows) {
      await client.query(
        `UPDATE ESTOQUE_ITENS
            SET qtd_est = qtd_est + $1, data_atualizacao = CURRENT_TIMESTAMP
          WHERE cod_ite = $2`,
        [old.qtd, old.cod_ite]
      );
      await client.query(
        `INSERT INTO ESTOQUE_MOV (cod_ite, qtd_mov, tipo_mov, cod_ces, obs_mov)
              VALUES ($1, $2, 'E', $3, $4)`,
        [old.cod_ite, old.qtd, id, `Estorno por edição da cesta #${id}`]
      );
    }
    await client.query(`DELETE FROM CESTA_ITENS WHERE cod_ces = $1`, [id]);

    for (const it of itens) {
      const stockResult = await client.query(
        `SELECT COALESCE(e.qtd_est, 0) AS qtd_est, i.ativo_ite
           FROM ITENS_CESTA i
           LEFT JOIN ESTOQUE_ITENS e ON e.cod_ite = i.cod_ite
          WHERE i.cod_ite = $1`,
        [it.itemId]
      );
      if (stockResult.rows.length === 0 || !stockResult.rows[0].ativo_ite) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Item ${it.itemId} não encontrado ou inativo.` });
      }
      if (stockResult.rows[0].qtd_est < it.quantidade) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Estoque insuficiente para item ${it.itemId}. Disponível: ${stockResult.rows[0].qtd_est}, solicitado: ${it.quantidade}.`
        });
      }
    }

    try {
      await client.query(
        `UPDATE CESTAS
            SET numcad_ben = $1, dt_ces = $2, obs_ces = $3, data_atualizacao = CURRENT_TIMESTAMP
          WHERE cod_ces = $4`,
        [numcadBen, dtCes, obsCes || null, id]
      );
    } catch (err) {
      if (err.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Já existe uma entrega registrada para este beneficiário nesta data.' });
      }
      throw err;
    }

    for (const it of itens) {
      await client.query(
        `INSERT INTO CESTA_ITENS (cod_ces, cod_ite, qtd) VALUES ($1, $2, $3)`,
        [id, it.itemId, it.quantidade]
      );
      await client.query(
        `UPDATE ESTOQUE_ITENS
            SET qtd_est = qtd_est - $1, data_atualizacao = CURRENT_TIMESTAMP
          WHERE cod_ite = $2`,
        [it.quantidade, it.itemId]
      );
      await client.query(
        `INSERT INTO ESTOQUE_MOV (cod_ite, qtd_mov, tipo_mov, cod_ces, obs_mov)
              VALUES ($1, $2, 'S', $3, $4)`,
        [it.itemId, it.quantidade, id, `Entrega cesta #${id} (após edição)`]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Cesta atualizada com sucesso.', id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Erro ao atualizar cesta ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = app;

