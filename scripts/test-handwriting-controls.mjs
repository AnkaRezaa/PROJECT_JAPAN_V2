import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = process.cwd();
const browser = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium'].find(existsSync);
assert(browser, 'Set CHROME_PATH to Chromium.');
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-writing-test-'));
const entry = path.join(root, '__writing-fixture.jsx').replaceAll('\\', '/');
const fixture = String.raw`
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import Canvas from '@/Components/Features/Handwriting/KanjiHandwritingCanvas';
import Quiz from '@/Pages/User/Kuis/KerjakanKuis';
import '/resources/css/app.css';
const scenario = new URLSearchParams(location.search).get('scenario') || 'canvas';
window.route = (name, id = '') => '/fixture/' + name + '/' + id;
window.__writing = { requests: [], fail: false, delay: 60, completions: [] };
window.axios = { post: async (url, data) => {
    window.__writing.requests.push({ url, data });
    return { data: { is_correct: true, explanation: 'Correct', score: 100, xp_earned: 0 } };
}};
router.post = (url, data, options) => {
    window.__writing.requests.push({ url, data });
    setTimeout(() => {
        if (data.skill === 'writing' && window.__writing.fail) options.onError?.({ action: 'Failed fixture' });
        else options.onSuccess?.();
        options.onFinish?.();
    }, window.__writing.delay);
};
function Fixture() {
    const [width, setWidth] = React.useState(5);
    if (scenario === 'quiz') return <Quiz
        quiz={{ id: 8801, title: 'Writing fixture', passing_score: 70, time_limit: 0 }}
        questions={[1,2].map(id => ({ id, type: 'multiple_choice', question: 'Question '+id, options: ['Answer A','Answer B'] }))}
        flashcards={[{ id: 881, front_text: '\u4e00\u4e8c', back_text: 'One two', writing_characters: [] }]} />;
    return <main className="p-4"><Canvas character={scenario === 'error' ? '\u{20000}' : '\u4e00'} mode="quiz" selfEvaluation
        {...(scenario === 'legacy' ? {} : { strokeWidth: width, onStrokeWidthChange: setWidth, onSkip: () => window.__writing.completions.push('skipped') })}
        onComplete={result => window.__writing.completions.push(result)} /></main>;
}
await createInertiaApp({
    page: { component: 'Fixture', props: { auth: { user: { id: 881 } }, beta: {} }, url: location.pathname+location.search, version: 'fixture' },
    resolve: () => Fixture,
    setup: ({el,App,props}) => createRoot(el).render(<App {...props} />),
});
window.__ready = true;
`;
const server = await createServer({ configFile: false, root, cacheDir: path.join(temp, 'vite'),
    optimizeDeps: { entries: [], include: ['react', 'react-dom', 'react-dom/client', '@inertiajs/react', 'kanji-recognizer', 'framer-motion', 'react-confetti', '@headlessui/react', 'tiny-segmenter', ...['AutoAwesome','CheckCircle','Close','CloseRounded','EmojiEvents','ErrorOutlineOutlined','Favorite','FlagOutlined','InfoOutlined','LightbulbOutlined','PlayArrow','PlayArrowRounded','Refresh','RestartAltRounded','Restore','SkipNextRounded','Star','StarBorder','UndoRounded','VisibilityOutlined','VolumeOff','VolumeUp','WarningAmber'].map(name => '@mui/icons-material/'+name)] },
    resolve: { alias: { '@': path.join(root, 'resources/js') } }, plugins: [react(), {
        name: 'writing-fixture',
        configureServer(vite) { vite.middlewares.use(async (req,res,next) => {
            if (req.url.split('?')[0] !== '/__writing') return next();
            res.setHeader('Content-Type','text/html');
            res.end(await vite.transformIndexHtml('/__writing','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__writing-fixture.jsx"></script></body></html>'));
        }); },
        resolveId(id) { if(id === '/__writing-fixture.jsx' || id === entry) return entry; },
        load(id) { if(id === entry) return fixture; },
    }], server: { host: '127.0.0.1', port: 5203, strictPort: false, hmr: false } });
let chrome, socket, session, sequence = 0;
const pending = new Map(), errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
function send(method, params = {}, sessionId = session) { return new Promise((resolve,reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: '+method)); },30000);
    pending.set(id,{ resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? {sessionId} : {}) }));
}); }
async function evaluate(expression) {
    const result = await send('Runtime.evaluate',{ expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
}
async function waitFor(expression) {
    const until = Date.now()+90000;
    while(Date.now()<until) { if(await evaluate('Boolean('+expression+')')) return; await sleep(150); }
    throw new Error('Timeout: '+expression+' '+await evaluate('document.body.innerText'));
}
async function click(text) {
    await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().endsWith(${JSON.stringify(text)})&&!b.disabled);if(!b)throw new Error('Button missing: '+${JSON.stringify(text)});b.click()})()`);
    await sleep(120);
}
async function open(scenario) {
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__writing?scenario='+scenario});
    await waitFor('window.__ready');
}
try {
    await server.listen();
    chrome = spawn(browser,['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+path.join(temp,'chrome'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    const endpoint = await new Promise((resolve,reject) => {
        const timer=setTimeout(()=>reject(new Error('Chrome startup timeout')),20000); let output='';
        chrome.stderr.on('data',chunk=>{output+=chunk;const m=output.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
        chrome.on('error',reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    const {targetInfos}=await send('Target.getTargets',{},null);
    ({sessionId:session}=await send('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},null));
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await open('canvas'); await waitFor('document.querySelector("svg.kanji-writer") || document.querySelector("[id^=kanji-writer-] svg")');
    await evaluate(`(()=>{const svg=document.querySelector('[id^=kanji-writer-] svg');const r=svg.getBoundingClientRect();for(const [type,x,y] of [['pointerdown',20,50],['pointermove',70,50],['pointerup',85,50]])svg.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,clientX:r.x+x/109*r.width,clientY:r.y+y/109*r.height}));window.__svg=svg;window.__path=Array.from(svg.querySelectorAll('path')).find(p=>p.getAttribute('stroke-width')==='5');})()`);
    assert(await evaluate('Boolean(window.__path)'), 'Drawn path must exist');
    const geometry=await evaluate('window.__path.getAttribute("d")');
    await evaluate(`(()=>{const input=document.querySelector('input[type=range]');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'8');input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await waitFor('document.querySelector("output").textContent==="8"');
    assert(await evaluate('window.__svg===document.querySelector("[id^=kanji-writer-] svg")'),'Width must not recreate canvas');
    assert.equal(await evaluate('window.__path.getAttribute("d")'),geometry);
    assert.equal(await evaluate('window.__path.getAttribute("stroke-width")'),'8');
    for(const [width,dark] of [[390,false],[1366,true]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
        await evaluate(`document.documentElement.classList.toggle('dark',${dark})`);
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'No horizontal overflow');
        const {data}=await send('Page.captureScreenshot',{format:'png'});
        writeFileSync(path.join(temp,'writing-'+width+'.png'),Buffer.from(data,'base64'));
    }
    await click('Lewati karakter'); assert.equal(await evaluate('window.__writing.completions.length'),1);
    await open('error'); await waitFor('document.body.innerText.includes("belum tersedia")');
    await click('Lewati karakter'); assert.equal(await evaluate('window.__writing.completions.length'),1);
    await open('legacy'); await waitFor('document.querySelector("[id^=kanji-writer-] svg")');
    assert.equal(await evaluate('Boolean(document.querySelector("input[type=range]"))'),false);
    assert.equal(await evaluate('document.body.innerText.includes("Lewati karakter")'),false);
    await open('quiz'); await waitFor('document.body.innerText.includes("Answer A")');
    await click('Answer A'); await waitFor('document.body.innerText.includes("LANJUT")'); await click('LANJUT');
    await waitFor('document.body.innerText.includes("Sudah Paham")'); await click('Sudah Paham');
    await waitFor('document.body.innerText.includes("Karakter 1 dari 2")');
    await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Lewati karakter');b.click();b.click()})()`);
    await waitFor('document.body.innerText.includes("Karakter 2 dari 2")');
    assert.equal(await evaluate('window.__writing.requests.filter(r=>r.data.skill==="writing").length'),0);
    await evaluate('window.__writing.fail=true;window.__writing.delay=250');
    await click('Lewati karakter');
    await waitFor('document.body.innerText.includes("Review tulisan belum tersimpan")');
    assert(await evaluate('document.body.innerText.includes("Karakter 2 dari 2")'),'Failed review must not advance');
    await evaluate('window.__writing.fail=false'); await click('Lewati karakter');
    await waitFor('document.body.innerText.includes("Question 2")');
    const writes=await evaluate('window.__writing.requests.filter(r=>r.data.skill==="writing")');
    assert.equal(writes.length,2,'One failed request and one retry');
    assert(writes.every(r=>r.data.action==='learning'&&!r.data.completed));
    assert.deepEqual(errors,[],'No uncaught runtime errors');
    console.log(JSON.stringify({passed:true,checks:['width preserves SVG and geometry','light/dark responsive','skip missing asset','optional props unchanged','actual quiz multi-character skip','double click','review error and retry','learning without completion bonus'],screenshots:'temporary; removed'},null,2));
} catch(error) {
    console.error('Writing browser failure:', error.message, errors);
    throw error;
} finally {
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null)}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}
    await server.close();
    const resolved=path.resolve(temp);
    if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('tokuup-writing-test-')){
        try{rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch(error){console.warn('Temporary test cleanup:',error.code,resolved);}
    }
}
