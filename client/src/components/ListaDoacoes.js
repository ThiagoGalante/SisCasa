import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './ListaDoacoes.css';

const TIPOS_DOACAO = ['', 'Alimentos', 'Roupas', 'Dinheiro', 'Outros'];

const ListaDoacoes = () => {
  const navigate = useNavigate();
  const { cargo } = useAuth();

  const [doacoes, setDoacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [doadorInput, setDoadorInput] = useState('');
  const [doadorFilter, setDoadorFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDoadorFilter(doadorInput), 400);
    return () => clearTimeout(t);
  }, [doadorInput]);

  useEffect(() => {
    setPage(1);
  }, [doadorFilter, tipoFilter, dataInicio, dataFim]);

  const loadDoacoes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (doadorFilter) params.set('doador', doadorFilter);
      if (tipoFilter) params.set('tipo', tipoFilter);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await authenticatedFetch(`/api/doacoes?${params}`);
      if (!res.ok) throw new Error('Falha ao carregar doações');
      const json = await res.json();
      setDoacoes(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar doações: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, doadorFilter, tipoFilter, dataInicio, dataFim]);

  useEffect(() => { loadDoacoes(); }, [loadDoacoes]);

  const handleClearFilters = () => {
    setDoadorInput('');
    setTipoFilter('');
    setDataInicio('');
    setDataFim('');
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta doação?')) return;
    try {
      const res = await authenticatedFetch(`/api/doacoes/${id}`, { method: 'DELETE' });
      if (res.status === 409) {
        alert('Estoque já consumido por entrega — não é possível excluir.');
        return;
      }
      if (!res.ok) throw new Error('Falha ao excluir doação');
      loadDoacoes();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir doação: ' + err.message);
    }
  };

  const formatData = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const totalDoacoesPagina = doacoes.length;
  const totalItensPagina = doacoes.reduce((acc, d) => acc + (Number(d.qtdItens) || 0), 0);

  return (
    <div className="doacoes-container">
      <div className="header-doacoes">
        <h1>Lista de Doações {total > 0 && <span className="total-badge">({total})</span>}</h1>
        <div className="header-actions">
          <button className="btn-primario" onClick={() => navigate('/doacoes/cadastro')}>
            + Nova Doação
          </button>
        </div>
      </div>

      <div className="resumo-cards">
        <div className="resumo-card">
          <span className="resumo-label">Doações nesta página</span>
          <span className="resumo-valor">{totalDoacoesPagina}</span>
        </div>
        <div className="resumo-card">
          <span className="resumo-label">Total de itens nesta página</span>
          <span className="resumo-valor">{totalItensPagina}</span>
        </div>
      </div>

      <div className="filtros">
        <input
          type="text"
          placeholder="Filtrar por doador..."
          value={doadorInput}
          onChange={(e) => setDoadorInput(e.target.value)}
        />
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
        >
          {TIPOS_DOACAO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo === '' ? 'Todos os tipos' : tipo}
            </option>
          ))}
        </select>
        <label>
          De:
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </label>
        <label>
          Até:
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </label>
        <button className="btn-limpar" onClick={handleClearFilters}>Limpar filtros</button>
      </div>

      {loading ? (
        <p>Carregando doações...</p>
      ) : doacoes.length === 0 ? (
        <p className="vazio">Nenhuma doação encontrada.</p>
      ) : (
        <>
          <table className="tabela-doacoes">
            <thead>
              <tr>
                <th>Doador</th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Qtd de Itens</th>
                {cargo === 'admin' && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {doacoes.map((d) => (
                <tr key={d.codDoc}>
                  <td>{d.nomeDoa}</td>
                  <td>{formatData(d.dtDoc)}</td>
                  <td>{d.tipoDoc || '—'}</td>
                  <td>{d.qtdItens}</td>
                  {cargo === 'admin' && (
                    <td className="acoes-cel">
                      <button
                        className="btn-editar"
                        onClick={() => navigate(`/doacoes/editar/${d.codDoc}`)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-excluir"
                        onClick={() => handleExcluir(d.codDoc)}
                      >
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="paginacao">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Anterior
            </button>
            <span>Página {page} de {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima ›
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ListaDoacoes;
