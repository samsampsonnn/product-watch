/**
 * Write the product watch report to a markdown file in reports/.
 * Returns the file path and, if REPORT_BASE_URL is set, the full URL to the report.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

/**
 * Parse release date string (e.g. "Apr 30, 2026", "Mar 10, 2026") to Date.
 * Returns null for TBA, "See site", or unparseable strings.
 */
function parseReleaseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const t = str.trim();
  if (/^TBA$|^See\s|^N\/A$/i.test(t)) return null;
  const m = t.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Filter products to those released within the last 7 days (release date between 7 days ago and today).
 * Products with unparseable release dates (e.g. TBA) are excluded so the report is only dated releases.
 */
export function filterProductsLast7Days(products) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  return products.filter((p) => {
    const d = parseReleaseDate(p.releaseDate);
    if (d === null) return false;
    return d >= start && d <= now;
  });
}

const DIGITAL_PACK_SOURCES = new Set([
  'Courtyard',
  'Arena Club (Slab Packs)',
  'Power Packs (GameStop)',
]);

const CATEGORY_ORDER = [
  'Baseball',
  'Basketball',
  'Football',
  'Hockey',
  'Soccer',
  'Pokemon',
  'One Piece',
  'Wrestling',
  'Multi-Sport',
  'Other',
  'Digital Packs',
];

function getCategory(product) {
  if (DIGITAL_PACK_SOURCES.has(product.source)) return 'Digital Packs';
  const name = (product.name || '').toLowerCase();
  if (/pokémon|pokemon/.test(name)) return 'Pokemon';
  if (/baseball/.test(name)) return 'Baseball';
  if (/basketball|wnba/.test(name)) return 'Basketball';
  if (/football|nfl/.test(name)) return 'Football';
  if (/hockey|nhl/.test(name)) return 'Hockey';
  if (/soccer|fifa|liga|uefa|premier league/.test(name)) return 'Soccer';
  if (/one piece/.test(name)) return 'One Piece';
  if (/wrestling|wwe/.test(name)) return 'Wrestling';
  if (/multi-sport|multi sport|non-sport|magical|super\b/.test(name)) return 'Multi-Sport';
  return 'Other';
}

function groupByCategory(products) {
  const byCategory = {};
  for (const p of products) {
    const c = getCategory(p);
    if (!byCategory[c]) byCategory[c] = [];
    byCategory[c].push(p);
  }
  return byCategory;
}

function buildMarkdown(runDateIso, products) {
  const runDate = runDateIso.slice(0, 10);
  const byCategory = groupByCategory(products);
  const lines = [
    `# Product Watch – ${runDate}`,
    '',
    `Run at: ${runDateIso}`,
    'Releases from the last 7 days.',
    `Total products: ${products.length}`,
    '',
    '---',
    '',
  ];
  for (const category of CATEGORY_ORDER) {
    const items = byCategory[category];
    if (!items?.length) continue;
    lines.push(`## ${category}`);
    lines.push('');
    for (const p of items) {
      const sourceLabel = p.source ? ` (${p.source})` : '';
      if (p.url) {
        lines.push(`- **${p.name}**${sourceLabel} — ${p.releaseDate} — [Link](${p.url})`);
      } else {
        lines.push(`- **${p.name}**${sourceLabel} — ${p.releaseDate}`);
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
