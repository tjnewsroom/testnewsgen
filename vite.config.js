import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/testnewsgen/', // must match your repo name — update if the repo is renamed
  plugins: [react()],
})
