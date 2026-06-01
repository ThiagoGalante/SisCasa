import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';
import './FormularioServicoApoio.css';

const FormularioServicoApoio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [tipos, setTipos] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [form, setForm] = useState({ numcadBen: '', codTser: '', dtSap: '', obs: '' });
  const [saving, setSaving] = useState(false);

  const setField = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const carregar = useCallback(async () => {
    try {
      const [tiposRes, benRes] = await Promise.all([
        authenticatedFetch('/api/servicos-apoio/tipos'),
        authenticatedFetch('/api/beneficiarios'),
      ]);
      if (tiposRes.ok) setTipos(await tiposRes.json());
      if (benRes.ok) setBeneficiarios(await benRes.json());

      if (isEditing) {
        const res = await authenticatedFetch(`/api/servicos-apoio/${id}`);
        if (!res.ok) throw new Error('Atendimento não encontrado');
        const data = await res.json();
        setForm({
          numcadBen: data.numcadBen,
          codTser: data.codTser,
          dtSap: data.dtSap ? new Date(data.dtSap).toISOString().split('T')[0] : '',
          obs: data.obs || '',
        });
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar dados: ' + err.message);
      navigate('/servicos-de-apoio');
    }
  }, [id, isEditing, navigate]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.numcadBen || !form.codTser || !form.dtSap) {
      alert('Beneficiário, tipo de serviço e data são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        numcadBen: Number(form.numcadBen),
        codTser: Number(form.codTser),
        dtSap: form.dtSap,
        obs: form.obs || null,
      };
      const url = isEditing ? `/api/servicos-apoio/${id}` : '/api/servicos-apoio';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authenticatedFetch(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha ao salvar');
      alert(`Atendimento ${isEditing ? 'atualizado' : 'registrado'} com sucesso!`);
      navigate('/servicos-de-apoio');
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-servico-container">
      <div className="form-header">
        <button type="button" className="btn-voltar" onClick={() => navigate('/servicos-de-apoio')}>
          &larr; Voltar
        </button>
      </div>
      <h2 className="title">{isEditing ? 'Editar Atendimento' : 'Novo Atendimento'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label>Beneficiário *</label>
            <select value={form.numcadBen} onChange={(e) => setField('numcadBen', e.target.value)}>
              <option value="">Selecione o beneficiário</option>
              {beneficiarios.map((b) => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Tipo de Serviço *</label>
            <select value={form.codTser} onChange={(e) => setField('codTser', e.target.value)}>
              <option value="">Selecione o tipo</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Data do Atendimento *</label>
            <input type="date" value={form.dtSap} onChange={(e) => setField('dtSap', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label>Observação</label>
            <textarea
              value={form.obs}
              maxLength={500}
              placeholder="Opcional — máx. 500 caracteres"
              onChange={(e) => setField('obs', e.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancelar" onClick={() => navigate('/servicos-de-apoio')}>
            Cancelar
          </button>
          <button type="submit" className="btn-salvar" disabled={saving}>
            {saving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Registrar atendimento')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioServicoApoio;
