/**
 * Jest smoke test configuration
 *
 * Runs only critical path tests for quick validation (~30 seconds).
 * Use: npm run test:smoke
 */

const baseConfig = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "tsx", "js", "json"],
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: {
                    esModuleInterop: true,
                    allowSyntheticDefaultImports: true,
                    jsx: "react"
                }
            }
        ]
    },
    transformIgnorePatterns: ["node_modules/(?!(nanoid|uuid)/)"],
    moduleNameMapper: {
        "^nanoid$": "<rootDir>/__tests__/__mocks__/nanoid.ts",
        "^uuid$": "<rootDir>/__tests__/__mocks__/uuid.ts",
        "^canvas$": "<rootDir>/__tests__/__mocks__/canvas.ts"
    }
};

module.exports = {
    ...baseConfig,
    displayName: "smoke",
    verbose: true,
    testTimeout: 15000,
    cache: true,
    cacheDirectory: "<rootDir>/.jest-cache",

    // Critical path tests only - target ~30 seconds
    testMatch: [
        // Workflow execution core
        "<rootDir>/src/temporal/core/services/__tests__/context.test.ts",
        "<rootDir>/src/temporal/activities/execution/__tests__/builder.test.ts",
        "<rootDir>/src/temporal/activities/execution/__tests__/registry.test.ts",

        // LLM handler (critical node type)
        "<rootDir>/src/temporal/activities/execution/handlers/__tests__/llm.test.ts",

        // Auth
        "<rootDir>/src/services/oauth/__tests__/OAuthService.test.ts",
        "<rootDir>/src/core/utils/__tests__/password.test.ts",

        // Critical repositories
        "<rootDir>/src/storage/repositories/__tests__/WorkflowRepository.test.ts",
        "<rootDir>/src/storage/repositories/__tests__/UserRepository.test.ts",
        "<rootDir>/src/storage/repositories/__tests__/ExecutionRepository.test.ts"
    ],

    // Run tests in parallel for speed
    maxWorkers: "50%"
};
