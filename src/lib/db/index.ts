import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const connectionString = process.env.DATABASE_URL!;

type Db = PostgresJsDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __aurapharma_postgres_client: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __aurapharma_db: Db | undefined;
}

const client =
  globalThis.__aurapharma_postgres_client ??
  postgres(connectionString, {
    // Keep this low to avoid exhausting shared Postgres limits in dev/HMR.
    max: process.env.NODE_ENV === 'production' ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

export const db: Db = globalThis.__aurapharma_db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__aurapharma_postgres_client = client;
  globalThis.__aurapharma_db = db;
}