const request = require('supertest');
const app = require('../../app');
const pool = require('../../db');

// Mock do pool de conexões
jest.mock('../../db', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn()
  };
  
  mockPool.connect.mockResolvedValue(mockPool);
  
  return mockPool;
});

// Mock do getLookupId para simplificar os testes
jest.mock('../../utils/getLookupId', () => {
  return jest.fn(async (client, tableName, columnName, value) => {
    // Simula retorno de IDs baseado no valor
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

describe('Testes de Integração - API', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('Integração Frontend-Backend', () => {
    test('Deve processar requisição GET /api/beneficiarios corretamente', async () => {
      const mockBeneficiarios = [
        {
          id: 1,
          numeroCadastro: 1,
          nome: 'João da Silva',
          cpf: '12345678901',
          responsaveis: [],
          familia: []
        }
      ];

      pool.query.mockResolvedValue({ rows: mockBeneficiarios });

      const response = await request(app)
        .get('/api/beneficiarios')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('nome');
      expect(response.body[0]).toHaveProperty('cpf');
    });

    test('Deve processar requisição POST /api/beneficiarios com JSON válido', async () => {
      const beneficiario = {
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

      // Mock de todas as queries na ordem correta
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX numcad_pes para beneficiário
        .mockResolvedValueOnce({}) // INSERT PESSOAS (beneficiário)
        .mockResolvedValueOnce({}) // INSERT BENEFICIARIOS
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/beneficiarios')
        .send(beneficiario)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(1);
    });

    test('Deve retornar erro 500 quando o banco de dados falhar', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/beneficiarios')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('Deve retornar erro 500 quando POST falhar', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Erro no MAX ou INSERT

      const beneficiario = {
        nome: 'João da Silva',
        tipo_beneficio: 1
      };

      const response = await request(app)
        .post('/api/beneficiarios')
        .send(beneficiario)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Integridade Referencial - CT-007', () => {
    test('Deve manter integridade referencial ao cadastrar beneficiário', async () => {
      const beneficiario = {
        nome: 'João da Silva',
        data_cad: '2024-01-01',
        tipo_beneficio: 1,
        cidade: 'São Paulo',
        raca: 'Branca',
        religiao: 'Católica',
        hospital: 'Hospital São Paulo'
      };

      // Mock das queries na ordem correta
      // getLookupId está mockado para retornar IDs corretos automaticamente
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX numcad_pes
        .mockResolvedValueOnce({}) // INSERT PESSOAS (com chaves estrangeiras)
        .mockResolvedValueOnce({}) // INSERT BENEFICIARIOS
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/beneficiarios')
        .send(beneficiario)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(1);
      // Verifica que a transação foi commitada
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Transação com Rollback - CT-008', () => {
    test('Deve fazer rollback completo em caso de erro', async () => {
      const beneficiario = {
        nome: 'João da Silva',
        tipo_beneficio: 1
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Constraint violation')); // Erro no MAX ou INSERT

      const response = await request(app)
        .post('/api/beneficiarios')
        .send(beneficiario)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Erro interno do servidor');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

