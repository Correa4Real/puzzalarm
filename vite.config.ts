// external libs
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ===== CONFIGURATIONS =====
const config = defineConfig({
  plugins: [react()],
  server: { host: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

// ===== EXPORT =====
export default config
