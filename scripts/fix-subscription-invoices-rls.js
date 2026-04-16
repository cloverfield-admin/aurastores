require("dotenv").config({ path: ".env.local" });

const postgres = require("postgres");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing (expected in .env.local).");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  // Ensure RLS is enabled (no-op if already enabled).
  await sql`alter table public.subscription_invoices enable row level security`;

  // Allow authenticated users who are active members of the invoice's org to read it.
  // Idempotent create via DO block.
  await sql.unsafe(`
do $$
begin
  create policy subscription_invoices_select_org_members
    on public.subscription_invoices
    for select
    using (
      exists (
        select 1
        from public.organization_memberships m
        where m.organization_id = subscription_invoices.organization_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    );
exception
  when duplicate_object then
    null;
end $$;
  `);

  console.log("OK: ensured RLS + SELECT policy on public.subscription_invoices");

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

