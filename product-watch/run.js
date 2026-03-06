#!/usr/bin/env node
/**
 * Product watch entrypoint: scrape → write report to repo.
 */

import { scrapeAll } from './scraper.js';
import { writeReportToFile } from './report.js';

const runDateIso = new Date().toISOString();

async function main() {
  console.log('[run] Scraping...');
  const products = await scrapeAll();
  console.log(`[run] Found ${products.length} product(s).`);

  console.log('[run] Writing report...');
  const { filePath } = await writeReportToFile(products, runDateIso);
  console.log('[run] Report written to', filePath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
