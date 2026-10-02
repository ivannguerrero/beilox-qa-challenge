import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { apiResources, assertResponseSchema, type ApiResource } from '@api/schemas';

const responseTimeLimitMs = 5000;
const snapshotDirectory = resolve(process.cwd(), 'tests', 'api', 'snapshots');

function expectReasonableResponseTime(resource: ApiResource, startedAt: number): void {
  const elapsedMs = performance.now() - startedAt;
  expect(
    elapsedMs,
    `${resource} response took ${Math.round(elapsedMs)}ms; limit is ${responseTimeLimitMs}ms`,
  ).toBeLessThan(responseTimeLimitMs);
}

async function saveHappyPath(resource: ApiResource, body: unknown): Promise<void> {
  const serializedBody = JSON.stringify(body, null, 2);
  if (serializedBody === undefined) {
    throw new Error(`Could not serialize the ${resource} happy-path response`);
  }

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(resolve(snapshotDirectory, `${resource}.json`), `${serializedBody}\n`, 'utf8');
}

for (const resource of apiResources) {
  test.describe(`${resource} API`, () => {
    test('returns a valid happy-path response and saves its JSON body', async ({ request }) => {
      const startedAt = performance.now();
      const response = await request.get(`${resource}/1`, { timeout: responseTimeLimitMs });

      expect(response.status()).toBe(200);
      expectReasonableResponseTime(resource, startedAt);
      expect(response.headers()['content-type']).toContain('application/json');
      const body: unknown = JSON.parse(await response.text());
      assertResponseSchema(resource, 'success', body);
      await saveHappyPath(resource, body);
    });

    for (const invalidId of ['9999999', 'invalid-id']) {
      test(`returns a valid not-found response for ID "${invalidId}"`, async ({ request }) => {
        const startedAt = performance.now();
        const response = await request.get(`${resource}/${invalidId}`, {
          timeout: responseTimeLimitMs,
        });

        expect(response.status()).toBe(404);
        expectReasonableResponseTime(resource, startedAt);
        expect(response.headers()['content-type']).toContain('application/json');
        const body: unknown = JSON.parse(await response.text());
        assertResponseSchema(resource, 'notFound', body);
      });
    }
  });
}
