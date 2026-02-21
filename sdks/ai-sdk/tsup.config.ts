import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: ["@anthropic-ai/sdk", "@google/generative-ai", "cohere-ai", "openai", "ws"]
});
