import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Config preparado para GitHub Pages: base debe ser "/pres/" (nombre del repo)
export default defineConfig({
  plugins: [react()],
  base: '/pres/',
})
