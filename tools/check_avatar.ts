import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar';
    `);

        if (result.rows.length > 0) {
            console.log("Avatar column verification: EXISTS ✅");
        } else {
            console.log("Avatar column verification: MISSING ❌");
        }
        process.exit(0);
    } catch (err) {
        console.error("Verification failed:", err);
        process.exit(1);
    }
}

main();
