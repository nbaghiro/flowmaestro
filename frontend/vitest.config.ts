import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    cacheDir: ".vitest-cache",
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test-setup.ts"],
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        exclude: ["node_modules", "dist"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: [
                "src/lib/**/*.ts",
                "src/stores/**/*.ts",
                "src/hooks/**/*.ts",
                "src/canvas/**/*.ts",
                "src/canvas/**/*.tsx"
            ],
            exclude: [
                "src/**/*.test.ts",
                "src/**/*.test.tsx",
                "src/test-setup.ts",
                "src/test-helpers.ts",
                "src/canvas/__mocks__/**",
                "src/canvas/__tests__/test-utils.tsx"
            ]
        }
    }
});
