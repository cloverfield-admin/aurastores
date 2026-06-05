import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, expenses } from "@/lib/db/schema";
import type {
  CreateExpenseInput,
  ExpensesDashboardData,
  ExpensesDashboardInput,
  ExpensesDateRange,
  ExpensesRepository,
  ExpenseType,
} from "./expenses.repository";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { filterBranchesForContext } from "@/lib/rbac/branch-access";

type ResolvedBranch = typeof branches.$inferSelect;

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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function pickResolvedBranch(context: AuthContext, preferredBranchId: string | undefined, availableBranches: ResolvedBranch[]) {
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

async function branchesVisibleInContext(context: AuthContext) {
  const allBranches = await db.query.branches.findMany({
    where: eq(branches.organizationId, context.organization.id),
    orderBy: [asc(branches.name)],
  });

  return filterBranchesForContext(context, allBranches);
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

function expenseTimestampRangeConditions(range?: ExpensesDateRange): SQL[] {
  const endInclusive = normalizeDate(range?.end ?? startOfTodayUtc());
  const startInclusive = normalizeDate(range?.start ?? addDaysUtc(endInclusive, -29));
  const endExclusive = addDaysUtc(endInclusive, 1);

  return [
    sql`${expenses.expenseDate} >= ${startInclusive.toISOString()}::timestamptz`,
    sql`${expenses.expenseDate} < ${endExclusive.toISOString()}::timestamptz`,
  ];
}

function dashboardConditions(
  organizationId: string,
  branchId: string,
  range?: ExpensesDateRange,
  type?: ExpenseType,
) {
  const conditions: SQL[] = [
    eq(expenses.organizationId, organizationId),
    eq(expenses.branchId, branchId),
    ...expenseTimestampRangeConditions(range),
  ];

  if (type) {
    conditions.push(eq(expenses.expenseType, type));
  }

  return conditions;
}

function toIsoDateUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export class ExpensesRepositoryImpl implements ExpensesRepository {
  async getDashboard(context: AuthContext, input: ExpensesDashboardInput): Promise<ExpensesDashboardData> {
    const { branch, branchOptions } = await resolveBranchContext(context, input.branchId);
    const page = clampPage(input.page);
    const pageSize = clampPageSize(input.pageSize);
    const offset = (page - 1) * pageSize;
    const conditions = dashboardConditions(context.organization.id, branch.id, input.range, input.type);
    const unfilteredConditions = dashboardConditions(context.organization.id, branch.id, input.range);

    const endInclusive = normalizeDate(input.range?.end ?? startOfTodayUtc());
    const startInclusive = normalizeDate(input.range?.start ?? addDaysUtc(endInclusive, -29));
    const endExclusive = addDaysUtc(endInclusive, 1);

    const [totalRows, totalsRows, byTypeRows, dayRows, expenseRows] = await Promise.all([
      db.select({ value: count() }).from(expenses).where(and(...conditions)),
      db
        .select({
          totalCents: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        })
        .from(expenses)
        .where(and(...unfilteredConditions)),
      db
        .select({
          expenseType: expenses.expenseType,
          amountCents: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        })
        .from(expenses)
        .where(and(...unfilteredConditions))
        .groupBy(expenses.expenseType),
      db
        .select({
          day: sql<string>`date_trunc('day', ${expenses.expenseDate})::timestamptz`,
          expenseType: expenses.expenseType,
          amountCents: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, context.organization.id),
            eq(expenses.branchId, branch.id),
            sql`${expenses.expenseDate} >= ${startInclusive.toISOString()}::timestamptz`,
            sql`${expenses.expenseDate} < ${endExclusive.toISOString()}::timestamptz`,
          ),
        )
        .groupBy(sql`date_trunc('day', ${expenses.expenseDate})`, expenses.expenseType)
        .orderBy(asc(sql`date_trunc('day', ${expenses.expenseDate})`)),
      db
        .select({
          id: expenses.id,
          expenseType: expenses.expenseType,
          chargeType: expenses.chargeType,
          amountCents: expenses.amountCents,
          currency: expenses.currency,
          description: expenses.description,
          expenseDate: expenses.expenseDate,
          sourceRef: expenses.sourceRef,
          createdAt: expenses.createdAt,
        })
        .from(expenses)
        .where(and(...conditions))
        .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalRows[0]?.value ?? 0);
    const byType: Record<ExpenseType, number> = {
      general: 0,
      restocking: 0,
      charge: 0,
    };
    for (const row of byTypeRows) {
      byType[row.expenseType] = row.amountCents;
    }

    const dayMap = new Map<string, { general: number; restocking: number; charge: number }>();
    for (const row of dayRows) {
      const dateKey = toIsoDateUtc(new Date(row.day));
      const current = dayMap.get(dateKey) ?? { general: 0, restocking: 0, charge: 0 };
      current[row.expenseType] = row.amountCents;
      dayMap.set(dateKey, current);
    }

    const series: ExpensesDashboardData["series"] = [];
    for (let cursor = new Date(startInclusive); cursor < endExclusive; cursor = addDaysUtc(cursor, 1)) {
      const dateKey = toIsoDateUtc(cursor);
      const day = dayMap.get(dateKey) ?? { general: 0, restocking: 0, charge: 0 };
      const totalCents = day.general + day.restocking + day.charge;
      series.push({
        date: dateKey,
        totalCents,
        generalCents: day.general,
        restockingCents: day.restocking,
        chargeCents: day.charge,
      });
    }

    return {
      branch: {
        id: branch.id,
        name: branch.name,
      },
      branches: branchOptions.map((b) => ({
        id: b.id,
        name: b.name,
        isPrimary: b.isPrimary,
      })),
      totals: {
        totalCents: totalsRows[0]?.totalCents ?? 0,
        byType,
      },
      series,
      expenses: expenseRows.map((row) => ({
        id: row.id,
        expenseType: row.expenseType,
        chargeType: row.chargeType,
        amountCents: row.amountCents,
        currency: row.currency,
        description: row.description,
        expenseDate: row.expenseDate.toISOString(),
        sourceRef: row.sourceRef ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async createExpense(context: AuthContext, input: CreateExpenseInput): Promise<{ id: string }> {
    const { branch } = await resolveBranchContext(context, input.branchId);

    const [created] = await db
      .insert(expenses)
      .values({
        organizationId: context.organization.id,
        branchId: branch.id,
        expenseType: input.expenseType,
        amountCents: Math.max(0, Math.floor(input.amountCents)),
        currency: input.currency?.trim() || "ZMW",
        description: input.description.trim(),
        expenseDate: input.expenseDate,
        updatedAt: new Date(),
      })
      .returning({ id: expenses.id });

    if (!created) {
      throw new Error("Unable to create expense.");
    }

    return created;
  }

  async deleteExpense(context: AuthContext, expenseId: string): Promise<void> {
    const [deleted] = await db
      .delete(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.organizationId, context.organization.id)))
      .returning({ id: expenses.id });

    if (!deleted) {
      throw new Error("Expense not found.");
    }
  }
}

export const expensesRepository = new ExpensesRepositoryImpl();

