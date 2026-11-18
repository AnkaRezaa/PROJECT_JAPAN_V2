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
import BuilderKuisKosakata from '@/Pages/Admin/Kuis/BuilderKuisKosakata';
import ModuleDayDialog from '@/Components/Features/Admin/ModuleDayDialog';
import ManajemenKelas from '@/Pages/Admin/ModulMateri/ManajemenKelas';
import { DayDetailContent } from '@/Pages/User/Modul/DaftarModul';
import '/resources/css/app.css';
const params = new URLSearchParams(location.search);
const scenario = params.get('scenario') || 'canvas';
window.route = (name, id = '') => '/fixture/' + name + '/' + id;
window.__writing = { requests: [], fail: false, delay: 60, completions: [], created: [] };
window.axios = { post: async (url, data) => {
    window.__writing.requests.push({ url, data });
    return { data: { is_correct: true, explanation: 'Correct', score: 100, xp_earned: 0 } };
}};
router.post = (url, data, options) => {
    window.__writing.requests.push({ url, data });
    setTimeout(() => {
        if (url.includes('admin.module-days.store')) {
            if (window.__writing.failCreate) options.onError?.({ title: 'Failed creation fixture' });
            else options.onSuccess?.({ props: { modules: { data: window.__writing.missingCreated ? [] : [
                { id: 1, days: [{ ...data, id: 881 }] },
            ] } } });
        }
        else if ((data.skill === 'writing' && window.__writing.fail) || (!data.skill && window.__writing.failReading)) options.onError?.({ action: 'Failed fixture' });
        else options.onSuccess?.();
        options.onFinish?.();
    }, window.__writing.delay);
};
router.put = (url, data, options) => {
    window.__writing.requests.push({ url, data });
    window.__persistDay?.(data);
    options.onSuccess?.();
    options.onFinish?.();
};
function Fixture() {
    const [width, setWidth] = React.useState(5);
    const [writingEnabled, setWritingEnabled] = React.useState(params.get('writing') !== 'off');
    const [dayOpen, setDayOpen] = React.useState(true);
    const [day, setDay] = React.useState({ id: 881, day_number: 1, title: 'Day fixture', status: 'draft', handwriting_enabled: true });
    window.__setWritingPreference = setWritingEnabled;
    window.__openDay = () => setDayOpen(true);
    window.__persistDay = (data) => setDay(current => ({ ...current, ...data }));
    if (scenario === 'class-type') return <ManajemenKelas programs={{data:[],links:[]}} tracks={[{id:1,code:'regular',name:'Regular'}]} />;
    if (scenario === 'day-create') return <ModuleDayDialog open={dayOpen} onClose={() => setDayOpen(false)} module={{ id: 1, week_number: 1, title: 'Week fixture' }} onCreated={result => window.__writing.created.push(result)} />;
    if (scenario === 'day' || scenario === 'day-exam') return <ModuleDayDialog open={dayOpen} onClose={() => setDayOpen(false)} module={{ id: 1, week_number: 1, title: 'Week fixture' }} day={day}
        examOptions={scenario === 'day-exam' ? [{ id: 901, title: 'JFT reading', category: 'jft_basic' }] : []} />;
    if (scenario === 'student-exam') return <DayDetailContent onClose={() => {}} mobile={true} day={{ id: 881, day_number: 1, title: 'Day fixture', status: 'active', exam_summary: {
        id: 901, title: 'JFT reading', category: 'jft_basic', type: 'practice', locked: params.has('locked'), lock_reason: 'Ujian ini memerlukan akses premium.', url: params.has('locked') ? null : '/user/exams/jft-reading',
    } }} />;
    if (scenario === 'builder') return <BuilderKuisKosakata
        quiz={{ id: 8801, title: 'Writing fixture', passing_score: 70, time_limit: 0, handwriting_enabled: writingEnabled, day: { id: 881, day_number: 1, title: 'Day fixture', handwriting_enabled: writingEnabled } }}
        questions={[1, 2].map(id => ({ id, type: 'multiple_choice', question_text: 'Question '+id, options: ['Answer A','Answer B','Answer C','Answer D'], correct_answer: 'Answer A', points: 10 }))}
        flashcardWorkspace={{ sets: [{ id: 501, title: 'Set 1', flashcards: [{ id: 881, front_text: '\u4e00\u4e8c', back_text: 'One two', writing_characters: [] }] }] }} />;
    if (scenario === 'quiz') return <Quiz
        quiz={{ id: 8801, title: 'Writing fixture', passing_score: 70, time_limit: 0, handwriting_enabled: writingEnabled }}
        questions={(params.get('single') ? [1] : [1,2]).map(id => ({ id, type: 'multiple_choice', question: 'Question '+id, options: ['Answer A','Answer B'], correct_answer: 'Answer A' }))}
        preview={params.get('preview') === '1'}
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
const roadmapDependencies = ['axios', '@mui/material/Dialog', '@mui/material/Popper', ...['AccountTree', 'EditOutlined', 'Search', 'AccessTime', 'AccessTimeRounded', 'ArrowForward', 'ArrowForwardRounded', 'BackspaceOutlined', 'CalendarMonth', 'ChevronLeft', 'ChevronRight', 'DescriptionOutlined', 'EditCalendar', 'ExpandMore', 'FindInPage', 'Groups', 'HighlightOff', 'Inventory2Outlined', 'LayersOutlined', 'Lock', 'LockOutlined', 'Quiz', 'QuizOutlined', 'Slideshow'].map(name => '@mui/icons-material/'+name)];
const server = await createServer({ configFile: false, root, cacheDir: path.join(temp, 'vite'),
    optimizeDeps: { entries: [], include: ['react', 'react-dom', 'react-dom/client', '@inertiajs/react', 'kanji-recognizer', 'framer-motion', 'react-confetti', '@headlessui/react', '@mui/material/Tooltip', 'tiny-segmenter', ...['Add','ArrowBack','ArrowDownward','ArrowUpward','Assessment','AutoAwesome','AutoStories','BarChart','ChatBubbleOutlined','Check','CheckCircle','CheckCircleOutlineRounded','CheckCircleOutlined','Close','CloseRounded','ContentCopy','DarkMode','Dashboard','DeleteOutlineOutlined','DrawOutlined','EmojiEvents','ErrorOutlineOutlined','ErrorOutlineRounded','Explore','FactCheckOutlined','Favorite','FeedbackOutlined','FlagOutlined','FormatListBulleted','GraphicEq','HelpOutlineOutlined','ImageOutlined','InfoOutlined','KeyboardArrowDown','KeyboardArrowRight','LibraryBooks','LightMode','LightbulbOutlined','LogoutOutlined','Menu','MenuBook','MicNoneOutlined','MonitorHeart','NotificationsOutlined','OpenInNew','People','PlayArrow','PlayArrowRounded','RadioButtonUnchecked','ReceiptLongOutlined','Refresh','Replay','RestartAltRounded','Restore','SaveOutlined','School','SearchRounded','Settings','SettingsOutlined','Shield','Shuffle','SkipNextRounded','Star','StarBorder','StyleOutlined','TimerOutlined','TrendingUp','UndoRounded','UploadFile','VideoCameraFront','Visibility','VisibilityOutlined','VolumeOff','VolumeUp','WarningAmber','WorkspacePremium'].map(name => '@mui/icons-material/'+name)] },
    resolve: { alias: { '@': path.join(root, 'resources/js') } }, plugins: [react(), {
        name: 'writing-fixture',
        config() { return { optimizeDeps: { include: roadmapDependencies } }; },
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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: '+method)); },90000);
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
async function open(scenario, preserveCheckpoint = false) {
    if (!preserveCheckpoint) await evaluate(`(()=>{try{localStorage.removeItem('japanlingo_cp_vocab_8801_u881')}catch{}})()`);
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
    const fullBoardWidth = await evaluate('window.__svg.getBoundingClientRect().width');
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
    await waitFor(`window.__svg.getBoundingClientRect().width < ${fullBoardWidth}`);
    assert(await evaluate(`(() => { const r=window.__svg.getBoundingClientRect();return Math.abs(r.width-r.height)<1 && r.width>=220 && r.right<=innerWidth; })()`),'Short mobile viewport has a usable square canvas');
    assert(await evaluate(`(() => { const controls=Array.from(document.querySelectorAll('button[aria-label]')).filter(button=>['Ulangi tulisan','Hapus goresan terakhir','Periksa tulisan','Petunjuk goresan'].includes(button.getAttribute('aria-label'))); const boxes=controls.map(button=>button.getBoundingClientRect()); return boxes.length===4 && boxes.every(box=>box.width>=44&&box.height>=44&&Math.abs(box.top-boxes[0].top)<1) && controls[2].innerText.trim()==='Periksa'; })()`),'Mobile canvas toolbar fits in one row with accessible tap targets');
    assert.equal(await evaluate('window.__path.getAttribute("d")'),geometry,'Resizing must preserve drawn strokes');
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
    assert.equal(await evaluate('Boolean(document.querySelector(\'button[aria-label="Lewati karakter"]\'))'),false);
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
    await open('quiz'); await waitFor('document.body.innerText.includes("Answer A")');
    await click('Answer A'); await waitFor('document.body.innerText.includes("LANJUT")');
    await waitFor(`(() => { const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='LANJUT');const r=b?.getBoundingClientRect();return r?.bottom<=innerHeight && r.height>=44; })()`);
    assert(await evaluate('document.querySelector("main").getBoundingClientRect().bottom <= document.querySelector("[role=status]").getBoundingClientRect().top + 1'),'Mobile feedback must not cover the answer area');
    await click('LANJUT');
    await waitFor('Boolean(document.querySelector(\'button[aria-label="Sudah paham"]\'))'); await click('Sudah Paham');
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

    await open('quiz&writing=off'); await waitFor('document.body.innerText.includes("Answer A")');
    await click('Answer A'); await waitFor('document.body.innerText.includes("LANJUT")'); await click('LANJUT');
    await waitFor('Boolean(document.querySelector(\'button[aria-label="Sudah paham"]\'))');
    await evaluate('window.__writing.failReading=true'); await click('Sudah Paham');
    await waitFor('window.__writing.requests.some(r=>r.url.includes("user.flashcards.review"))');
    await sleep(200);
    assert(await evaluate('Boolean(document.querySelector(\'button[aria-label="Sudah paham"]\'))'),'Failed flashcard review must not advance');
    await evaluate('window.__writing.failReading=false;window.__setWritingPreference(true)');
    await click('Sudah Paham'); await waitFor('document.body.innerText.includes("Question 2")');
    assert.equal(await evaluate('Boolean(document.querySelector("[id^=kanji-writer-]"))'),false,'Disabled session must skip canvas despite changed props');
    assert.equal(await evaluate('window.__writing.requests.filter(r=>r.data.skill==="writing").length'),0,'Disabled writing creates no writing review');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("japanlingo_cp_vocab_8801_u881")).handwriting_enabled'),false);

    await open('quiz&writing=on', true); await waitFor('document.body.innerText.includes("Lanjutkan Latihan?")');
    await click('Lanjutkan'); await waitFor('document.body.innerText.includes("Question 2")');
    await click('Answer A'); await waitFor('document.body.innerText.includes("LANJUT")'); await click('LANJUT');
    await waitFor('Boolean(document.querySelector(\'button[aria-label="Sudah paham"]\'))'); await click('Sudah Paham');
    await waitFor('window.__writing.requests.some(r=>r.url.includes("user.attempts.store"))');
    assert.equal(await evaluate('window.__writing.requests.filter(r=>r.data.skill==="writing").length'),0,'Resume retains disabled checkpoint even when current Day is enabled');

    await open('quiz&writing=off&single=1'); await waitFor('document.body.innerText.includes("Answer A")');
    await click('Answer A'); await waitFor('document.body.innerText.includes("LANJUT")'); await click('LANJUT');
    await waitFor('Boolean(document.querySelector(\'button[aria-label="Sudah paham"]\'))'); await click('Sudah Paham');
    await waitFor('document.title.includes("Hasil Kuis")');
    assert.equal(await evaluate('window.__writing.requests.filter(r=>r.url.includes("user.attempts.store")).length'),1,'Last flashcard finishes exactly once');
    assert.equal(await evaluate('window.__writing.requests.filter(r=>r.data.skill==="writing").length'),0);

    await evaluate(`localStorage.setItem('japanlingo_cp_vocab_8801_u881',JSON.stringify({currentIndex:1,lives:5,score:1,completedIds:[1],answerEvents:[{question_id:1,answer_text:'Answer A'}],savedAt:Date.now()}))`);
    await open('quiz&writing=off', true); await waitFor('document.body.innerText.includes("Lanjutkan Latihan?")');
    await click('Lanjutkan'); await click('Answer A'); await waitFor('document.body.innerText.includes("LANJUT")'); await click('LANJUT');
    await waitFor('Boolean(document.querySelector(\'button[aria-label="Sudah paham"]\'))'); await click('Sudah Paham');
    await waitFor('document.body.innerText.includes("Karakter 1 dari 2")');

    await evaluate(`localStorage.setItem('japanlingo_cp_vocab_8801_u881',JSON.stringify({currentIndex:1,lives:5,score:1,completedIds:[1],answerEvents:[{question_id:1,answer_text:'Answer A'}],handwriting_enabled:false,savedAt:Date.now()}))`);
    await open('quiz&writing=on', true); await waitFor('document.body.innerText.includes("Lanjutkan Latihan?")');
    await click('Mulai dari Awal'); await click('Answer A'); await waitFor('document.body.innerText.includes("LANJUT")'); await click('LANJUT');
    await waitFor('Boolean(document.querySelector(\'button[aria-label="Sudah paham"]\'))'); await click('Sudah Paham');
    await waitFor('document.body.innerText.includes("Karakter 1 dari 2")');

    await open('builder&writing=off'); await waitFor('document.body.innerText.includes("Preview Siswa")');
    await click('Preview Siswa'); await waitFor('document.body.innerText.includes("Answer A")');
    await click('Answer A'); await waitFor('document.body.innerText.includes("LANJUT")'); await click('LANJUT');
    await waitFor('Boolean(document.querySelector(\'button[aria-label="Sudah paham"]\'))'); await click('Sudah Paham');
    await waitFor('document.body.innerText.includes("Question 2")');
    assert.equal(await evaluate('window.__writing.requests.length'),0,'Disabled builder preview uses .flashcards and does not persist reviews or open writing');

    await open('day'); await waitFor('document.querySelector("[role=switch]")');
    assert.equal(await evaluate('document.querySelector("[role=switch]").checked'),true);
    for(const [width,dark] of [[390,false],[1366,true]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
        await evaluate(`document.documentElement.classList.toggle('dark',${dark})`);
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Day toggle must fit');
        const {data}=await send('Page.captureScreenshot',{format:'png'});
        writeFileSync(path.join(temp,'day-toggle-'+width+'.png'),Buffer.from(data,'base64'));
    }
    await evaluate('document.querySelector("[role=switch]").focus()');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await waitFor('document.querySelector("[role=switch]").checked===false');
    await click('Simpan Hari'); await waitFor('window.__writing.requests.some(r=>r.url.includes("admin.module-days.update"))');
    assert.equal(await evaluate('window.__writing.requests.find(r=>r.url.includes("admin.module-days.update")).data.handwriting_enabled'),false);
    await evaluate('window.__openDay()'); await waitFor('document.querySelector("[role=switch]")');
    assert.equal(await evaluate('document.querySelector("[role=switch]").checked'),false,'Reopened Day retains preference');
    await open('day-exam'); await waitFor('document.querySelector("select[aria-label]")');
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Ujian"]');s.value='901';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await click('Simpan Hari');
    assert.equal(await evaluate('window.__writing.requests.at(-1).data.exam_id'),901,'Edit Day sends numeric exam ID');
    await evaluate('window.__openDay()'); await waitFor('document.querySelector("select[aria-label]")');
    assert.equal(await evaluate('document.querySelector("select[aria-label]").value'),'901','Reopened Day retains exam');
    await evaluate('window.__persistDay({exam_id:902,exam:{title:"Old exam"}})');
    await click('Batal'); await evaluate('window.__openDay()');
    await waitFor('document.querySelector("select[aria-label]")?.selectedOptions[0]?.disabled');
    await click('Simpan Hari');
    assert.equal(await evaluate('window.__writing.requests.at(-1).data.exam_id'),902,'Unavailable selection can be retained');
    await evaluate('window.__openDay()'); await waitFor('document.querySelector("select[aria-label]")');
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Ujian"]');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await click('Simpan Hari');
    assert.equal(await evaluate('window.__writing.requests.at(-1).data.exam_id'),null,'Empty selection detaches');
    for (const locked of [false,true]) {
        await open('student-exam'+(locked?'&locked=1':''));
        await waitFor('document.body.innerText.includes("JFT reading")');
        assert.equal(await evaluate('Array.from(document.querySelectorAll("a")).some(a=>a.getAttribute("href")==="/user/exams/jft-reading")'),!locked);
        for (const [width,dark] of [[390,false],[1366,true]]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
            await evaluate('document.documentElement.classList.toggle("dark",'+dark+')');
            assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Exam card must fit');
            const {data}=await send('Page.captureScreenshot',{format:'png'});
            writeFileSync(path.join(temp,'exam-'+locked+'-'+width+'.png'),Buffer.from(data,'base64'));
        }
        assert.equal(await evaluate('window.__writing.requests.length'),0,'Opening exam card creates no attempt');
    }
    await open('day-create');
    await waitFor('document.querySelector("input[aria-label^=Lanjut]")');
    assert.equal(await evaluate('document.querySelector("input[aria-label^=Lanjut]").checked'),true);
    for (const width of [390,1366]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
        for (const dark of [false,true]) {
            await evaluate('document.documentElement.classList.toggle("dark",'+dark+')');
            assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Create Day toggle fits');
        }
    }
    await click('Tambah & Generate'); await waitFor('window.__writing.created.length===1');
    assert.equal(await evaluate('window.__writing.created[0].openGenerator'),true);
    assert.equal(await evaluate('window.__writing.created[0].day.id'),881);
    assert.equal(await evaluate('"continueToGenerator" in window.__writing.requests[0].data'),false,'UI preference is not persisted');
    await evaluate('window.__openDay()'); await waitFor('document.querySelector("input[aria-label^=Lanjut]")');
    await evaluate('document.querySelector("input[aria-label^=Lanjut]").click()');
    await click('Tambah Hari'); await waitFor('window.__writing.created.length===2');
    assert.equal(await evaluate('window.__writing.created[1].openGenerator'),false);
    await evaluate('window.__openDay()'); await waitFor('document.querySelector("input[aria-label^=Lanjut]")');
    assert.equal(await evaluate('document.querySelector("input[aria-label^=Lanjut]").checked'),true,'Reopening resets opt-out');
    await evaluate('window.__writing.failCreate=true'); await click('Tambah & Generate');
    await waitFor('document.body.innerText.includes("Failed creation fixture")');
    assert.equal(await evaluate('window.__writing.created.length'),2,'Failed creation must not open generator');
    await evaluate('window.__writing.failCreate=false;window.__writing.missingCreated=true'); await click('Tambah & Generate');
    await waitFor('!document.querySelector("input[aria-label^=Lanjut]")');
    assert.equal(await evaluate('window.__writing.created.length'),2,'Missing created Day must not open generator');
    assert.equal(await evaluate('window.__writing.requests.length'),4,'No automatic duplicate creation request');
    await open('day'); await waitFor('document.querySelector("[role=switch]")');
    assert.equal(await evaluate('Boolean(document.querySelector("input[aria-label^=Lanjut]"))'),false,'Edit keeps existing workflow');
    await open('class-type'); await waitFor('document.body.innerText.includes("Tambah Kelas")');
    await click('Tambah Kelas'); await waitFor('document.querySelector("select[aria-label^=Tipe]")');
    assert.equal(await evaluate('document.querySelector("select[aria-label^=Tipe]").value'),'mandiri');
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Tipe kelas"]');s.value='mentor';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await evaluate('document.querySelector("select[aria-label^=Tipe]").value'),'mentor');
    for (const width of [390,1366]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Class type form fits');
        await evaluate('document.querySelector("select[aria-label^=Tipe]").scrollIntoView({block:"center"})');
        const {data}=await send('Page.captureScreenshot',{format:'png'});
        writeFileSync(path.join(temp,'class-type-'+width+'.png'),Buffer.from(data,'base64'));
    }
    assert.deepEqual(errors,[],'No uncaught runtime errors');
    console.log(JSON.stringify({passed:true,checks:['width preserves SVG and geometry','light/dark responsive','skip missing asset','optional props unchanged','actual quiz multi-character skip','double click','review error and retry','learning without completion bonus','disabled writing skips canvas and review','flashcard review failure stays put','session preference survives prop update and resume','last flashcard finishes','legacy checkpoint stays enabled','restart uses latest preference','admin toggle keyboard and retention'],screenshots:'temporary; removed'},null,2));
} catch(error) {
    console.error('Writing browser failure:', error.message, errors);
    throw error;
} finally {
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null)}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}
    await server.close();
    const resolved=path.resolve(temp);
    if(process.env.KEEP_WRITING_SCREENSHOTS) console.log('Review screenshots: '+temp);
    if(!process.env.KEEP_WRITING_SCREENSHOTS && resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('tokuup-writing-test-')){
        try{rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch(error){console.warn('Temporary test cleanup:',error.code,resolved);}
    }
}
