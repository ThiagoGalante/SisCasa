# Estória: v0 do módulo de Serviços de Apoio

**Sprint:** 4
**Status:** v0 entregue

## Contexto
"Serviços de Apoio" existia apenas como item de menu (placeholder). Esta v0 implementa
o **registro de atendimentos** — serviços prestados a beneficiários (refeição, lavanderia,
banho, transporte, descanso, acolhimento) — alinhado ao programa "Tempo de Aconchego".

## Decisões de produto
- **Domínio:** atendimentos a beneficiários (cada registro = beneficiário + tipo de serviço + data).
- **Escopo v0:** CRUD completo (listar, cadastrar, editar, excluir) com backend Postgres real.
- **RBAC:** listar/cadastrar para usuários autenticados; **editar/excluir apenas admin**
  (mesmo padrão do módulo de Doações).

## Modelo de dados (migration `20260601000002_servicos_apoio.sql`)
- `TIPO_SERVICO` (cod_tser, nome_tser, ativo_tser) — catálogo, com seed de 6 tipos.
- `SERVICO_APOIO` (cod_sap, numcad_ben → PESSOAS, cod_tser → TIPO_SERVICO, dt_sap, obs_sap, timestamps).

## API (`server/routes/servicos.js`, montado em `/api/servicos-apoio`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/tipos` | autenticado | catálogo de tipos ativos |
| GET | `/` | autenticado | lista paginada + filtros (beneficiário, tipo, período) |
| GET | `/:id` | autenticado | detalha um atendimento |
| POST | `/` | autenticado | registra atendimento (valida beneficiário e tipo) |
| PUT | `/:id` | **admin** | edita atendimento |
| DELETE | `/:id` | **admin** | exclui atendimento |

Montado em `index.js` (servidor real, com `authenticateToken`) e em `app.js`
(harness de teste, injeta usuário admin para exercitar as rotas protegidas).

## Frontend
- `ServicosApoio.js` — lista com filtros (beneficiário com debounce, tipo, período),
  paginação e ações por papel (editar/excluir só admin).
- `FormularioServicoApoio.js` — cadastro/edição (beneficiário, tipo, data, observação).
- Rotas em `App.js`: `/servicos-de-apoio`, `/servicos-de-apoio/cadastro`, `/servicos-de-apoio/editar/:id`
  (o item de menu em `Modulo.js` já apontava para `/servicos-de-apoio`).

## Testes
`server/__tests__/unit/endpoints/servicos-apoio.test.js` — 11 testes (CT-SA-001..011)
cobrindo lookup, listagem/filtros, criação com validações, 404s, edição e exclusão.

## Como testar manualmente
1. `supabase db reset` (aplica a migration e o seed de tipos).
2. `cd server && npm run dev` + `cd client && npm start`.
3. Menu → Serviços de Apoio → + Novo Atendimento.

## Fora do escopo desta v0 (próximos passos)
- Gestão do catálogo de tipos pela UI (hoje só via seed/SQL).
- Relatórios de atendimentos por período/tipo (encaixa no módulo Relatórios).
- Testes de frontend (RTL) para os novos componentes.
