# Task — Carregar variáveis do Parameter Store no container (runtime)

## Descrição

Fazer o container do backend carregar suas variáveis de ambiente do **AWS SSM Parameter Store** no boot, reaproveitando o script `load-env.js` que hoje só roda em dev. Também padroniza o **path dos parâmetros** (hoje inconsistente entre código e docs) e cria um script para popular o Parameter Store. Isso mantém secrets fora do compose e do repositório, e deixa o padrão pronto para ECS.

---

## Contexto

- `apps/backend/src/config/env.config.ts` lê **`process.env`** direto (com `main.ts` fazendo `dotenv.config` de `.env.local`). Não há leitura de SSM em runtime.
- `apps/backend/scripts/load-env.js` **já** busca parâmetros do SSM (`GetParametersByPathCommand`, paginado, `WithDecryption`) e escreve `.env.local` — mas só é chamado pelo script `dev`. O `CMD` do container é `node apps/backend/dist/main.js`, sem passar por ele.
- **Path inconsistente**: o código usa `/myapp/${NODE_ENV}/backend/`; a doc do Terraform usa `/umi/<env>/`; o plano padroniza em **`/pulso/<env>/backend/`**.
- `@aws-sdk/client-ssm` já é dependência do backend. Na EC2, a instância terá IAM Role com permissão de leitura no SSM (`/pulso/<env>/*`) — o SDK usa a credential chain padrão (instance profile), sem chave.

---

## Escopo

### 1. Entrypoint do container (novo, `apps/backend/scripts/docker-entrypoint.sh`)

```sh
#!/bin/sh
set -e
node apps/backend/scripts/load-env.js   # busca SSM → escreve .env.local
exec node apps/backend/dist/main.js     # main.ts faz dotenv.config(.env.local)
```

- Ajustar o `Dockerfile` do backend para usar esse script como `ENTRYPOINT`/`CMD`.
- Garantir que `load-env.js` e `@aws-sdk/client-ssm` estejam presentes na imagem `runner` (se a task de poda de `node_modules` for feita, manter o pacote).

### 2. Padronizar o path do SSM

- Alterar `apps/backend/scripts/load-env.js` (e o do frontend, se aplicável) para o prefixo **`/pulso/${NODE_ENV}/backend/`** (e `/pulso/${NODE_ENV}/frontend/`).
- `NODE_ENV` em prod/staging define o segmento (`production` / `staging`).

### 3. Script de povoamento do SSM (novo, `infra/scripts/seed-ssm.sh`)

Documentar e automatizar o `put-parameter` de cada variável (por ambiente). Parâmetros:

| Parâmetro (`/pulso/<env>/backend/…`) | Tipo | Origem |
|---|---|---|
| `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_SCHEMA` | String | fixos |
| `DB_HOST`, `DB_PASS` | String / SecureString | **gravados pelo módulo RDS** — não popular aqui |
| `REDIS_HOST=redis`, `REDIS_PORT=6379` | String | container Redis |
| `JWT_SECRET` | SecureString | valor forte de prod (**não** o `local-dev-...`) |
| `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | String | ex. `900s` / `7d` |
| `COOKIE_DOMAIN=.pulso.center` | String | auth multi-subdomínio |
| `PUBLIC_API_URL=https://api.pulso.center` | String | branding/URLs |
| `FRONTEND_URL` | String | só fallback/dev (CORS de prod é por regex) |
| `AWS_S3_BUCKET`, `AWS_REGION` | String | clinic-assets |
| `SMTP_HOST/PORT/USER/PASS/FROM` | String/SecureString | outputs do módulo SES |

---

## Decisões técnicas

- **Reaproveitar `load-env.js`** em vez de reescrever env loading no app: zero mudança no código de negócio; o `main.ts` já consome `.env.local` via dotenv.
- **Instance profile (IAM Role)** em vez de chaves: o SDK resolve as credenciais pela metadata da EC2; nada de secret no compose.
- **Path `/pulso/<env>/backend/`**: um padrão único, alinhado com o IAM (`/pulso/<env>/*`) e com os outputs do Terraform.
- **`DB_HOST`/`DB_PASS` vêm do RDS**: o módulo RDS (task própria) grava esses no SSM; aqui só consumimos.

---

## Restrições

- NÃO colocar secrets no `docker-compose.prod.yml` nem no repositório.
- NÃO logar valores de parâmetros (o `load-env.js` só loga a contagem).
- NÃO acessar `process.env` fora de `env.config.ts` no código do app (o entrypoint/script é infra, aceitável).
- `JWT_SECRET`, `DB_PASS`, `SMTP_PASS` sempre como **SecureString**.
- **NÃO quebrar o `yarn dev` local ao mudar o prefixo do SSM.** Risco: se o dev tiver credencial AWS mas o path novo (`/pulso/development/backend/`) não tiver os parâmetros, o `load-env.js` **sobrescreve o `.env.local` com um arquivo vazio** (`writeFileSync` do resultado vazio). Mitigar com **uma** das opções:
  - migrar/recriar os parâmetros de `development` sob `/pulso/development/backend/` (o `seed-ssm.sh` cobre esse ambiente também); **ou**
  - manter `development` no path antigo; **ou**
  - ajustar o `load-env.js` para **não escrever** quando o SSM retorna zero parâmetros (preserva o `.env.local` existente).

---

## Definition of Done

- [x] `apps/backend/scripts/docker-entrypoint.sh` criado e definido como entrypoint no Dockerfile do backend.
- [x] `load-env.js` usando o prefixo `/pulso/<env>/backend/`.
- [x] `infra/scripts/seed-ssm.sh` documentado, populando os parâmetros de staging (exceto `DB_HOST`/`DB_PASS`). Dry-run validado; `apply` roda no deploy real (exige os valores/secrets exportados).
- [x] Subindo o backend com um instance profile (ou perfil local com acesso ao SSM), o log mostra `✓ .env.local generated with N variables from Parameter Store`. Validado contra o SSM real (namespace isolado `citest`, N=2, incluindo decrypt de `SecureString`).
- [x] O app inicia sem erro `Missing required environment variable`.
- [x] `@aws-sdk/client-ssm` presente na imagem de runtime.
- [x] **Localhost intacto:** `yarn workspace @app/backend dev` continua subindo com as variáveis corretas e **sem apagar/esvaziar** o `apps/backend/.env.local` do desenvolvedor.
- [x] **Localhost intacto:** `docker compose up` (o `docker-compose.yml` de dev) continua subindo o backend saudável (envs inline do compose têm precedência; o entrypoint faz fallback sem credencial AWS).

> **Execução (2026-07-13):**
> - **Path mismatch reconciliado:** `main.ts` lê `.env.local` de `process.cwd()`, mas o `load-env.js` escrevia em `__dirname/../.env.local`. Alterado para escrever em `process.cwd()/.env.local` → escritor e leitor sempre coincidem (em dev = `apps/backend`; no container = `/app`). Sem regressão no `dev`.
> - **Guard de zero-parâmetros** adicionado nos dois `load-env.js` (backend e frontend): se o SSM não retorna nada, **não** sobrescreve o `.env.local` existente. Validado contra o path real vazio `/pulso/development/backend/` — arquivo preservado.
> - **Permissão de escrita como `node`:** `RUN chown node:node /app` no `runner` do backend (resolvendo a pendência anotada na task 1) para o entrypoint criar `/app/.env.local`. Validado (`touch /app/.env.local` como `node` → OK).
> - **Frontend `load-env.js`** também migrado para `/pulso/<env>/frontend/` + guard (usado só no `dev` do frontend; o container do frontend usa `NEXT_PUBLIC_*` build-time, não SSM em runtime).
> - **Refs `/umi/` em `infra/terraform/environments/*/outputs.tf`** são apenas comentários de doc do módulo SES — serão alinhadas para `/pulso/` na task de infra correspondente, para não misturar escopo aqui.
