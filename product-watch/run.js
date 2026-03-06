#!/usr/bin/env node
/**
 * Product watch entrypoint: scrape all releases → write report (unique filename, no overwrite).
 */

import { scrapeAll } from './scraper.js';
import { writeReportToFile } from './report.js';

const runDateIso = new Date().toISOString();

async function main() {
  console.log('[run] Scraping...');
  const products = await scrapeAll();
  console.log(`[run] Found ${products.length} product(s).`);

  console.log('[run] Writing report...');
  const { filePath, filename } = await writeReportToFile(products, runDateIso);
  console.log('[run] Report written to', filePath, '(filename:', filename + ')');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
