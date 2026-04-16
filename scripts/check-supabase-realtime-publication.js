require("dotenv").config({ path: ".env.local" });

const postgres = require("postgres");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing (expected in .env.local).");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const rows = await sql`
    select schemaname, tablename
    from pg_publication_tables
    where pubname = 'supabase_realtime'
    order by schemaname, tablename
  `;

  console.log("supabase_realtime tables count:", rows.length);
  console.log(
    "subscription_invoices entries:",
    rows.filter((r) => r.schemaname === "public" && r.tablename === "subscription_invoices"),
  );

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

