/**
 * Scrapes trading card release/announcement data from aggregator and official sites.
 * Returns normalized array of { name, releaseDate, source, url }.
 */

import * as cheerio from 'cheerio';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const USER_AGENT =
  'Mozilla/5.0 (compatible; ProductWatch/1.0; +https://github.com/samsampsonnn/product-watch)';

function loadSources() {
  const path = join(__dirname, 'sources.json');
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function fetchHtml(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html', ...options.headers },
    signal: AbortSignal.timeout(15000),
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

/**
 * Parse Checklist Insider release calendar.
 * Structure: date headings (e.g. "Apr 30, 2026") followed by product links.
 */
function parseChecklistInsider(html, sourceName, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  let currentDate = null;

  $('h2, h3, h4, a[href*="checklistinsider.com"]').each((_, el) => {
    const $el = $(el);
    const tag = el.name?.toLowerCase();
    const text = $el.text().trim();

    const dateMatch = text.match(
      /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/
    );
    if (dateMatch && (tag === 'h2' || tag === 'h3' || tag === 'h4')) {
      currentDate = text;
      return;
    }

    if (tag === 'a' && currentDate && text && text.length > 3 && text.length < 200) {
      const href = $el.attr('href') || '';
      const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      if (url.includes('checklistinsider.com') && !url.includes('release-calendar')) {
        items.push({
          name: text,
          releaseDate: currentDate,
          source: sourceName,
          url,
        });
      }
    }
  });

  return items;
}

/**
 * Parse Waxstat-style pages. May be sparse if content is JS-rendered.
 */
function parseWaxstat(html, sourceName, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  $('a[href*="waxstat.com/boxes/"]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const href = $el.attr('href') || '';
    if (!text || text.length < 5 || text.length > 150) return;
    const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
    const key = `${text}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);

    let releaseDate = '';
    const row = $el.closest('tr');
    if (row.length) {
      const cells = row.find('td');
      if (cells.length >= 3) releaseDate = $(cells[2]).text().trim();
    }

    items.push({
      name: text,
      releaseDate: releaseDate || 'TBA',
      source: sourceName,
      url,
    });
  });

  return items;
}

/**
 * Parse generic product/release links from official sites (Topps UK, etc.).
 */
function parseOfficialSite(html, sourceName, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  $('a[href*="/product"], a[href*="/products"], a[href*="/release"], a[href*="/new"]').each(
    (_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      const href = $el.attr('href') || '';
      if (!text || text.length < 3 || text.length > 120) return;
      const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      const key = url;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        name: text,
        releaseDate: 'See site',
        source: sourceName,
        url,
      });
    }
  );

  return items;
}

/**
 * Parse Pokemon Press schedule page if it has list/table structure.
 */
function parsePokemonPress(html, sourceName, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  $('a[href*="pokemon.com"]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const href = $el.attr('href') || '';
    if (!text || text.length < 5 || text.length > 150) return;
    if (/^(schedule|products?|home|news)$/i.test(text)) return;
    const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
    const key = `${text}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      name: text,
      releaseDate: 'See schedule',
      source: sourceName,
      url,
    });
  });

  return items;
}

/**
 * Parse digital pack / e-commerce pages for product names and links.
 */
function parseDigitalPack(html, sourceName, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const href = $el.attr('href') || '';
    if (!text || text.length < 3 || text.length > 150) return;
    if (/^(buy|shop|cart|login|sign|search|menu|close|submit|go|next|prev)$/i.test(text)) return;
    const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
    if (!url.includes(new URL(baseUrl).hostname)) return;
    const key = `${text}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      name: text,
      releaseDate: 'See site',
      source: sourceName,
      url,
    });
  });

  return items;
}

async function scrapeOne(source, type) {
  try {
    const html = await fetchHtml(source.url);
    if (source.id.includes('checklist-insider')) {
      return parseChecklistInsider(html, source.name, source.url);
    }
    if (source.id.startsWith('waxstat-')) {
      return parseWaxstat(html, source.name, source.url);
    }
    if (source.id === 'topps-uk') {
      return parseOfficialSite(html, source.name, source.url);
    }
    if (source.id === 'pokemon-press') {
      return parsePokemonPress(html, source.name, source.url);
    }
    if (type === 'digitalPacks') {
      return parseDigitalPack(html, source.name, source.url);
    }
    return parseOfficialSite(html, source.name, source.url);
  } catch (err) {
    console.error(`[scraper] ${source.name} (${source.url}):`, err.message);
    return [];
  }
}

export async function scrapeAll() {
  const { digitalPacks = [], aggregators, official } = loadSources();
  const all = [];
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const source of digitalPacks) {
    const items = await scrapeOne(source, 'digitalPacks');
    all.push(...items);
    await delay(800);
  }
  for (const source of aggregators) {
    const items = await scrapeOne(source, 'aggregator');
    all.push(...items);
    await delay(800);
  }
  for (const source of official) {
    const items = await scrapeOne(source, 'official');
    all.push(...items);
    await delay(800);
  }

  return all;
}
