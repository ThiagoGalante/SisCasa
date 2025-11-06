import React, { useState } from 'react';
import './CestasBasicas.css';

// Dados de exemplo para o histórico. No futuro, virão da API.
const historicoInicial = [
  { id: 1, beneficiario: 'João da Silva', cpf: '111.222.333-44', data: '2024-05-10', responsavel: 'Admin' },
  { id: 2, beneficiario: 'Maria Oliveira', cpf: '222.333.444-55', data: '2024-05-12', responsavel: 'Admin' },
  { id: 3, beneficiario: 'José Pereira', cpf: '333.444.555-66', data: '2024-05-15', responsavel: 'Admin' },
];

const CestasBasicas = () => {
  const [estoque, setEstoque] = useState(50); // Estoque inicial de exemplo
  const [historico, setHistorico] = useState(historicoInicial);

  return (
    <div className="cestas-container">
      <div className="header-cestas">
        <h1>Controle de Cestas Básicas</h1>
        <button className="btn-registrar-entrega">
          + Registrar Nova Entrega
        </button>
      </div>

      {/* Seção de Controle de Estoque */}
      <div className="estoque-card">
        <h2>Estoque Atual</h2>
        <p className="estoque-numero">{estoque}</p>
        <span>Cestas disponíveis</span>
      </div>

      {/* Seção de Histórico de Entregas */}
      <div className="historico-container">
        <h2>Histórico de Entregas</h2>
        <table className="tabela-historico">
          <thead>
            <tr>
              <th>Beneficiário</th>
              <th>CPF</th>
              <th>Data da Entrega</th>
              <th>Responsável</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((item) => (
              <tr key={item.id}>
                <td>{item.beneficiario}</td>
                <td>{item.cpf}</td>
                <td>{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>{item.responsavel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CestasBasicas;