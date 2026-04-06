const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Criar um novo usuário (apenas para administradores)
 * Requer autenticação
 */
router.post('/register', authenticateToken, async (req, res) => {
  const { email, password, nomeCompleto } = req.body;

  // Validação básica
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    // Cria usuário no Supabase usando a API de admin
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false // Usuário precisa confirmar o email
    });

    if (error) {
      console.error('Erro ao criar usuário no Supabase:', error);
      return res.status(400).json({ error: error.message });
    }

    // Cria registro correspondente na tabela USUARIOS local
    const result = await pool.query(
      'INSERT INTO USUARIOS (supabase_user_id, email, nome_completo) VALUES ($1, $2, $3) RETURNING id_usuario',
      [data.user.id, email, nomeCompleto || email]
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso. Um email de confirmação foi enviado.',
      userId: result.rows[0].id_usuario,
      supabaseId: data.user.id
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);

    // Se houver erro, tenta limpar o usuário criado no Supabase
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
 * POST /api/auth/logout
 * Fazer logout do usuário
 * Requer autenticação
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // O logout é gerenciado principalmente no frontend
    // Este endpoint serve para registro/auditoria se necessário
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ error: 'Erro interno ao fazer logout' });
  }
});

/**
 * GET /api/auth/me
 * Obter informações do usuário autenticado
 * Requer autenticação
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.internalId,
        supabaseId: req.user.supabaseId,
        email: req.user.email,
        nomeCompleto: req.user.nomeCompleto,
        ativo: req.user.ativo
      }
    });
  } catch (error) {
    console.error('Erro ao buscar informações do usuário:', error);
    res.status(500).json({ error: 'Erro interno ao buscar informações do usuário' });
  }
});

module.exports = router;
