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

describe('Endpoints CRUD de Cestas Básicas', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('GET /api/cestas', () => {
    test('CT-101: Deve retornar lista paginada com defaults (page=1, limit=20)', async () => {
      const mockRows = [
        { id: 2, beneficiarioId: 5, beneficiarioNome: 'Maria', dtCes: '2026-04-26', obsCes: null, qtdTiposItens: 2, qtdTotalItens: 3 },
        { id: 1, beneficiarioId: 4, beneficiarioNome: 'João', dtCes: '2026-04-25', obsCes: 'Teste', qtdTiposItens: 1, qtdTotalItens: 1 }
      ];
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 2 }] })
        .mockResolvedValueOnce({ rows: mockRows });

      const response = await request(app).get('/api/cestas').expect(200);

      expect(response.body).toEqual({
        data: mockRows, page: 1, limit: 20, total: 2, totalPages: 1
      });
      const dataParams = pool.query.mock.calls[1][1];
      expect(dataParams).toEqual([20, 0]);
    });

    test('CT-102: Deve aplicar filtros beneficiario e datas', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/cestas?beneficiario=ana&dataInicio=2026-01-01&dataFim=2026-12-31&page=2&limit=10')
        .expect(200);

      const countSql = pool.query.mock.calls[0][0];
      expect(countSql).toMatch(/p\.nome_pes ILIKE/);
      expect(countSql).toMatch(/c\.dt_ces >=/);
      expect(countSql).toMatch(/c\.dt_ces <=/);
      const dataParams = pool.query.mock.calls[1][1];
      expect(dataParams).toEqual(['%ana%', '2026-01-01', '2026-12-31', 10, 10]);
    });

    test('CT-103: Deve clampar limit > 100 para 100', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/cestas?limit=999').expect(200);

      expect(response.body.limit).toBe(100);
    });
  });

  describe('POST /api/cestas', () => {
    const cestaValida = {
      numcadBen: 5,
      dtCes: '2026-04-26',
      obsCes: 'Entrega mensal',
      itens: [
        { itemId: 1, quantidade: 2 },
        { itemId: 2, quantidade: 1 }
      ]
    };

    test('CT-201: Deve criar cesta, decrementar estoque e gravar MOV S por item', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ numcad_pes: 5 }] }) // beneficiário
        .mockResolvedValueOnce({ rows: [{ qtd_est: 50, ativo_ite: true }] }) // estoque item 1
        .mockResolvedValueOnce({ rows: [{ qtd_est: 30, ativo_ite: true }] }) // estoque item 2
        .mockResolvedValueOnce({ rows: [{ cod_ces: 7 }] }) // INSERT CESTAS
        .mockResolvedValueOnce({}) // INSERT CESTA_ITENS 1
        .mockResolvedValueOnce({}) // UPDATE ESTOQUE 1
        .mockResolvedValueOnce({}) // INSERT MOV 1
        .mockResolvedValueOnce({}) // INSERT CESTA_ITENS 2
        .mockResolvedValueOnce({}) // UPDATE ESTOQUE 2
        .mockResolvedValueOnce({}) // INSERT MOV 2
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app).post('/api/cestas').send(cestaValida).expect(201);

      expect(response.body).toEqual({ message: 'Entrega de cesta registrada com sucesso.', id: 7 });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      const movCalls = mockClient.query.mock.calls.filter(
        ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO ESTOQUE_MOV')
      );
      expect(movCalls).toHaveLength(2);
      expect(movCalls[0][0]).toMatch(/'S'/); // tipo_mov hardcoded no SQL
      expect(movCalls[0][1]).toEqual([1, 2, 7, 'Entrega cesta #7']); // [itemId, qtd, codCes, obs]
    });

    test('CT-202: Deve rejeitar body inválido com 400', async () => {
      const response = await request(app)
        .post('/api/cestas')
        .send({ numcadBen: 5, dtCes: '2026-04-26', itens: [] })
        .expect(400);

      expect(response.body.error).toMatch(/itens/);
      expect(pool.connect).not.toHaveBeenCalled();
    });

    test('CT-203: Deve rejeitar dtCes em formato inválido com 400', async () => {
      await request(app)
        .post('/api/cestas')
        .send({ ...cestaValida, dtCes: '26/04/2026' })
        .expect(400);
    });

    test('CT-204: Deve rejeitar itens duplicados com 400', async () => {
      const response = await request(app)
        .post('/api/cestas')
        .send({ ...cestaValida, itens: [{ itemId: 1, quantidade: 1 }, { itemId: 1, quantidade: 2 }] })
        .expect(400);

      expect(response.body.error).toMatch(/uma vez por cesta/);
    });

    test('CT-205: Deve retornar 404 com ROLLBACK quando beneficiário não existe', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // beneficiário ausente
        .mockResolvedValueOnce({}); // ROLLBACK

      const response = await request(app).post('/api/cestas').send(cestaValida).expect(404);

      expect(response.body.error).toMatch(/Beneficiário/);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('CT-206: Deve retornar 409 com ROLLBACK quando estoque insuficiente', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ numcad_pes: 5 }] }) // benef ok
        .mockResolvedValueOnce({ rows: [{ qtd_est: 1, ativo_ite: true }] }) // qtd insuficiente
        .mockResolvedValueOnce({}); // ROLLBACK

      const response = await request(app).post('/api/cestas').send(cestaValida).expect(409);

      expect(response.body.error).toMatch(/insuficiente/);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('CT-207: Deve retornar 409 ao violar UNIQUE (mesmo beneficiário+data)', async () => {
      const uniqueErr = new Error('duplicate key');
      uniqueErr.code = '23505';
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ numcad_pes: 5 }] })
        .mockResolvedValueOnce({ rows: [{ qtd_est: 50, ativo_ite: true }] })
        .mockResolvedValueOnce({ rows: [{ qtd_est: 30, ativo_ite: true }] })
        .mockRejectedValueOnce(uniqueErr) // INSERT CESTAS falha
        .mockResolvedValueOnce({}); // ROLLBACK

      const response = await request(app).post('/api/cestas').send(cestaValida).expect(409);

      expect(response.body.error).toMatch(/já existe/i);
    });

    test('CT-208: Deve retornar 404 quando item está inativo', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ numcad_pes: 5 }] })
        .mockResolvedValueOnce({ rows: [{ qtd_est: 50, ativo_ite: false }] })
        .mockResolvedValueOnce({}); // ROLLBACK

      const response = await request(app)
        .post('/api/cestas')
        .send({ ...cestaValida, itens: [{ itemId: 99, quantidade: 1 }] })
        .expect(404);

      expect(response.body.error).toMatch(/inativo|não encontrado/);
    });
  });

  describe('GET /api/cestas/:id', () => {
    test('CT-301: Deve retornar cesta com itens', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 7, beneficiarioId: 5, beneficiarioNome: 'Maria',
            dtCes: '2026-04-26', obsCes: null
          }]
        })
        .mockResolvedValueOnce({
          rows: [
            { itemId: 1, descricao: 'Arroz', unidade: 'kg', quantidade: 2 },
            { itemId: 2, descricao: 'Feijão', unidade: 'kg', quantidade: 1 }
          ]
        });

      const response = await request(app).get('/api/cestas/7').expect(200);

      expect(response.body.id).toBe(7);
      expect(response.body.itens).toHaveLength(2);
      expect(response.body.itens[0]).toMatchObject({ descricao: 'Arroz', quantidade: 2 });
    });

    test('CT-302: Deve retornar 404 quando cesta não existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await request(app).get('/api/cestas/999').expect(404);
    });

    test('CT-303: Deve retornar 400 quando id é inválido', async () => {
      // /api/cestas/abc cai em :id mas parseInt → NaN, retorna 400
      await request(app).get('/api/cestas/abc').expect(400);
    });
  });

  describe('PUT /api/cestas/:id', () => {
    const cestaValida = {
      numcadBen: 5,
      dtCes: '2026-04-26',
      obsCes: 'Editado',
      itens: [{ itemId: 1, quantidade: 3 }]
    };

    test('CT-401: Deve estornar itens antigos e aplicar novos atomicamente', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ cod_ces: 7 }] }) // SELECT cesta FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ numcad_pes: 5 }] }) // benef ok
        .mockResolvedValueOnce({ rows: [{ cod_ite: 2, qtd: 1 }] }) // old itens
        .mockResolvedValueOnce({}) // UPDATE estoque (estorno)
        .mockResolvedValueOnce({}) // INSERT MOV E
        .mockResolvedValueOnce({}) // DELETE CESTA_ITENS
        .mockResolvedValueOnce({ rows: [{ qtd_est: 50, ativo_ite: true }] }) // valida estoque novo item
        .mockResolvedValueOnce({}) // UPDATE CESTAS
        .mockResolvedValueOnce({}) // INSERT CESTA_ITENS novo
        .mockResolvedValueOnce({}) // UPDATE estoque novo (decrementa)
        .mockResolvedValueOnce({}) // INSERT MOV S
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app).put('/api/cestas/7').send(cestaValida).expect(200);

      expect(response.body).toEqual({ message: 'Cesta atualizada com sucesso.', id: 7 });
      const movCalls = mockClient.query.mock.calls.filter(
        ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO ESTOQUE_MOV')
      );
      expect(movCalls).toHaveLength(2); // 1 estorno (E) + 1 nova saída (S)
    });

    test('CT-402: Deve retornar 404 quando cesta não existe', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE vazio
        .mockResolvedValueOnce({}); // ROLLBACK

      await request(app).put('/api/cestas/999').send(cestaValida).expect(404);
    });

    test('CT-403: Deve rejeitar body inválido com 400 antes de tocar no DB', async () => {
      await request(app)
        .put('/api/cestas/7')
        .send({ numcadBen: 5, dtCes: 'bad', itens: [{ itemId: 1, quantidade: 1 }] })
        .expect(400);

      expect(pool.connect).not.toHaveBeenCalled();
    });

    test('CT-404: Deve retornar 409 com ROLLBACK quando estoque novo é insuficiente após estorno', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ cod_ces: 7 }] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ numcad_pes: 5 }] }) // benef ok
        .mockResolvedValueOnce({ rows: [] }) // sem old itens
        .mockResolvedValueOnce({}) // DELETE CESTA_ITENS (vazio)
        .mockResolvedValueOnce({ rows: [{ qtd_est: 1, ativo_ite: true }] }) // qtd insuf
        .mockResolvedValueOnce({}); // ROLLBACK

      const response = await request(app).put('/api/cestas/7').send(cestaValida).expect(409);

      expect(response.body.error).toMatch(/insuficiente/);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
