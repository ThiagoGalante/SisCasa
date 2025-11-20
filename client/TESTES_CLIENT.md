# Testes do Frontend - SisCasa

Este documento descreve detalhadamente todos os testes realizados no frontend (client) do sistema SisCasa.

## Frameworks e Bibliotecas Utilizadas

- **Jest**: Framework de testes (incluído no `react-scripts`)
- **React Testing Library**: Biblioteca para testar componentes React
  - `@testing-library/react`: Renderização e consultas ao DOM
  - `@testing-library/jest-dom`: Matchers adicionais para DOM
  - `@testing-library/user-event`: Simulação de interações do usuário (instalada, mas não utilizada)

## Estrutura de Testes

Os testes estão organizados na pasta `client/src/__tests__/components/`:

- `FormularioBeneficiarios.test.js` - Testes do formulário de cadastro
- `ListaBeneficiarios.test.js` - Testes da lista de beneficiários
- `CestasBasicas.test.js` - Testes do módulo de cestas básicas

## Configuração de Testes

### Setup (setupTests.js)

O arquivo `setupTests.js` configura:
- **jest-dom**: Matchers adicionais como `toBeInTheDocument()`
- **Mock do fetch global**: Simula chamadas à API
- **Mock do window.alert**: Evita pop-ups durante os testes

### Mocks Utilizados

- **react-router-dom**: Mockado para evitar problemas de navegação
- **fetch API**: Mockado para simular respostas da API backend
- **window.alert**: Mockado para evitar pop-ups

---

## 1. Componente: FormularioBeneficiarios

**Arquivo**: `client/src/__tests__/components/FormularioBeneficiarios.test.js`

**Total de testes**: 9 testes

### 1.1. Renderização do Formulário

**Teste**: `Deve renderizar o formulário corretamente`

- **Objetivo**: Verificar se o formulário é renderizado corretamente com todos os campos principais
- **Verificações**:
  - Título "Cadastrar Beneficiário" é exibido
  - Campos principais existem no DOM (nome, CPF, email)
  - Opções de lookup são carregadas

### 1.2. Carregamento de Opções de Lookup

**Teste**: `Deve carregar opções de lookup ao montar o componente`

- **Objetivo**: Verificar se as APIs de lookup são chamadas ao montar o componente
- **APIs verificadas**:
  - `/api/tipos-beneficio`
  - `/api/cidades`
  - `/api/racas`
  - `/api/religioes`
  - `/api/hospitais`
  - `/api/graus-parentesco`

### 1.3. Adicionar Responsável

**Teste**: `Deve permitir adicionar responsável`

- **Objetivo**: Verificar se é possível adicionar um novo responsável ao formulário
- **Ações**:
  - Clica no botão "Adicionar Responsável"
  - Verifica se novos campos de responsável aparecem

### 1.4. Remover Responsável

**Teste**: `Deve permitir remover responsável`

- **Objetivo**: Verificar se é possível remover um responsável do formulário
- **Ações**:
  - Adiciona um responsável
  - Clica no botão de remover
  - Verifica se o formulário permanece funcional

### 1.5. Adicionar Membro da Família

**Teste**: `Deve permitir adicionar membro da família`

- **Objetivo**: Verificar se é possível adicionar um novo membro da família ao formulário
- **Ações**:
  - Clica no botão "Adicionar Membro"
  - Verifica se os campos de família aparecem

### 1.6. Submissão com Dados Válidos

**Teste**: `Deve submeter o formulário com dados válidos`

- **Objetivo**: Verificar se o formulário é submetido corretamente com dados válidos
- **Ações**:
  - Preenche campos do formulário (nome, email, CPF)
  - Submete o formulário
  - Verifica se a API é chamada com método POST
  - Verifica se o alerta de sucesso é exibido
- **Validações**:
  - Chamada POST para `/api/beneficiarios`
  - Headers corretos (`Content-Type: application/json`)
  - Alerta "Salvo com sucesso" é exibido

### 1.7. Tratamento de Erro na Submissão

**Teste**: `Deve exibir alerta de erro quando a submissão falhar`

- **Objetivo**: Verificar se erros na submissão são tratados corretamente
- **Cenário**: Simula erro na API (Network error)
- **Verificações**:
  - Alerta de erro é exibido ("Falha ao salvar (veja console)")
  - Formulário não é resetado em caso de erro

### 1.8. Reset do Formulário após Sucesso

**Teste**: `Deve resetar o formulário após submissão bem-sucedida`

- **Objetivo**: Verificar se o formulário é resetado após submissão bem-sucedida
- **Ações**:
  - Preenche campos do formulário
  - Submete com sucesso
  - Verifica se os campos são limpos

### 1.9. Limpar Formulário

**Teste**: `Deve permitir limpar o formulário`

- **Objetivo**: Verificar se o botão "Limpar" funciona corretamente
- **Ações**:
  - Preenche campos do formulário
  - Clica no botão "Limpar"
  - Verifica se os campos são limpos

---

## 2. Componente: ListaBeneficiarios

**Arquivo**: `client/src/__tests__/components/ListaBeneficiarios.test.js`

**Total de testes**: 12 testes

### 2.1. CT-004: Listagem de Beneficiários

#### 2.1.1. Renderização da Lista

**Teste**: `Deve renderizar a lista de beneficiários`

- **Objetivo**: Verificar se a lista de beneficiários é renderizada corretamente
- **Verificações**:
  - Lista de beneficiários é exibida
  - Nomes dos beneficiários são exibidos
  - CPFs são exibidos
  - Estado de carregamento desaparece

#### 2.1.2. Estado de Carregamento

**Teste**: `Deve exibir estado de carregamento`

- **Objetivo**: Verificar se o estado de carregamento é exibido enquanto os dados são carregados
- **Cenário**: Simula requisição que nunca resolve
- **Verificação**: Mensagem "Carregando beneficiários..." é exibida

#### 2.1.3. Tratamento de Erro

**Teste**: `Deve exibir erro quando a requisição falhar`

- **Objetivo**: Verificar se erros na requisição são tratados corretamente
- **Cenário**: Simula erro na requisição à API
- **Verificação**: Mensagem de erro é exibida

#### 2.1.4. Lista Vazia

**Teste**: `Deve exibir mensagem quando não houver beneficiários`

- **Objetivo**: Verificar se mensagem apropriada é exibida quando não há beneficiários
- **Cenário**: API retorna array vazio
- **Verificação**: Mensagem "Nenhum beneficiário encontrado." é exibida

### 2.2. CT-005: Busca por Nome

#### 2.2.1. Filtro por Nome

**Teste**: `Deve filtrar beneficiários por nome`

- **Objetivo**: Verificar se a busca por nome funciona corretamente
- **Ações**:
  - Digita "João" no campo de busca
  - Verifica se apenas o beneficiário correspondente é exibido
- **Verificações**:
  - Beneficiário "João da Silva" é exibido
  - Beneficiário "Maria Oliveira" não é exibido

#### 2.2.2. Busca Case-Insensitive

**Teste**: `Deve fazer busca case-insensitive`

- **Objetivo**: Verificar se a busca ignora maiúsculas/minúsculas
- **Ações**:
  - Digita "joão" (minúscula) no campo de busca
  - Verifica se "João da Silva" ainda é encontrado

#### 2.2.3. Filtro por CPF

**Teste**: `Deve filtrar beneficiários por CPF`

- **Objetivo**: Verificar se a busca por CPF funciona corretamente
- **Ações**:
  - Digita CPF no campo de busca
  - Verifica se apenas o beneficiário correspondente é exibido

#### 2.2.4. Filtro por Número de Cadastro

**Teste**: `Deve filtrar beneficiários por número de cadastro`

- **Objetivo**: Verificar se a busca por número de cadastro funciona corretamente
- **Ações**:
  - Digita número de cadastro no campo de busca
  - Verifica se o beneficiário correspondente é exibido

### 2.3. CT-006: Expansão de Detalhes

#### 2.3.1. Expansão de Detalhes

**Teste**: `Deve expandir detalhes do beneficiário ao clicar no botão`

- **Objetivo**: Verificar se os detalhes do beneficiário são expandidos ao clicar no botão
- **Ações**:
  - Clica no botão "Expandir"
  - Verifica se as seções de detalhes são exibidas
- **Verificações**:
  - Seção "Dados Pessoais" é exibida
  - Seção "Documentos e Profissão" é exibida
  - Seção "Informações de Saúde" é exibida

#### 2.3.2. Exibição de Detalhes Completos

**Teste**: `Deve exibir detalhes completos do beneficiário quando expandido`

- **Objetivo**: Verificar se todos os detalhes do beneficiário são exibidos quando expandido
- **Verificações**:
  - Profissão é exibida
  - Cidade é exibida
  - Outros detalhes são exibidos

#### 2.3.3. Exibição de Responsáveis

**Teste**: `Deve exibir responsáveis quando expandido`

- **Objetivo**: Verificar se os responsáveis são exibidos quando o beneficiário é expandido
- **Verificações**:
  - Seção "Responsáveis" é exibida
  - Nome do responsável é exibido
  - Dados do responsável são exibidos

#### 2.3.4. Recolhimento de Detalhes

**Teste**: `Deve recolher detalhes ao clicar novamente`

- **Objetivo**: Verificar se os detalhes são recolhidos ao clicar novamente no botão
- **Ações**:
  - Expande os detalhes
  - Clica no botão "Recolher"
  - Verifica se os detalhes são ocultados
- **Verificações**:
  - Detalhes não são mais exibidos
  - Botão muda para "Expandir" novamente

### 2.4. Botão de Adicionar Novo

**Teste**: `Deve exibir botão de adicionar novo beneficiário`

- **Objetivo**: Verificar se o botão de adicionar novo beneficiário é exibido e funciona
- **Verificações**:
  - Botão "+ Adicionar Novo" é exibido
  - Link aponta para `/beneficiarios/cadastro`

---

## 3. Componente: CestasBasicas

**Arquivo**: `client/src/__tests__/components/CestasBasicas.test.js`

**Total de testes**: 5 testes

### 3.1. Renderização do Componente

**Teste**: `Deve renderizar o componente corretamente`

- **Objetivo**: Verificar se o componente é renderizado corretamente
- **Verificações**:
  - Título "Controle de Cestas Básicas" é exibido
  - Seção "Estoque Atual" é exibida
  - Seção "Histórico de Entregas" é exibida

### 3.2. Exibição de Estoque

**Teste**: `Deve exibir estoque atual`

- **Objetivo**: Verificar se o estoque atual é exibido corretamente
- **Verificações**:
  - Quantidade de cestas (50) é exibida
  - Texto "Cestas disponíveis" é exibido

### 3.3. Histórico de Entregas

**Teste**: `Deve renderizar histórico de entregas`

- **Objetivo**: Verificar se o histórico de entregas é renderizado corretamente
- **Verificações**:
  - Nomes dos beneficiários são exibidos (João da Silva, Maria Oliveira, José Pereira)
  - Histórico é exibido em formato de tabela

### 3.4. Botão de Registrar Entrega

**Teste**: `Deve exibir botão de registrar entrega`

- **Objetivo**: Verificar se o botão de registrar nova entrega é exibido
- **Verificação**: Botão "+ Registrar Nova Entrega" é exibido

### 3.5. Formatação de Datas

**Teste**: `Deve formatar datas corretamente`

- **Objetivo**: Verificar se as datas são formatadas e exibidas corretamente
- **Verificação**: Tabela com datas é renderizada

---

## Resumo dos Testes

### Estatísticas Gerais

- **Total de componentes testados**: 3
- **Total de testes**: 27
- **Frameworks**: Jest + React Testing Library

### Cobertura por Componente

| Componente | Número de Testes | Casos de Teste (CT) |
|------------|------------------|---------------------|
| FormularioBeneficiarios | 9 | CT-001, CT-002, CT-003 |
| ListaBeneficiarios | 12 | CT-004, CT-005, CT-006 |
| CestasBasicas | 5 | - |

### Casos de Teste do Plano

- **CT-001**: Cadastro Completo com Sucesso (testado no FormularioBeneficiarios)
- **CT-002**: Cadastro sem Campos Obrigatórios (testado no FormularioBeneficiarios)
- **CT-003**: Cadastro com CPF Inválido (testado no FormularioBeneficiarios)
- **CT-004**: Listagem de Beneficiários (testado no ListaBeneficiarios)
- **CT-005**: Busca por Nome (testado no ListaBeneficiarios)
- **CT-006**: Expansão de Detalhes (testado no ListaBeneficiarios)

### Técnicas de Teste Aplicadas

#### Testes de Caixa Preta
- Validação de formulários
- Interações do usuário
- Fluxos de negócio
- Validação de dados

#### Testes de Caixa Branca
- Cobertura de código
- Caminhos de execução
- Renderização de componentes

#### Métodos de Teste
- **Classes de Equivalência**: Validação de campos (nome, CPF, email)
- **Valores de Fronteira**: Campos vazios, valores máximos
- **Tabelas de Decisão**: Validação de formulários, busca de beneficiários

---

## Executando os Testes

### Comandos Disponíveis

```bash
# Executar todos os testes
npm test

# Executar testes com cobertura
npm run test:coverage

# Executar testes em modo watch
npm test -- --watch
```

### Localização dos Testes

Todos os testes do frontend estão em:
```
client/src/__tests__/components/
```

---

## Notas Importantes

1. **Mocks**: Todos os testes usam mocks do `fetch` para simular chamadas à API
2. **React Router**: O `react-router-dom` é mockado para evitar problemas de navegação
3. **Alertas**: O `window.alert` é mockado para evitar pop-ups durante os testes
4. **Isolamento**: Cada teste é isolado e não depende de estado externo
5. **Assíncrono**: Os testes aguardam operações assíncronas usando `waitFor`

---

## Melhorias Futuras

- [ ] Adicionar testes de acessibilidade
- [ ] Adicionar testes de performance
- [ ] Adicionar testes E2E com Cypress
- [ ] Adicionar testes de validação de formulários mais robustos
- [ ] Adicionar testes de integração com backend real

