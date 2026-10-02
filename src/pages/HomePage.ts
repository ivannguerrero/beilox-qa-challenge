import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly originContainer: Locator;
  readonly destinationContainer: Locator;
  readonly dateInput: Locator;
  readonly searchButton: Locator;
  readonly calendar: Locator;
  readonly dropdownOptions: Locator;
  readonly resultDates: Locator;
  readonly noResultsMessage: Locator;
  readonly destinationRequiredMessage: Locator;
  readonly dateRequiredMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.originContainer = page.locator('#select2-PadOrigen-container');
    this.destinationContainer = page.locator('#select2-PadDestino-container');
    this.dateInput = page.locator('#fechaPartida');
    this.searchButton = page.locator('#btnCons');
    this.calendar = page.locator('#cdp-calendar-container .month-wrapper');
    this.dropdownOptions = page.locator('.select2-results__option');
    this.resultDates = page.locator('.fecha');
    this.noResultsMessage = page.getByRole('dialog').getByText(/No encontramos opciones para tu viaje/);
    this.destinationRequiredMessage = page.getByText('Completá el Destino de tu viaje', { exact: true });
    this.dateRequiredMessage = page.getByText('Completá la fecha', { exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async selectOrigin(origin: string): Promise<void> {
    await this.selectFromDropdown(this.originContainer, 'Ingresá desde dónde viajás', origin);
  }

  async selectDestination(destination: string): Promise<void> {
    await this.selectFromDropdown(this.destinationContainer, 'Ingresá hacia dónde viajás', destination);
  }

  async selectDate(day: number): Promise<void> {
    await this.dateInput.click();
    await expect(this.calendar).toBeVisible();
    await this.calendar.locator('.day.toMonth.valid', { hasText: new RegExp(`^${day}$`) }).first().click();
  }

  async clickSearch(): Promise<void> {
    await this.submitSearch();
    await this.page.waitForURL(/pasajes-micro/, { timeout: 20000 });
  }

  async submitSearch(): Promise<void> {
    await this.searchButton.click();
  }

  resultDate(day: number, month: string): Locator {
    return this.resultDates.filter({ hasText: new RegExp(`^${day} ${month}$`) });
  }

  private async selectFromDropdown(container: Locator, placeholder: string, value: string): Promise<void> {
    const searchField = this.page.locator(`.select2-search__field[placeholder="${placeholder}"]`);
    if (!(await searchField.isVisible())) {
      await container.click();
    }
    await expect(searchField).toBeVisible();
    await searchField.fill(value);
    const option = this.dropdownOptions.filter({ hasText: value }).first();
    await expect(option).toBeVisible();
    await option.click();
  }
}