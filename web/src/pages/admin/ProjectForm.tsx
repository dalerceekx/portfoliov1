import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import { settingsService } from '../../services/settingsService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/ui/Field';

type FormState = {
  title: string;
  slug: string;
  description: string;
  url: string;
  image: string;
  icon: string;
  category: string;
  tags: string;
  status: string;
  published: boolean;
  featured: boolean;
  sortOrder: string;
};

const EMPTY: FormState = {
  title: '',
  slug: '',
  description: '',
  url: '',
  image: '',
  icon: '',
  category: 'Websites',
  tags: '',
  status: 'LIVE',
  published: true,
  featured: false,
  sortOrder: '0',
};

const STATUS_OPTIONS = [
  { value: 'LIVE', label: 'Live' },
  { value: 'IN_DEVELOPMENT', label: 'In development' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    projectService
      .get(id, controller.signal)
      .then((project) => {
        setForm({
          title: project.title,
          slug: project.slug,
          description: project.description,
          url: project.url ?? '',
          image: project.image ?? '',
          icon: project.icon ?? '',
          category: project.category,
          tags: project.tags.join(', '),
          status: project.status,
          published: project.published,
          featured: project.featured,
          sortOrder: String(project.sortOrder),
        });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          notify(err instanceof Error ? err.message : 'Could not load this project.', 'error');
          navigate('/admin/projects', { replace: true });
        }
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [id, navigate, notify]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (form.title.trim().length < 2) next.title = 'Give the project a title.';
    if (form.description.trim().length < 10) next.description = 'Write at least 10 characters.';
    if (!/^https?:\/\/.+/i.test(form.url.trim())) next.url = 'Enter a full URL, including https://';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onUpload(file: File) {
    setUploading(true);
    try {
      set('image', await settingsService.uploadImage(file));
      notify('Image uploaded.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
      image: form.image.trim(),
      icon: form.icon.trim(),
      category: form.category.trim() || 'Other',
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
      status: form.status,
      published: form.published,
      featured: form.featured,
      sortOrder: Number(form.sortOrder) || 0,
    };

    setSaving(true);
    try {
      if (isEdit && id) await projectService.update(id, payload);
      else await projectService.create(payload);
      notify(isEdit ? 'Saved.' : 'Project created.');
      navigate('/admin/projects');
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      notify(err instanceof Error ? err.message : 'Could not save this project.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20 text-slate">
        <Spinner label="Loading project" />
      </div>
    );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-graphite">
        {isEdit ? 'Edit project' : 'New project'}
      </h1>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="card space-y-5 rounded-card p-5 sm:p-6">
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
            error={errors.title}
          />

          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            hint="Two or three lines. Plain text only."
            required
            error={errors.description}
          />

          <TextField
            label="URL"
            type="url"
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://"
            required
            error={errors.url}
          />

          <TextField
            label="Slug"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            hint="Leave empty to generate one from the title."
            error={errors.slug}
          />
        </div>

        <div className="card space-y-5 rounded-card p-5 sm:p-6">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-graphite">Preview image</span>
            {form.image ? (
              <div className="flex items-center gap-4">
                <img
                  src={form.image}
                  alt=""
                  className="h-20 w-32 rounded-card border border-hairline object-cover"
                />
                <Button variant="ghost" size="sm" type="button" onClick={() => set('image', '')}>
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-sm text-mute">
                Optional. Without an image the card shows the icon initials instead.
              </p>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
                e.target.value = '';
              }}
              className="mt-2 block w-full text-sm text-slate file:mr-3 file:min-h-[40px] file:cursor-pointer file:rounded-pill file:border-0 file:bg-black/[0.06] file:px-4 file:text-sm file:text-graphite hover:file:bg-black/[0.06]"
            />
            {uploading ? (
              <p className="text-sm text-slate">
                <Spinner label="Uploading" />
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Icon initials"
              value={form.icon}
              onChange={(e) => set('icon', e.target.value)}
              maxLength={4}
              hint="Shown when there is no image."
            />
            <TextField
              label="Category"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              hint="Groups the filter buttons."
            />
          </div>

          <TextField
            label="Tags"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            hint="Comma separated, up to 10."
          />
        </div>

        <div className="card space-y-4 rounded-card p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => set('status', v)}
              options={STATUS_OPTIONS}
            />
            <TextField
              label="Sort order"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', e.target.value)}
              hint="Lower numbers appear first."
            />
          </div>

          <CheckboxField
            label="Published"
            description="Visible on the public site."
            checked={form.published}
            onChange={(v) => set('published', v)}
          />
          <CheckboxField
            label="Featured"
            description="Pinned to the top of the grid and shown in the hero."
            checked={form.featured}
            onChange={(v) => set('featured', v)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/admin/projects')}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
