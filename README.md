# Pulso

Plataforma de gestão para clínicas — cadastro de profissionais e pacientes, agendas, consultas, prontuários eletrônicos e prescrição de medicamentos.

## Stack

* **Frontend**: Next.js (App Router), React, React Query, Tailwind CSS, Zustand
* **Backend**: Node.js, NestJS, PostgreSQL, TypeORM, Redis
* **Shared**: types, DTOs e utils compartilhados entre frontend e backend
* **E2E**: Cypress

## Estrutura do monorepo

Yarn Workspaces:

```
apps/
  frontend/   → Next.js
  backend/    → NestJS
  website/    → Landing page institucional
packages/
  shared/     → types, DTOs, enums, utils compartilhados
tools/
  ai-cli/     → CLI interna
```

Ver `ai/context/architecture.md` para as regras de dependência entre os pacotes.

## Setup inicial

```bash
yarn install

# Configurar credenciais AWS (necessário para buscar variáveis do Parameter Store)
aws configure
```

## Infraestrutura local (Docker)

```bash
docker compose up -d
docker compose down
docker compose down -v  # reset completo do banco
```

## Banco de dados

```bash
yarn workspace @app/backend migration:run
yarn workspace @app/backend migration:generate src/database/migrations/nome_da_migration
yarn workspace @app/backend migration:revert
yarn workspace @app/backend seed:run
```

## Desenvolvimento

```bash
yarn workspace @app/frontend dev
yarn workspace @app/backend dev
yarn dev  # frontend, backend e website em paralelo
```

## Build

```bash
yarn build
```

## Testes

```bash
yarn workspace @app/frontend test
yarn workspace @app/backend test
yarn test  # todos os testes do monorepo

yarn workspace @app/frontend cypress:run  # e2e headless
```

## Deploy

Via GitHub Actions com acionamento manual. Artefatos enviados para AWS ECS.

| Branch | Ambiente |
|---|---|
| `develop` | staging |
| `main` | production |

Deploy nunca deve ser feito diretamente na máquina local.

---

Documentação completa de arquitetura, convenções, permissões e padrões de código em [`CLAUDE.md`](./CLAUDE.md) e [`ai/context/`](./ai/context).
