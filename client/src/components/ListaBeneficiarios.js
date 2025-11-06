import React, { useState, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import "./ListaBeneficiarios.css"; // Criaremos este CSS para estilizar a página

const ListaBeneficiarios = () => {
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBeneficiarios = async () => {
      try {
        const response = await fetch('/api/beneficiarios');
        if (!response.ok) {
          throw new Error('Erro ao buscar dados dos beneficiários.');
        }
        const data = await response.json();
        setBeneficiarios(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBeneficiarios();
  }, []);

  // Filtra os beneficiários com base no termo de busca
  const beneficiariosFiltrados = beneficiarios.filter(
    (b) =>
      (b.nome && b.nome.toLowerCase().includes(termoBusca.toLowerCase())) ||
      (b.cpf && b.cpf.includes(termoBusca)) ||
      (b.numeroCadastro && b.numeroCadastro.toString().includes(termoBusca))
  );

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const DetalheItem = ({ label, value, isFullWidth = false }) => (
    <div className={`detalhe-item ${isFullWidth ? 'full-width' : ''}`}>
      <span className="detalhe-label">{label}</span>
      <span className="detalhe-value">{value || 'N/A'}</span>
    </div>
  );

  const TabelaPessoasRelacionadas = ({ titulo, pessoas }) => {
    if (!pessoas || pessoas.length === 0) {
      return (
        <div className="detalhe-grupo">
          <h4>{titulo}</h4>
          <p>Nenhum registro encontrado.</p>
        </div>
      );
    }

    return (
      <div className="detalhe-grupo">
        <h4>{titulo}</h4>
        <table className="tabela-detalhes-interna">
          <thead>
            <tr><th>Nome</th><th>Parentesco</th><th>Endereço</th><th>Fone</th></tr>
          </thead>
          <tbody>
            {pessoas.map((p, index) => (
              <tr key={index}><td>{p.nome || 'N/A'}</td><td>{p.parentesco || 'N/A'}</td><td>{p.endereco || 'N/A'}</td><td>{p.fone || 'N/A'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const DetalhesBeneficiario = ({ beneficiario }) => (
    <div className="detalhes-expandidos">
      <div className="detalhe-grupo">
        <h4>Dados Pessoais</h4>
        <div className="detalhes-grid">
          <DetalheItem label="Data de Cadastro" value={beneficiario.dataCadastro ? new Date(beneficiario.dataCadastro).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'} />
          <DetalheItem label="Data de Nasc." value={beneficiario.dataNascimento ? new Date(beneficiario.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'} />
          <DetalheItem label="Sexo" value={beneficiario.sexo} />
          <DetalheItem label="Raça" value={beneficiario.raca} />
          <DetalheItem label="Religião" value={beneficiario.religiao} />
          <DetalheItem label="Fumante" value={beneficiario.fumante === 1 ? 'Sim' : 'Não'} />
          <DetalheItem label="Endereço" value={`${beneficiario.endereco || ''}, ${beneficiario.cidade || ''} - ${beneficiario.cep || ''}`} isFullWidth />
          <DetalheItem label="Email" value={beneficiario.email} isFullWidth />
        </div>
      </div>
      <div className="detalhe-grupo">
        <h4>Documentos e Profissão</h4>
        <div className="detalhes-grid">
          <DetalheItem label="RG" value={beneficiario.rg} />
          <DetalheItem label="Profissão" value={beneficiario.profissao} />
        </div>
      </div>
      <div className="detalhe-grupo">
        <h4>Informações de Saúde</h4>
        <div className="detalhes-grid">
          <DetalheItem label="Hospital" value={beneficiario.hospital} />
          <DetalheItem label="Matrícula" value={beneficiario.matriculaHospital} />
          <DetalheItem label="Patologia" value={beneficiario.patologia} isFullWidth />
          <DetalheItem label="Medicação" value={beneficiario.medicacao} isFullWidth />
        </div>
      </div>
      <div className="detalhe-grupo">
        <h4>Observações</h4>
        <p className="observacao-texto">{beneficiario.observacao || 'Nenhuma observação.'}</p>
      </div>

      <TabelaPessoasRelacionadas titulo="Responsáveis" pessoas={beneficiario.responsaveis} />
      <TabelaPessoasRelacionadas titulo="Composição Familiar" pessoas={beneficiario.familia} />

    </div>
  );

  return (
    <div className="lista-beneficiarios-container">
      <div className="header-lista">
        <h1>Beneficiários</h1>
        <Link to="/beneficiarios/cadastro" className="btn-adicionar">
          + Adicionar Novo
        </Link>
      </div>

      <div className="caixa-busca">
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou nº de cadastro..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
        />
      </div>

      {loading && <p>Carregando beneficiários...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
      <table className="tabela-beneficiarios">
        <thead>
          <tr>
            <th>Nº Cadastro</th>
            <th>Nome</th>
            <th>CPF</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {beneficiariosFiltrados.map((beneficiario) => (
            <Fragment key={beneficiario.id}>
              <tr>
                <td>{beneficiario.numeroCadastro}</td>
                <td>{beneficiario.nome}</td>
                <td>{beneficiario.cpf}</td>
                <td className="acoes">
                  <button onClick={() => toggleExpand(beneficiario.id)} className="acao-expandir" title={expandedId === beneficiario.id ? 'Recolher' : 'Expandir'}>
                    {expandedId === beneficiario.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    )}
                  </button>
                  <Link to={`/beneficiarios/editar/${beneficiario.id}`} className="acao-editar">
                    ✏️
                  </Link>
                </td>
              </tr>
              {expandedId === beneficiario.id && (
                <tr className="linha-detalhes">
                  <td colSpan="4">
                    <DetalhesBeneficiario beneficiario={beneficiario} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {beneficiariosFiltrados.length === 0 && (
            <tr><td colSpan="4" className="text-center py-4">Nenhum beneficiário encontrado.</td></tr>
          )}
        </tbody>
      </table>
      )}
    </div>
  );
};

export default ListaBeneficiarios;
