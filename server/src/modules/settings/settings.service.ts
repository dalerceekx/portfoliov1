import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/http';
import type { SocialLinkInput, UpdateSettingsInput } from './settings.schema';

const DEFAULTS = {
  id: 1,
  name: 'Your name',
  headline: 'Designer, developer, creator',
  email: 'hello@example.com',
} as const;

export async function getSettings() {
  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.siteSettings.create({ data: DEFAULTS });
}

/** Public payload: settings + visible social links, with SEO fallbacks resolved. */
export async function getPublicSettings() {
  const [settings, socialLinks] = await Promise.all([
    getSettings(),
    prisma.socialLink.findMany({
      where: { visible: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, platform: true, label: true, url: true },
    }),
  ]);

  return {
    name: settings.name,
    headline: settings.headline,
    subheadline: settings.subheadline,
    bio: settings.bio,
    aboutTitle: settings.aboutTitle,
    avatar: settings.avatar,
    email: settings.email,
    location: settings.location,
    availability: settings.availability,
    skills: settings.skills,
    footerText: settings.footerText,
    contactHeading: settings.contactHeading,
    contactBody: settings.contactBody,
    accentPrimary: settings.accentPrimary,
    accentSecondary: settings.accentSecondary,
    seo: {
      title: settings.seoTitle || `${settings.name} — ${settings.headline}`,
      description: settings.seoDescription || settings.bio.slice(0, 155),
      ogImage: settings.ogImage || settings.avatar,
      canonicalUrl: settings.canonicalUrl || env.PUBLIC_SITE_URL,
    },
    socialLinks,
  };
}

export async function updateSettings(input: UpdateSettingsInput) {
  await getSettings();
  return prisma.siteSettings.update({ where: { id: 1 }, data: input });
}

export const listSocialLinks = () =>
  prisma.socialLink.findMany({ orderBy: { sortOrder: 'asc' } });

export const createSocialLink = (input: SocialLinkInput) =>
  prisma.socialLink.create({ data: input });

export async function updateSocialLink(id: string, input: Partial<SocialLinkInput>) {
  const found = await prisma.socialLink.findUnique({ where: { id } });
  if (!found) throw AppError.notFound('This link no longer exists.');
  return prisma.socialLink.update({ where: { id }, data: input });
}

export async function deleteSocialLink(id: string) {
  const found = await prisma.socialLink.findUnique({ where: { id } });
  if (!found) throw AppError.notFound('This link no longer exists.');
  await prisma.socialLink.delete({ where: { id } });
}
