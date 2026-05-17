import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';
import './FormularioUsuario.css';

const ErrorMessage = ({ error }) =>
  error ? <span className="form-error">{error.message}</span> : null;

const FormularioUsuario = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      senha: '',
      nomeCompleto: '',
      cargo: 'voluntario',
    },
  });

  useEffect(() => {
    authenticatedFetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d.user?.id))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await authenticatedFetch(`/api/auth/usuarios/${id}`);
        if (!res.ok) throw new Error('Falha ao carregar usuário');
        const u = await res.json();
        reset({
          email: u.email,
          senha: '',
          nomeCompleto: u.nome_completo || '',
          cargo: u.cargo,
        });
      } catch (err) {
        alert('Erro ao carregar dados: ' + err.message);
        navigate('/usuarios');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, reset, navigate]);

  const isSelf = isEdit && currentUserId !== null && parseInt(id, 10) === currentUserId;

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      let res;
      if (isEdit) {
        res = await authenticatedFetch(`/api/auth/usuarios/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            nomeCompleto: data.nomeCompleto,
            cargo: data.cargo,
          }),
        });
      } else {
        res = await authenticatedFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: data.email,
            password: data.senha,
            nomeCompleto: data.nomeCompleto,
            cargo: data.cargo,
          }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
      alert(isEdit ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!');
      navigate('/usuarios');
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSenha = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!window.confirm('Confirmar redefinição de senha para este usuário?')) return;
    setResettingPassword(true);
    try {
      const res = await authenticatedFetch(`/api/auth/usuarios/${id}/reset-senha`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao redefinir senha');
      alert('Senha redefinida com sucesso!');
      setNewPassword('');
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) return <div className="usuario-form-container"><p>Carregando...</p></div>;

  return (
    <div className="usuario-form-container">
      <h1>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="usuario-form">

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">E-mail *</label>
            {isEdit ? (
              <input
                id="email"
                type="email"
                disabled
                {...register('email')}
              />
            ) : (
              <input
                id="email"
                type="email"
                disabled={submitting}
                {...register('email', {
                  required: 'E-mail é obrigatório',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'E-mail inválido',
                  },
                })}
              />
            )}
            <ErrorMessage error={errors.email} />
          </div>

          {!isEdit && (
            <div className="form-group">
              <label htmlFor="senha">Senha *</label>
              <input
                id="senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                disabled={submitting}
                {...register('senha', {
                  required: 'Senha é obrigatória',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
              />
              <ErrorMessage error={errors.senha} />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="nomeCompleto">Nome completo *</label>
            <input
              id="nomeCompleto"
              type="text"
              maxLength={100}
              disabled={submitting}
              {...register('nomeCompleto', {
                required: 'Nome completo é obrigatório',
                maxLength: { value: 100, message: 'Máximo 100 caracteres' },
              })}
            />
            <ErrorMessage error={errors.nomeCompleto} />
          </div>

          <div className="form-group">
            <label htmlFor="cargo">Cargo *</label>
            <select
              id="cargo"
              disabled={submitting || isSelf}
              {...register('cargo', { required: 'Selecione um cargo' })}
            >
              <option value="voluntario">Voluntário</option>
              <option value="admin">Admin</option>
            </select>
            {isSelf && (
              <span className="info-note">Você não pode alterar seu próprio cargo.</span>
            )}
            <ErrorMessage error={errors.cargo} />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancelar"
            onClick={() => navigate('/usuarios')}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-salvar" disabled={submitting}>
            {submitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar usuário'}
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="usuario-form senha-section">
          <h2>Redefinir senha</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newPassword">Nova senha</label>
              <input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={resettingPassword || submitting}
              />
            </div>
            <div className="form-group senha-btn-group">
              <button
                type="button"
                className="btn-reset-senha"
                onClick={handleResetSenha}
                disabled={resettingPassword || submitting || !newPassword}
              >
                {resettingPassword ? 'Redefinindo...' : 'Redefinir senha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioUsuario;
