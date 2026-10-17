import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { threadHtml, tweetHtml, mediaThreadHtml } from '../fixtures';

let context: BrowserContext;
let extensionId: string;
test.beforeAll(async () => {
  const profile = await mkdtemp(path.join(tmpdir(), 'aceattortw-test-'));
  const extension = path.resolve('dist');
  context = await chromium.launchPersistentContext(profile, { channel: process.env.PW_EXECUTABLE_PATH ? undefined : 'chromium', executablePath: process.env.PW_EXECUTABLE_PATH, headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  extensionId = new URL(worker.url()).host;
  // Tests never contact or publish to a real X session.
  await context.route('https://x.com/**', route => route.fulfill({ contentType: 'text/html', body: threadHtml }));
  await context.route('https://twitter.com/**', route => route.fulfill({ contentType: 'text/html', body: threadHtml }));
});
test.afterAll(async () => { await context?.close(); });

async function openStudio(page: Page) {
  const next = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Create Ace Attorney Courtroom' }).nth(1).click();
  const studio = await next; await studio.waitForLoadState();
  await expect(studio.locator('#generate')).toBeEnabled(); return studio;
}

test('real MV3 injection, storage handoff, dynamic navigation, selection and both themes/hosts', async () => {
  const page = await context.newPage();
  await page.goto('https://x.com/Bob/status/101');
  await expect(page.getByRole('button', { name: 'Create Ace Attorney Courtroom' })).toHaveCount(4);
  await page.evaluate(() => document.querySelector('main')!.append(document.createElement('div')));
  await expect(page.locator('ace-attortw-action')).toHaveCount(4);
  const studio = await openStudio(page);
  await expect(studio.locator('input:checked')).toHaveCount(2);
  await expect(studio.locator('.message').nth(2).locator('input')).not.toBeChecked();
  await expect(studio.locator('.message').nth(3).locator('input')).toBeDisabled();
  await studio.screenshot({ path: 'test-results/studio-light.png', fullPage: true });
  await studio.emulateMedia({ colorScheme: 'dark' });
  await studio.screenshot({ path: 'test-results/studio-dark.png', fullPage: true });
  await studio.locator('.message').nth(2).locator('input').check();
  await expect(studio.locator('input:checked')).toHaveCount(3);
  await studio.getByRole('button', { name: 'Move up message from Carol' }).click();
  await expect(studio.locator('.message').nth(1)).toContainText('Carol');
  await studio.close();
  await page.evaluate(() => history.pushState({}, '', '/home'));
  await expect(page.locator('ace-attortw-action')).toHaveCount(0);
  await page.evaluate(() => history.pushState({}, '', '/Bob/status/101'));
  await expect(page.locator('ace-attortw-action')).toHaveCount(4);
  await page.evaluate(html => document.querySelector('main')!.insertAdjacentHTML('beforeend', html), tweetHtml('104', 'New', 'Asynchronously loaded'));
  await expect(page.locator('ace-attortw-action')).toHaveCount(5);
  await page.goto('https://twitter.com/Bob/status/101');
  await expect(page.locator('ace-attortw-action')).toHaveCount(4);
  await page.close();
});

test('GIF root survives the handoff and selecting the last tweet does not move it before its context', async () => {
  const page = await context.newPage();
  await page.route('https://x.com/Latest/status/203', route => route.fulfill({ contentType: 'text/html', body: mediaThreadHtml }));
  await page.goto('https://x.com/Latest/status/203');
  await expect(page.getByRole('button', { name: 'Create Ace Attorney Courtroom' })).toHaveCount(4);
  const opened = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Create Ace Attorney Courtroom' }).last().click();
  const studio = await opened;
  await expect(studio.locator('#generate')).toBeEnabled();
  await expect(studio.locator('.message strong')).toHaveText(['Root Display · @Root', 'Builder Display · @Builder', 'Reader Display · @Reader', 'Latest Display · @Latest']);
  await expect(studio.locator('.message').first().locator('p')).toHaveText('First paragraph.\n\nThe complete second paragraph about courtroom videos.');
  await expect(studio.locator('input:checked')).toHaveCount(1);
  await expect(studio.locator('.message').last().locator('input')).toBeChecked();
  await studio.locator('.message').first().locator('input').check();
  await expect(studio.locator('.message').last()).toContainText('Mañana me pongo con ello va');
  await studio.screenshot({ path: 'test-results/thread-order-regression.png', fullPage: true });
  await studio.close(); await page.close();
});

test('records original animated scenes, promotion and audio; plays, downloads and opens composer', async () => {
  const page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/studio.html#demo`);
  await expect(page.locator('#generate')).toBeEnabled();
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText('Courtroom dialogue', { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/rendering.png', fullPage: true });
  await expect(page.locator('#status')).toContainText('Promotional ending', { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/promotion.png', fullPage: true });
  await expect(page.locator('#result')).toBeVisible({ timeout: 60000 });
  const video = page.locator('video');
  await video.evaluate((element: HTMLVideoElement) => element.play());
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(.2);
  const downloaded = page.waitForEvent('download'); await page.locator('#download').click();
  const download = await downloaded;
  await mkdir('test-results', { recursive: true });
  const file = path.resolve('test-results', download.suggestedFilename()); await download.saveAs(file);
  expect(file).toMatch(/\.(mp4|webm)$/);
  try {
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
    expect(probe.streams.some((s: { codec_type: string }) => s.codec_type === 'audio')).toBe(true);
    expect(probe.streams.some((s: { codec_type: string; width: number; height: number }) => s.codec_type === 'video' && s.width === 768 && s.height === 576)).toBe(true);
    if (file.endsWith('.mp4')) expect(probe.streams.map((s: { codec_name: string }) => s.codec_name)).toContain('h264');
    expect(Number(probe.format.duration)).toBeGreaterThan(20);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const newPage = context.waitForEvent('page'); const postDownload = page.waitForEvent('download');
  await page.locator('#post').click(); const composer = await newPage; await postDownload;
  await expect(composer).toHaveURL(/https:\/\/x.com\/intent\/post\?text=/);
  expect(new URL(composer.url()).searchParams.get('text')).toContain('Created with AceAttorTWExtension');
  expect(errors).toEqual([]);
  await composer.close(); await page.close();
});

test('cancellation releases recording and permits a retry', async () => {
  const page = await context.newPage(); await page.goto(`chrome-extension://${extensionId}/studio.html#demo`);
  await page.locator('#generate').click(); await expect(page.locator('#status')).toContainText('Courtroom dialogue', { timeout: 30000 });
  await page.locator('#cancel').click(); await expect(page.locator('#status')).toContainText('cancelled');
  await expect(page.locator('#result')).toBeHidden(); await expect(page.locator('#generate')).toBeEnabled();
  await page.locator('#generate').click(); await expect(page.locator('#status')).toContainText('Courtroom dialogue', { timeout: 30000 });
  await page.locator('#cancel').click(); await expect(page.locator('#generate')).toBeEnabled(); await page.close();
});
