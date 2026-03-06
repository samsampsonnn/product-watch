/**
 * Write the product watch report to a markdown file in reports/.
 * Returns the file path and, if REPORT_BASE_URL is set, the full URL to the report.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function groupBySource(products) {
  const bySource = {};
  for (const p of products) {
    const s = p.source || 'Other';
    if (!bySource[s]) bySource[s] = [];
    bySource[s].push(p);
  }
  return bySource;
}

function buildMarkdown(runDateIso, products) {
  const runDate = runDateIso.slice(0, 10);
  const bySource = groupBySource(products);
  const lines = [
    `# Product Watch – ${runDate}`,
    '',
    `Run at: ${runDateIso}`,
    `Total products: ${products.length}`,
    '',
    '---',
    '',
  ];
  for (const [source, items] of Object.entries(bySource)) {
    if (!items.length) continue;
    lines.push(`## ${source}`);
    lines.push('');
    for (const p of items) {
      if (p.url) {
        lines.push(`- **${p.name}** — ${p.releaseDate} — [Link](${p.url})`);
      } else {
        lines.push(`- **${p.name}** — ${p.releaseDate}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Write report to reports/YYYY-MM-DD.md (relative to product-watch/ by default).
 * outDir: optional directory for report file (default: ./reports inside product-watch).
 */
export async function writeReportToFile(products, runDateIso, outDir = null) {
  const dir = outDir ?? join(__dirname, 'reports');
  await mkdir(dir, { recursive: true });
  const runDate = runDateIso.slice(0, 10);
  const filename = `${runDate}.md`;
  const filePath = join(dir, filename);
  const markdown = buildMarkdown(runDateIso, products);
  await writeFile(filePath, markdown, 'utf-8');
  const baseUrl = process.env.REPORT_BASE_URL;
  const reportUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/product-watch/reports/${filename}`
    : null;
  return { filePath, filename, reportUrl };
}
