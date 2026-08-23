// @ts-check
import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules', 'reports', 'test-results', 'playwright-report'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    // Guardrail for AI-assisted (and human) test generation: specs must go
    // through an API client (src/api-clients/), never Playwright's raw
    // `request` fixture. See docs/AI-TEST-GENERATION.md.
    files: ['tests/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='request'][value.type='Identifier']",
          message:
            "Test specs must not use Playwright's raw `request` fixture — call an API client from src/api-clients/ instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='request'][callee.property.name=/^(get|post|put|delete|patch|head|fetch)$/]",
          message:
            'Test specs must not make raw HTTP calls — use an API client from src/api-clients/ instead.',
        },
      ],
    },
  },
  eslintConfigPrettier,
);
