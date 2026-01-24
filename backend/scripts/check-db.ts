import path from "path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function checkDb() {
    const client = new pg.Client(process.env.DATABASE_URL);
    try {
        await client.connect();

        console.log("Checking extensions...");
        const extRes = await client.query("SELECT * FROM pg_extension WHERE extname = 'vector'");
        console.log("Vector extension results:", extRes.rows);

        console.log("\nChecking types...");
        const typeRes = await client.query(
            "SELECT n.nspname as schema, t.typname as type FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'vector'"
        );
        console.log("Vector type results:", typeRes.rows);

        console.log("\nChecking search_path...");
        const pathRes = await client.query("SHOW search_path");
        console.log("Current search_path:", pathRes.rows);
    } catch (err) {
        console.error("Error checking DB:", err);
    } finally {
        await client.end();
    }
}

checkDb();
