/**
 * Jest configuration for Temporal workflow tests
 * Unit tests run without infrastructure dependencies
 * Integration tests require Temporal, PostgreSQL, and Redis
 */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    testMatch: ["**/tests/**/*.test.ts"],
    moduleFileExtensions: ["ts", "js", "json"],
    collectCoverageFrom: [
        "src/temporal/**/*.ts",
        "!src/**/*.d.ts",
        "!src/**/index.ts"
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    testTimeout: 10000,
    maxWorkers: 4,
    verbose: true,
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
    transformIgnorePatterns: ["node_modules/(?!(nanoid)/)"],
    // Mock nanoid to avoid ES module issues
    moduleNameMapper: {
        "^nanoid$": "<rootDir>/tests/__mocks__/nanoid.ts"
    }
};
