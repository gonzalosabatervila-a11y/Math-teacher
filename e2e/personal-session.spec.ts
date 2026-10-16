import { expect, test } from '@playwright/test';

test('starts, survives reload, finishes, and records history plus review', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar sesión' }).click();
  await expect(page.getByText('Sesión activa')).toBeVisible();
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByRole('button', { name: /Continuar semana 1, sesión 1/ })).toBeVisible();
  await page.getByRole('button', { name: /Continuar semana 1, sesión 1/ }).click();
  await page.getByRole('button', { name: 'Finalizar y guardar' }).click();
  await page.getByLabel('¿Qué falló exactamente en el papel?').fill('Confundí una condición de dominio.');
  await page.getByLabel(/Problema Variante/).fill('Comprueba el dominio de una función equivalente.');
  await page.getByRole('button', { name: 'Guardar en Registro' }).click();
  await expect(page.getByText('Comprueba el dominio de una función equivalente.')).toBeVisible();
  await page.getByRole('button', { name: 'Historial' }).first().click();
  await expect(page.getByText('Sesiones completadas (1)')).toBeVisible();
});
