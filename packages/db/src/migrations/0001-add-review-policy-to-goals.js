import { sql } from "drizzle-orm";
export const { up, down } = new PgMigration({
    async up({ drizzle, schema }) {
        await drizzle.execute(sql `
      ALTER TABLE "goals" ADD COLUMN "review_policy" text DEFAULT 'owner';
    `);
    },
    async down({ drizzle, schema }) {
        await drizzle.execute(sql `
      ALTER TABLE "goals" DROP COLUMN "review_policy";
    `);
    },
});
//# sourceMappingURL=0001-add-review-policy-to-goals.js.map