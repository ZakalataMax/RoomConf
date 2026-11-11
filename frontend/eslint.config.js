import { globalIgnores } from 'eslint/config'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import prettierConfig from 'eslint-config-prettier/flat'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/coverage/**', '**/node_modules/**']),

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    name: 'app/globals',
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    name: 'app/node-files',
    files: ['*.config.{js,ts}', '**/__tests__/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    name: 'app/rules',
    rules: {
      // Single-word names (Notification, RoomScene, ...) are used throughout the project.
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },

  // Formatting is owned by Prettier (`npm run format`); turn off conflicting stylistic rules.
  prettierConfig
)
