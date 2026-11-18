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
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-presentation-'));
const entry = path.join(root, '__reader-fixture.jsx').replaceAll('\\', '/');

const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import Page from '@/Pages/User/Presentasi/PresentasiPage';
import '/resources/css/app.css';
const requests = window.__readerRequests = [];
router.get = (...args) => requests.push(args);
window.route = () => '/fixture/presentasi';
const program = { title: 'Kelas Bahasa Jepang', level: 'N3', slug: 'kelas', roadmap_url: '/fixture/roadmap' };
const module = { id: 1, title: 'Pola Percakapan dan Tata Bahasa', week_number: 1 };
const decks = [
    { id: 3, module, title: 'Pola Percakapan Sehari-hari', slides: [
        { id:21, title:'Kalimat untuk meminta bantuan', content:'Gunakan bentuk sopan saat meminta bantuan.\\nTanyakan kembali bila jawaban belum jelas.\\nKalimat terakhir harus tetap terlihat.', background:'light' },
        { id:22, title:'Slide gambar', snapshot_url:'/images/promo_jlpt_banner.jpg', canvas_width:1280, canvas_height:720 },
        { id:23, title:'Penutup materi', content:'Ringkasan pola yang sudah dipelajari.', background:'forest' },
    ] },
    { id: 4, module, title: 'Latihan Membaca PDF', source_file_url: '/__reader-pdf' },
    { id: 5, module, title: 'Dokumen tidak tersedia', source_file_url: '/__reader-pdf-unavailable' },
];
await createInertiaApp({
    page:{component:'Fixture',props:{auth:{user:{username:'Tester UI',email:'reader@example.test'}}},url:location.pathname,version:'fixture'},
    resolve:() => () => <Page program={program} decks={decks} modules={[module,{id:2,title:'Percakapan',week_number:2}]} />,
    setup:({el,App,props})=>createRoot(el).render(<App {...props}/>),
});
`;

function makePdf() {
    const stream = (content) => '<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream';
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Count 2 /Kids [3 0 R 5 0 R] >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 640 360] /Resources << >> /Contents 4 0 R >>',
        stream('0.10 0.39 0.34 rg 0 0 640 360 re f\n0.92 0.97 0.95 rg 52 58 536 240 re f\n'),
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 480 360] /Resources << >> /Contents 6 0 R >>',
        stream('0.16 0.31 0.74 rg 0 0 480 360 re f\n0.92 0.95 0.99 rg 48 58 384 240 re f\n'),
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [];
    for (const [index, object] of objects.entries()) {
        offsets.push(pdf.length);
        pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
    }
    const xref = pdf.length;
    pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    for (const offset of offsets) pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
    pdf += 'trailer\n<< /Root 1 0 R /Size ' + (objects.length + 1) + ' >>\nstartxref\n' + xref + '\n%%EOF\n';
    const key = Buffer.from('toku-up-pdf-viewer');
    return Buffer.from(Buffer.from(pdf).map((byte, index) => byte ^ key[index % key.length]));
}

const pdf = makePdf();
const server = await createServer({
    configFile:false, root, cacheDir:path.join(temp,'vite'),
    resolve:{alias:[{find:'@/Layouts/AuthenticatedLayout',replacement:'virtual:reader-layout'},{find:'@',replacement:path.join(root,'resources/js')}]},
    optimizeDeps:{entries:[],include:['react','react-dom','react-dom/client','@inertiajs/react','framer-motion','pdfjs-dist',
        ...['Add','Remove','ArrowBack','ChevronLeft','ChevronRight','Fullscreen','FullscreenExit','Pause','PlayArrow','Slideshow'].map(name=>'@mui/icons-material/'+name)]},
    plugins:[react(),{
        name:'presentation-reader-fixture',
        configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
            if(req.url==='/__reader-pdf-unavailable'){res.writeHead(403).end();return;}
            if(req.url==='/__reader-pdf'){
                assert.equal(req.headers.accept,'application/octet-stream');
                res.writeHead(200,{'Content-Type':'application/octet-stream','X-TOKU-UP-PDF-Transport':'xor-v1'}).end(pdf);
                return;
            }
            if(req.url!=='/__reader')return next();
            res.setHeader('Content-Type','text/html');
            res.end(await vite.transformIndexHtml('/__reader','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="app"></main><script type="module" src="/__reader-fixture.jsx"></script></body></html>'));
        });},
        resolveId(id){if(id==='/__reader-fixture.jsx')return entry;if(id==='virtual:reader-layout')return '\0reader-layout';},
        load(id){if(id===entry)return fixture;if(id==='\0reader-layout')return 'export default ({children})=>children;';}
    }], server:{host:'127.0.0.1',port:0,hmr:false},
});

const errors = [], pending = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome, socket, session, sequence = 0;
const send = (method, params = {}, target = session) => new Promise((resolve,reject)=>{
    const id = ++sequence;
    const timer = setTimeout(()=>{pending.delete(id);reject(new Error('Timeout: '+method));},90000);
    pending.set(id, { resolve:value=>{clearTimeout(timer);resolve(value);}, reject:error=>{clearTimeout(timer);reject(error);} });
    socket.send(JSON.stringify({id,method,params,...(target?{sessionId:target}:{})}));
});
const evaluate = async expression => {
    const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
};
async function waitFor(expression) {
    const deadline = Date.now()+75000;
    while(Date.now()<deadline){if(await evaluate('Boolean('+expression+')'))return;await sleep(125);}
    throw new Error('Timed out: '+expression+' '+await evaluate('document.body.innerText')+' '+errors.join('; '));
}
const button = label => 'document.querySelector('+JSON.stringify('button[aria-label="'+label+'"]')+')';
const click = async label => {await waitFor(button(label));await evaluate(button(label)+'.click()');};
const clickFullscreen = async label => {
    await waitFor(button(label));
    const point = await evaluate(`(() => {
        const target = ${button(label)};
        target.scrollIntoView({ block: 'nearest' });
        const rect = target.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
};
const choose = (index,value) => evaluate('(()=>{const select=document.querySelectorAll("select")['+index+']; select.value='+JSON.stringify(value)+';select.dispatchEvent(new Event("change",{bubbles:true}));})()');
const capture = async name => {
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),name+' has no page overflow');
    const shot = await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(path.join(temp,name+'.png'),Buffer.from(shot.data,'base64'));
};
const pixel = 'Array.from(document.querySelector("canvas").getContext("2d").getImageData(4,4,1,1).data)';
const fullscreenReader = `(document.fullscreenElement || document.querySelector('[aria-modal="true"]'))`;
const fullscreenFits = (viewportLabel, contentSelector) => `(() => {
    const root = ${fullscreenReader};
    const viewport = root?.querySelector('[aria-label="${viewportLabel}"]');
    const content = viewport?.querySelector('${contentSelector}');
    const toolbar = root?.querySelector('[aria-label="Keluar dari layar penuh"]');
    return root && viewport?.clientHeight > root.clientHeight * 0.65 &&
        content?.clientHeight > 0 && content.clientHeight <= viewport.clientHeight + 1 &&
        content.clientWidth <= viewport.clientWidth + 1 &&
        toolbar?.getBoundingClientRect().bottom <= root.getBoundingClientRect().bottom;
})()`;
try {
    await server.listen();
    chrome = spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+path.join(temp,'chrome'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    const endpoint = await new Promise((resolve,reject)=>{
        let output='';
        const timeout=setTimeout(()=>reject(new Error('Chrome startup: '+output)),20000);
        chrome.stderr.on('data',buffer=>{output+=buffer;const match=output.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});
        chrome.once('error',reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    socket.addEventListener('message',event=>{
        const data=JSON.parse(event.data);
        if(pending.has(data.id)){const waiter=pending.get(data.id);pending.delete(data.id);data.error?waiter.reject(new Error(data.error.message)):waiter.resolve(data.result);}
        if(data.method==='Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
    });
    const { targetInfos } = await send('Target.getTargets',{},null);
    ({sessionId:session}=await send('Target.attachToTarget',{targetId:targetInfos.find(target=>target.type==='page').targetId,flatten:true},null));
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:2,mobile:true});
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__reader'});
    await waitFor('document.body.innerText.includes("Kalimat terakhir harus tetap terlihat.")');
    await capture('slide-text-mobile');
    await choose(0,'2');
    assert.deepEqual(await evaluate('window.__readerRequests[0][1]'),{module:'2'});
    await click('Slide berikutnya');
    await waitFor('document.querySelector("figure img")?.naturalWidth>0');
    await click('Perbesar');
    await waitFor('document.querySelector(\'[aria-label="Area slide"]\').scrollWidth>document.querySelector(\'[aria-label="Area slide"]\').clientWidth');
    await capture('slide-image-mobile');
    await click('125%. Pas lebar layar');
    await send('Emulation.setDeviceMetricsOverride',{width:640,height:320,deviceScaleFactor:2,mobile:true});
    await clickFullscreen('Layar penuh');
    await waitFor(fullscreenFits('Area slide', 'figure'));
    await capture('slide-fullscreen-landscape');
    await click('Slide berikutnya');
    await waitFor(fullscreenReader+'?.querySelector("article")?.textContent.includes("Ringkasan pola")');
    await clickFullscreen('Keluar dari layar penuh');
    await waitFor('!'+fullscreenReader);
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:2,mobile:true});
    await click('Slide 3: Penutup materi');
    await waitFor('document.body.innerText.includes("Ringkasan pola yang sudah dipelajari.")');

    await choose(1,'4');
    await waitFor('document.querySelector("canvas")?.style.width && '+pixel+'[3]===255');
    const first = await evaluate(pixel);
    assert(first[1]>first[0]&&first[1]>first[2],'First PDF page is visibly rendered');
    assert(await evaluate('Math.abs(document.querySelector("canvas").clientWidth-document.querySelector(\'[aria-label="Halaman PDF"]\').clientWidth)<=1'),'PDF initially fits available width');
    await capture('pdf-mobile');
    await click('Perbesar');
    await waitFor('document.querySelector("canvas").clientWidth>document.querySelector(\'[aria-label="Halaman PDF"]\').clientWidth');
    await click('115%. Pas lebar layar');
    await click('Halaman berikutnya');
    await waitFor('document.querySelector("canvas").getAttribute("aria-label").endsWith("halaman 2") && '+pixel+'[2]>150');
    await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
    await waitFor('document.querySelector("canvas").clientWidth>600 && Math.abs(document.querySelector("canvas").clientWidth-document.querySelector(\'[aria-label="Halaman PDF"]\').clientWidth)<=1');
    await evaluate('document.documentElement.classList.add("dark")');
    await capture('pdf-desktop');
    await clickFullscreen('Layar penuh');
    await waitFor(fullscreenFits('Halaman PDF', 'canvas'));
    await capture('pdf-fullscreen-desktop');
    await click('Halaman sebelumnya');
    await waitFor(fullscreenReader+'?.querySelector("canvas")?.getAttribute("aria-label").endsWith("halaman 1") && '+pixel+'[1]>80 && '+pixel+'[2]<100');
    await clickFullscreen('Keluar dari layar penuh');
    await waitFor('!'+fullscreenReader+' && Math.abs(document.querySelector("canvas").clientWidth-document.querySelector(\'[aria-label="Halaman PDF"]\').clientWidth)<=1');
    await choose(1,'5');
    await waitFor('document.querySelector("[role=alert]")?.textContent.includes("PDF tidak dapat ditampilkan")');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:['text and image at 320px','week and deck selection','image zoom','PDF canvas pixels, fit, zoom, page change and resize','enter, navigate and exit fullscreen for slide and PDF','unavailable PDF'],screenshots:process.env.KEEP_PRESENTATION_SCREENSHOTS?temp:'temporary; removed'},null,2));
} finally {
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null);}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}
    await server.close();
    if(!process.env.KEEP_PRESENTATION_SCREENSHOTS && path.dirname(path.resolve(temp))===path.resolve(tmpdir()) && path.basename(temp).startsWith('tokuup-presentation-')){
        rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:300});
    }
}
