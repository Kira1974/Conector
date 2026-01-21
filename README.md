# Charon - Payment Integration Microservice

A NestJS microservice implementing payment integration with external services (DIFE, MOL) using hexagonal architecture.

## Features

- **Hexagonal Architecture**: Clean separation between business logic and infrastructure
- **Payment Processing**: Transfer processing with webhook callbacks and polling fallback
- **Key Resolution**: Integration with DIFE for account key resolution
- **Configuration Management**: Environment-based JSON configuration with sensitive data in `.env`
- **Mountebank Integration**: Automatic mocking for development and testing
- **Comprehensive Testing**: Unit, integration, and E2E tests

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env` and configure sensitive credentials:
```bash
cp .env.example .env
```

2. Configure your environment in `deployment/{ENV}/app.json`:
   - Set `ENV=dev` for development
   - See [Configuration Guide](docs/configuration.md) for details

### Running

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## Documentation

All documentation is available in the [`docs/`](docs/) directory:

- **[Architecture](docs/architecture.md)** - Hexagonal architecture overview and design patterns
- **[Configuration](docs/configuration.md)** - Configuration system guide
- **[Logging](docs/logging.md)** - Logging guide for transaction tracking
- **[Mountebank](docs/mountebank.md)** - Using Mountebank for development and testing
- **[Webhook Flow](docs/webhook-flow.md)** - Transfer flow with webhook callbacks
- **[MOL-DIFE Mapping](docs/mol-dife-mapping.md)** - Field mapping between entrypoint and external APIs

## Project Structure

```
src/
├── configuration/    # Application configuration and bootstrap
├── core/            # Business logic (domain layer)
│   ├── constant/    # Enums and constants
│   ├── model/       # Domain models
│   ├── provider/    # Port interfaces
│   ├── usecase/     # Use cases
│   └── util/        # Domain utilities
└── infrastructure/  # Infrastructure layer
    ├── provider/    # Output adapters (HTTP clients)
    └── entrypoint/  # Input adapters (REST controllers)
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Environment Configuration

The application uses JSON configuration files per environment:
- `deployment/dev/app.json` - Development
- `deployment/qa/app.json` - QA
- `deployment/preprod/app.json` - Pre-production
- `deployment/prod/app.json` - Production

Sensitive data (credentials, certificates) is stored in `.env` files.

See [Configuration Guide](docs/configuration.md) for details.

## Mountebank for Development

Mountebank can be automatically enabled for development environments. When enabled, it mocks all external services (OAuth, DIFE, MOL) automatically.

See [Mountebank Guide](docs/mountebank.md) for setup and usage.

## License

[Your License Here]
