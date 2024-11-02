import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.DEPLOY_PATH || '/',
  plugins: [react({
      jsxImportSource: '@emotion/react',
      babel: {
          plugins: ['@emotion/babel-plugin']
      }
  })],
})
