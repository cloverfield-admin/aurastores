require("dotenv").config({ path: ".env.local" });

const postgres = require("postgres");

async function main() {
  const orgId = process.argv[2];
  if (!orgId) {
    throw new Error("Usage: node scripts/check-org-subscription-dates.js <organizationId>");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing (expected in .env.local).");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const rows = await sql`
    select
      organization_id,
      plan_id,
      interval,
      status,
      current_period_start,
      current_period_end,
      updated_at
    from public.organization_subscriptions
    where organization_id = ${orgId}
    limit 1
  `;

  console.log("organization_subscriptions:", rows[0] ?? null);

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

