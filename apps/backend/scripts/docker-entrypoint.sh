#!/bin/sh
set -e

# Container entrypoint for the backend.
# 1. load-env.js fetches parameters from AWS SSM Parameter Store
#    (/pulso/<NODE_ENV>/backend/) and writes .env.local into the current
#    working directory (/app). If there are no credentials/params, it leaves
#    any existing env untouched — inline env vars (e.g. docker-compose dev)
#    still take precedence and the app boots normally.
# 2. main.ts loads that .env.local via dotenv.config from process.cwd().
node apps/backend/scripts/load-env.js

exec node apps/backend/dist/main.js
