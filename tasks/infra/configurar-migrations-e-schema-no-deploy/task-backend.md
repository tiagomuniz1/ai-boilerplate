# Task — Configurar migrations e criação de schema no deploy

## Descrição

Fazer as migrations do TypeORM rodarem automaticamente no deploy, contra o **RDS**, e garantir que o **schema** exista antes das migrations. Hoje o `CMD` do backend é só `node dist/main.js` — nenhuma migration roda no boot — e o schema (`dev`) é criado por um `init.sql` montado no container Postgres, que **não existe** quando o banco é o RDS.

---

## Contexto

- `apps/backend/src/database/database.config.ts` usa `schema: DB_SCHEMA` (default `dev`) e `synchronize: false`. Migrations em `src/database/migrations/`.
- `apps/backend/package.json` tem `migration:run` = `yarn typeorm migration:run`, com o `typeorm` apontando pro dataSource **TS** (`src/database/database.config.ts`). Na imagem de produção só existe `dist/` — precisa apontar pro dataSource **compilado**.
- O schema hoje vem de `apps/backend/src/database/init.sql`, montado via volume no serviço `postgres` do `docker-compose.yml`. Com Postgres no RDS (decisão F), esse `init.sql` não roda.
- O deploy roda os apps em Docker; será adicionado um serviço one-shot `migrate` no `docker-compose.prod.yml` (a config do compose fica na task do proxy/compose; aqui cuidamos do que o backend precisa expor).

---

## Escopo

### 1. Script de migration para produção (`apps/backend/package.json`)

- Criar `migration:run:prod` apontando o TypeORM CLI para o dataSource compilado:
  `--dataSource dist/database/database.config.js` (validar o caminho gerado pelo `build:docker`).
- Garantir que o CLI do TypeORM e o `tsconfig`/paths resolvam na imagem (sem `ts-node` em produção).

### 2. Criação idempotente do schema no RDS

Escolher **uma** abordagem:

- **(preferida) Primeira migration** que roda `CREATE SCHEMA IF NOT EXISTS "<schema>"` antes das demais — versionada, roda no mesmo fluxo do `migration:run`. Cuidar da ordem de timestamp (menor que todas as existentes) **e** do `search_path`/schema em que a tabela `migrations` é criada.
- **(alternativa) Bootstrap no entrypoint do serviço `migrate`**: um passo `psql`/script que garante o schema antes de `migration:run:prod`.

> Atenção: o TypeORM cria a tabela de controle `migrations` no schema configurado — se o schema não existir, falha antes de tudo. A criação do schema precisa acontecer **antes** de qualquer operação do TypeORM naquele schema.

### 3. Validar o fluxo contra Postgres limpo

- Rodar `migration:run:prod` contra um Postgres vazio (sem `init.sql`), simulando o RDS, e confirmar que schema + todas as tabelas são criados do zero.

**Arquivos:** `apps/backend/package.json`, nova migration de bootstrap do schema em `apps/backend/src/database/migrations/`, (opcional) script de bootstrap.

---

## Decisões técnicas

- **Migration versionada para o schema** em vez de depender de `init.sql`: reproduzível em qualquer banco novo (RDS, staging, production), sem acoplar a criação do schema à infra do container.
- **`migration:run:prod` separado**: o script de dev usa dataSource TS; produção usa `dist`. Manter os dois evita `ts-node` na imagem.
- **Serviço `migrate` one-shot** (definido na task de compose): roda antes do `backend` (`depends_on: service_completed_successfully`), apontando pro RDS via `DB_HOST` do SSM — sem depender de container Postgres.

---

## Restrições

- NÃO usar `synchronize: true` em nenhum ambiente.
- NÃO rodar seeds em produção.
- NÃO assumir que o `init.sql` roda no RDS — o schema tem que ser garantido pela migration/bootstrap.
- Migrations devem ser idempotentes o suficiente para reexecução segura do serviço `migrate`.

---

## Definition of Done

- [x] `migration:run:prod` no `package.json` apontando pro dataSource compilado, funcionando na imagem Docker.
- [x] `CREATE SCHEMA IF NOT EXISTS` garantido antes das migrations (via `bootstrap-schema.js`, passo de entrypoint — a abordagem de migration de bootstrap **não** funciona, ver nota).
- [x] Contra um Postgres vazio, `migration:run:prod` cria schema + todas as tabelas sem erro (validado: DB limpo → 24 tabelas, 57 migrations).
- [x] Reexecução do fluxo de migration não quebra (idempotente: `schema ensured` + `No migrations are pending`).
- [x] Documentado como o serviço `migrate` do compose invoca esse script (via `apps/backend/scripts/migrate.sh` — ver task do proxy/compose).

> **Execução (2026-07-13):**
> - **Abordagem escolhida = bootstrap no entrypoint (a "alternativa"), NÃO a migration de bootstrap.** Teste empírico contra DB limpo provou o chicken-and-egg: o TypeORM cria a tabela de controle `migrations` **no schema configurado antes de rodar qualquer migration** → falha com `schema "<x>" does not exist`. Uma migration com timestamp menor não resolve, pois a tabela de controle é criada antes dela. Por isso o schema é criado **fora** do fluxo TypeORM.
> - **`uuid-ossp` é auto-criada pelo próprio TypeORM** no connect (`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`) e `pg_trgm` já é criada idempotentemente pelas migrations de trigram → o bootstrap só precisa garantir o **schema**. Confirmado: DB que começou só com `plpgsql` terminou com `uuid-ossp` + `pg_trgm`.
> - **Arquivos criados:** `apps/backend/scripts/bootstrap-schema.js` (usa `pg`, valida o nome do schema contra injeção, `CREATE SCHEMA IF NOT EXISTS`), `apps/backend/scripts/migrate.sh` (entrypoint do serviço `migrate`: `load-env.js` → `bootstrap-schema.js` → `typeorm migration:run` no dataSource compilado, tudo via `node` direto — sem `yarn`/manifests na imagem mínima; env do `.env.local` via `node -r dotenv/config` + `DOTENV_CONFIG_PATH`).
> - **`migration:run:prod`** (package.json) para dev/CI: `node scripts/bootstrap-schema.js && typeorm migration:run -d dist/database/database.config.js` (env fornecido pelo chamador). O container usa o `migrate.sh` (que adiciona o `load-env` do SSM antes).
> - **Sem risco aos testes:** não alterei `database.config.ts` — o carregamento de `.env.local` é feito só no `migrate.sh` via `-r dotenv/config`, isolado do fluxo de teste de integração.
> - Validado tanto pelo CLI (`yarn migration:run:prod`) quanto **pela imagem Docker** (`migrate.sh`), incluindo idempotência na reexecução.
