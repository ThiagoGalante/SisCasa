const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Criar um novo usuário — somente admins
 */
router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  const { email, password, nomeCompleto, cargo } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const cargoFinal = ['admin', 'voluntario'].includes(cargo) ? cargo : 'voluntario';

  let data;
  try {
    const result = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (result.error) {
      console.error('Erro ao criar usuário no Supabase:', result.error);
      return res.status(400).json({ error: result.error.message });
    }

    data = result.data;

    const dbResult = await pool.query(
      'INSERT INTO USUARIOS (supabase_user_id, email, nome_completo, cargo) VALUES ($1, $2, $3, $4) RETURNING id_usuario',
      [data.user.id, email, nomeCompleto || email, cargoFinal]
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso.',
      userId: dbResult.rows[0].id_usuario,
      supabaseId: data.user.id
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);

    if (data?.user?.id) {
      try {
        await supabase.auth.admin.deleteUser(data.user.id);
      } catch (cleanupError) {
        console.error('Erro ao limpar usuário do Supabase:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Erro interno ao criar usuário' });
  }
});

/**
 * GET /api/auth/usuarios
 * Listar todos os usuários — somente admins
 */
router.get('/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_usuario, email, nome_completo, cargo, ativo, data_criacao
         FROM USUARIOS
        ORDER BY nome_completo`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno ao listar usuários' });
  }
});

/**
 * GET /api/auth/usuarios/:id
 * Buscar usuário por ID — somente admins
 */
router.get('/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const result = await pool.query(
      `SELECT id_usuario, email, nome_completo, cargo, ativo, data_criacao
         FROM USUARIOS
        WHERE id_usuario = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno ao buscar usuário' });
  }
});

/**
 * PUT /api/auth/usuarios/:id
 * Atualizar nome e/ou cargo — somente admins
 */
router.put('/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const { nomeCompleto, cargo } = req.body;
  if (!nomeCompleto && !cargo) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }
  if (cargo && !['admin', 'voluntario'].includes(cargo)) {
    return res.status(400).json({ error: 'Cargo inválido' });
  }
  if (cargo && id === req.user.internalId) {
    return res.status(403).json({ error: 'Você não pode alterar seu próprio cargo.' });
  }

  try {
    const setClauses = [];
    const params = [];
    let idx = 1;
    if (nomeCompleto) { setClauses.push(`nome_completo = $${idx++}`); params.push(nomeCompleto); }
    if (cargo)        { setClauses.push(`cargo = $${idx++}`);         params.push(cargo); }
    setClauses.push('data_atualizacao = CURRENT_TIMESTAMP');
    params.push(id);

    const result = await pool.query(
      `UPDATE USUARIOS SET ${setClauses.join(', ')} WHERE id_usuario = $${idx} RETURNING id_usuario`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
  }
});

/**
 * DELETE /api/auth/usuarios/:id
 * Desativar usuário (soft delete) — somente admins
 */
router.delete('/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  if (id === req.user.internalId) {
    return res.status(403).json({ error: 'Você não pode desativar sua própria conta.' });
  }

  try {
    const result = await pool.query(
      `UPDATE USUARIOS SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP
        WHERE id_usuario = $1 RETURNING id_usuario`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({ error: 'Erro interno ao desativar usuário' });
  }
});

/**
 * POST /api/auth/usuarios/:id/reset-senha
 * Redefinir senha de um usuário — somente admins
 */
router.post('/usuarios/:id/reset-senha', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const userResult = await pool.query(
      'SELECT supabase_user_id FROM USUARIOS WHERE id_usuario = $1',
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const supabaseUserId = userResult.rows[0].supabase_user_id;
    const { error } = await supabase.auth.admin.updateUserById(supabaseUserId, {
      password: newPassword
    });
    if (error) {
      console.error('Erro ao redefinir senha no Supabase:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro interno ao redefinir senha' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ error: 'Erro interno ao fazer logout' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.internalId,
        supabaseId: req.user.supabaseId,
        email: req.user.email,
        nomeCompleto: req.user.nomeCompleto,
        ativo: req.user.ativo,
        cargo: req.user.cargo
      }
    });
  } catch (error) {
    console.error('Erro ao buscar informações do usuário:', error);
    res.status(500).json({ error: 'Erro interno ao buscar informações do usuário' });
  }
});

module.exports = router;
