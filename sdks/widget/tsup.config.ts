import { defineConfig } from "tsup";

export default defineConfig([
    // Main package (ESM + CJS)
    {
        entry: ["src/index.ts"],
        format: ["esm", "cjs"],
        dts: true,
        clean: true,
        outDir: "dist",
        splitting: false,
        sourcemap: true
    },
    // React subpath (ESM + CJS)
    {
        entry: ["src/react/index.ts"],
        format: ["esm", "cjs"],
        dts: true,
        outDir: "dist/react",
        external: ["react", "react-dom"],
        splitting: false,
        sourcemap: true
    },
    // Global/IIFE for script tags
    {
        entry: ["src/auto-init.ts"],
        format: ["iife"],
        globalName: "FlowMaestroWidgetLoader",
        outDir: "dist",
        minify: true,
        splitting: false
    }
]);
