import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './ServicosApoio.css';

const ServicosApoio = () => {
  const navigate = useNavigate();
  const { cargo } = useAuth();

  const [atendimentos, setAtendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipos, setTipos] = useState([]);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [beneficiarioInput, setBeneficiarioInput] = useState('');
  const [beneficiarioFilter, setBeneficiarioFilter] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBeneficiarioFilter(beneficiarioInput), 300);
    return () => clearTimeout(t);
  }, [beneficiarioInput]);

  useEffect(() => { setPage(1); }, [beneficiarioFilter, tipoFiltro, dataInicio, dataFim]);

  useEffect(() => {
    const loadTipos = async () => {
      try {
        const res = await authenticatedFetch('/api/servicos-apoio/tipos');
        if (res.ok) setTipos(await res.json());
      } catch (err) {
        console.error('Erro ao carregar tipos de serviço:', err);
      }
    };
    loadTipos();
  }, []);

  const loadAtendimentos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (beneficiarioFilter) params.set('beneficiario', beneficiarioFilter);
      if (tipoFiltro) params.set('tipo', tipoFiltro);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await authenticatedFetch(`/api/servicos-apoio?${params}`);
      if (!res.ok) throw new Error('Falha ao carregar atendimentos');
      const json = await res.json();
      setAtendimentos(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar atendimentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, beneficiarioFilter, tipoFiltro, dataInicio, dataFim]);

  useEffect(() => { loadAtendimentos(); }, [loadAtendimentos]);

  const handleClearFilters = () => {
    setBeneficiarioInput('');
    setTipoFiltro('');
    setDataInicio('');
    setDataFim('');
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Excluir este atendimento?')) return;
    try {
      const res = await authenticatedFetch(`/api/servicos-apoio/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha ao excluir');
      loadAtendimentos();
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const formatData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '');

  return (
    <div className="servicos-container">
      <div className="header-servicos">
        <h1>Serviços de Apoio</h1>
        <button className="btn-primario" onClick={() => navigate('/servicos-de-apoio/cadastro')}>
          + Novo Atendimento
        </button>
      </div>

      <section className="historico-container">
        <h2>Atendimentos {total > 0 && <span className="total-badge">({total})</span>}</h2>

        <div className="filtros">
          <input
            type="text"
            placeholder="Filtrar por beneficiário..."
            value={beneficiarioInput}
            onChange={(e) => setBeneficiarioInput(e.target.value)}
          />
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <option value="">Todos os tipos</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <label>De:<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></label>
          <label>Até:<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></label>
          <button className="btn-limpar" onClick={handleClearFilters}>Limpar filtros</button>
        </div>

        {loading ? (
          <p>Carregando atendimentos...</p>
        ) : atendimentos.length === 0 ? (
          <p className="vazio">Nenhum atendimento encontrado.</p>
        ) : (
          <>
            <table className="tabela-historico">
              <thead>
                <tr>
                  <th>Beneficiário</th>
                  <th>Tipo de Serviço</th>
                  <th>Data</th>
                  <th>Observação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {atendimentos.map((a) => (
                  <tr key={a.id}>
                    <td>{a.beneficiarioNome}</td>
                    <td>{a.tipoNome}</td>
                    <td>{formatData(a.data)}</td>
                    <td>{a.observacao || '—'}</td>
                    <td className="acoes">
                      {cargo === 'admin' ? (
                        <>
                          <Link to={`/servicos-de-apoio/editar/${a.id}`} className="link-editar">Editar</Link>
                          <button className="link-excluir" onClick={() => handleExcluir(a.id)}>Excluir</button>
                        </>
                      ) : (
                        <span className="sem-acao">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="paginacao">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Anterior</button>
              <span>Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima ›</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default ServicosApoio;
