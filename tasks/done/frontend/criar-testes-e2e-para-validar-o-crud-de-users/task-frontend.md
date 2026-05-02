# Task — Testes E2E para CRUD de Users (Frontend)

## Descrição
Implementar testes end-to-end com Cypress que validem o fluxo completo de CRUD de usuários (listagem, criação, edição e remoção), garantindo que a integração entre UI, hooks, services e API esteja funcionando corretamente em um ambiente próximo ao real.

---

## Contexto
- O módulo de `users` já está implementado em `apps/frontend/components/features/users/`
- Os testes devem cobrir os fluxos críticos do CRUD acessíveis pela UI
- Os testes devem ser **independentes** entre si — cada teste deve preparar e limpar seu próprio estado
- Autenticação via cookies `httpOnly` — login deve ser feito via comando customizado do Cypress (`cy.login()`) que faz a requisição direta para a API antes do teste
- Seletores devem usar exclusivamente `data-testid` — adicionar os atributos nos componentes caso ainda não existam
- Backend e banco de dados devem estar disponíveis (via `docker-compose`) durante a execução dos testes

---

## Contratos

### Input (dados do formulário de usuário no teste)
CreateUserInput:
- fullName: string
- email: string
- password: string
- role: string

UpdateUserInput:
- fullName: string
- email: string

### Output (validação na UI)
UserRow:
- fullName: string (visível na tabela)
- email: string (visível na tabela)
- role: string (visível na tabela)

---

## Assinaturas esperadas

<!-- Comandos customizados do Cypress -->
cy.login(email: string, password: string): Chainable<void>
cy.createUserViaApi(input: CreateUserInput): Chainable<{ id: string }>
cy.deleteUserViaApi(id: string): Chainable<void>
cy.seedUser(): Chainable<{ id: string; email: string; fullName: string }>

<!-- Estrutura de teste -->
describe('Users CRUD', () => { ... })

---

## Fluxo principal

### Listagem
1. Usuário autenticado acessa `/users`
2. Lista de usuários é exibida com `fullName`, `email` e `role`
3. Skeleton/loading aparece antes dos dados

### Criação
1. Usuário clica em "Novo Usuário" (`data-testid="create-user-button"`)
2. Formulário é exibido em `/users/new`
3. Preenche os campos e submete
4. Toast/feedback de sucesso é exibido
5. Redireciona para `/users` e novo usuário aparece na lista

### Edição
1. Usuário clica em editar na linha (`data-testid="edit-user-{id}"`)
2. Formulário pré-preenchido é exibido em `/users/{id}/edit`
3. Altera campos e submete
4. Feedback de sucesso é exibido
5. Lista é atualizada com os novos dados

### Remoção
1. Usuário clica em remover na linha (`data-testid="delete-user-{id}"`)
2. Modal de confirmação é exibido
3. Confirma remoção
4. Feedback de sucesso é exibido
5. Usuário some da lista

---

## Estados e feedbacks

- Loading → skeleton da tabela / spinner no botão de submit
- Erro → mensagem amigável visível via `data-testid="error-message"`
- Sucesso → toast `data-testid="toast-success"` + redirecionamento / atualização da lista

---

## Regras de negócio

- Não permitir email duplicado — backend retorna 409 e UI exibe erro amigável
- Validação de campos obrigatórios no formulário (frontend) antes de submeter
- Confirmação obrigatória antes de remover usuário
- Usuário precisa estar autenticado para acessar `/users` — redireciona para `/login` caso contrário

---

## Dependências

- `cy.login()` — comando customizado em `cypress/support/commands.ts`
- `cy.createUserViaApi()` / `cy.deleteUserViaApi()` — para setup/teardown sem depender da UI
- Fixtures em `cypress/fixtures/users.json` para dados de teste
- Backend rodando localmente (`docker-compose up`)

---

## Decisões técnicas da task

- Usar React Query (query ou mutation): N/A (teste E2E — apenas valida comportamento)
- Usar Zustand: N/A
- Optimistic update: N/A
- Formulário com react-hook-form: N/A (já implementado)
- Setup/teardown via API direta — nunca via UI (mais rápido e confiável)
- Cada `it()` é independente — `beforeEach` cria estado, `afterEach` limpa

---

## Restrições

- NÃO usar seletores por classe CSS, id ou texto — apenas `data-testid`
- NÃO depender da ordem de execução entre testes
- NÃO criar dados de teste em um teste para usar em outro
- NÃO usar `cy.wait(milissegundos)` — usar `cy.intercept()` + `cy.wait('@alias')`
- NÃO logar via UI em todo teste — usar `cy.login()` que faz request direto à API
- NÃO importar tipos do `axios` ou de services do frontend nos testes E2E

---

## Estrutura esperada

apps/frontend/cypress/
- e2e/
  - users/
    - users-list.cy.ts
    - users-create.cy.ts
    - users-update.cy.ts
    - users-delete.cy.ts
- fixtures/
  - users.json
- support/
  - commands.ts
  - e2e.ts

---

## Cenários de teste adicionais

### Listagem
- Exibe lista vazia com mensagem amigável quando não há usuários
- Exibe skeleton durante o carregamento
- Exibe mensagem de erro quando API falha (mockar via `cy.intercept`)
- Redireciona para `/login` quando usuário não está autenticado

### Criação
- Exibe erros de validação ao submeter formulário vazio
- Exibe erro amigável quando email já existe (409)
- Botão de submit fica desabilitado enquanto request está pendente
- Cancelar formulário retorna para `/users` sem criar

### Edição
- Formulário vem pré-preenchido com dados atuais do usuário
- Exibe erro quando tentar atualizar para email já existente
- Cancelar edição não altera dados

### Remoção
- Cancelar modal de confirmação não remove o usuário
- Exibe erro amigável quando remoção falha

---

## Definition of Done

- [ ] Comandos customizados `cy.login`, `cy.createUserViaApi`, `cy.deleteUserViaApi` implementados
- [ ] `data-testid` adicionados nos componentes envolvidos
- [ ] Testes E2E para listagem, criação, edição e remoção implementados
- [ ] Cenários adicionais (validação, erros, autenticação) cobertos
- [ ] Todos os testes passam isoladamente e em conjunto
- [ ] Nenhum `cy.wait(ms)` no código — apenas espera por aliases ou elementos
- [ ] Nenhum seletor por classe, id ou texto
- [ ] Setup e teardown feitos via API, não via UI
- [ ] Documentação no README do `cypress/` sobre como rodar os testes localmente