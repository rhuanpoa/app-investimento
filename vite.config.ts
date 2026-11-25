import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base = nome do repositório, para funcionar em https://<usuario>.github.io/app-investimento/
export default defineConfig({
  base: '/app-investimento/',
  plugins: [react(), tailwindcss()],
})
