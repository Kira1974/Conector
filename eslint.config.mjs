import eslint from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';
import eslintPluginJest from 'eslint-plugin-jest';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs', 'jest.config.mjs', 'jest.config.js', '**/coverage/**', '**/dist/**', '**/build/**', '**/node_modules/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        settings: {
            'import/resolver': {
                typescript: {
                    project: './tsconfig.json',
                },
            },
        },
        plugins: {
            import: eslintPluginImport,
            'unused-imports': eslintPluginUnusedImports,
            jest: eslintPluginJest,
        },
    },
    {
        rules: {
            // TypeScript rules
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }
            ],
            '@typescript-eslint/no-inferrable-types': [
                'warn',
                {
                    ignoreProperties: true,
                    ignoreParameters: true
                }
            ],
            '@typescript-eslint/explicit-function-return-type': ['error', {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
            }],
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/no-empty-function': ['error', {
                allow: ['constructors']
            }],
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/promise-function-async': 'error',
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                },
                {
                    selector: 'class',
                    format: ['PascalCase']
                },
                {
                    selector: 'method',
                    format: ['camelCase']
                }
            ],

            // Imports rules
            'import/order': [
                'warn',
                {
                    'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    'newlines-between': 'always',
                },
            ],
            'import/no-unresolved': 'error',
            'import/no-cycle': 'error',
            'import/no-self-import': 'error',
            'import/no-duplicates': 'error',
            'unused-imports/no-unused-imports': 'warn',

            // Complexity rules
            'max-depth': ['warn', 2],
            'max-lines-per-function': ['warn', 50],

            // JavaScript standard rules
            'no-unused-vars': 'off',
            'no-console': ['warn', {allow: ['error']}],
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            'no-var': 'error',
            'prefer-template': 'warn',
            'no-throw-literal': 'error',
            'no-debugger': 'error',
        },
    },
    {
        files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        plugins: {
            jest: eslintPluginJest,
        },
        rules: {
            'jest/no-disabled-tests': 'warn',
            'jest/no-focused-tests': 'error',
            'jest/no-identical-title': 'error',
            'jest/prefer-to-have-length': 'warn',
            'jest/valid-expect': 'error',
            'jest/valid-describe-callback': 'error',
            'jest/consistent-test-it': ['warn', { fn: 'it' }],
            'jest/expect-expect': 'error',
            'jest/no-duplicate-hooks': 'warn',
            'jest/no-test-return-statement': 'error',
            'jest/prefer-hooks-on-top': 'warn',
            'jest/require-top-level-describe': 'warn',
            'jest/prefer-to-be': 'warn',
            'jest/prefer-to-contain': 'warn',
            'jest/prefer-equality-matcher': 'warn',
            'jest/prefer-strict-equal': 'warn',
            'jest/prefer-comparison-matcher': 'warn',
            'jest/no-hooks': 'off',
            'jest/prefer-hooks-in-order': 'warn',
            'jest/no-mocks-import': 'error',
            'jest/unbound-method': 'off',
            'jest/no-large-snapshots': ['warn', { maxSize: 50 }],

            // Disabled strict rules for tests
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-object-literal-type-assertion': 'off',
            '@typescript-eslint/unbound-method': 'off',
            'no-console': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',

            // Complexity rules
            'max-depth': ['off'],
            'max-lines-per-function': ['off'],
        },
    }
);