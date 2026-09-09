import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env } from '../config/env';
import { logger } from '../config/logger';

const from = env.smtpFrom;
const outboxDir = path.resolve(__dirname, '../../data');
const outboxFile = path.join(outboxDir, 'email-outbox.jsonl');

function createTransport() {
  if (!env.smtpHost) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const port = env.smtpPort;
  const secure = env.smtpSecure || port === 465;
  const options: SMTPTransport.Options = {
    host: env.smtpHost,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: {
      servername: env.smtpHost,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: !env.smtpTlsInsecure,
    },
  };
  return nodemailer.createTransport(options);
}

const transport = createTransport();

export function emailsDeliveredViaSmtp(): boolean {
  return Boolean(env.resendApiKey || env.smtpHost);
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.smtpFrom,
      to: [to],
      subject,
      html,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!res.ok) {
    throw new Error(body.message || body.name || `Resend HTTP ${res.status}`);
  }
  logger.info('Email sent via Resend API', { to, subject, messageId: body.id });
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    if (env.resendApiKey) {
      await sendViaResend(to, subject, html);
      return;
    }

    const info = await transport.sendMail({ from, to, subject, html });
    if (!env.smtpHost) {
      await fs.mkdir(outboxDir, { recursive: true });
      await fs.appendFile(
        outboxFile,
        `${JSON.stringify({ at: new Date().toISOString(), to, subject, html })}\n`,
        'utf8',
      );
      logger.info('Email captured locally (SMTP not configured). Use the on-screen verification link.', {
        to,
        subject,
        outbox: outboxFile,
      });
      return;
    }
    logger.info('Email sent', { to, subject, messageId: info.messageId });
  } catch (error) {
    logger.error('SMTP send failed', {
      to,
      subject,
      host: env.resendApiKey ? 'api.resend.com' : env.smtpHost,
      port: env.resendApiKey ? 443 : env.smtpPort,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;background:#ffffff;padding:24px;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-top:6px solid #00a651;border-radius:16px;padding:32px;">
      <p style="color:#00a651;font-weight:800;font-size:20px;margin:0 0 16px;">Sheettomate</p>
      <h1 style="font-size:22px;margin:0 0 12px;color:#121722;">${title}</h1>
      ${body}
      <p style="margin-top:28px;font-size:12px;color:#78716c;">Liberia &amp; West Africa · Excel &amp; Google Sheets</p>
    </div>
  </body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name: string, verifyUrl: string): Promise<void> {
  await sendMail(
    to,
    'Welcome to Sheettomate — verify your email',
    layout(
      `Welcome, ${name}`,
      `<p>Thanks for joining Sheettomate. Confirm your email to buy templates, enroll in courses, and use the AI builder.</p>
       <p><a href="${verifyUrl}" style="display:inline-block;background:#00a651;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700;">Verify email</a></p>
       <p style="font-size:13px;color:#57534e;">If the button does not work, paste this link:<br/>${verifyUrl}</p>`,
    ),
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendMail(
    to,
    'Reset your Sheettomate password',
    layout(
      'Password reset',
      `<p>We received a request to reset your password. This link expires in 1 hour.</p>
       <p><a href="${resetUrl}" style="display:inline-block;background:#00a651;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700;">Reset password</a></p>
       <p style="font-size:13px;color:#57534e;">If you did not request this, you can ignore this email.</p>`,
    ),
  );
}

export async function sendPurchaseConfirmationEmail(
  to: string,
  name: string,
  templateTitle: string,
  amount: string,
  currency: string,
): Promise<void> {
  const dashboardUrl = `${env.clientOrigin.replace(/\/$/, '')}/dashboard`;
  const profileUrl = `${env.clientOrigin.replace(/\/$/, '')}/profile`;
  await sendMail(
    to,
    `Purchase confirmation: ${templateTitle}`,
    layout(
      'Thanks for your purchase',
      `<p>Hi ${name},</p>
       <p>We received your order for <strong>${templateTitle}</strong> (${amount} ${currency}).</p>
       <p>Your file is ready. Open your dashboard to download it anytime.</p>
       <p>
         <a href="${dashboardUrl}" style="display:inline-block;background:#00a651;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700;">
           Open dashboard
         </a>
       </p>
       <p style="font-size:13px;color:#57534e;">
         Or go to <a href="${profileUrl}" style="color:#00a651;">your profile</a> → Purchased templates.
       </p>`,
    ),
  );
}

export async function sendCourseEmail(
  to: string,
  subject: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  await sendMail(
    to,
    subject,
    layout(
      title,
      `<p>${body}</p>${
        link
          ? `<p><a href="${env.clientOrigin}${link}" style="display:inline-block;background:#00a651;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700;">Open Sheettomate Institute</a></p>`
          : ''
      }`,
    ),
  );
}

export async function sendHtmlEmail(to: string, subject: string, html: string): Promise<void> {
  await sendMail(to, subject, html);
}
