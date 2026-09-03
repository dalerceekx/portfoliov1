# Personal portfolio & website aggregator

A single-page personal site with a secure admin panel. Every piece of content on
the public page — name, headline, bio, skills, projects, social links, SEO tags,
accent colours — is stored in PostgreSQL and edited from `/admin`. Nothing
personal is hardcoded in the UI.

```
Browser → Nginx → React (static)          Admin browser → Nginx → React
                     ↓                                          ↓
                   /api  → Express → Prisma → PostgreSQL   authenticated /api
```

## Stack

| Layer    | Choice                                                     |
| -------- | ---------------------------------------------------------- |
| Frontend | React 18, TypeScript (strict), Tailwind CSS, Vite           |
| Backend  | Node 22, Express, TypeScript (strict), Zod                  |
| Data     | PostgreSQL 16, Prisma                                       |
| Auth     | Argon2id, JWT in httpOnly cookies, rotating refresh tokens  |
| Infra    | Docker, Nginx                                               |

### Design system

The palette, type scale and radii follow Apple's marketing-site system, defined
once in `web/tailwind.config.ts` and referenced by token everywhere else:

| Token                | Value     | Used for                              |
| -------------------- | --------- | ------------------------------------- |
| `canvas`             | `#FFFFFF` | page ground                           |
| `surface`            | `#F5F5F7` | alternating full-bleed band, footer   |
| `obsidian`           | `#000000` | the flagship project tile             |
| `graphite`           | `#1D1D1F` | primary text — never pure black       |
| `slate` / `mute`     | `#6E6E73` / `#86868B` | secondary text, captions  |
| `hairline`           | `#D2D2D7` | the only border colour on the site    |
| `accent`             | `#0071E3` | links, buttons, focus rings           |

Type is SF Pro on Apple hardware and Inter everywhere else, at Apple's weights
(600 for headings, never 700+) and tracking. Sections separate by full-bleed
background change rather than by drawing boxes, buttons use Apple's 980px pill,
and blue is reserved for things you can click. The accent is the one colour the
admin can retint; everything else is fixed.

No animation library, no UI kit, no state library. The production JS is ~50 kB
gzipped for the public page; the admin panel is a separate lazy-loaded chunk that
a normal visitor never downloads.

---

## Running it locally

You need Node 20+ and a PostgreSQL instance.

```bash
# 1. Backend
cd server
cp .env.example .env          # fill in DATABASE_URL and JWT_ACCESS_SECRET
npm install
npm run prisma:migrate -- init   # creates and applies the first migration
npm run seed                  # creates the admin account and starter content
npm run dev                   # http://localhost:4000

# 2. Frontend (second terminal)
cd web
npm install
npm run dev                   # http://localhost:5173
```

Vite proxies `/api` and `/uploads` to port 4000, so cookies stay same-origin in
development exactly as they do in production.

`prisma migrate dev` builds a throwaway *shadow database* to diff your schema
against, so the Postgres role in `DATABASE_URL` needs permission to create
databases. Without it the command stops at `Error: P3014`. Grant it once:

```bash
sudo -u postgres psql -c "ALTER ROLE portfolio CREATEDB;"
```

That grant is optional here. `npm run prisma:migrate -- <name>` does not use a
shadow database at all: it diffs the live database against `schema.prisma`,
writes the same `prisma/migrations/<timestamp>_<name>/` folder `migrate dev`
would, applies it, and records it in `_prisma_migrations`.

```bash
npm run prisma:migrate -- add-project-notes
```

Once the role does have CREATEDB, `npm run prisma:migrate:shadow` gives you
stock `prisma migrate dev` with its drift detection and reset prompts.
`npx prisma migrate deploy`, which is what the Docker entrypoint runs, never
needs a shadow database either.

Sign in at <http://localhost:5173/admin/login> with the credentials you put in
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

### Generating secrets

```bash
openssl rand -base64 48
```

`JWT_ACCESS_SECRET` must be at least 32 characters — the server refuses to boot
otherwise, rather than starting with a weak default.

---

## Running it with Docker

```bash
cp .env.example .env          # set POSTGRES_PASSWORD, JWT_ACCESS_SECRET, SEED_ADMIN_*
docker compose up -d --build

# once, to create the first admin and the starter content
docker compose exec api npm run seed:prod
```

Migrations are applied automatically on container start, so `up` is enough after
the first time.

The site is on <http://localhost:8081> (change `WEB_PORT` in `.env` if that
clashes). PostgreSQL is not published to the host — only the `api` container can
reach it.

### The variables that decide whether a deployment is safe

| Variable            | Meaning                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `PUBLIC_SITE_URL`   | The address in the visitor's browser bar. Drives CORS, canonical URLs and the cookie flags. |
| `COOKIE_SECURE`     | Must be `true` whenever `PUBLIC_SITE_URL` is `https`.              |
| `TRUST_PROXY_HOPS`  | Reverse proxies in front of the API: `1` for Nginx alone, `2` behind an ALB or CloudFront. |
| `COMPOSE_PROFILES`  | `bundled-db` runs Postgres in a container; leave it empty and set `DATABASE_URL` to use RDS. |

The API audits these at boot and refuses to start on a combination that would
fail silently — an `https` site with `COOKIE_SECURE=false`, for instance, where
the browser discards the session cookie and every request after login is
anonymous with nothing in the logs to say why. Anything merely suspect (a
`PUBLIC_SITE_URL` still pointing at localhost) is printed as a warning instead.

`TRUST_PROXY_HOPS` is the one that is easy to get wrong and hard to notice.
Undercount the proxies and Express reads the wrong entry from
`X-Forwarded-For`, so every visitor arrives as the same address: the per-IP rate
limits become one shared bucket, and five failed logins from anyone at all lock
you out of your own admin panel for fifteen minutes.

---

## Deploying to AWS

One `t3.small` instance running all three containers, behind an Application Load
Balancer that terminates TLS. Bigger than `t3.micro` on purpose: the frontend
build runs `tsc` and Vite in one Node process, and 1 GB is where that gets
OOM-killed.

### 1. Infrastructure

[`deploy/aws-provision.sh`](deploy/aws-provision.sh) creates the whole thing —
security groups, instance, load balancer, ACM certificate, backup bucket and the
IAM role that writes to it — in whichever account the AWS CLI is pointed at.

```bash
AWS_REGION=eu-central-1 DOMAIN=example.com KEY_NAME=my-keypair \
  ./deploy/aws-provision.sh --plan     # prints what it would create, changes nothing

AWS_REGION=eu-central-1 DOMAIN=example.com KEY_NAME=my-keypair \
  ./deploy/aws-provision.sh
```

Every step checks whether its resource already exists first, so the script is
safe to re-run — which matters, because it stops and waits if the certificate
needs DNS validation. When the domain is in Route 53 it writes the validation
records and the alias record itself; otherwise it prints the CNAMEs to add at
your DNS provider and asks you to run it again.

It leaves you with an ALB on `:443`, `:80` redirecting to it, and a target group
health-checking **`/healthz`** — which Nginx answers directly, without waking the
API or filling the access log. `KEY_NAME` is optional: the instance role includes
Session Manager, so `aws ssm start-session --target <id>` works without SSH.

Costs while it exists: roughly $16/month for the load balancer, $15 for the
instance, $2 for the disk. The certificate is free.

[`deploy/aws-destroy.sh`](deploy/aws-destroy.sh) removes it all again. It keeps
the backup bucket unless you pass `--delete-backups`, because after the instance
is gone that bucket holds the only copy of the data.

<details>
<summary>Doing it by hand instead</summary>

Launch Amazon Linux 2023, `t3.small`, 20 GB gp3, with
[`deploy/ec2-user-data.sh`](deploy/ec2-user-data.sh) pasted into **Advanced
details → User data** — it installs Docker and the Compose plugin, adds 2 GB of
swap, and caps the Docker log files.

Two security groups: the load balancer's takes `80` and `443` from anywhere; the
instance's takes `80` from the load balancer's group only, plus `22` from your
own address. Nothing else needs to be open — Postgres is not published to the
host at all.

Request a certificate in **ACM** in the same region, then create an Application
Load Balancer with a `:443` HTTPS listener forwarding to a target group on port
`80`, and a `:80` listener redirecting to it. Point the target group's health
check at `/healthz`, and an A (alias) record at the load balancer.

</details>

### 2. Deploy

```bash
ssh ec2-user@<instance>
git clone <your-repo> /opt/portfolio && cd /opt/portfolio

cp .env.production.example .env
openssl rand -base64 48        # once per secret, into .env
vi .env                        # PUBLIC_SITE_URL, COOKIE_SECURE=true, TRUST_PROXY_HOPS=2

docker compose up -d --build
docker compose exec api npm run seed:prod
```

Then delete `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`: the account
exists in the database now, and re-running the seed will not change it.
`npm run admin:password -- '<new>'` rotates it later.

Updating afterwards is `git pull && docker compose up -d --build`. Migrations
run themselves on container start.

### 3. Backups

The bundled Postgres and the uploaded images live on the instance's EBS volume.
Terminate the instance without a copy and every project, message and image goes
with it. [`deploy/backup.sh`](deploy/backup.sh) dumps both and copies them to
S3; give the instance an IAM role with `s3:PutObject` on the bucket and run it
nightly:

```bash
sudo crontab -e
0 3 * * * BACKUP_S3_URI=s3://my-bucket/portfolio /opt/portfolio/deploy/backup.sh >> /var/log/portfolio-backup.log 2>&1
```

[`deploy/restore.sh`](deploy/restore.sh) puts a pair of those archives back.
Test it once, on purpose, before you need it.

### Using RDS instead

Managed backups, patching and failover, for the cost of a second instance. In
`.env`, blank out `COMPOSE_PROFILES` and set `DATABASE_URL`:

```bash
COMPOSE_PROFILES=
DATABASE_URL=postgresql://portfolio:PASSWORD@db.abc123.eu-central-1.rds.amazonaws.com:5432/portfolio?schema=public&sslmode=require
```

The `db` container is then never created and the API connects straight to RDS.
Put the instance in the same VPC and allow `5432` from its security group.

### Without a load balancer

`web/nginx/tls.conf.example` terminates TLS in the container with a Certbot
certificate, and redirects `:80` to `:443`. Keep `TRUST_PROXY_HOPS=1` in that
setup — there is only Nginx in front of the API — and remember that `certbot
renew` cannot reload Nginx inside a container on its own.

### What this deployment is not

One instance, in one availability zone. Uploads sit on its EBS volume and the
rate limiter counts in that process's memory, so both assume a single API
container. Scaling out means moving uploads to S3 and the limiter to Redis
first; nothing else in the stack objects.

---

## Commands

```bash
# server/
npm run dev              # watch mode
npm run build            # tsc → dist/
npm start                # run the build
npm test                 # vitest
npm run typecheck
npm run prisma:migrate -- <name>   # create + apply a migration (no shadow db)
npm run prisma:migrate:shadow     # stock `prisma migrate dev` (needs CREATEDB)
npm run admin:password -- '<pw>'  # rotate the admin password
npm run prisma:deploy    # apply migrations in production
npm run seed

# deploy/ (from your machine, against AWS)
./deploy/aws-provision.sh --plan      # show what would be created
./deploy/aws-provision.sh             # create it; safe to re-run
./deploy/aws-destroy.sh               # remove it again

# deploy/ (on the server)
./deploy/backup.sh                    # database + uploads -> S3
./deploy/restore.sh <db.gz> <up.gz>   # put them back

# web/
npm run dev
npm run build            # tsc -b && vite build
npm run preview
npm run typecheck
```

---

## Project layout

```
server/
├── prisma/
│   ├── schema.prisma          Admin, Project, SiteSettings, SocialLink,
│   │                          ContactMessage, LoginLog, RefreshToken
│   └── seed.ts
└── src/
    ├── config/env.ts          validated environment, fails fast
    ├── lib/                   prisma client, redacting logger
    ├── middleware/            auth, csrf, validate, rateLimit, error
    ├── modules/
    │   ├── auth/              password, tokens, cookies, service, routes
    │   ├── projects/
    │   ├── settings/
    │   ├── contact/
    │   ├── security/
    │   └── uploads/
    ├── utils/                 http, slug, sanitize, request, async
    ├── tests/
    ├── routes.ts              one place that mounts every router
    ├── app.ts                 express assembly
    └── index.ts               listen + graceful shutdown

web/src/
├── api/client.ts              the only place fetch() is called
├── services/                  projectService, settingsService, authService…
├── hooks/                     useAsync, useAuth, useToast, useDocumentMeta…
├── components/
│   ├── layout/  navigation/  hero/  about/  projects/  contact/  ui/
├── pages/
│   ├── Home.tsx  NotFound.tsx  Login.tsx
│   └── admin/                 AdminLayout, Dashboard, ProjectsList,
│                              ProjectForm, SettingsPage, MessagesPage,
│                              SecurityPage
├── styles/index.css           design tokens, atmosphere, reduced motion
└── types/

web/nginx/
├── default.conf               SPA host + API proxy, TLS terminated in front
├── security-headers.conf      included per location; see Security notes
└── tls.conf.example           standalone TLS, for a box without a load balancer

deploy/
├── aws-provision.sh           creates the AWS resources; idempotent
├── aws-destroy.sh             removes exactly those again
├── aws-lib.sh                 helpers shared by the two above
├── ec2-user-data.sh           first-boot setup for an Amazon Linux instance
├── backup.sh                  database + uploads → S3
└── restore.sh                 puts a pair of those archives back
```

---

## API

Public, read-only:

```
GET    /api/health
GET    /api/settings
GET    /api/projects            ?category=&featured=
GET    /api/projects/categories
POST   /api/contact
```

Authentication:

```
GET    /api/auth/csrf
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/password
```

Admin — every route re-checks the session server-side:

```
GET    /api/admin/stats
GET    /api/admin/projects            POST /api/admin/projects
GET    /api/admin/projects/:id        PATCH  /api/admin/projects/:id
PATCH  /api/admin/projects/reorder    DELETE /api/admin/projects/:id
GET    /api/admin/settings            PATCH  /api/admin/settings
POST   /api/admin/settings/social-links
PATCH  /api/admin/settings/social-links/:id
DELETE /api/admin/settings/social-links/:id
GET    /api/admin/messages            PATCH  /api/admin/messages/:id/read
                                      DELETE /api/admin/messages/:id
GET    /api/admin/security/login-logs
GET    /api/admin/security/sessions
POST   /api/admin/uploads
```

Every response has the same shape:

```json
{ "success": true, "data": { } }
{ "success": false, "message": "Check the highlighted fields.", "code": "BAD_REQUEST", "errors": { "email": "Enter a valid email address." } }
```

---

## Security notes

**Passwords** are hashed with Argon2id at the OWASP-recommended parameters
(19 MiB, t=2, p=1). Minimum 12 characters with an uppercase letter, a number and
a symbol, enforced on both sides. Passwords are never logged — the logger redacts
`password`, `cookie` and `authorization` before anything is written.

**Sessions** use a short-lived JWT access token (15 min) in an httpOnly,
SameSite=Lax cookie, plus an opaque refresh token stored as a SHA-256 hash. The
refresh token rotates on every use, so a stolen one is burned as soon as either
party spends it. Nothing sensitive is kept in `localStorage`. Changing the
password revokes every other session.

**Brute force**: five consecutive failures lock the account for 15 minutes, and
the login endpoint is separately capped at 5 attempts per 15 minutes per IP. The
error is always `Invalid credentials.` — the endpoint cannot be used to find out
which email addresses exist. Missing accounts still pay the cost of a hash
verification so the timing does not give it away either.

**CSRF**: a random token is set in an httpOnly cookie and returned in the
response body; the SPA holds it in memory and echoes it in `X-CSRF-Token`. Every
POST/PATCH/DELETE compares the two in constant time. A cross-origin form can
neither read the cookie nor set the header.

**XSS**: project and settings text is plain text by design. Input is stripped of
markup, output is escaped by React, and the CSP blocks inline and third-party
scripts. `dangerouslySetInnerHTML` appears nowhere in the codebase.

**URLs**: only `http:`, `https:` and `mailto:` are accepted anywhere a link is
stored, so `javascript:` and `data:` payloads cannot be saved through the admin
panel. Image fields accept managed `/uploads/…` paths or absolute http(s) URLs.

**Uploads** are held in memory, re-decoded and re-encoded to WebP with sharp —
which both proves the bytes are an image and drops any embedded payload — then
written under a server-generated filename. Client filenames are discarded.

**SQL injection** is structurally prevented: every query goes through Prisma,
there is no raw SQL in the codebase.

**Theming** cannot inject CSS. The admin panel stores two validated hex colours,
which are converted to RGB channels and set as custom properties.

**Response headers** are set in two places, because two servers answer. Helmet
covers the API; Nginx covers everything it serves itself, from a snippet included
per location. That repetition is deliberate: `add_header` does not merge across
levels in Nginx, so a location declaring one of its own silently drops the whole
inherited set — which is exactly how a site ends up serving its own index.html
with no CSP. `/api` is left to Helmet alone so no header arrives twice with two
different values.

**Client IP** resolution is configured, not guessed: `TRUST_PROXY_HOPS` says how
many proxies to look through in `X-Forwarded-For`. Everything that counts per
visitor — the rate limits, the login log — is only as truthful as that number,
so it is covered by tests rather than left to a comment.

**Login attempts** are recorded with timestamp, IP, user agent, outcome and
reason, viewable at `/admin/security`.

### Tests

```bash
cd server && npm test
```

Covers the password policy and Argon2 round-trip, slug and sanitiser behaviour
(including `javascript:` URLs and path traversal), CSRF middleware in all four
states, security headers, structured 404s, unauthenticated access to every admin
route, validation of malformed and oversized request bodies, and client IP
resolution at zero, one and two proxy hops.

---

## Editing content

Everything lives under `/admin`:

- **Dashboard** — counts, last update, recent sign-in activity.
- **Projects** — create, edit, delete (with confirmation), publish/unpublish,
  feature, reorder, upload a preview image, set category and tags.
- **Site settings** — name, headline, bio, skills, profile image, contact copy,
  SEO title/description/canonical/share image, accent colours, social links.
- **Messages** — everything sent through the contact form, with read state.
- **Security** — change password, review sign-in log.

The seed data uses real starting content; replace the placeholder social URLs
with your own before publishing.

## Accessibility

Semantic landmarks, one `h1` per page, a skip link, visible focus rings on every
interactive element, 44px minimum touch targets, labelled inputs with error and
hint associations, focus trapping and restoration in dialogs, `aria-live` toasts,
and full `prefers-reduced-motion` support.

## Adding a language later

Copy lives in two places only: the database (personal content, already
per-record) and the static UI labels inside components. Adding Uzbek or Russian
means extracting those labels into a dictionary and adding a `locale` column —
no architectural change is needed. A translation layer is deliberately not
included, since only one language is in use today.
