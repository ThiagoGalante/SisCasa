const request = require('supertest');
const app = require('../../../app');
const pool = require('../../../db');

jest.mock('../../../db', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

/**
 * Testes da v0 do módulo de Serviços de Apoio (atendimentos a beneficiários).
 * O app.js (harness de teste) injeta um usuário admin, então as rotas
 * protegidas por requireAdmin (PUT/DELETE) são exercitáveis aqui.
 */
describe('Serviços de Apoio — v0', () => {
  beforeEach(() => jest.clearAllMocks());

  const atendimentoValido = { numcadBen: 1, codTser: 2, dtSap: '2026-05-30', obs: 'Almoço servido' };

  describe('GET /api/servicos-apoio/tipos', () => {
    test('CT-SA-001: retorna os tipos de serviço ativos', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Refeicao' }, { id: 2, nome: 'Banho' }] });
      const res = await request(app).get('/api/servicos-apoio/tipos').expect(200);
      expect(res.body).toHaveLength(2);
      expect(pool.query.mock.calls[0][0]).toMatch(/FROM TIPO_SERVICO/);
      expect(pool.query.mock.calls[0][0]).toMatch(/ativo_tser = true/);
    });
  });

  describe('GET /api/servicos-apoio', () => {
    test('CT-SA-002: lista paginada com envelope padrão', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10, beneficiarioNome: 'Ana', tipoNome: 'Refeicao' }] });
      const res = await request(app).get('/api/servicos-apoio?page=1&limit=20').expect(200);
      expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(res.body.data).toHaveLength(1);
    });

    test('CT-SA-003: aplica filtro por beneficiário e tipo', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });
      await request(app).get('/api/servicos-apoio?beneficiario=ana&tipo=2').expect(200);
      const countSql = pool.query.mock.calls[0][0];
      expect(countSql).toMatch(/p\.nome_pes ILIKE/);
      expect(countSql).toMatch(/s\.cod_tser =/);
    });
  });

  describe('POST /api/servicos-apoio', () => {
    test('CT-SA-004: registra atendimento válido (201)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ numcad_pes: 1 }] }) // beneficiário existe
        .mockResolvedValueOnce({ rows: [{ cod_tser: 2 }] })   // tipo existe
        .mockResolvedValueOnce({ rows: [{ cod_sap: 99 }] });  // INSERT
      const res = await request(app).post('/api/servicos-apoio').send(atendimentoValido).expect(201);
      expect(res.body).toHaveProperty('id', 99);
    });

    test('CT-SA-005: rejeita payload inválido (400) sem tocar no banco', async () => {
      const res = await request(app).post('/api/servicos-apoio').send({ numcadBen: 0 }).expect(400);
      expect(res.body.error).toMatch(/numcadBen/);
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('CT-SA-006: 404 quando beneficiário não existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // beneficiário não existe
      const res = await request(app).post('/api/servicos-apoio').send(atendimentoValido).expect(404);
      expect(res.body.error).toMatch(/Beneficiário/);
    });

    test('CT-SA-007: 404 quando tipo de serviço não existe', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ numcad_pes: 1 }] })
        .mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/api/servicos-apoio').send(atendimentoValido).expect(404);
      expect(res.body.error).toMatch(/Tipo de serviço/);
    });
  });

  describe('PUT /api/servicos-apoio/:id', () => {
    test('CT-SA-008: atualiza atendimento existente (200)', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      const res = await request(app).put('/api/servicos-apoio/99').send(atendimentoValido).expect(200);
      expect(res.body).toHaveProperty('id', 99);
    });

    test('CT-SA-009: 404 ao atualizar inexistente', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 });
      await request(app).put('/api/servicos-apoio/12345').send(atendimentoValido).expect(404);
    });
  });

  describe('DELETE /api/servicos-apoio/:id', () => {
    test('CT-SA-010: exclui atendimento existente (200)', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      const res = await request(app).delete('/api/servicos-apoio/99').expect(200);
      expect(res.body).toHaveProperty('id', 99);
    });

    test('CT-SA-011: 404 ao excluir inexistente', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 });
      await request(app).delete('/api/servicos-apoio/12345').expect(404);
    });
  });
});
