import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr';
import wasm from "vite-plugin-wasm";

// https://vitejs.dev/config/
export default defineConfig({
    base: process.env.DEPLOY_PATH || '/',
    build: {
        target: 'es2022',
    },
    plugins: [react({
        jsxImportSource: '@emotion/react',
        babel: {
            plugins: ['@emotion/babel-plugin']
        }
    }), svgr({
        svgrOptions: {
            icon: true,
        },
    }), wasm()],
})
