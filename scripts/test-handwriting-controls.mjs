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
import GrammarBuilder from '@/Components/Features/GrammarQuiz/BuilderKuisGrammar';
import AdminLive from '@/Pages/Admin/RuangKelas/Show';
import StrokePreview from '@/Components/Features/Handwriting/StrokeCharacterPreview';
import BuilderFlashcard from '@/Pages/Admin/Flashcard/BuilderFlashcard';
import DaftarModul, { DayDetailContent, DuolingoPath } from '@/Pages/User/Modul/DaftarModul';
import '/resources/css/app.css';
const params = new URLSearchParams(location.search);
const scenario = params.get('scenario') || 'canvas';
window.route = (name, id = '') => '/fixture/' + name + '/' + id;
window.__writing = { requests: [], fail: false, delay: 60, completions: [], created: [] };
document.addEventListener('click', event => {
    if (event.target.matches?.('input[type="file"]')) {
        event.preventDefault();
        window.__writing.fileClicks = (window.__writing.fileClicks || 0) + 1;
    }
}, true);
const grammarLesson = {
    id: 31, status: 'draft', title: 'Grammar audit fixture', pattern: 'ba-hodo', level: 'JLPT N3',
    intro: { meaning: 'Semakin', formula: 'V-ba', explanation: 'Pola', examples: [] },
    stages: ['transformation', 'sentence_builder', 'context_choice'].map(id => ({ id, questions: [{
        id: id + '-fixture', type: id, prompt: 'Instruksi fixture', context: 'Situasi fixture', japanese: 'Contoh',
        choices: ['A', 'B'], correctAnswer: 'A', explanation: 'Penjelasan', tokens: [{id:'a',text:'A'},{id:'b',text:'B'}], correctOrder: ['a','b'],
    }] })),
};
window.axios = {
    get: async (url) => {
        if (scenario === 'admin-grammar') {
            await new Promise(resolve => { window.__writing.releaseGrammar = resolve; });
            return { data: { lessons: [grammarLesson, {
                ...grammarLesson, id: 32, title: 'Lesson tanpa soal', pattern: 'tara-fixture',
                stages: grammarLesson.stages.map(stage => ({ ...stage, questions: [] })),
            }] } };
        }
        const state = window.__writing;
        state.requests.push({ url });
        await new Promise(resolve => setTimeout(resolve, state.delay));
        const id = Number(url.split('/').at(-1));
        if (state.fail || state.failNext === id) throw new Error('Failed fixture');
        return { data: { lesson: {
            id, pattern: 'Pola ' + id, title: 'Lesson ' + id,
            stages: [{ id: 'transformation', questions: [{ id: id * 10, type: 'transformation', prompt: 'Soal grammar fixture', choices: ['Jawaban benar', 'Jawaban lain'] }] }],
        } } };
    },
    post: async (url, data) => {
        window.__writing.requests.push({ url, data });
        if (scenario === 'student-grammar-sequence') {
            if (url.endsWith('/attempts/start')) return { data: { attempt_id: 919, submission_token: data.submission_token } };
            if (url.endsWith('/answers/first')) return { data: { correct: true, recorded: true } };
            if (window.__writing.submitError) throw new Error('Save failed fixture');
            const passed = !window.__writing.failResult;
            return { data: { passed, score: passed ? 100 : 50, correct_count: passed ? 1 : 0, total_questions: 1, xp_earned: 0 } };
        }
        return { data: { is_correct: true, explanation: 'Correct', score: 100, xp_earned: 0 } };
    },
    patch: async (url, { status }) => ({ data: { message: status === 'published' ? 'Lesson terbit' : 'Lesson draf' } }),
    put: async (url) => {
        window.__writing.requests.push({ url });
        const data = window.__writing.grammarEmptyErrors
            ? { errors: {}, message: 'Draf ditolak oleh server.' }
            : { errors: { 'stages.0.questions.0.explanation': ['Pembahasan tidak valid.'] } };
        throw { response: { status: 422, data } };
    },
};
if (scenario === 'student-grammar-sequence') router.reload = () => {};
if (scenario === 'admin-live') {
    Object.defineProperty(navigator, 'mediaDevices', { value: {
        getUserMedia: async () => { throw new DOMException('Denied by fixture', 'NotAllowedError'); },
    } });
}
if (scenario === 'admin-publish') {
    router.patch = (url, data, options) => {
        options.onError?.({ status: 'Kuis tanpa soal tidak dapat dipublikasikan.' });
        options.onFinish?.();
    };
}
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
    const [daySelection, setDaySelection] = React.useState(null);
    const [day, setDay] = React.useState({ id: 881, day_number: 1, title: 'Day fixture', status: 'draft', handwriting_enabled: true });
    window.__setWritingPreference = setWritingEnabled;
    window.__openDay = () => setDayOpen(true);
    window.__persistDay = (data) => setDay(current => ({ ...current, ...data }));
    if (scenario === 'class-type') return <ManajemenKelas programs={{data:[],links:[]}} tracks={[{id:1,code:'regular',name:'Regular'},{id:2,code:'jlpt',name:'JLPT'}]} levels={[
        {id:5,curriculum_track_id:2,level_name:'N5'}, {id:4,curriculum_track_id:2,level_name:'N4'},
    ]} />;
    if (scenario === 'admin-stroke') return <StrokePreview open character={'\u4e00'} characters={['\u4e00','\u4e8c']} title="Preview kanji" onClose={() => {}} />;
    if (scenario === 'admin-flashcard-picker') return <BuilderFlashcard set={{ id: 501, title:'Set fixture' }} />;
    if (scenario === 'admin-live') return <AdminLive setup={{kloters:[],weeks:[],decks:[]}} exitUrl="/fixture/admin" storeEndpoint="/fixture/live" />;
    if (scenario === 'admin-grammar') return <GrammarBuilder open={dayOpen} onClose={() => setDayOpen(false)} module={{id:1}} day={{id:881,day_number:1}} defaultLevel="JLPT N3" />;
    if (scenario === 'admin-publish') return <BuilderKuisKosakata quiz={{id:8801,title:'Kuis kosong',status:'draft',type:'multiple_choice'}} questions={[]} />;
    if (scenario === 'day-create') return <ModuleDayDialog open={dayOpen} onClose={() => setDayOpen(false)} module={{ id: 1, week_number: 1, title: 'Week fixture' }} onCreated={result => window.__writing.created.push(result)} />;
    if (scenario === 'day' || scenario === 'day-exam') return <ModuleDayDialog open={dayOpen} onClose={() => setDayOpen(false)} module={{ id: 1, week_number: 1, title: 'Week fixture' }} day={day}
        examOptions={scenario === 'day-exam' ? [{ id: 901, title: 'JFT reading', category: 'jft_basic' }] : []} />;
    if (scenario === 'student-exam') return <DayDetailContent onClose={() => {}} mobile={true} day={{ id: 881, day_number: 1, title: 'Day fixture', status: 'active', exam_summary: {
        id: 901, title: 'JFT reading', category: 'jft_basic', type: 'practice', locked: params.has('locked'), lock_reason: 'Ujian ini memerlukan akses premium.', url: params.has('locked') ? null : '/user/exams/jft-reading',
    } }} />;
    if (scenario === 'student-grammar') {
        const lessons = [
            { id: 291, pattern: '\u301c\u3089\u308c\u308b', title: 'Bentuk potensial', progress_status: 'passed' },
            { id: 292, pattern: '\u301c\u3055\u305b\u308b', title: 'Bentuk kausatif', progress_status: 'needs_retry' },
        ].slice(0, Number(params.get('lessons') ?? 2));
        return dayOpen && <main className="max-w-[420px]">
            <DayDetailContent mobile={!params.has('desktop')} onClose={() => setDayOpen(false)}
                onOpenGrammarQuiz={lesson => { window.__writing.completions.push(lesson.id); setDayOpen(false); }}
                day={{ id: 881, day_number: 1, title: 'Day fixture', status: 'active', grammar_lessons: lessons }} />
        </main>;
    }
    if (scenario === 'student-grammar-sequence') {
        const day = { id: 881, day_number: 1, title: 'Day fixture', status: 'active',
            grammar_lessons: [291, 292, 293].map((id, index) => ({
                id, pattern: 'Pola ' + id, progress_status: index === 0 ? 'passed' : 'not_started',
                best_score: index === 0 ? 100 : null,
            })),
            mixed_quiz_summary: { progress_status: 'not_started', locked: false },
        };
        return <DaftarModul weeks={[{ id: 88, week_number: 1, status: 'active', days: [day] }]} />;
    }
    if (scenario === 'student-day-progress') {
        const days = [
            {
                id: 881, day_number: 1, title: 'Day fixture', status: 'active',
                quiz_url: '/fixture/vocab/881', checkpoint_summary: { progress_status: 'passed', best_score: 86 },
                grammar_lessons: Array.from({ length: 6 }, (_, index) => ({
                    id: 300 + index, pattern: 'Pola ' + (index + 1),
                    progress_status: index < 2 ? 'passed' : (index === 2 ? 'needs_retry' : 'not_started'),
                    best_score: index < 2 ? 92 : (index === 2 ? 61 : null),
                })),
                dokkai_lessons: [{ id: 350, title: 'Bacaan fixture', progress_status: 'passed', done: true, best_score: 93 }],
                mixed_quiz_summary: { progress_status: 'needs_retry', best_score: 55, locked: false },
            },
            { id: 882, day_number: 2, status: 'done' },
            { id: 883, day_number: 3, status: 'locked' },
            { id: 884, day_number: 4, status: 'active', flashcard_summary: { reviewed: 2, total: 5 } },
        ];
        return <main className="sm:pt-[55vh]">
            <DuolingoPath week={{ week_number: 1, days }} selectedDayId={daySelection?.id} dayAnchorEl={daySelection?.anchor}
                onDayToggle={(id, anchor) => setDaySelection(current => current?.id === id ? null : { id, anchor })} />
        </main>;
    }
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
const roadmapDependencies = ['axios', '@mui/material/Dialog', '@mui/material/Popper', '@mui/material/useMediaQuery', ...['AccountTree', 'EditOutlined', 'Search', 'AccessTime', 'AccessTimeRounded', 'ArrowForward', 'ArrowForwardRounded', 'BackspaceOutlined', 'CalendarMonth', 'ChevronLeft', 'ChevronRight', 'DescriptionOutlined', 'EditCalendar', 'ExpandMore', 'FindInPage', 'Groups', 'HighlightOff', 'Inventory2Outlined', 'LayersOutlined', 'Lock', 'LockOutlined', 'Quiz', 'QuizOutlined', 'Slideshow'].map(name => '@mui/icons-material/'+name)];
const server = await createServer({ configFile: false, root, cacheDir: path.join(temp, 'vite'),
    optimizeDeps: { entries: [], include: ['react', 'react-dom', 'react-dom/client', '@inertiajs/react', 'kanji-recognizer', 'framer-motion', 'react-confetti', '@headlessui/react', '@mui/material/Tooltip', 'tiny-segmenter', ...['Add','ArrowBack','ArrowDownward','ArrowUpward','Assessment','AutoAwesome','AutoStories','BarChart','ChatBubbleOutlined','Check','CheckCircle','CheckCircleOutlineRounded','CheckCircleOutlined','Close','CloseRounded','ContentCopy','DarkMode','Dashboard','DeleteOutlineOutlined','DrawOutlined','EmojiEvents','ErrorOutlineOutlined','ErrorOutlineRounded','Explore','FactCheckOutlined','Favorite','FeedbackOutlined','FlagOutlined','FormatListBulleted','GraphicEq','HelpOutlineOutlined','ImageOutlined','InfoOutlined','KeyboardArrowDown','KeyboardArrowRight','LibraryBooks','LightMode','LightbulbOutlined','LogoutOutlined','Menu','MenuBook','MicNoneOutlined','MonitorHeart','NotificationsOutlined','OpenInNew','People','PlayArrow','PlayArrowRounded','RadioButtonUnchecked','ReceiptLongOutlined','Refresh','Replay','RestartAltRounded','Restore','SaveOutlined','School','SearchRounded','Settings','SettingsOutlined','Shield','Shuffle','SkipNextRounded','Star','StarBorder','StyleOutlined','TimerOutlined','TrendingUp','UndoRounded','UploadFile','VideoCameraFront','Visibility','VisibilityOutlined','VolumeOff','VolumeUp','WarningAmber','WorkspacePremium'].map(name => '@mui/icons-material/'+name)] },
    resolve: { alias: { '@': path.join(root, 'resources/js') } }, plugins: [react(), {
        name: 'writing-fixture',
        config() {
            const auditIcons = ['Bolt', 'DeleteOutlined', 'Mic', 'MicOff', 'Videocam', 'VideocamOff']
                .map(name => '@mui/icons-material/' + name);
            return { optimizeDeps: { include: [...roadmapDependencies, ...auditIcons] } };
        },
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
    await open('student-grammar&lessons=0');
    await waitFor('document.querySelector("#day-materials-881")');
    assert.equal(await evaluate('document.body.innerText.includes("Grammar")'),false,'No empty Grammar menu');
    const singleGrammar = 'Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Grammar") && !b.hasAttribute("aria-expanded"))';
    await open('student-grammar&lessons=1');
    await waitFor(singleGrammar);
    assert(await evaluate(singleGrammar+'.innerText.includes("Bentuk potensial") || '+singleGrammar+'.innerText.includes("\\u301c\\u3089\\u308c\\u308b")'),'Single lesson shows its pattern');
    await evaluate(singleGrammar+'.click()');
    await waitFor('window.__writing.completions[0] === 291');
    assert.deepEqual(await evaluate('window.__writing.requests'),[{url:'/user/grammar-quizzes/291'}]);
    for (const width of [320,1366]) {
        const desktop = width > 600;
        await send('Emulation.setDeviceMetricsOverride',{width,height:desktop ? 900 : 568,deviceScaleFactor:1,mobile:!desktop});
        await open('student-grammar'+(desktop ? '&desktop=1' : ''));
        const grammarButton = 'document.querySelector("[data-day-grammar]")';
        await waitFor(grammarButton);
        assert(await evaluate(grammarButton+'.innerText.includes("1/2 selesai") && !'+grammarButton+'.hasAttribute("aria-expanded")'),'Grammar is a single action with combined progress');
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Grammar does not overflow horizontally');
        await evaluate('window.__writing.fail=true;window.__writing.delay=450;'+grammarButton+'.click();'+grammarButton+'.click()');
        await waitFor('document.querySelector("#day-materials-881 [role=alert]")');
        assert.deepEqual(await evaluate('window.__writing.requests'),[{url:'/user/grammar-quizzes/292'}],'First unfinished lesson is loaded once');
        await evaluate('window.__writing.fail=false;'+grammarButton+'.click()');
        await waitFor('window.__writing.completions[0]===292 && !document.querySelector("#day-materials-881")');

        await open('student-grammar-sequence');
        await waitFor('document.querySelector(\'button[aria-label^="Hari 1:"]\')');
        await evaluate('document.querySelector(\'button[aria-label^="Hari 1:"]\').click()');
        await waitFor(grammarButton+'?.innerText.includes("1/3 selesai")');
        await evaluate(grammarButton+'.click()');
        const dialog = 'document.querySelector(\'[aria-label="Kuis Grammar"]\')';
        const lessonIs = async (id) => waitFor(dialog+'?.querySelector("h1")?.textContent==="Pola '+id+'"');
        const clickGrammar = async (label) => {
            await waitFor(`Array.from(document.querySelectorAll('button')).some(b => !b.disabled && b.textContent.trim().endsWith(${JSON.stringify(label)}))`);
            await click(label);
        };
        const answer = async () => {
            await clickGrammar('Mulai Lesson');
            await clickGrammar('Jawaban benar');
            await clickGrammar('Periksa');
            await clickGrammar('Lanjut');
        };
        await lessonIs(292);
        await evaluate('window.__writing.failResult=true;window.__writing.submitError=true');
        await answer();
        await waitFor(dialog+'?.innerText.includes("Hasil Grammar gagal disimpan.")');
        await evaluate('window.__writing.submitError=false');
        await click('Lanjut');
        await waitFor(dialog+'?.textContent.includes("Belum lulus")');
        assert(await evaluate(dialog+'?.innerText.includes("1/3 selesai")'));
        await click('Ulangi Lesson');
        await lessonIs(292);
        await evaluate('window.__writing.failResult=false;window.__writing.failNext=' + (desktop ? 'null' : '293'));
        await answer();
        if (!desktop) {
            await waitFor(dialog+'?.innerText.includes("Lesson berikutnya gagal dimuat.")');
            assert(await evaluate(dialog+'?.innerText.includes("2/3 selesai")'));
            const submissions = await evaluate('window.__writing.requests.filter(r=>r.url==="/user/attempts").length');
            await evaluate('window.__writing.failNext=null');
            await click('Coba lagi');
            await lessonIs(293);
            assert.equal(await evaluate('window.__writing.requests.filter(r=>r.url==="/user/attempts").length'),submissions,'Retrying next lesson never resubmits the completed one');
        }
        await lessonIs(293);
        if (desktop) await evaluate('window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))');
        else await click('Kembali');
        await clickGrammar('Keluar sesi');
        await waitFor(grammarButton+'?.innerText.includes("2/3 selesai")');
        await evaluate(grammarButton+'.click()');
        await lessonIs(293);
        await answer();
        await waitFor(dialog+'?.querySelector("h1")?.textContent==="Grammar selesai"');
        await click('Kembali ke Hari');
        await waitFor(grammarButton+'?.innerText.includes("3/3 selesai")');
    }
    for (const [width,height] of [[320,568],[1024,520]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<640});
        await open('student-day-progress');
        const node = 'document.querySelector(\'button[aria-label^="Hari 1:"]\')';
        const popup = 'document.getElementById("day-materials-881")';
        const activities = popup+'.querySelector("[role=region]")';
        await waitFor(node+'?.querySelector(\'circle[stroke-dasharray="43 100"]\')');
        assert(await evaluate('document.querySelector(\'button[aria-label^="Hari 2:"] circle[stroke-dasharray="100 100"]\') !== null'),'Completed Day ring is full');
        assert(await evaluate('document.querySelector(\'button[aria-label^="Hari 3:"]\').disabled && !document.querySelector(\'button[aria-label^="Hari 3:"] circle[stroke-dasharray]\')'),'Locked Day stays locked with an empty ring');
        assert(await evaluate('document.querySelector(\'button[aria-label^="Hari 4:"] circle[stroke-dasharray="40 100"]\') !== null'),'Review-only Day uses flashcard progress');
        await evaluate(node+'.click()');
        await waitFor(popup+'?.querySelector("[data-day-grammar]")');
        assert.deepEqual(await evaluate('Array.from('+activities+'.querySelectorAll(\'span[aria-hidden="true"] > span[style^="width:"]\')).map(bar => bar.style.width)'), ['86%','33%','93%','55%']);
        await waitFor(popup+'.getBoundingClientRect().top >= 0 && '+popup+'.getBoundingClientRect().bottom <= innerHeight + 1');
        assert.equal(await evaluate('document.querySelectorAll("#day-materials-881").length'),1,'Only the viewport-appropriate popup mounts');
        const close = popup+'.querySelector(\'button[aria-label="Tutup detail Hari"]\')';
        const headerOffset = close+'.getBoundingClientRect().top - '+popup+'.getBoundingClientRect().top';
        const headerTop = await evaluate(headerOffset);
        await evaluate(activities+'.scrollTop = '+activities+'.scrollHeight');
        assert(Math.abs((await evaluate(headerOffset)) - headerTop) < 1,'Scrolling does not move the header within the animating popup');
        assert(await evaluate(`(() => { const scroller = ${activities}; const last = scroller.lastElementChild.getBoundingClientRect(); const box = scroller.getBoundingClientRect(); return last.top >= box.top && last.bottom <= Math.min(innerHeight, box.bottom) + 1; })()`),'Mixed Quiz remains reachable below Grammar');
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
    const levelPicker = 'document.querySelector(\'select[aria-label="Level kelas"]\')';
    const trackPicker = 'Array.from(document.querySelectorAll("select")).find(s=>Array.from(s.options).some(o=>o.text==="JLPT"))';
    await waitFor(levelPicker);
    const select = async (element, value) => evaluate(`(()=>{const select=${element};select.value=${JSON.stringify(value)};select.dispatchEvent(new Event("change",{bubbles:true}));})()`);
    await select(trackPicker,'2');
    await waitFor('!'+levelPicker+'.disabled && '+levelPicker+'.options.length===3');
    assert(await evaluate(levelPicker+'.options[0].disabled && '+levelPicker+'.options[0].text==="Pilih level"'));
    await select(levelPicker,'5');
    await select(trackPicker,'1');
    await waitFor(levelPicker+'.value==="" && '+levelPicker+'.options.length===1');
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
    for (const width of [390,1366]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<640});
        await open('admin-publish');
        await waitFor('document.body.innerText.toLowerCase().includes("daftar soal (0)") && document.body.innerText.includes("Total Poin: 0")');
        await click('Terbitkan');
        await click('Publish');
        await waitFor('document.querySelector("[role=alert]")?.innerText.includes("Kuis tanpa soal")');
        await click('Pengaturan');
        await click('Publish Kuis');
        await click('Publish');
        await waitFor('document.querySelector("[role=alert]")?.innerText.includes("Kuis tanpa soal")');
        assert(await evaluate('document.querySelector("[role=alert]").getBoundingClientRect().width <= innerWidth'));
        await open('admin-live');
        await waitFor('document.body.innerText.includes("Izin akses kamera/mikrofon")');
        assert(!(await evaluate('document.body.innerText.includes("Perangkat siap digunakan")')));
        assert(await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Mulai Kelas Instan")).disabled'));
        assert(await evaluate('document.querySelector("[role=alert]").getBoundingClientRect().right <= innerWidth'));
    }
    await open('admin-grammar');
    await waitFor('document.querySelector("[role=status]")?.innerText.includes("Memuat lesson Grammar")');
    assert(!(await evaluate('document.body.innerText.includes("Pola grammar belum diisi")')));
    await waitFor('window.__writing.releaseGrammar');
    await evaluate('window.__writing.releaseGrammar()');
    await waitFor('document.body.innerText.includes("ba-hodo")');
    const grammarPicker = 'document.querySelector(\'select[aria-label="Pilih lesson Grammar"]\')';
    const openGrammarMaterial = () => evaluate(`Array.from(document.querySelectorAll('button > span')).find(el => el.textContent === 'Materi & Pola Grammar').parentElement.click()`);
    await select(grammarPicker,'32');
    await openGrammarMaterial();
    await evaluate(`(() => { const input = Array.from(document.querySelectorAll('input')).find(el => el.value === 'tara-fixture'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'tara-draf'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await click('Simpan Draf');
    await waitFor('document.querySelector("[role=alert]")?.innerText.includes("Belum ada soal")');
    assert.equal(await evaluate(grammarPicker+'.value'),'32','An empty lesson stays selected when saving fails');
    assert.deepEqual(await evaluate('window.__writing.requests'),[],'A lesson without questions is rejected before submitting');
    await openGrammarMaterial();
    await waitFor('Array.from(document.querySelectorAll("input")).some(el=>el.value==="tara-draf")');
    await select(grammarPicker,'31');
    await waitFor('document.body.innerText.includes("Beralih ke Lesson Lain?")');
    assert.equal(await evaluate(grammarPicker+'.value'),'32','Lesson changes only after confirmation');
    await click('Lanjutkan Beralih');
    await waitFor(grammarPicker+'.value==="31"');
    await evaluate('window.__writing.grammarEmptyErrors = true');
    await click('Simpan Draf');
    await waitFor('document.querySelector("[role=alert]")?.innerText.includes("Draf ditolak oleh server")');
    assert.equal(await evaluate(grammarPicker+'.value'),'31','An empty server error map leaves the lesson selected');
    await evaluate('window.__writing.grammarEmptyErrors = false');
    await click('Simpan Draf');
    await waitFor('document.querySelector("[role=alert]")?.innerText.includes("Pembahasan tidak valid")');
    assert.equal(await evaluate(grammarPicker+'.value'),'31');
    await evaluate(`(() => { const input = Array.from(document.querySelectorAll('input')).find(el => el.value === 'Instruksi fixture'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Instruksi diperbaiki'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await waitFor('!document.querySelector("[role=alert]")');
    await click('Terbitkan');
    await waitFor('document.body.innerText.includes("Lesson terbit") && document.querySelector("input[value=\\"Instruksi diperbaiki\\"]")');
    await evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    await waitFor('document.body.innerText.includes("Keluar dari Builder Grammar?")');
    await click('Keluar Sekarang');
    await waitFor('!document.body.innerText.includes("Builder Kuis Grammar")');
    await evaluate('window.__writing.releaseGrammar = null');
    await evaluate('window.__openDay()');
    await waitFor('window.__writing.releaseGrammar');
    await evaluate('window.__writing.releaseGrammar()');
    await waitFor('document.body.innerText.includes("ba-hodo")');
    await click('Terbitkan');
    await waitFor('document.body.innerText.includes("Lesson terbit")');
    await evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    await waitFor('!document.body.innerText.includes("Builder Kuis Grammar")');
    await open('admin-stroke');
    await waitFor('document.body.innerText.includes("Pratinjau siap")');
    const secondCharacter = `document.querySelector('[aria-label="Karakter kanji"] button:last-child')`;
    await evaluate(secondCharacter + '.click()');
    await waitFor(secondCharacter + '.getAttribute("aria-pressed")==="true"');
    await waitFor('document.body.innerText.includes("Pratinjau siap")');
    assert(!(await evaluate('document.body.innerText.includes("Karakter selesai ditulis")')));
    const clickImport = async pattern => evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>new RegExp(${JSON.stringify(pattern)}, 'i').test(b.innerText.trim()));if(!b)throw new Error('Import action missing');b.click()})()`);
    await open('builder');
    await waitFor('document.body.innerText.includes("Simpan Draf")');
    await clickImport('^(Import XLSX / CSV|Impor Soal)$');
    await waitFor('window.__writing.fileClicks===1');
    await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Materi Repetisi")).click()');
    await waitFor('Array.from(document.querySelectorAll("button")).some(b=>/^(Import|Impor Flashcard)$/.test(b.innerText.trim()))');
    await clickImport('^(Import|Impor Flashcard)$');
    await clickImport('^(Import|Unggah) CSV / Excel$');
    await waitFor('window.__writing.fileClicks===2');
    await open('admin-flashcard-picker');
    await waitFor('Array.from(document.querySelectorAll("button")).some(b=>/^(Import|Impor Flashcard)$/.test(b.innerText.trim()))');
    await clickImport('^(Import|Impor Flashcard)$');
    await clickImport('^(Import|Unggah) CSV / Excel$');
    await waitFor('window.__writing.fileClicks===1');
    console.log(JSON.stringify({passed:true,checks:['handwriting and roadmap regressions','vocabulary publish errors from both controls','grammar loading, validation, and clean publish','live preview permission rejection','class track filters','stroke character switch','three import file triggers'],screenshots:'temporary; removed'},null,2));
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
