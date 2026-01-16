import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";
import manifest from "./manifest.json";

export default defineConfig({
    plugins: [react(), crx({ manifest })],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "@flowmaestro/shared": resolve(__dirname, "../../shared/src")
        }
    },
    build: {
        outDir: "dist",
        sourcemap: process.env.NODE_ENV === "development",
        rollupOptions: {
            input: {
                sidebar: resolve(__dirname, "src/sidebar/index.html"),
                popup: resolve(__dirname, "src/popup/index.html")
            }
        }
    },
    server: {
        port: 5174,
        strictPort: true,
        hmr: {
            port: 5174
        }
    }
});
