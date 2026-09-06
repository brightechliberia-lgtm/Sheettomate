import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { sendCourseEmail } from './emailService';

export async function subscribeEmail(email: string, source: string, name?: string) {
  const row = await prisma.newsletterSubscriber.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), source, name },
    update: { source, name },
  });

  if (env.convertkitApiKey && env.convertkitFormId) {
    await fetch(`https://api.convertkit.com/v3/forms/${env.convertkitFormId}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: env.convertkitApiKey, email, first_name: name }),
    }).catch((error) => logger.warn('ConvertKit subscribe failed', { error }));
  }

  if (env.mailchimpApiKey && env.mailchimpListId) {
    const dc = env.mailchimpApiKey.split('-')[1] ?? 'us1';
    await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${env.mailchimpListId}/members`, {
      method: 'POST',
      headers: {
        Authorization: `apikey ${env.mailchimpApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_address: email, status: 'subscribed', merge_fields: { FNAME: name ?? '' } }),
    }).catch((error) => logger.warn('Mailchimp subscribe failed', { error }));
  }

  await sendCourseEmail(
    email,
    'Welcome to Sheettomate',
    'You are on the list',
    `Thanks for joining Sheettomate${name ? `, ${name}` : ''}. We will send product tips, Institute courses, and marketplace drops for Liberia and West Africa.`,
    '/register',
  ).catch(() => undefined);

  logger.info('Newsletter subscribe', { email, source, id: row.id });
  return row;
}

export const MARKETING_PATHS = [
  '/',
  '/about',
  '/contact',
  '/pricing',
  '/blog',
  '/blog/getting-started',
  '/blog/automate-processes',
  '/blog/ngo-grants',
  '/blog/digital-skills-liberia',
  '/terms',
  '/privacy',
  '/templates',
  '/courses',
  '/register',
];

export function sitemapXml() {
  const urls = MARKETING_PATHS.map(
    (path) =>
      `  <url><loc>${env.clientOrigin}${path}</loc><changefreq>weekly</changefreq></url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
