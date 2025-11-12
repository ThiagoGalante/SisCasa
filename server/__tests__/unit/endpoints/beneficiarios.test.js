const request = require('supertest');
const app = require('../../../app');
const pool = require('../../../db');

// Mock do pool de conexões
jest.mock('../../../db', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn()
  };
  
  mockPool.connect.mockResolvedValue(mockPool);
  
  return mockPool;
});

// Mock do getLookupId
jest.mock('../../../utils/getLookupId', () => {
  return jest.fn(async (client, tableName, columnName, value) => {
    if (!value) return null;
    
    const lookupMap = {
      'Católica': { table: 'RELIGIAO', id: 1 },
      'Branca': { table: 'RACA', id: 1 },
      'São Paulo': { table: 'MUNICIPIO', id: 1 },
      'Hospital São Paulo': { table: 'HOSPITAL', id: 1 },
      'Pai': { table: 'GRAU_PARENTESCO', id: 1 },
      'Mãe': { table: 'GRAU_PARENTESCO', id: 2 },
      'Filho': { table: 'GRAU_PARENTESCO', id: 3 },
    };
    
    const lookup = lookupMap[value];
    if (lookup) {
      return lookup.id;
    }
    return null;
  });
});

describe('Endpoints de Beneficiários', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock do client de transação
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('POST /api/beneficiarios', () => {
    const beneficiarioValido = {
      nome: 'João da Silva',
      data_cad: '2024-01-01',
      tipo_beneficio: 1,
      data_nasc: '1990-01-15',
      email: 'joao@email.com',
      endereco: 'Rua Teste, 123',
      cidade: 'São Paulo',
      cep: '12345678',
      sexo: 'Masculino',
      raca: 'Branca',
      religiao: 'Católica',
      fumante: 'não',
      cpf: '12345678901',
      rg: '123456789',
      fone: '11987654321',
      profissao: 'Engenheiro'
    };

    describe('CT-001: Cadastro Completo com Sucesso', () => {
      test('Deve cadastrar beneficiário com todos os dados válidos', async () => {
        // Mock das consultas de lookup
        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ cod_rel: 1 }] }) // Religião
          .mockResolvedValueOnce({ rows: [{ cod_rac: 1 }] }) // Raça
          .mockResolvedValueOnce({ rows: [{ cod_mun: 1 }] }) // Município
          .mockResolvedValueOnce({ rows: [{ cod_hos: 1 }] }) // Hospital
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX numcad_pes
          .mockResolvedValueOnce({}) // INSERT PESSOAS
          .mockResolvedValueOnce({}) // INSERT BENEFICIARIOS
          .mockResolvedValueOnce({}) // COMMIT
          .mockResolvedValueOnce({ rows: [{ max_id: 1 }] }); // MAX para responsáveis (se houver)

        const response = await request(app)
          .post('/api/beneficiarios')
          .send(beneficiarioValido)
          .expect(201);

        expect(response.body).toHaveProperty('message', 'Beneficiário cadastrado com sucesso!');
        expect(response.body).toHaveProperty('id', 1);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      test('Deve cadastrar beneficiário com responsáveis e família', async () => {
        const beneficiarioComRelacionados = {
          ...beneficiarioValido,
          responsaveis: [
            { nome: 'Maria Silva', parentesco: 'Mãe', endereco: 'Rua Teste 2', fone: '11999999999' }
          ],
          familia: [
            { nome: 'Pedro Silva', parentesco: 'Filho', endereco: 'Rua Teste 3', fone: '11888888888' }
          ]
        };

        // getLookupId está mockado, então não precisa mockar essas queries
        // Ordem das queries:
        // 1. BEGIN
        // 2. MAX numcad_pes (para beneficiário)
        // 3. INSERT PESSOAS (beneficiário)
        // 4. INSERT BENEFICIARIOS
        // 5. MAX numcad_pes (para responsável) - dentro de inserirPessoaRelacionada
        // 6. INSERT PESSOAS (responsável)
        // 7. INSERT RESPONSAVEIS
        // 8. MAX numcad_pes (para familiar) - dentro de inserirPessoaRelacionada
        // 9. INSERT PESSOAS (familiar)
        // 10. INSERT COMPOSICAO_FAMILIAR
        // 11. COMMIT
        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX numcad_pes (beneficiário)
          .mockResolvedValueOnce({}) // INSERT PESSOAS (beneficiário)
          .mockResolvedValueOnce({}) // INSERT BENEFICIARIOS
          .mockResolvedValueOnce({ rows: [{ max_id: 1 }] }) // MAX numcad_pes (responsável)
          .mockResolvedValueOnce({}) // INSERT PESSOAS (responsável)
          .mockResolvedValueOnce({}) // INSERT RESPONSAVEIS
          .mockResolvedValueOnce({ rows: [{ max_id: 2 }] }) // MAX numcad_pes (familiar)
          .mockResolvedValueOnce({}) // INSERT PESSOAS (familiar)
          .mockResolvedValueOnce({}) // INSERT COMPOSICAO_FAMILIAR
          .mockResolvedValueOnce({}); // COMMIT

        const response = await request(app)
          .post('/api/beneficiarios')
          .send(beneficiarioComRelacionados)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.id).toBe(1);
      });
    });

    describe('CT-002: Cadastro sem Campos Obrigatórios', () => {
      test('Deve retornar erro quando nome estiver vazio', async () => {
        const beneficiarioInvalido = {
          ...beneficiarioValido,
          nome: ''
        };

        // getLookupId está mockado e retorna null para valores vazios
        // Ordem das queries:
        // 1. BEGIN
        // 2. MAX numcad_pes
        // 3. INSERT PESSOAS (vai falhar se nome for obrigatório no banco)
        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX numcad_pes
          .mockRejectedValueOnce(new Error('null value in column "nome_pes" violates not-null constraint')); // INSERT PESSOAS falha

        const response = await request(app)
          .post('/api/beneficiarios')
          .send(beneficiarioInvalido)
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Erro interno do servidor');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('CT-003: Cadastro com CPF Inválido', () => {
      test('Deve aceitar CPF mesmo com formato inválido (validação não implementada)', async () => {
        const beneficiarioCPFInvalido = {
          ...beneficiarioValido,
          cpf: '123' // CPF inválido
        };

        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ cod_rel: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_rac: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_mun: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_hos: null }] })
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] })
          .mockResolvedValueOnce({}) // INSERT PESSOAS (aceita CPF inválido)
          .mockResolvedValueOnce({}) // INSERT BENEFICIARIOS
          .mockResolvedValueOnce({}); // COMMIT

        const response = await request(app)
          .post('/api/beneficiarios')
          .send(beneficiarioCPFInvalido)
          .expect(201);

        // O sistema aceita CPF inválido porque não há validação implementada
        expect(response.body).toHaveProperty('id');
      });
    });

    describe('Testes de Classes de Equivalência - CPF', () => {
      test('CPF válido com 11 dígitos', async () => {
        const beneficiario = {
          ...beneficiarioValido,
          cpf: '12345678901'
        };

        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ cod_rel: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_rac: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_mun: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_hos: null }] })
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] })
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({}); // COMMIT

        await request(app)
          .post('/api/beneficiarios')
          .send(beneficiario)
          .expect(201);
      });

      test('CPF vazio (opcional)', async () => {
        const beneficiario = {
          ...beneficiarioValido,
          cpf: ''
        };

        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ cod_rel: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_rac: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_mun: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_hos: null }] })
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] })
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({}); // COMMIT

        await request(app)
          .post('/api/beneficiarios')
          .send(beneficiario)
          .expect(201);
      });
    });

    describe('Testes de Valores de Fronteira - Nome', () => {
      test('Nome com 1 caractere (mínimo)', async () => {
        const beneficiario = {
          ...beneficiarioValido,
          nome: 'A'
        };

        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ cod_rel: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_rac: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_mun: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_hos: null }] })
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] })
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({}); // COMMIT

        await request(app)
          .post('/api/beneficiarios')
          .send(beneficiario)
          .expect(201);
      });

      test('Nome com 100 caracteres (limite)', async () => {
        const beneficiario = {
          ...beneficiarioValido,
          nome: 'A'.repeat(100)
        };

        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ cod_rel: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_rac: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_mun: 1 }] })
          .mockResolvedValueOnce({ rows: [{ cod_hos: null }] })
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] })
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({}); // COMMIT

        await request(app)
          .post('/api/beneficiarios')
          .send(beneficiario)
          .expect(201);
      });
    });

    describe('CT-008: Transação com Rollback', () => {
      test('Deve fazer rollback em caso de erro', async () => {
        // getLookupId está mockado, então não precisa mockar queries de lookup
        // Ordem: BEGIN -> MAX numcad_pes -> Erro no INSERT
        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX numcad_pes
          .mockRejectedValueOnce(new Error('Database error')); // Erro no INSERT PESSOAS

        const response = await request(app)
          .post('/api/beneficiarios')
          .send(beneficiarioValido)
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Erro interno do servidor');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });
  });

  describe('GET /api/beneficiarios', () => {
    describe('CT-004: Listagem de Beneficiários', () => {
      test('Deve retornar lista de beneficiários ordenada por nome', async () => {
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
            responsaveis: [],
            familia: []
          }
        ];

        pool.query.mockResolvedValue({ rows: mockBeneficiarios });

        const response = await request(app)
          .get('/api/beneficiarios')
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0].nome).toBe('João da Silva');
        expect(response.body[1].nome).toBe('Maria Oliveira');
        expect(response.body[0]).toHaveProperty('responsaveis');
        expect(response.body[0]).toHaveProperty('familia');
      });

      test('Deve retornar array vazio quando não houver beneficiários', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const response = await request(app)
          .get('/api/beneficiarios')
          .expect(200);

        expect(response.body).toHaveLength(0);
      });

      test('Deve retornar erro 500 em caso de falha no banco', async () => {
        pool.query.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/api/beneficiarios')
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});

