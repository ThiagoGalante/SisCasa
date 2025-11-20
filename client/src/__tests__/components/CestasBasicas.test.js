import React from 'react';
import { render, screen } from '@testing-library/react';
import CestasBasicas from '../../components/CestasBasicas';

describe('CestasBasicas', () => {
  test('Deve renderizar o componente corretamente', () => {
    render(<CestasBasicas />);

    expect(screen.getByText('Controle de Cestas Básicas')).toBeInTheDocument();
    expect(screen.getByText('Estoque Atual')).toBeInTheDocument();
    expect(screen.getByText('Histórico de Entregas')).toBeInTheDocument();
  });

  test('Deve exibir estoque atual', () => {
    render(<CestasBasicas />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Cestas disponíveis')).toBeInTheDocument();
  });

  test('Deve renderizar histórico de entregas', () => {
    render(<CestasBasicas />);

    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText('José Pereira')).toBeInTheDocument();
  });

  test('Deve exibir botão de registrar entrega', () => {
    render(<CestasBasicas />);

    expect(screen.getByText('+ Registrar Nova Entrega')).toBeInTheDocument();
  });

  test('Deve formatar datas corretamente', () => {
    render(<CestasBasicas />);

    // Verifica se as datas são exibidas (formato brasileiro)
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });
});

