import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('supports keyboard workspace tabs on a narrow screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar sesión' }).click();
  const paper = page.getByRole('tab', { name: 'Papel' });
  const tutor = page.getByRole('tab', { name: 'Profesor' });
  await expect(paper).toHaveAttribute('aria-selected', 'true');
  await paper.focus();
  await page.keyboard.press('ArrowRight');
  await expect(tutor).toHaveAttribute('aria-selected', 'true');
});

test('consumes camera credentials from the fragment and sanitizes the address', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/cam#cam=session_123&key=write_456');
  await expect(page).toHaveURL(/\/cam$/);
  expect(requests.every((url) => !url.includes('credential=') && !url.includes('key=write_456'))).toBe(true);
});
