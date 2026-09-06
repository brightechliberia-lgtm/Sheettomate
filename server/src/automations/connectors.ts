import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { sendHtmlEmail } from '../services/emailService';

export type ConnectorResult = { connector: string; ok: boolean; detail: string };

function sandbox(connector: string, detail: string): ConnectorResult {
  logger.info('Connector sandbox', { connector, detail });
  return { connector, ok: true, detail: `[sandbox] ${detail}` };
}

export async function sendEmailReport(to: string, subject: string, html: string): Promise<ConnectorResult> {
  if (env.sendgridApiKey) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.sendgridApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@sheettomate.com' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    return { connector: 'email', ok: res.ok, detail: `sendgrid ${res.status}` };
  }
  await sendHtmlEmail(to, subject, html);
  return sandbox('email', `queued to ${to}: ${subject}`);
}

export async function sendSms(to: string, body: string): Promise<ConnectorResult> {
  if (env.twilioAccountSid && env.twilioAuthToken) {
    const auth = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: '+15005550006', Body: body }),
    });
    return { connector: 'sms', ok: res.ok, detail: `twilio ${res.status}` };
  }
  if (env.africaTalkingKey) {
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { apiKey: env.africaTalkingKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: env.africaTalkingUser || 'sandbox', to, message: body }),
    });
    return { connector: 'sms', ok: res.ok, detail: `africastalking ${res.status}` };
  }
  return sandbox('sms', `${to}: ${body}`);
}

export async function sendSlack(text: string, webhook = env.slackWebhookUrl): Promise<ConnectorResult> {
  if (webhook) {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return { connector: 'slack', ok: res.ok, detail: String(res.status) };
  }
  return sandbox('slack', text);
}

export async function sendWhatsApp(to: string, body: string): Promise<ConnectorResult> {
  if (env.whatsappToken && env.whatsappPhoneId) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${env.whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });
    return { connector: 'whatsapp', ok: res.ok, detail: String(res.status) };
  }
  return sandbox('whatsapp', `${to}: ${body}`);
}

export async function saveToDrive(filename: string, content: string): Promise<ConnectorResult> {
  return sandbox('gdrive', `saved ${filename} (${content.length} bytes)`);
}

export async function syncCrm(provider: 'hubspot' | 'salesforce', record: Record<string, unknown>): Promise<ConnectorResult> {
  if (provider === 'hubspot' && env.hubspotToken) {
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.hubspotToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: record }),
    });
    return { connector: 'crm', ok: res.ok, detail: `hubspot ${res.status}` };
  }
  if (provider === 'salesforce' && env.salesforceUrl) {
    return sandbox('crm', `salesforce POST ${env.salesforceUrl}`);
  }
  return sandbox('crm', `${provider} ${JSON.stringify(record)}`);
}

export async function exportQuickBooks(payload: Record<string, unknown>): Promise<ConnectorResult> {
  return sandbox('quickbooks', `journal ${JSON.stringify(payload).slice(0, 200)}`);
}

export function signWebhookBody(secret: string, body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export const CONNECTOR_CATALOG = [
  { id: 'email', name: 'Email (SendGrid / Mailgun / SMTP)', scopes: ['email:send'] },
  { id: 'sms', name: 'SMS (Twilio / Africa\'s Talking)', scopes: ['sms:send'] },
  { id: 'slack', name: 'Slack incoming webhook', scopes: ['slack:post'] },
  { id: 'whatsapp', name: 'WhatsApp Business API', scopes: ['whatsapp:send'] },
  { id: 'gdrive', name: 'Google Drive auto-save', scopes: ['drive:write'] },
  { id: 'crm', name: 'HubSpot / Salesforce', scopes: ['crm:write'] },
  { id: 'quickbooks', name: 'QuickBooks export', scopes: ['qb:export'] },
  { id: 'sheets', name: 'Google Sheets sync', scopes: ['sheets:sync'] },
  { id: 'zapier', name: 'Zapier / Make inbound hook', scopes: ['webhooks:inbound'] },
];
