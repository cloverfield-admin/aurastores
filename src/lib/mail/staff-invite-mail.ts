import { sendMailViaMailgunSmtp } from "@/lib/mail/mailgun-smtp";
import { ROUTES } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type StaffInviteMailParams = {
  to: string;
  /** Pharmacy / organization display name */
  organizationName: string;
  inviteeFullName: string;
  temporaryPassword: string;
};

export async function sendStaffInviteCredentialsEmail(params: StaffInviteMailParams): Promise<void> {
  const origin = getSiteUrl();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  }
  const signInUrl = `${siteUrl}${ROUTES.auth.signIn}`;
  const org = escapeHtml(params.organizationName);
  const name = escapeHtml(params.inviteeFullName);
  const email = escapeHtml(params.to);
  const password = escapeHtml(params.temporaryPassword);
  const signInHref = escapeHtml(signInUrl);
  const preheader = escapeHtml(
    `${params.organizationName} invited you to AuraPharma — open this email for your sign-in details.`,
  );

  const subject = `You have been invited to join ${params.organizationName} on AuraPharma`;

  const text = [
    `Hi ${params.inviteeFullName},`,
    "",
    `${params.organizationName} has invited you to AuraPharma as a team member.`,
    "",
    `Sign in at: ${signInUrl}`,
    `Email: ${params.to}`,
    `Temporary password: ${params.temporaryPassword}`,
    "",
    "For security, you will be asked to choose a new password after you sign in.",
    "",
    "— AuraPharma",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>You’ve been invited to AuraPharma</title>
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .aura-container { width: 100% !important; }
      .aura-pad { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f7f9fb;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${preheader}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f7f9fb;">
    <tr>
      <td align="center" style="padding:32px 16px;" class="aura-pad">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="aura-container" style="width:100%;max-width:600px;">

          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,#0fb9b1,#6366f1);background-color:#0fb9b1;border-radius:12px 12px 0 0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;box-shadow:0 24px 48px -16px rgba(15,23,42,0.08);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:40px 40px 8px 40px;" class="aura-pad">

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 20px auto;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px auto;">
                            <tr>
                              <td align="center" valign="middle" bgcolor="#0fb9b1" style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#0fb9b1,#6063ee);background-color:#0fb9b1;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                                <span style="font-size:26px;line-height:56px;color:#ffffff;">&#128138;</span>
                              </td>
                            </tr>
                          </table>
                          <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;text-align:center;">
                            <span style="color:#0d9488;">Aura</span><span style="color:#4f46e5;">Pharma</span>
                          </div>
                          <div style="margin-top:6px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#3c4948;text-align:center;">
                            Clarity around every prescription
                          </div>
                        </td>
                      </tr>
                    </table>

                    <h1 style="margin:28px 0 12px 0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#111827;line-height:1.3;text-align:center;">
                      You have been invited
                    </h1>
                    <p style="margin:0 0 8px 0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4b5563;text-align:center;">
                      Hi ${name},
                    </p>
                    <p style="margin:0 0 20px 0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4b5563;text-align:center;">
                      <strong style="color:#111827;">${org}</strong> has invited you to join their team on AuraPharma. Sign in with the button below using your temporary password, then choose a new password before using the dashboard.
                    </p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 24px auto;">
                      <tr>
                        <td align="center" bgcolor="#0d9488" style="border-radius:10px;background:linear-gradient(135deg,#0fb9b1,#0d9488);background-color:#0d9488;">
                          <a href="${signInHref}" style="display:inline-block;padding:14px 28px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                            Sign in to AuraPharma
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <tr>
                        <td style="padding:18px 20px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#4b5563;">
                          <div style="margin-bottom:10px;"><span style="color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.04em;">Email</span><br /><span style="font-size:15px;color:#111827;word-break:break-all;">${email}</span></div>
                          <div><span style="color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.04em;">Temporary password</span><br /><span style="font-size:15px;color:#111827;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;word-break:break-all;">${password}</span></div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 32px 40px;" class="aura-pad">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e5e7eb;">
                      <tr>
                        <td style="padding-top:20px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                          If you did not expect this invitation, you can ignore this message.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 8px 0 8px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:#9ca3af;text-align:center;">
              &copy; AuraPharma. Pharmacy management with clarity.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendMailViaMailgunSmtp({ to: params.to, subject, text, html });
}
