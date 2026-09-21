import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 8414 // FlowMaestro 84xx block, see infra/local/README.md
    }
});
