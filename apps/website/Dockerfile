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

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack prepare --activate && yarn workspace @app/website build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/apps/website/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/website/.next/static ./apps/website/.next/static
COPY --from=builder --chown=node:node /app/apps/website/public ./apps/website/public
USER node
EXPOSE 3000
CMD ["node", "apps/website/server.js"]
