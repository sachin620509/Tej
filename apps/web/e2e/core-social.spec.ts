import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const password = 'E2e-Strong-Password!123';
const stamp = Date.now().toString(36);
const alice = { name: 'E2E Alice', username: `e2e.alice.${stamp}`, email: `e2e.alice.${stamp}@example.test`, password };
const bob = { name: 'E2E Bob', username: `e2e.bob.${stamp}`, email: `e2e.bob.${stamp}@example.test`, password };
const apiOrigin = 'http://127.0.0.1:4100';
async function registerApi(request: APIRequestContext) { const response = await request.post(`${apiOrigin}/api/auth/register`, { data: bob }); expect(response.ok()).toBeTruthy(); return (await response.json()).data as { accessToken: string; user: { id: string } }; }
async function login(page: Page) { await page.goto('/login'); await page.getByLabel('Email address').fill(bob.email); await page.locator('input[name="password"]').fill(password); await page.getByRole('button', { name: 'Sign in' }).click(); await expect(page).toHaveURL('/'); }

test('register, private follow approval, realtime DM, web call, report and block', async ({ page, request, browser }) => {
  const bobAuth = await registerApi(request);
  expect((await request.patch(`${apiOrigin}/api/profiles/me/privacy`, { headers: { authorization: `Bearer ${bobAuth.accessToken}` }, data: { isPrivate: true } })).ok()).toBeTruthy();
  await page.goto('/register');
  await page.getByLabel('Full name').fill(alice.name); await page.getByLabel('Username').fill(alice.username); await page.getByLabel('Email address').fill(alice.email); await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click(); await expect(page).toHaveURL('/');
  await page.goto('/search'); await page.getByPlaceholder('Username, name, profession or public city').fill(bob.username);
  await expect(page.getByText(`@${bob.username}`, { exact: false })).toBeVisible(); await page.getByRole('link', { name: new RegExp(bob.name) }).click();
  await page.getByRole('button', { name: /Follow$/ }).click(); await expect(page.getByRole('button', { name: /Requested/ })).toBeVisible();
  const requests = await request.get(`${apiOrigin}/api/follow-requests?type=incoming`, { headers: { authorization: `Bearer ${bobAuth.accessToken}` } });
  const requestId = (await requests.json()).data.items[0].id as string;
  expect((await request.post(`${apiOrigin}/api/follow-requests/${requestId}/accept`, { headers: { authorization: `Bearer ${bobAuth.accessToken}` } })).ok()).toBeTruthy();
  await page.reload(); await expect(page.getByRole('button', { name: /Following/ })).toBeVisible(); await page.getByRole('button', { name: /Message/ }).click(); await expect(page).toHaveURL(/\/messages\?id=/);
  const message = `Hello from browser E2E ${stamp}`; await page.getByPlaceholder('Write a message…').fill(message); await page.getByRole('button', { name: 'Send message' }).click(); await expect(page.locator('.message-stream p', { hasText: message })).toBeVisible();
  const bobContext = await browser.newContext({ permissions: ['camera', 'microphone'] }); const bobPage = await bobContext.newPage(); await login(bobPage); await bobPage.goto('/messages'); await expect(bobPage.locator('.message-stream p', { hasText: message })).toBeVisible();
  await bobPage.goto('/calls'); await page.goto('/calls'); await page.getByPlaceholder('Search by name or username').fill(bob.username); await expect(page.getByText(`@${bob.username}`)).toBeVisible();
  await page.getByRole('button', { name: `Audio call ${bob.name}` }).click(); await expect(page.locator('.call-overlay')).toBeVisible(); await expect(bobPage.locator('.call-overlay')).toBeVisible(); await bobPage.locator('.accept').click(); await expect(page.locator('.call-overlay')).toContainText(bob.name); await page.locator('.hangup').click(); await expect(page.locator('.call-overlay')).toBeHidden();
  await page.goto(`/profile/${bob.username}`); await page.getByRole('button', { name: 'Profile options' }).click(); await page.getByRole('button', { name: /Report profile/ }).click(); await page.getByRole('button', { name: 'spam', exact: true }).click();
  await page.getByRole('button', { name: 'Profile options' }).click(); await page.getByRole('button', { name: /Block account/ }).click(); await expect(page.getByText('Profile unavailable')).toBeVisible(); await bobContext.close();
});
