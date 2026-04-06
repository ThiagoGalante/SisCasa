const supabase = require('../supabaseClient');
const pool = require('../db');

/**
 * Middleware para verificar o token JWT do Supabase
 * Protege rotas que requerem autenticação
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extrai o token do header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    // Verifica o token com o Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }

    // Anexa informações do usuário à requisição
    req.user = {
      supabaseId: user.id,
      email: user.email
    };

    // Busca informações adicionais do usuário na tabela USUARIOS local
    try {
      const result = await pool.query(
        'SELECT id_usuario, nome_completo, ativo FROM USUARIOS WHERE supabase_user_id = $1',
        [user.id]
      );

      if (result.rows.length > 0) {
        req.user.internalId = result.rows[0].id_usuario;
        req.user.nomeCompleto = result.rows[0].nome_completo;
        req.user.ativo = result.rows[0].ativo;

        // Verifica se o usuário está ativo
        if (!req.user.ativo) {
          return res.status(403).json({ error: 'Usuário inativo no sistema' });
        }
      }
    } catch (dbError) {
      console.error('Erro ao buscar usuário no banco local:', dbError);
      // Continua mesmo se não encontrar no banco local
      // Isso permite que usuários recém-criados no Supabase ainda funcionem
    }

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

module.exports = { authenticateToken };
