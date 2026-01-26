/**
 * Jest configuration for Temporal workflow tests
 *
 * Uses projects to separate unit and integration tests:
 * - Unit tests: Fast, no infrastructure dependencies (co-located with source in __tests__ folders)
 * - Integration tests: Full workflow testing with mocked activities (in __tests__/integration)
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
        "^uuid$": "<rootDir>/__tests__/__mocks__/uuid.ts"
    }
};

module.exports = {
    verbose: true,
    testTimeout: 30000,
    projects: [
        {
            ...baseConfig,
            displayName: "unit",
            testMatch: [
                "<rootDir>/src/**/__tests__/*.test.ts",
                "<rootDir>/__tests__/unit/**/*.test.ts"
            ]
        },
        {
            ...baseConfig,
            displayName: "integration",
            testMatch: ["<rootDir>/__tests__/integration/**/*.test.ts"],
            setupFilesAfterEnv: ["<rootDir>/__tests__/integration/setup.ts"]
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
