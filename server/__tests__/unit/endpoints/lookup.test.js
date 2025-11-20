const request = require('supertest');
const app = require('../../../app');
const pool = require('../../../db');

// Mock do pool de conexões
jest.mock('../../../db', () => ({
  query: jest.fn()
}));

describe('Endpoints de Lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tipos-beneficio', () => {
    test('Deve retornar lista de tipos de benefício', async () => {
      // O SQL faz SELECT COD_TIB as id, DESC_TIB as nome, então o resultado já vem com id e nome
      const mockData = [
        { id: 1, nome: 'Auxílio Alimentação' },
        { id: 2, nome: 'Auxílio Moradia' }
      ];

      pool.query.mockResolvedValue({ rows: mockData });

      const response = await request(app)
        .get('/api/tipos-beneficio')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('nome');
      expect(response.body[0].nome).toBe('Auxílio Alimentação');
    });

    test('Deve retornar erro 500 em caso de falha no banco', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tipos-beneficio')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/cidades', () => {
    test('Deve retornar lista de cidades', async () => {
      // O SQL faz SELECT NOME_MUN as id, NOME_MUN as nome
      const mockData = [
        { id: 'São Paulo', nome: 'São Paulo' },
        { id: 'Rio de Janeiro', nome: 'Rio de Janeiro' }
      ];

      pool.query.mockResolvedValue({ rows: mockData });

      const response = await request(app)
        .get('/api/cidades')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].nome).toBe('São Paulo');
      expect(response.body[0].id).toBe('São Paulo');
    });
  });

  describe('GET /api/racas', () => {
    test('Deve retornar lista de raças', async () => {
      const mockData = [
        { DESC_RAC: 'Branca' },
        { DESC_RAC: 'Parda' }
      ];

      pool.query.mockResolvedValue({ rows: mockData });

      const response = await request(app)
        .get('/api/racas')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /api/religioes', () => {
    test('Deve retornar lista de religiões', async () => {
      const mockData = [
        { DESC_REL: 'Católica' },
        { DESC_REL: 'Evangélica' }
      ];

      pool.query.mockResolvedValue({ rows: mockData });

      const response = await request(app)
        .get('/api/religioes')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /api/hospitais', () => {
    test('Deve retornar lista de hospitais', async () => {
      const mockData = [
        { NOME_HOS: 'Hospital São Paulo' },
        { NOME_HOS: 'Hospital Rio' }
      ];

      pool.query.mockResolvedValue({ rows: mockData });

      const response = await request(app)
        .get('/api/hospitais')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /api/graus-parentesco', () => {
    test('Deve retornar lista de graus de parentesco', async () => {
      const mockData = [
        { DESC_GPA: 'Pai' },
        { DESC_GPA: 'Mãe' }
      ];

      pool.query.mockResolvedValue({ rows: mockData });

      const response = await request(app)
        .get('/api/graus-parentesco')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });
});

