import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// 禁止 fetch("/api/...") 相对 URL 模式
// 使用 fetchAPI 替代（自动拼接 API_BASE）
const noRawApiFetch = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Use fetchAPI instead of fetch for /api/ URLs' },
    fixable: 'code',
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'fetch') return;
        const arg = node.arguments[0];
        if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') return;
        if (!arg.value.startsWith('/api/')) return;
        context.report({
          node,
          message: 'Use fetchAPI("{{path}}") instead of fetch("{{path}}") for API calls. import { fetchAPI } from "@/lib/api"',
          data: { path: arg.value },
        });
      },
    };
  },
};

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-restricted-properties': ['warn', {
        object: 'window',
        property: 'open',
        message: 'Use window.open sparingly; prefer React Router navigation',
      }],
    },
  },
  {
    plugins: { custom: { rules: { 'no-raw-api-fetch': noRawApiFetch } } },
    rules: { 'custom/no-raw-api-fetch': 'error' },
  },
  {
    ignores: ['node_modules/', 'dist/', '.astro/'],
  },
);
