require("dotenv").config({ path: ".env.local" });

const postgres = require("postgres");

async function main() {
  const invoiceId = process.argv[2];
  if (!invoiceId) {
    throw new Error("Usage: node scripts/check-invoice-and-replica-identity.js <invoiceId>");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing (expected in .env.local).");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const invoice = await sql`
    select id, identifier, status, organization_id, paid_at, updated_at, created_at
    from public.subscription_invoices
    where id = ${invoiceId}
    limit 1
  `;

  console.log("invoice row:", invoice[0] ?? null);

  const orgId = invoice[0]?.organization_id ?? null;
  if (orgId) {
    const memberships = await sql`
      select id, organization_id, user_id, role, status, is_default
      from public.organization_memberships
      where organization_id = ${orgId}
      order by created_at asc
    `;
    console.log("org memberships:", memberships);
  }

  const replica = await sql`
    select relreplident
    from pg_class
    where oid = 'public.subscription_invoices'::regclass
  `;
  const relreplident = replica[0]?.relreplident ?? null;
  console.log("relreplident:", relreplident, "(d=default, f=full, i=index, n=nothing)");

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

