// vite.config.ts
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
    base: "/",
    plugins: [react()],
    preview: { port: 8080, strictPort: true },
    server: { port: 8080, strictPort: true, host: true },
    resolve: { alias: [{ find: "@", replacement: resolve(__dirname, "./src") }] },
});
