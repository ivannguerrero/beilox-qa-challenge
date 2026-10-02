import { test, expect } from '@fixtures/test.fixture';
import type { HomePage } from '@pages/HomePage';

async function searchRetiroToEzeiza(homePage: HomePage): Promise<void> {
  await homePage.selectOrigin('Retiro');
  await homePage.selectDestination('Ezeiza');
  await homePage.selectDate(30);
  await homePage.clickSearch();
}

test.describe('Central de Pasajes - Búsqueda de pasajes', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('búsqueda válida devuelve resultados', async ({ homePage, page }) => {
    await searchRetiroToEzeiza(homePage);

    await expect(page).toHaveURL(/pasajes-micro/);
    await expect(homePage.resultDate(30, 'Oct')).toHaveText('30 Oct');
  });

  test('muestra un mensaje cuando no hay servicios para el viaje', async ({ homePage, page }) => {
    await homePage.selectOrigin('Lago Puelo');
    await homePage.selectDestination('Retiro');
    await homePage.selectDate(30);
    await homePage.clickSearch();

    await expect(page).toHaveURL(/pasajes-micro/);
    await expect(homePage.noResultsMessage).toBeVisible();
  });

  test('valida campos obligatorios antes de buscar', async ({ homePage }) => {
    await homePage.submitSearch();

    await expect(homePage.destinationRequiredMessage).toBeVisible();
    await expect(homePage.dateRequiredMessage).toBeVisible();
  });

  test('permite volver desde los resultados a la búsqueda', async ({ homePage, page }) => {
    await searchRetiroToEzeiza(homePage);
    await expect(page).toHaveURL(/pasajes-micro/);

    await page.goBack();

    await expect(page).toHaveURL(/centraldepasajes\.com\.ar\/?$/);
    await expect(homePage.originContainer).toBeVisible();
  });
});