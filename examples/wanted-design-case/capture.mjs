import { chromium } from '../../demo-pricing/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const project = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.env.STYLESEED_CASE_OUTPUT || resolve(project, '../../artifacts/wanted-20260917'));
const baseURL = process.env.STYLESEED_CASE_URL || 'http://127.0.0.1:43871/';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
const errors = [];
try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    for (const [view, file] of [['list', '01-design-judgment'], ['detail', '02-carried-forward'], ['decisions', '03-project-decisions']]) {
        await page.goto(`${baseURL}?view=${view}&capture=1`);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: resolve(out, `${file}.png`) });
        checks.push({ view, overflow: await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })), visibleMain: await page.locator('#main').isVisible() });
    }
    for (const [name, viewport, scale] of [['desktop', { width: 1440, height: 900 }, 2], ['mobile', { width: 390, height: 844 }, 2]]) {
        const p = await browser.newPage({ viewport, deviceScaleFactor: scale });
        p.on('pageerror', e => errors.push(e.message));
        for (const view of ['list', 'detail', 'decisions']) {
            await p.goto(`${baseURL}?view=${view}`);
            await p.evaluate(() => document.fonts.ready);
            await p.screenshot({ path: resolve(out, `${name}-${view}.png`), fullPage: true });
            checks.push({ name, view, horizontalOverflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
        }
        await p.close();
    }
    await page.goto(`${baseURL}?view=list`);
    await page.getByRole('searchbox').fill('그로브');
    if (await page.locator('tbody tr').count() !== 1)
        throw Error('Search did not narrow to one project');
    await page.getByRole('searchbox').fill('없는프로젝트');
    await page.getByText('일치하는 프로젝트가 없어요').waitFor();
    await page.screenshot({ path: resolve(out, 'empty-state.png') });
    await page.getByRole('button', { name: '검색 초기화' }).click();
    if (await page.locator('tbody tr').count() !== 4)
        throw Error('Reset did not restore projects');
    await page.locator('[data-action=open-objet]').click();
    await page.getByRole('button', { name: '메모 남기기' }).click();
    await page.getByText('메모 내용을 입력해 주세요.').waitFor();
    await page.screenshot({ path: resolve(out, 'validation-state.png') });
    await page.getByRole('textbox', { name: '검토 메모', exact: true }).fill('메인 카피 대비 확인 완료');
    await page.getByRole('button', { name: '메모 남기기' }).click();
    await page.locator('.saved-note').filter({ hasText: '메인 카피 대비 확인 완료' }).waitFor();
    await page.getByRole('button', { name: '검토 완료', exact: true }).click();
    if (!await page.getByRole('button', { name: '검토 완료됨' }).isDisabled())
        throw Error('Completion did not disable action');
    await page.getByRole('button', { name: '전체 프로젝트', exact: true }).click();
    const objetRow = page.locator('tbody tr').filter({ hasText: '오브제 스튜디오' });
    await objetRow.getByText('검토 완료', { exact: true }).waitFor();
    if (await page.locator('.review-row').count() !== 1)
        throw Error('Completed review remains in queue');
    await page.screenshot({ path: resolve(out, 'completed-state.png') });
    checks.push({ functional: 'search, empty, reset, detail navigation, blank-note error, save note, complete review, list readback', passed: true });
    if (errors.length)
        throw Error(errors.join('\n'));
    writeFileSync(resolve(out, 'capture-checks.json'), JSON.stringify({ capturedAt: new Date().toISOString(), baseURL, dimensions: '1920x1080', source: 'local interactive example', humanAcceptance: false, checks, errors }, null, 2) + '\n');
    console.log(JSON.stringify({ checks, errors }, null, 2));
}
finally {
    await browser.close();
}
