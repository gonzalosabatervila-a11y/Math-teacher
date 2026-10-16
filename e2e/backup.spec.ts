import { expect, test, type Page } from '@playwright/test';

async function completeSession(page: Page) {
  await page.getByRole('button', { name: 'Empezar sesión' }).click();
  await page.getByRole('button', { name: 'Finalizar y guardar' }).click();
  await page.getByLabel('¿Qué falló exactamente en el papel?').fill('Error de signo');
  await page.getByRole('button', { name: 'Guardar en Registro' }).click();
}

test('exports, resets, and restores a validated local backup', async ({ page }) => {
  await page.goto('/');
  await completeSession(page);
  await page.getByRole('button', { name: 'Historial' }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar copia' }).click();
  const path = await (await downloadPromise).path();
  await page.getByRole('button', { name: 'Borrar datos locales' }).click();
  await page.getByRole('button', { name: 'Borrar datos', exact: true }).click();
  await page.getByRole('button', { name: 'Historial' }).first().click();
  await expect(page.getByText('Sesiones completadas (0)')).toBeVisible();
  await page.locator('input[type=file]').setInputFiles(path!);
  await page.getByRole('dialog').getByRole('button', { name: 'Importar copia' }).click();
  await page.getByRole('button', { name: 'Historial' }).first().click();
  await expect(page.getByText('Sesiones completadas (1)')).toBeVisible();
});

test('rejects a future backup without replacing local state', async ({ page }) => {
  await page.goto('/');
  await completeSession(page);
  await page.getByRole('button', { name: 'Historial' }).first().click();
  await page.locator('input[type=file]').setInputFiles({ name: 'future.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'math-teacher-personal-backup', schemaVersion: 99, state: {} })) });
  await expect(page.getByRole('alert')).toContainText('formato compatible');
  await expect(page.getByText('Sesiones completadas (1)')).toBeVisible();
});
