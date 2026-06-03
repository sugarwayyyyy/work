const { chromium } = require('playwright');
const BASE = 'http://localhost/work-main/frontend/pages';

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const failures = [];
    const consoleErrs = [];
    page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
    page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
    page.on('requestfailed', r => failures.push(`FAILED ${r.url()} ${r.failure() && r.failure().errorText}`));

    await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
    await page.fill('#email', 'admin@univ.edu');
    await page.fill('#password', 'Test123456');
    await Promise.all([ page.waitForLoadState('networkidle').catch(()=>{}), page.click('#login-form button[type="submit"]') ]);
    await page.waitForTimeout(2000);

    failures.length = 0; consoleErrs.length = 0;   // reset; only capture reports page
    await page.goto(`${BASE}/admin-reports.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    // also click the other two tabs to exercise their endpoints
    for (const t of ['feedback', 'cases', 'events']) {
        await page.click(`.feed-tab[data-sub-tab="${t}"]`).catch(()=>{});
        await page.waitForTimeout(1200);
    }

    console.log('--- 4xx/5xx or failed requests on admin-reports ---');
    console.log(failures.length ? failures.join('\n') : 'NONE');
    console.log('--- console errors ---');
    console.log(consoleErrs.length ? consoleErrs.join('\n') : 'NONE');
    await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
