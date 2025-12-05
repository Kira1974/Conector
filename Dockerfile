FROM --platform=linux/amd64 node:22.18.0 AS deps

WORKDIR /app

ARG PNPM_VERSION=latest
RUN corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY themis-* package.json pnpm-lock.yaml ./

RUN pnpm install --no-strict-peer-dependencies

FROM --platform=linux/amd64 node:22.18.0 AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ARG PNPM_VERSION=latest
RUN corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate

RUN pnpm build

FROM --platform=linux/amd64 node:22.18.0-slim AS runner

LABEL org.opencontainers.image.title="charon" \
      org.opencontainers.image.description="Adapter layer - NestJS service" 

ENV API_CONTEXT_PATH=0.0.0.0 \
    API_PORT=3000

USER node

WORKDIR /srv/app

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/src ./src
COPY --chown=node:node package.json ./

EXPOSE 3000

CMD ["node", "dist/configuration/main.js"]