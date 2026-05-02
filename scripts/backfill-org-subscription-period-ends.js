require("dotenv").config({ path: ".env.local" });

const postgres = require("postgres");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing (expected in .env.local).");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const rows = await sql`
    update public.organization_subscriptions os
    set current_period_end = case os.interval
      when 'monthly' then os.current_period_start + interval '1 month'
      when 'quarterly' then os.current_period_start + interval '3 months'
      when 'yearly' then os.current_period_start + interval '1 year'
      else os.current_period_start + interval '1 month'
    end,
    updated_at = now()
    where os.current_period_end is null
      and os.current_period_start is not null
    returning os.organization_id, os.interval, os.current_period_start, os.current_period_end
  `;

  console.log("backfilled rows:", rows.length);
  if (rows.length) {
    console.log(rows.slice(0, 10));
    if (rows.length > 10) console.log("... (truncated)");
  }

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

