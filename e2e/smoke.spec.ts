import { expect, test } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Sheettomate/i).first()).toBeVisible();
});

test('legal pages exist', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: /Terms/i })).toBeVisible();
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /Privacy/i })).toBeVisible();
});
