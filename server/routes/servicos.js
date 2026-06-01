const express = require('express');
const router = express.Router();
const pool = require('../db');

// requireAdmin local: checa apenas req.user.cargo (populado por authenticateToken
// no mount). Definido aqui para o router não depender de supabaseClient, que lança
// erro sem env vars e quebraria o harness de testes (app.js).
const requireAdmin = (req, res, next) => {
  if (req.user?.cargo !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
};

/**
 * Módulo de Serviços de Apoio (v0).
 * Registro de atendimentos/serviços prestados a beneficiários.
 * Montado com authenticateToken no app; requireAdmin protege editar/excluir.
 */

const validarServico = (body) => {
  const { numcadBen, codTser, dtSap, obs } = body;
  if (!Number.isInteger(numcadBen) || numcadBen <= 0) return 'numcadBen deve ser um inteiro positivo.';
  if (!Number.isInteger(codTser) || codTser <= 0) return 'codTser deve ser um inteiro positivo.';
  if (!dtSap || !/^\d{4}-\d{2}-\d{2}$/.test(dtSap)) return 'dtSap deve estar no formato YYYY-MM-DD.';
  if (obs && typeof obs === 'string' && obs.length > 500) return 'obs deve ter no máximo 500 caracteres.';
  return null;
};

// GET /api/servicos-apoio/tipos - catálogo de tipos de serviço (lookup)
router.get('/tipos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cod_tser AS "id", nome_tser AS "nome"
         FROM TIPO_SERVICO
        WHERE ativo_tser = true
        ORDER BY nome_tser`
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar tipos de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar tipos de serviço.', details: error.message });
  }
});

// GET /api/servicos-apoio - lista atendimentos paginados com filtros
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { beneficiario, tipo, dataInicio, dataFim } = req.query;

    const filters = [];
    const params = [];
    let idx = 1;
    if (beneficiario) { filters.push(`p.nome_pes ILIKE $${idx++}`); params.push(`%${beneficiario}%`); }
    if (tipo)         { filters.push(`s.cod_tser = $${idx++}`);     params.push(parseInt(tipo, 10)); }
    if (dataInicio)   { filters.push(`s.dt_sap >= $${idx++}`);      params.push(dataInicio); }
    if (dataFim)      { filters.push(`s.dt_sap <= $${idx++}`);      params.push(dataFim); }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM SERVICO_APOIO s
         JOIN PESSOAS p ON p.numcad_pes = s.numcad_ben
         ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(
      `SELECT s.cod_sap     AS "id",
              s.numcad_ben  AS "beneficiarioId",
              p.nome_pes    AS "beneficiarioNome",
              s.cod_tser    AS "tipoId",
              t.nome_tser   AS "tipoNome",
              s.dt_sap      AS "data",
              s.obs_sap     AS "observacao",
              s.data_criacao AS "criadoEm"
         FROM SERVICO_APOIO s
         JOIN PESSOAS p ON p.numcad_pes = s.numcad_ben
         JOIN TIPO_SERVICO t ON t.cod_tser = s.cod_tser
         ${whereClause}
         ORDER BY s.dt_sap DESC, s.cod_sap DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    res.json({ data: dataResult.rows, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Erro ao listar serviços de apoio:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar serviços de apoio.', details: error.message });
  }
});

// GET /api/servicos-apoio/:id - detalha um atendimento
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido.' });
  try {
    const { rows } = await pool.query(
      `SELECT s.cod_sap    AS "id",
              s.numcad_ben AS "numcadBen",
              p.nome_pes   AS "beneficiarioNome",
              s.cod_tser   AS "codTser",
              t.nome_tser  AS "tipoNome",
              s.dt_sap     AS "dtSap",
              s.obs_sap    AS "obs"
         FROM SERVICO_APOIO s
         JOIN PESSOAS p ON p.numcad_pes = s.numcad_ben
         JOIN TIPO_SERVICO t ON t.cod_tser = s.cod_tser
        WHERE s.cod_sap = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Atendimento não encontrado.' });
    res.json(rows[0]);
  } catch (error) {
    console.error(`Erro ao buscar serviço de apoio ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.', details: error.message });
  }
});

// POST /api/servicos-apoio - registra um atendimento
router.post('/', async (req, res) => {
  const validationError = validarServico(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { numcadBen, codTser, dtSap, obs } = req.body;
  try {
    const benResult = await pool.query(
      `SELECT numcad_pes FROM PESSOAS WHERE numcad_pes = $1 AND tipo_pes = 'B'`,
      [numcadBen]
    );
    if (benResult.rows.length === 0) return res.status(404).json({ error: 'Beneficiário não encontrado.' });

    const tserResult = await pool.query(
      `SELECT cod_tser FROM TIPO_SERVICO WHERE cod_tser = $1 AND ativo_tser = true`,
      [codTser]
    );
    if (tserResult.rows.length === 0) return res.status(404).json({ error: 'Tipo de serviço não encontrado ou inativo.' });

    const { rows } = await pool.query(
      `INSERT INTO SERVICO_APOIO (numcad_ben, cod_tser, dt_sap, obs_sap)
            VALUES ($1, $2, $3, $4) RETURNING cod_sap`,
      [numcadBen, codTser, dtSap, obs || null]
    );
    res.status(201).json({ message: 'Atendimento registrado com sucesso.', id: rows[0].cod_sap });
  } catch (error) {
    console.error('Erro ao registrar serviço de apoio:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar atendimento.', details: error.message });
  }
});

// PUT /api/servicos-apoio/:id - atualiza um atendimento (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido.' });

  const validationError = validarServico(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { numcadBen, codTser, dtSap, obs } = req.body;
  try {
    const result = await pool.query(
      `UPDATE SERVICO_APOIO
          SET numcad_ben = $1, cod_tser = $2, dt_sap = $3, obs_sap = $4,
              data_atualizacao = CURRENT_TIMESTAMP
        WHERE cod_sap = $5`,
      [numcadBen, codTser, dtSap, obs || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Atendimento não encontrado.' });
    res.status(200).json({ message: 'Atendimento atualizado com sucesso.', id });
  } catch (error) {
    console.error(`Erro ao atualizar serviço de apoio ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.', details: error.message });
  }
});

// DELETE /api/servicos-apoio/:id - exclui um atendimento (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido.' });
  try {
    const result = await pool.query('DELETE FROM SERVICO_APOIO WHERE cod_sap = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Atendimento não encontrado.' });
    res.status(200).json({ message: 'Atendimento excluído com sucesso.', id });
  } catch (error) {
    console.error(`Erro ao excluir serviço de apoio ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor.', details: error.message });
  }
});

module.exports = router;
