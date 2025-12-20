module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Best Practices
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'warn',
    'no-param-reassign': 'warn',
    
    // Error Prevention
    'no-await-in-loop': 'warn',
    'no-promise-executor-return': 'error',
    'require-atomic-updates': 'error',
    'no-return-await': 'error',
    
    // Code Quality
    'complexity': ['warn', 15],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-params': ['warn', 5],
    'max-nested-callbacks': ['warn', 4],
    
    // Style
    'camelcase': ['error', { properties: 'never' }],
    'consistent-return': 'error',
    'curly': ['error', 'all'],
    'eqeqeq': ['error', 'always'],
    'no-else-return': 'warn',
    'no-lonely-if': 'warn',
    'no-magic-numbers': ['warn', { 
      ignore: [-1, 0, 1, 2],
      ignoreArrayIndexes: true,
      enforceConst: true 
    }],
    
    // ES6+
    'arrow-body-style': ['warn', 'as-needed'],
    'no-duplicate-imports': 'error',
    'object-shorthand': ['warn', 'always'],
    'prefer-destructuring': ['warn', {
      array: false,
      object: true
    }],
    'prefer-template': 'warn',
    'template-curly-spacing': ['error', 'never'],
    
    // Async/Await
    'no-async-promise-executor': 'error',
    'require-await': 'warn',
    
    // Error Handling
    'handle-callback-err': 'error',
    'no-throw-literal': 'error',
    
    // Node.js Specific
    'callback-return': 'warn',
    'global-require': 'warn',
    'no-buffer-constructor': 'error',
    'no-path-concat': 'error',
    'no-process-exit': 'warn',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-magic-numbers': 'off',
        'max-lines': 'off',
      }
    }
  ]
};
