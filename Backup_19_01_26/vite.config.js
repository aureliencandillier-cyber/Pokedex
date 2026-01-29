import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // ou '@vitejs/plugin-react' selon ton install

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Pokedex/', 
})