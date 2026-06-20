# Sprint 5 — Estórias de Usuário e Casos de Teste (TDD)

> **Metodologia (TDD):** para cada estória primeiro definimos os **critérios de aceite**
> e os **casos de teste** (fase *Red*); só então implementamos o código até os testes
> passarem (fase *Green*) e refatoramos (fase *Refactor*).
>
> Numeração das estórias continua a partir da Sprint 4 (US07–US10) → Sprint 5 = **US11–US14**.
> Convenção de testes: `CT-<área>-<nnn>` (ex.: `CT-BEN-001`), seguindo o padrão
> `CT-PO-###` / `CT-SA-###` já usado no projeto.

---

## US11 — Usabilidade do Formulário de Beneficiários

> **Como** voluntário da Casa do Aconchego,
> **eu quero** um formulário de beneficiários mais claro e ágil — com a data de cadastro
> já preenchida, projetos em menu suspenso e os campos obrigatórios sinalizados —
> **para** cadastrar com menos erros e mais rapidez.

**Critérios de Aceite**
1. O campo **Data de Cadastro** vem preenchido automaticamente com a **data de hoje**, formatada (DD/MM/AAAA), e **permanece editável**.
2. A seleção de **Projetos** é feita por **menu suspenso** (dropdown), aceitando um ou mais projetos.
3. Todos os **campos obrigatórios** exibem **asterisco (\*)** no rótulo.
4. As alterações não quebram o salvamento existente (data e projetos persistem corretamente).

**Casos de Teste (frontend RTL / backend Supertest)**
| ID | Tipo | Descrição | Esperado |
|----|------|-----------|----------|
| CT-BEN-001 | RTL | Abrir o formulário de cadastro | Campo "Data de Cadastro" pré-preenchido com a data atual |
| CT-BEN-002 | RTL | Alterar o campo de data | Valor é aceito e mantido (campo editável) |
| CT-BEN-003 | RTL | Renderizar o formulário | Rótulos de campos obrigatórios contêm "\*" |
| CT-BEN-004 | RTL | Selecionar projetos no dropdown | Permite seleção múltipla; estado reflete os cod_proj escolhidos |
| CT-BEN-005 | Supertest | POST /api/beneficiarios com `data_cad` e `projetos` | 201; persiste `datacad_pes` e vínculos em BENEFICIARIO_PROJETOS |

---

## US12 — Composição Familiar e Responsáveis

> **Como** voluntário da Casa do Aconchego,
> **eu quero** registrar e visualizar corretamente a **composição familiar** do beneficiário
> e ter uma interface organizada para **responsáveis** e **familiares**,
> **para** manter o cadastro social completo e legível.

**Critérios de Aceite**
1. É possível **adicionar, editar e remover** membros da composição familiar (nome, parentesco, endereço, fone).
2. A composição familiar é **persistida** (tabela `COMPOSICAO_FAMILIAR` + `PESSOAS` tipo `F`) e **reexibida** na edição e nos detalhes.
3. A UI de **Responsáveis** e **Composição Familiar** é reorganizada (seções distintas, linhas dinâmicas claras, ações de adicionar/remover visíveis).
4. Validação coerente com a já existente (linha preenchida exige nome e parentesco).

**Casos de Teste**
| ID | Tipo | Descrição | Esperado |
|----|------|-----------|----------|
| CT-FAM-001 | Supertest | POST /api/beneficiarios com `familia[]` | 201; insere PESSOAS (tipo 'F') e COMPOSICAO_FAMILIAR |
| CT-FAM-002 | Supertest | GET /api/beneficiarios/:id | Retorna array `familia` com nome/parentesco/endereco/fone |
| CT-FAM-003 | Supertest | PUT /api/beneficiarios/:id alterando `familia[]` | 200; substitui composição familiar (remove antigos, insere novos) |
| CT-FAM-004 | Supertest | POST com linha de família incompleta (sem parentesco) | Linha ignorada/validada; não cria vínculo inválido |
| CT-FAM-005 | RTL | Adicionar e remover linha de família no formulário | Linhas adicionadas/removidas dinamicamente |

---

## US13 — Anexos de Documentos do Beneficiário  *(BACKLOG — não nesta sprint)*

> **Decisão (reunião):** o armazenamento de arquivos — tanto **fotos** quanto
> **documentos anexados** — fica no **backlog** (coluna "A Fazer" do Kanban). Nesta
> sprint não implementamos o pipeline de upload/armazenamento. A intenção futura é
> salvar os arquivos localmente e persistir apenas o **endereço/link** para download.

*Estória mantida no backlog para uma sprint futura.*

---

## US14 — Módulo de Configurações (Tabelas de Apoio)

> **Como** administrador da Casa do Aconchego,
> **eu quero** uma tela de **Configurações** para gerenciar as tabelas de apoio
> (Hospitais, UF, Religião, Raça/Cor),
> **para** manter os dados de domínio atualizados sem depender do time de desenvolvimento.

> Referência visual: `img1.jpeg` (menu Configurações: Hospitais, UF, Religião, Raça/Cor, Usuários).
> *Usuários* já possui CRUD próprio (rotas `/api/auth/usuarios`); esta estória cobre as 4 demais.

**Critérios de Aceite**
1. Endpoints CRUD genéricos para os recursos de apoio: `hospitais`, `ufs`, `religioes`, `racas`.
2. **Listar** (autenticado) e **criar/editar/excluir** (somente **admin**).
3. **Proteção de integridade**: excluir registro em uso (referenciado por PESSOAS) retorna **409**.
4. Tela de Configurações com submenu por recurso e tabela com ações (novo/editar/excluir).
5. Acesso ao menu restrito a administradores.

**Casos de Teste**
| ID | Tipo | Descrição | Esperado |
|----|------|-----------|----------|
| CT-CFG-001 | Supertest | GET /api/config/hospitais | 200; lista de `{id, nome}` |
| CT-CFG-002 | Supertest | GET /api/config/recurso-invalido | 400 (recurso não permitido) |
| CT-CFG-003 | Supertest | POST /api/config/racas válido (admin) | 201; cria registro |
| CT-CFG-004 | Supertest | POST sem nome | 400 |
| CT-CFG-005 | Supertest | POST sem perfil admin | 403 |
| CT-CFG-006 | Supertest | PUT /api/config/religioes/:id (admin) | 200; atualiza descrição |
| CT-CFG-007 | Supertest | DELETE /api/config/hospitais/:id em uso | 409 (integridade referencial) |
| CT-CFG-008 | Supertest | DELETE /api/config/ufs/:id livre (admin) | 200; remove |
| CT-CFG-009 | RTL | Renderizar tela de Configurações | Submenus Hospitais/UF/Religião/Raça-Cor visíveis |

---

## Resumo de Cobertura

| Estória | Área | Nº de casos | Novo backend? | Novo frontend? | Migration? |
|---------|------|-------------|---------------|----------------|------------|
| US11 | Form Beneficiários (UX) | 5 | não (ajuste) | sim | não |
| US12 | Composição Familiar | 5 | ajuste | sim | não |
| US13 | Documentos | — | *backlog* | *backlog* | *backlog* |
| US14 | Configurações | 9 | **sim** (`routes/configuracoes.js`) | sim | não (usa tabelas existentes) |

**Total Sprint 5: 19 novos casos de teste** somados aos 77 da Sprint 4.
**Backlog:** US13 (Documentos) e armazenamento de Fotos.
