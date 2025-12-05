# SPI Integration Microservice (NestJS) - Full with PostgreSQL

This repo is a starter full implementation scaffold with:
- NestJS + TypeScript
- TypeORM + PostgreSQL
- Modules: auth, aws (Secrets), common (http client + logger), dife, qr, mol, webhook
- Datadog logging integration (Winston transport)
- Docker Compose to run service + Postgres locally

Run locally:
1. Copy `.env.example` to `.env` and adjust variables.
2. `docker-compose up --build` (starts postgres and service)
3. Or run locally without docker: `npm install` then `npm run start:dev` (requires DATABASE_URL env).

Notes:
- Webhook AES decrypt is placeholder — implement according to SPI spec.
- Review secrets handling and rotate keys in production.
