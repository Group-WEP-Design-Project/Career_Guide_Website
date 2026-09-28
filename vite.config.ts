import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), 'index.html'),
        internship: resolve(process.cwd(), 'internship.html'),
        career: resolve(process.cwd(), 'Career.html'),
        resources: resolve(process.cwd(), 'resources.html'),
        profile: resolve(process.cwd(), 'profile.html'),
        login: resolve(process.cwd(), 'login.html'),
        register: resolve(process.cwd(), 'resgister.html'),
      },
    },
  },
})