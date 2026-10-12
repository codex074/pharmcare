<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PharmCare OPD

Web app where hospital pharmacists (โรงพยาบาลอุตรดิตถ์) record outpatient pharmaceutical care. A pharmacist types or scans an HN, the app pulls the patient's name and today's clinic from the hospital HIS, shows any earlier care history, and the pharmacist picks one of five care types to record.

It replaces a Claude artifact prototype. That prototype's rules and calculations are the functional spec; this app moves the data onto the user's own infrastructure, shares PharmShift's logins, and enforces record integrity inside Postgres.

## Where things live

- `deploy/PLAN.md` — the approved plan: architecture, roles SQL, deploy and failover steps, verification. **Gitignored** (infra detail). Read it before any work on auth, database roles, deploy, failover, backup, or `his-relay`.
- `docs/PROGRESS.md` — step checklist and items waiting on the user. Update it and push at the end of every step.
- `docs/design/` — the UI source of truth (see UI below).
- `docs/DEVELOPMENT.md` — local setup and dev accounts.
- `relay/` — `his-relay`, a separate program that runs inside the hospital network (not part of the Next.js build).

## Working agreements

- The user follows progress from their phone through Remote Control and GitHub. End each step with: `docs/PROGRESS.md` updated → commit → push → a short Thai summary.
- **Production gate**: stop and get the user's explicit yes before anything that touches production — creating roles or the database on CT 103, changing PharmShift's `failover.sh` / `nightly-backup.sh` / standby README, adding the Cloudflare tunnel hostname or DNS, nginx on the VPS, any SSH that changes state.
- Patient data in the repo is always fictional (the design and seeds use names like "นายสมมติ ทดสอบ", HN 69000xx). Exports, dumps and `.env*` are gitignored; keep it that way.
- UI text is Thai; identifiers, comments and commit messages are English. Talk to the user in Thai.
- Pin dependency versions exactly and prefer releases at least ~2 weeks old; this app holds health data.

## Architecture

```
normal:    browser → Cloudflare → tunnel (pve1, CT 103) → pharmcare-web → pharmshift-db
                                                                          ├ database postgres  (pharmshift users, read-only)
                                                                          └ database pharmcare (this app)
              CT 103 Postgres ──WAL stream (whole cluster)──▶ Hostinger VPS standby
failover:  browser → Cloudflare → VPS nginx → pharmcare-web (VPS) → promoted standby
```

- PharmCare's data is a **separate database `pharmcare` inside PharmShift's existing Postgres cluster** on CT 103. Physical replication, PharmShift's nightly `pg_dumpall` backup and its auto-failover therefore cover PharmCare for free. The cost is a shared blast radius, so the app role is capped (`CONNECTION LIMIT 10`, `statement_timeout 15s`) and must stay light.
- On the VPS, `pharmcare-web` stays stopped while the database is a read-only standby; `failover.sh` starts it after promotion and flips both DNS records. `/api/health` is what failover polls — keep it cheap and honest (503 when either database is unreachable).
- Domain: `pharmcare.codex074.com`, always Cloudflare-proxied (hospital PCs reject Let's Encrypt chains). `codex074.tech` expires 2027-08-01; nothing new binds to it.
- Docker Compose on the servers: project `name: pharmcare` pinned, container names prefixed `pharmcare-`, service keys distinct from PharmShift's (`db`, `app`, `rest`, `kong`, `realtime`, `meta`, `studio`) because the containers share a network — same-named services silently round-robin DNS. Reach the database by container name `pharmshift-db`.

## Databases and roles

Two connections, both as role `pharmcare_app`:

- `DATABASE_URL` → database `pharmcare`. SELECT / INSERT / UPDATE only — **no DELETE on any table**, SELECT only on `audit_log` (only the definer trigger writes it), no DDL. Old `login_attempts` are pruned through the definer function `purge_login_attempts()`. Every CSV export is recorded by calling the definer function `log_export(table, rows, filters)` inside `withActor` (`export_log` is SELECT-only for the app).
- `AUTH_DATABASE_URL` → PharmShift's `postgres` database. Column-level `SELECT` on `public.users` (`id, pha_id, prefix, f_name, l_name, role, password, is_active, must_change_password`) and nothing else. Reading another `users` column needs a new GRANT on the primary — a production-gated change.

`pharmcare_owner` owns the `pharmcare` database and runs migrations (`MIGRATION_DATABASE_URL`, drizzle-kit). Drizzle owns tables (`lib/db/schema.ts`); triggers, functions and GRANTs are hand-written SQL migrations (`drizzle-kit generate --custom`, statements separated by `--> statement-breakpoint`). **Every new table needs a GRANT migration for `pharmcare_app`**, and every new clinical table must be added to the trigger loop in `drizzle/0003_record_integrity.sql`'s pattern.

Never grant a pharmcare role to `authenticator` / `anon` / `authenticated`: PostgREST at `db.codex074.com` only serves the `postgres` database, which is what keeps `pharmcare` off the public API.

The dev database (`dev/`) mirrors this layout exactly, including the roles and the column grant, so permission bugs show up locally.

## Authentication

Same `pha_id` / password as PharmShift, separate login (different origin, so no shared cookie). Mirror PharmShift's `app/api/auth/login/route.ts`, `lib/password.ts`, `lib/session.ts` with these differences:

- Allowed: `role IN ('pharmacist','admin')` and `is_active = true`. Everyone else gets "เฉพาะเภสัชกร".
- `pha_id` is `trim().toLowerCase()`d before lookup.
- Refuse `must_change_password = true` and plaintext (non-bcrypt) passwords with "กรุณาเปลี่ยนรหัสผ่านใน PharmShift ก่อน" — PharmCare cannot rehash because it has no write access to `users`.
- Rate limit 5 failures per `pha_id` and 30 per IP in 15 minutes, stored in `pharmcare.login_attempts`; client IP from `CF-Connecting-IP`.
- Cookie `pharmcare_session`: jose HS256 JWT signed with PharmCare's own `SESSION_JWT_SECRET`, httpOnly, secure, `sameSite=lax`, 12-hour sliding.
- `requireUser()` re-checks role and `is_active` against `users` on every server request (5-minute cache), so revoking access in PharmShift takes effect within 5 minutes.
- Mutations also check the `Origin` header.
- Next 16: request interception lives in `proxy.ts` (Node runtime), not `middleware.ts`; `cookies()` / `headers()` are async. Keep `proxy.ts` to JWT verification and redirects; database checks belong in `requireUser()`.

## Record integrity

These are enforced in Postgres so that a bug or a hand-written query cannot bypass them:

- **No deletes.** A record is *cancelled* (`cancelled_at`, `cancelled_by`, `cancel_reason`). Cancelled rows still show, struck through with their reason, and are excluded from every statistic.
- **Audit by trigger.** `AFTER INSERT OR UPDATE` triggers (SECURITY DEFINER, owned by `pharmcare_owner`) write `audit_log` with a per-column diff. The actor comes from `current_setting('app.user_id')`, and `app.user_name`, which every write sets through `withActor(user, tx => …)` in `lib/db` (`set_config(..., true)`, transaction-local) — a write without it fails. Never write clinical tables outside `withActor`.
- **Owner-only edits.** A `BEFORE UPDATE` trigger rejects changes when `app.user_id <> created_by`, and `created_by` / `created_at` are immutable. Exception: anyone may update the HIS-synced columns of `patients` (name, sex, birthdate, `his_synced_at`); that is a sync, and it is still audited. Everyone can read everything and add new records to any patient.
- Coded values (DRP category, NCC MERP, outcome, ADR type, device …) are stored as stable English codes from `lib/codes.ts`, which also holds the Thai labels; the schema turns those lists into CHECK constraints, so adding a code needs a migration.
- Shared columns on every clinical table: `id uuid`, `created_by`, `created_by_name`, `created_at`, `updated_by`, `updated_at`, `cancelled_*`, `is_sample`.

## Patient lookup (HIS)

The HIS sits on the hospital LAN; pve1 and the VPS cannot reach it, and a browser on an https page cannot call a plain-http LAN API. `his-relay` bridges this: it runs on an always-on hospital machine, connects out through its own Cloudflare tunnel (`his-relay.codex074.com`, Cloudflare Access service token plus a header secret), and exposes one endpoint, `GET /patient?hn=`.

- Name source: the hospital's central API (spec in `../usc-bod/PATIENT-LOOKUP-API.md`). `GET /api/hosxp/patient` with the HN **in a JSON body on a GET** — Node `http` / axios can send that, browser `fetch` cannot. Empty `data` → fall back to `/api/hosxp/HIS` with a second token. Returns `hn, pname, fname, lname, vn, oqueue`; full name is `pname + fname + " " + lname`. Tokens are expiring JWTs: surface 401 clearly.
- Clinic source: the central API has none. Use the pharmacy queue program's API by `vn` if its Swagger offers it; otherwise the pharmacist picks the clinic.
- App side: `lib/his/` defines `PatientLookup`, with `QueueRelayLookup` (when `HIS_RELAY_URL` is set) and `NoopLookup`. Lookup times out at 3 s; on timeout, error or no match the UI shows the yellow "ดึงข้อมูลจาก HIS ไม่ได้" band and manual name/clinic fields. The app always works without the relay.
- Full names are stored (approved by the user and the hospital); national ID numbers are never stored.

## UI

The design in `docs/design/` is the source of truth; read `docs/design/README.md` and the matching board before building any screen.

- `app/theme.css` is `docs/design/theme.css` with the font hooked to `next/font` (`--font-thai`). Style with its classes (`.pc`, `.card`, `.btn-pri`, `.chip.ok`, `.band.warn`, `.opt.on`, `.care`, `.tbl`, `.tl-item` …) and its CSS variables. No Tailwind. When the design needs something new, extend `theme.css` with variables so dark mode keeps working.
- Dark theme: class `dark` on the `.pc` root, remembered in a cookie.
- Layout: sidebar 264px + 62px header; under 900px the sidebar becomes a drawer. Forms open as a 520px right-hand panel on desktop and full screen on mobile.
- Dates in Thai with the Buddhist year (วันจันทร์ที่ 12 ตุลาคม 2569); numbers use `.mono` for tabular figures.
- Hospital logo: `public/logo-utth.png`.

## Domain

Five care types, each its own table and form:

| Care type | Table | Notes |
|---|---|---|
| ติดตามโรคเรื้อรัง (Visit) | `visits` | SBP/DBP/FBS/HbA1c/LDL/SCr, adherence % + method, medication reconciliation (required), SOAP |
| ปัญหาจากการใช้ยา (DRP) | `drps` | one problem per record; 8 types; NCC MERP A–I; intervention; physician response; outcome (`รอติดตาม` until closed) |
| ยาความเสี่ยงสูง | `high_alert_monitoring` | drug, monitored value vs. target range, dose, events, contributing factors, management |
| ADR / แพ้ยา | `adrs` | Naranjo 10 questions scored live; type "แพ้ยา" raises the red allergy band on the patient |
| สอนเทคนิคการใช้ยา | `technique_assessments` | device checklist from `lib/checklists.ts`; score % and whether every critical step passed; rounds ก่อนสอน / หลังสอน / ติดตามซ้ำ |

Calculations live in `lib/calc/` with unit tests, ported from the prototype (read it with the `Artifact` tool: `https://claude.ai/artifact/UzsAa7JSwYnWX7qadLfpph`):

- eGFR — CKD-EPI 2021 from SCr, age at the test date, sex.
- TTR — Rosendaal linear interpolation, skipping gaps over 56 days.
- Naranjo — ≥9 ใช่แน่นอน, 5–8 น่าจะใช่, 1–4 อาจจะใช่, ≤0 น่าสงสัย.
- At-target uses the patient's own targets (defaults HbA1c < 7, BP < 140/90, LDL < 100, INR 2–3).

KPIs count only non-cancelled rows; physician-acceptance % counts only consulted-and-answered DRPs; resolved % counts only closed DRPs; clinical outcomes and TTR use each patient's latest values regardless of the selected period.

Out of scope for now: appointments / follow-up scheduling. Add later as a separate `appointments` table without touching existing tables.

## Before pushing

Run `lint`, `typecheck`, `test` and `build` (all in `package.json`), and for UI work open the page in the browser pane in light and dark, desktop and 390px wide. The dev database must be up (`db:up`) for anything touching data.
