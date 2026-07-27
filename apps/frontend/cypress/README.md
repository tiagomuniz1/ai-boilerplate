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

Todos os comandos abaixo fazem requisições reais contra `API_URL` (o backend real, não mock) — são a base dos specs "real" que batem no backend de verdade, em vez de `cy.intercept`.

| Comando | Descrição |
|---|---|
| `cy.login(email, password)` | Autentica via API (backoffice) e configura cookies |
| `cy.loginAsClinicUser(email, password, slug)` | Autentica via API num tenant e devolve o access token bruto |
| `cy.createUserViaApi(input)` | Cria usuário via API (requer login prévio) |
| `cy.deleteUserViaApi(id)` | Remove usuário via API (requer login prévio) |
| `cy.seedUser()` | Cria usuário de teste com dados únicos |
| `cy.seedSpecialty()` / `cy.createSpecialtyViaApi(input)` | Cria especialidade via API |
| `cy.seedPatient()` | Cria paciente via API |
| `cy.seedProfessional()` | Cria usuário + especialidade + profissional via API, devolve credenciais e access token |
| `cy.seedClinic()` | Cria clínica via API (login como platform admin) |
| `cy.createScheduleViaApi(input, accessToken)` / `cy.deleteScheduleViaApi(id)` | Agenda de um profissional |
| `cy.createAppointmentViaApi(input, accessToken)` | Consulta (slot derivado da agenda pelo backend) |
| `cy.createPrescriptionViaApi(input, accessToken)` / `cy.deletePrescriptionViaApi(id)` | Receita vinculada a uma consulta |
| `cy.createMedicalCertificateViaApi(input, accessToken)` / `cy.deleteMedicalCertificateViaApi(id)` | Atestado vinculado a uma consulta |
| `cy.createScheduleExceptionViaApi(input, accessToken)` / `cy.deleteScheduleExceptionViaApi(id)` | Bloqueio de horário na agenda |

### Acesso direto ao banco (`cy.task('dbQuery', ...)`)

Para os poucos casos onde nenhum endpoint devolve o dado necessário para montar o teste (ex.: o token de verificação em texto puro de uma receita, ou simular o token que um e-mail de "definir senha" entregaria), existe uma task Node em `cypress.config.ts` que consulta o Postgres diretamente:

```ts
cy.task('dbQuery', { sql: 'SELECT verification_token FROM prescriptions WHERE id = $1', params: [prescriptionId] })
  .then((rows) => { /* rows[0].verification_token */ })
```

- Conecta usando `DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME/DB_SCHEMA` do bloco `env` do `cypress.config.ts` (mesmos defaults de `apps/backend/.env.local.example`, schema `dev` — o schema que o backend local usa em `yarn dev`), sobrescrevíveis via `cypress.env.json`.
- Recusa rodar se `NODE_ENV=production`.
- Use com moderação — é uma via de escape para os 1-2 fluxos sem alternativa via API, não um substituto geral para `*ViaApi`.

## Convenções

- **Cobertura completa, não só fluxos críticos**: toda funcionalidade do frontend precisa de teste E2E, por menor que seja — happy path, erro/loading, validação de formulário, toggles, diálogos secundários, menus, widgets embutidos em outras telas. Nenhuma feature é pequena demais para ficar sem teste.
- Seletores exclusivamente via `data-testid`
- Nunca `cy.wait(ms)` — usar `cy.wait('@alias')` ou asserções em elementos
- Cada `it()` é independente: setup em `beforeEach`, limpeza em `afterEach` ou inline
- Setup e teardown via API direta, não via UI
- Testes de estados de erro e loading usam `cy.intercept()` para mockar respostas
- Testes de fluxo completo (happy path) usam backend real
