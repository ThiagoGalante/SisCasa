import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';
import './CestasBasicas.css';

const CestasBasicas = () => {
  const navigate = useNavigate();

  const [estoque, setEstoque] = useState([]);
  const [estoqueLoading, setEstoqueLoading] = useState(true);

  const [entregas, setEntregas] = useState([]);
  const [entregasLoading, setEntregasLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [beneficiarioInput, setBeneficiarioInput] = useState('');
  const [beneficiarioFilter, setBeneficiarioFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBeneficiarioFilter(beneficiarioInput), 300);
    return () => clearTimeout(t);
  }, [beneficiarioInput]);

  useEffect(() => {
    setPage(1);
  }, [beneficiarioFilter, dataInicio, dataFim]);

  const loadEstoque = useCallback(async () => {
    setEstoqueLoading(true);
    try {
      const res = await authenticatedFetch('/api/cestas/estoque');
      if (!res.ok) throw new Error('Falha ao carregar estoque');
      setEstoque(await res.json());
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar estoque: ' + err.message);
    } finally {
      setEstoqueLoading(false);
    }
  }, []);

  const loadEntregas = useCallback(async () => {
    setEntregasLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (beneficiarioFilter) params.set('beneficiario', beneficiarioFilter);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await authenticatedFetch(`/api/cestas?${params}`);
      if (!res.ok) throw new Error('Falha ao carregar entregas');
      const json = await res.json();
      setEntregas(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar entregas: ' + err.message);
    } finally {
      setEntregasLoading(false);
    }
  }, [page, limit, beneficiarioFilter, dataInicio, dataFim]);

  useEffect(() => { loadEstoque(); }, [loadEstoque]);
  useEffect(() => { loadEntregas(); }, [loadEntregas]);

  const handleClearFilters = () => {
    setBeneficiarioInput('');
    setDataInicio('');
    setDataFim('');
  };

  const formatData = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const formatTimestamp = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR');
  };

  return (
    <div className="cestas-container">
      <div className="header-cestas">
        <h1>Controle de Cestas Básicas</h1>
        <div className="header-actions">
          <button className="btn-secundario" onClick={() => navigate('/cestas-basicas/doacao')}>
            Registrar Doação
          </button>
          <button className="btn-primario" onClick={() => navigate('/cestas-basicas/cadastro')}>
            + Nova Entrega
          </button>
        </div>
      </div>

      <section className="estoque-card">
        <h2>Estoque Atual</h2>
        {estoqueLoading ? (
          <p>Carregando estoque...</p>
        ) : estoque.length === 0 ? (
          <p>Nenhum item cadastrado.</p>
        ) : (
          <table className="tabela-estoque">
            <thead>
              <tr>
                <th>Item</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Última atualização</th>
              </tr>
            </thead>
            <tbody>
              {estoque.map((item) => (
                <tr key={item.id} className={item.qtdEst === 0 ? 'estoque-zerado' : ''}>
                  <td>{item.descricao}</td>
                  <td>{item.unidade || '—'}</td>
                  <td><strong>{item.qtdEst}</strong></td>
                  <td>{formatTimestamp(item.ultimaAtualizacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="historico-container">
        <h2>Histórico de Entregas {total > 0 && <span className="total-badge">({total})</span>}</h2>

        <div className="filtros">
          <input
            type="text"
            placeholder="Filtrar por beneficiário..."
            value={beneficiarioInput}
            onChange={(e) => setBeneficiarioInput(e.target.value)}
          />
          <label>
            De:
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </label>
          <label>
            Até:
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </label>
          <button className="btn-limpar" onClick={handleClearFilters}>Limpar filtros</button>
        </div>

        {entregasLoading ? (
          <p>Carregando entregas...</p>
        ) : entregas.length === 0 ? (
          <p className="vazio">Nenhuma entrega encontrada.</p>
        ) : (
          <>
            <table className="tabela-historico">
              <thead>
                <tr>
                  <th>Beneficiário</th>
                  <th>Data</th>
                  <th>Itens</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.beneficiarioNome}</td>
                    <td>{formatData(c.dtCes)}</td>
                    <td>{c.qtdTiposItens} tipo(s) / {c.qtdTotalItens} unidade(s)</td>
                    <td>
                      <Link to={`/cestas-basicas/editar/${c.id}`} className="link-editar">
                        Editar
                      </Link>
                    </td>
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
      </section>
    </div>
  );
};

export default CestasBasicas;
