/**
 * Jest configuration for Temporal workflow tests
 *
 * Uses projects to separate unit and integration tests:
 * - Unit tests: Fast, no infrastructure dependencies
 * - Integration tests: Full workflow testing with mocked activities
 */

const baseConfig = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "js", "json"],
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: {
                    esModuleInterop: true,
                    allowSyntheticDefaultImports: true
                }
            }
        ]
    },
    transformIgnorePatterns: ["node_modules/(?!(nanoid|uuid)/)"],
    moduleNameMapper: {
        "^nanoid$": "<rootDir>/tests/__mocks__/nanoid.ts",
        "^uuid$": "<rootDir>/tests/__mocks__/uuid.ts"
    },
    verbose: true
};

module.exports = {
    ...baseConfig,
    projects: [
        {
            ...baseConfig,
            displayName: "unit",
            testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
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
