import 'dotenv/config';
import { PrismaClient, ProjectStatus } from '@prisma/client';
import { hashPassword, isStrongPassword } from '../src/modules/auth/password';

const prisma = new PrismaClient();

/** The public contact address, kept separate from the admin login. */
const CONTACT_EMAIL = 'rizoqulov.daler1@gmail.com';

/** Shipped in `.env.example`, so anyone can read them. */
const PLACEHOLDER_EMAILS = new Set(['you@example.com', 'admin@example.com']);
const PLACEHOLDER_PASSWORDS = new Set(['Ch4nge-Me-Now!2026']);

/**
 * Seed data is a starting point, not the source of truth. Everything below can be
 * edited from /admin without touching the codebase.
 */
async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';

  if (!email || !password) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env before seeding.');
  }
  if (!isStrongPassword(password)) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must be at least 12 characters with an uppercase letter, a number and a special character.',
    );
  }
  // The example credentials are public. Harmless on a laptop, but seeding a
  // reachable deployment with them hands the admin panel to the first person who
  // reads the repository.
  if (
    process.env.NODE_ENV === 'production' &&
    (PLACEHOLDER_EMAILS.has(email) || PLACEHOLDER_PASSWORDS.has(password))
  ) {
    throw new Error(
      'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are still the values from .env.example. Set your own before seeding a production deployment.',
    );
  }

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Daler', passwordHash: await hashPassword(password) },
  });
  console.log(`Admin ready: ${admin.email}`);

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Daler Rizoqulov',
      headline: 'I build the part you do not see — APIs, databases, and the systems that run on them.',
      subheadline: 'Fullstack developer · Tashkent',
      bio: `Backend-first fullstack developer in Tashkent. At Mikka I built services on NestJS, Node.js and TypeScript, designed the PostgreSQL schemas behind them with Prisma, and wrote the API and server-side business logic those services ran on.

The work I am proudest of is an ERP system I took from nothing to a finished product on my own — architecture, database, backend and frontend. I also owned how it shipped: AWS for the infrastructure, Docker and Ubuntu for running and maintaining it.

I studied software engineering at Najot Ta'lim. Uzbek is my first language; I work in Russian at B2 and read English at B1.`,
      aboutTitle: 'Backend first. Everything else follows.',
      email: CONTACT_EMAIL,
      location: 'Tashkent, Uzbekistan',
      availability: 'Open to backend and fullstack work',
      skills: [
        'TypeScript',
        'Node.js',
        'NestJS',
        'Express',
        'Fastify',
        'PostgreSQL',
        'Prisma ORM',
        'SQL',
        'REST APIs',
        'Authentication systems',
        'Telegram bots',
        'React',
        'Tailwind CSS',
        'EJS',
        'JavaScript',
        'HTML5',
        'CSS',
        'Docker',
        'AWS',
        'Linux / Ubuntu',
        'Git',
        'GitHub',
        'Postman',
      ],
      contactHeading: "Let's build something",
      contactBody:
        'Backend services, database design, Telegram bots, or a system that needs one person to own it end to end. Tell me what you are building and I will tell you honestly whether I am the right person for it.',
      footerText: 'Built and maintained by hand.',
      seoTitle: 'Daler Rizoqulov — Fullstack developer in Tashkent',
      seoDescription:
        'Backend-focused fullstack developer working in TypeScript, NestJS, Node.js, PostgreSQL and Prisma. Projects, experience and contact details.',
      accentPrimary: '#0071E3',
      accentSecondary: '#FF9500',
    },
  });
  console.log('Site settings ready');

  const socialLinks = [
    { platform: 'telegram', label: 'Telegram', url: 'https://t.me/rizokulovvv', sortOrder: 1 },
    { platform: 'github', label: 'GitHub', url: 'https://github.com/dalerceekx', sortOrder: 2 },
    { platform: 'email', label: 'Email', url: `mailto:${CONTACT_EMAIL}`, sortOrder: 3 },
  ];
  for (const link of socialLinks) {
    const exists = await prisma.socialLink.findFirst({ where: { platform: link.platform } });
    if (!exists) await prisma.socialLink.create({ data: link });
  }
  console.log('Social links ready');

  // Descriptions come straight from the CV. Work with no public link carries no
  // link at all rather than a placeholder that goes nowhere.
  const projects = [
    {
      title: 'ERP system',
      slug: 'erp-system',
      description:
        'An ERP system taken from nothing to a finished product single-handedly: domain architecture, PostgreSQL schema, the backend API, and the frontend that runs on top of it. Built and shipped at Mikka.',
      url: 'http://3.79.98.178:8080/',
      category: 'Systems',
      tags: ['NestJS', 'PostgreSQL', 'Prisma', 'React'],
      status: ProjectStatus.LIVE,
      featured: true,
      sortOrder: 1,
    },
    {
      title: 'Mikka platform work',
      slug: 'mikka-platform',
      description:
        "Backend and infrastructure across Mikka's internal and commercial projects: REST APIs, server-side business logic, and the deployment path onto AWS with Docker and Ubuntu.",
      url: null,
      category: 'Backend',
      tags: ['Node.js', 'TypeScript', 'AWS', 'Docker'],
      status: ProjectStatus.LIVE,
      sortOrder: 2,
    },
    {
      title: 'Telegram bots',
      slug: 'telegram-bots',
      description:
        'Telegram bots built to order: command routing, role-based access, admin flows, and real state kept in PostgreSQL rather than in memory. Tell me what the bot needs to do and I will build it.',
      url: null,
      category: 'Bots',
      tags: ['Node.js', 'TypeScript', 'Telegram Bot API'],
      status: ProjectStatus.LIVE,
      sortOrder: 3,
    },
    {
      title: 'This portfolio',
      slug: 'this-portfolio',
      description:
        'The site you are reading. Express and Prisma behind an admin panel that owns every word on the public page — Argon2id hashing, rotating refresh tokens, and CSRF double-submit on every write.',
      url: null,
      category: 'Web',
      tags: ['Express', 'Prisma', 'React', 'TypeScript'],
      status: ProjectStatus.IN_DEVELOPMENT,
      sortOrder: 4,
    },
  ];

  for (const project of projects) {
    await prisma.project.upsert({ where: { slug: project.slug }, update: {}, create: project });
  }
  console.log(`Projects ready: ${projects.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
