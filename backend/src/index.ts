// Set timezone to UTC before any other imports or operations
// This prevents timezone mismatches between Node.js and PostgreSQL
process.env.TZ = "UTC";

import { startServer } from "./api/server";

// Start the server
startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
