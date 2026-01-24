/**
 * Jest configuration for Temporal workflow tests
 *
 * Uses projects to separate unit and integration tests:
 * - Unit tests: Fast, no infrastructure dependencies (co-located with source in tests folders)
 * - Integration tests: Full workflow testing with mocked activities (in tests/integration)
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
        "^nanoid$": "<rootDir>/tests/mocks/nanoid.ts",
        "^uuid$": "<rootDir>/tests/mocks/uuid.ts"
    },
    verbose: true
};

module.exports = {
    ...baseConfig,
    projects: [
        {
            ...baseConfig,
            displayName: "unit",
            testMatch: ["<rootDir>/src/**/tests/*.test.ts"],
            testTimeout: 10000
        },
        {
            ...baseConfig,
            displayName: "integration",
            testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
            setupFilesAfterEnv: ["<rootDir>/tests/integration/setup.ts"],
            testTimeout: 30000
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
