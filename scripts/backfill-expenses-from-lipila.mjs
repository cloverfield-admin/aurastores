import { config } from "dotenv";
import postgres from "postgres";

// Match app + drizzle config behavior.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run this backfill.");
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

function iso(date) {
  return new Date(date).toISOString();
}

async function main() {
  const startedAt = Date.now();

  // 1) MoMo sale collection fees (merchant-paid only)
  // Source of truth: lipila_payment_transactions.fee_cents + fee_payer + reference_id
  // Expense date: payments.paid_at (fallback lipila_payment_transactions.updated_at)
  const momoInserted = await sql`
    insert into expenses (
      organization_id,
      branch_id,
      expense_type,
      charge_type,
      amount_cents,
      currency,
      description,
      expense_date,
      source_ref,
      created_at,
      updated_at
    )
    select
      s.organization_id,
      s.branch_id,
      'charge'::expense_type as expense_type,
      'momo_sale_fee'::expense_charge_type as charge_type,
      lpt.fee_cents as amount_cents,
      coalesce(lpt.currency, 'ZMW') as currency,
      ('Lipila mobile money collection fee (Sale ' || s.sale_number || ')')::text as description,
      coalesce(p.paid_at, lpt.updated_at, lpt.created_at) as expense_date,
      lpt.reference_id as source_ref,
      now() as created_at,
      now() as updated_at
    from lipila_payment_transactions lpt
    join payments p on p.id = lpt.payment_id
    join sales s on s.id = p.sale_id
    where
      lpt.operation = 'sale_collection'
      and lpt.status = 'successful'
      and coalesce(lpt.fee_payer, 'merchant') = 'merchant'
      and lpt.fee_cents > 0
      and s.status = 'completed'
    on conflict (organization_id, charge_type, source_ref) do nothing
  `;

  // 2) Wallet withdrawal fees (wallet-paid)
  // Expense date: wallet_ledger_entries.posted_at (fallback lipila_payment_transactions.updated_at)
  const withdrawalInserted = await sql`
    insert into expenses (
      organization_id,
      branch_id,
      expense_type,
      charge_type,
      amount_cents,
      currency,
      description,
      expense_date,
      source_ref,
      created_at,
      updated_at
    )
    select
      wle.organization_id,
      wle.branch_id,
      'charge'::expense_type as expense_type,
      'wallet_withdrawal_fee'::expense_charge_type as charge_type,
      lpt.fee_cents as amount_cents,
      coalesce(wle.currency, lpt.currency, 'ZMW') as currency,
      'Lipila mobile money withdrawal fee (Aura Pay)'::text as description,
      coalesce(wle.posted_at, lpt.updated_at, lpt.created_at) as expense_date,
      lpt.reference_id as source_ref,
      now() as created_at,
      now() as updated_at
    from lipila_payment_transactions lpt
    join wallet_ledger_entries wle on wle.id = lpt.wallet_ledger_entry_id
    where
      lpt.operation = 'wallet_disbursement'
      and lpt.status = 'successful'
      and lpt.fee_cents > 0
      and wle.status = 'posted'
    on conflict (organization_id, charge_type, source_ref) do nothing
  `;

  // Summary
  const endedAt = Date.now();
  // postgres-js returns an array of rows for SELECT; for INSERT it returns [] by default.
  // We can still report elapsed time and advise checking counts via SELECT if needed.
  console.log(
    JSON.stringify(
      {
        ok: true,
        insertedSaleFeeExpenses: momoInserted.count ?? null,
        insertedWithdrawalFeeExpenses: withdrawalInserted.count ?? null,
        startedAt: iso(startedAt),
        durationMs: endedAt - startedAt,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await sql.end({ timeout: 5 });
}

