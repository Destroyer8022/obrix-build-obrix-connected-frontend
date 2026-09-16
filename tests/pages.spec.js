import { test, expect } from '@playwright/test';

const base = process.env.PAGES_TEST_BASE || '/';
const path = route => `${base}${route.replace(/^\//, '')}`;

test('Pages bundle supports its deployment prefix, assets, role navigation and deep refreshes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(path('/'));
  await expect(page.getByRole('heading', { name: /Build better/ })).toBeVisible();
  const stylesheet = page.locator('link[rel="stylesheet"]').first();
  const css = await stylesheet.getAttribute('href');
  expect(css).toMatch(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}assets/`));
  expect((await page.request.get(css)).status()).toBe(200);
  await page.goto(path('/projects/p1'));
  await expect(page.getByRole('heading', { name: 'Skyline Residences · Phase II' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Skyline Residences · Phase II' })).toBeVisible();
  await page.goto(path('/login'));
  await page.getByRole('button', { name: 'contractor', exact: true }).click();
  await page.locator('select[name="userId"]').selectOption('t1');
  await page.getByRole('button', { name: 'Enter workspace' }).click();
  await expect(page).toHaveURL(new RegExp(`${path('/contractor/dashboard')}$`));
  await page.goto(path('/contractor/attendance'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Daily hajri. Clear and connected.' })).toBeVisible();
  expect(errors).toEqual([]);
});
