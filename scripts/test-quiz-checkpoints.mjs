import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = process.cwd();
const browser = process.env.CHROME_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync);
assert(browser, 'Set CHROME_PATH to a Chromium browser executable.');
const profile = mkdtempSync(path.join(tmpdir(), 'tokuup-quiz-checkpoints-'));
const screenshotDir = process.env.QUIZ_SCREENSHOT_DIR || (process.argv.includes('--screenshots') ? mkdtempSync(path.join(tmpdir(), 'tokuup-quiz-screenshots-')) : null);
const entryId = path.join(root, '__quiz-checkpoints.jsx').replaceAll('\\', '/');
const fixture = String.raw`
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import axios from 'axios';
import Dokkai from '@/Components/Features/DokkaiQuiz/DokkaiQuizRunner';
import Grammar from '@/Components/Features/GrammarQuiz/GrammarQuizRunner';
import Mixed from '@/Pages/User/Kuis/KuisCampuranRunner';
import '/resources/css/app.css';
const scenario = new URLSearchParams(location.search).get('scenario') || 'dokkai';
window.route = (name) => '/fixture/' + name;
window.__quiz = { requests: [], mode: 'fail', closed: 0, writes: 0 };
const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(...args) {
    if (args[0].startsWith('japanlingo_cp_')) window.__quiz.writes++;
    return originalSetItem.apply(this, args);
};
const questions = [11, 12].map((id, index) => ({
    id, question_number: index + 1, question_text: 'Question ' + (index + 1),
    options: [{ option_label: 'A', option_text: 'Option A' }, { option_label: 'B', option_text: 'Option B' }],
}));
const grammar = {
    id: 9002, title: 'Grammar fixture', pattern: 'Pattern', intro: { meaning: 'Meaning', examples: [] },
    stages: [
        { id: 'transformation', title: 'Transformation', questions: [{ id: 201, type: 'choice', prompt: 'Choose', choices: ['Choice A', 'Choice B'] }] },
        { id: 'sentence_builder', title: 'Sentence Builder', questions: [{ id: 202, type: 'sentence_builder', prompt: 'Arrange', tokens: [{id:'t1',text:'Token One'},{id:'t2',text:'Token Two'}] }] },
    ],
};
axios.post = async (url, data) => {
    window.__quiz.requests.push({ url, data });
    if (url.endsWith('/start')) return { data: { attempt_id: 1, submission_token: 'grammar-session' } };
    if (url.endsWith('/answers/first')) return { data: { correct: true, recorded: true } };
    if (url === '/mixed-submit') {
        if (window.__quiz.mode === 'expired') throw { response: { status: 409, data: { message: 'Sesi kuis kedaluwarsa.' } } };
        return { data: { score: 50, total_questions: 2, correct_count: 1, xp_earned: 0, passed: false, breakdown: {} } };
    }
    throw new Error('Unexpected request: ' + url);
};
window.axios = axios;
function Fixture() {
    const [closed, setClosed] = React.useState(window.__quiz.closed > 0);
    const onClose = () => { window.__quiz.closed++; setClosed(true); };
    if (closed) return <p>Fixture closed</p>;
    if (scenario === 'grammar') return <Grammar quiz={grammar} persist onClose={onClose} />;
    if (scenario === 'mixed') return <Mixed
        quiz={{ quiz_id: 9003, day_id: 55, title: 'Mixed fixture', session_token: 'mixed-token', expires_at: new Date(Date.now()+7200000).toISOString(), questions: questions.map(q => ({...q,raw_id:q.id,source_type:'kosakata',category_key:'kosakata',options:[{text:'Mixed A'},{text:'Mixed B'}]})) }}
        submitUrl="/mixed-submit" restartUrl="/mixed-restart" backUrl="/" />;
    return <Dokkai quiz={{ id:9001, title:'Dokkai fixture', time_limit:scenario === 'dokkai-timeout' ? 1 : 90, passing_score:70 }}
        questions={questions} paragraphs={[{ id:1,paragraph_number:1,content_raw:'A short reading passage.' }]}
        persist={scenario !== 'preview'} onClose={onClose}
        onSubmitAttempt={async data => {
            window.__quiz.requests.push({url:'dokkai-submit',data});
            if (window.__quiz.mode === 'fail') throw new Error('Network unavailable');
            if (window.__quiz.mode === 'null') return null;
            return { result: { score:50, correct_count:1,total_questions:2,is_passed:false,xp_earned:0,user_answers:data.answers }, questions };
        }} />;
}
await createInertiaApp({
    page: { component:'Fixture', props:{auth:{user:{id:4242}},beta:{}}, url:location.pathname+location.search, version:'fixture' },
    resolve: () => Fixture,
    setup: ({el,App,props}) => createRoot(el).render(<App {...props} />),
});
window.__quizReady = true;
`;

const server = await createServer({
    configFile: false,
    root,
    resolve: { alias: { '@': path.join(root, 'resources/js') } },
    plugins: [react(), {
        name: 'quiz-checkpoint-fixture',
        configureServer(vite) {
            vite.middlewares.use(async (request, response, next) => {
                if (request.url === '/__quiz-home') {
                    response.setHeader('Content-Type', 'text/html');
                    response.end('<!doctype html><html><body>Fixture home</body></html>');
                    return;
                }
                if (request.url.split('?')[0] !== '/__quiz-checkpoints') return next();
                response.setHeader('Content-Type', 'text/html');
                response.end(await vite.transformIndexHtml('/__quiz-checkpoints', '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__quiz-checkpoints.jsx"></script></body></html>'));
            });
        },
        resolveId(id) { if (id === '/__quiz-checkpoints.jsx' || id === entryId) return entryId; },
        load(id) { if (id === entryId) return fixture; },
    }],
    server: { host: '127.0.0.1', port: 5198, strictPort: false, hmr: false },
});
let chrome;
let socket;
const errors = [];
const results = [];
const pending = new Map();
let sequence = 0;
let sessionId;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function send(method, params = {}, session = sessionId) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 30000);
        pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject });
        socket.send(JSON.stringify({ id, method, params, ...(session ? {sessionId:session} : {}) }));
    });
}
async function evaluate(expression) {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture:true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result?.value;
}
async function waitFor(expression) {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        if (await evaluate('Boolean('+expression+')')) return;
        await delay(100);
    }
    throw new Error('Browser condition failed: ' + expression + '\n' + await evaluate('document.body.innerText.slice(0,2500)') + '\nErrors: '+JSON.stringify(errors));
}
async function click(text) {
    const expression = `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === ${JSON.stringify(text)} && !b.disabled && b.getClientRects().length)`;
    await clickElement(expression);
}
async function clickSelector(selector) {
    await clickElement(`document.querySelector(${JSON.stringify(selector)})`);
}
async function clickElement(expression) {
    await waitFor('Boolean(' + expression + ')');
    const point = await evaluate(`(() => { const button=${expression}; button.scrollIntoView({block:'center',behavior:'instant'}); const box=button.getBoundingClientRect(); return {x:box.x+box.width/2,y:box.y+box.height/2}; })()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
    await delay(120);
}
const dokkaiKey = 'japanlingo_cp_dokkai_9001_u4242';
const grammarKey = 'japanlingo_cp_grammar_9002_u4242';
const mixedKey = 'japanlingo_cp_mixed_55_u4242';
async function checkpoint(key) { return evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`); }
async function open(scenario, { clear = false, dark = false, mobile = false } = {}) {
    console.log('Checking browser scenario:',scenario, mobile ? 'mobile' : 'desktop',dark ? 'dark' : 'light');
    await send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1366, height: mobile ? 844 : 900, deviceScaleFactor:1, mobile });
    await send('Page.navigate', {url:server.resolvedUrls.local[0]+'__quiz-checkpoints?scenario='+scenario});
    await waitFor('window.__quizReady && document.querySelector("button")');
    if (clear) {
        await evaluate('localStorage.clear()');
        await send('Page.reload');
        await waitFor('window.__quizReady && document.querySelector("button")');
    }
    await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
}
async function screenshot(name) {
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth+2'),'Horizontal overflow: '+name);
    if (!screenshotDir) return;
    const { data } = await send('Page.captureScreenshot', { format:'png' });
    writeFileSync(path.join(screenshotDir, name+'.png'), Buffer.from(data, 'base64'));
}

try {
    await server.listen();
    chrome = spawn(browser, ['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'], { windowsHide:true, stdio:['ignore','ignore','pipe'] });
    const endpoint = await new Promise((resolve, reject) => {
        let stderr = '';
        const timeout = setTimeout(() => reject(new Error('Chrome did not start: '+stderr)), 15000);
        chrome.stderr.on('data', chunk => {
            stderr += chunk;
            const found = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
            if (found) { clearTimeout(timeout); resolve(found[1]); }
        });
        chrome.on('error', reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',event => reject(new Error('Chrome websocket '+endpoint+': '+event.message)),{once:true}); });
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (process.env.QUIZ_DEBUG) console.log('CDP', JSON.stringify(message).slice(0,350));
        if (message.id && pending.has(message.id)) {
            const waiter = pending.get(message.id); pending.delete(message.id);
            message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
        }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
        if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
            console.error('Browser:',message.params.args.map(arg => arg.description || arg.value).join(' ').slice(0,1200));
        }
    });
    const {targetInfos} = await send('Target.getTargets',{},null);
    const targetId = targetInfos.find(target => target.type === 'page')?.targetId;
    assert(targetId, 'Chrome must expose an initial page target');
    ({sessionId} = await send('Target.attachToTarget',{targetId,flatten:true},null));
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__quiz-home'});
    await waitFor('document.body?.innerText.includes("Fixture home")');

    let saved;
    if (!process.argv.includes('--exit-only')) {
    await open('dokkai', {clear:true});
    await click('Lanjut ke Soal Kuis');
    await click('AOption A');
    await click('Berikutnya');
    saved = await checkpoint(dokkaiKey);
    assert.equal(saved.questionId,12);
    assert.equal(saved.selectedAnswers[11],'A');
    const writes = await evaluate('window.__quiz.writes');
    await delay(1200);
    assert.equal(await evaluate('window.__quiz.writes'),writes,'Timer must not write checkpoint every second');
    await evaluate(`Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))`);
    saved = await checkpoint(dokkaiKey);
    await delay(1200);
    assert.equal((await checkpoint(dokkaiKey)).remainingMs,saved.remainingMs);
    await open('dokkai');
    await click('Lanjutkan');
    assert.match(await evaluate('document.body.innerText'),/Question 2/);
    assert((await checkpoint(dokkaiKey)).remainingMs <= saved.remainingMs);
    await click('Kumpulkan Jawaban');
    await click('Ya, Kumpulkan');
    await waitFor('Boolean(document.querySelector("[role=alert]"))');
    saved = await checkpoint(dokkaiKey);
    assert.equal(saved.submission_status,'unconfirmed');
    assert.equal(await evaluate('document.querySelectorAll("main button").length > 0'),true);
    await screenshot('dokkai-submit-error-light');
    await evaluate('window.__quiz.mode="null"');
    await click('Coba Kirim Ulang');
    assert.equal((await checkpoint(dokkaiKey)).submission_token,saved.submission_token);
    await open('dokkai', {dark:true,mobile:true});
    await click('Lanjutkan');
    await screenshot('dokkai-submit-error-dark-mobile');
    await evaluate('window.__quiz.mode="success"');
    await click('Coba Kirim Ulang');
    await waitFor('document.body.innerText.includes("Lihat Pembahasan & Eviden")');
    assert.equal(await checkpoint(dokkaiKey),null);
    assert.equal(await evaluate('window.__quiz.requests[0].data.submission_token'),saved.submission_token);
    results.push('Dokkai: failed/null submit, stable retry token, resume position, paused timer, no per-second writes, confirmed cleanup');

    await open('dokkai-timeout',{clear:true});
    await click('Lanjut ke Soal Kuis');
    await waitFor('Boolean(document.querySelector("[role=alert]"))');
    assert.equal((await checkpoint(dokkaiKey)).submission_status,'unconfirmed');
    assert.equal((await checkpoint(dokkaiKey)).remainingMs,0);
    await delay(1200);
    assert.equal(await evaluate('window.__quiz.requests.length'),1,'Expired timer must not loop failed submissions');
    results.push('Dokkai: timeout retains unconfirmed checkpoint, locks answers and does not retry automatically');

    await open('preview',{clear:true});
    await click('Lanjut ke Soal Kuis');
    await click('Berikutnya');
    await click('Kumpulkan Jawaban');
    await click('Ya, Kumpulkan');
    await waitFor('document.body.innerText.includes("Lihat Pembahasan & Eviden")');
    assert.equal(await evaluate('window.__quiz.requests.length'),0);
    assert.equal(await checkpoint(dokkaiKey),null);
    results.push('Admin preview: local result only, no submission and no persistent checkpoint');
    }

    await open('dokkai',{clear:true});
    await click('Lanjut ke Soal Kuis');
    await evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    await click('Lanjutkan kuis');
    await evaluate('history.back()');
    await waitFor('document.body.innerText.includes("Mau jeda dulu?")');
    await click('Lanjutkan kuis');
    await clickSelector('button[aria-label="Tutup kuis Dokkai"]');
    await click('Keluar sesi');
    await waitFor('window.__quiz.closed===1');
    assert(await checkpoint(dokkaiKey));
    results.push('Dokkai: Escape, browser Back, cancel, close confirmation, checkpoint retained');

    if (!process.argv.includes('--exit-only')) {
    await open('grammar',{clear:true});
    await click('Mulai Lesson');
    await click('AChoice A');
    saved = await checkpoint(grammarKey);
    assert.equal(saved.draft.answer,'Choice A');
    await open('grammar');
    await click('Lanjutkan');
    assert.equal(await evaluate('window.__quiz.requests.length'),0,'Restoring draft must not grade');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="Periksa").disabled'),false);
    await click('Periksa');
    await click('Lanjut');
    await clickSelector('button[aria-label="Pilih kata Token Two"]');
    await delay(100);
    assert.deepEqual((await checkpoint(grammarKey)).draft.answer,['t2']);
    await open('grammar',{dark:true,mobile:true});
    await click('Lanjutkan');
    await waitFor(`Boolean(document.querySelector('button[aria-label="Hapus Token Two dari susunan"]'))`);
    assert.equal(await evaluate('window.__quiz.requests.length'),0);
    await screenshot('grammar-resumed-draft-dark-mobile');
    results.push('Grammar: first-question choice draft and sentence-builder order restored without grading or XP requests');

    await open('mixed',{clear:true});
    await click('AMixed A');
    await click('Berikutnya');
    saved = await checkpoint(mixedKey);
    assert.equal(saved.currentIndex,1);
    assert.equal(saved.session_token,'mixed-token');
    await open('mixed');
    await click('Lanjutkan');
    assert.match(await evaluate('document.body.innerText'),/Question 2/);
    await screenshot('mixed-resumed-light');
    results.push('Mixed: event-driven position checkpoint and session-bound resume');

    await evaluate(`localStorage.setItem(${JSON.stringify(mixedKey)},JSON.stringify({...${JSON.stringify(saved)},session_token:'old-session'}))`);
    await open('mixed');
    await waitFor('document.body.innerText.includes("Sesi sebelumnya tidak tersedia")');
    assert.equal(await evaluate('document.body.innerText.includes("Question 2")'),false);
    results.push('Mixed: mismatched session never applies old answers to new questions');
    }

    assert.deepEqual(errors,[],'Uncaught browser errors');
    console.log(JSON.stringify({passed:results.length,scenarios:results,browserErrors:errors,screenshots:screenshotDir},null,2));
} finally {
    if (socket?.readyState === WebSocket.OPEN) {
        try { await send('Browser.close',{},null); } catch {}
        socket.close();
    }
    if (chrome && chrome.exitCode === null) {
        await Promise.race([new Promise(resolve => chrome.once('exit',resolve)),delay(3000)]);
        if (chrome.exitCode === null) chrome.kill();
    }
    await server.close();
    if (path.resolve(profile).startsWith(path.resolve(tmpdir())+path.sep) && path.basename(profile).startsWith('tokuup-quiz-checkpoints-')) {
        rmSync(profile,{recursive:true,force:true,maxRetries:6,retryDelay:300});
    }
}
