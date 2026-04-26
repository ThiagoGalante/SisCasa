const request = require('supertest');
const app = require('../../../app');
const pool = require('../../../db');

jest.mock('../../../db', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn()
  };
  mockPool.connect.mockResolvedValue(mockPool);
  return mockPool;
});

describe('Endpoints de Cestas Básicas (itens e estoque)', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('GET /api/cestas/itens', () => {
    test('CT-001: Deve retornar array de itens ativos', async () => {
      const mockItens = [
        { id: 1, descricao: 'Arroz', unidade: 'kg', ativo: true },
        { id: 2, descricao: 'Feijão', unidade: 'kg', ativo: true }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockItens });

      const response = await request(app).get('/api/cestas/itens').expect(200);

      expect(response.body).toEqual(mockItens);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toMatch(/FROM ITENS_CESTA/);
      expect(sql).toMatch(/ativo_ite = true/);
      expect(sql).toMatch(/ORDER BY desc_ite/);
    });

    test('CT-002: Deve retornar 500 em caso de erro de banco', async () => {
      pool.query.mockRejectedValueOnce(new Error('connection refused'));

      const response = await request(app).get('/api/cestas/itens').expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Erro interno');
    });
  });

  describe('GET /api/cestas/estoque', () => {
    test('CT-003: Deve retornar estoque com qtdEst zero quando LEFT JOIN não acha linha', async () => {
      const mockEstoque = [
        { id: 1, descricao: 'Arroz', unidade: 'kg', qtdEst: 50, ultimaAtualizacao: '2026-04-26T10:00:00Z' },
        { id: 2, descricao: 'Feijão', unidade: 'kg', qtdEst: 0, ultimaAtualizacao: null }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockEstoque });

      const response = await request(app).get('/api/cestas/estoque').expect(200);

      expect(response.body).toEqual(mockEstoque);
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toMatch(/LEFT JOIN ESTOQUE_ITENS/);
      expect(sql).toMatch(/COALESCE\(e\.qtd_est, 0\)/);
    });

    test('CT-004: Deve retornar 500 em caso de erro de banco', async () => {
      pool.query.mockRejectedValueOnce(new Error('relation does not exist'));

      const response = await request(app).get('/api/cestas/estoque').expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/cestas/estoque/entrada', () => {
    const entradaValida = { itemId: 1, quantidade: 50, observacao: 'Doação Igreja XYZ' };

    test('CT-005: Deve registrar entrada com sucesso (201)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ cod_ite: 1 }] }) // SELECT item ativo
        .mockResolvedValueOnce({ rows: [{ qtd_est: 50 }] }) // UPSERT estoque
        .mockResolvedValueOnce({ rows: [{ cod_mov: 42 }] }) // INSERT estoque_mov
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/cestas/estoque/entrada')
        .send(entradaValida)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Doação registrada com sucesso.',
        codMov: 42,
        qtdEstAtual: 50
      });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('CT-006: Deve aceitar entrada sem observacao (campo opcional)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ cod_ite: 1 }] }) // SELECT
        .mockResolvedValueOnce({ rows: [{ qtd_est: 10 }] }) // UPSERT
        .mockResolvedValueOnce({ rows: [{ cod_mov: 1 }] }) // INSERT mov
        .mockResolvedValueOnce({}); // COMMIT

      await request(app)
        .post('/api/cestas/estoque/entrada')
        .send({ itemId: 1, quantidade: 10 })
        .expect(201);

      const insertMovCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO ESTOQUE_MOV')
      );
      expect(insertMovCall[1]).toEqual([1, 10, null]);
    });

    test('CT-007: Deve rejeitar itemId ausente com 400', async () => {
      const response = await request(app)
        .post('/api/cestas/estoque/entrada')
        .send({ quantidade: 10 })
        .expect(400);

      expect(response.body.error).toMatch(/itemId/);
      expect(pool.connect).not.toHaveBeenCalled();
    });

    test('CT-008: Deve rejeitar quantidade <= 0 com 400', async () => {
      const response = await request(app)
        .post('/api/cestas/estoque/entrada')
        .send({ itemId: 1, quantidade: -5 })
        .expect(400);

      expect(response.body.error).toMatch(/quantidade/);
      expect(pool.connect).not.toHaveBeenCalled();
    });

    test('CT-009: Deve rejeitar quantidade não inteira com 400', async () => {
      const response = await request(app)
        .post('/api/cestas/estoque/entrada')
        .send({ itemId: 1, quantidade: 2.5 })
        .expect(400);

      expect(response.body.error).toMatch(/quantidade/);
    });

    test('CT-010: Deve rejeitar observacao acima de 500 chars com 400', async () => {
      const response = await request(app)
        .post('/api/cestas/estoque/entrada')
        .send({ itemId: 1, quantidade: 10, observacao: 'x'.repeat(501) })
        .expect(400);

      expect(response.body.error).toMatch(/observacao/);
    });

    test('CT-011: Deve retornar 404 e ROLLBACK quando item não existe ou está inativo', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT vazio
        .mockResolvedValueOnce({}); // ROLLBACK

      const response = await request(app)
        .post('/api/cestas/estoque/entrada')
        .send({ itemId: 999, quantidade: 10 })
        .expect(404);

      expect(response.body.error).toMatch(/não encontrado|inativo/);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('CT-012: Deve retornar 500 e ROLLBACK em erro de DB durante UPSERT', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ cod_ite: 1 }] }) // SELECT
        .mockRejectedValueOnce(new Error('deadlock detected')) // UPSERT falha
        .mockResolvedValueOnce({}); // ROLLBACK

      const response = await request(app)
        .post('/api/cestas/estoque/entrada')
        .send(entradaValida)
        .expect(500);

      expect(response.body.error).toContain('Erro interno');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
