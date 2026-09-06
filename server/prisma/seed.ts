import { PrismaClient, Role, CourseLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_PROMPT_TEMPLATES } from '../src/ai/prompts';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sheettomate.com' },
    update: { emailVerifiedAt: new Date(), staffRole: 'SUPER' },
    create: {
      email: 'admin@sheettomate.com',
      name: 'Sheettomate Admin',
      passwordHash,
      role: Role.ADMIN,
      staffRole: 'SUPER',
      country: 'LR',
      phone: '+231555000000',
      emailVerifiedAt: new Date(),
    },
  });

  const creator = await prisma.user.upsert({
    where: { email: 'creator@sheettomate.com' },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: 'creator@sheettomate.com',
      name: 'Demo Creator',
      passwordHash,
      role: Role.CREATOR,
      country: 'LR',
      phone: '+231555000001',
      emailVerifiedAt: new Date(),
    },
  });

  const learner = await prisma.user.upsert({
    where: { email: 'learner@sheettomate.com' },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: 'learner@sheettomate.com',
      name: 'Demo Learner',
      passwordHash,
      role: Role.LEARNER,
      country: 'GH',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.template.deleteMany({
    where: { title: { in: ['Small Business Cashbook', 'Household Budget (West Africa)', 'FMCG Stock Tracker'] } },
  });

  await prisma.template.createMany({
    data: [
      {
        title: 'Small Business Cashbook',
        description: 'Track daily cash in/out for shops and market stalls in USD and LRD.',
        category: 'Finance',
        tags: ['budget', 'tracking', 'invoicing'],
        price: 9.99,
        fileUrl: '/uploads/demo-cashbook.xlsx',
        previewUrl: '/uploads/demo-cashbook-preview.svg',
        createdById: creator.id,
        isAiGenerated: false,
        rows: 120,
        columns: 8,
        softwareRequired: 'Excel / Google Sheets',
        version: '1.2',
        language: 'en',
        downloadCount: 42,
        averageRating: 4.6,
        ratingCount: 8,
      },
      {
        title: 'Household Budget (West Africa)',
        description: 'Monthly budget with mobile money, remittances, and school fees.',
        category: 'Finance',
        tags: ['budget', 'dashboard'],
        price: 4.99,
        fileUrl: '/uploads/demo-budget.xlsx',
        createdById: admin.id,
        isAiGenerated: true,
        rows: 48,
        columns: 6,
        downloadCount: 88,
        averageRating: 4.8,
        ratingCount: 21,
      },
      {
        title: 'FMCG Stock Tracker',
        description: 'Inventory and expiry tracking for kiosks and wholesale shops.',
        category: 'FMCG',
        tags: ['inventory', 'tracking'],
        price: 12.5,
        fileUrl: '/uploads/demo-fmcg.xlsx',
        createdById: creator.id,
        rows: 200,
        columns: 10,
        downloadCount: 17,
        averageRating: 4.2,
        ratingCount: 5,
      },
    ],
  });

  const cashbook = await prisma.template.findFirst({ where: { title: 'Small Business Cashbook' } });
  if (cashbook) {
    await prisma.userBadge.upsert({
      where: { userId_badge: { userId: creator.id, badge: 'First Template' } },
      create: { userId: creator.id, badge: 'First Template' },
      update: {},
    });
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: learner.id, followingId: creator.id } },
      create: { followerId: learner.id, followingId: creator.id },
      update: {},
    });
    await prisma.forumPost.deleteMany({ where: { title: 'How do I keep USD and LRD in one cashbook?' } });
    await prisma.communityEvent.deleteMany({
      where: { title: { in: ['August Cashbook Challenge', 'Automation hackathon', 'Excel for traders webinar'] } },
    });
    await prisma.workspace.deleteMany({ where: { name: 'Demo co-create' } });
    await prisma.forumPost.create({
      data: {
        userId: learner.id,
        title: 'How do I keep USD and LRD in one cashbook?',
        body: 'I sell in both currencies at Red Light market. Separate columns or two sheets?',
        tags: ['finance', 'excel'],
      },
    });
    await prisma.communityEvent.createMany({
      data: [
        {
          title: 'August Cashbook Challenge',
          description: 'Publish a cashbook template with mobile-money columns. Community votes Template of the Week.',
          type: 'CHALLENGE',
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 20 * 86400000),
        },
        {
          title: 'Automation hackathon',
          description: 'Build a Sheets workflow that logs Orange Money payouts.',
          type: 'HACKATHON',
          startsAt: new Date(Date.now() + 86400000),
          endsAt: new Date(Date.now() + 8 * 86400000),
        },
        {
          title: 'Excel for traders webinar',
          description: 'Live session with a Monrovia bookkeeper.',
          type: 'WEBINAR',
          startsAt: new Date(Date.now() + 3 * 86400000),
          endsAt: new Date(Date.now() + 3 * 86400000 + 3600000),
          meetingUrl: 'https://meet.google.com/sheettomate-demo',
        },
      ],
    });
    await prisma.workspace.create({
      data: {
        name: 'Demo co-create',
        ownerId: creator.id,
        members: { create: [{ userId: creator.id, role: 'OWNER' }, { userId: learner.id, role: 'EDITOR' }] },
        templates: { create: { templateId: cashbook.id } },
      },
    });
    await prisma.user.update({
      where: { id: creator.id },
      data: { bio: 'I build cashbooks for shops in Monrovia.', expertise: ['Excel', 'Finance'], reputation: 40 },
    });
  }

  await prisma.course.deleteMany({ where: { slug: 'excel-basics-market-traders' } });
  await prisma.course.create({
    data: {
      slug: 'excel-basics-market-traders',
      title: 'Excel Basics for Market Traders',
      description: 'Learn formulas, tables, and simple dashboards using practical Liberian examples.',
      level: CourseLevel.BEGINNER,
      price: 0,
      status: 'PUBLISHED',
      featured: true,
      objectives: ['Build a daily cash table', 'Use SUM and IF', 'Publish a simple dashboard'],
      prerequisites: 'Spreadsheet software on phone or laptop.',
      instructorId: admin.id,
      thumbnailUrl: '',
      lessons: {
        create: [
          {
            sortOrder: 0,
            moduleTitle: 'Module 1 — Getting started',
            title: 'Module 1 — Getting started - Learning Outcomes',
            type: 'TEXT',
            content:
              '<h4>Module 1 — Getting started</h4><p><strong>After completing this module, you will be able to:</strong></p><ul><li>Open a cashbook workbook on phone or laptop</li><li>Identify the columns traders need daily</li><li>Enter a sample market day</li></ul>',
          },
          {
            sortOrder: 1,
            moduleTitle: 'Module 1 — Getting started',
            title: 'Welcome to Sheettomate Learn',
            type: 'VIDEO',
            videoUrl: 'https://www.youtube.com/watch?v=eHJnEHyyN1Y',
            videoProvider: 'YOUTUBE',
            content: 'Watch how traders in Monrovia track daily sales.',
            durationSec: 420,
          },
          {
            sortOrder: 2,
            moduleTitle: 'Module 1 — Getting started',
            title: 'Cashbook structure',
            type: 'TEXT',
            content:
              '<h3>Columns that matter</h3><p>Date, item, cash in, cash out, running balance. Keep USD and LRD in separate columns.</p><pre><code>=SUM(D2:D20)</code></pre>',
          },
          {
            sortOrder: 3,
            moduleTitle: 'Module 1 — Getting started',
            title: 'Module 1 — Getting started - Lesson Summary',
            type: 'TEXT',
            content:
              '<p><strong>Key points:</strong></p><ul><li>Separate currencies</li><li>Use SUM for totals</li><li>Update every market day</li></ul>',
          },
          {
            sortOrder: 4,
            moduleTitle: 'Module 2 — Practice',
            title: 'Module 2 — Practice - Learning Outcomes',
            type: 'TEXT',
            content:
              '<h4>Module 2 — Practice</h4><p><strong>After completing this module, you will be able to:</strong></p><ul><li>Pass a short quiz on formulas</li><li>Complete a practice cashbook</li></ul>',
          },
          {
            sortOrder: 5,
            moduleTitle: 'Module 2 — Practice',
            title: 'Check your knowledge',
            type: 'QUIZ',
            quiz: {
              passingScore: 70,
              questions: [
                {
                  id: 'q1',
                  type: 'MC',
                  prompt: 'Which function totals a column of sales?',
                  choices: ['AVERAGE', 'SUM', 'COUNTIF'],
                  correct: 'SUM',
                },
                { id: 'q2', type: 'TF', prompt: 'You should mix USD and LRD in one amount column.', correct: false },
              ],
            },
          },
          {
            sortOrder: 6,
            moduleTitle: 'Module 2 — Practice',
            title: 'Practice: cashbook',
            type: 'PRACTICE',
            content: 'Download a sample cashbook, enter 5 market days, and mark complete.',
          },
          {
            sortOrder: 7,
            moduleTitle: 'Module 2 — Practice',
            title: 'Module 2 — Practice - Lesson Summary',
            type: 'TEXT',
            content: '<p><strong>Key points:</strong></p><ul><li>SUM totals a range</li><li>Practice daily until it is habit</li></ul>',
          },
          {
            sortOrder: 8,
            moduleTitle: 'Module 2 — Practice',
            title: 'Capstone: weekly report',
            type: 'PROJECT',
            content: 'Submit notes describing your weekly profit formula.',
          },
        ],
      },
    },
  });

  for (const row of DEFAULT_PROMPT_TEMPLATES) {
    await prisma.aIPromptTemplate.upsert({
      where: { slug: row.slug },
      update: row,
      create: row,
    });
  }

  await prisma.platformSetting.upsert({
    where: { key: 'ai.dailyLimit.user' },
    update: {},
    create: { key: 'ai.dailyLimit.user', value: '8' },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete. Demo password: ChangeMe123!');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
