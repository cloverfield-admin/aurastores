import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const connectionString = process.env.DATABASE_URL!;

type Db = PostgresJsDatabase<typeof schema>;

type GlobalDb = typeof globalThis & {
  __aurastores_postgres_client?: ReturnType<typeof postgres>;
  __aurastores_db?: Db;
  __aurapharma_postgres_client?: ReturnType<typeof postgres>;
  __aurapharma_db?: Db;
};

const g = globalThis as GlobalDb;

const client =
  g.__aurastores_postgres_client ??
  g.__aurapharma_postgres_client ??
  postgres(connectionString, {
    // Keep this low to avoid exhausting shared Postgres limits in dev/HMR.
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

export const db: Db = g.__aurastores_db ?? g.__aurapharma_db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  g.__aurastores_postgres_client = client;
  g.__aurastores_db = db;
}
