const request = require('supertest');
const app = require('../../../app');
const pool = require('../../../db');

jest.mock('../../../db', () => {
  const mockPool = { query: jest.fn(), connect: jest.fn() };
  mockPool.connect.mockResolvedValue(mockPool);
  return mockPool;
});

// getLookupId espelha o comportamento real: retorna null quando o valor é vazio,
// e um cod fictício (5) quando há valor. Assim conseguimos exercitar a porta lógica
// que só grava COMPOSICAO_FAMILIAR quando há grau de parentesco.
jest.mock('../../../utils/getLookupId', () =>
  jest.fn(async (_client, _table, _col, value) => (value ? 5 : null))
);

/**
 * US12 — Composição Familiar do Beneficiário.
 * Garante que a composição familiar é persistida (PESSOAS tipo 'F' + COMPOSICAO_FAMILIAR)
 * e exposta na listagem.
 */
describe('Beneficiários — Composição Familiar (US12)', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = { query: jest.fn(), release: jest.fn() };
    pool.connect.mockResolvedValue(mockClient);
  });

  const base = {
    nome: 'Ana Beatriz', data_cad: '2026-06-08', tipo_beneficio: 1,
    data_nasc: '1990-01-01', cidade: 'São Paulo', sexo: 'Feminino',
    religiao: 'Católica', raca: 'Parda', hospital: 'Hospital A'
  };

  test('CT-FAM-001: persiste membro da família em PESSOAS (F) e COMPOSICAO_FAMILIAR', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                        // BEGIN
      .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX (beneficiário)
      .mockResolvedValueOnce({})                        // INSERT PESSOAS (B)
      .mockResolvedValueOnce({})                        // INSERT BENEFICIARIOS
      .mockResolvedValueOnce({ rows: [{ max_id: 1 }] }) // MAX (familiar)
      .mockResolvedValueOnce({})                        // INSERT PESSOAS (F)
      .mockResolvedValueOnce({})                        // INSERT COMPOSICAO_FAMILIAR
      .mockResolvedValueOnce({});                       // COMMIT

    const payload = {
      ...base,
      familia: [{ nome: 'Carlos', parentesco: 'Pai', endereco: 'Rua X', fone: '1190000' }]
    };

    await request(app).post('/api/beneficiarios').send(payload).expect(201);

    const pessoaFamiliar = mockClient.query.mock.calls.find(
      ([sql, params]) => typeof sql === 'string'
        && sql.includes('INSERT INTO PESSOAS') && Array.isArray(params) && params.includes('F')
    );
    expect(pessoaFamiliar).toBeDefined();

    const compFamiliar = mockClient.query.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO COMPOSICAO_FAMILIAR')
    );
    expect(compFamiliar).toBeDefined();
    expect(compFamiliar[1]).toEqual([1, 2, 5]); // [numcad_ben, numcad_fam, cod_gpa]
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  test('CT-FAM-003: linha de família sem grau de parentesco não cria vínculo em COMPOSICAO_FAMILIAR', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                        // BEGIN
      .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX (beneficiário)
      .mockResolvedValueOnce({})                        // INSERT PESSOAS (B)
      .mockResolvedValueOnce({})                        // INSERT BENEFICIARIOS
      .mockResolvedValueOnce({ rows: [{ max_id: 1 }] }) // MAX (familiar)
      .mockResolvedValueOnce({})                        // INSERT PESSOAS (F)
      .mockResolvedValueOnce({});                       // COMMIT

    const payload = {
      ...base,
      familia: [{ nome: '', parentesco: '', endereco: 'Rua Sem Nome', fone: '' }]
    };

    await request(app).post('/api/beneficiarios').send(payload).expect(201);

    const compFamiliar = mockClient.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO COMPOSICAO_FAMILIAR')
    );
    expect(compFamiliar).toHaveLength(0);
  });

  test('CT-FAM-002: a listagem agrega a composição familiar', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/beneficiarios').expect(200);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/COMPOSICAO_FAMILIAR/);
    expect(sql).toMatch(/"familia"/);
  });
});
