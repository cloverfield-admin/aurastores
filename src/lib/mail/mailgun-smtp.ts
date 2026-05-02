import nodemailer from "nodemailer";

export type SendSmtpMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailgunSmtpConfig = {
  user: string;
  pass: string;
  host: string;
  port: number;
  from: string;
};

/**
 * Reads Mailgun SMTP settings from the environment (same credentials as in the Mailgun dashboard).
 * `MAILGUN_FROM` is optional; defaults to `MAILGUN_SMTP_USERNAME`.
 */
export function getMailgunSmtpConfig(): MailgunSmtpConfig | null {
  const user = process.env.MAILGUN_SMTP_USERNAME?.trim();
  const pass = process.env.MAILGUN_SMTP_PASSWORD?.trim();
  if (!user || !pass) {
    return null;
  }
  const host = process.env.MAILGUN_SMTP_HOST?.trim() || "smtp.mailgun.org";
  const port = Number(process.env.MAILGUN_SMTP_PORT?.trim() || "587");
  const from = process.env.MAILGUN_FROM?.trim() || user;
  return { user, pass, host, port, from };
}

export async function sendMailViaMailgunSmtp(input: SendSmtpMailInput): Promise<void> {
  const cfg = getMailgunSmtpConfig();
  if (!cfg) {
    throw new Error(
      "Mailgun SMTP is not configured. Set MAILGUN_SMTP_USERNAME and MAILGUN_SMTP_PASSWORD.",
    );
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transport.sendMail({
    from: cfg.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
