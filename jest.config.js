const path = require("path");
const backendConfig = require("./backend/jest.config");

module.exports = {
    ...backendConfig,
    // Ensure Jest resolves paths relative to the backend package when run from the monorepo root
    rootDir: path.join(__dirname, "backend")
};
