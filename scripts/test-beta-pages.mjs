import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { decodeHTML, encodeXML } from 'entities';

const base = process.env.BETA_LIVE_URL || 'http://127.0.0.1:8000';
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
const browser = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium'].find(existsSync);
assert(browser);
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-beta-'));
const pending = new Map(), errors = [];
let chrome, socket, session, sequence = 0, view = 'User/Referral/Index';
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
            const settings = { enabled: true, registration_open: true, participants: 12, limit: 50, opens_at: '2026-12-01T02:00:00+00:00', opened_at: null, released: false };
            const fixture = { ...page, component: view, url: '/__beta-fixture', props: { ...page.props, auth: { user: view === 'Public/ReleaseSoon' || view === 'Auth/Register' ? null : { id: 123, username: 'Beta Browser Test', email: 'fixture@example.com', role: view.startsWith('SuperAdmin') ? 'superadmin' : 'user', status: 'active', email_verified_at: '2026-11-16', xp: 0, level: 1, streak_count: 0 } }, beta: settings, betaSettings: settings, seo: {}, flash: {}, socialLinks: {} } };
            const html = template.replace(attribute[0], 'data-page="' + encodeXML(JSON.stringify(fixture)) + '"');
            await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: Buffer.from(html).toString('base64') });
        }
    });
    const { targetInfos } = await send('Target.getTargets', {}, null);
    ({ sessionId: session } = await send('Target.attachToTarget', { targetId: targetInfos.find(target => target.type === 'page').targetId, flatten: true }, null));
    await send('Page.enable'); await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*__beta-fixture*', resourceType: 'Document', requestStage: 'Request' }] });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    for (const width of [320, 390, 768, 1366]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
        for (view of ['Public/ReleaseSoon', 'User/Beta/Waiting', 'SuperAdmin/Sistem/Sistem', 'Auth/Register']) {
            await send('Page.navigate', { url: base + '/__beta-fixture?view=' + encodeURIComponent(view) });
            await waitFor(view === 'SuperAdmin/Sistem/Sistem' ? 'document.querySelector("input[type=datetime-local]")' : view === 'Auth/Register' ? 'document.querySelector("input[type=email]")' : 'document.querySelector("img[data-brand-logo]")?.naturalWidth > 0');
            for (const dark of [false, true]) {
                await evaluate(`document.documentElement.classList.toggle('dark',${dark});document.getAnimations().forEach(a=>{try{a.finish()}catch{a.cancel()}})`);
                assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'No overflow ' + view + width);
            }
            if (view === 'User/Beta/Waiting') {
                assert(await evaluate('document.querySelector("img[data-brand-logo]").src.endsWith("/images/logos/tokuup-full.png")'));
                assert(await evaluate('document.body.innerText.includes("09.00") || document.body.innerText.includes("09:00")'));
                assert(await evaluate('!document.body.innerText.includes("Kelas Saya")'));
            } else if (view === 'Public/ReleaseSoon') {
                assert(await evaluate('document.querySelector("img[data-brand-logo]").src.endsWith("/images/logos/tokuup-full.png")'));
                assert(await evaluate('document.querySelector("[data-registration-button]").tagName === "A"'));
                assert(await evaluate('!Array.from(document.images).some(i=>i.src.includes("Mount-Fuji"))'));
            } else if (view === 'SuperAdmin/Sistem/Sistem') {
                await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Buka Sekarang")).click()');
                await waitFor('document.querySelector("[role=alertdialog]")');
                await evaluate('Array.from(document.querySelectorAll("[role=alertdialog] button")).find(b=>b.textContent.includes("Batal")).click()');
                await waitFor('!document.querySelector("[role=alertdialog]")');
            }
            if (view === 'SuperAdmin/Sistem/Sistem') await evaluate('document.querySelector("input[type=datetime-local]").closest("section").scrollIntoView({block:"center"})');
            const { data } = await send('Page.captureScreenshot', { format: 'png' });
            writeFileSync(path.join(temp, view.replaceAll('/', '-') + '-' + width + '.png'), Buffer.from(data, 'base64'));
        }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, screenshots: temp, checks: ['real built components', '320/390/768/1366', 'WIB schedule', 'new logo loaded', 'no photo background', 'confirmation cancel', 'light/dark overflow'] }));
} finally {
    if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close', {}, null); } catch {} socket.close(); }
    if (chrome && chrome.exitCode === null) { await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(3000)]); if (chrome.exitCode === null) chrome.kill(); }
    const resolved = path.resolve(temp);
    if (!process.env.KEEP_BETA_SCREENSHOTS && resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith('tokuup-beta-')) rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
