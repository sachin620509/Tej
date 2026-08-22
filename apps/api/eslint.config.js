import tseslint from '@typescript-eslint/eslint-plugin'; import parser from '@typescript-eslint/parser';
export default [{files:['src/**/*.ts','tests/**/*.ts'],languageOptions:{parser,parserOptions:{ecmaVersion:'latest',sourceType:'module'}},plugins:{'@typescript-eslint':tseslint},rules:{'no-console':['error',{allow:['warn','error']}],'@typescript-eslint/no-explicit-any':'error'}}];
