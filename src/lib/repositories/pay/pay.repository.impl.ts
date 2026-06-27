import { and, asc, count, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { createLipilaGlobalWalletClient } from "@/lib/billing/lipila-client";
import { db } from "@/lib/db";
import {
  branches,
  lipilaPaymentTransactions,
  patients,
  payments,
  products,
  saleItems,
  sales,
  users,
  walletAccounts,
  walletLedgerEntries,
} from "@/lib/db/schema";
import { calculateDisbursementFee } from "@/lib/lipila/fees";
import { buildLipilaReference, maskAccountNumber } from "@/lib/lipila/utils";
import { processLipilaPaymentCallback } from "@/lib/lipila/payment-processing";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { filterBranchesForContext } from "@/lib/rbac/branch-access";
import type {
  ActivateWalletInput,
  PayDashboardData,
  PayDashboardInput,
  PayDateRange,
  PayPaymentMethod,
  PayRepository,
  PayTransactionDetailData,
  PayWalletData,
  WithdrawWalletInput,
} from "@/lib/repositories/pay/pay.repository";
import { getSiteUrl } from "@/lib/site-url";
import { normalizeLipilaStatus } from "@/lib/validation/lipila";

type ResolvedBranch = Pick<typeof branches.$inferSelect, "id" | "name" | "isPrimary">;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function clampPage(value: number | undefined) {
  if (!value || value < 1) return 1;
  return Math.floor(value);
}

function clampPageSize(value: number | undefined) {
  if (!value || value < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

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

function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

async function loadBranchesForOrg(organizationId: string) {
  return db.query.branches.findMany({
    columns: {
      id: true,
      name: true,
      isPrimary: true,
    },
    where: eq(branches.organizationId, organizationId),
    orderBy: (branchTable, { desc: orderDesc, asc: orderAsc }) => [
      orderDesc(branchTable.isPrimary),
      orderAsc(branchTable.name),
    ],
  });
}

async function branchesVisibleInContext(context: AuthContext) {
  const all = await loadBranchesForOrg(context.organization.id);
  return filterBranchesForContext(context, all);
}

function pickResolvedBranch(
  context: AuthContext,
  preferredBranchId: string | undefined,
  availableBranches: ResolvedBranch[],
) {
  const branch =
    (preferredBranchId
      ? availableBranches.find((candidate) => candidate.id === preferredBranchId) ?? null
      : null) ??
    (context.onboarding?.mainBranchId
      ? availableBranches.find((candidate) => candidate.id === context.onboarding?.mainBranchId) ?? null
      : null) ??
    availableBranches.find((candidate) => candidate.isPrimary) ??
    availableBranches[0];

  if (!branch) {
    throw new Error("No branch access assigned for your account.");
  }

  return branch;
}

async function resolveBranchContext(context: AuthContext, preferredBranchId?: string) {
  const branchOptions = await branchesVisibleInContext(context);
  if (!branchOptions.length) {
    throw new Error("No branch access assigned for your account.");
  }
  return {
    branch: pickResolvedBranch(context, preferredBranchId, branchOptions),
    branchOptions,
  };
}

function serializeWallet(wallet: typeof walletAccounts.$inferSelect): NonNullable<PayWalletData> {
  return {
    id: wallet.id,
    branchId: wallet.branchId,
    currency: wallet.currency,
    balanceCents: wallet.balanceCents,
    status: wallet.status,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

function paymentTimestampRangeConditions(range?: PayDateRange): SQL[] {
  const endInclusive = normalizeDate(range?.end ?? startOfTodayUtc());
  const startInclusive = normalizeDate(range?.start ?? addDaysUtc(endInclusive, -29));
  const endExclusive = addDaysUtc(endInclusive, 1);

  return [
    sql`coalesce(${payments.paidAt}, ${payments.createdAt}) >= ${startInclusive.toISOString()}::timestamptz`,
    sql`coalesce(${payments.paidAt}, ${payments.createdAt}) < ${endExclusive.toISOString()}::timestamptz`,
  ];
}

function dashboardConditions(
  organizationId: string,
  branchId: string,
  range?: PayDateRange,
  method?: PayPaymentMethod,
) {
  const conditions: SQL[] = [
    eq(payments.organizationId, organizationId),
    eq(payments.branchId, branchId),
    eq(sales.status, "completed"),
    ...paymentTimestampRangeConditions(range),
  ];

  if (method) {
    conditions.push(eq(payments.method, method));
  }

  return conditions;
}

export class PayRepositoryImpl implements PayRepository {
  async getDashboard(context: AuthContext, input: PayDashboardInput): Promise<PayDashboardData> {
    const { branch, branchOptions } = await resolveBranchContext(context, input.branchId);
    const page = clampPage(input.page);
    const pageSize = clampPageSize(input.pageSize);
    const offset = (page - 1) * pageSize;
    const conditions = dashboardConditions(context.organization.id, branch.id, input.range, input.method);
    const unfilteredConditions = dashboardConditions(context.organization.id, branch.id, input.range);

    const walletPromise = db.query.walletAccounts.findFirst({
      where: and(
        eq(walletAccounts.organizationId, context.organization.id),
        eq(walletAccounts.branchId, branch.id),
      ),
    });

    const [
      wallet,
      totalRows,
      metricsRows,
      methodRows,
      transactionRows,
      pendingWithdrawalRows,
      settlementRows,
    ] = await Promise.all([
      walletPromise,
      db
        .select({ value: count() })
        .from(payments)
        .innerJoin(sales, eq(payments.saleId, sales.id))
        .where(and(...conditions)),
      db
        .select({
          totalAmountCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
          totalCount: count(),
          averageTransactionCents: sql<number>`coalesce(round(avg(${payments.amountCents})), 0)::int`,
        })
        .from(payments)
        .innerJoin(sales, eq(payments.saleId, sales.id))
        .where(and(...conditions)),
      db
        .select({
          method: payments.method,
          count: count(),
          amountCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
        })
        .from(payments)
        .innerJoin(sales, eq(payments.saleId, sales.id))
        .where(and(...unfilteredConditions))
        .groupBy(payments.method)
        .orderBy(desc(sql`count(*)`)),
      db
        .select({
          id: payments.id,
          saleId: payments.saleId,
          saleNumber: sales.saleNumber,
          patientName: patients.fullName,
          method: payments.method,
          status: payments.status,
          reference: payments.reference,
          amountCents: payments.amountCents,
          currency: payments.currency,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
          itemCount: sql<number>`count(${saleItems.id})::int`,
        })
        .from(payments)
        .innerJoin(sales, eq(payments.saleId, sales.id))
        .leftJoin(patients, eq(sales.patientId, patients.id))
        .leftJoin(saleItems, eq(sales.id, saleItems.saleId))
        .where(and(...conditions))
        .groupBy(
          payments.id,
          payments.saleId,
          sales.saleNumber,
          patients.fullName,
          payments.method,
          payments.status,
          payments.reference,
          payments.amountCents,
          payments.currency,
          payments.paidAt,
          payments.createdAt,
        )
        .orderBy(desc(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`))
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          amountCents: sql<number>`coalesce(sum(abs(${walletLedgerEntries.amountCents})), 0)::int`,
        })
        .from(walletLedgerEntries)
        .where(
          and(
            eq(walletLedgerEntries.organizationId, context.organization.id),
            eq(walletLedgerEntries.branchId, branch.id),
            eq(walletLedgerEntries.entryType, "withdrawal"),
            eq(walletLedgerEntries.status, "pending"),
          ),
        ),
      db
        .select({
          amountCents: sql<number>`coalesce(sum(${walletLedgerEntries.amountCents}), 0)::int`,
        })
        .from(walletLedgerEntries)
        .where(
          and(
            eq(walletLedgerEntries.organizationId, context.organization.id),
            eq(walletLedgerEntries.branchId, branch.id),
            eq(walletLedgerEntries.entryType, "settlement"),
            eq(walletLedgerEntries.status, "posted"),
          ),
        ),
    ]);

    const total = totalRows[0]?.value ?? 0;
    const metrics = metricsRows[0] ?? {
      totalAmountCents: 0,
      totalCount: 0,
      averageTransactionCents: 0,
    };

    return {
      branch: {
        id: branch.id,
        name: branch.name,
      },
      branches: branchOptions.map((branchOption) => ({
        id: branchOption.id,
        name: branchOption.name,
        isPrimary: branchOption.isPrimary,
      })),
      wallet: wallet ? serializeWallet(wallet) : null,
      balance: {
        availableCents: wallet?.balanceCents ?? 0,
        pendingWithdrawalsCents: pendingWithdrawalRows[0]?.amountCents ?? 0,
        lifetimeSettlementsCents: settlementRows[0]?.amountCents ?? 0,
      },
      metrics: {
        totalAmountCents: metrics.totalAmountCents,
        totalCount: metrics.totalCount,
        averageTransactionCents: metrics.averageTransactionCents,
        byMethod: methodRows.map((row) => ({
          method: row.method,
          count: row.count,
          amountCents: row.amountCents,
        })),
      },
      transactions: transactionRows.map((row) => ({
        id: row.id,
        saleId: row.saleId,
        saleNumber: row.saleNumber,
        patientName: row.patientName,
        method: row.method,
        status: row.status,
        reference: row.reference,
        amountCents: row.amountCents,
        currency: row.currency,
        paidAt: row.paidAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        itemCount: row.itemCount,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async activateWallet(context: AuthContext, input: ActivateWalletInput): Promise<NonNullable<PayWalletData>> {
    const { branch } = await resolveBranchContext(context, input.branchId);

    await db
      .insert(walletAccounts)
      .values({
        organizationId: context.organization.id,
        branchId: branch.id,
        currency: "ZMW",
      })
      .onConflictDoNothing({
        target: [walletAccounts.organizationId, walletAccounts.branchId],
      });

    const wallet = await db.query.walletAccounts.findFirst({
      where: and(
        eq(walletAccounts.organizationId, context.organization.id),
        eq(walletAccounts.branchId, branch.id),
      ),
    });

    if (!wallet) {
      throw new Error("Unable to activate wallet.");
    }

    return serializeWallet(wallet);
  }

  async withdraw(context: AuthContext, input: WithdrawWalletInput): Promise<NonNullable<PayWalletData>> {
    const { branch } = await resolveBranchContext(context, input.branchId);

    if (input.amountCents <= 0) {
      throw new Error("Withdrawal amount must be greater than zero.");
    }

    const referenceId = input.reference?.trim() || buildLipilaReference("wallet_momo");
    const callbackUrl = `${getSiteUrl()}/api/v1/pay/lipila/callback`;
    const fee = calculateDisbursementFee({ payoutAmountCents: input.amountCents });
    const reservation = await db.transaction(async (tx) => {
      const [wallet] = await tx
        .update(walletAccounts)
        .set({
          balanceCents: sql`${walletAccounts.balanceCents} - ${fee.totalDebitCents}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(walletAccounts.organizationId, context.organization.id),
            eq(walletAccounts.branchId, branch.id),
            eq(walletAccounts.status, "active"),
            gte(walletAccounts.balanceCents, fee.totalDebitCents),
          ),
        )
        .returning();

      if (!wallet) {
        throw new Error("Insufficient available balance or inactive wallet.");
      }

      const [ledger] = await tx.insert(walletLedgerEntries).values({
        walletId: wallet.id,
        organizationId: context.organization.id,
        branchId: branch.id,
        entryType: "withdrawal",
        sourceMethod: "mobile_money",
        status: "pending",
        amountCents: -fee.totalDebitCents,
        currency: wallet.currency,
        reference: referenceId,
        mobileNumber: input.mobileNumber,
        note: "Pending mobile money wallet withdrawal",
        metadata: {
          requestedByUserId: context.user.id,
          lipilaReferenceId: referenceId,
          payoutAmountCents: fee.payoutAmountCents,
          feeCents: fee.feeCents,
          totalDebitCents: fee.totalDebitCents,
          feeBps: fee.feeBps,
        },
      }).returning();

      if (!ledger) {
        throw new Error("Unable to create withdrawal ledger entry.");
      }

      const lipilaPayload = {
        referenceId,
        amount: fee.payoutAmountCents / 100,
        narration: `Aura Pay withdrawal ${referenceId}`,
        accountNumber: input.mobileNumber,
        currency: wallet.currency,
      };

      await tx.insert(lipilaPaymentTransactions).values({
        organizationId: context.organization.id,
        walletLedgerEntryId: ledger.id,
        operation: "wallet_disbursement",
        referenceId,
        status: "pending",
        amountCents: fee.totalDebitCents,
        grossAmountCents: fee.payoutAmountCents,
        feeCents: fee.feeCents,
        netAmountCents: fee.netAmountCents,
        feeBps: fee.feeBps,
        feePayer: fee.feePayer,
        currency: wallet.currency,
        accountNumberMasked: maskAccountNumber(input.mobileNumber),
        rawPayload: lipilaPayload,
      });

      return {
        wallet: serializeWallet(wallet),
        lipilaPayload,
        fee,
      };
    });

    try {
      const lipila = createLipilaGlobalWalletClient();
      const result = await lipila.startMobileMoneyDisbursement(reservation.lipilaPayload, { callbackUrl });
      const providerStatus = normalizeLipilaStatus(result?.status);

      await db
        .update(lipilaPaymentTransactions)
        .set({
          identifier: result?.identifier ?? null,
          externalId: result?.externalId ?? null,
          status: providerStatus,
          message: result?.message ?? null,
          rawPayload: result,
          updatedAt: new Date(),
        })
        .where(eq(lipilaPaymentTransactions.referenceId, referenceId));

      if (providerStatus !== "pending") {
        await processLipilaPaymentCallback({
          ...result,
          referenceId,
        });
      }

      if (providerStatus === "failed") {
        throw new Error(result?.message ?? "Mobile money withdrawal failed.");
      }

      return reservation.wallet;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to issue mobile money withdrawal.";
      await processLipilaPaymentCallback({
        referenceId,
        status: "Failed",
        message,
      });
      throw new Error(message);
    }
  }

  async getTransactionDetail(context: AuthContext, paymentId: string): Promise<PayTransactionDetailData | null> {
    const paymentRows = await db
      .select({
        id: payments.id,
        saleId: payments.saleId,
        method: payments.method,
        status: payments.status,
        reference: payments.reference,
        amountCents: payments.amountCents,
        currency: payments.currency,
        paidAt: payments.paidAt,
        paymentCreatedAt: payments.createdAt,
        branchId: payments.branchId,
        saleNumber: sales.saleNumber,
        patientName: patients.fullName,
        patientPhone: patients.phone,
        servedByName: users.fullName,
        subtotalCents: sales.subtotalCents,
        taxCents: sales.taxCents,
        discountCents: sales.discountCents,
        totalCents: sales.totalCents,
        completedAt: sales.completedAt,
        saleCreatedAt: sales.createdAt,
      })
      .from(payments)
      .innerJoin(sales, eq(payments.saleId, sales.id))
      .leftJoin(patients, eq(sales.patientId, patients.id))
      .leftJoin(users, eq(sales.servedByUserId, users.id))
      .where(and(eq(payments.id, paymentId), eq(payments.organizationId, context.organization.id)))
      .limit(1);

    const payment = paymentRows[0];
    if (!payment) {
      return null;
    }

    if (context.allowedBranchIds && !context.allowedBranchIds.includes(payment.branchId)) {
      return null;
    }

    const itemRows = await db
      .select({
        id: saleItems.id,
        description: saleItems.description,
        quantity: saleItems.quantity,
        unitPriceCents: saleItems.unitPriceCents,
        lineTotalCents: saleItems.lineTotalCents,
        productName: products.name,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, payment.saleId))
      .orderBy(asc(saleItems.description));

    return {
      payment: {
        id: payment.id,
        saleId: payment.saleId,
        saleNumber: payment.saleNumber,
        method: payment.method,
        status: payment.status,
        reference: payment.reference,
        amountCents: payment.amountCents,
        currency: payment.currency,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.paymentCreatedAt.toISOString(),
      },
      sale: {
        id: payment.saleId,
        saleNumber: payment.saleNumber,
        patientName: payment.patientName,
        patientPhone: payment.patientPhone,
        servedByName: payment.servedByName,
        subtotalCents: payment.subtotalCents,
        taxCents: payment.taxCents,
        discountCents: payment.discountCents,
        totalCents: payment.totalCents,
        completedAt: payment.completedAt?.toISOString() ?? null,
        createdAt: payment.saleCreatedAt.toISOString(),
      },
      items: itemRows.map((row) => ({
        id: row.id,
        description: row.description,
        quantity: row.quantity,
        unitPriceCents: row.unitPriceCents,
        lineTotalCents: row.lineTotalCents,
        productName: row.productName,
      })),
    };
  }
}

export const payRepository: PayRepository = new PayRepositoryImpl();
