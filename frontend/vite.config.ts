import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  envDir: '..',
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://qlqjzqhoggweajohlzsb.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscWp6cWhvZ2d3ZWFqb2hsenNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzAwNTksImV4cCI6MjA5MDAwNjA1OX0.La4GYx3d443rblFwEhDwmlmJkJyqDgWyT4nw5G2lPp0'),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
