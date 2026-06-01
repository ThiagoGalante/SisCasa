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

// Mock do getLookupId (não toca no banco nos testes)
jest.mock('../../../utils/getLookupId', () => {
  return jest.fn(async () => null);
});

/**
 * Testes da estória: "Atualizar o módulo de beneficiários conforme feedback do PO".
 * Cobrem os novos campos (bairro, contato/fone de emergência, médico, restrições,
 * foto) e o vínculo N:N de Projetos.
 */
describe('Beneficiários — campos do feedback do PO', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  const beneficiarioComNovosCampos = {
    nome: 'Ana Maryshka',
    data_cad: '2026-06-01',
    tipo_beneficio: 1,
    data_nasc: '2013-07-18',
    endereco: 'Rua Adolfo Lutz, 19',
    bairro: 'Cezar de Souza',
    cidade: 'São Paulo',
    cep: '01251140',
    sexo: 'Feminino',
    cpf: '12345678901',
    rg: '14483738',
    fone: '11999990000',
    contato_emg: 'Sonia Gregoria',
    fone_emg: '11988887777',
    medico: 'Dra. House',
    restr_alim: 'Sem lactose',
    restr_med: 'Alergia a dipirona',
    foto_url: 'https://exemplo.supabase.co/storage/v1/object/public/fotos-beneficiarios/ana.png',
    projetos: [1, 3]
  };

  describe('POST /api/beneficiarios', () => {
    test('CT-PO-001: persiste os novos campos escalares no INSERT de PESSOAS', async () => {
      mockClient.query
        .mockResolvedValueOnce({})                       // BEGIN
        .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX numcad_pes
        .mockResolvedValueOnce({})                       // INSERT PESSOAS
        .mockResolvedValueOnce({})                       // INSERT BENEFICIARIOS
        .mockResolvedValueOnce({})                       // INSERT BENEFICIARIO_PROJETOS (1)
        .mockResolvedValueOnce({})                       // INSERT BENEFICIARIO_PROJETOS (3)
        .mockResolvedValueOnce({});                      // COMMIT

      const response = await request(app)
        .post('/api/beneficiarios')
        .send(beneficiarioComNovosCampos)
        .expect(201);

      expect(response.body).toHaveProperty('id', 1);

      const insertPessoa = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO PESSOAS') && sql.includes('bairro_pes')
      );
      expect(insertPessoa).toBeDefined();
      // Colunas novas presentes no SQL
      expect(insertPessoa[0]).toMatch(/contato_emg_pes/);
      expect(insertPessoa[0]).toMatch(/fone_emg_pes/);
      expect(insertPessoa[0]).toMatch(/medico_pes/);
      expect(insertPessoa[0]).toMatch(/restr_alim_pes/);
      expect(insertPessoa[0]).toMatch(/restr_med_pes/);
      expect(insertPessoa[0]).toMatch(/foto_url_pes/);
      // Valores novos presentes nos parâmetros
      const params = insertPessoa[1];
      expect(params).toContain('Cezar de Souza');
      expect(params).toContain('Sonia Gregoria');
      expect(params).toContain('11988887777');
      expect(params).toContain('Dra. House');
      expect(params).toContain('Sem lactose');
      expect(params).toContain('Alergia a dipirona');
      expect(params).toContain(beneficiarioComNovosCampos.foto_url);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('CT-PO-002: cria um vínculo em BENEFICIARIO_PROJETOS por projeto', async () => {
      mockClient.query
        .mockResolvedValueOnce({})                       // BEGIN
        .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX
        .mockResolvedValueOnce({})                       // INSERT PESSOAS
        .mockResolvedValueOnce({})                       // INSERT BENEFICIARIOS
        .mockResolvedValueOnce({})                       // BP 1
        .mockResolvedValueOnce({})                       // BP 3
        .mockResolvedValueOnce({});                      // COMMIT

      await request(app).post('/api/beneficiarios').send(beneficiarioComNovosCampos).expect(201);

      const bpCalls = mockClient.query.mock.calls.filter(
        ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO BENEFICIARIO_PROJETOS')
      );
      expect(bpCalls).toHaveLength(2);
      expect(bpCalls[0][1]).toEqual([1, 1]); // [numcad_ben, cod_proj]
      expect(bpCalls[1][1]).toEqual([1, 3]);
    });

    test('CT-PO-003: sem projetos não insere em BENEFICIARIO_PROJETOS', async () => {
      mockClient.query
        .mockResolvedValueOnce({})                       // BEGIN
        .mockResolvedValueOnce({ rows: [{ max_id: 0 }] }) // MAX
        .mockResolvedValueOnce({})                       // INSERT PESSOAS
        .mockResolvedValueOnce({})                       // INSERT BENEFICIARIOS
        .mockResolvedValueOnce({});                      // COMMIT

      const { projetos, ...semProjetos } = beneficiarioComNovosCampos;
      await request(app).post('/api/beneficiarios').send(semProjetos).expect(201);

      const bpCalls = mockClient.query.mock.calls.filter(
        ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO BENEFICIARIO_PROJETOS')
      );
      expect(bpCalls).toHaveLength(0);
    });
  });

  describe('GET /api/beneficiarios', () => {
    test('CT-PO-004: a query seleciona os novos campos e agrega os projetos', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await request(app).get('/api/beneficiarios').expect(200);

      const sql = pool.query.mock.calls[0][0];
      expect(sql).toMatch(/bairro_pes/);
      expect(sql).toMatch(/contato_emg_pes/);
      expect(sql).toMatch(/medico_pes/);
      expect(sql).toMatch(/restr_alim_pes/);
      expect(sql).toMatch(/restr_med_pes/);
      expect(sql).toMatch(/foto_url_pes/);
      expect(sql).toMatch(/BENEFICIARIO_PROJETOS/);
    });
  });

  describe('GET /api/projetos', () => {
    test('CT-PO-005: retorna a lista de projetos (lookup)', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, nome: 'Hospedaria' }, { id: 2, nome: 'De Volta para Casa' }]
      });

      const response = await request(app).get('/api/projetos').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('nome', 'Hospedaria');
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toMatch(/FROM PROJETOS/);
    });
  });
});
