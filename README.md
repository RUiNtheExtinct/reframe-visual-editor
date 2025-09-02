Runable Visual Editor — paste a React component and edit it visually. Built with Next 15, TypeScript, Tailwind, React Query, Drizzle ORM (Postgres), and a tiny JSX→tree parser.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and paste your component.

## Environment

Create a `.env` file with (Supabase compatible):

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
DRIZZLE_DATABASE_URL=${DATABASE_URL}
# Optional if you deploy behind a custom domain
NEXT_PUBLIC_BASE_URL=
```

## Database / Drizzle

Schema is in `src/db/schema.ts`.

Generate and push migrations (optional — we directly use schema at runtime, but migrations are recommended):

```bash
pnpm dlx drizzle-kit generate
pnpm dlx drizzle-kit push
```

## Tech

- Visual editor with selection and inspector controls
- React Query + Axios for typed API calls (`src/lib/api.ts`)
- Drizzle ORM + Postgres only (no file writes) (`src/lib/store.ts` → `src/db/*`)
- Only light/dark themes, brand: red primary with subtle green accents

## Scripts

- pnpm dev — run locally
- pnpm build — production build
- pnpm lint / pnpm lint:fix — ESLint
- pnpm typecheck — TypeScript type checks
- pnpm format — Prettier formatting

## API

- POST /api/component — create and persist a component
- GET /api/component/[id] — fetch a component
- PUT /api/component/[id] — update a component

## CI/CD

GitHub Actions workflow deploys to Vercel on push to main. Add repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

### How to get Vercel values via Vercel CLI

1. Install and login

```bash
pnpm dlx vercel@latest login
pnpm dlx vercel whoami
```

2. Link this project (creates `.vercel/project.json` with `projectId` and `orgId`)

```bash
pnpm dlx vercel link
cat .vercel/project.json
```

Use those as `VERCEL_PROJECT_ID` and `VERCEL_ORG_ID`.

3. Create `VERCEL_TOKEN`

- Recommended: create a token at https://vercel.com/account/tokens
- Or via CLI: open the URL prompted by `pnpm dlx vercel login` and then create a token on the dashboard.

4. (Optional) Inspect via CLI

```bash
pnpm dlx vercel projects ls --json | jq
pnpm dlx vercel teams ls --json | jq
```
