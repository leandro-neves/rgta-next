# AI Assistant Instructions for rgta-project

This repository is a **Next.js 16 + TypeScript + Tailwind CSS** scaffold focused on a court booking application. The aim of these notes is to help an AI coding agent become productive quickly by highlighting architecture, conventions, and developer workflows specific to this codebase.

---

## 🚧 High‑Level Architecture

- **Frontend** lives under `src/app` (App Router). Pages are `.tsx` files and fetch data via the built‑in `fetch`/`TanStack Query` hooks.
- **UI components** are in `src/components` with a subfolder `ui` containing `shadcn/ui` wrappers (see e.g. `button.tsx`, `table.tsx`).
- **State/hooks**: custom hooks under `src/hooks` (e.g. `use-mobile.ts`, `use-toast.ts`).
- **Utilities** in `src/lib` (`db.ts` exports a singleton Prisma client, `utils.ts` for helpers).
- **API**: each directory under `src/app/api` corresponds to an endpoint. Files export `GET`, `POST`, `PUT`, `DELETE` functions taking `NextRequest` and returning `NextResponse.json(...)`.
- **Database**: Prisma ORM using SQLite. Schema at `prisma/schema.prisma` defines models `User`, `Court`, `Booking` with related enums (roles, court/surface types, booking status, etc.). The shared client is created in `src/lib/db.ts` and reused; some older routes instantiate a new `PrismaClient()` directly (see `admin/stats/route.ts`).
- **Auth**: minimal login/register routes under `src/app/api/auth`. `next-auth` package is included but not heavily configured here.
- **Domain**: business logic revolves around court bookings. See examples in `src/app/api/bookings/route.ts` for weekend‑only rules, time range checks, and max bookings per slot.
- **Miscellaneous**: `skills/` directory contains independent tools/scripts (Python and TypeScript) each with its own `SKILL.md` for reference; not part of the Next.js build. `mini-services/` is currently empty but reserved for side processes (e.g. websocket example in `examples/websocket`).

---

## 🛠️ Developer Workflows

- **Dependencies & runtime** use **bun** (not npm/yarn).
  ```bash
  bun install
  bun run dev     # development server on port 3000 (logs to dev.log)
  bun run build   # production build, copies to .next/standalone
  bun run start   # run production bundle via bun (logs to server.log)
  ```
- **Database commands** also use bun scripts: `db:push`, `db:migrate`, `db:reset`, `db:generate`. They map to Prisma CLI.
- **Linting**: `bun run lint` runs `eslint`; most rules are disabled (see `eslint.config.mjs`). Logging and `console.log` statements are common and permitted.
- **Environment variables**: only `DATABASE_URL` is required for Prisma. `.z-ai-config` is git‑ignored if using the `z-ai` CLI.
- **Logs**: dev and prod logs are captured via `tee` in npm scripts; inspect `dev.log` / `server.log` for output.
- **Prisma client handling**: follow the pattern in `src/lib/db.ts` to avoid new clients per request; reuse the global cache in development.
- **Error handling**: API functions wrap code in `try/catch`; they log to console and return a JSON object with an `error` field and appropriate HTTP status. Messages are usually in Portuguese.

---

## 📁 Conventions & Styles

1. **Imports** use the `@/` alias for `src/` paths everywhere.
2. **API routes** are headed by `export async function <METHOD>(req: NextRequest) { ... }`.
3. **Validation** is manual (no Zod in routes currently); query parameters are parsed via `new URL(req.url).searchParams`.
4. **Relational queries** often include nested `include`/`select` to return user/court info alongside bookings.
5. **Enums** from Prisma (e.g. `BookingStatus`) may be imported for comparisons.
6. **Styling**: Tailwind classes with `tw-animate-css` and `tailwind-merge` are used; global styles are in `src/app/globals.css`.
7. **Component naming** matches file name (e.g. `Carousel` from `carousel.tsx`).
8. **Language**: Portuguese for UI labels, error messages, and some comments.
9. **TypeScript config** allows ignored build errors (`ignoreBuildErrors: true` in `next.config.ts`); the codebase is forgiving.

---

## 🔗 Integration Points

- **Prisma** – update `prisma/schema.prisma` and run `bun run db:migrate` or `db:push` then use the generated client.
- **NextAuth** – look at auth routes; environment vars (e.g. `NEXTAUTH_URL`, providers) are configured elsewhere or assumed.
- **Z‑AI CLI** – installed as `z-ai`/`z-ai-generate` via `z-ai-web-dev-sdk`; use for generating code snippets or scaffolding.
- **External skills** – each folder under `skills/` has its own dependencies and usage notes; do not modify them unless explicitly adding new utilities.

---

## 🧩 Common AI Tasks & Examples

- **Add a new resource**: create `src/app/api/<resource>/route.ts` with CRUD handlers, import `db` and follow the style of existing endpoints. Update Prisma schema if persistence is needed.
- **Create UI components**: copy patterns from `components/ui/*` and wrap radix/shadcn elements with Tailwind cva utilities.
- **Business logic**: look at booking validation in `bookings/route.ts` for examples of weekend checks, slot limits, and handling conflicting reservations.
- **Database helpers**: modify or add functions in `src/lib/utils.ts` and import them across routes or components.

---

> **Note:** This project currently has no automated tests; use manual verification and logs. When adding tests, follow existing TypeScript patterns and keep human‑readable comments.

Feel free to ask for clarification or propose additional sections. It's okay to iterate on this document after initial writing! 👇

---

*End of Copilot instructions.*
