import { useState, type FormEvent } from 'react';
import { SectionHeading } from '../ui/SectionHeading';
import { Button } from '../ui/Button';
import { TextAreaField, TextField } from '../ui/Field';
import { SocialLinks } from '../navigation/SocialLinks';
import { contactService } from '../../services/contactService';
import { ApiError } from '../../api/client';
import type { PublicSettings } from '../../types';

type Errors = Partial<Record<'name' | 'email' | 'message' | 'form', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Contact({ settings }: { settings: PublicSettings }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  // Client-side checks are for speed of feedback only; the server validates again.
  function validate(): boolean {
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name.';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) next.message = 'Write at least 10 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSending(true);
    try {
      await contactService.send(form);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '', website: '' });
    } catch (error) {
      if (error instanceof ApiError && error.fields) setErrors(error.fields as Errors);
      else
        setErrors({
          form: error instanceof Error ? error.message : 'Message could not be sent.',
        });
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-12 py-section">
      <div className="shell">
        <SectionHeading
          id="contact"
          eyebrow="Contact"
          title={settings.contactHeading || "Let's build something"}
          lede={settings.contactBody}
        />

        {settings.email ? (
          <p className="mt-8 text-center">
            <a href={`mailto:${settings.email}`} className="link-chevron">
              {settings.email}
            </a>
          </p>
        ) : null}

        <div className="mt-6 flex justify-center">
          <SocialLinks links={settings.socialLinks} />
        </div>

        {/* One centred column, no surrounding card: the form is the content. */}
        <div className="mx-auto mt-16 max-w-prose">
          {sent ? (
            <div className="rounded-card bg-surface px-6 py-16 text-center">
              <p className="text-subhead font-semibold text-graphite">Message sent.</p>
              <p className="mx-auto mt-2 max-w-prose text-lede text-slate">
                It lands in my inbox directly. I usually reply within a day or two.
              </p>
              <Button variant="secondary" size="sm" className="mt-6" onClick={() => setSent(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Your name"
                  value={form.name}
                  onChange={(e) => update('name')(e.target.value)}
                  autoComplete="name"
                  required
                  error={errors.name}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email')(e.target.value)}
                  autoComplete="email"
                  required
                  error={errors.email}
                />
              </div>

              <TextField
                label="Subject"
                value={form.subject}
                onChange={(e) => update('subject')(e.target.value)}
                hint="Optional"
              />

              <TextAreaField
                label="Message"
                value={form.message}
                onChange={(e) => update('message')(e.target.value)}
                required
                rows={5}
                error={errors.message}
              />

              {/* Honeypot: hidden from people and from screen readers, visible to bots. */}
              <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => update('website')(e.target.value)}
                />
              </div>

              {errors.form ? (
                <p role="alert" className="text-sm text-alert">
                  {errors.form}
                </p>
              ) : null}

              <div className="flex justify-center pt-2">
                <Button type="submit" loading={sending} className="w-full sm:w-auto">
                  {sending ? 'Sending…' : 'Send message'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
