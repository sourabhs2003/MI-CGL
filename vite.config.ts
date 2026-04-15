import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/", // 🔥 THIS LINE FIXES YOUR ISSUE
  plugins: [react()],
})