# Trading Card Product Watch

Weekly automation that scrapes trading card release and announcement data from major manufacturers and aggregator sites and writes a markdown report into this repo.

- **Schedule**: Every Monday at 9:00 AM UK time (GitHub Actions uses UTC: 9:00 GMT / 10:00 BST).
- **Reports**: Each run creates `product-watch/reports/YYYY-MM-DD.md` with a breakdown by source. Only products **released in the last 7 days** are included (plus any with unknown dates like TBA). The workflow commits and pushes so all reports live in the repo.

## Repo

- **GitHub**: [github.com/samsampsonnn/product-watch](https://github.com/samsampsonnn/product-watch)
- **Reports**: After each run, see **product-watch/reports/** for the latest and past reports.

## Sites scraped

- **Digital Packs**: [Courtyard](https://courtyard.io/), [Arena Club Slab Packs](https://arenaclub.com/slab-packs), [Power Packs (GameStop)](https://powerpacks.gamestop.com/).
- **Aggregators**: Checklist Insider (release calendar), Waxstat (Topps, Panini, Upper Deck calendars).
- **Official**: Topps UK (uk.topps.com), Pokémon TCG (press.pokemon.com schedule).

Reports are grouped by **sport/franchise** (Baseball, Basketball, Football, Hockey, Soccer, Pokemon, One Piece, Wrestling, Multi-Sport, Other) with a separate **Digital Packs** section for the three digital pack sites.

URLs and parsers are in `product-watch/sources.json` and `product-watch/scraper.js`. If a site changes layout, you may need to update the scraper. Some sites (e.g. Topps UK, Waxstat under load) may return 403 or timeouts; the run continues and reports whatever was successfully scraped.

## Setup

1. Push the code to the repo (see [SETUP.md](SETUP.md) if needed).
2. In **Settings** → **Actions** → **General**, set workflow permissions to **Read and write** so the workflow can commit new reports.
3. **Run**: **Actions** → **Product Watch** → **Run workflow** for a manual run, or wait for the Monday schedule.

No secrets are required; the workflow only needs permission to push commits.

## Local run

```bash
cd product-watch
npm install
node run.js
```

The report is written to `product-watch/reports/YYYY-MM-DD.md` locally (it is not committed unless you do so yourself).

## Structure

- `.github/workflows/product-watch.yml` – Monday cron + manual trigger; commits new reports to the repo.
- `product-watch/run.js` – Entrypoint: scrape → write report.
- `product-watch/report.js` – Writes markdown report to `product-watch/reports/`.
- `product-watch/scraper.js` – Fetches and parses sources from `sources.json`.
- `product-watch/sources.json` – URLs for aggregator and official sites.
- `product-watch/reports/` – Markdown reports (one file per run, committed by the workflow).

## Adding or changing sources

Edit `product-watch/sources.json` (add URLs under `aggregators` or `official`). If a site needs different parsing, update the corresponding parser in `product-watch/scraper.js`.
