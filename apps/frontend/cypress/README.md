# Cypress E2E Tests

## Pré-requisitos

1. Backend rodando em `http://localhost:3001`
2. Frontend rodando em `http://localhost:3000`
3. PostgreSQL e Redis disponíveis via `docker-compose up -d`
4. Usuário admin criado no banco de dados (ver "Configuração do banco")

## Configuração do banco

Execute o seed de teste para criar o usuário admin usado nos testes E2E:

```bash
NODE_ENV=test yarn workspace apps/backend seed:run
```

O seed cria o usuário admin com as credenciais padrão definidas em `cypress/fixtures/users.json`.

## Configuração de credenciais

Se as credenciais do admin forem diferentes do padrão, crie o arquivo `cypress/cypress.env.json` (está no `.gitignore`):

```json
{
  "API_URL": "http://localhost:3001",
  "ADMIN_EMAIL": "seu-admin@dominio.com",
  "ADMIN_PASSWORD": "SuaSenhaSegura123!"
}
```

E atualize `cypress/fixtures/users.json` com os mesmos valores.

## Executando os testes

```bash
# Modo headless (CI/CD)
yarn workspace apps/frontend cypress:run

# Interface interativa
yarn workspace apps/frontend cypress:open

# Apenas testes de usuários
yarn workspace apps/frontend cypress:run --spec "cypress/e2e/users/**/*.cy.ts"
```

## Estrutura dos testes

```
cypress/
  e2e/
    login/
      login.cy.ts             — Fluxo de autenticação
    users/
      users-list.cy.ts        — Listagem de usuários
      users-create.cy.ts      — Criação de usuário
      users-update.cy.ts      — Edição de usuário
      users-delete.cy.ts      — Remoção de usuário
  fixtures/
    users.json                — Dados de teste (credenciais admin, payloads)
  support/
    commands.ts               — Comandos customizados
    e2e.ts                    — Setup global
```

## Comandos customizados

| Comando | Descrição |
|---|---|
| `cy.login(email, password)` | Autentica via API e configura cookies |
| `cy.createUserViaApi(input)` | Cria usuário via API (requer login prévio) |
| `cy.deleteUserViaApi(id)` | Remove usuário via API (requer login prévio) |
| `cy.seedUser()` | Cria usuário de teste com dados únicos |

## Convenções

- Seletores exclusivamente via `data-testid`
- Nunca `cy.wait(ms)` — usar `cy.wait('@alias')` ou asserções em elementos
- Cada `it()` é independente: setup em `beforeEach`, limpeza em `afterEach` ou inline
- Setup e teardown via API direta, não via UI
- Testes de estados de erro e loading usam `cy.intercept()` para mockar respostas
- Testes de fluxo completo (happy path) usam backend real
