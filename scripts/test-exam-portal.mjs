import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = process.cwd();
const browser = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium'].find(existsSync);
assert(browser, 'Set CHROME_PATH to Chromium.');
const profile = mkdtempSync(path.join(tmpdir(), 'tokuup-exam-browser-'));
const entry = path.join(root, '__exam-fixture.jsx').replaceAll('\\', '/');
const inertia = path.join(root, '__exam-inertia.jsx').replaceAll('\\', '/');
const inertiaSource = `import React from 'react';
export const Head = () => null;
export const Link = ({children, href, ...props}) => <a href={href} {...props}>{children}</a>;
export const usePage = () => ({props:{auth:{user:{name:'Test'}}},url:'/user/exams'});
export const router = {get:()=>{}};`;
const fixture = String.raw`
import React from 'react';
import { createRoot } from 'react-dom/client';
import Library from '@/Pages/User/Ujian/Portal/Library';
import Index from '@/Pages/User/Ujian/Portal/Index';
import Show from '@/Pages/User/Ujian/Portal/Show';
import '/resources/css/app.css';
window.route = (name, id) => '/fixture/' + name + (id ? '/' + id : '');
window.__exam = {revision:0, saves:0, advances:0, fail:!location.search.includes('builder')&&!location.search.includes('many'), audio:[], lastSave:null, batches:[]};
window.Audio = function(src) { window.__exam.audio.push(src); return document.createElement('audio'); };
const question = (id, text) => location.search.includes('builder') ? ({id,type:'sentence_builder',question_text:'Susun uji',options:['a','a','b'],answer:null}) : ({id, type:id===2?'listening':'multiple_choice', question_text:text, question_reading:'Paragraf satu\nParagraf dua', audio_path:id===2?'https://media.example.invalid/audio.mp3':null, options:['A','B'], answer:null});
const state = (index, revision) => location.search.includes('many')
 ? ({id:77,status:'in_progress',remaining_seconds:3000,server_revision:revision,exam:{title:'Banyak soal',category:'jlpt',type:'simulation'},navigation:null,sections:[{id:1,key:'vocabulary',title:'Kosakata',questions:Array.from({length:105},(_,i)=>({id:i+1,type:'multiple_choice',question_text:'Soal '+(i+1),options:['A','B'],answer:{answer_text:'A'}}))}]})
 : ({id:77,status:location.search.includes('recover')?'submitted':'in_progress',remaining_seconds:3000,server_revision:revision,exam:{title:'JFT test',category:'jft_basic',type:'simulation'},navigation:{section_index:index,question_index:0,section_count:2,question_count:1,has_next:index===0},sections:[{id:index+1,key:index?'listening':'vocabulary',title:index?'Mendengarkan':'Kosakata',questions:[question(index+1,index?'Soal kedua':'Soal pertama')]}]});
window.axios = {
 post: async (url, body) => {
   if(url.includes('attempts.start')) return {data:{attempt:state(0,0)}};
   if(url.includes('attempts.advance')) { if(body.client_revision!==window.__exam.revision) throw {response:{status:409}}; window.__exam.advances++; return {data:{attempt:state(1,++window.__exam.revision)}}; }
   return {data:{result:null}};
 },
 put: async (url, body) => { window.__exam.saves++; window.__exam.lastSave=body; window.__exam.batches.push(body.answers.length); if(window.__exam.fail) throw {response:{status:503}}; if(body.client_revision!==window.__exam.revision) throw {response:{status:409}}; return {data:{server_revision:++window.__exam.revision,remaining_seconds:2990}}; },
 get: async (url) => url.includes('attempts.result') ? ({data:{result:{exam_title:'Hasil tersimpan',status:'completed',label:'Estimasi',score:1,max_score:1,sections:[],review:[]}}}) : ({data:{attempt:state(window.__exam.advances?1:0,window.__exam.revision)}}),
};
const packages = [
 {id:1,title:'Ujian JLPT',slug:'a',description:'',category:'jlpt',level:'N3',type:'simulation',status:'available',duration_minutes:60,question_count:1,section_count:1,sections:[{key:'vocabulary',label:'Kosakata'}]},
 {id:2,title:'Ujian JFT',slug:'b',description:'',category:'jft_basic',type:'practice',status:'available',duration_minutes:60,question_count:1,section_count:1,sections:[{key:'conversation',label:'Percakapan'}]},
 {id:3,title:'Ujian SSW',slug:'c',description:'',category:'ssw',ssw_field:'Perawatan',type:'practice',status:'available',duration_minutes:60,question_count:1,section_count:1,sections:[{key:'technical',label:'Teknis'}]},
];
const exam={...packages[1],title:'JFT test',type:'simulation',session_id:5,sections:[{key:'vocabulary',label:'Kosakata'}]};
createRoot(document.getElementById('app')).render(location.search.includes('runner') ? <Show exam={exam}/> : location.search.includes('home') ? <Index active_exam={packages[0]} exam_packages={packages} viewer={{name:'Test'}}/> : <Library exam_packages={packages} levels={['N3']}/>);
`;
const server = await createServer({configFile:false,root,resolve:{alias:[{find:'@inertiajs/react',replacement:inertia},{find:'@',replacement:path.join(root,'resources/js')}]},plugins:[react(),{
    name:'exam-fixture',
    configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
        if(req.url.split('?')[0]!=='/__exam') return next();
        res.setHeader('Content-Type','text/html');
        res.end(await vite.transformIndexHtml('/__exam','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__exam-fixture.jsx"></script></body></html>'));
    });},
    resolveId(id){if(id==='/__exam-fixture.jsx'||id===entry)return entry;if(id===inertia)return inertia;},
    load(id){if(id===entry)return fixture;if(id===inertia)return inertiaSource;},
}],server:{host:'127.0.0.1',port:5198,strictPort:false,hmr:false}});
let chrome, socket, session, sequence=0;
const pending = new Map(), errors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve,ms));
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{
    const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},20000);
    pending.set(id,{resolve:(value)=>{clearTimeout(timer);resolve(value)},reject:(error)=>{clearTimeout(timer);reject(error)}});
    socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value;}
async function waitFor(expression){const until=Date.now()+60000;while(Date.now()<until){if(await evaluate(`Boolean(${expression})`))return;await sleep(100);}if(await evaluate(`Boolean(${expression})`))return;throw new Error(`Timeout: ${expression} ${await evaluate('document.body.innerText')}`);}
async function click(text){await waitFor(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`);await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled).click()`);}
try {
    await server.listen();
    chrome=spawn(browser,['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Chrome startup timeout')),30000);let output='';chrome.stderr.on('data',(chunk)=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});chrome.on('error',reject);});
    socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    socket.addEventListener('message',(event)=>{const message=JSON.parse(event.data);if(pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);}if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
    const {targetInfos}=await send('Target.getTargets',{},null);({sessionId:session}=await send('Target.attachToTarget',{targetId:targetInfos.find((item)=>item.type==='page').targetId,flatten:true},null));
    await send('Runtime.enable');await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__exam'});await waitFor('document.body.innerText.includes("Ujian SSW")');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("label")).some(e=>e.textContent.includes("Level JLPT"))'),false);
    await evaluate(`(()=>{const s=Array.from(document.querySelectorAll('select')).find(e=>Array.from(e.options).some(o=>o.value==='jft_basic'));s.value='jft_basic';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor('document.body.innerText.includes("Ujian JFT")');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("label")).some(e=>e.textContent.includes("Level JLPT"))'),false);
    await evaluate(`(()=>{const s=Array.from(document.querySelectorAll('select')).find(e=>Array.from(e.options).some(o=>o.value==='jlpt'));s.value='jlpt';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor('Array.from(document.querySelectorAll("label")).some(e=>e.textContent.includes("Level"))');
    await evaluate(`(()=>{const s=Array.from(document.querySelectorAll('select')).find(e=>Array.from(e.options).some(o=>o.value==='ssw'));s.value='ssw';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor('Array.from(document.querySelectorAll("option")).some(o=>o.value==="Perawatan")');assert.equal(await evaluate('document.body.innerText.includes("Ujian JLPT")'),false);
    assert.equal(await evaluate('Array.from(document.querySelectorAll("label")).some(e=>e.textContent.includes("Level JLPT"))'),false);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),true,'Mobile overflow');
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__exam?home'});await waitFor('document.body.innerText.includes("Buka ujian pilihan")');
    await evaluate(`(()=>{const s=Array.from(document.querySelectorAll('select')).find(e=>Array.from(e.options).some(o=>o.value==='2'));s.value='2';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor('Array.from(document.querySelectorAll("a")).some(a=>a.textContent.includes("Buka ujian pilihan")&&a.getAttribute("href").endsWith("/b"))');
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__exam?runner'});await waitFor('document.querySelectorAll("input[type=checkbox]").length===3');
    await evaluate('document.querySelectorAll("input[type=checkbox]").forEach(e=>e.click())');await click('Mulai ujian');await waitFor('document.body.innerText.includes("Soal pertama")');
    await evaluate('window.__realNow=Date.now;Date.now=()=>window.__realNow()+7000');
    await waitFor('/49:5[0-9]/.test(document.body.innerText)');
    await evaluate('Date.now=window.__realNow');
    await evaluate('window.__exam.fail=false');await click('Tandai');await waitFor('window.__exam.lastSave?.answers[0]?.flagged===true');
    await click('Ragu-ragu');await waitFor('window.__exam.lastSave?.answers[0]?.flagged===false');await evaluate('window.__exam.fail=true');
    await evaluate('document.querySelector("input[type=radio]").click()');await click('Lanjutkan');await click('Ya, lanjutkan');await waitFor('document.body.innerText.includes("Jawaban belum tersimpan")');
    assert.equal(await evaluate('window.__exam.advances'),0,'Must not advance on failed save');
    await evaluate('window.__exam.fail=false');await click('Ya, lanjutkan');await waitFor('document.body.innerText.includes("Soal kedua")');
    await waitFor('window.__exam.audio.length>0');
    assert.equal(await evaluate('window.__exam.audio[0]'),'https://media.example.invalid/audio.mp3');
    assert.equal(await evaluate('getComputedStyle(Array.from(document.querySelectorAll("p")).find(p=>p.textContent.includes("Paragraf satu"))).whiteSpace'),'pre-wrap');
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__exam?runner&builder'});await waitFor('document.querySelectorAll("input[type=checkbox]").length===3');
    await evaluate('document.querySelectorAll("input[type=checkbox]").forEach(e=>e.click())');await click('Mulai ujian');await waitFor('document.body.innerText.includes("Susun uji")');
    await click('a');await sleep(100);await click('a');await sleep(100);
    assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).filter(b=>b.textContent.trim()==="a"&&b.disabled).length'),2);
    await send('Page.reload');await waitFor('document.querySelectorAll("input[type=checkbox]").length===3');
    await evaluate('document.querySelectorAll("input[type=checkbox]").forEach(e=>e.click())');await click('Mulai ujian');await waitFor('document.body.innerText.includes("Susun uji")');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).filter(b=>b.textContent.trim()==="a"&&b.disabled).length'),2,'Selections must survive reload');
    await click('Kirim Ujian');await click('Ya, Selesaikan & Kirim');await waitFor('window.__exam.lastSave!==null');
    assert.deepEqual(await evaluate('window.__exam.lastSave.answers[0].answer_payload.option_indexes'),[0,1]);
    assert.equal(await evaluate('window.__exam.lastSave.answers[0].answer_text'),'aa');
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__exam?runner&many'});await waitFor('document.querySelectorAll("input[type=checkbox]").length===3');
    await evaluate('document.querySelectorAll("input[type=checkbox]").forEach(e=>e.click())');await click('Mulai ujian');await waitFor('document.body.innerText.includes("Soal 105")');
    await click('Kirim Ujian');await click('Ya, Selesaikan & Kirim');await waitFor('window.__exam.batches.length===2');
    assert.deepEqual(await evaluate('window.__exam.batches'),[100,5],'Large exams must save in bounded batches');
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__exam?runner&recover'});await waitFor('document.querySelectorAll("input[type=checkbox]").length===3');
    await evaluate('document.querySelectorAll("input[type=checkbox]").forEach(e=>e.click())');await click('Mulai ujian');await waitFor('document.body.innerText.includes("Hasil tersimpan")');
    assert.equal(await evaluate('window.__exam.saves'),0,'Recovery must not save a finished attempt');
    assert.deepEqual(errors,[],'Uncaught browser errors');
    console.log('Exam portal browser checks passed: filters, mobile layout, save retry, JFT navigation, audio, reading, resume and bounded batches.');
} finally {
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null)}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise((resolve)=>chrome.once('exit',resolve)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}
    await server.close();
    const resolved=path.resolve(profile);
    if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('tokuup-exam-browser-')) {
        try { rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300}); }
        catch (error) { console.warn('Chrome temporary profile cleanup:',error.code,resolved); }
    }
}
