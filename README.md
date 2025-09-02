Runable Visual Editor — paste a React component and edit it visually. Built with Next 15, TypeScript, Tailwind, and a tiny JSX→tree parser.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and paste your component.

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
