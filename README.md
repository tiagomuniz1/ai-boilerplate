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

### Stack completa (proxy + website + roteamento por subdomínio)

O comando acima sobe só Postgres/Redis/Mailpit/backend/frontend em modo "path"
(`localhost:3010/3011`, o mesmo do dia a dia). Para validar o que antes só
staging cobria — roteamento por `Host` no nginx, `COOKIE_DOMAIN`, CORS entre
subdomínios, o app `website` — suba a stack completa:

```bash
docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build
```

Depois acesse `http://<slug>.pulso.localhost`, `http://backoffice.pulso.localhost`,
`http://pulso.localhost` (website) e `http://api.pulso.localhost/health` — o
navegador resolve qualquer `*.pulso.localhost` para `127.0.0.1` nativamente, sem
precisar editar `/etc/hosts`.

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

Via GitHub Actions com acionamento manual (`workflow_dispatch`). Artefatos enviados
para ECR e implantados numa instância EC2 via SSM Run Command. Ver `docs/DEPLOY_RUNBOOK.md`.

Ambiente único: `production` (branch `main`). Não existe branch `develop` nem
ambiente de staging na AWS — validação pré-deploy é local via Docker.

Deploy nunca deve ser feito diretamente na máquina local.

---

Documentação completa de arquitetura, convenções, permissões e padrões de código em [`CLAUDE.md`](./CLAUDE.md) e [`ai/context/`](./ai/context).
