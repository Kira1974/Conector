module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.module.ts$',
    'main.ts$',
    '.dto.ts$',
    '.interface.ts$',
    '.enum.ts$',
    '.enums.ts$',
    'index.ts$',
    '.constants.ts$',
    'global-exception.filter.ts$',
    'global-validation.pipe.ts$'
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/configuration/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@infrastructure/provider/(.*)$': '<rootDir>/src/infrastructure/provider/$1',
    '^@infrastructure/entrypoint/(.*)$': '<rootDir>/src/infrastructure/entrypoint/$1'
  }
};
