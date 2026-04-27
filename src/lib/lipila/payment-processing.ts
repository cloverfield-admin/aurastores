import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryBatches,
  inventoryTransactions,
  lipilaPaymentTransactions,
  payments,
  saleItems,
  sales,
  expenses,
  walletAccounts,
  walletLedgerEntries,
} from "@/lib/db/schema";
import type { LipilaPaymentCallbackInput } from "@/lib/validation/lipila";
import { normalizeLipilaStatus } from "@/lib/validation/lipila";

type LipilaPaymentTransaction = typeof lipilaPaymentTransactions.$inferSelect;

function normalizeDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function differenceInDays(target: Date, base: Date) {
  return Math.ceil((target.getTime() - base.getTime()) / 86_400_000);
}

function deriveBatchStatus(currentStatus: string, expiresAt: string | Date, quantityAvailable: number, today: Date) {
  if (currentStatus === "disposed") {
    return "disposed" as const;
  }

  if (currentStatus === "quarantined" && quantityAvailable > 0) {
    return "quarantined" as const;
  }

  if (quantityAvailable <= 0) {
    return "depleted" as const;
  }

  const expiryDate = normalizeDate(expiresAt);
  if (differenceInDays(expiryDate, today) < 0) {
    return "expired" as const;
  }

  return "active" as const;
}

function centsFromLipilaAmount(amount: number | undefined, fallback: number) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return fallback;
  }
  return Math.round(amount * 100);
}

async function markSalePaymentFailed(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  transaction: LipilaPaymentTransaction,
  message: string | null,
) {
  if (!transaction.paymentId) {
    return;
  }

  const payment = await tx.query.payments.findFirst({
    where: eq(payments.id, transaction.paymentId),
  });
  if (!payment || payment.status === "paid") {
    return;
  }

  await tx
    .update(payments)
    .set({
      status: "failed",
      metadata: {
        lipilaReferenceId: transaction.referenceId,
        lipilaMessage: message,
      },
    })
    .where(eq(payments.id, payment.id));

  await tx
    .update(sales)
    .set({
      paymentStatus: "failed",
      updatedAt: new Date(),
    })
    .where(eq(sales.id, payment.saleId));
}

async function finalizeSaleCollection(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  transaction: LipilaPaymentTransaction,
  payload: LipilaPaymentCallbackInput,
) {
  if (!transaction.paymentId) {
    return;
  }

  const payment = await tx.query.payments.findFirst({
    where: eq(payments.id, transaction.paymentId),
  });
  if (!payment) {
    return;
  }

  const sale = await tx.query.sales.findFirst({
    where: eq(sales.id, payment.saleId),
  });
  if (!sale) {
    return;
  }

  const existingSettlement = await tx.query.walletLedgerEntries.findFirst({
    where: and(
      eq(walletLedgerEntries.paymentId, payment.id),
      eq(walletLedgerEntries.entryType, "settlement"),
      eq(walletLedgerEntries.status, "posted"),
    ),
  });

  if (payment.status === "paid" && sale.status === "completed" && existingSettlement) {
    return;
  }

  const items = await tx.query.saleItems.findMany({
    where: eq(saleItems.saleId, sale.id),
  });

  const quantitiesByBatch = new Map<string, number>();
  for (const item of items) {
    if (!item.batchId) {
      await markSalePaymentFailed(tx, transaction, "Sale item has no stock batch.");
      return;
    }
    quantitiesByBatch.set(item.batchId, (quantitiesByBatch.get(item.batchId) ?? 0) + item.quantity);
  }

  const batchIds = [...quantitiesByBatch.keys()];
  const batches =
    batchIds.length > 0
      ? await tx.query.inventoryBatches.findMany({
          where: inArray(inventoryBatches.id, batchIds),
        })
      : [];

  if (batches.length !== batchIds.length) {
    await markSalePaymentFailed(tx, transaction, "One or more sale batches could not be found.");
    return;
  }

  const today = startOfTodayUtc();
  const batchUpdates = batches.map((batch) => {
    const quantity = quantitiesByBatch.get(batch.id) ?? 0;
    const nextQuantity = batch.quantityAvailable - quantity;
    return {
      batch,
      quantity,
      nextQuantity,
      nextStatus: deriveBatchStatus(batch.status, batch.expiresAt, nextQuantity, today),
    };
  });

  const insufficient = batchUpdates.find((item) => item.nextQuantity < 0);
  if (insufficient) {
    await markSalePaymentFailed(tx, transaction, "Insufficient stock available to complete paid sale.");
    return;
  }

  for (const item of batchUpdates) {
    await tx
      .update(inventoryBatches)
      .set({
        quantityAvailable: item.nextQuantity,
        status: item.nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(inventoryBatches.id, item.batch.id));
  }

  if (items.length > 0) {
    await tx.insert(inventoryTransactions).values(
      items.map((item) => {
        const batch = batches.find((candidate) => candidate.id === item.batchId);
        return {
          organizationId: sale.organizationId,
          branchId: sale.branchId,
          productId: item.productId!,
          batchId: item.batchId!,
          performedByUserId: sale.servedByUserId,
          transactionType: "sale" as const,
          quantityDelta: -item.quantity,
          unitOrderPriceCents: batch?.unitOrderPriceCents ?? 0,
          referenceType: "sale",
          referenceId: sale.id,
          note: `Sale ${sale.saleNumber}`,
        };
      }),
    );
  }

  const paidAt = new Date();
  await tx
    .update(payments)
    .set({
      status: "paid",
      reference: transaction.referenceId,
      paidAt,
      metadata: {
        lipilaReferenceId: transaction.referenceId,
        lipilaIdentifier: payload.identifier ?? transaction.identifier,
        lipilaExternalId: payload.externalId ?? transaction.externalId,
      },
    })
    .where(eq(payments.id, payment.id));

  await tx
    .update(sales)
    .set({
      status: "completed",
      paymentStatus: "paid",
      completedAt: paidAt,
      updatedAt: paidAt,
    })
    .where(eq(sales.id, sale.id));

  if (!existingSettlement) {
    const netAmountCents = transaction.netAmountCents ?? payment.amountCents;
    const [wallet] = await tx
      .update(walletAccounts)
      .set({
        balanceCents: sql`${walletAccounts.balanceCents} + ${netAmountCents}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(walletAccounts.organizationId, sale.organizationId),
          eq(walletAccounts.branchId, sale.branchId),
          eq(walletAccounts.status, "active"),
        ),
      )
      .returning();

    if (wallet) {
      await tx.insert(walletLedgerEntries).values({
        walletId: wallet.id,
        organizationId: sale.organizationId,
        branchId: sale.branchId,
        paymentId: payment.id,
        entryType: "settlement",
        sourceMethod: "mobile_money",
        status: "posted",
        amountCents: netAmountCents,
        currency: payment.currency,
        reference: transaction.referenceId,
        note: `Sale ${sale.saleNumber} settlement`,
        metadata: {
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          lipilaReferenceId: transaction.referenceId,
          grossAmountCents: transaction.grossAmountCents ?? payment.amountCents,
          feeCents: transaction.feeCents ?? 0,
          netAmountCents,
          feeBps: transaction.feeBps ?? 0,
          feePayer: transaction.feePayer ?? "merchant",
        },
        postedAt: paidAt,
      });
    }
  }

  if ((transaction.feePayer ?? "merchant") === "merchant" && (transaction.feeCents ?? 0) > 0) {
    await tx
      .insert(expenses)
      .values({
        organizationId: sale.organizationId,
        branchId: sale.branchId,
        expenseType: "charge",
        chargeType: "momo_sale_fee",
        amountCents: transaction.feeCents ?? 0,
        currency: payment.currency,
        description: `Lipila mobile money collection fee (Sale ${sale.saleNumber})`,
        expenseDate: paidAt,
        sourceRef: transaction.referenceId,
        updatedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [expenses.organizationId, expenses.chargeType, expenses.sourceRef],
      });
  }
}

async function finalizeWalletDisbursement(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  transaction: LipilaPaymentTransaction,
  payload: LipilaPaymentCallbackInput,
) {
  if (!transaction.walletLedgerEntryId) {
    return;
  }

  const ledger = await tx.query.walletLedgerEntries.findFirst({
    where: eq(walletLedgerEntries.id, transaction.walletLedgerEntryId),
  });
  if (!ledger) {
    return;
  }

  const status = normalizeLipilaStatus(payload.status);
  if (status === "successful") {
    const postedAt = new Date();
    if (ledger.status === "pending") {
      await tx
        .update(walletLedgerEntries)
        .set({
          status: "posted",
          reference: transaction.referenceId,
          note: "Mobile money wallet withdrawal completed",
          metadata: {
            ...(ledger.metadata && typeof ledger.metadata === "object" ? ledger.metadata : {}),
            lipilaReferenceId: transaction.referenceId,
            lipilaIdentifier: payload.identifier ?? transaction.identifier,
            lipilaExternalId: payload.externalId ?? transaction.externalId,
          },
          postedAt,
        })
        .where(eq(walletLedgerEntries.id, ledger.id));
    }

    if ((transaction.feeCents ?? 0) > 0) {
      await tx
        .insert(expenses)
        .values({
          organizationId: ledger.organizationId,
          branchId: ledger.branchId,
          expenseType: "charge",
          chargeType: "wallet_withdrawal_fee",
          amountCents: transaction.feeCents ?? 0,
          currency: ledger.currency,
          description: "Lipila mobile money withdrawal fee (Aura Pay)",
          expenseDate: postedAt,
          sourceRef: transaction.referenceId,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({
          target: [expenses.organizationId, expenses.chargeType, expenses.sourceRef],
        });
    }
    return;
  }

  if (status === "failed" && ledger.status === "pending") {
    await tx
      .update(walletLedgerEntries)
      .set({
        status: "failed",
        reference: transaction.referenceId,
        note: payload.message ?? "Mobile money wallet withdrawal failed",
        metadata: {
          ...(ledger.metadata && typeof ledger.metadata === "object" ? ledger.metadata : {}),
          lipilaReferenceId: transaction.referenceId,
          lipilaMessage: payload.message ?? transaction.message,
          refundedAt: new Date().toISOString(),
        },
      })
      .where(eq(walletLedgerEntries.id, ledger.id));

    await tx
      .update(walletAccounts)
      .set({
        balanceCents: sql`${walletAccounts.balanceCents} + ${Math.abs(ledger.amountCents)}`,
        updatedAt: new Date(),
      })
      .where(eq(walletAccounts.id, ledger.walletId));
  }
}

export async function processLipilaPaymentCallback(payload: LipilaPaymentCallbackInput) {
  const referenceId = payload.referenceId?.trim();
  if (!referenceId) {
    throw new Error("Lipila referenceId is required.");
  }

  const status = normalizeLipilaStatus(payload.status);

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('lipila-payment|' || ${referenceId}::text))`);

    const transaction = await tx.query.lipilaPaymentTransactions.findFirst({
      where: eq(lipilaPaymentTransactions.referenceId, referenceId),
    });
    if (!transaction) {
      throw new Error("Lipila transaction not found.");
    }

    const [updated] = await tx
      .update(lipilaPaymentTransactions)
      .set({
        identifier: payload.identifier ?? transaction.identifier,
        externalId: payload.externalId ?? transaction.externalId,
        status,
        amountCents: centsFromLipilaAmount(payload.amount, transaction.amountCents),
        currency: payload.currency ?? transaction.currency,
        message: payload.message ?? transaction.message,
        rawPayload: payload,
        updatedAt: new Date(),
      })
      .where(eq(lipilaPaymentTransactions.id, transaction.id))
      .returning();

    const current = updated ?? transaction;
    if (current.operation === "sale_collection") {
      if (status === "successful") {
        await finalizeSaleCollection(tx, current, payload);
      } else if (status === "failed") {
        await markSalePaymentFailed(tx, current, payload.message ?? null);
      }
    } else if (current.operation === "wallet_disbursement") {
      await finalizeWalletDisbursement(tx, current, payload);
    }

    return current;
  });
}

export async function getLipilaPaymentTransactionForOrg(organizationId: string, referenceId: string) {
  return db.query.lipilaPaymentTransactions.findFirst({
    where: and(
      eq(lipilaPaymentTransactions.organizationId, organizationId),
      eq(lipilaPaymentTransactions.referenceId, referenceId),
    ),
  });
}
