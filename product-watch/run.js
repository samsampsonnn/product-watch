#!/usr/bin/env node
/**
 * Product watch entrypoint: scrape → filter to last 7 days → write report.
 */

import { scrapeAll } from './scraper.js';
import { filterProductsLast7Days, writeReportToFile } from './report.js';

const runDateIso = new Date().toISOString();

async function main() {
  console.log('[run] Scraping...');
  const allProducts = await scrapeAll();
  console.log(`[run] Found ${allProducts.length} product(s) total.`);

  const products = filterProductsLast7Days(allProducts);
  console.log(`[run] Products in last 7 days: ${products.length}.`);

  console.log('[run] Writing report...');
  const { filePath } = await writeReportToFile(products, runDateIso);
  console.log('[run] Report written to', filePath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
