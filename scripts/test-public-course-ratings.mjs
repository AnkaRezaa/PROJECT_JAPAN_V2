import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { decodeHTML, encodeXML } from 'entities';

const base = process.env.RATINGS_LIVE_URL || 'http://127.0.0.1:8000';
const response = await fetch(base + '/pricing', { signal: AbortSignal.timeout(15000) });
assert.equal(response.status, 200);
const manifest = JSON.parse(readFileSync('public/build/manifest.json', 'utf8'));
const app = manifest['resources/js/app.jsx'];
const template = (await response.text())
    .replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, '')
    .replace('</head>', (app.css || []).map(file => `<link rel="stylesheet" href="/build/${file}">`).join('') + `<script type="module" src="/build/${app.file}"></script></head>`);
const attribute = template.match(/data-page="([^"]+)"/);
assert(attribute, 'Laravel Inertia shell must be available');
const page = JSON.parse(decodeHTML(attribute[1]));
const plan = { id: 1, name: 'Paket pengujian tampilan', scope_type: 'program', scope_label: 'Kelas Mandiri', price_formatted: 'Rp 79.000', duration_days: 30, features: [] };
const program = { id: 1, title: 'Kelas Bahasa Jepang dengan Judul Panjang untuk Pengujian Tampilan', slug: 'kelas-fixture', description: 'Materi kelas untuk pengujian antarmuka terisolasi.', thumbnail_url: '/images/kelas-n3-kanji.jpg', level: 'N3', weeks_count: 4, preview_modules: [], payment_plans: [plan, { ...plan, id: 2 }], review_summary: { average: 4.3, count: 24, url: '/kelas/kelas-fixture/ulasan' } };
const programs = [program, { ...program, id: 2, slug: 'kosong', title: 'Kelas tanpa ulasan', payment_plans: [{ ...plan, id: 3 }], review_summary: { average: null, count: 0, url: '/kelas/kosong/ulasan' } }, { ...program, id: 3, slug: 'lama', title: 'Payload lama', payment_plans: [{ ...plan, id: 4 }], review_summary: undefined }];
const browser = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium'].find(existsSync);
assert(browser);
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-rating-summary-'));
const pending = new Map(), errors = [];
let chrome, socket, session, sequence = 0, view = 'Pricing';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function send(method, params = {}, sessionId = session) {
    return new Promise((resolve, reject) => {
        const id = ++sequence, timer = setTimeout(() => reject(new Error('CDP timeout: ' + method)), 30000);
        pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
}
async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
}
async function waitFor(expression) {
    const end = Date.now() + 90000;
    while (Date.now() < end) { if (await evaluate('Boolean(' + expression + ')')) return; await sleep(200); }
    throw new Error('Timeout: ' + expression + ' ' + JSON.stringify({ view, errors, body: await evaluate('document.body.innerText.slice(0,1200)') }));
}
try {
    chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + path.join(temp, 'chrome'), 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    const endpoint = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Chrome timeout')), 30000);
        chrome.stderr.on('data', chunk => { const match = String(chunk).match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
        chrome.on('error', reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', async event => {
        const message = JSON.parse(event.data);
        if (pending.has(message.id)) { const callback = pending.get(message.id); pending.delete(message.id); message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result); }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
        if (message.method === 'Fetch.requestPaused') {
            const fixture = { ...page, component: view, url: '/__rating-fixture', props: { ...page.props, auth: { user: null }, programs, program, seo: {}, activePopup: null, latestNews: [] } };
            const html = template.replace(attribute[0], 'data-page="' + encodeXML(JSON.stringify(fixture)) + '"');
            await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: Buffer.from(html).toString('base64') });
        }
    });
    const { targetInfos } = await send('Target.getTargets', {}, null);
    ({ sessionId: session } = await send('Target.attachToTarget', { targetId: targetInfos.find(target => target.type === 'page').targetId, flatten: true }, null));
    await send('Page.enable'); await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*__rating-fixture*', resourceType: 'Document', requestStage: 'Request' }] });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    for (const width of [320, 390, 768, 1366]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
        for (view of ['LandingPage', 'Pricing', 'Public/Kelas/Show']) {
            console.log('Checking', view, width);
            await send('Page.navigate', { url: base + '/__rating-fixture?view=' + encodeURIComponent(view) });
            await waitFor('document.querySelector("[data-course-rating]")');
            for (const dark of [false, true]) {
                await evaluate(`document.documentElement.classList.toggle('dark',${dark});document.getAnimations().forEach(a=>a.finish())`);
                assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'), 'No overflow: ' + view + width);
                assert(await evaluate(`Array.from(document.querySelectorAll('[data-course-rating]')).every(el=>el.getBoundingClientRect().height>=44 && !el.textContent.includes('0 / 5'))`));
                assert.equal(await evaluate('document.querySelector("[data-course-rating]").getAttribute("href")'), program.review_summary.url);
            }
            assert(await evaluate('document.querySelector("[data-course-rating]").textContent.includes("4,3")'));
            await evaluate('document.querySelector("[data-course-rating]").focus()');
            assert(await evaluate('document.activeElement === document.querySelector("[data-course-rating]")'), 'Rating link accepts keyboard focus');
            if (view === 'LandingPage') assert.equal(await evaluate(`Array.from(document.querySelectorAll('a[data-course-rating]')).filter(a=>a.getAttribute('href')==='/kelas/kelas-fixture/ulasan').length`), 2, 'Two packages share one class rating');
            if (view !== 'Public/Kelas/Show') assert(await evaluate('Array.from(document.querySelectorAll("[data-course-rating]")).some(el=>el.tagName==="SPAN"&&el.textContent==="Belum ada ulasan")'), 'Old payload fallback');
            await evaluate('document.querySelector("[data-course-rating]").scrollIntoView({block:"center"})');
            const { data } = await send('Page.captureScreenshot', { format: 'png' });
            writeFileSync(path.join(temp, view.replaceAll('/', '-') + '-' + width + '.png'), Buffer.from(data, 'base64'));
        }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, screenshots: temp, checks: ['real marketing components with isolated response fixtures', '320/390/768/1366', 'rating links', '44px targets', 'empty and legacy payload', 'light/dark overflow'] }));
} finally {
    if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close', {}, null); } catch {} socket.close(); }
    if (chrome && chrome.exitCode === null) { await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(3000)]); if (chrome.exitCode === null) chrome.kill(); }
    const resolved = path.resolve(temp);
    if (!process.env.KEEP_RATING_SCREENSHOTS && resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith('tokuup-rating-summary-')) rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
