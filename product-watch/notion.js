/**
 * Notion integration: ensure "Product Watch Runs" database exists under the parent page,
 * create a new run page with report content, return the page URL.
 */

import { Client } from '@notionhq/client';

const DATABASE_TITLE = 'Product Watch Runs';

function normalizeId(id) {
  if (!id || typeof id !== 'string') return '';
  return id.replace(/-/g, '');
}

function richText(text) {
  return [{ type: 'text', text: { content: String(text).slice(0, 2000), link: null } }];
}

export function createNotionClient(apiKey) {
  if (!apiKey) throw new Error('NOTION_API_KEY is required');
  return new Client({ auth: apiKey });
}

/**
 * Find or create the Product Watch Runs database under the given page.
 */
export async function getOrCreateDatabase(notion, parentPageId) {
  const parentId = normalizeId(parentPageId);
  const search = await notion.search({
    query: DATABASE_TITLE,
    filter: { property: 'object', value: 'database' },
    page_size: 10,
  });
  for (const obj of search.results || []) {
    if (obj.parent?.type === 'page_id' && normalizeId(obj.parent.page_id) === parentId) {
      return obj.id;
    }
  }
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: DATABASE_TITLE } }],
    properties: {
      Name: { title: {} },
      'Run date': { date: {} },
    },
  });
  return db.id;
}

/**
 * Create a run page in the database and append report content as blocks. Returns page URL.
 */
export async function createRunPage(notion, databaseId, runDateIso, productsBySource) {
  const runDateShort = runDateIso.slice(0, 10);

  const page = await notion.pages.create({
    parent: { type: 'database_id', database_id: databaseId },
    properties: {
      Name: { title: [{ type: 'text', text: { content: `Run ${runDateShort}` } }] },
      'Run date': { date: { start: runDateShort } },
    },
  });

  if (!page?.id) throw new Error('Failed to create Notion page');

  const blocks = [];
  blocks.push({
    type: 'heading_2',
    heading_2: { rich_text: richText('Products by source') },
  });
  for (const [source, items] of Object.entries(productsBySource)) {
    if (!items.length) continue;
    blocks.push({
      type: 'heading_3',
      heading_3: { rich_text: richText(source) },
    });
    for (const p of items.slice(0, 100)) {
      const line = p.url
        ? `${p.name} — ${p.releaseDate} — ${p.url}`
        : `${p.name} — ${p.releaseDate}`;
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: richText(line.slice(0, 2000)) },
      });
    }
  }
  if (blocks.length > 1) {
    for (let i = 0; i < blocks.length; i += 100) {
      const chunk = blocks.slice(i, i + 100);
      await notion.blocks.children.append({ block_id: page.id, children: chunk });
    }
  }

  const url = page.url || `https://notion.so/${page.id.replace(/-/g, '')}`;
  return url;
}

/**
 * Build products grouped by source from flat list.
 */
export function groupBySource(products) {
  const bySource = {};
  for (const p of products) {
    const s = p.source || 'Other';
    if (!bySource[s]) bySource[s] = [];
    bySource[s].push(p);
  }
  return bySource;
}

export async function writeReport(notion, parentPageId, runDateIso, products) {
  const databaseId = await getOrCreateDatabase(notion, parentPageId);
  const productsBySource = groupBySource(products);
  const pageUrl = await createRunPage(notion, databaseId, runDateIso, productsBySource);
  return pageUrl;
}
