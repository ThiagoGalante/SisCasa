const express = require('express');
const request = require('supertest');
const app = require('../../../app');
const pool = require('../../../db');
const configuracoesRoutes = require('../../../routes/configuracoes');

jest.mock('../../../db', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

/**
 * US14 — Módulo de Configurações (CRUD das tabelas de apoio).
 * O harness app.js injeta um usuário admin, então as rotas protegidas por
 * requireAdmin (POST/PUT/DELETE) são exercitáveis. O caso de RBAC (403) é
 * testado à parte montando o router com um usuário não-admin.
 */
describe('Configurações — CRUD de tabelas de apoio (US14)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/config/:recurso', () => {
    test('CT-CFG-001: lista um recurso válido como {id, nome}', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Hospital A' }, { id: 2, nome: 'Hospital B' }] });
      const res = await request(app).get('/api/config/hospitais').expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('nome');
      expect(pool.query.mock.calls[0][0]).toMatch(/FROM HOSPITAL/);
    });

    test('CT-CFG-002: recurso não permitido retorna 400 sem tocar no banco', async () => {
      const res = await request(app).get('/api/config/tabela-secreta').expect(400);
      expect(res.body.error).toMatch(/recurso/i);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/config/:recurso', () => {
    test('CT-CFG-003: cria um registro válido (201)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ next: 7 }] }) // SELECT MAX+1
        .mockResolvedValueOnce({ rows: [{ id: 7 }] });  // INSERT
      const res = await request(app).post('/api/config/racas').send({ nome: 'Indígena' }).expect(201);
      expect(res.body).toHaveProperty('id', 7);
      const insert = pool.query.mock.calls.find(([sql]) => /INSERT INTO RACA/.test(sql));
      expect(insert).toBeDefined();
      expect(insert[1]).toContain('Indígena');
    });

    test('CT-CFG-004: rejeita criação sem nome (400) sem tocar no banco', async () => {
      const res = await request(app).post('/api/config/racas').send({ nome: '   ' }).expect(400);
      expect(res.body.error).toMatch(/nome/i);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/config/:recurso/:id', () => {
    test('CT-CFG-006: atualiza a descrição de um registro (200)', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      const res = await request(app).put('/api/config/religioes/3').send({ nome: 'Espírita' }).expect(200);
      expect(res.body).toHaveProperty('id', 3);
      expect(pool.query.mock.calls[0][0]).toMatch(/UPDATE RELIGIAO/);
    });

    test('CT-CFG-006b: 404 ao atualizar registro inexistente', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 });
      await request(app).put('/api/config/religioes/9999').send({ nome: 'Espírita' }).expect(404);
    });
  });

  describe('DELETE /api/config/:recurso/:id', () => {
    test('CT-CFG-007: 409 ao excluir registro em uso (integridade referencial)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ existe: 1 }] }); // referência encontrada
      const res = await request(app).delete('/api/config/hospitais/1').expect(409);
      expect(res.body.error).toMatch(/uso|referenc/i);
    });

    test('CT-CFG-008: exclui registro livre (200)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })   // sem referências
        .mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      const res = await request(app).delete('/api/config/ufs/5').expect(200);
      expect(res.body).toHaveProperty('id', 5);
    });

    test('CT-CFG-008b: 404 ao excluir inexistente livre', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })   // sem referências
        .mockResolvedValueOnce({ rowCount: 0 }); // DELETE não afetou linhas
      await request(app).delete('/api/config/ufs/9999').expect(404);
    });
  });

  describe('RBAC', () => {
    test('CT-CFG-005: usuário não-admin recebe 403 ao criar', async () => {
      const naoAdminApp = express();
      naoAdminApp.use(express.json());
      naoAdminApp.use('/api/config', (req, _res, next) => {
        req.user = { id: 'voluntario', cargo: 'voluntario' };
        next();
      }, configuracoesRoutes);

      const res = await request(naoAdminApp).post('/api/config/racas').send({ nome: 'X' }).expect(403);
      expect(res.body.error).toMatch(/admin/i);
    });
  });
});
