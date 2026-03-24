import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: process.env.NODE_ENV === "production" ? ".env.local" : ".env" });

export default defineConfig({
  schema: [
    "./src/lib/db/schema/account.schema.ts",
    "./src/lib/db/schema/branch.schema.ts",
    "./src/lib/db/schema/inventory.schema.ts",
    "./src/lib/db/schema/sales.schema.ts",
    "./src/lib/db/schema/onboarding.schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
