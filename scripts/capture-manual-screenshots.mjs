import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.resolve('storage/temp_chrome_profile');
const SCREENSHOT_DIR = path.resolve('public/docs/screenshots');
const PORT = 9222;
const BASE_URL = 'http://127.0.0.1:8000';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function getAuthCookies(email, password) {
    const resGet = await fetch(`${BASE_URL}/login`);
    const rawCookies = resGet.headers.getSetCookie();
    const xsrfCookie = rawCookies.find(c => c.startsWith('XSRF-TOKEN='));
    const xsrfVal = xsrfCookie ? xsrfCookie.split(';')[0].split('=')[1] : '';
    const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');

    const resPost = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cookie': cookieHeader,
            'X-XSRF-TOKEN': decodeURIComponent(xsrfVal)
        },
        body: JSON.stringify({ email, password }),
        redirect: 'manual'
    });

    const authCookies = resPost.headers.getSetCookie();
    const sessionCookie = authCookies.find(c => c.startsWith('toku-up-session='));
    const newXsrfCookie = authCookies.find(c => c.startsWith('XSRF-TOKEN='));

    return {
        sessionVal: sessionCookie ? sessionCookie.split(';')[0].split('=')[1] : null,
        xsrfVal: newXsrfCookie ? newXsrfCookie.split(';')[0].split('=')[1] : null,
    };
}

console.log('🚀 Menjalankan headless Chrome...');
const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    `--user-data-dir=${USER_DATA_DIR}`,
], { stdio: 'ignore' });

async function waitCdpReady() {
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
            if (res.ok) return await res.json();
        } catch (e) {}
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Gagal menghubungkan ke Chrome CDP');
}

class CdpClient {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.id = 1;
        this.pending = new Map();
        this.events = new Map();

        this.ready = new Promise((resolve) => {
            this.ws.onopen = () => resolve();
        });

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id && this.pending.has(msg.id)) {
                const { resolve, reject } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                if (msg.error) reject(new Error(msg.error.message));
                else resolve(msg.result);
            } else if (msg.method) {
                const handlers = this.events.get(msg.method) || [];
                handlers.forEach(h => h(msg.params));
            }
        };
    }

    send(method, params = {}) {
        const id = this.id++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    close() {
        this.ws.close();
    }
}

async function run() {
    try {
        await waitCdpReady();
        console.log('✅ Chrome CDP terhubung');

        const targetsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const targets = await targetsRes.json();
        const pageTarget = targets.find(t => t.type === 'page') || targets[0];

        const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
        await cdp.ready;

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('Network.enable');
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 900,
            deviceScaleFactor: 1.25,
            mobile: false
        });

        const sleep = ms => new Promise(r => setTimeout(r, ms));

        async function goto(url, delay = 3000) {
            console.log(`🧭 Navigasi ke ${url}...`);
            await cdp.send('Page.navigate', { url });
            await sleep(delay);
        }

        async function capture(fileName) {
            const outPath = path.join(SCREENSHOT_DIR, fileName);
            const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
            console.log(`📸 Disimpan: ${fileName} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
        }

        // 1. Capture Login Page
        await goto(`${BASE_URL}/login`, 2500);
        await capture('01_login_page.png');

        // 2. Set Auth Cookies for Admin
        console.log('🔑 Mengambil session cookie Admin Global...');
        const adminCookies = await getAuthCookies('admin@toku-up.com', 'password');
        await cdp.send('Network.setCookie', {
            name: 'toku-up-session',
            value: adminCookies.sessionVal,
            domain: '127.0.0.1',
            path: '/',
            httpOnly: true
        });
        await cdp.send('Network.setCookie', {
            name: 'XSRF-TOKEN',
            value: adminCookies.xsrfVal,
            domain: '127.0.0.1',
            path: '/'
        });

        // 3. Admin Dashboard
        await goto(`${BASE_URL}/admin/dashboard`, 3500);
        await capture('06_dashboard_admin.png');

        // 4. Bab 1: Bank Kosakata
        await goto(`${BASE_URL}/admin/vocabulary`, 3500);
        await capture('02_bank_kosakata.png');

        // 5. Bab 2: Bank Grammar & Konten
        await goto(`${BASE_URL}/admin/bank-soal-konten`, 3500);
        await capture('03_bank_grammar.png');

        // 6. Bab 3: Kurikulum & Modul
        await goto(`${BASE_URL}/admin/programs`, 3500);
        await capture('04_kurikulum_modul.png');

        // 7. Bab 4: Bank Soal Ujian CBT
        await goto(`${BASE_URL}/admin/exams/question-banks`, 3500);
        await capture('05_bank_soal_cbt.png');

        // 8. Bab 5: Siswa (Set Cookie User Siswa)
        console.log('🔑 Mengambil session cookie Siswa Budi...');
        const userCookies = await getAuthCookies('budi@toku-up.com', 'password');
        await cdp.send('Network.setCookie', {
            name: 'toku-up-session',
            value: userCookies.sessionVal,
            domain: '127.0.0.1',
            path: '/',
            httpOnly: true
        });

        await goto(`${BASE_URL}/user/dashboard`, 3500);
        await capture('07_dashboard_siswa.png');

        await goto(`${BASE_URL}/user/kelas`, 3500);
        await capture('08_roadmap_kelas_siswa.png');

        await goto(`${BASE_URL}/user/progress`, 3500);
        await capture('09_progress_siswa.png');

        cdp.close();
        console.log('🎉 Seluruh tangkapan layar asli antarmuka berhasil diambil!');
    } catch (err) {
        console.error('❌ Error capture:', err);
    } finally {
        chromeProcess.kill();
        process.exit(0);
    }
}

run();
