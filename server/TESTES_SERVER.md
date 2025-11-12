# Testes do Backend (Server) - SisCasa

Este documento descreve detalhadamente todos os testes realizados no backend (server) do sistema SisCasa.

## Frameworks e Bibliotecas Utilizadas

- **Jest**: Framework de testes para Node.js
  - Configurado para ambiente Node.js (`testEnvironment: 'node'`)
  - Suporte a cobertura de código
  - Modo watch para desenvolvimento
- **Supertest**: Biblioteca para testar APIs HTTP
  - Testa endpoints Express.js
  - Valida códigos de status HTTP
  - Valida estrutura de respostas JSON

## Estrutura de Testes

Os testes estão organizados na pasta `server/__tests__/`:

```
server/__tests__/
├── unit/
│   ├── getLookupId.test.js          # Testes unitários da função utilitária
│   └── endpoints/
│       ├── lookup.test.js            # Testes dos endpoints de lookup
│       └── beneficiarios.test.js     # Testes dos endpoints de beneficiários
└── integration/
    └── api.test.js                   # Testes de integração da API
```

## Configuração de Testes

### Jest Configuration (jest.config.js)

- **Test Environment**: Node.js
- **Coverage Directory**: `coverage/`
- **Coverage Threshold**: 70% para branches, functions, lines e statements
- **Test Match**: Arquivos `**/__tests__/**/*.test.js`
- **Exclusões de Cobertura**:
  - `node_modules/`
  - `__tests__/`
  - `jest.config.js`
  - `index.js`

### Mocks Utilizados

- **Database Pool (`db.js`)**: Mockado para simular conexões e queries ao PostgreSQL
- **getLookupId**: Mockado em alguns testes para simplificar e isolar testes
- **Transações**: Simuladas através de mocks de `client.query()` e `client.release()`

### Scripts de Teste

```bash
npm test                    # Executa todos os testes
npm run test:watch          # Executa testes em modo watch
npm run test:coverage       # Executa testes com relatório de cobertura
npm run test:unit           # Executa apenas testes de unidade
npm run test:integration    # Executa apenas testes de integração
```

---

## 1. Testes de Unidade

### 1.1. Função Utilitária: getLookupId

**Arquivo**: `server/__tests__/unit/getLookupId.test.js`

**Total de testes**: 6 testes

**Objetivo**: Testar a função utilitária que busca IDs de tabelas de lookup (referência) no banco de dados.

#### CT-CB-001: Cobertura da Função getLookupId

**Técnica**: Teste de Caixa Branca (White-box)

**Cobertura de Caminhos**:

1. **Caminho 1: Valor encontrado na tabela**
   - **Objetivo**: Verificar se a função retorna o ID correto quando o valor é encontrado
   - **Entrada**: `getLookupId(client, 'RACA', 'DESC_RAC', 'Branca')`
   - **Mock**: `client.query` retorna `{ rows: [{ cod_rac: 1 }] }`
   - **Resultado Esperado**: Retorna `1`
   - **Verificações**:
     - Verifica se `client.query` foi chamado com a query SQL correta
     - Verifica se o parâmetro `$1` contém o valor 'Branca'
     - Verifica se a query usa `ILIKE` para busca case-insensitive

2. **Caminho 2: Valor não encontrado (retorna null)**
   - **Objetivo**: Verificar se a função retorna `null` quando o valor não é encontrado
   - **Entrada**: `getLookupId(client, 'RACA', 'DESC_RAC', 'Inexistente')`
   - **Mock**: `client.query` retorna `{ rows: [] }`
   - **Resultado Esperado**: Retorna `null`
   - **Verificações**:
     - Verifica se `client.query` foi chamado
     - Verifica se o resultado é `null`

3. **Caminho 3: Valor nulo (retorna null imediatamente)**
   - **Objetivo**: Verificar se a função retorna `null` imediatamente quando o valor é `null`
   - **Entrada**: `getLookupId(client, 'RACA', 'DESC_RAC', null)`
   - **Resultado Esperado**: Retorna `null` sem executar query
   - **Verificações**:
     - Verifica se `client.query` **não** foi chamado
     - Verifica se o resultado é `null`

4. **Caminho 4: Tabela GRAU_PARENTESCO (exceção de ID column)**
   - **Objetivo**: Verificar se a função trata corretamente a exceção da tabela `GRAU_PARENTESCO`
   - **Entrada**: `getLookupId(client, 'GRAU_PARENTESCO', 'DESC_GPA', 'Pai')`
   - **Mock**: `client.query` retorna `{ rows: [{ cod_gpa: 5 }] }`
   - **Resultado Esperado**: Retorna `5`
   - **Verificações**:
     - Verifica se a query usa `cod_gpa` (não `cod_gra`)
     - Verifica se a query está correta para a tabela `GRAU_PARENTESCO`

5. **Valor vazio (string vazia) retorna null**
   - **Objetivo**: Verificar se a função trata string vazia como valor nulo
   - **Entrada**: `getLookupId(client, 'RACA', 'DESC_RAC', '')`
   - **Resultado Esperado**: Retorna `null` sem executar query
   - **Verificações**:
     - Verifica se `client.query` **não** foi chamado
     - Verifica se o resultado é `null`

6. **Case-insensitive search funciona**
   - **Objetivo**: Verificar se a busca case-insensitive funciona corretamente
   - **Entrada**: `getLookupId(client, 'RACA', 'DESC_RAC', 'BRANCA')`
   - **Mock**: `client.query` retorna `{ rows: [{ cod_rac: 2 }] }`
   - **Resultado Esperado**: Query usa `ILIKE` (case-insensitive)
   - **Verificações**:
     - Verifica se a query contém `ILIKE`
     - Verifica se o parâmetro contém o valor em maiúsculas

---

### 1.2. Endpoints de Lookup

**Arquivo**: `server/__tests__/unit/endpoints/lookup.test.js`

**Total de testes**: 7 testes (6 endpoints + 1 teste de erro)

**Objetivo**: Testar os endpoints GET que retornam listas de dados de lookup (tipos de benefício, cidades, raças, religiões, hospitais, graus de parentesco).

#### Endpoints Testados

1. **GET /api/tipos-beneficio**
   - **Teste 1**: Deve retornar lista de tipos de benefício
     - **Mock**: `pool.query` retorna `[{ id: 1, nome: 'Auxílio Alimentação' }, { id: 2, nome: 'Auxílio Moradia' }]`
     - **Verificações**:
       - Status HTTP 200
       - Resposta é um array com 2 elementos
       - Cada elemento tem propriedades `id` e `nome`
       - Primeiro elemento tem `nome: 'Auxílio Alimentação'`
   - **Teste 2**: Deve retornar erro 500 em caso de falha no banco
     - **Mock**: `pool.query` rejeita com erro
     - **Verificações**:
       - Status HTTP 500
       - Resposta tem propriedade `error`

2. **GET /api/cidades**
   - **Teste**: Deve retornar lista de cidades
     - **Mock**: `pool.query` retorna `[{ id: 'São Paulo', nome: 'São Paulo' }, { id: 'Rio de Janeiro', nome: 'Rio de Janeiro' }]`
     - **Verificações**:
       - Status HTTP 200
       - Resposta é um array com 2 elementos
       - Primeiro elemento tem `nome: 'São Paulo'` e `id: 'São Paulo'`

3. **GET /api/racas**
   - **Teste**: Deve retornar lista de raças
     - **Mock**: `pool.query` retorna `[{ DESC_RAC: 'Branca' }, { DESC_RAC: 'Parda' }]`
     - **Verificações**:
       - Status HTTP 200
       - Resposta é um array com 2 elementos

4. **GET /api/religioes**
   - **Teste**: Deve retornar lista de religiões
     - **Mock**: `pool.query` retorna `[{ DESC_REL: 'Católica' }, { DESC_REL: 'Evangélica' }]`
     - **Verificações**:
       - Status HTTP 200
       - Resposta é um array com 2 elementos

5. **GET /api/hospitais**
   - **Teste**: Deve retornar lista de hospitais
     - **Mock**: `pool.query` retorna `[{ NOME_HOS: 'Hospital São Paulo' }, { NOME_HOS: 'Hospital Rio' }]`
     - **Verificações**:
       - Status HTTP 200
       - Resposta é um array com 2 elementos

6. **GET /api/graus-parentesco**
   - **Teste**: Deve retornar lista de graus de parentesco
     - **Mock**: `pool.query` retorna `[{ DESC_GPA: 'Pai' }, { DESC_GPA: 'Mãe' }]`
     - **Verificações**:
       - Status HTTP 200
       - Resposta é um array com 2 elementos

---

### 1.3. Endpoints de Beneficiários

**Arquivo**: `server/__tests__/unit/endpoints/beneficiarios.test.js`

**Total de testes**: 11 testes

**Objetivo**: Testar os endpoints POST e GET de beneficiários, incluindo validações, transações e tratamento de erros.

#### POST /api/beneficiarios

##### CT-001: Cadastro Completo com Sucesso

**Técnica**: Teste de Caixa Preta (Black-box)

1. **Deve cadastrar beneficiário com todos os dados válidos**
   - **Objetivo**: Verificar se o cadastro completo funciona corretamente
   - **Dados de Entrada**:
     ```json
     {
       "nome": "João da Silva",
       "data_cad": "2024-01-01",
       "tipo_beneficio": 1,
       "data_nasc": "1990-01-15",
       "email": "joao@email.com",
       "endereco": "Rua Teste, 123",
       "cidade": "São Paulo",
       "cep": "12345678",
       "sexo": "Masculino",
       "raca": "Branca",
       "religiao": "Católica",
       "fumante": "não",
       "cpf": "12345678901",
       "rg": "123456789",
       "fone": "11987654321",
       "profissao": "Engenheiro"
     }
     ```
   - **Mocks**:
     - `getLookupId` mockado para retornar IDs corretos
     - `mockClient.query` mockado na ordem:
       1. `BEGIN` (inicia transação)
       2. `MAX(numcad_pes)` (retorna `{ max_id: 0 }`)
       3. `INSERT PESSOAS` (insere beneficiário)
       4. `INSERT BENEFICIARIOS` (vincula tipo de benefício)
       5. `COMMIT` (confirma transação)
   - **Verificações**:
     - Status HTTP 201
     - Resposta tem `message: 'Beneficiário cadastrado com sucesso!'`
     - Resposta tem `id: 1`
     - `BEGIN` foi chamado
     - `COMMIT` foi chamado
     - `client.release()` foi chamado

2. **Deve cadastrar beneficiário com responsáveis e família**
   - **Objetivo**: Verificar se o cadastro com relacionados funciona corretamente
   - **Dados de Entrada**: Beneficiário + `responsaveis` e `familia`
   - **Mocks**: `mockClient.query` mockado para incluir:
     - Inserção de pessoas relacionadas (responsáveis e familiares)
     - Inserção em `RESPONSAVEIS` e `COMPOSICAO_FAMILIAR`
   - **Verificações**:
     - Status HTTP 201
     - Resposta tem `id`
     - Transação completa com sucesso

##### CT-002: Cadastro sem Campos Obrigatórios

**Técnica**: Teste de Caixa Preta (Black-box)

**Método**: Classes de Equivalência

1. **Deve retornar erro quando nome estiver vazio**
   - **Objetivo**: Verificar se o sistema valida campos obrigatórios
   - **Dados de Entrada**: Beneficiário com `nome: ''`
   - **Mock**: `mockClient.query` retorna erro no `INSERT PESSOAS` (violação de constraint NOT NULL)
   - **Verificações**:
     - Status HTTP 500
     - Resposta tem propriedade `error`
     - Mensagem de erro contém "Erro interno do servidor"
     - `ROLLBACK` foi chamado
     - `client.release()` foi chamado

##### CT-003: Cadastro com CPF Inválido

**Técnica**: Teste de Caixa Preta (Black-box)

**Método**: Classes de Equivalência

1. **Deve aceitar CPF mesmo com formato inválido (validação não implementada)**
   - **Objetivo**: Verificar o comportamento com CPF inválido
   - **Dados de Entrada**: Beneficiário com `cpf: '123'` (inválido)
   - **Resultado Esperado**: Sistema aceita CPF inválido (validação não implementada)
   - **Verificações**:
     - Status HTTP 201
     - Resposta tem `id`

##### Testes de Classes de Equivalência - CPF

**Método**: Classes de Equivalência

1. **CPF válido com 11 dígitos**
   - **Objetivo**: Verificar se CPF válido é aceito
   - **Dados de Entrada**: `cpf: '12345678901'`
   - **Resultado Esperado**: Status HTTP 201

2. **CPF vazio (opcional)**
   - **Objetivo**: Verificar se CPF vazio é aceito (campo opcional)
   - **Dados de Entrada**: `cpf: ''`
   - **Resultado Esperado**: Status HTTP 201

##### Testes de Valores de Fronteira - Nome

**Método**: Valores de Fronteira

1. **Nome com 1 caractere (mínimo)**
   - **Objetivo**: Verificar comportamento com nome mínimo
   - **Dados de Entrada**: `nome: 'A'`
   - **Resultado Esperado**: Status HTTP 201

2. **Nome com 100 caracteres (limite)**
   - **Objetivo**: Verificar comportamento com nome no limite
   - **Dados de Entrada**: `nome: 'A'.repeat(100)`
   - **Resultado Esperado**: Status HTTP 201

##### CT-008: Transação com Rollback

**Técnica**: Teste de Caixa Branca (White-box)

1. **Deve fazer rollback em caso de erro**
   - **Objetivo**: Verificar se a transação faz rollback em caso de erro
   - **Mock**: `mockClient.query` retorna erro no `INSERT PESSOAS`
   - **Verificações**:
     - Status HTTP 500
     - Resposta tem propriedade `error`
     - Mensagem de erro contém "Erro interno do servidor"
     - `ROLLBACK` foi chamado
     - `client.release()` foi chamado

#### GET /api/beneficiarios

##### CT-004: Listagem de Beneficiários

**Técnica**: Teste de Caixa Preta (Black-box)

1. **Deve retornar lista de beneficiários ordenada por nome**
   - **Objetivo**: Verificar se a listagem funciona corretamente
   - **Mock**: `pool.query` retorna array com 2 beneficiários
   - **Verificações**:
     - Status HTTP 200
     - Resposta é um array com 2 elementos
     - Primeiro beneficiário tem `nome: 'João da Silva'`
     - Segundo beneficiário tem `nome: 'Maria Oliveira'`
     - Cada beneficiário tem propriedades `responsaveis` e `familia`

2. **Deve retornar array vazio quando não houver beneficiários**
   - **Objetivo**: Verificar comportamento com lista vazia
   - **Mock**: `pool.query` retorna `{ rows: [] }`
   - **Verificações**:
     - Status HTTP 200
     - Resposta é um array vazio

3. **Deve retornar erro 500 em caso de falha no banco**
   - **Objetivo**: Verificar tratamento de erro
   - **Mock**: `pool.query` rejeita com erro
   - **Verificações**:
     - Status HTTP 500
     - Resposta tem propriedade `error`

---

## 2. Testes de Integração

### 2.1. API - Integração Frontend-Backend

**Arquivo**: `server/__tests__/integration/api.test.js`

**Total de testes**: 5 testes

**Objetivo**: Testar a integração entre frontend e backend, incluindo fluxos completos e integridade referencial.

#### Integração Frontend-Backend

1. **Deve processar requisição GET /api/beneficiarios corretamente**
   - **Objetivo**: Verificar se a API processa requisições GET corretamente
   - **Mock**: `pool.query` retorna array com 1 beneficiário
   - **Verificações**:
     - Status HTTP 200
     - Content-Type é `application/json`
     - Resposta é um array
     - Primeiro elemento tem propriedades `nome` e `cpf`

2. **Deve processar requisição POST /api/beneficiarios com JSON válido**
   - **Objetivo**: Verificar se a API processa requisições POST corretamente
   - **Dados de Entrada**: JSON com dados completos do beneficiário
   - **Mocks**: `mockClient.query` mockado na ordem correta para transação
   - **Verificações**:
     - Status HTTP 201
     - Content-Type é `application/json`
     - Resposta tem `message` e `id`
     - `id` é `1`

3. **Deve retornar erro 500 quando o banco de dados falhar**
   - **Objetivo**: Verificar tratamento de erro na integração
   - **Mock**: `pool.query` rejeita com erro
   - **Verificações**:
     - Status HTTP 500
     - Resposta tem propriedade `error`

4. **Deve retornar erro 500 quando POST falhar**
   - **Objetivo**: Verificar tratamento de erro no POST
   - **Mock**: `mockClient.query` retorna erro durante transação
   - **Verificações**:
     - Status HTTP 500
     - Resposta tem propriedade `error`
     - `ROLLBACK` foi chamado
     - `client.release()` foi chamado

#### Integridade Referencial - CT-007

**Técnica**: Teste de Caixa Preta (Black-box)

1. **Deve manter integridade referencial ao cadastrar beneficiário**
   - **Objetivo**: Verificar se as chaves estrangeiras são resolvidas corretamente
   - **Dados de Entrada**: Beneficiário com cidade, raça, religião e hospital
   - **Mocks**: `getLookupId` mockado para retornar IDs corretos
   - **Verificações**:
     - Status HTTP 201
     - Resposta tem `id`
     - `COMMIT` foi chamado (transação completa)
     - `client.release()` foi chamado

#### Transação com Rollback - CT-008

**Técnica**: Teste de Caixa Branca (White-box)

1. **Deve fazer rollback completo em caso de erro**
   - **Objetivo**: Verificar se a transação faz rollback completo em caso de erro
   - **Mock**: `mockClient.query` retorna erro (violação de constraint)
   - **Verificações**:
     - Status HTTP 500
     - Resposta tem propriedade `error`
     - Mensagem de erro contém "Erro interno do servidor"
     - `ROLLBACK` foi chamado
     - `client.release()` foi chamado

---

## Resumo Estatístico

### Total de Testes

- **Testes de Unidade**: 24 testes
  - `getLookupId.test.js`: 6 testes
  - `lookup.test.js`: 7 testes
  - `beneficiarios.test.js`: 11 testes
- **Testes de Integração**: 5 testes
  - `api.test.js`: 5 testes
- **Total Geral**: **29 testes**

### Casos de Teste (CT) Cobertos

- **CT-001**: Cadastro Completo com Sucesso
- **CT-002**: Cadastro sem Campos Obrigatórios
- **CT-003**: Cadastro com CPF Inválido
- **CT-004**: Listagem de Beneficiários
- **CT-007**: Integridade Referencial
- **CT-008**: Transação com Rollback
- **CT-CB-001**: Cobertura da Função getLookupId (Caixa Branca)

### Técnicas de Teste Utilizadas

1. **Testes de Caixa Preta (Black-box)**
   - Testes funcionais dos endpoints
   - Validação de entradas e saídas
   - Testes de integração

2. **Testes de Caixa Branca (White-box)**
   - Cobertura de caminhos da função `getLookupId`
   - Testes de transações (BEGIN, COMMIT, ROLLBACK)
   - Testes de tratamento de erros

3. **Métodos de Teste**
   - **Classes de Equivalência**: CPF (válido, inválido, vazio)
   - **Valores de Fronteira**: Nome (1 caractere, 100 caracteres)
   - **Tabelas de Decisão**: Implícitas nos testes de transação (sucesso vs. erro)

### Endpoints Testados

- **GET /api/tipos-beneficio**
- **GET /api/cidades**
- **GET /api/racas**
- **GET /api/religioes**
- **GET /api/hospitais**
- **GET /api/graus-parentesco**
- **POST /api/beneficiarios**
- **GET /api/beneficiarios**

---

## Executando os Testes

### Pré-requisitos

1. Instale as dependências:
   ```bash
   cd server
   npm install
   ```

2. Certifique-se de que o Jest e o Supertest estão instalados:
   ```bash
   npm list jest supertest
   ```

### Comandos de Teste

1. **Executar todos os testes**:
   ```bash
   npm test
   ```

2. **Executar testes em modo watch**:
   ```bash
   npm run test:watch
   ```

3. **Executar testes com cobertura de código**:
   ```bash
   npm run test:coverage
   ```

4. **Executar apenas testes de unidade**:
   ```bash
   npm run test:unit
   ```

5. **Executar apenas testes de integração**:
   ```bash
   npm run test:integration
   ```

### Observações Importantes

1. **Banco de Dados**: Os testes **não** utilizam um banco de dados real. Todos os testes usam mocks do `pool.query()` e `pool.connect()` para simular interações com o banco de dados.

2. **Isolamento**: Cada teste é isolado e independente. Os mocks são resetados antes de cada teste usando `jest.clearAllMocks()`.

3. **Transações**: As transações são simuladas através de mocks de `client.query()` que retornam resultados na ordem esperada (BEGIN, queries, COMMIT/ROLLBACK).

4. **Cobertura de Código**: A configuração do Jest exige 70% de cobertura para branches, functions, lines e statements. Use `npm run test:coverage` para verificar a cobertura.

5. **Console Warnings**: Os testes podem exibir `console.warn` e `console.error` do código da aplicação. Isso não indica falha dos testes, apenas logs da aplicação.

---

## Estrutura dos Mocks

### Mock do Database Pool

```javascript
jest.mock('../../../db', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn()
  };
  
  mockPool.connect.mockResolvedValue(mockPool);
  
  return mockPool;
});
```

### Mock do getLookupId

```javascript
jest.mock('../../../utils/getLookupId', () => {
  return jest.fn(async (client, tableName, columnName, value) => {
    if (!value) return null;
    
    const lookupMap = {
      'Católica': { table: 'RELIGIAO', id: 1 },
      'Branca': { table: 'RACA', id: 1 },
      // ... outros mapeamentos
    };
    
    const lookup = lookupMap[value];
    if (lookup) {
      return lookup.id;
    }
    return null;
  });
});
```

### Mock do Client de Transação

```javascript
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

pool.connect.mockResolvedValue(mockClient);
```

---

## Conclusão

Os testes do backend cobrem:

- ✅ Funções utilitárias (getLookupId)
- ✅ Endpoints de lookup (6 endpoints)
- ✅ Endpoints de beneficiários (POST e GET)
- ✅ Transações de banco de dados (BEGIN, COMMIT, ROLLBACK)
- ✅ Tratamento de erros
- ✅ Integridade referencial
- ✅ Integração frontend-backend
- ✅ Classes de equivalência (CPF)
- ✅ Valores de fronteira (Nome)
- ✅ Cobertura de caminhos (getLookupId)

Todos os testes utilizam mocks para isolar o código testado e garantir que os testes sejam rápidos, determinísticos e não dependam de um banco de dados real.

