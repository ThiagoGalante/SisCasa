import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './GerenciarUsuarios.css';

const GerenciarUsuarios = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeInput, setNomeInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    authenticatedFetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d.user?.id))
      .catch(() => {});
  }, [user]);

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/auth/usuarios');
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      const json = await res.json();
      setUsuarios(json);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsuarios(); }, [loadUsuarios]);

  const handleDesativar = async (id, nome) => {
    if (!window.confirm(`Desativar o usuário "${nome}"?`)) return;
    try {
      const res = await authenticatedFetch(`/api/auth/usuarios/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao desativar');
      loadUsuarios();
    } catch (err) {
      alert('Erro ao desativar usuário: ' + err.message);
    }
  };

  const formatData = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const usuariosFiltrados = usuarios.filter((u) =>
    !nomeInput ||
    u.nome_completo?.toLowerCase().includes(nomeInput.toLowerCase()) ||
    u.email?.toLowerCase().includes(nomeInput.toLowerCase())
  );

  return (
    <div className="usuarios-container">
      <div className="header-usuarios">
        <h1>Usuários {usuarios.length > 0 && <span className="total-badge">({usuarios.length})</span>}</h1>
        <div className="header-actions">
          <button className="btn-primario" onClick={() => navigate('/usuarios/cadastro')}>
            + Novo Usuário
          </button>
        </div>
      </div>

      <div className="filtros">
        <input
          type="text"
          placeholder="Filtrar por nome ou e-mail..."
          value={nomeInput}
          onChange={(e) => setNomeInput(e.target.value)}
        />
        {nomeInput && (
          <button className="btn-limpar" onClick={() => setNomeInput('')}>Limpar</button>
        )}
      </div>

      {loading ? (
        <p>Carregando usuários...</p>
      ) : usuariosFiltrados.length === 0 ? (
        <p className="vazio">Nenhum usuário encontrado.</p>
      ) : (
        <table className="tabela-usuarios">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th>Status</th>
              <th>Cadastrado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => {
              const isSelf = u.id_usuario === currentUserId;
              return (
                <tr key={u.id_usuario}>
                  <td>{u.nome_completo || '—'}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge-cargo badge-cargo-${u.cargo}`}>
                      {u.cargo === 'admin' ? 'Admin' : 'Voluntário'}
                    </span>
                  </td>
                  <td>
                    <span className={u.ativo ? 'badge-ativo' : 'badge-inativo'}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>{formatData(u.data_criacao)}</td>
                  <td className="acoes-cel">
                    <button
                      className="btn-editar"
                      onClick={() => navigate(`/usuarios/editar/${u.id_usuario}`)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-desativar"
                      onClick={() => handleDesativar(u.id_usuario, u.nome_completo || u.email)}
                      disabled={isSelf || !u.ativo}
                      title={isSelf ? 'Você não pode desativar sua própria conta' : !u.ativo ? 'Já inativo' : 'Desativar'}
                    >
                      Desativar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default GerenciarUsuarios;
