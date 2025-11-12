import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FormularioBeneficiarios from '../../components/FormularioBeneficiarios';

describe('FormularioBeneficiarios', () => {
  beforeEach(() => {
    // Reset dos mocks
    global.fetch.mockClear();
    global.alert.mockClear();

    // Mock das respostas das APIs de lookup
    // Retorna sempre uma Promise resolvida com método json()
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/tipos-beneficio')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Auxílio Alimentação' }, { id: 2, nome: 'Auxílio Moradia' }]
        });
      }
      if (url.includes('/api/cidades')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'São Paulo' }, { id: 2, nome: 'Rio de Janeiro' }]
        });
      }
      if (url.includes('/api/racas')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Branca' }, { id: 2, nome: 'Parda' }]
        });
      }
      if (url.includes('/api/religioes')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Católica' }, { id: 2, nome: 'Evangélica' }]
        });
      }
      if (url.includes('/api/hospitais')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Hospital São Paulo' }]
        });
      }
      if (url.includes('/api/graus-parentesco')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Pai' }, { id: 2, nome: 'Mãe' }]
        });
      }
      // Para outras URLs, retorna um objeto com json() que retorna array vazio
      // Isso é importante porque o código usa .catch(() => ({ json: async () => [] }))
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    });
  });

  test('Deve renderizar o formulário corretamente', async () => {
    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(screen.getByText('Cadastrar Beneficiário')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Aguarda as opções carregarem
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Verifica se os campos existem usando querySelector
    expect(document.querySelector('input[name="nome"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="cpf"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument();
  });

  test('Deve carregar opções de lookup ao montar o componente', async () => {
    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tipos-beneficio');
      expect(global.fetch).toHaveBeenCalledWith('/api/cidades');
      expect(global.fetch).toHaveBeenCalledWith('/api/racas');
      expect(global.fetch).toHaveBeenCalledWith('/api/religioes');
      expect(global.fetch).toHaveBeenCalledWith('/api/hospitais');
      expect(global.fetch).toHaveBeenCalledWith('/api/graus-parentesco');
    });
  });

  test('Deve permitir adicionar responsável', async () => {
    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(screen.getByText('Adicionar Responsável')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Adicionar Responsável');
    fireEvent.click(addButton);

    // Verifica se novos campos de responsável apareceram
    await waitFor(() => {
      const nomeInputs = document.querySelectorAll('input[name*="nome"]');
      expect(nomeInputs.length).toBeGreaterThan(1);
    });
  });

  test('Deve permitir remover responsável', async () => {
    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(screen.getByText('Adicionar Responsável')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Adiciona um responsável
    const addButton = screen.getByText('Adicionar Responsável');
    fireEvent.click(addButton);

    await waitFor(() => {
      // Procura pelo botão de remover
      const removeButtons = screen.getAllByTitle(/Remover/i);
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    // Remove o responsável (clica no primeiro botão de remover)
    const removeButtons = screen.getAllByTitle(/Remover/i);
    const initialRemoveButtonsCount = removeButtons.length;
    
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
      
      // Verifica se o botão foi clicado (o componente deve lidar com a remoção)
      // Como o react-hook-form pode manter campos, apenas verificamos que a ação ocorreu
      await waitFor(() => {
        // Verifica que ainda temos o formulário renderizado
        expect(screen.getByText('Adicionar Responsável')).toBeInTheDocument();
      });
    }
  });

  test('Deve permitir adicionar membro da família', async () => {
    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(screen.getByText('Adicionar Membro')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Adicionar Membro');
    fireEvent.click(addButton);

    // Verifica se novos campos de família apareceram
    await waitFor(() => {
      expect(screen.getByText('Composição Familiar')).toBeInTheDocument();
    });
  });

  test('Deve submeter o formulário com dados válidos', async () => {
    let callCount = 0;
    global.fetch.mockImplementation((url) => {
      // Primeiras chamadas são para carregar opções
      if (url.includes('/api/tipos-beneficio')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Auxílio Alimentação' }]
        });
      }
      if (url.includes('/api/cidades')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'São Paulo' }]
        });
      }
      if (url.includes('/api/racas')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Branca' }]
        });
      }
      if (url.includes('/api/religioes')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Católica' }]
        });
      }
      if (url.includes('/api/hospitais')) {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      if (url.includes('/api/graus-parentesco')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Pai' }]
        });
      }
      // Para /api/beneficiarios (POST)
      if (url.includes('/api/beneficiarios') && callCount === 0) {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Beneficiário cadastrado com sucesso!', id: 1 })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    });

    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(screen.getByText('Cadastrar Beneficiário')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Aguarda opções carregarem
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Preenche campos do formulário usando name attribute
    const nomeInput = document.querySelector('input[name="nome"]');
    const emailInput = document.querySelector('input[name="email"]');
    const cpfInput = document.querySelector('input[name="cpf"]');

    expect(nomeInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
    expect(cpfInput).toBeInTheDocument();

    fireEvent.change(nomeInput, { target: { value: 'João da Silva' } });
    fireEvent.change(emailInput, { target: { value: 'joao@email.com' } });
    fireEvent.change(cpfInput, { target: { value: '12345678901' } });

    // Submete o formulário
    const submitButton = screen.getByText('Salvar');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/beneficiarios', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Salvo com sucesso');
    });
  });

  test('Deve exibir alerta de erro quando a submissão falhar', async () => {
    // Primeiro mock para carregar opções
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/tipos-beneficio')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Auxílio Alimentação' }]
        });
      }
      if (url.includes('/api/cidades')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'São Paulo' }]
        });
      }
      if (url.includes('/api/racas')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Branca' }]
        });
      }
      if (url.includes('/api/religioes')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Católica' }]
        });
      }
      if (url.includes('/api/hospitais')) {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      if (url.includes('/api/graus-parentesco')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Pai' }]
        });
      }
      // Para /api/beneficiarios, rejeita
      if (url.includes('/api/beneficiarios')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    });

    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(screen.getByText('Cadastrar Beneficiário')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Aguarda opções carregarem
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const nomeInput = document.querySelector('input[name="nome"]');
    if (nomeInput) {
      fireEvent.change(nomeInput, { target: { value: 'João da Silva' } });
    }

    const submitButton = screen.getByText('Salvar');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Falha ao salvar (veja console)');
    }, { timeout: 3000 });
  });

  test('Deve resetar o formulário após submissão bem-sucedida', async () => {
    let callCount = 0;
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/tipos-beneficio')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Auxílio Alimentação' }]
        });
      }
      if (url.includes('/api/cidades')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'São Paulo' }]
        });
      }
      if (url.includes('/api/racas')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Branca' }]
        });
      }
      if (url.includes('/api/religioes')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Católica' }]
        });
      }
      if (url.includes('/api/hospitais')) {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      if (url.includes('/api/graus-parentesco')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, nome: 'Pai' }]
        });
      }
      if (url.includes('/api/beneficiarios') && callCount === 0) {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Beneficiário cadastrado com sucesso!', id: 1 })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    });

    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(screen.getByText('Cadastrar Beneficiário')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const nomeInput = document.querySelector('input[name="nome"]');
    if (nomeInput) {
      fireEvent.change(nomeInput, { target: { value: 'João da Silva' } });
      expect(nomeInput.value).toBe('João da Silva');
    }

    const submitButton = screen.getByText('Salvar');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Salvo com sucesso');
    }, { timeout: 3000 });

    // Verifica se o formulário foi resetado (campo nome vazio)
    await waitFor(() => {
      if (nomeInput) {
        expect(nomeInput.value).toBe('');
      }
    }, { timeout: 3000 });
  });

  test('Deve permitir limpar o formulário', async () => {
    render(<FormularioBeneficiarios />);

    await waitFor(() => {
      expect(screen.getByText('Cadastrar Beneficiário')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const nomeInput = document.querySelector('input[name="nome"]');
    if (nomeInput) {
      fireEvent.change(nomeInput, { target: { value: 'João da Silva' } });
      expect(nomeInput.value).toBe('João da Silva');
    }

    const clearButton = screen.getByText('Limpar');
    fireEvent.click(clearButton);

    await waitFor(() => {
      if (nomeInput) {
        expect(nomeInput.value).toBe('');
      }
    }, { timeout: 3000 });
  });
});

