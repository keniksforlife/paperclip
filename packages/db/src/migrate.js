import { applyPendingMigrations, inspectMigrations, resolveMigrationConnection, } from "./client.js";
export async function migrate() {
    const connection = await resolveMigrationConnection();
    try {
        const state = await inspectMigrations(connection.connectionString);
        if (state.status === "upToDate") {
            return;
        }
        await applyPendingMigrations(connection.connectionString, state);
    }
    finally {
        await connection.stop();
    }
}
await migrate();
//# sourceMappingURL=migrate.js.map