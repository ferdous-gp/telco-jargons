import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const jargons = JSON.parse(readFileSync(new URL('../jargon.json', import.meta.url), 'utf8'));

test('jargon.json has no duplicate abbreviations', () => {
  const seen = new Map();
  const duplicates = [];
  for (const { abbr } of jargons) {
    const key = abbr.trim().toUpperCase();
    if (seen.has(key)) duplicates.push(abbr);
    seen.set(key, true);
  }
  expect(duplicates, `Duplicate abbr in jargon.json: ${duplicates.join(', ')}`).toEqual([]);
});
