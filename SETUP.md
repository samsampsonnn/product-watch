# Product Watch – Setup Walkthrough

Reports are stored in this repo under **product-watch/reports/**. No Notion, email, or secrets required.

---

## Step 1: Push the code to GitHub

The workflow expects this repo layout on GitHub:

- Repo root: `.github/workflows/product-watch.yml`, `README.md`, and a `product-watch/` folder (with `run.js`, `report.js`, `package.json`, etc.).

**Option A – You already have the repo in this workspace**

1. Initialize git if needed and add the remote:
   ```bash
   cd "/Users/ssampson/AI Stuff/Cursor automations"
   git init
   git remote add origin https://github.com/samsampsonnn/product-watch.git
   ```
2. Add and commit, then push:
   ```bash
   git add .github product-watch/package.json product-watch/package-lock.json product-watch/*.js product-watch/sources.json README.md SETUP.md .gitignore
   git commit -m "Add product watch automation"
   git branch -M main
   git push -u origin main
   ```
   (If the repo already has content, pull first: `git pull origin main --rebase`, then push.)

**Option B – Clone the repo fresh and copy files**

1. Clone and enter the repo:
   ```bash
   git clone https://github.com/samsampsonnn/product-watch.git
   cd product-watch
   ```
2. Copy into the clone:
   - `.github/` folder
   - `product-watch/` folder (all `.js`, `sources.json`, `package.json`, `package-lock.json`; do **not** copy `node_modules`)
   - `README.md`, `SETUP.md`, `.gitignore`
3. Commit and push:
   ```bash
   git add .
   git commit -m "Add product watch automation"
   git push origin main
   ```

---

## Step 2: Workflow permissions

So the workflow can commit new reports:

1. On GitHub, open **Settings** → **Actions** → **General**.
2. Under **Workflow permissions**, select **Read and write permissions**.
3. Save.

---

## Step 3: Run it

1. **Manual run**
   - **Actions** → **Product Watch** → **Run workflow** → **Run workflow**.
   - Wait for the job to finish (usually 1–2 minutes).
   - A new report appears at **product-watch/reports/YYYY-MM-DD.md** and is committed to the repo.

2. **Scheduled run**
   - The workflow runs every **Monday at 9:00 UTC** (9:00 GMT / 10:00 BST). No extra setup needed.

---

## Test locally (optional)

```bash
cd product-watch
npm install
node run.js
```

This scrapes and writes a report to **product-watch/reports/**; the report is not committed unless you commit it yourself.

---

## Troubleshooting

- **Empty or partial product list**
  - Some sites (e.g. Topps UK, Waxstat under load) may timeout or return 403. The run still completes and reports whatever was scraped (e.g. from Checklist Insider).

- **Workflow fails on “Install dependencies”**
  - Ensure the repo has a `product-watch` folder at the root with `package.json` and `package-lock.json` (and that you didn’t push `node_modules`).

- **“Commit and push report” fails**
  - In **Settings** → **Actions** → **General**, set workflow permissions to **Read and write permissions**.
