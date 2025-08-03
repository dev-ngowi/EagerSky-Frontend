import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { vuestic } from '@vuestic/compiler/vite'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  base: '/',
  build: {
    sourcemap: true,
  },
  plugins: [
    vuestic({
      devtools: true,
      cssLayers: true,
    }),
    vue(),
    VueI18nPlugin({
      include: resolve(dirname(fileURLToPath(import.meta.url)), './src/i18n/locales/**'),
    }),
    monacoEditorPlugin({}),
  ],
  server: {
    port: 5173,
    open: true,
  },
})
