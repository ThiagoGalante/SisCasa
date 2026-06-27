const express = require('express');
const router = express.Router();
const pool = require('../db');

// requireAdmin local (mesmo padrão de routes/servicos.js): evita depender de
// supabaseClient, que lança erro sem env vars e quebraria o harness de testes.
const requireAdmin = (req, res, next) => {
  if (req.user?.cargo !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
};

/**
 * US14 — Módulo de Configurações.
 * CRUD genérico das tabelas de apoio (domínio). Cada recurso mapeia uma tabela,
 * sua PK, sua coluna de descrição e as referências que impedem exclusão (FKs).
 *
 * Whitelist: protege contra SQL injection no nome da tabela — só recursos
 * conhecidos são aceitos; qualquer outro retorna 400.
 */
const RECURSOS = {
  hospitais:  { tabela: 'HOSPITAL',  idCol: 'cod_hos', nomeCol: 'nome_hos', refs: [{ tabela: 'PESSOAS', col: 'cod_hos' }] },
  ufs:        { tabela: 'UF',        idCol: 'cod_uf',  nomeCol: 'nome_uf',  refs: [{ tabela: 'MUNICIPIO', col: 'cod_uf' }] },
  religioes:  { tabela: 'RELIGIAO',  idCol: 'cod_rel', nomeCol: 'desc_rel', refs: [{ tabela: 'PESSOAS', col: 'cod_rel' }] },
  racas:      { tabela: 'RACA',      idCol: 'cod_rac', nomeCol: 'desc_rac', refs: [{ tabela: 'PESSOAS', col: 'cod_rac' }] },
};

const getRecurso = (req, res) => {
  const cfg = RECURSOS[req.params.recurso];
  if (!cfg) {
    res.status(400).json({ error: `Recurso de configuração inválido: '${req.params.recurso}'.` });
    return null;
  }
  return cfg;
};

const nomeValido = (nome) => typeof nome === 'string' && nome.trim().length > 0;

// GET /api/config/:recurso — lista registros do recurso (autenticado)
router.get('/:recurso', async (req, res) => {
  const cfg = getRecurso(req, res);
  if (!cfg) return;
  try {
    const { rows } = await pool.query(
      `SELECT ${cfg.idCol} AS "id", ${cfg.nomeCol} AS "nome" FROM ${cfg.tabela} ORDER BY ${cfg.nomeCol}`
    );
    res.json(rows);
  } catch (error) {
    console.error(`Erro ao listar ${req.params.recurso}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar configurações.', details: error.message });
  }
});

// POST /api/config/:recurso — cria um registro (admin)
router.post('/:recurso', requireAdmin, async (req, res) => {
  const cfg = getRecurso(req, res);
  if (!cfg) return;
  if (!nomeValido(req.body?.nome)) {
    return res.status(400).json({ error: 'O campo nome é obrigatório.' });
  }
  try {
    // PKs das tabelas de apoio são INTEGER sem sequence — geramos o próximo id (MAX+1),
    // mesmo padrão já usado no cadastro de PESSOAS.
    const idResult = await pool.query(`SELECT COALESCE(MAX(${cfg.idCol}), 0) + 1 AS next FROM ${cfg.tabela}`);
    const nextId = idResult.rows[0].next;
    const { rows } = await pool.query(
      `INSERT INTO ${cfg.tabela} (${cfg.idCol}, ${cfg.nomeCol}) VALUES ($1, $2) RETURNING ${cfg.idCol} AS "id"`,
      [nextId, req.body.nome.trim()]
    );
    res.status(201).json({ message: 'Registro criado com sucesso.', id: rows[0].id });
  } catch (error) {
    console.error(`Erro ao criar ${req.params.recurso}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor ao criar registro.', details: error.message });
  }
});

// PUT /api/config/:recurso/:id — atualiza a descrição (admin)
router.put('/:recurso/:id', requireAdmin, async (req, res) => {
  const cfg = getRecurso(req, res);
  if (!cfg) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido.' });
  if (!nomeValido(req.body?.nome)) {
    return res.status(400).json({ error: 'O campo nome é obrigatório.' });
  }
  try {
    const result = await pool.query(
      `UPDATE ${cfg.tabela} SET ${cfg.nomeCol} = $1 WHERE ${cfg.idCol} = $2`,
      [req.body.nome.trim(), id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro não encontrado.' });
    res.status(200).json({ message: 'Registro atualizado com sucesso.', id });
  } catch (error) {
    console.error(`Erro ao atualizar ${req.params.recurso}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar registro.', details: error.message });
  }
});

// DELETE /api/config/:recurso/:id — exclui se não estiver em uso (admin)
router.delete('/:recurso/:id', requireAdmin, async (req, res) => {
  const cfg = getRecurso(req, res);
  if (!cfg) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido.' });
  try {
    // Integridade referencial: bloqueia exclusão de registro em uso.
    for (const ref of cfg.refs) {
      const emUso = await pool.query(
        `SELECT 1 AS existe FROM ${ref.tabela} WHERE ${ref.col} = $1 LIMIT 1`,
        [id]
      );
      if (emUso.rows.length > 0) {
        return res.status(409).json({ error: 'Não é possível excluir: registro em uso por outros cadastros.' });
      }
    }
    const result = await pool.query(`DELETE FROM ${cfg.tabela} WHERE ${cfg.idCol} = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro não encontrado.' });
    res.status(200).json({ message: 'Registro excluído com sucesso.', id });
  } catch (error) {
    console.error(`Erro ao excluir ${req.params.recurso}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor ao excluir registro.', details: error.message });
  }
});

module.exports = router;
