# Development

## First Run

Install dependencies and prepare PostgreSQL:

```bash
pnpm install
pnpm db:setup
```

`db:setup` starts the `postgres` Compose service, generates Prisma Client, and
applies committed migrations. It also creates `.env` from `.env.example` without
overwriting an existing file. The default connection is:

```text
postgresql://postgres:postgres@localhost:5432/quanti
```

Override `DATABASE_URL` and `DIRECT_URL` when using another PostgreSQL instance.

## Run Modes

Start API and browser frontend together:

```bash
pnpm dev
```

Start components independently:

```bash
pnpm dev:api
pnpm dev:desktop
```

Start the native Tauri application while the API is running:

```bash
pnpm dev:tauri
```

## Demo Data

With the API available on port `3100`, run:

```bash
pnpm demo:seed
```

The idempotent seed creates:

- one product, warehouse, customer, and bank account;
- a posted purchase that adds opening stock;
- a posted sale;
- a posted partial incoming payment allocated to the sale.

Set `QUANTI_API_BASE_URL` if the API is not at `http://localhost:3100`.
The packaged desktop configuration currently supports the local API at
`http://localhost:3100`.

## Troubleshooting

`API unavailable` means the frontend cannot reach `/health`. Check:

```bash
curl http://localhost:3100/health
```

If the API returns `Unexpected server error`, verify Docker and migrations:

```bash
docker compose ps
pnpm db:migrate
```

Useful database commands:

```bash
pnpm db:up
pnpm db:down
pnpm db:generate
pnpm db:migrate
```

`docker compose down` preserves the named PostgreSQL volume. Add `--volumes`
manually only when intentionally deleting local data.

PDF printing requires Chrome or Chromium. If it is not installed in a standard
location, set `PUPPETEER_EXECUTABLE_PATH` in `.env`.
