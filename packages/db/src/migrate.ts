import { applyPendingMigrations } from "./client.js";

export async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  await applyPendingMigrations(url);
}

await migrate();
export {};
