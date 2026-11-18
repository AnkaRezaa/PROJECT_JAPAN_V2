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
const questions = (scenario === 'dokkai-mobile' ? Array.from({length:18}, (_, index) => index + 11) : [11, 12]).map((id, index) => ({
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
    if (url.endsWith('/answers/first')) return { data: { correct: true, recorded: true, explanation: scenario === 'grammar-mobile' ? 'Long feedback for layout. '.repeat(90) : undefined } };
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
    if (scenario.startsWith('grammar')) return <div className="h-dvh"><Grammar quiz={grammar} persist onClose={onClose} /></div>;
    if (scenario === 'mixed') return <Mixed
        quiz={{ quiz_id: 9003, day_id: 55, title: 'Mixed fixture', session_token: 'mixed-token', expires_at: new Date(Date.now()+7200000).toISOString(), questions: questions.map(q => ({...q,raw_id:q.id,source_type:'kosakata',category_key:'kosakata',options:[{text:'Mixed A'},{text:'Mixed B'}]})) }}
        submitUrl="/mixed-submit" restartUrl="/mixed-restart" backUrl="/" />;
    return <Dokkai quiz={{ id:9001, title:'Dokkai fixture', time_limit:scenario === 'dokkai-timeout' ? 1 : 90, passing_score:70 }}
        questions={questions} paragraphs={[{ id:1,paragraph_number:1,content_raw:scenario === 'dokkai-mobile' ? 'A long reading passage. '.repeat(110) : 'A short reading passage.' }]}
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
    cacheDir: path.join(profile, 'vite-cache'),
    optimizeDeps: {
        entries: [],
        include: ['react', 'react-dom', 'react-dom/client', '@headlessui/react', '@inertiajs/react', 'axios', 'framer-motion', 'tiny-segmenter',
            ...['AccessTime', 'ArrowBack', 'ArrowForward', 'AutoAwesome', 'AutoStories', 'BackspaceOutlined', 'Bookmark', 'BookmarkAdd', 'BookmarkBorder', 'Cancel', 'CheckCircle', 'ChevronRight', 'Close', 'EmojiEvents', 'ErrorOutlineOutlined', 'ExpandLess', 'ExpandMore', 'FindInPage', 'FlagOutlined', 'FlashOn', 'InfoOutlined', 'LightbulbOutlined', 'MenuBook', 'Pause', 'PlayArrow', 'Quiz', 'RecordVoiceOver', 'Refresh', 'Replay', 'Restore', 'School', 'Search', 'Star', 'StarBorder', 'TimerOutlined', 'Translate', 'VolumeOff', 'VolumeUp', 'WarningAmber'].map(icon => '@mui/icons-material/' + icon)],
    },
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
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 90000);
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
async function open(scenario, { clear = false, dark = false, mobile = false, width = mobile ? 390 : 1366, height = mobile ? 844 : 900 } = {}) {
    console.log('Checking browser scenario:',scenario, mobile ? 'mobile' : 'desktop',dark ? 'dark' : 'light');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor:1, mobile });
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
    if (!process.argv.includes('--mobile-only')) {
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
    await click('Selanjutnya →');
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
    }

    if (!process.argv.includes('--exit-only')) {
    await open('grammar-mobile', {clear:true,mobile:true,width:320,height:568});
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await click('Mulai Lesson');
    const option = 'main button[aria-pressed="false"]';
    await waitFor(`document.querySelector(${JSON.stringify(option)})`);
    await send('DOM.enable');
    await send('CSS.enable');
    const {root: documentNode} = await send('DOM.getDocument');
    const {nodeId: optionNode} = await send('DOM.querySelector', {nodeId:documentNode.nodeId,selector:option});
    const background = `getComputedStyle(document.querySelector(${JSON.stringify(option)})).backgroundColor`;
    const mobileBackground = await evaluate(background);
    await send('CSS.forcePseudoState',{nodeId:optionNode,forcedPseudoClasses:['hover']});
    await delay(220);
    assert.equal(await evaluate(background),mobileBackground,'Touch must not leave an option in the hover palette');
    await send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await waitFor(`matchMedia('(hover: hover) and (pointer: fine)').matches && ${background} !== ${JSON.stringify(mobileBackground)}`);
    await send('CSS.forcePseudoState',{nodeId:optionNode,forcedPseudoClasses:[]});
    await click('AChoice A');
    await click('Periksa');
    await waitFor('document.querySelector("footer [aria-live=polite]")?.textContent.includes("Long feedback")');
    assert(await evaluate(`(() => { const footer=document.querySelector('footer');const note=footer.querySelector('[aria-live=polite]');const action=footer.querySelector('button').getBoundingClientRect();return note.scrollHeight>note.clientHeight && action.height>=44 && action.bottom<=innerHeight; })()`), 'Long Grammar feedback is readable without hiding Lanjut');
    await screenshot('grammar-short-mobile');
    await click('Lanjut');
    await waitFor('document.querySelector("[aria-label=\\\"Latihan Susun Kata\\\"]")');
    await screenshot('grammar-sentence-mobile');
    await clickSelector('button[aria-label="Pilih kata Token One"]');
    await open('grammar-mobile', {dark:true,mobile:true,width:320,height:568});
    await waitFor('document.body.innerText.includes("Lanjutkan Latihan?")');
    for (const dark of [true,false]) {
        await evaluate(`document.documentElement.classList.toggle('dark',${dark})`);
        assert(await evaluate(`(() => {
            const card=document.querySelector('dl');
            const rgb=value=>value.match(/[\\d.]+/g).slice(0,3).map(Number);
            const luminance=([r,g,b])=>[r,g,b].map(component=>{const x=component/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((total,component,index)=>total+component*[.2126,.7152,.0722][index],0);
            const contrast=(el, background)=>{const fg=luminance(rgb(getComputedStyle(el).color));const bg=luminance(rgb(getComputedStyle(background).backgroundColor));return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);};
            const panel=card.parentElement.parentElement;
            return Array.from(card.querySelectorAll('dt,dd')).every(el=>contrast(el,card)>=4.5)
                && Array.from(panel.querySelectorAll('button')).every(button=>contrast(button,button)>=4.5);
        })()`),'Resume details and actions retain readable contrast in light and dark');
        await screenshot('resume-mobile-'+(dark?'dark':'light'));
    }
    await click('Lanjutkan');
    await waitFor('document.querySelector(\'button[aria-label="Hapus Token One dari susunan"]\')');
    results.push('Grammar: long feedback scrolls independently and sentence-builder remains usable at 320px');
    results.push('Quiz UI: hover requires a mouse; resume contrast verified in light/dark mobile');

    await open('dokkai-mobile', {clear:true,mobile:true,width:320,height:568});
    await click('Lanjut ke Soal Kuis');
    const questionStrip = 'button[aria-current=step]';
    assert(await evaluate(`(() => { const strip=document.querySelector('${questionStrip}').parentElement;return strip.scrollWidth>strip.clientWidth && strip.getBoundingClientRect().right<=innerWidth; })()`), 'Question numbers scroll without widening the Dokkai card');
    await click('Wacana');
    await waitFor('document.querySelector("[role=dialog]") && document.body.innerText.includes("A long reading passage")');
    await screenshot('dokkai-passage-mobile');
    await click('Kembali ke Soal');
    await waitFor('!document.querySelector("[role=dialog]")');
    await click('AOption A');
    assert(await evaluate(`(() => ['Soal sebelumnya','Soal berikutnya'].every(name=>{const button=document.querySelector('button[aria-label="'+name+'"]');const box=button.getBoundingClientRect();return box.width>=44&&box.height>=44&&button.innerText.trim()==='';}))()`),'Compact Dokkai arrows retain clear accessible names and tap targets');
    await click('Berikutnya');
    await waitFor('document.querySelector("button[aria-current=step]")?.getAttribute("aria-label")==="Soal 2"');
    await screenshot('dokkai-questions-mobile');
    results.push('Dokkai: passage opens and returns to answers; question strip and navigation fit at 320px');
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
