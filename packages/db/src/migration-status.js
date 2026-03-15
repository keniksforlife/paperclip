import { inspectMigrations } from "./client.js";
import { resolveMigrationConnection } from "./migration-runtime.js";
const jsonMode = process.argv.includes("--json");
async function main() {
    const connection = await resolveMigrationConnection();
    try {
        const state = await inspectMigrations(connection.connectionString);
        const payload = state.status === "upToDate"
            ? {
                source: connection.source,
                status: "upToDate",
                tableCount: state.tableCount,
                pendingMigrations: [],
            }
            : {
                source: connection.source,
                status: "needsMigrations",
                tableCount: state.tableCount,
                pendingMigrations: state.pendingMigrations,
                reason: state.reason,
            };
        if (jsonMode) {
            console.log(JSON.stringify(payload));
            return;
        }
        if (payload.status === "upToDate") {
            console.log(`Database is up to date via ${payload.source}`);
            return;
        }
        console.log(`Pending migrations via ${payload.source}: ${payload.pendingMigrations.join(", ")}`);
    }
    finally {
        await connection.stop();
    }
}
await main();
//# sourceMappingURL=migration-status.js.map