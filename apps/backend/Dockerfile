FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/website/package.json ./apps/website/
COPY packages/shared/package.json ./packages/shared/
COPY tools/ai-cli/package.json ./tools/ai-cli/
RUN corepack prepare --activate && yarn install --immutable

FROM node:22-alpine AS shared-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
RUN node_modules/.bin/tsc -p packages/shared/tsconfig.json

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY . .
RUN corepack prepare --activate && yarn workspace @app/backend build:docker

# `deps` above installs every workspace's dependencies (frontend/website's React,
# Next.js, Tailwind, etc. included) because `builder` needs the full monorepo graph
# to compile. The runner never touches any of that — `focus --production` installs
# only @app/backend's own runtime dependencies, keeping the shipped image (and every
# tagged copy of it that accumulates on the deploy host) close to what it actually runs.
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/website/package.json ./apps/website/
COPY packages/shared/package.json ./packages/shared/
COPY tools/ai-cli/package.json ./tools/ai-cli/
RUN corepack prepare --activate && yarn workspaces focus @app/backend --production

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=prod-deps /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:node apps/backend/scripts ./apps/backend/scripts
# tsc-alias doesn't rewrite every `@app/shared` import to a relative path (many
# compiled files still `require("@app/shared")` literally) — `focus` only installs
# @app/backend's own declared dependencies, and @app/shared isn't one, so nothing
# else provides that resolution. Recreate it by hand instead of chasing every
# unrewritten import; @app/shared's own deps (class-validator etc.) are already
# among @app/backend's own dependencies.
RUN mkdir -p node_modules/@app && ln -s ../../packages/shared node_modules/@app/shared
# The entrypoint (as `node`) writes .env.local into /app from SSM — make the
# workdir itself writable by node (files inside stay root-owned but readable).
RUN chown node:node /app
USER node
EXPOSE 3001
ENTRYPOINT ["sh", "apps/backend/scripts/docker-entrypoint.sh"]
