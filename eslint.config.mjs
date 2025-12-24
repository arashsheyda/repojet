import { defineConfig } from 'eslint/config'
import raycastConfig from '@raycast/eslint-config'

export default defineConfig([
  ...raycastConfig,
  {
     rules: {
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
      'no-console': 'off',
    },
  },
])