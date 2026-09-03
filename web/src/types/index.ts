export type ProjectStatus = 'LIVE' | 'IN_DEVELOPMENT' | 'ARCHIVED';

export interface PublicProject {
  id: string;
  title: string;
  slug: string;
  description: string;
  /** Null for internal or unreleased work that has no public link. */
  url: string | null;
  image: string | null;
  icon: string | null;
  category: string;
  tags: string[];
  status: ProjectStatus;
  featured: boolean;
  updatedAt: string;
}

export interface AdminProject extends PublicProject {
  published: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
}

export interface AdminSocialLink extends SocialLink {
  sortOrder: number;
  visible: boolean;
}

export interface PublicSettings {
  name: string;
  headline: string;
  subheadline: string;
  bio: string;
  aboutTitle: string;
  avatar: string | null;
  email: string;
  location: string;
  availability: string;
  skills: string[];
  footerText: string;
  contactHeading: string;
  contactBody: string;
  accentPrimary: string;
  accentSecondary: string;
  seo: {
    title: string;
    description: string;
    ogImage: string | null;
    canonicalUrl: string;
  };
  socialLinks: SocialLink[];
}

export interface AdminSettings {
  id: number;
  name: string;
  headline: string;
  subheadline: string;
  bio: string;
  aboutTitle: string;
  avatar: string | null;
  email: string;
  location: string;
  availability: string;
  skills: string[];
  footerText: string;
  contactHeading: string;
  contactBody: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string | null;
  canonicalUrl: string;
  accentPrimary: string;
  accentSecondary: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface LoginLogEntry {
  id: string;
  email: string;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  reason: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'EDITOR';
}

export interface DashboardStats {
  projects: {
    total: number;
    published: number;
    drafts: number;
    featured: number;
    lastUpdated: string | null;
  };
  messages: { unread: number; total: number };
  recentLogins: {
    id: string;
    email: string;
    ip: string | null;
    success: boolean;
    createdAt: string;
  }[];
}
