import { NextResponse } from "next/server";
import { withIdempotentMutation } from "@/lib/api/idempotency";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { createSaleSchema } from "@/lib/validation/sales";

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
  const gate = await requireAppApiCapability("sales");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");

  if ((startParam && !endParam) || (!startParam && endParam)) {
    return NextResponse.json(
      {
        error: "Both start and end dates are required when filtering.",
      },
      { status: 400 },
    );
  }

  const startDate = parseIsoDateParam(startParam);
  const endDate = parseIsoDateParam(endParam);
  if ((startParam && !startDate) || (endParam && !endDate)) {
    return NextResponse.json(
      {
        error: "Invalid date filter. Use YYYY-MM-DD for start and end.",
      },
      { status: 400 },
    );
  }

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    return NextResponse.json(
      {
        error: "Start date must be before or equal to end date.",
      },
      { status: 400 },
    );
  }

  if (startDate && endDate) {
    const rangeDays = differenceInDaysInclusiveUtc(startDate, endDate);
    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        {
          error: `Date range too large. Maximum is ${MAX_RANGE_DAYS} days.`,
        },
        { status: 400 },
      );
    }
  }

  const range = startDate && endDate ? { start: startDate, end: endDate } : undefined;
  const dashboard = await services.sales.getDashboard(context, branchId, range);
  return NextResponse.json(dashboard);
}

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("sales");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const body = await request.json().catch(() => null);
  const parsed = createSaleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid sale payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  return withIdempotentMutation(request, context.organization.id, "sales:create", parsed.data, async () => {
    try {
      const sale = await services.sales.createSale(context, parsed.data);
      return { status: 201, body: sale };
    } catch (error) {
      return {
        status: 400,
        body: {
          error: error instanceof Error ? error.message : "Unable to create sale.",
        },
      };
    }
  });
}
