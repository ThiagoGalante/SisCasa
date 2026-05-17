const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const TIPOS_DOC_VALIDOS = ['Alimentos', 'Roupas', 'Dinheiro', 'Outros'];

// ---------------------------------------------------------------------------
// GET /busca?nome=<q>  (montado em /api/doadores → GET /api/doadores/busca)
// Autocomplete de doadores pelo nome
// ---------------------------------------------------------------------------
router.get('/busca', async (req, res) => {
  const { nome } = req.query;
  if (!nome) return res.json([]);
  try {
    const { rows } = await pool.query(
      `SELECT cod_doa, nome_doa, tipo_doa
         FROM DOADORES
        WHERE LOWER(nome_doa) LIKE LOWER($1)
        ORDER BY nome_doa
        LIMIT 10`,
      [`%${nome}%`]
    );
    res.json(rows.map(r => ({ codDoa: r.cod_doa, nomeDoa: r.nome_doa, tipoDoa: r.tipo_doa })));
  } catch (error) {
    console.error('Erro ao buscar doadores:', error);
    res.status(500).json({ error: 'Erro interno ao buscar doadores.', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /
// Cadastrar nova doação
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { doador, dtDoc, tipoDoc, descricaoDoc, obsDoc, itens } = req.body;

  // Validações
  if (!doador || (!doador.codDoa && !doador.nomeDoa)) {
    return res.status(400).json({ error: 'doador é obrigatório e deve ter codDoa ou nomeDoa.' });
  }
  if (!dtDoc) {
    return res.status(400).json({ error: 'dtDoc é obrigatório.' });
  }
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  if (new Date(dtDoc) > hoje) {
    return res.status(400).json({ error: 'dtDoc não pode ser uma data futura.' });
  }
  if (!tipoDoc || !TIPOS_DOC_VALIDOS.includes(tipoDoc)) {
    return res.status(400).json({ error: `tipoDoc deve ser um de: ${TIPOS_DOC_VALIDOS.join(', ')}.` });
  }
  if (itens && itens.length > 0 && tipoDoc !== 'Alimentos') {
    return res.status(400).json({ error: 'itens só é permitido quando tipoDoc é "Alimentos".' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Resolver doador
    let codDoa;
    if (doador.codDoa) {
      codDoa = doador.codDoa;
    } else {
      const insDoador = await client.query(
        `INSERT INTO DOADORES (nome_doa, email_doa, fone_doa, cpf_cnpj, tipo_doa)
              VALUES ($1, $2, $3, $4, $5)
           RETURNING cod_doa`,
        [doador.nomeDoa, doador.emailDoa || null, doador.foneDoa || null, doador.cpfCnpj || null, doador.tipoDoa || 'PF']
      );
      codDoa = insDoador.rows[0].cod_doa;
    }

    // 2. Inserir doação
    const insDoc = await client.query(
      `INSERT INTO DOACOES (cod_doa, dt_doc, tipo_doc, descricao_doc, obs_doc)
            VALUES ($1, $2, $3, $4, $5)
         RETURNING cod_doc`,
      [codDoa, dtDoc, tipoDoc, descricaoDoc || null, obsDoc || null]
    );
    const codDoc = insDoc.rows[0].cod_doc;

    // 3. Processar itens se tipoDoc='Alimentos'
    if (tipoDoc === 'Alimentos' && itens && itens.length > 0) {
      for (const item of itens) {
        const { codIte, qtd } = item;

        await client.query(
          `INSERT INTO DOACAO_ITENS (cod_doc, cod_ite, qtd) VALUES ($1, $2, $3)`,
          [codDoc, codIte, qtd]
        );

        await client.query(
          `INSERT INTO ESTOQUE_ITENS (cod_ite, qtd_est)
                VALUES ($1, $2)
           ON CONFLICT (cod_ite) DO UPDATE
              SET qtd_est = ESTOQUE_ITENS.qtd_est + EXCLUDED.qtd_est`,
          [codIte, qtd]
        );

        await client.query(
          `INSERT INTO ESTOQUE_MOV (cod_ite, qtd_mov, tipo_mov, obs_mov, cod_doc)
                VALUES ($1, $2, 'E', $3, $4)`,
          [codIte, qtd, `Doação #${codDoc}`, codDoc]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ codDoc, codDoa });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar doação:', error);
    res.status(500).json({ error: 'Erro interno ao cadastrar doação.', details: error.message });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// GET /
// Lista paginada de doações com filtros
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];
    let idx = 1;

    if (req.query.doador) {
      filters.push(`LOWER(doa.nome_doa) LIKE LOWER($${idx++})`);
      params.push(`%${req.query.doador}%`);
    }
    if (req.query.tipo) {
      filters.push(`d.tipo_doc = $${idx++}`);
      params.push(req.query.tipo);
    }
    if (req.query.dataInicio) {
      filters.push(`d.dt_doc >= $${idx++}`);
      params.push(req.query.dataInicio);
    }
    if (req.query.dataFim) {
      filters.push(`d.dt_doc <= $${idx++}`);
      params.push(req.query.dataFim);
    }

    const whereClause = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM DOACOES d
         JOIN DOADORES doa ON d.cod_doa = doa.cod_doa
        WHERE 1=1 ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(
      `SELECT d.cod_doc, d.dt_doc, d.tipo_doc, d.descricao_doc, d.obs_doc,
              d.data_criacao, d.data_atualizacao,
              doa.cod_doa, doa.nome_doa, doa.tipo_doa,
              (SELECT COUNT(*) FROM DOACAO_ITENS di WHERE di.cod_doc = d.cod_doc) AS qtd_itens
         FROM DOACOES d
         JOIN DOADORES doa ON d.cod_doa = doa.cod_doa
        WHERE 1=1 ${whereClause}
        ORDER BY d.dt_doc DESC, d.cod_doc DESC
        LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const data = dataResult.rows.map(row => ({
      codDoc: row.cod_doc,
      dtDoc: row.dt_doc,
      tipoDoc: row.tipo_doc,
      descricaoDoc: row.descricao_doc,
      obsDoc: row.obs_doc,
      dataCriacao: row.data_criacao,
      dataAtualizacao: row.data_atualizacao,
      codDoa: row.cod_doa,
      nomeDoa: row.nome_doa,
      tipoDoa: row.tipo_doa,
      qtdItens: parseInt(row.qtd_itens, 10)
    }));

    res.json({ data, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Erro ao listar doações:', error);
    res.status(500).json({ error: 'Erro interno ao listar doações.', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /:id
// Detalhe de uma doação
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido.' });
  }
  try {
    const docResult = await pool.query(
      `SELECT d.cod_doc, d.dt_doc, d.tipo_doc, d.descricao_doc, d.obs_doc,
              d.data_criacao, d.data_atualizacao,
              doa.cod_doa, doa.nome_doa, doa.email_doa, doa.fone_doa, doa.cpf_cnpj, doa.tipo_doa
         FROM DOACOES d
         JOIN DOADORES doa ON d.cod_doa = doa.cod_doa
        WHERE d.cod_doc = $1`,
      [id]
    );
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doação não encontrada.' });
    }

    const itensResult = await pool.query(
      `SELECT di.cod_ite, di.qtd, ic.desc_ite, ic.unidade_ite
         FROM DOACAO_ITENS di
         JOIN ITENS_CESTA ic ON di.cod_ite = ic.cod_ite
        WHERE di.cod_doc = $1`,
      [id]
    );

    const row = docResult.rows[0];
    res.json({
      codDoc: row.cod_doc,
      dtDoc: row.dt_doc,
      tipoDoc: row.tipo_doc,
      descricaoDoc: row.descricao_doc,
      obsDoc: row.obs_doc,
      dataCriacao: row.data_criacao,
      dataAtualizacao: row.data_atualizacao,
      codDoa: row.cod_doa,
      nomeDoa: row.nome_doa,
      emailDoa: row.email_doa,
      foneDoa: row.fone_doa,
      cpfCnpj: row.cpf_cnpj,
      tipoDoa: row.tipo_doa,
      itens: itensResult.rows.map(i => ({
        codIte: i.cod_ite,
        qtd: i.qtd,
        descIte: i.desc_ite,
        unidadeIte: i.unidade_ite
      }))
    });
  } catch (error) {
    console.error(`Erro ao buscar doação ${id}:`, error);
    res.status(500).json({ error: 'Erro interno ao buscar doação.', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  (requer admin)
// Editar doação
// ---------------------------------------------------------------------------
router.put('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido.' });
  }

  const { dtDoc, tipoDoc, descricaoDoc, obsDoc, itens } = req.body;

  if (!dtDoc) {
    return res.status(400).json({ error: 'dtDoc é obrigatório.' });
  }
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  if (new Date(dtDoc) > hoje) {
    return res.status(400).json({ error: 'dtDoc não pode ser uma data futura.' });
  }
  if (!tipoDoc || !TIPOS_DOC_VALIDOS.includes(tipoDoc)) {
    return res.status(400).json({ error: `tipoDoc deve ser um de: ${TIPOS_DOC_VALIDOS.join(', ')}.` });
  }
  if (itens && itens.length > 0 && tipoDoc !== 'Alimentos') {
    return res.status(400).json({ error: 'itens só é permitido quando tipoDoc é "Alimentos".' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Buscar doação atual
    const docAtual = await client.query(
      `SELECT tipo_doc FROM DOACOES WHERE cod_doc = $1 FOR UPDATE`,
      [id]
    );
    if (docAtual.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Doação não encontrada.' });
    }
    const tipoAnterior = docAtual.rows[0].tipo_doc;

    // Buscar itens antigos
    const itensAntigos = await client.query(
      `SELECT cod_ite, qtd FROM DOACAO_ITENS WHERE cod_doc = $1`,
      [id]
    );

    // 2. Estornar estoque se tipo anterior era 'Alimentos'
    if (tipoAnterior === 'Alimentos') {
      for (const item of itensAntigos.rows) {
        const estoqueResult = await client.query(
          `UPDATE ESTOQUE_ITENS
              SET qtd_est = qtd_est - $1
            WHERE cod_ite = $2
            RETURNING qtd_est`,
          [item.qtd, item.cod_ite]
        );
        if (estoqueResult.rows.length > 0 && estoqueResult.rows[0].qtd_est < 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Estoque já consumido por entrega — não é possível editar.' });
        }
        await client.query(
          `INSERT INTO ESTOQUE_MOV (cod_ite, qtd_mov, tipo_mov, obs_mov, cod_doc)
                VALUES ($1, $2, 'S', $3, $4)`,
          [item.cod_ite, item.qtd, `Estorno por edição da doação #${id}`, id]
        );
      }
    }

    // 3. Limpar itens antigos
    await client.query(`DELETE FROM DOACAO_ITENS WHERE cod_doc = $1`, [id]);

    // 4. Atualizar doação
    await client.query(
      `UPDATE DOACOES
          SET dt_doc = $1, tipo_doc = $2, descricao_doc = $3, obs_doc = $4, data_atualizacao = NOW()
        WHERE cod_doc = $5`,
      [dtDoc, tipoDoc, descricaoDoc || null, obsDoc || null, id]
    );

    // 5. Reinserir itens se novo tipo é 'Alimentos'
    if (tipoDoc === 'Alimentos' && itens && itens.length > 0) {
      for (const item of itens) {
        const { codIte, qtd } = item;

        await client.query(
          `INSERT INTO DOACAO_ITENS (cod_doc, cod_ite, qtd) VALUES ($1, $2, $3)`,
          [id, codIte, qtd]
        );

        await client.query(
          `INSERT INTO ESTOQUE_ITENS (cod_ite, qtd_est)
                VALUES ($1, $2)
           ON CONFLICT (cod_ite) DO UPDATE
              SET qtd_est = ESTOQUE_ITENS.qtd_est + EXCLUDED.qtd_est`,
          [codIte, qtd]
        );

        await client.query(
          `INSERT INTO ESTOQUE_MOV (cod_ite, qtd_mov, tipo_mov, obs_mov, cod_doc)
                VALUES ($1, $2, 'E', $3, $4)`,
          [codIte, qtd, `Doação #${id}`, id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ codDoc: id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Erro ao editar doação ${id}:`, error);
    res.status(500).json({ error: 'Erro interno ao editar doação.', details: error.message });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  (requer admin)
// Deletar doação
// ---------------------------------------------------------------------------
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar existência
    const docExiste = await client.query(
      `SELECT cod_doc FROM DOACOES WHERE cod_doc = $1 FOR UPDATE`,
      [id]
    );
    if (docExiste.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Doação não encontrada.' });
    }

    // 1. Buscar itens atuais
    const itensAtuais = await client.query(
      `SELECT cod_ite, qtd FROM DOACAO_ITENS WHERE cod_doc = $1`,
      [id]
    );

    // 2. Estornar estoque
    for (const item of itensAtuais.rows) {
      const estoqueResult = await client.query(
        `UPDATE ESTOQUE_ITENS
            SET qtd_est = qtd_est - $1
          WHERE cod_ite = $2
          RETURNING qtd_est`,
        [item.qtd, item.cod_ite]
      );
      if (estoqueResult.rows.length > 0 && estoqueResult.rows[0].qtd_est < 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Estoque já consumido por entrega — não é possível excluir.' });
      }
      await client.query(
        `INSERT INTO ESTOQUE_MOV (cod_ite, qtd_mov, tipo_mov, obs_mov, cod_doc)
              VALUES ($1, $2, 'S', $3, $4)`,
        [item.cod_ite, item.qtd, `Estorno por exclusão da doação #${id}`, id]
      );
    }

    // 3. Deletar doação (CASCADE limpa DOACAO_ITENS)
    await client.query(`DELETE FROM DOACOES WHERE cod_doc = $1`, [id]);

    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Erro ao excluir doação ${id}:`, error);
    res.status(500).json({ error: 'Erro interno ao excluir doação.', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
