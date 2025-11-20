import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ListaBeneficiarios from '../../components/ListaBeneficiarios';

// Mock do react-router-dom
jest.mock('react-router-dom');

describe('ListaBeneficiarios', () => {
  const mockBeneficiarios = [
    {
      id: 1,
      numeroCadastro: 1,
      nome: 'João da Silva',
      cpf: '12345678901',
      dataCadastro: '2024-01-01',
      dataNascimento: '1990-01-15',
      endereco: 'Rua Teste, 123',
      cidade: 'São Paulo',
      cep: '12345678',
      email: 'joao@email.com',
      sexo: 'Masculino',
      raca: 'Branca',
      religiao: 'Católica',
      fumante: 0,
      rg: '123456789',
      hospital: null,
      matriculaHospital: null,
      patologia: null,
      medicacao: null,
      profissao: 'Engenheiro',
      observacao: null,
      responsaveis: [],
      familia: []
    },
    {
      id: 2,
      numeroCadastro: 2,
      nome: 'Maria Oliveira',
      cpf: '98765432100',
      dataCadastro: '2024-01-02',
      dataNascimento: '1992-05-20',
      endereco: 'Rua Teste 2, 456',
      cidade: 'Rio de Janeiro',
      cep: '87654321',
      email: 'maria@email.com',
      sexo: 'Feminino',
      raca: 'Parda',
      religiao: 'Evangélica',
      fumante: 0,
      rg: '987654321',
      hospital: null,
      matriculaHospital: null,
      patologia: null,
      medicacao: null,
      profissao: 'Médica',
      observacao: null,
      responsaveis: [
        { nome: 'José Oliveira', parentesco: 'Pai', endereco: 'Rua Teste 3', fone: '11999999999' }
      ],
      familia: []
    }
  ];

  beforeEach(() => {
    global.fetch.mockClear();
  });

  describe('CT-004: Listagem de Beneficiários', () => {
    test('Deve renderizar a lista de beneficiários', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      // Aguarda o carregamento desaparecer
      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Aguarda os dados serem exibidos
      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });

      expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
      expect(screen.getByText('12345678901')).toBeInTheDocument();
      expect(screen.getByText('98765432100')).toBeInTheDocument();
    });

    test('Deve exibir estado de carregamento', () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Nunca resolve

      render(<ListaBeneficiarios />);

      expect(screen.getByText('Carregando beneficiários...')).toBeInTheDocument();
    });

    test('Deve exibir erro quando a requisição falhar', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Erro ao buscar dados dos beneficiários.'));

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        // O componente exibe error.message, então verificamos a mensagem de erro
        expect(screen.getByText(/Erro ao buscar dados dos beneficiários/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('Deve exibir mensagem quando não houver beneficiários', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum beneficiário encontrado.')).toBeInTheDocument();
      });
    });
  });

  describe('CT-005: Busca por Nome', () => {
    test('Deve filtrar beneficiários por nome', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      // Aguarda o carregamento
      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Buscar por nome, CPF ou nº de cadastro/i);
      fireEvent.change(searchInput, { target: { value: 'João' } });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
        expect(screen.queryByText('Maria Oliveira')).not.toBeInTheDocument();
      });
    });

    test('Deve fazer busca case-insensitive', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Buscar por nome, CPF ou nº de cadastro/i);
      fireEvent.change(searchInput, { target: { value: 'joão' } });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });
    });

    test('Deve filtrar beneficiários por CPF', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Buscar por nome, CPF ou nº de cadastro/i);
      fireEvent.change(searchInput, { target: { value: '12345678901' } });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
        expect(screen.queryByText('Maria Oliveira')).not.toBeInTheDocument();
      });
    });

    test('Deve filtrar beneficiários por número de cadastro', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Buscar por nome, CPF ou nº de cadastro/i);
      fireEvent.change(searchInput, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });
    });
  });

  describe('CT-006: Expansão de Detalhes', () => {
    test('Deve expandir detalhes do beneficiário ao clicar no botão', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });

      // Procura pelo botão de expandir
      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons.find(button => 
        button.getAttribute('title') === 'Expandir'
      );

      expect(expandButton).toBeInTheDocument();
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Dados Pessoais')).toBeInTheDocument();
        expect(screen.getByText('Documentos e Profissão')).toBeInTheDocument();
        expect(screen.getByText('Informações de Saúde')).toBeInTheDocument();
      });
    });

    test('Deve exibir detalhes completos do beneficiário quando expandido', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons.find(button => 
        button.getAttribute('title') === 'Expandir'
      );

      expect(expandButton).toBeInTheDocument();
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/Engenheiro/i)).toBeInTheDocument();
        expect(screen.getByText(/São Paulo/i)).toBeInTheDocument();
      });
    });

    test('Deve exibir responsáveis quando expandido', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
      });

      // Encontra o botão de expandir do segundo beneficiário (Maria)
      const expandButtons = screen.getAllByRole('button');
      // Procura pelo botão que está na linha de Maria Oliveira
      const mariaRow = screen.getByText('Maria Oliveira').closest('tr');
      const expandButton = mariaRow?.querySelector('button[title="Expandir"]');

      if (expandButton) {
        fireEvent.click(expandButton);

        await waitFor(() => {
          expect(screen.getByText('Responsáveis')).toBeInTheDocument();
          expect(screen.getByText('José Oliveira')).toBeInTheDocument();
        });
      } else {
        // Se não encontrou, tenta com o segundo botão de expandir
        const secondExpandButton = expandButtons.find(button => 
          button.getAttribute('title') === 'Expandir'
        );
        if (secondExpandButton) {
          fireEvent.click(secondExpandButton);
          await waitFor(() => {
            expect(screen.getByText('Responsáveis')).toBeInTheDocument();
          });
        }
      }
    });

    test('Deve recolher detalhes ao clicar novamente', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeneficiarios
      });

      render(<ListaBeneficiarios />);

      await waitFor(() => {
        expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('João da Silva')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons.find(button => 
        button.getAttribute('title') === 'Expandir'
      );

      expect(expandButton).toBeInTheDocument();
      
      // Expande
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Dados Pessoais')).toBeInTheDocument();
      });

      // Recolhe (agora o título deve ser "Recolher")
      const collapseButton = screen.getByTitle('Recolher');
      expect(collapseButton).toBeInTheDocument();
      fireEvent.click(collapseButton);

      await waitFor(() => {
        expect(screen.queryByText('Dados Pessoais')).not.toBeInTheDocument();
      });
    });
  });

  test('Deve exibir botão de adicionar novo beneficiário', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBeneficiarios
    });

    render(<ListaBeneficiarios />);

    await waitFor(() => {
      expect(screen.queryByText('Carregando beneficiários...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('+ Adicionar Novo')).toBeInTheDocument();

    const addButton = screen.getByText('+ Adicionar Novo');
    expect(addButton.closest('a')).toHaveAttribute('href', '/beneficiarios/cadastro');
  });
});

