import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: process.env.NODE_ENV === "production" ? ".env.local" : ".env" });

export default defineConfig({
  schema: [
    "./lib/db/schema/account.schema.ts",
    "./lib/db/schema/branch.schema.ts",
    "./lib/db/schema/inventory.schema.ts",
    "./lib/db/schema/sales.schema.ts",
    "./lib/db/schema/onboarding.schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
