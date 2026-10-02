import { test, expect } from '@playwright/test';

const EXAMPLES = [
  ['FOC', 'Free of Cost'],
  ['ECM', 'Ericsson Catalog Management'],
  ['EOC', 'Ericsson Order Care'],
  ['DOB', 'Direct Operator Billing'],
  ['DCB', 'Direct Carrier Billing'],
  ['BSS', 'Business Support System'],
  ['EDW', 'Enterprise Data Warehouse'],
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
});

test('search box is focused on load', async ({ page }) => {
  await expect(page.locator('#search')).toBeFocused();
});

test('logo loads above the title', async ({ page }) => {
  const logo = page.locator('#logo');
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
});

test('every jargon entry has abbr and full form', async ({ request }) => {
  const data = await (await request.get('/jargon.json')).json();
  expect(Array.isArray(data)).toBe(true);
  const seen = new Set();
  for (const j of data) {
    expect(typeof j.abbr).toBe('string');
    expect(typeof j.full).toBe('string');
    expect(j.abbr.trim().length).toBeGreaterThan(0);
    expect(j.full.trim().length).toBeGreaterThan(0);
    expect(seen.has(j.abbr.toUpperCase()), `duplicate abbr ${j.abbr}`).toBe(false);
    seen.add(j.abbr.toUpperCase());
  }
});

for (const [abbr, full] of EXAMPLES) {
  test(`typing ${abbr} char-by-char suggests it and click shows "${full}"`, async ({ page }) => {
    const input = page.locator('#search');
    const options = page.locator('#suggestions [role="option"]');

    // Type one key at a time, faster than the debounce, like a real user.
    await input.pressSequentially(abbr, { delay: 80 });

    const option = options.filter({ hasText: full });
    await expect(option).toBeVisible();
    await expect(options.first()).toContainText(abbr);

    await option.click();

    await expect(page.locator('#result')).toBeVisible();
    await expect(page.locator('#result-abbr')).toHaveText(abbr);
    await expect(page.locator('#result-full')).toHaveText(full);
    await expect(page.locator('#suggestions')).toBeHidden();
    await expect(input).toHaveValue(abbr);
  });

  test(`typing ${abbr} lowercase and pressing Enter shows "${full}"`, async ({ page }) => {
    await page.locator('#search').pressSequentially(abbr.toLowerCase(), { delay: 80 });
    await expect(page.locator('#suggestions [role="option"]').first()).toContainText(abbr);
    await page.keyboard.press('Enter');
    await expect(page.locator('#result-full')).toHaveText(full);
  });
}

test('partial input shows multiple suggestions and arrow keys pick one', async ({ page }) => {
  const options = page.locator('#suggestions [role="option"]');
  await page.locator('#search').pressSequentially('E', { delay: 80 });

  await expect(options.filter({ hasText: 'ECM' })).toBeVisible();
  await expect(options.filter({ hasText: 'EOC' })).toBeVisible();
  await expect(options.filter({ hasText: 'EDW' })).toBeVisible();

  await page.locator('#search').pressSequentially('O', { delay: 80 });
  await expect(options.first()).toContainText('EOC');

  await page.keyboard.press('ArrowDown');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('#result-full')).toHaveText('Ericsson Order Care');
});

test('searching by full form finds the abbreviation', async ({ page }) => {
  await page.locator('#search').pressSequentially('carrier', { delay: 50 });
  const option = page.locator('#suggestions [role="option"]').filter({ hasText: 'DCB' });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.locator('#result-full')).toHaveText('Direct Carrier Billing');
});

test('search is debounced: no suggestions until typing pauses', async ({ page }) => {
  const input = page.locator('#search');
  await input.press('B');
  // Immediately after the keystroke the debounce timer hasn't fired yet.
  await expect(page.locator('#suggestions')).toBeHidden();
  await expect(page.locator('#suggestions [role="option"]').filter({ hasText: 'BSS' })).toBeVisible();
});

test('unknown input shows a no-match message', async ({ page }) => {
  await page.locator('#search').pressSequentially('zzzq', { delay: 50 });
  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#suggestions')).toBeHidden();
});

test('Escape closes the suggestion list', async ({ page }) => {
  await page.locator('#search').pressSequentially('D', { delay: 50 });
  await expect(page.locator('#suggestions')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#suggestions')).toBeHidden();
});

test('search box animates while typing and settles after the debounce', async ({ page }) => {
  const wrap = page.locator('#search-wrap');
  await page.locator('#search').press('E');
  await expect(wrap).toHaveClass(/is-typing/);
  await expect(page.locator('#suggestions')).toBeVisible();
  await expect(wrap).not.toHaveClass(/is-typing/);
});

test('no match offers a prefilled GitHub issue to request the jargon', async ({ page }) => {
  await page.locator('#search').pressSequentially('VoNR', { delay: 50 });
  const link = page.locator('#request');
  await expect(link).toBeVisible();
  await expect(link).toContainText('VoNR');

  const url = new URL(await link.getAttribute('href'));
  expect(url.origin + url.pathname).toBe('https://github.com/ferdous-gp/telco-jargons/issues/new');
  expect(url.searchParams.get('title')).toBe('Add jargon: VoNR');
  expect(url.searchParams.get('labels')).toBe('jargon-request');
  expect(url.searchParams.get('body')).toContain('**Abbreviation:** VoNR');
  await expect(link).toHaveAttribute('target', '_blank');
});

test('hint shows the jargon count and keyboard shortcuts', async ({ page, request }) => {
  const data = await (await request.get('/jargon.json')).json();
  const hint = page.locator('#hint');
  await expect(page.locator('#count')).toHaveText(`${data.length} jargons`);
  await expect(hint).toContainText('to navigate');
  await expect(hint).toContainText('Enter');
  await expect(hint).toContainText('to search');
});
