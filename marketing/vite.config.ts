import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

function htmlEnvPlugin(): Plugin {
    return {
        name: "html-env-plugin",
        transformIndexHtml: {
            order: "pre",
            handler(html, ctx) {
                const env = loadEnv(ctx.mode ?? "development", process.cwd(), "VITE_");
                return html.replace(/%VITE_GA_MEASUREMENT_ID%/g, env.VITE_GA_MEASUREMENT_ID || "");
            }
        }
    };
}

export default defineConfig({
    plugins: [react(), htmlEnvPlugin()],
    server: {
        port: 5174,
        host: true
    },
    build: {
        outDir: "dist",
        sourcemap: true
    }
});
