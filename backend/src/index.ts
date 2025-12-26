// Set timezone to UTC before any other imports or operations
// This prevents timezone mismatches between Node.js and PostgreSQL
process.env.TZ = "UTC";

import { startServer } from "./api/server";
import { getLogger } from "./core/logging";

const logger = getLogger();

// Start the server
startServer().catch((error) => {
    logger.error({ component: "main", err: error }, "Failed to start server");
    process.exit(1);
});
