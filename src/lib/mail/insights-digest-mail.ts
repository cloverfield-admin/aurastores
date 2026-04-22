import { sendMailViaMailgunSmtp } from "@/lib/mail/mailgun-smtp";
import type { InsightsOverviewData } from "@/lib/repositories/insights/insights.repository";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

export async function sendInsightsSampleDigestEmail(params: {
  to: string;
  organizationName: string;
  overview: InsightsOverviewData;
}): Promise<void> {
  const org = escapeHtml(params.organizationName);
  const email = escapeHtml(params.to);
  const { overview } = params;

  const subject = `Aura Insights sample digest — ${params.organizationName}`;

  const topReorders = overview.forecast.items
    .filter((i) => i.suggestedOrderUnits > 0)
    .sort((a, b) => b.estimatedOrderValueCents - a.estimatedOrderValueCents)
    .slice(0, 5);

  const text = [
    `Aura Insights — Sample Digest`,
    `Organization: ${params.organizationName}`,
    "",
    `Revenue (30d): ${money.format(overview.kpis.revenueCents30d / 100)}`,
    `Units sold (30d): ${overview.kpis.unitsSold30d}`,
    `Sales count (30d): ${overview.kpis.salesCount30d}`,
    "",
    `Near-expiry at risk (retail): ${money.format(overview.riskToRevenue.nearExpiry.estimatedRetailValueCents / 100)}`,
    `Lost sales risk (30d est.): ${money.format(overview.riskToRevenue.lowStock.estimatedLostRevenueCentsNext30d / 100)}`,
    "",
    `Top reorder suggestions:`,
    ...(topReorders.length
      ? topReorders.map(
          (i) =>
            `- ${i.productName} (${i.sku}): order ${i.suggestedOrderUnits} units (est. ${money.format(
              i.estimatedOrderValueCents / 100,
            )})`,
        )
      : ["- None (not enough data / healthy cover)"]),
    "",
    "Note: This is a sample email to validate delivery; scheduling is coming soon.",
    "",
    "— AuraPharma",
  ].join("\n");

  const topReordersHtml = topReorders.length
    ? topReorders
        .map((i) => {
          const name = escapeHtml(i.productName);
          const sku = escapeHtml(i.sku);
          return `<tr>
  <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
    <div style="font-weight:800;color:#111827;">${name}</div>
    <div style="font-size:12px;color:#6b7280;">${sku} · ${escapeHtml(i.categoryName)}</div>
  </td>
  <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:800;color:#0d9488;">
    ${i.suggestedOrderUnits}
  </td>
  <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#4b5563;">
    ${escapeHtml(money.format(i.estimatedOrderValueCents / 100))}
  </td>
</tr>`;
        })
        .join("")
    : `<tr><td colspan="3" style="padding:12px;color:#6b7280;">No reorder suggestions yet.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aura Insights sample digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f9fb;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    AuraPharma Insights sample digest — ${org}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f7f9fb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="width:100%;max-width:640px;">
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,#0fb9b1,#6366f1);border-radius:12px 12px 0 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;box-shadow:0 24px 48px -16px rgba(15,23,42,0.08);">
              <div style="padding:28px 28px 10px 28px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 10px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                        <tr>
                          <td align="center" valign="middle" style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0fb9b1,#6063ee);background-color:#0fb9b1;">
                            <span style="font-size:22px;line-height:44px;color:#ffffff;">&#128138;</span>
                          </td>
                          <td style="padding-left:12px;">
                            <div style="font-size:20px;font-weight:900;letter-spacing:-0.02em;line-height:1.1;">
                              <span style="color:#0d9488;">Aura</span><span style="color:#4f46e5;">Pharma</span>
                            </div>
                            <div style="margin-top:4px;font-size:11px;font-weight:700;letter-spacing:0.10em;text-transform:uppercase;color:#475569;">
                              Clinical Intelligence
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">
                  Aura Insights
                </div>
                <h1 style="margin:10px 0 6px 0;font-size:22px;font-weight:900;color:#0f172a;">
                  Sample digest
                </h1>
                <div style="font-size:13px;color:#64748b;">
                  Organization: <strong style="color:#0f172a;">${org}</strong><br/>
                  Recipient: <strong style="color:#0f172a;">${email}</strong>
                </div>
              </div>

              <div style="padding:0 28px 22px 28px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:14px 14px;border:1px solid #e5e7eb;border-radius:12px;" colspan="2">
                      <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">KPIs (30d)</div>
                      <div style="margin-top:10px;display:block;">
                        <div style="font-size:16px;font-weight:900;color:#0f172a;">Revenue: ${escapeHtml(
                          money.format(overview.kpis.revenueCents30d / 100),
                        )}</div>
                        <div style="font-size:13px;color:#475569;margin-top:4px;">Units: ${overview.kpis.unitsSold30d} · Sales: ${overview.kpis.salesCount30d}</div>
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="height:14px;"></div>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:14px 14px;border:1px solid #e5e7eb;border-radius:12px;">
                      <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Risk to revenue</div>
                      <div style="margin-top:10px;font-size:13px;color:#475569;">
                        Near-expiry (retail): <strong style="color:#0f172a;">${escapeHtml(
                          money.format(overview.riskToRevenue.nearExpiry.estimatedRetailValueCents / 100),
                        )}</strong><br/>
                        Lost sales (30d est.): <strong style="color:#0f172a;">${escapeHtml(
                          money.format(overview.riskToRevenue.lowStock.estimatedLostRevenueCentsNext30d / 100),
                        )}</strong>
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="height:14px;"></div>

                <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin:8px 0 10px 0;">
                  Top reorder suggestions
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#475569;">Product</th>
                      <th style="padding:10px 12px;text-align:right;font-size:12px;color:#475569;">Order units</th>
                      <th style="padding:10px 12px;text-align:right;font-size:12px;color:#475569;">Est. value</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topReordersHtml}
                  </tbody>
                </table>

                <div style="margin-top:18px;font-size:12px;color:#94a3b8;line-height:1.6;">
                  This is a sample email to validate delivery. Scheduled digests are coming soon.
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 10px 0 10px;text-align:center;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#94a3b8;">
              &copy; ${new Date().getFullYear()} AuraPharma · Pharmacy management with clarity
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendMailViaMailgunSmtp({
    to: params.to,
    subject,
    text,
    html,
  });
}

