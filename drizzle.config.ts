import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Match Next.js: base defaults in `.env`, local secrets (e.g. DATABASE_URL) in `.env.local`.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: [
    "./src/lib/db/schema/",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
