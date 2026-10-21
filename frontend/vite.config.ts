import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Unmount rendered components between tests.
    setupFiles: ['src/test/setup.ts'],
    // Vitest empties CSS by default; tokens.test.ts reads the real token values.
    css: { include: [/tokens\.css/] },
  },
})
