import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { createExpenseSchema } from "@/lib/validation/expenses";

function parseIsoDateParam(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function differenceInDaysInclusiveUtc(start: Date, end: Date) {
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

const MAX_RANGE_DAYS = 93;

export async function GET(request: Request) {
  const gate = await requireAppApiCapability("expenses");
  if (!gate.ok) {
    return gate.response;
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  const type = (url.searchParams.get("type") ?? undefined) as
    | "general"
    | "restocking"
    | "charge"
    | undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

  if ((startParam && !endParam) || (!startParam && endParam)) {
    return NextResponse.json({ error: "Both start and end dates are required when filtering." }, { status: 400 });
  }

  const startDate = parseIsoDateParam(startParam);
  const endDate = parseIsoDateParam(endParam);
  if ((startParam && !startDate) || (endParam && !endDate)) {
    return NextResponse.json({ error: "Invalid date filter. Use YYYY-MM-DD for start and end." }, { status: 400 });
  }

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    return NextResponse.json({ error: "Start date must be before or equal to end date." }, { status: 400 });
  }

  if (startDate && endDate) {
    const rangeDays = differenceInDaysInclusiveUtc(startDate, endDate);
    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: `Date range too large. Maximum is ${MAX_RANGE_DAYS} days.` }, { status: 400 });
    }
  }

  if (type && !["general", "restocking", "charge"].includes(type)) {
    return NextResponse.json({ error: "Invalid expense type filter." }, { status: 400 });
  }

  try {
    const dashboard = await services.expenses.getDashboard(gate.context, {
      branchId,
      range: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      type,
      page,
      pageSize,
    });
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load expenses." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("expenses");
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await services.expenses.createExpense(gate.context, {
      ...parsed.data,
      expenseDate: parsed.data.expenseDate,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create expense." },
      { status: 400 },
    );
  }
}

