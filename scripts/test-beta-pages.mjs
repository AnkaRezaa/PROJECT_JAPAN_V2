import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { decodeHTML, encodeXML } from 'entities';

const superadminAudit = process.argv.includes('--superadmin-audit');
const base = process.env.BETA_LIVE_URL || 'http://127.0.0.1:8000';
if (superadminAudit) {
    assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'SuperAdmin fixtures require a local server');
}
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
let submitMode = 'validation';
const auditTransactions = [1, 2].map(id => ({
    id, transaction_code: 'AUDIT-' + id, status: 'pending', access_state: 'inactive',
    amount_formatted: 'Rp 75.000', plan_name: 'Paket Audit', user_name: 'Siswa Audit',
    payment_method: 'manual', created_at: '2026-11-19T14:08:00Z',
}));
const submissions = [];
let analyticsConfigured = false;
const ga4Url = 'https://analytics.google.com/analytics/web/#/p123456';
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
    const end = Date.now() + (superadminAudit ? 20000 : 90000);
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
            const fixture = { ...page, component: view, url: '/__beta-fixture', props: { ...page.props, auth: { user: view.startsWith('Public/') || view === 'Auth/Register' ? null : { id: 123, username: 'Beta Browser Test', email: 'fixture@example.com', role: view.startsWith('SuperAdmin') ? 'superadmin' : 'user', status: 'active', email_verified_at: '2026-11-16', xp: 0, level: 1, streak_count: 0 } }, beta: settings, betaSettings: settings, registration: { email: 'fixture@example.com', verified: false }, released: false, status: null, sentAt: null, errors: {}, seo: {}, flash: {}, socialLinks: {} } };
            if (superadminAudit) {
                const gtm = { enabled: analyticsConfigured, id: analyticsConfigured ? 'GTM-FIXTURE' : null };
                Object.assign(fixture.props, {
                    monitoringLinks: { gtm, ga4: analyticsConfigured ? ga4Url : null },
                    analyticsStatus: { gtm, ga4: { configured: analyticsConfigured, url: analyticsConfigured ? ga4Url : null } },
                    transactions: { data: auditTransactions, links: [] }, filters: { period: 7 },
                    logins: { data: [{ id: 1, user: 'Siswa Audit', logged_in_at: '19 Nov 2026, 21:08' }], links: [] },
                    timeline: { data: [{ id: 1, actor: 'Admin', action: 'Beta', description: 'Pengaturan beta diperbarui.', target: 'Sistem' }], links: [] },
                    news: { data: [{ id: 1, title: 'Berita Audit', status: 'published', attachments: [], thumbnail_url: '/missing-superadmin-audit.png' }], links: [] },
                    users: { data: Array.from({ length: 8 }, (_, index) => ({
                        id: 9 + index, raw_status: 'active', status: 'Aktif', progress: '0%', name: 'Siswa Audit ' + (index + 1),
                    })), links: [] },
                    student: { id: 9, username: 'Siswa Detail', status: 'active', xp: 0, level: 1 },
                    levelProgress: [{ id: 1, name: 'JLPT N3', total_lessons: 7, completed_lessons: 0, percentage: 0 }],
                    progressScopeLabel: 'Progres lintas kelas (per level)',
                    activityRouteName: 'superadmin.users.show',
                    backHref: '/superadmin/users',
                });
                fixture.props.auth.user.role = 'superadmin';
                if (['PUT', 'PATCH'].includes(message.params.request.method)) {
                    const { url, postData } = message.params.request;
                    submissions.push({ url, data: JSON.parse(postData || '{}') });
                    fixture.props.errors = submitMode === 'validation' ? { current_password: 'Sandi lama tidak sesuai.' } : {};
                    await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Inertia', value: 'true' }], body: Buffer.from(JSON.stringify(fixture)).toString('base64') });
                    return;
                }
            }
            if (message.params.request.method === 'POST') {
                const payload = JSON.parse(message.params.request.postData || '{}');
                submissions.push(payload);
                if (submitMode === 'beta-validation') {
                    fixture.props.errors = { name: 'Nama wajib diisi.', terms_accepted: 'Setujui ketentuan dan kebijakan privasi untuk melanjutkan.' };
                } else {
                    fixture.component = 'Public/Beta/Confirmation';
                    fixture.props.status = 'verification-link-sent';
                    fixture.props.sentAt = new Date().toISOString();
                    fixture.props.registration.email = payload.email || 'fixture@example.com';
                }
                await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Inertia', value: 'true' }], body: Buffer.from(JSON.stringify(fixture)).toString('base64') });
                return;
            }
            if (message.params.request.method === 'PUT') {
                submissions.push(JSON.parse(message.params.request.postData || '{}'));
                fixture.props.errors = submitMode === 'validation' ? { opens_at: 'Jadwal buka harus berupa tanggal dan jam yang valid (WIB).' } : {};
                await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Inertia', value: 'true' }], body: Buffer.from(JSON.stringify(fixture)).toString('base64') });
                return;
            }
            const html = template.replace(attribute[0], 'data-page="' + encodeXML(JSON.stringify(fixture)) + '"');
            await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: Buffer.from(html).toString('base64') });
        }
    });
    const { targetInfos } = await send('Target.getTargets', {}, null);
    ({ sessionId: session } = await send('Target.attachToTarget', { targetId: targetInfos.find(target => target.type === 'page').targetId, flatten: true }, null));
    await send('Page.enable'); await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*__beta-fixture*', resourceType: 'Document', requestStage: 'Request' }, { urlPattern: '*superadmin/system/beta', requestStage: 'Request' }, { urlPattern: '*daftar-beta*', requestStage: 'Request' }, ...(superadminAudit ? [
        { urlPattern: '*/password', requestStage: 'Request' },
        { urlPattern: '*/superadmin/payments/transactions/*/approve', requestStage: 'Request' },
    ] : [])] });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (superadminAudit) {
        for (const width of [390, 1366]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
            const click = (label) => evaluate(`Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim() === ${JSON.stringify(label)}).click()`);
            const visible = (fragment) => waitFor(`document.body?.innerText.toLowerCase().includes(${JSON.stringify(fragment.toLowerCase())})`);
            const open = async (component, title, root = 'SuperAdmin') => {
                view = root + '/' + component;
                await send('Page.navigate', { url: base + '/__beta-fixture?view=' + encodeURIComponent(view) });
                await visible(title);
                assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'No horizontal overflow ' + component + ' ' + width);
            };

            await open('Profil/Profil', 'Profil SuperAdmin');
            await click('Keamanan Sistem');
            await visible('Status Sistem');
            assert.equal(await evaluate('document.body.innerText.includes("<CheckCircleIcon")'), false);
            await click('Setelan Root');
            await waitFor('document.querySelector("[name=current_password]")');
            await evaluate(`for (const [name, value] of Object.entries({current_password:'wrong-pass',password:'next-password',password_confirmation:'next-password'})) {
                const input = document.querySelector('[name=' + name + ']');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }`);
            submitMode = 'validation';
            await click('Perbarui Sandi');
            await visible('Sandi lama tidak sesuai.');
            assert.equal(await evaluate('document.body.innerText.includes("Sandi tersimpan.")'), false);
            submitMode = 'success';
            await click('Perbarui Sandi');
            await visible('Sandi tersimpan.');
            assert.equal(await evaluate('document.querySelector("[name=current_password]").value'), '');

            await open('Pemasukan/Pemasukan', 'Tanggal (WIB)');
            await evaluate(`Array.from(document.querySelectorAll('button')).filter(el => el.textContent.trim() === 'Approve')[1].click()`);
            await visible('Setujui transaksi?');
            await waitFor(`document.querySelector('[role=alertdialog]')?.innerText.includes('AUDIT-2')`);
            await evaluate(`const field = document.querySelector('[role=alertdialog] textarea');
                Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'Catatan audit');
                field.dispatchEvent(new Event('input', { bubbles: true }));`);
            await click('Setujui');
            await waitFor('!document.querySelector("[role=alertdialog]")');
            assert(submissions.at(-1).url.endsWith('/2/approve'));
            assert.equal(submissions.at(-1).data.notes, 'Catatan audit');

            await open('Aktivitas/Aktivitas', '21:08');
            await visible('Pengaturan beta diperbarui.');
            await visible('Belum terhubung');
            assert.equal(await evaluate('document.body.innerText.includes("GA4_PROPERTY_URL")'), false);
            assert.equal(await evaluate('document.body.innerText.includes("GTM_ENABLED=true")'), false);

            await open('Konten/Konten', 'Berita Audit');
            await waitFor(`document.querySelector('img[src="/missing-superadmin-audit.png"]')?.hidden`);
            await visible('Tanpa sampul');

            await open('DataUser/DataUser', 'Siswa Audit');
            await waitFor(`document.querySelector('div[style="width: 0%;"]')?.getBoundingClientRect().width === 0`);
            const lastReset = `Array.from(document.querySelectorAll('button')).filter(el => el.textContent.trim() === 'Reset Password').at(-1)`;
            await evaluate(`${lastReset}.scrollIntoView({ block: 'center', inline: 'center' })`);
            assert(await evaluate(`(() => {
                const reset = ${lastReset};
                const feedback = document.querySelector('[aria-label="Kirim feedback"]');
                const { x, y, width, height } = reset.getBoundingClientRect();
                return getComputedStyle(feedback).position !== 'fixed'
                    && reset.contains(document.elementFromPoint(x + width / 2, y + height / 2));
            })()`), 'Feedback cannot cover the last Reset Password action');
            await evaluate(`${lastReset}.click()`);
            await visible('Reset Password Student?');
            await click('Batal');
            await waitFor('!document.querySelector("[role=alertdialog]")');

            await open('DataUser/DetailUser', 'Siswa Detail', 'Admin');
            await click('Monitoring Belajar');
            await visible('0 dari 7 modul selesai');
            await waitFor(`document.querySelector('[data-progress-percent]')?.textContent === '0%' && document.querySelector('.recharts-pie')`);
            await waitFor(`(() => {
                const label = document.querySelector('[data-progress-percent]').getBoundingClientRect();
                const chart = document.querySelector('.recharts-pie').getBoundingClientRect();
                return chart.width > 0 && Math.abs(label.x + label.width / 2 - chart.x - chart.width / 2) <= 3
                    && Math.abs(label.y + label.height / 2 - chart.y - chart.height / 2) <= 3;
            })()`);

            await open('Sistem/Sistem', 'Jadwal buka akses (WIB)');
            await visible('Akses aplikasi belum dibuka');
            assert.equal(await evaluate('document.querySelector("input[type=datetime-local]").value'), '2026-12-01T09:00');
            await visible('Nonaktif');
            assert.equal(await evaluate('document.body.innerText.includes("GA4_PROPERTY_URL")'), false);

            analyticsConfigured = true;
            await open('Aktivitas/Aktivitas', 'GTM-FIXTURE');
            assert(await evaluate('Array.from(document.links).some(link => link.href === ' + JSON.stringify(ga4Url) + ')'));
            assert.equal(await evaluate('document.body.innerText.includes("Belum terhubung")'), false);
            await open('Sistem/Sistem', 'GTM-FIXTURE');
            assert.equal(await evaluate('document.body.innerText.includes("GA4_PROPERTY_URL")'), false);
            analyticsConfigured = false;
            console.log(`SuperAdmin scenarios passed at ${width}px.`);
        }
    } else for (const width of [320, 390, 768, 1366]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
        const views = process.env.BETA_FORMS_ONLY ? ['Public/ReleaseSoon', 'Public/Beta/Register', 'Public/Beta/Confirmation'] : ['Public/ReleaseSoon', 'User/Beta/Waiting', 'SuperAdmin/Sistem/Sistem', 'Auth/Register', 'Public/Beta/Register', 'Public/Beta/Confirmation'];
        for (view of views) {
            await send('Page.navigate', { url: base + '/__beta-fixture?view=' + encodeURIComponent(view) });
            await waitFor(view === 'SuperAdmin/Sistem/Sistem' ? 'document.querySelector("input[type=datetime-local]")' : view === 'Auth/Register' || view === 'Public/Beta/Register' ? 'document.querySelector("input[type=email]")' : 'document.querySelector("img[data-brand-logo]")?.naturalWidth > 0');
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
                assert(await evaluate('document.querySelector("[data-registration-button]").getAttribute("href").includes("/daftar-beta")'));
                assert(await evaluate('!Array.from(document.images).some(i=>i.src.includes("Mount-Fuji"))'));
            } else if (view === 'Public/Beta/Register') {
                assert(await evaluate(`document.querySelector('form[aria-label="Pendaftaran beta"]') !== null`));
                assert(await evaluate('!document.body.innerText.includes("Masuk")'));
                await evaluate(`document.querySelector('button[aria-label="Tampilkan kata sandi"]').click()`);
                assert(await evaluate('document.querySelector("#beta-password").type === "text"'));
                await evaluate(`document.querySelector('button[aria-label="Sembunyikan kata sandi"]').click()`);
            } else if (view === 'Public/Beta/Confirmation') {
                assert(await evaluate('!document.body.innerText.includes("Masuk") && document.body.innerText.includes("belum masuk ke aplikasi")'));
                assert(await evaluate('document.body.innerText.includes("fixture@example.com")'));
            } else if (view === 'SuperAdmin/Sistem/Sistem') {
                submitMode = 'validation';
                await evaluate('document.querySelector("input[type=datetime-local]").closest("form").requestSubmit()');
                await waitFor('document.querySelector("#beta-opens-at-error")');
                assert.equal(submissions.at(-1).opens_at, '2026-12-01T09:00');
                assert(await evaluate('document.querySelector("input[type=datetime-local]").getAttribute("aria-invalid")==="true"'));
                submitMode = 'success';
                await evaluate('document.querySelector("input[type=datetime-local]").closest("form").requestSubmit()');
                await waitFor('Array.from(document.querySelectorAll("[role=status]")).some(el=>el.textContent.includes("Pengaturan beta tersimpan."))');
                assert(!('open_now' in submissions.at(-1)));
                await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Buka Sekarang")).click()');
                await waitFor('document.querySelector("[role=alertdialog]")');
                await evaluate('Array.from(document.querySelectorAll("[role=alertdialog] button")).find(b=>b.textContent.includes("Batal")).click()');
                await waitFor('!document.querySelector("[role=alertdialog]")');
            }
            if (view === 'SuperAdmin/Sistem/Sistem') await evaluate('document.querySelector("input[type=datetime-local]").closest("section").scrollIntoView({block:"center"})');
            const { cssContentSize } = await send('Page.getLayoutMetrics');
            const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(cssContentSize.width), height: Math.ceil(cssContentSize.height), scale: 1 } });
            writeFileSync(path.join(temp, view.replaceAll('/', '-') + '-' + width + '.png'), Buffer.from(data, 'base64'));
            if (view === 'Public/Beta/Register' && width === 1366) {
                submitMode = 'beta-validation';
                await evaluate('document.querySelector("form").noValidate = true; document.querySelector("form").requestSubmit()');
                await waitFor('document.querySelector("#beta-name-error")');
                assert(await evaluate('document.querySelector("#beta-name").getAttribute("aria-invalid") === "true"'));
                submitMode = 'beta-success';
                await evaluate(`
                    for (const [id, value] of Object.entries({'beta-name':'Browser Beta','beta-email':'browser-beta@example.test','beta-password':'password-123','beta-password_confirmation':'password-123'})) {
                        const input = document.getElementById(id);
                        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
                        input.dispatchEvent(new Event('input',{bubbles:true}));
                    }
                    document.querySelector('input[type=checkbox]').click();
                `);
                await evaluate('document.querySelector("form").requestSubmit()');
                await waitFor('document.querySelector("[data-beta-confirmation]")');
                assert.equal(submissions.at(-1).email, 'browser-beta@example.test');
                assert.equal(submissions.at(-1).terms_accepted, true);
                assert(await evaluate('document.body.innerText.includes("browser-beta@example.test") && !document.body.innerText.includes("Masuk")'));
            }
        }
    }
    assert.deepEqual(errors, []);
    if (superadminAudit) console.log('SuperAdmin browser checks passed at 390px and 1366px.');
    else console.log(JSON.stringify({ passed: true, screenshots: temp, checks: ['real built components', '320/390/768/1366', 'new logo loaded', 'light/dark overflow', 'beta form submission', 'inline validation', 'password visibility', 'no automatic login UI', ...(process.env.BETA_FORMS_ONLY ? [] : ['WIB schedule', 'settings submission', 'confirmation cancel'])] }));
} finally {
    if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close', {}, null); } catch {} socket.close(); }
    if (chrome && chrome.exitCode === null) { await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(3000)]); if (chrome.exitCode === null) chrome.kill(); }
    const resolved = path.resolve(temp);
    if (!process.env.KEEP_BETA_SCREENSHOTS && resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith('tokuup-beta-')) rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
