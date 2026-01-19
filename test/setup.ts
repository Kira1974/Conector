import 'reflect-metadata';

// Set up environment variables for tests
process.env.NODE_ENV = 'test';
process.env.TRANSFER_TIMEOUT_MS = '50000';
process.env.WEBHOOK_POLLING_START_DELAY_MS = '30000';
process.env.POLLING_INTERVAL_MS = '5000';
process.env.MOL_QUERY_TIMEOUT_MS = '10000';
process.env.ENABLE_MOL_POLLING = 'true';
