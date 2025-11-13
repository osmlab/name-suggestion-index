import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';

const rules = {
  rules: {
    "accessor-pairs": "error",
    "array-callback-return": "warn",
    "arrow-spacing": "warn",
    "block-scoped-var": "error",
    "block-spacing": ["warn", "always"],
    "brace-style": ["warn", "1tbs", { "allowSingleLine": true }],
    "complexity": ["warn", 50],
    "curly": ["warn", "multi-line"],
    "default-case-last": "error",
    "default-param-last": "error",
    "dot-notation": "error",
    "eqeqeq": ["error", "smart"],
    "func-call-spacing": ["warn", "never"],
    "grouped-accessor-pairs": "error",
    "indent": ["off", 2],
    "keyword-spacing": "error",
    "linebreak-style": ["error", "unix"],
    "no-await-in-loop": "off",
    "no-caller": "error",
    "no-catch-shadow": "error",
    "no-constructor-return": "error",
    "no-div-regex": "error",
    "no-duplicate-imports": "warn",
    "no-eq-null": "error",
    "no-eval": "error",
    "no-extend-native": "error",
    "no-extra-bind": "error",
    "no-extra-label": "error",
    "no-floating-decimal": "error",
    "no-global-assign": "error",
    "no-implied-eval": "error",
    "no-invalid-this": "off",
    "no-iterator": "error",
    "no-labels": "error",
    "no-label-var": "error",
    "no-lone-blocks": "error",
    "no-loop-func": "error",
    "no-loss-of-precision": "error",
    "no-multi-str": "error",
    "no-new": "error",
    "no-new-func": "error",
    "no-new-wrappers": "error",
    "no-octal": "error",
    "no-octal-escape": "error",
    "no-process-env": "error",
    "no-promise-executor-return": "error",
    "no-proto": "error",
    "no-prototype-builtins": "off",
    "no-restricted-properties": "error",
    "no-return-assign": "off",
    "no-return-await": "error",
    "no-script-url": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-shadow": "off",
    "no-shadow-restricted-names": "error",
    "no-template-curly-in-string": "warn",
    "no-throw-literal": "error",
    "no-trailing-spaces": "warn",
    "no-undef": "error",
    "no-undef-init": "warn",
    "no-unexpected-multiline": "error",
    "no-unneeded-ternary": "error",
    "no-unmodified-loop-condition": "error",
    "no-unreachable": "warn",
    "no-unreachable-loop": "warn",
    "no-unused-expressions": "error",
    "no-unused-vars": "off", // typescript-eslint will check it
    "no-use-before-define": ["off", "nofunc"],
    "no-useless-backreference": "warn",
    "no-useless-call": "warn",
    "no-useless-computed-key": "warn",
    "no-useless-concat": "warn",
    "no-useless-constructor": "off",
    "no-useless-escape": "off",
    "no-useless-rename": "warn",
    "no-void": "error",
    "no-warning-comments": "warn",
    "no-whitespace-before-property": "warn",
    "no-with": "error",
    "radix": ["error", "always"],
    "require-atomic-updates": "error",
    "require-await": "error",
    "semi": ["error", "always"],
    "semi-spacing": "error",
    "space-unary-ops": "error",
    "wrap-regex": "off",

    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-inferrable-types": ["warn", { "ignoreParameters": true }],
    "@typescript-eslint/no-unused-vars": ["warn", { "vars": "all", "args": "none", "caughtErrors": "none", "destructuredArrayIgnorePattern": "^_" }]
  }
};

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...ts.configs.stylistic,
  rules,
  {
    files: [ '**/*.{js,ts}' ],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: [ 'lib/*', 'scripts/*', 'test/*' ],
    languageOptions: {
      globals: {
        ...globals.node,
        Bun: false
      }
    }
  }
];
