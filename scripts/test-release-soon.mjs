import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const browser = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium'].find(existsSync);
assert(browser, 'Set CHROME_PATH.');
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-release-test-'));
const liveUrl = process.env.RELEASE_LIVE_URL || 'http://127.0.0.1:8000/release-soon';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pending = new Map(), errors = [];
let chrome, socket, session, sequence = 0;
function send(method, params = {}, sessionId = session) {
    return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 30000);
        pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
}
async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
}
async function waitFor(expression) {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        if (await evaluate('Boolean(' + expression + ')')) return;
        await sleep(150);
    }
    console.error(await evaluate('JSON.stringify({ready:window.__ready,images:Array.from(document.images).map(image=>({src:image.src,complete:image.complete,width:image.naturalWidth})),text:document.body.innerText.slice(0,400)})'));
    throw new Error('Timeout: ' + expression);
}
try {
    chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + path.join(temp, 'chrome'), 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    const endpoint = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Chrome startup timeout')), 30000);
        let output = '';
        chrome.stderr.on('data', chunk => {
            output += chunk;
            const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) { clearTimeout(timer); resolve(match[1]); }
        });
        chrome.on('error', reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (pending.has(message.id)) {
            const callback = pending.get(message.id);
            pending.delete(message.id);
            message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result);
        }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    });
    const { targetInfos } = await send('Target.getTargets', {}, null);
    ({ sessionId: session } = await send('Target.attachToTarget', { targetId: targetInfos.find(target => target.type === 'page').targetId, flatten: true }, null));
    await send('Runtime.enable');
    await send('Page.enable');
    for (const width of [320, 390, 1366, 1920]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: width < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 500 });
        await send('Page.navigate', { url: liveUrl });
        await waitFor('document.querySelector("main h1") && Array.from(document.images).every(image=>image.complete&&image.naturalWidth>0)');
        for (const dark of [false, true]) {
            await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
            assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No horizontal overflow at ' + width);
            assert(await evaluate('document.querySelector("main button").disabled'), 'Registration stays disabled');
            assert(await evaluate('Array.from(document.querySelectorAll("footer a")).every(a=>a.getAttribute("aria-label")==="Instagram TOKU-UP (tab baru)")'), 'Only Instagram can appear');
            assert(await evaluate('document.querySelector("main h1").getBoundingClientRect().bottom < document.querySelector("main button").getBoundingClientRect().top'), 'Heading and CTA do not overlap');
            assert(await evaluate('Array.from(document.querySelectorAll("a")).every(a=>!a.href.includes("forms.gle")&&!a.href.includes("docs.google.com"))'), 'No placeholder Google Form');
        }
        await evaluate("document.documentElement.classList.remove('dark')");
        const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        writeFileSync(path.join(temp, 'release-' + width + '.png'), Buffer.from(data, 'base64'));
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, screenshots: temp, checks: ['320/390/1366/1920 layouts', 'light/dark inherited preference', 'loaded logo/photo', 'disabled registration without fake URL', 'only configured Instagram'] }, null, 2));
} finally {
    if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close', {}, null); } catch {} socket.close(); }
    if (chrome && chrome.exitCode === null) { await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(3000)]); if (chrome.exitCode === null) chrome.kill(); }
    if (!process.env.KEEP_RELEASE_SCREENSHOTS) {
        const resolved = path.resolve(temp);
        if (resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith('tokuup-release-test-')) rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    }
}
