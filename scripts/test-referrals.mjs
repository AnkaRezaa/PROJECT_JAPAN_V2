import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { decodeHTML, encodeXML } from 'entities';

const base = process.env.REFERRALS_LIVE_URL || 'http://127.0.0.1:8000';
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
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-referrals-'));
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
            const fixture = { ...page, component: view, url: '/__referral-fixture', props: { ...page.props, auth: { user: view === 'Auth/Register' ? null : { id: 123, username: 'Referral Browser Test', email: 'fixture@example.com', role: 'user', status: 'active', email_verified_at: '2026-11-16', xp: 0, level: 1, streak_count: 0 } }, code: 'TK7H9X2P', inviteUrl: base + '/register?ref=TK7H9X2P', summary: { registered: 5, verified: 3 }, referralsEnabled: true, referralCode: 'TK7H9X2P', flash: {}, seo: {} } };
            const html = template.replace(attribute[0], 'data-page="' + encodeXML(JSON.stringify(fixture)) + '"');
            await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: Buffer.from(html).toString('base64') });
        }
    });
    const { targetInfos } = await send('Target.getTargets', {}, null);
    ({ sessionId: session } = await send('Target.attachToTarget', { targetId: targetInfos.find(target => target.type === 'page').targetId, flatten: true }, null));
    await send('Page.enable'); await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*__referral-fixture*', resourceType: 'Document', requestStage: 'Request' }] });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    for (const width of [320, 390, 768, 1366]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
        for (view of ['User/Referral/Index', 'Auth/Register']) {
            await send('Page.navigate', { url: base + '/__referral-fixture?view=' + encodeURIComponent(view) });
            await waitFor(view === 'Auth/Register' ? 'document.querySelector("#referral-code")' : 'document.querySelector("#personal-code")');
            for (const dark of [false, true]) {
                await evaluate(`document.documentElement.classList.toggle('dark',${dark});document.getAnimations().forEach(a=>a.finish())`);
                assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'No overflow');
            }
            if (view === 'User/Referral/Index') {
                assert.equal(await evaluate('document.querySelector("#personal-code").value'), 'TK7H9X2P');
                await evaluate('Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.copied = text; } } }); Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Salin kode").click()');
                await waitFor('window.copied === "TK7H9X2P"');
                assert(await evaluate(`Array.from(document.getElementById('personal-code').closest('section').querySelectorAll('button')).every(b=>b.getBoundingClientRect().height>=44)`));
            } else {
                assert.equal(await evaluate('document.querySelector("#referral-code").value'), 'TK7H9X2P');
                assert(await evaluate(`Array.from(document.querySelectorAll('a')).some(a=>a.href.includes('auth/google/redirect') && a.href.includes('referral_code=TK7H9X2P'))`));
            }
            const { data } = await send('Page.captureScreenshot', { format: 'png' });
            writeFileSync(path.join(temp, view.replaceAll('/', '-') + '-' + width + '.png'), Buffer.from(data, 'base64'));
        }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, screenshots: temp, checks: ['real built components', '320/390/768/1366', 'copy', 'Google referral link', 'light/dark overflow', '44px controls'] }));
} finally {
    if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close', {}, null); } catch {} socket.close(); }
    if (chrome && chrome.exitCode === null) { await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(3000)]); if (chrome.exitCode === null) chrome.kill(); }
    const resolved = path.resolve(temp);
    if (!process.env.KEEP_REFERRAL_SCREENSHOTS && resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith('tokuup-referrals-')) rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
