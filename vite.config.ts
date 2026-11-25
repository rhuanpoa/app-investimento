import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Identificador desta versão: vai embutido no app e publicado em version.json.
// O menu do usuário compara os dois para saber se há uma versão mais nova no ar.
const BUILD_ID = new Date().toISOString()

function versionFile(): Plugin {
  return {
    name: 'version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
    },
  }
}

// base = nome do repositório, para funcionar em https://<usuario>.github.io/app-investimento/
export default defineConfig({
  base: '/app-investimento/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), tailwindcss(), versionFile()],
})
