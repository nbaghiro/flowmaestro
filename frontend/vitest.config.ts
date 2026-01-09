import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./src/test-setup.ts"],
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        exclude: ["node_modules", "dist"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/lib/**/*.ts"],
            exclude: ["src/**/*.test.ts", "src/test-setup.ts"]
        }
    }
});
