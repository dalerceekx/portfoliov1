import { z } from 'zod';
import { assertSafeImagePath, assertSafeUrl, stripTags } from '../../utils/sanitize';

const text = (max: number) => z.string().transform(stripTags).pipe(z.string().max(max));
const required = (max: number) =>
  z.string().transform(stripTags).pipe(z.string().min(1, 'This field is required.').max(max));

const url = (label: string) =>
  z
    .string()
    .trim()
    .max(2048)
    .superRefine((value, ctx) => {
      if (!value) return;
      try {
        assertSafeUrl(value);
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: ${(e as Error).message}` });
      }
    });

const image = z
  .string()
  .trim()
  .max(2048)
  .superRefine((value, ctx) => {
    if (!value) return;
    try {
      assertSafeImagePath(value);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
    }
  });

/** Only hex colours are accepted — the admin panel can never inject raw CSS. */
const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour, for example #2DD4BF.');

export const updateSettingsSchema = z
  .object({
    name: required(80),
    headline: required(160),
    subheadline: text(160),
    bio: text(1200),
    aboutTitle: text(80),
    avatar: image,
    email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
    location: text(80),
    availability: text(80),
    skills: z.array(z.string().transform(stripTags).pipe(z.string().min(1).max(32))).max(24),
    footerText: text(200),
    contactHeading: text(120),
    contactBody: text(400),
    seoTitle: text(70),
    seoDescription: text(180),
    ogImage: image,
    canonicalUrl: url('Canonical URL'),
    accentPrimary: hexColor,
    accentSecondary: hexColor,
  })
  .partial();

export const socialLinkSchema = z.object({
  platform: required(32),
  label: required(48),
  url: z
    .string()
    .trim()
    .min(1, 'Enter a link.')
    .max(2048)
    .superRefine((value, ctx) => {
      try {
        assertSafeUrl(value);
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
      }
    }),
  sortOrder: z.number().int().min(0).max(999).default(0),
  visible: z.boolean().default(true),
});

export const updateSocialLinkSchema = socialLinkSchema.partial();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type SocialLinkInput = z.infer<typeof socialLinkSchema>;
