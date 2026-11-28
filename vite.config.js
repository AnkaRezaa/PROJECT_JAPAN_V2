import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const appEntry = fileURLToPath(new URL('./resources/js/app.jsx', import.meta.url));

export default defineConfig({
    server: {
        port: 5173,
        strictPort: true,
    },
    plugins: [
        laravel({
            input: appEntry,
            refresh: true,
        }),
        react(),
    ],
});
