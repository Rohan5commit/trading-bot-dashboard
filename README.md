# Trading Bot Dashboard

End-to-end system that fetches trading bot daily report emails via IMAP, parses PnL data, stores it in Postgres, and displays an interactive dashboard.

## Architecture

```
┌─────────────────┐     ┌──────────┐     ┌─────────────┐
│  IMAP Mailbox    │────▶│  Worker   │────▶│   Postgres   │
│  (Gmail, etc)   │     │  (Python) │     │              │
└─────────────────┘     └──────────┘     └──────┬──────┘
                                                │
                                         ┌──────▼──────┐
                                         │  Dashboard   │
                                         │  (Next.js)   │
                                         │  on Vercel   │
                                         └─────────────┘
```

- **Worker**: Python script that connects via IMAP, fetches emails matching configured subject patterns, parses PnL data, and upserts into Postgres.
- **Dashboard**: Next.js app deployed on Vercel that reads from Postgres and displays strategy performance.

## Environment Variables

### Worker (.env in worker/)

| Variable | Description | Example |
|---|---|---|
| `IMAP_HOST` | IMAP server hostname | `imap.gmail.com` |
| `IMAP_PORT` | IMAP server port | `993` |
| `IMAP_USE_TLS` | Use TLS for IMAP | `true` |
| `SMTP_USER` | Email address (used for IMAP login) | `you@gmail.com` |
| `SMTP_PASSWORD` | Email password / app password | `your-app-password` |
| `SUBJECT_FILTERS` | Comma-separated email subject patterns | `"Trading Bot Daily Report (Core) - ,Trading Bot Daily Report (AI) - "` |
| `LOOKBACK_DAYS` | How many days back to search | `30` |
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@host:5432/db` |

### Dashboard (Vercel env vars)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (same as worker) |

## Database Setup

Run the migration against your Postgres database:

```bash
psql $DATABASE_URL -f migrations/001_initial.sql
```

This creates the `strategies` and `reports` tables.

## Running the Worker Locally

```bash
cd worker

# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp ../.env.example .env
# Edit .env with your values

# Run a sync cycle
python main.py

# Dry run (parse only, no DB writes)
python main.py --dry-run
```

## Deploying the Worker

### Option 1: Docker

```bash
cd worker
docker build -t trading-bot-worker .
docker run --env-file .env trading-bot-worker
```

### Option 2: Cron job

Add to crontab to run every 15 minutes:

```bash
*/15 * * * * cd /path/to/worker && /usr/bin/python3 main.py >> /var/log/worker.log 2>&1
```

### Option 3: GitHub Actions

See `.github/workflows/sync.yml` (create as needed).

## Running the Dashboard Locally

```bash
cd dashboard

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying the Dashboard to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import the GitHub repo.
4. Set the **Root Directory** to `dashboard`.
5. Add environment variable: `DATABASE_URL` = your Postgres connection string.
6. Deploy.

## Dashboard Pages

- `/` — Overview table with all strategies, latest PnL, sortable columns, positive-only filter.
- `/strategy/[id]` — Strategy detail with time-series charts, stats cards, and full report table.
- Click "View Email" on any report row to see the complete raw email body in a modal.

## Email Format Support

The parser handles subjects like:

```
Trading Bot Daily Report (Core) - 2026-06-22
Trading Bot Daily Report (AI) - 2026-06-22
```

Strategy names are inferred from `(Core)`, `(AI)`, `(Momentum)`, `(Value)`, `(Scalp)` markers in the subject. Add more to `STRATEGY_MAP` in `worker/parser.py` as needed.

Body fields extracted:
- `Unrealized P&L: -1.92% ($-3,837.74)`
- `TOTAL ACCOUNT RETURN: -5.00%`
- `Open Positions: 3`
- `Current Capital Estimate: $99,527.58`
