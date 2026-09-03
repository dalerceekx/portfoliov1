import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { settingsService } from '../../services/settingsService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/Modal';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Trash } from '../../components/ui/Icons';
import type { AdminSettings, AdminSocialLink } from '../../types';

type LinkDraft = { platform: string; label: string; url: string };

const EMPTY_LINK: LinkDraft = { platform: '', label: '', url: '' };

export function SettingsPage() {
  const { notify } = useToast();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [links, setLinks] = useState<AdminSocialLink[]>([]);
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<LinkDraft>(EMPTY_LINK);
  const [addingLink, setAddingLink] = useState(false);
  const [pendingLink, setPendingLink] = useState<AdminSocialLink | null>(null);
  const [uploading, setUploading] = useState<'avatar' | 'ogImage' | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await settingsService.getAdmin(signal);
      setSettings(data.settings);
      setLinks(data.socialLinks);
      setSkills(data.settings.skills.join(', '));
    } catch (err) {
      if (!signal?.aborted) {
        setLoadError(err instanceof Error ? err.message : 'Settings could not be loaded.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  async function onUpload(field: 'avatar' | 'ogImage', file: File) {
    setUploading(field);
    try {
      set(field, await settingsService.uploadImage(file));
      notify('Image uploaded. Remember to save.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setErrors({});
    try {
      const updated = await settingsService.update({
        name: settings.name,
        headline: settings.headline,
        subheadline: settings.subheadline,
        bio: settings.bio,
        aboutTitle: settings.aboutTitle,
        avatar: settings.avatar ?? '',
        email: settings.email,
        location: settings.location,
        availability: settings.availability,
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 24),
        footerText: settings.footerText,
        contactHeading: settings.contactHeading,
        contactBody: settings.contactBody,
        seoTitle: settings.seoTitle,
        seoDescription: settings.seoDescription,
        ogImage: settings.ogImage ?? '',
        canonicalUrl: settings.canonicalUrl,
        accentPrimary: settings.accentPrimary,
        accentSecondary: settings.accentSecondary,
      });
      setSettings(updated);
      setSkills(updated.skills.join(', '));
      notify('Saved successfully.');
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      notify(err instanceof Error ? err.message : 'Could not save settings.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addLink() {
    setAddingLink(true);
    try {
      const created = await settingsService.createSocialLink({
        ...draft,
        sortOrder: links.length + 1,
        visible: true,
      });
      setLinks((current) => [...current, created]);
      setDraft(EMPTY_LINK);
      notify('Link added.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not add this link.', 'error');
    } finally {
      setAddingLink(false);
    }
  }

  async function toggleLink(link: AdminSocialLink) {
    try {
      const updated = await settingsService.updateSocialLink(link.id, { visible: !link.visible });
      setLinks((current) => current.map((l) => (l.id === link.id ? updated : l)));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update this link.', 'error');
    }
  }

  async function removeLink() {
    if (!pendingLink) return;
    try {
      await settingsService.removeSocialLink(pendingLink.id);
      setLinks((current) => current.filter((l) => l.id !== pendingLink.id));
      notify('Link removed.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not remove this link.', 'error');
    } finally {
      setPendingLink(null);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20 text-slate">
        <Spinner label="Loading settings" />
      </div>
    );

  if (loadError || !settings)
    return (
      <div className="card rounded-card p-8 text-center">
        <p className="text-graphite">{loadError ?? 'Settings unavailable.'}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-graphite">Site settings</h1>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <section className="card space-y-5 rounded-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-graphite">Profile</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Name"
              value={settings.name}
              onChange={(e) => set('name', e.target.value)}
              required
              error={errors.name}
            />
            <TextField
              label="Email"
              type="email"
              value={settings.email}
              onChange={(e) => set('email', e.target.value)}
              required
              error={errors.email}
            />
          </div>

          <TextField
            label="Headline"
            value={settings.headline}
            onChange={(e) => set('headline', e.target.value)}
            hint="The main line under your name in the hero."
            required
            error={errors.headline}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Subheadline"
              value={settings.subheadline}
              onChange={(e) => set('subheadline', e.target.value)}
              hint="Role and location, for example."
            />
            <TextField
              label="Availability badge"
              value={settings.availability}
              onChange={(e) => set('availability', e.target.value)}
              hint="Leave empty to hide the badge."
            />
          </div>

          <TextAreaField
            label="Bio"
            value={settings.bio}
            onChange={(e) => set('bio', e.target.value)}
            rows={6}
            hint="Blank lines start a new paragraph."
            error={errors.bio}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="About heading"
              value={settings.aboutTitle}
              onChange={(e) => set('aboutTitle', e.target.value)}
            />
            <TextField
              label="Location"
              value={settings.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>

          <TextField
            label="Skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            hint="Comma separated. Shown as tags in About."
          />

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-graphite">Profile image</span>
            {settings.avatar ? (
              <div className="flex items-center gap-4">
                <img
                  src={settings.avatar}
                  alt=""
                  className="h-16 w-16 rounded-pill border border-hairline object-cover"
                />
                <Button variant="ghost" size="sm" type="button" onClick={() => set('avatar', '')}>
                  Remove
                </Button>
              </div>
            ) : null}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={uploading === 'avatar'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload('avatar', file);
                e.target.value = '';
              }}
              className="mt-2 block w-full text-sm text-slate file:mr-3 file:min-h-[40px] file:cursor-pointer file:rounded-pill file:border-0 file:bg-black/[0.06] file:px-4 file:text-sm file:text-graphite hover:file:bg-black/[0.06]"
            />
          </div>
        </section>

        <section className="card space-y-5 rounded-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-graphite">Contact section</h2>
          <TextField
            label="Contact heading"
            value={settings.contactHeading}
            onChange={(e) => set('contactHeading', e.target.value)}
          />
          <TextAreaField
            label="Contact intro"
            value={settings.contactBody}
            onChange={(e) => set('contactBody', e.target.value)}
            rows={3}
          />
          <TextField
            label="Footer note"
            value={settings.footerText}
            onChange={(e) => set('footerText', e.target.value)}
            hint="Appears under the copyright line."
          />
        </section>

        <section className="card space-y-5 rounded-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-graphite">Search and sharing</h2>
          <TextField
            label="SEO title"
            value={settings.seoTitle}
            onChange={(e) => set('seoTitle', e.target.value)}
            maxLength={70}
            hint="Empty falls back to your name and headline."
            error={errors.seoTitle}
          />
          <TextAreaField
            label="SEO description"
            value={settings.seoDescription}
            onChange={(e) => set('seoDescription', e.target.value)}
            rows={2}
            maxLength={180}
            hint="Empty falls back to the first lines of your bio."
            error={errors.seoDescription}
          />
          <TextField
            label="Canonical URL"
            value={settings.canonicalUrl}
            onChange={(e) => set('canonicalUrl', e.target.value)}
            placeholder="https://"
            error={errors.canonicalUrl}
          />

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-graphite">Share image</span>
            {settings.ogImage ? (
              <div className="flex items-center gap-4">
                <img
                  src={settings.ogImage}
                  alt=""
                  className="h-20 w-36 rounded-card border border-hairline object-cover"
                />
                <Button variant="ghost" size="sm" type="button" onClick={() => set('ogImage', '')}>
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-sm text-mute">Used when the site is shared on social media.</p>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={uploading === 'ogImage'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload('ogImage', file);
                e.target.value = '';
              }}
              className="mt-2 block w-full text-sm text-slate file:mr-3 file:min-h-[40px] file:cursor-pointer file:rounded-pill file:border-0 file:bg-black/[0.06] file:px-4 file:text-sm file:text-graphite hover:file:bg-black/[0.06]"
            />
          </div>
        </section>

        <section className="card space-y-5 rounded-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-graphite">Accent colours</h2>
          <p className="text-sm text-slate">
            Only hex colours are accepted, and they only retint the existing palette.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <TextField
                  label="Primary"
                  value={settings.accentPrimary}
                  onChange={(e) => set('accentPrimary', e.target.value)}
                  error={errors.accentPrimary}
                />
              </div>
              <input
                type="color"
                aria-label="Pick primary accent"
                value={settings.accentPrimary}
                onChange={(e) => set('accentPrimary', e.target.value.toUpperCase())}
                className="h-[46px] w-14 cursor-pointer rounded-card border border-hairline bg-transparent"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <TextField
                  label="Secondary"
                  value={settings.accentSecondary}
                  onChange={(e) => set('accentSecondary', e.target.value)}
                  error={errors.accentSecondary}
                />
              </div>
              <input
                type="color"
                aria-label="Pick secondary accent"
                value={settings.accentSecondary}
                onChange={(e) => set('accentSecondary', e.target.value.toUpperCase())}
                className="h-[46px] w-14 cursor-pointer rounded-card border border-hairline bg-transparent"
              />
            </div>
          </div>
        </section>

        <Button type="submit" loading={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      <section className="card space-y-4 rounded-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-graphite">Social links</h2>

        {links.length === 0 ? (
          <p className="text-sm text-slate">No links yet. Add the first one below.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-surface/40 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-graphite">{link.label}</p>
                  <p className="truncate text-xs text-slate">{link.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleLink(link)}>
                    {link.visible ? 'Hide' : 'Show'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPendingLink(link)}
                    aria-label={`Remove ${link.label}`}
                    className="flex h-11 w-11 items-center justify-center rounded-card border border-alert/25 text-alert transition-colors hover:bg-alert/10"
                  >
                    <Trash />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 border-t border-hairline pt-4 sm:grid-cols-3">
          <TextField
            label="Platform"
            value={draft.platform}
            onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
            hint="github, telegram…"
          />
          <TextField
            label="Label"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          <TextField
            label="URL"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="https://"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={addingLink}
          disabled={!draft.platform || !draft.label || !draft.url}
          onClick={addLink}
        >
          Add link
        </Button>
      </section>

      <ConfirmDialog
        open={pendingLink !== null}
        title="Remove this link?"
        body={<>It will disappear from the header, hero and footer.</>}
        confirmLabel="Remove"
        onConfirm={removeLink}
        onCancel={() => setPendingLink(null)}
      />
    </div>
  );
}
