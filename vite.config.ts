import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/gsap') ||
            id.includes('node_modules\\gsap')
          ) {
            return 'motion'
          }

          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules\\react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules\\react\\')
          ) {
            return 'react'
          }

          if (
            id.includes('@react-three/postprocessing') ||
            id.includes('node_modules/postprocessing') ||
            id.includes('node_modules\\postprocessing')
          ) {
            return 'effects'
          }

          if (
            id.includes('node_modules/three') ||
            id.includes('node_modules\\three') ||
            id.includes('@react-three')
          ) {
            return 'three'
          }

          return undefined
        },
      },
    },
  },
})
