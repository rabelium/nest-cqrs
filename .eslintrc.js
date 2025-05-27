module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    es2020: true,
  },
  ignorePatterns: [
    '.eslintrc.js', 
    'dist/**/*', 
    'node_modules/**/*',
    '**/*.spec.ts',
    '**/*.test.ts',
  ],
  rules: {
    // TypeScript and Node.js specific
    'no-undef': 'off', // TypeScript handles this
    'no-unused-vars': 'off', // Use TypeScript version
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Code quality
    'no-debugger': 'error',
    'no-empty': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    
    // Style (auto-fixable)
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',
    
    // Relaxed rules for existing codebase
    'indent': 'off', // Will be handled by prettier
    'max-len': 'off', // Will be handled by prettier
  },
  overrides: [
    {
      files: ['src/external/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
}; 