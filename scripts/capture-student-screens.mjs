import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.resolve('storage/temp_chrome_profile_student');
const SCREENSHOT_DIR = path.resolve('public/docs/screenshots');
const PORT = 9226;
const BASE_URL = 'http://127.0.0.1:8000';

async function getCookies(email, password) {
    const resGet = await fetch(BASE_URL + '/login');
    const raw = resGet.headers.getSetCookie();
    const xsrf = raw.find(c => c.startsWith('XSRF-TOKEN=')).split(';')[0].split('=')[1];
    const cookieHdr = raw.map(c => c.split(';')[0]).join('; ');

    const resPost = await fetch(BASE_URL + '/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cookie': cookieHdr,
            'X-XSRF-TOKEN': decodeURIComponent(xsrf)
        },
        body: JSON.stringify({ email, password }),
        redirect: 'manual'
    });
    const postCookies = resPost.headers.getSetCookie();
    return {
        session: postCookies.find(c => c.startsWith('toku-up-session=')).split(';')[0].split('=')[1],
        xsrf: postCookies.find(c => c.startsWith('XSRF-TOKEN=')).split(';')[0].split('=')[1],
    };
}

class CdpClient {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.id = 1;
        this.pending = new Map();

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

async function main() {
    console.log('Spawning Chrome for student capture...');
    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1440,900',
        `--user-data-dir=${USER_DATA_DIR}`
    ], { stdio: 'ignore' });

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(2000);

    const targetsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const targets = await targetsRes.json();
    const wsUrl = targets[0].webSocketDebuggerUrl;

    const cdp = new CdpClient(wsUrl);
    await cdp.ready;

    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1.25,
        mobile: false
    });

    console.log('Login student@toku-up.com...');
    const auth = await getCookies('student@toku-up.com', 'password');
    await cdp.send('Network.setCookie', { name: 'toku-up-session', value: auth.session, domain: '127.0.0.1', path: '/', httpOnly: true });
    await cdp.send('Network.setCookie', { name: 'XSRF-TOKEN', value: auth.xsrf, domain: '127.0.0.1', path: '/' });

    async function capture(url, filename) {
        console.log(`Navigating to ${url}...`);
        await cdp.send('Page.navigate', { url: BASE_URL + url });
        await sleep(3500);
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), Buffer.from(data, 'base64'));
        console.log(`Saved ${filename} (${Math.round(fs.statSync(path.join(SCREENSHOT_DIR, filename)).size / 1024)} KB)`);
    }

    await capture('/user/dashboard', '07_dashboard_siswa.png');
    await capture('/user/kelas', '08_roadmap_kelas_siswa.png');
    await capture('/user/progress', '09_progress_siswa.png');

    cdp.close();
    chrome.kill();
    console.log('🎉 Student screenshots captured successfully!');
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
