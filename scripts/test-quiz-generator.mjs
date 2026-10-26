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
const profile = mkdtempSync(path.join(tmpdir(), 'tokuup-generator-browser-'));
const screenshots = mkdtempSync(path.join(tmpdir(), 'tokuup-generator-images-'));
const entry = path.join(root, '__generator-fixture.jsx').replaceAll('\\', '/');
const fixture = String.raw`
import React from 'react';
import { createRoot } from 'react-dom/client';
import Modal from '@/Components/Features/Quiz/Shared/UnifiedQuizGeneratorModal';
import { vocabularyQuestionsFromDraft, grammarStagesFromDraft, dokkaiMaterialFromDraft } from '@/Components/Features/Quiz/Shared/generatorDraftAdapters';
import '/resources/css/app.css';
const type = new URLSearchParams(location.search).get('type') || 'vocab';
window.route = (name, type) => '/fixture/' + name + (type ? '/' + type : '');
window.__generator = { calls: [], applied: [], mode: 'success', closed: 0 };
const q = (stage, index, suffix = '') => ({ id:'q'+index,kind:stage==='sentence_builder'?'sentence_builder':'choice',stage,
    prompt:'Question '+index+suffix,japanese:'日本語',reading:null,translation:null,context:null,
    choices:[{id:'c1',text:'正解',reading:'せいかい'},{id:'c2',text:'別の選択肢',reading:null}],
    tokens:[{id:'t1',text:'日本語を'},{id:'t2',text:'学びます'}],answer:stage==='sentence_builder'?{correct_order:['t1','t2']}:{choice_id:'c1'},
    explanation:'Explanation',points:1,source:{id:index,quiz_id:21},evidence:type==='dokkai'?{paragraph_number:1,quote:'図書館'}:null });
const material = {passage:{title:'図書館',jlpt_level:'N3'},paragraphs:[{paragraph_number:1,content_raw:'図書館で本を読みます。'}],vocabularies:[]};
window.axios = {
    get: async () => ({data:{data:[{id:21,title:'図書館',question_count:3}],has_more:false}}),
    post: async (url, body, options) => {
        window.__generator.calls.push({url,body});
        if(window.__generator.mode==='slow') await new Promise(resolve=>setTimeout(resolve,800));
        if(options.signal.aborted) throw new Error('Aborted');
        if(window.__generator.mode==='fail') throw {response:{data:{errors:{input:['Bahan belum cukup.']}}}};
        const questions=body.operation==='regenerate'?[q(body.existing_questions.find(q=>q.id===body.question_id).stage,1,' regenerated')]:type==='grammar'?[q('transformation',1),q('sentence_builder',2),q('context_choice',3)]:[q(null,1),q(null,2)];
        return {data:{draft:{schema_version:1,type,level:'N3',material:type==='dokkai'?material:{lesson:body.input},questions,warnings:[]}}};
    }
};
function Fixture(){
    const [open,setOpen]=React.useState(true);
    const [version,setVersion]=React.useState(0);
    return <><button onClick={()=>{setVersion(v=>v+1);setOpen(true)}}>Open generator</button><p>Original builder draft</p>
    <Modal key={version} open={open} type={type} onClose={()=>{window.__generator.closed++;setOpen(false)}}
        initialData={{moduleDayId:1,level:'N3',hasContent:true,input:type==='grammar'?{pattern:'〜ば〜ほど',meaning:'Semakin',examples:[{japanese:'読めば読むほど、上手になります。',translation:'Semakin membaca semakin mahir.'}]}:{}}}
        onApplyDraft={(draft,settings)=>{window.__generator.settings=settings;window.__generator.applied.push(type==='vocab'?vocabularyQuestionsFromDraft(draft):type==='grammar'?grammarStagesFromDraft(draft):dokkaiMaterialFromDraft(draft))}}/></>;
}
createRoot(document.getElementById('app')).render(<Fixture/>);
window.__ready=true;
`;
const server = await createServer({configFile:false,root,resolve:{alias:{'@':path.join(root,'resources/js')}},plugins:[react(),{
    name:'generator-fixture',
    configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
        if(req.url.split('?')[0]!=='/__generator')return next();
        res.setHeader('Content-Type','text/html');
        res.end(await vite.transformIndexHtml('/__generator','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__generator-fixture.jsx"></script></body></html>'));
    });},
    resolveId(id){if(id==='/__generator-fixture.jsx'||id===entry)return entry;},load(id){if(id===entry)return fixture;}
}],server:{host:'127.0.0.1',port:5199,strictPort:false,hmr:false}});
let chrome, socket, session, sequence=0;
const pending=new Map(), errors=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},20000);
    pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});
    socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function waitFor(expression){const until=Date.now()+60000;while(Date.now()<until){if(await evaluate('Boolean('+expression+')'))return;await sleep(100);}throw new Error('Timeout: '+expression+' '+await evaluate('document.body.innerText'));}
async function click(text){
    const selector=`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled&&b.getClientRects().length)`;
    await waitFor(selector);
    const point=await evaluate(`(()=>{const b=${selector};b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
    await sleep(160);
}
async function capture(name){
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),name+' overflow');
    const clipped=await evaluate(`Array.from(document.querySelectorAll('button')).filter(b=>b.getClientRects().length&&b.scrollWidth>b.clientWidth+2).map(b=>b.textContent)`);
    assert.deepEqual(clipped,[],name+' clipped buttons');
    const {data}=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(path.join(screenshots,name+'.png'),Buffer.from(data,'base64'));
}
try{
    await server.listen();
    chrome=spawn(browser,['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    const endpoint=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Chrome startup timeout')),15000);let output='';
        chrome.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
        chrome.on('error',reject);
    });
    socket=new WebSocket(endpoint);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    const {targetInfos}=await send('Target.getTargets',{},null);
    ({sessionId:session}=await send('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},null));
    await send('Runtime.enable');await send('Page.enable');
    for(const type of ['vocab','grammar','dokkai']){
        console.log('Testing generator:',type);
        await send('Emulation.setDeviceMetricsOverride',{width:type==='dokkai'?390:1366,height:900,deviceScaleFactor:1,mobile:type==='dokkai'});
        await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__generator?type='+type});
        await waitFor('window.__ready&&document.querySelector("[role=dialog]")');
        if(type==='dokkai')await waitFor('document.querySelector("input[type=radio]")');
        if(type==='dokkai')await evaluate('document.querySelector("input[type=radio]").click()');
        await capture(type+'-form');
        await click('Buat Draf');await waitFor('document.body.innerText.includes("Pratinjau:")');
        assert.equal(await evaluate('window.__generator.applied.length'),0);
        await evaluate('document.querySelectorAll("details")[0].open=true');
        await capture(type+'-preview');
        await evaluate('Array.from(document.querySelectorAll("details")).find(d=>d.querySelector("summary").textContent.includes("Question 1")).open=true');
        await click('Variasi Baru');await waitFor('document.body.innerText.includes("regenerated")');
        await click('Terapkan ke Builder');await waitFor('document.body.innerText.includes("Ganti isi draf editor?")');
        assert.equal(await evaluate('window.__generator.applied.length'),0);
        await click('Batal');await waitFor('document.body.innerText.includes("Pratinjau:")');
        await click('Terapkan ke Builder');await click('Ganti Draf');
        await waitFor('window.__generator.applied.length===1');
        assert.equal(await evaluate('window.__generator.calls.length'),2,'Apply must not save');
        if(type==='grammar')assert.equal(await evaluate('window.__generator.applied[0][1].questions[0].correctOrder.length'),2);
        if(type==='grammar')assert.deepEqual(await evaluate('window.__generator.settings'),await evaluate('window.__generator.calls[0].body.settings'));
        if(type==='vocab')assert.equal(await evaluate('window.__generator.applied[0][0].id'),null);
        if(type==='dokkai')assert.equal(await evaluate('window.__generator.applied[0].questions[0].evidence_paragraph_number'),1);
        await click('Open generator');
        if(type==='dokkai'){await waitFor('document.querySelector("input[type=radio]")');await evaluate('document.querySelector("input[type=radio]").click()');}
        await click('Buat Draf');await waitFor('document.body.innerText.includes("Pratinjau:")');
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await waitFor('!document.querySelector("[role=dialog]")');
    }
    await click('Open generator');
    await evaluate('window.__generator.mode="fail"');await click('Buat Draf');
    await waitFor('document.body.innerText.includes("Bahan belum cukup.")');
    assert.equal(await evaluate('document.body.innerText.includes("Pratinjau:")'),false);
    await evaluate('window.__generator.mode="slow"');await click('Buat Draf');await click('Batal');await sleep(950);
    assert.equal(await evaluate('document.body.innerText.includes("Pratinjau:")'),false,'Closed modal must ignore stale response');
    assert.deepEqual(errors,[],'Uncaught browser errors');
    console.log(JSON.stringify({passed:true,types:3,checks:['preview','local adapters','replace confirmation/cancel','no save on apply','Escape','422','abort stale response','responsive overflow'],screenshots},null,2));
}catch(error){
    console.error('Generator browser test failed:',error);
    throw error;
}finally{
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null)}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}
    await server.close();
    const resolved=path.resolve(profile);
    if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('tokuup-generator-browser-')){
        try{rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});}
        catch(error){console.warn('Chrome temporary profile cleanup:',error.code,resolved);}
    }
}
