#!/usr/bin/env node

import {readdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const feedUrl = 'https://medium.com/feed/@developeryusufihsan';
const postsDirectory = new URL('../_posts/', import.meta.url);
const checkOnly = process.argv.includes('--check');
const refresh = process.argv.includes('--refresh');

const unwrapCdata = (value) =>
  value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1');

const decodeXml = (value) =>
  unwrapCdata(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

const field = (item, name) => {
  const escapedName = name.replace(':', '\\:');
  const match = item.match(
    new RegExp(`<${escapedName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedName}>`),
  );
  return decodeXml(match?.[1]?.trim() ?? '');
};

const htmlField = (item, name) => {
  const escapedName = name.replace(':', '\\:');
  const match = item.match(
    new RegExp(`<${escapedName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedName}>`),
  );
  return unwrapCdata(match?.[1]?.trim() ?? '');
};

const categories = (item) =>
  [...item.matchAll(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g)].map(
    (match) => match[1].trim(),
  );

const normalizeTitle = (value) =>
  value
    .normalize('NFKD')
    .replaceAll(/[\u2018\u2019]/g, "'")
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US');

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[\u2018\u2019]/g, '')
    .toLocaleLowerCase('en-US')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');

const yamlString = (value) => JSON.stringify(value);

const canonicalMediumUrl = (value) => {
  const url = new URL(value);
  url.search = '';
  return url.toString();
};

const localDate = (value) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')} +0300`;
};

const cleanMediumHtml = (value) =>
  value
    .replace(
      /<img[^>]+src="https:\/\/medium\.com\/_\/stat\?[^"]+"[^>]*>/g,
      '',
    )
    .replaceAll(/<p>\s*<\/p>/g, '')
    .replaceAll(/<\/(p|figure|pre|h[1-6])>\s*</g, '</$1>\n\n<')
    .trim();

const htmlText = (value) =>
  value
    .replaceAll(/<[^>]+>/g, '')
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll(/\s+/g, ' ')
    .trim();

const firstParagraph = (value) =>
  htmlText(value.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '');

// Medium's RSS feed is intentionally bounded and no longer includes these
// earliest public posts. Keep their canonical records here so a successful
// mirror check means the complete public archive, not only the latest page.
const legacyItems = [
  {
    title:
      "Flutter’da GetX Tabanlı Proje’de Restful API’ler ile çalışma (Part 1)",
    publishedAt: new Date('2022-11-09T09:00:00Z'),
    mediumUrl:
      'https://medium.com/@developeryusufihsan/flutterda-getx-tabanl%C4%B1-proje-de-restful-api-ler-ile-%C3%A7al%C4%B1%C5%9Fma-part-1-3b1a3dae8f5b',
    tags: ['flutter', 'getx', 'rest-api', 'türkçe'],
    description:
      'The first part of an early Turkish tutorial on structuring a REST API flow with Flutter and GetX.',
    html:
      '<p>This early tutorial remains available in full on Medium as part of a three-part Flutter and GetX series.</p>',
  },
  {
    title:
      "Flutter’da GetX Tabanlı Proje’de Restful API’ler ile çalışma (Part 2)",
    publishedAt: new Date('2022-11-09T09:30:00Z'),
    mediumUrl:
      'https://medium.com/@developeryusufihsan/flutterda-getx-tabanl%C4%B1-proje-de-restful-api-ler-ile-%C3%A7al%C4%B1%C5%9Fma-part-2-ba9a8c6aae09',
    tags: ['flutter', 'getx', 'rest-api', 'türkçe'],
    description:
      'The second part of an early Turkish tutorial on Flutter, GetX, and REST API state handling.',
    html:
      '<p>This early tutorial remains available in full on Medium as part of a three-part Flutter and GetX series.</p>',
  },
  {
    title:
      "Flutter’da GetX Tabanlı Proje’de Restful API’ler ile çalışma (Part 3)",
    publishedAt: new Date('2022-11-09T10:00:00Z'),
    mediumUrl:
      'https://medium.com/@developeryusufihsan/flutterda-getx-tabanl%C4%B1-proje-de-restful-api-ler-ile-%C3%A7al%C4%B1%C5%9Fma-part-3-ce6e1592d5b8',
    tags: ['flutter', 'getx', 'rest-api', 'türkçe'],
    description:
      'The final part of an early Turkish tutorial completing the Flutter and GetX REST API example.',
    html:
      '<p>This early tutorial remains available in full on Medium as part of a three-part Flutter and GetX series.</p>',
  },
];

const response = await fetch(feedUrl, {
  headers: {'user-agent': 'yusufihsangorgel.github.io Medium sync'},
});
if (!response.ok) {
  throw new Error(`Medium RSS returned HTTP ${response.status}.`);
}

const xml = await response.text();
const feedItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map((match) => match[1])
  .map((item) => ({
    title: field(item, 'title'),
    publishedAt: new Date(field(item, 'pubDate')),
    mediumUrl: canonicalMediumUrl(field(item, 'link')),
    tags: categories(item),
    html: cleanMediumHtml(htmlField(item, 'content:encoded')),
  }))
  .map((item) => ({...item, description: firstParagraph(item.html)}));
const items = [...feedItems, ...legacyItems]
  .filter((item, index, all) => {
    const title = normalizeTitle(item.title);
    return all.findIndex((candidate) => normalizeTitle(candidate.title) === title) === index;
  });

const existingFiles = (await readdir(postsDirectory)).filter((name) =>
  name.endsWith('.md'),
);
const existingByTitle = new Map();
for (const name of existingFiles) {
  const source = await readFile(new URL(name, postsDirectory), 'utf8');
  const title = source.match(/^title:\s*(.+)$/m)?.[1]?.trim();
  if (title) {
    let normalized;
    try {
      normalized = normalizeTitle(JSON.parse(title));
    } catch {
      normalized = normalizeTitle(title.replace(/^["']|["']$/g, ''));
    }
    existingByTitle.set(normalized, {
      name,
      mediumUrl: source.match(/^medium_url:\s*"([^"]+)"$/m)?.[1],
    });
  }
}

const missing = items.filter(
  (item) => !existingByTitle.has(normalizeTitle(item.title)),
);

if (checkOnly) {
  if (missing.length > 0) {
    console.error(
      `Medium has ${missing.length} post(s) missing from the mirror:\n${missing
        .map((item) => `- ${item.title}`)
        .join('\n')}`,
    );
    process.exitCode = 1;
  } else {
    console.log('Medium mirror is current.');
  }
} else {
  const targets = items.filter((item) => {
    const existing = existingByTitle.get(normalizeTitle(item.title));
    return !existing || (refresh && existing.mediumUrl);
  });
  for (const item of targets) {
    const isoDay = item.publishedAt.toISOString().slice(0, 10);
    const existing = existingByTitle.get(normalizeTitle(item.title));
    const fileName =
      existing?.name ?? `${isoDay}-${slugify(item.title)}.md`;
    const destination = join(postsDirectory.pathname, fileName);
    const source = `---
layout: post
title: ${yamlString(item.title)}
date: ${localDate(item.publishedAt)}
tags: [${item.tags.map(yamlString).join(', ')}]
medium_url: ${yamlString(item.mediumUrl)}
canonical_url: ${yamlString(item.mediumUrl)}
description: ${yamlString(item.description)}
---

<p><em>Also published on <a href="${item.mediumUrl}">Medium</a>.</em></p>

${item.html}
`;
    await writeFile(destination, source);
    console.log(`${existing ? 'Refreshed' : 'Added'} ${fileName}`);
  }

  if (targets.length === 0) {
    console.log('Medium mirror is already current.');
  }
}
