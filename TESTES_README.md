# Guia de Testes - SisCasa

Este documento descreve como executar os testes do sistema SisCasa.

## Estrutura de Testes

### Backend
- **Testes de Unidade**: `server/__tests__/unit/`
  - `getLookupId.test.js` - Testes da função getLookupId
  - `endpoints/lookup.test.js` - Testes dos endpoints de lookup
  - `endpoints/beneficiarios.test.js` - Testes dos endpoints de beneficiários

- **Testes de Integração**: `server/__tests__/integration/`
  - `api.test.js` - Testes de integração da API

### Frontend
- **Testes de Componentes**: `client/src/__tests__/components/`
  - `FormularioBeneficiarios.test.js` - Testes do formulário de cadastro
  - `ListaBeneficiarios.test.js` - Testes da lista de beneficiários
  - `CestasBasicas.test.js` - Testes do módulo de cestas básicas

## Instalação de Dependências

### Backend
```bash
cd server
npm install
```

Isso instalará:
- Jest - Framework de testes
- Supertest - Testes de API HTTP

### Frontend
```bash
cd client
npm install
```

O React Testing Library já está incluído no `react-scripts`.

## Executando os Testes

### Backend

#### Executar todos os testes
```bash
cd server
npm test
```

#### Executar testes em modo watch
```bash
npm run test:watch
```

#### Executar testes de unidade apenas
```bash
npm run test:unit
```

#### Executar testes de integração apenas
```bash
npm run test:integration
```

#### Executar testes com cobertura
```bash
npm run test:coverage
```

A cobertura será gerada na pasta `server/coverage/`.

### Frontend

#### Executar todos os testes
```bash
cd client
npm test
```

#### Executar testes com cobertura
```bash
npm run test:coverage
```

A cobertura será gerada na pasta `client/coverage/`.

## Casos de Teste Implementados

### CT-001: Cadastro Completo com Sucesso
- **Arquivo**: `server/__tests__/unit/endpoints/beneficiarios.test.js`
- **Descrição**: Valida o cadastro completo de um beneficiário com todos os dados

### CT-002: Cadastro sem Campos Obrigatórios
- **Arquivo**: `server/__tests__/unit/endpoints/beneficiarios.test.js`
- **Descrição**: Valida que o sistema impede cadastro sem campos obrigatórios

### CT-003: Cadastro com CPF Inválido
- **Arquivo**: `server/__tests__/unit/endpoints/beneficiarios.test.js`
- **Descrição**: Valida o tratamento de CPF inválido

### CT-004: Listagem de Beneficiários
- **Arquivo**: 
  - Backend: `server/__tests__/unit/endpoints/beneficiarios.test.js`
  - Frontend: `client/src/__tests__/components/ListaBeneficiarios.test.js`
- **Descrição**: Valida a exibição da lista completa de beneficiários

### CT-005: Busca por Nome
- **Arquivo**: `client/src/__tests__/components/ListaBeneficiarios.test.js`
- **Descrição**: Valida a busca de beneficiários por nome

### CT-006: Expansão de Detalhes
- **Arquivo**: `client/src/__tests__/components/ListaBeneficiarios.test.js`
- **Descrição**: Valida a exibição de detalhes completos do beneficiário

### CT-007: Integridade Referencial
- **Arquivo**: `server/__tests__/integration/api.test.js`
- **Descrição**: Valida que as chaves estrangeiras são mantidas corretamente

### CT-008: Transação com Rollback
- **Arquivo**: 
  - `server/__tests__/unit/endpoints/beneficiarios.test.js`
  - `server/__tests__/integration/api.test.js`
- **Descrição**: Valida que erros em transações fazem rollback completo

## Técnicas de Teste Aplicadas

### Testes de Caixa Preta
- Validação de formulários
- Endpoints da API
- Fluxos de negócio
- Regras de negócio

### Testes de Caixa Branca
- Cobertura de código
- Caminhos de execução
- Componentes React

### Métodos de Teste

#### Classes de Equivalência
- CPF: válido, inválido (curto, longo, caracteres, vazio)
- Email: válido, inválido
- Data: válida, inválida
- CEP: válido, inválido

#### Valores de Fronteira
- Nome: vazio, 1 caractere, 100 caracteres, 101 caracteres
- Número de cadastro: 1, 0, MAX_INT
- Lista de responsáveis: 0, 1, múltiplos
- Telefone: vazio, 10 dígitos, 11 dígitos

#### Tabelas de Decisão
- Validação de cadastro
- Inserção de responsável
- Busca de beneficiários

## Cobertura de Código

### Meta de Cobertura
- **Backend**: 70% (branches, functions, lines, statements)
- **Frontend**: Configurado pelo react-scripts

### Verificar Cobertura

#### Backend
```bash
cd server
npm run test:coverage
```

#### Frontend
```bash
cd client
npm run test:coverage
```

## Notas Importantes

1. **Banco de Dados**: Os testes do backend usam mocks do PostgreSQL. Não é necessário ter o banco de dados em execução para rodar os testes.

2. **API Mocking**: Os testes do frontend usam mocks do `fetch` para simular chamadas à API.

3. **React Router**: Os testes do frontend mockam o `react-router-dom` para evitar problemas de navegação.

4. **Alertas**: Os testes mockam `window.alert` para evitar pop-ups durante a execução.

## Troubleshooting

### Erro: "Cannot find module"
- Certifique-se de que todas as dependências foram instaladas com `npm install`

### Erro: "Test suite failed to run"
- Verifique se o Node.js está na versão correta (recomendado: v16 ou superior)
- Limpe o cache do Jest: `npm test -- --clearCache`

### Testes do frontend não executam
- Certifique-se de estar na pasta `client`
- Verifique se o `react-scripts` está instalado corretamente

## Próximos Passos

- [ ] Adicionar testes E2E com Cypress
- [ ] Adicionar testes de performance
- [ ] Adicionar testes de acessibilidade
- [ ] Integrar testes no CI/CD

