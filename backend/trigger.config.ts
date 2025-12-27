import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
    project: process.env.TRIGGER_PROJECT_ID!,
    runtime: "node",
    logLevel: "log",
    maxDuration: 600, // 10 minutes max per task
    retries: {
        enabledInDev: false,
        default: { maxAttempts: 1 }
    },
    dirs: ["./src/trigger/tasks"]
});
