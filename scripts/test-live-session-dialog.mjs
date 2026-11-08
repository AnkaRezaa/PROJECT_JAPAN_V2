import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = process.cwd();
const browser = process.env.CHROME_PATH || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium'].find(existsSync);
assert(browser, 'Set CHROME_PATH to a Chromium browser.');
const profile = mkdtempSync(path.join(tmpdir(), 'tokuup-live-dialog-'));
const entry = path.join(root, '__live_dialog_fixture.jsx').replaceAll('\\', '/');
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { router } from '@inertiajs/react';
import LiveSessionDialog from '@/Components/Features/LiveClass/LiveSessionDialog';
import PlanningSession from '@/Components/Features/LiveClass/PlanningSession';
import '/resources/css/app.css';
const status = new URLSearchParams(location.search).get('status') || 'scheduled';
function Fixture() {
    const [open,setOpen] = React.useState(true), [rsvp,setRsvp] = React.useState(null);
    router.post = (url,data,options) => { window.__response = data.response; setRsvp(data.response); options.onFinish(); };
    const session = { id:1, status, access_allowed:true, rsvp, rsvp_url:'/rsvp', join_url:'/join', recording_url:'https://example.com/video', summary_url:'https://example.com/summary' };
    return <><button onClick={()=>setOpen(true)}>Buka</button><LiveSessionDialog open={open} onClose={()=>setOpen(false)} item={{title:'Kelas Bahasa Jepang',detail:'12 November, 10.00',session}}/><PlanningSession session={{...session,title:'Kelas Bahasa Jepang',kloter:'Kloter',attendance_url:'/attendance',materials_url:'/materials'}} inputClass="block w-full border p-2" /></>;
}
window.fetch = async () => ({ ok:true, json: async () => ({members:[{id:1,name:'Peserta',response:'attending'}]}) });
createRoot(document.getElementById('app')).render(<Fixture/>); window.__ready = true;
`;
const server = await createServer({ configFile:false, root, resolve:{ alias:{'@':path.join(root,'resources/js')}, dedupe:['react','react-dom'] }, optimizeDeps:{ include:['react','react-dom','react-dom/client','@inertiajs/react','@mui/material/Dialog','@mui/icons-material/Close'] }, plugins:[react(), {
    name:'live-dialog-fixture', configureServer(vite) { vite.middlewares.use(async (req,res,next) => {
        if (req.url.split('?')[0] !== '/__live_dialog') return next();
        res.setHeader('Content-Type','text/html');
        res.end(await vite.transformIndexHtml('/__live_dialog','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__live_dialog_fixture.jsx"></script></body></html>'));
    }); }, resolveId(id) { if (id === '/__live_dialog_fixture.jsx' || id === entry) return entry; }, load(id) { if (id === entry) return fixture; }
}], server:{host:'127.0.0.1', port:5199, strictPort:false, hmr:false} });
let chrome, socket, session, sequence=0;
const pending = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
function send(method,params={},sessionId=session) { return new Promise((resolve,reject) => {
    const id=++sequence, timer=setTimeout(()=>reject(new Error('CDP timeout: '+method)),30000);
    pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});
    socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
}); }
async function evaluate(expression) { const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true}); if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result?.value; }
async function waitFor(expression) { const until=Date.now()+120000; while(Date.now()<until) { if(await evaluate(`Boolean(${expression})`)) return; await sleep(100); } throw new Error('Timeout: '+expression); }
try {
    await server.listen();
    chrome=spawn(browser,['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Browser startup timeout')),30000);let output='';chrome.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});chrome.on('error',reject);});
    socket=new WebSocket(endpoint); await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')console.error(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);});
    const targets=await send('Target.getTargets',{},null); ({sessionId:session}=await send('Target.attachToTarget',{targetId:targets.targetInfos.find(target=>target.type==='page').targetId,flatten:true},null));
    await send('Runtime.enable'); await send('Page.enable');
    for (const width of [390,1366]) for (const dark of [false,true]) for (const status of ['scheduled','live','ended']) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});
        await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__live_dialog?status='+status});
        await waitFor('window.__ready && document.querySelector("[role=dialog]")');
        await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
        const state=await evaluate(`(()=>{const d=document.querySelector('[role=dialog]'),r=d.getBoundingClientRect();return {text:d.innerText,width:document.documentElement.scrollWidth,view:innerWidth,left:r.left,right:r.right};})()`);
        assert(state.width<=state.view+2 && state.left>=-1 && state.right<=state.view+1,'dialog overflow');
        assert(state.text.includes(status==='scheduled'?'Rencana kehadiran':status==='live'?'Masuk kelas':'Tonton rekaman'),status+' action missing');
        if(status==='scheduled') { await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Akan hadir").click()'); await waitFor('window.__response === "attending"'); assert(await evaluate('document.querySelector("button[aria-pressed=true]")?.textContent === "Akan hadir"')); }
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await waitFor('!document.querySelector("[role=dialog]")');
        await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Lihat kehadiran").click()');
        await waitFor('document.body.innerText.includes("Hadir: 1")');
        if(status==='ended') assert(await evaluate('document.body.innerText.includes("Tautan rekaman")'));
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'mentor panel overflow');
        console.log(`PASS ${width} ${dark?'dark':'light'} ${status}`);
    }
} finally {
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null);}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}
    await server.close();
    const resolved=path.resolve(profile);
    if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('tokuup-live-dialog-')){
        try{rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch(error){console.warn('Browser profile cleanup:',error.code);}
    }
}
