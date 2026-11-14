import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root=process.cwd();
const browser=process.env.CHROME_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/chromium'].find(existsSync);
assert(browser,'Set CHROME_PATH.');
const temp=mkdtempSync(path.join(tmpdir(),'tokuup-reviews-test-'));
const shots=mkdtempSync(path.join(tmpdir(),'tokuup-reviews-shots-'));
const entry=path.join(root,'__reviews_fixture.jsx').replaceAll('\\','/');
const fixture=String.raw`
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createInertiaApp,router} from '@inertiajs/react';
import Reviews from '@/Pages/Kelas/Ulasan';
import Moderation from '@/Pages/SuperAdmin/Konten/Ulasan';
import '/resources/css/app.css';
const params=new URLSearchParams(location.search), moderator=params.has('moderator');
window.route=(name,id='')=>'/fixture/'+name+'/'+id;
window.axios={get:async()=>({data:{}})};
window.__requests=[];
const sample={id:1,username:'Siswa pengujian',rating:4,comment:'Materi tersusun jelas. <img src=x onerror="window.__xss=true">',updated_at:'2026-11-14T01:00:00Z',status:'published',program_title:'Kelas pengujian',moderation_reason:null};
function Fixture(){
    const [own,setOwn]=React.useState(null),[review,setReview]=React.useState(sample);
    const submit=(method,url,data,options)=>{
        window.__requests.push({method,url,data});options.onStart?.({});
        setTimeout(()=>{
            if(window.__fail)options.onError?.(moderator?{reason:'Alasan wajib diisi.'}:{rating:'Pilih rating.'});
            else{if(method==='put')setOwn({...sample,...data});if(method==='delete')setOwn(null);if(method==='patch')setReview(current=>({...current,status:data.status,moderation_reason:data.reason}));options.onSuccess?.({props:{}});}
            options.onFinish?.();
        },250);
    };
    router.put=(url,data,options)=>submit('put',url,data,options);
    router.delete=(url,options)=>submit('delete',url,{},options);
    router.patch=(url,data,options)=>submit('patch',url,data,options);
    router.get=(url,data)=>window.__requests.push({method:'get',url,data});
    if(moderator)return <Moderation reviews={{data:[review],links:[]}} programs={[{id:1,title:'Kelas pengujian'}]}/>;
    const list=params.has('empty')?[]:[sample,...(own?[{...own,id:2}]:[])];
    return <Reviews program={{id:1,slug:'kelas-pengujian',title:'Kelas Bahasa Jepang untuk Pengujian Tampilan'}} reviews={{data:list,links:[]}} summary={{count:list.length,average:list.length?4:null,distribution:[5,4,3,2,1].map(rating=>({rating,count:rating===4?list.length:0}))}} filters={{rating:'',sort:'newest'}} ownReview={own} canReview={!params.has('readonly')} reviewBlockedReason="Selesaikan satu Hari untuk menulis ulasan." learningContext={!params.has('public')} />;
}
await createInertiaApp({page:{component:'Fixture',props:{auth:{user:params.has('public')?null:{id:881,username:'Siswa',role:moderator?'superadmin':'user',notifications:[]}},socialLinks:{},beta:{}},url:'/',version:'fixture'},resolve:()=>Fixture,setup:({el,App,props})=>createRoot(el).render(<App {...props}/>)});
window.__ready=true;
`;
const icons=['ArrowBack','AutoAwesome','AutoStories','ChatBubbleOutlined','Check','CheckCircle','Close','DarkMode','Dashboard','DeleteOutlineOutlined','EditOutlined','EmojiEvents','ErrorOutlineOutlined','Explore','Facebook','FactCheckOutlined','FeedbackOutlined','InfoOutlined','Instagram','KeyboardArrowDown','KeyboardArrowRight','LibraryBooks','LightMode','LogoutOutlined','Menu','MenuBook','MonitorHeart','NotificationsOutlined','OpenInNew','People','ReceiptLongOutlined','Replay','SaveOutlined','School','Send','Settings','SettingsOutlined','Shield','Star','StarBorder','VideoCameraFront','Visibility','VisibilityOff','WarningAmber','WhatsApp','WorkspacePremium','X','YouTube'];
const server=await createServer({configFile:false,root,cacheDir:path.join(temp,'vite'),resolve:{alias:{'@':path.join(root,'resources/js')}},optimizeDeps:{entries:[],include:['react','react-dom','react-dom/client','@inertiajs/react','@mui/material/Tooltip','@headlessui/react','framer-motion','laravel-echo','pusher-js','axios',...icons.map(name=>'@mui/icons-material/'+name)]},plugins:[react(),{
    name:'review-fixture',
    configureServer(vite){vite.middlewares.use(async(req,res,next)=>{if(req.url.split('?')[0]!=='/__reviews')return next();res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml('/__reviews','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__reviews_fixture.jsx"></script></body></html>'));});},
    resolveId(id){if(id==='/__reviews_fixture.jsx'||id===entry)return entry;},load(id){if(id===entry)return fixture;},
}],server:{host:'127.0.0.1',port:5207,strictPort:false,hmr:false}});
let chrome,socket,session,sequence=0;
const pending=new Map(),errors=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function waitFor(expression,timeout=10000){const until=Date.now()+timeout;while(Date.now()<until){if(await evaluate('Boolean('+expression+')'))return;await sleep(150);}throw new Error('Timeout '+expression+' '+await evaluate('document.body.innerText'));}
async function open(query=''){await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__reviews'+query});await waitFor('window.__ready && document.querySelector("h1")',120000);}
async function click(text,dialog=false){await evaluate(`(()=>{const root=${dialog?'document.querySelector("[role=alertdialog]")':'document'};const b=Array.from(root.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled);if(!b)throw new Error('Missing button '+${JSON.stringify(text)});b.click()})()`);await sleep(100);}
async function input(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);}
try{
    await server.listen();chrome=spawn(browser,['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+path.join(temp,'chrome'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Chrome timeout')),30000);let out='';chrome.stderr.on('data',c=>{out+=c;const m=out.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.on('error',reject);});
    socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    const {targetInfos}=await send('Target.getTargets',{},null);({sessionId:session}=await send('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},null));
    await send('Runtime.enable');await send('Page.enable');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await open();await click('Tulis ulasan');await evaluate(`document.querySelector('button[aria-label="5 bintang"]').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await waitFor(`document.querySelector('button[aria-label="5 bintang"]').getAttribute('aria-pressed')==='true'`);
    await input('textarea[aria-label=Komentar]','Komentar pengujian');await evaluate('window.__fail=true');await click('Simpan');await waitFor('document.querySelector("[role=alert]")');
    assert.equal(await evaluate('document.querySelector("textarea").value'),'Komentar pengujian');
    await evaluate('window.__fail=false');await click('Simpan');await waitFor('document.body.innerText.includes("Edit ulasan")');assert.equal(await evaluate('window.__requests.at(-1).data.rating'),5);
    await click('Edit ulasan');assert.equal(await evaluate('document.querySelector("textarea").value'),'Komentar pengujian');await click('Batal');
    await click('Hapus');await waitFor('document.querySelector("[role=alertdialog]")');await click('Hapus',true);await waitFor('!document.querySelector("[role=alertdialog]") && document.body.innerText.includes("Tulis ulasan")');
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Filter bintang"]');s.value='5';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);assert.equal(await evaluate('window.__requests.at(-1).data.rating'),'5');
    assert.equal(await evaluate('Boolean(window.__xss)'),false);assert.equal(await evaluate('document.querySelectorAll("article img").length'),0);
    for(const query of ['?readonly=1','?public=1&readonly=1','?empty=1']){
        await open(query);if(query.includes('readonly'))assert.equal(await evaluate('document.body.innerText.includes("Tulis ulasan")'),false);if(query.includes('empty'))assert(await evaluate('document.body.innerText.includes("Belum ada ulasan.")'));
    }
    await open('?moderator=1');await click('Sembunyikan');await input('textarea[aria-label="Alasan moderasi"]','Pelanggaran aturan');await click('Sembunyikan');await waitFor('document.querySelector("[role=alertdialog]")');await click('Terapkan',true);await waitFor('!document.querySelector("[role=alertdialog]") && document.body.innerText.includes("Disembunyikan")');assert.equal(await evaluate('window.__requests.at(-1).data.status'),'hidden');
    await click('Pulihkan');await input('textarea[aria-label="Alasan moderasi"]','Layak ditampilkan');await click('Pulihkan');await waitFor('document.querySelector("[role=alertdialog]")');await click('Terapkan',true);await waitFor('!document.querySelector("[role=alertdialog]") && document.body.innerText.includes("Tampil")');
    for(const width of [390,1366])for(const dark of [false,true]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});await open();await evaluate('document.documentElement.classList.toggle("dark",'+dark+')');
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Review page overflow');
        await click('Tulis ulasan');assert(await evaluate('Array.from(document.querySelectorAll("fieldset button")).every(b=>b.getBoundingClientRect().height>=44)'),'Star touch targets');
        const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:70,captureBeyondViewport:false});writeFileSync(path.join(shots,`reviews-${width}-${dark}.jpg`),Buffer.from(data,'base64'));
        await open('?moderator=1');await evaluate('document.documentElement.classList.toggle("dark",'+dark+')');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Moderation overflow');
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,screenshots:shots,checks:['actual review and moderation pages','inline save/error/edit/delete','keyboard rating','escaped comment','readonly/public/empty','filter parameters','moderation confirmation closes','mobile/desktop light/dark overflow']},null,2));
}finally{
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null);}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise(r=>chrome.once('exit',r)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}await server.close();
    const resolved=path.resolve(temp);if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('tokuup-reviews-test-'))try{rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch(e){console.warn('Temporary cleanup',e.code,resolved);}
}
