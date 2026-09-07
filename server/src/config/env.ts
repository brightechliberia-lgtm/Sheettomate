import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: required(
    'DATABASE_URL',
    isProd ? undefined : 'postgresql://sheetomate:sheetomate@localhost:5432/sheetomate?schema=public',
  ),
  jwtAccessSecret: required(
    'JWT_ACCESS_SECRET',
    isProd ? undefined : 'dev-access-secret-change-me-min-32-chars',
  ),
  jwtRefreshSecret: required(
    'JWT_REFRESH_SECRET',
    isProd ? undefined : 'dev-refresh-secret-change-me-min-32-chars',
  ),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  storageProvider: (process.env.STORAGE_PROVIDER ?? 'local') as 's3' | 'cloudinary' | 'local',
  localUploadDir: process.env.LOCAL_UPLOAD_DIR ?? './uploads',
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM ?? 'Sheettomate <noreply@sheettomate.com>',
  smtpSecure: process.env.SMTP_SECURE === 'true',
  redisUrl: process.env.REDIS_URL ?? '',
  cdnBaseUrl: (process.env.CDN_BASE_URL ?? '').replace(/\/$/, ''),
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
  aiDailyLimitUser: Number(process.env.AI_DAILY_LIMIT_USER ?? 8),
  aiDailyLimitCreator: Number(process.env.AI_DAILY_LIMIT_CREATOR ?? 25),
  aiDailyLimitAdmin: Number(process.env.AI_DAILY_LIMIT_ADMIN ?? 100),
  paymentsMode: (process.env.PAYMENTS_MODE ?? 'sandbox') as 'sandbox' | 'live',
  fxUsdLrd: Number(process.env.FX_USD_LRD ?? 190),
  banffpayBaseUrl: process.env.BANFFPAY_BASE_URL ?? 'https://api.banffpay.com/v1',
  banffpayApiKey: process.env.BANFFPAY_API_KEY ?? '',
  banffpayWebhookSecret: process.env.BANFFPAY_WEBHOOK_SECRET ?? 'dev-banffpay-webhook-secret',
  orangeMoneyMerchantId: process.env.ORANGE_MONEY_MERCHANT_ID ?? '',
  orangeMoneyApiKey: process.env.ORANGE_MONEY_API_KEY ?? '',
  orangeMoneyBaseUrl: process.env.ORANGE_MONEY_BASE_URL ?? 'https://api.orange.com/orange-money-webpay/dev/v1',
  sentryDsn: process.env.SENTRY_DSN ?? '',
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:4000',
  mailchimpApiKey: process.env.MAILCHIMP_API_KEY ?? '',
  mailchimpListId: process.env.MAILCHIMP_LIST_ID ?? '',
  convertkitApiKey: process.env.CONVERTKIT_API_KEY ?? '',
  convertkitFormId: process.env.CONVERTKIT_FORM_ID ?? '',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:hello@sheettomate.com',
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  mailgunApiKey: process.env.MAILGUN_API_KEY ?? '',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? '',
  africaTalkingKey: process.env.AFRICASTALKING_API_KEY ?? '',
  africaTalkingUser: process.env.AFRICASTALKING_USERNAME ?? '',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? '',
  whatsappToken: process.env.WHATSAPP_TOKEN ?? '',
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID ?? '',
  hubspotToken: process.env.HUBSPOT_TOKEN ?? '',
  salesforceUrl: process.env.SALESFORCE_URL ?? '',
  quickbooksRealm: process.env.QUICKBOOKS_REALM ?? '',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
};

export const isProduction = env.nodeEnv === 'production';

/** localhost and 127.0.0.1 are different browser origins; allow both in local/dev. */
export function allowedClientOrigins(): string[] {
  const primary = env.clientOrigin;
  const list = [primary];
  try {
    const url = new URL(primary);
    if (url.hostname === 'localhost') {
      url.hostname = '127.0.0.1';
      list.push(url.origin);
    } else if (url.hostname === '127.0.0.1') {
      url.hostname = 'localhost';
      list.push(url.origin);
    }
  } catch {
    /* ignore invalid CLIENT_ORIGIN */
  }
  return [...new Set(list)];
}

export function isAllowedClientOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return allowedClientOrigins().includes(origin);
}

export function appOriginFromRequest(originHeader?: string): string {
  if (originHeader && allowedClientOrigins().includes(originHeader)) {
    return originHeader;
  }
  return env.clientOrigin;
}
