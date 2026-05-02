import { NextResponse } from "next/server";
import { sql, and, eq, desc } from "drizzle-orm";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { db } from "@/lib/db";
import { branches, patients, productCategories, products, saleItems, sales } from "@/lib/db/schema";
import { services } from "@/lib/di";

type ExportFormat = "csv" | "xlsx" | "pdf";

function parseIsoDateParam(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toIsoDateUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function differenceInDaysInclusiveUtc(start: Date, end: Date) {
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

const MAX_RANGE_DAYS = 93;

function csvEscape(value: unknown) {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

function makeCsv(rows: Array<Record<string, unknown>>, columns: string[]) {
  const header = columns.map(csvEscape).join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c])).join(","));
  return [header, ...lines].join("\n");
}

function formatCurrencyZmw(cents: number) {
  return (cents / 100).toFixed(2);
}

export async function GET(request: Request) {
  const gate = await requireAppApiCapability("sales");
  if (!gate.ok) return gate.response;
  const context = gate.context;

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const formatParam = (url.searchParams.get("format") ?? "csv").toLowerCase();

  const format: ExportFormat =
    formatParam === "xlsx" || formatParam === "pdf" || formatParam === "csv" ? formatParam : "csv";

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

  const parsedStart = parseIsoDateParam(startParam);
  const parsedEnd = parseIsoDateParam(endParam);
  if ((startParam && !parsedStart) || (endParam && !parsedEnd)) {
    return NextResponse.json(
      {
        error: "Invalid date filter. Use YYYY-MM-DD for start and end.",
      },
      { status: 400 },
    );
  }

  const defaultEnd = startOfTodayUtc();
  const defaultStart = addDaysUtc(defaultEnd, -29);
  const startInclusive = parsedStart ?? defaultStart;
  const endInclusive = parsedEnd ?? defaultEnd;

  if (startInclusive.getTime() > endInclusive.getTime()) {
    return NextResponse.json(
      {
        error: "Start date must be before or equal to end date.",
      },
      { status: 400 },
    );
  }

  const rangeDays = differenceInDaysInclusiveUtc(startInclusive, endInclusive);
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      {
        error: `Date range too large. Maximum is ${MAX_RANGE_DAYS} days.`,
      },
      { status: 400 },
    );
  }

  const range = { start: startInclusive, end: endInclusive };
  const dashboard = await services.sales.getDashboard(context, branchId, range);
  const resolvedBranchId = dashboard.branch.id;

  const endExclusive = addDaysUtc(new Date(Date.UTC(endInclusive.getUTCFullYear(), endInclusive.getUTCMonth(), endInclusive.getUTCDate())), 1);
  const startIso = startInclusive.toISOString();
  const endExclusiveIso = endExclusive.toISOString();

  const lineRows = await db
    .select({
      createdAt: sales.createdAt,
      saleNumber: sales.saleNumber,
      patientName: patients.fullName,
      branchName: branches.name,
      productName: products.name,
      categoryName: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
      quantity: saleItems.quantity,
      unitPriceCents: saleItems.unitPriceCents,
      lineTotalCents: saleItems.lineTotalCents,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(branches, eq(sales.branchId, branches.id))
    .leftJoin(patients, eq(sales.patientId, patients.id))
    .leftJoin(products, eq(saleItems.productId, products.id))
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(
      and(
        eq(sales.organizationId, context.organization.id),
        eq(sales.branchId, resolvedBranchId),
        eq(sales.status, "completed"),
        sql`${sales.createdAt} >= ${startIso}::timestamptz`,
        sql`${sales.createdAt} < ${endExclusiveIso}::timestamptz`,
      ),
    )
    .orderBy(desc(sales.createdAt));

  const lineItems = lineRows.map((row) => {
    const created = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
    return {
      date: created.toISOString(),
      branch: row.branchName,
      saleNumber: row.saleNumber,
      patient: row.patientName ?? "Walk-in Customer",
      product: row.productName ?? "Unknown product",
      category: row.categoryName,
      quantity: row.quantity,
      unitPriceZMW: formatCurrencyZmw(row.unitPriceCents),
      lineTotalZMW: formatCurrencyZmw(row.lineTotalCents),
    };
  });

  const categorySummaryMap = new Map<string, { category: string; lineCount: number; quantity: number; revenueCents: number }>();
  for (const row of lineRows) {
    const category = row.categoryName;
    const current = categorySummaryMap.get(category) ?? { category, lineCount: 0, quantity: 0, revenueCents: 0 };
    current.lineCount += 1;
    current.quantity += row.quantity ?? 0;
    current.revenueCents += row.lineTotalCents ?? 0;
    categorySummaryMap.set(category, current);
  }
  const categorySummary = Array.from(categorySummaryMap.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .map((row) => ({
      category: row.category,
      lineCount: row.lineCount,
      quantity: row.quantity,
      revenueZMW: formatCurrencyZmw(row.revenueCents),
    }));

  const baseName = `sales_${dashboard.branch.name.replaceAll(/\s+/g, "_").toLowerCase()}_${toIsoDateUtc(
    startInclusive,
  )}_to_${toIsoDateUtc(endInclusive)}`;

  if (format === "csv") {
    const csv = makeCsv(lineItems, [
      "date",
      "branch",
      "saleNumber",
      "patient",
      "product",
      "category",
      "quantity",
      "unitPriceZMW",
      "lineTotalZMW",
    ]);
    const body = new TextEncoder().encode(csv);
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const lineSheet = XLSX.utils.json_to_sheet(lineItems);
    XLSX.utils.book_append_sheet(wb, lineSheet, "Line_Items");

    const categorySheet = XLSX.utils.json_to_sheet(categorySummary);
    XLSX.utils.book_append_sheet(wb, categorySheet, "Category_Summary");

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Branch", dashboard.branch.name],
      ["Start", toIsoDateUtc(startInclusive)],
      ["End", toIsoDateUtc(endInclusive)],
      [],
      ["TotalRevenueZMW", formatCurrencyZmw(dashboard.metrics.totalRevenueCents)],
      ["TotalOrders", dashboard.metrics.totalSalesCount],
      ["UnitsSold", dashboard.metrics.unitsSoldLast30Days],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
    const body = new Uint8Array(out).buffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  }

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 760;
  const lineHeight = 14;
  const left = 48;

  const drawText = (text: string, opts?: { bold?: boolean; size?: number; color?: { r: number; g: number; b: number } }) => {
    const size = opts?.size ?? 12;
    const f = opts?.bold ? bold : font;
    const c = opts?.color ?? { r: 0.1, g: 0.1, b: 0.1 };
    page.drawText(text, { x: left, y, size, font: f, color: rgb(c.r, c.g, c.b) });
    y -= lineHeight;
  };

  drawText("Sales Export", { bold: true, size: 18 });
  y -= 4;
  drawText(`Branch: ${dashboard.branch.name}`, { bold: true });
  drawText(`Range: ${toIsoDateUtc(startInclusive)} to ${toIsoDateUtc(endInclusive)} (${rangeDays} days)`);
  y -= 8;
  drawText(`Total revenue (ZMW): ${formatCurrencyZmw(dashboard.metrics.totalRevenueCents)}`);
  drawText(`Total orders: ${dashboard.metrics.totalSalesCount}`);
  drawText(`Units sold: ${dashboard.metrics.unitsSoldLast30Days}`);
  y -= 10;
  drawText("Revenue by category (ZMW)", { bold: true });

  for (const row of categorySummary.slice(0, 18)) {
    drawText(`${row.category}: ${row.revenueZMW}`);
    if (y < 72) break;
  }

  const pdfBytes = await pdfDoc.save();
  const body = new Uint8Array(pdfBytes).buffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
    },
  });
}

