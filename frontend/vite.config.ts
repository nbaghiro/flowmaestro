import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    server: {
        port: 3000,
        proxy: {
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "index.html"),
                widget: path.resolve(__dirname, "src/widget/widget-sdk.ts")
            },
            output: {
                // Widget SDK should be a single file without chunking
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === "widget") {
                        return "widget/[name].js";
                    }
                    return "assets/[name]-[hash].js";
                }
            }
        }
    }
});
