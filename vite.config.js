import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [preact()],
    build: {
        manifest: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.fileName === 'app.css') {
                        return 'assets/app.css'
                    }
                    return 'assets/[name]-[hash][extname]'
                }
            }
        }
    }
})
