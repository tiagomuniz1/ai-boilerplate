#!/bin/sh
set -e

# One-shot migration entrypoint for the `migrate` service (docker-compose.prod.yml).
# Runs from the image WORKDIR (/app). Invokes the TypeORM CLI directly via node so
# the runtime image stays minimal (no yarn / workspace manifests needed).
#
# 1. load-env.js fetches DB_HOST/DB_PASS (RDS) and the rest from SSM → .env.local.
# 2. `-r dotenv/config` preloads that .env.local into process.env for the node
#    processes below (DOTENV_CONFIG_PATH points at it). Missing file = no-op, so
#    inline env (e.g. docker-compose dev) still works.
# 3. bootstrap-schema.js ensures the schema exists (TypeORM won't create it).
# 4. TypeORM runs pending migrations against the compiled dataSource.
node apps/backend/scripts/load-env.js

export DOTENV_CONFIG_PATH=.env.local

node -r dotenv/config apps/backend/scripts/bootstrap-schema.js
node -r dotenv/config node_modules/typeorm/cli.js migration:run -d apps/backend/dist/database/database.config.js
