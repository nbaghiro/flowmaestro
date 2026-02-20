/**
 * Jest configuration for Temporal workflow tests
 *
 * Uses projects to separate unit and integration tests:
 * - Unit tests: Fast, no infrastructure dependencies (co-located with source in __tests__ folders)
 * - Integration tests: Full workflow testing with mocked activities (in __tests__/integration)
 * - E2E tests: End-to-end tests with real PostgreSQL and Redis via Testcontainers (in __tests__/e2e)
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
    verbose: true,
    testTimeout: 30000,
    cache: true,
    cacheDirectory: "<rootDir>/.jest-cache",
    projects: [
        {
            ...baseConfig,
            displayName: "unit",
            testMatch: [
                "<rootDir>/src/**/__tests__/*.test.ts",
                "<rootDir>/src/**/__tests__/**/*.test.ts",
                "<rootDir>/__tests__/unit/**/*.test.ts"
            ]
        },
        {
            ...baseConfig,
            displayName: "integration",
            testMatch: ["<rootDir>/__tests__/integration/**/*.test.ts"],
            setupFilesAfterEnv: ["<rootDir>/__tests__/integration/setup.ts"]
        },
        {
            ...baseConfig,
            displayName: "e2e",
            testMatch: ["<rootDir>/__tests__/e2e/**/*.test.ts"],
            globalSetup: "<rootDir>/__tests__/e2e/globalSetup.ts",
            globalTeardown: "<rootDir>/__tests__/e2e/globalTeardown.ts",
            setupFilesAfterEnv: ["<rootDir>/__tests__/e2e/setup.ts"],
            // Run e2e tests sequentially to avoid Redis/PostgreSQL conflicts
            // Note: Also use --runInBand CLI flag for best results
            maxWorkers: 1
            // Note: testTimeout is set in setup.ts via jest.setTimeout(60000)
        }
    ],
    collectCoverageFrom: [
        "src/temporal/**/*.ts",
        "!src/**/*.d.ts",
        "!src/**/index.ts"
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    maxWorkers: 4
};
