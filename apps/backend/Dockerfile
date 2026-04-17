FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
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

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3001
CMD ["node", "apps/backend/dist/main.js"]
