import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = process.cwd();
const browser = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium'].find(existsSync);
assert(browser, 'Set CHROME_PATH.');
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-social-test-'));
const shots = mkdtempSync(path.join(tmpdir(), 'tokuup-social-shots-'));
const entry = path.join(root, '__social_fixture.jsx').replaceAll('\\', '/');
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import LandingPage from '@/Pages/LandingPage';
import SocialLinksForm from '@/Components/Features/Admin/SocialLinksForm';
import '/resources/css/app.css';
const params = new URLSearchParams(location.search);
window.route = name => '/fixture/'+name;
window.axios = { get: async () => ({data:{}}) };
window.__requests = [];
router.put = (url,data,options) => {
    window.__requests.push({url,data});
    setTimeout(() => {
        if(window.__fail) options.onError?.({'links.instagram':'Gunakan URL HTTPS resmi kanal ini.'});
        else options.onSuccess?.({props:{}});
        options.onFinish?.();
    },200);
};
const socialLinks = params.has('empty') ? {} : {instagram:'https://instagram.com/test',facebook:'https://facebook.com/test',youtube:'https://youtube.com/@test',threads:'https://threads.com/@test',x:'https://x.com/test'};
function Fixture() { return params.has('form') ? <main className="mx-auto max-w-3xl p-4"><SocialLinksForm links={{}} /></main> : <LandingPage />; }
await createInertiaApp({page:{component:'Fixture',props:{auth:{user:null},socialLinks},url:'/',version:'test'},resolve:()=>Fixture,setup:({el,App,props})=>createRoot(el).render(<App {...props}/>)});
window.__ready = true;
`;
const icons = ['Instagram','Facebook','YouTube','X','SaveOutlined','Assignment','ArrowForward','Bolt','Check','EmojiEvents','Headset','ListAlt','LocalFireDepartment','PlayCircle','School','VideogameAsset','VolumeUp','Close','Menu','ChatBubbleOutlined','Send','WhatsApp','Campaign'];
const server = await createServer({ configFile:false, root, cacheDir:path.join(temp,'vite'),
    resolve:{alias:{'@':path.join(root,'resources/js')}},
    optimizeDeps:{entries:[],include:['react','react-dom','react-dom/client','@inertiajs/react','framer-motion','@mui/material/Tooltip','laravel-echo','pusher-js',...icons.map(name=>'@mui/icons-material/'+name)]},
    plugins:[react(),{
        name:'social-fixture',
        configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
            if(req.url.split('?')[0]!=='/__social')return next();
            res.setHeader('Content-Type','text/html');
            res.end(await vite.transformIndexHtml('/__social','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__social_fixture.jsx"></script></body></html>'));
        });},
        resolveId(id){if(id==='/__social_fixture.jsx'||id===entry)return entry;},
        load(id){if(id===entry)return fixture;},
    }], server:{host:'127.0.0.1',port:5206,strictPort:false,hmr:false},
});
let chrome, socket, session, sequence=0;
const pending=new Map(), errors=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},30000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
    socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function waitFor(expression){const until=Date.now()+120000;while(Date.now()<until){if(await evaluate('Boolean('+expression+')'))return;await sleep(150);}throw new Error('Timeout '+expression);}
async function open(query=''){await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__social'+query});await waitFor('window.__ready');}
try{
    await server.listen();
    chrome=spawn(browser,['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+path.join(temp,'chrome'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Chrome timeout')),30000);let out='';chrome.stderr.on('data',c=>{out+=c;const m=out.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.on('error',reject);});
    socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    const {targetInfos}=await send('Target.getTargets',{},null);
    ({sessionId:session}=await send('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},null));
    await send('Runtime.enable');await send('Page.enable');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    for(const width of [390,1366]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
        await open();await waitFor(`document.querySelectorAll('nav[aria-label="Media sosial"] a').length===10`);
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Landing overflow');
        assert(await evaluate(`Array.from(document.querySelectorAll('nav[aria-label="Media sosial"] a')).every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&a.getBoundingClientRect().height>=44)`),'Safe links and touch targets');
        assert(await evaluate(`(()=>{const n=document.querySelector('main nav[aria-label="Media sosial"]');const c=document.querySelector('main a[href="/register"]');return c.getBoundingClientRect().bottom<=n.getBoundingClientRect().top})()`),'Medsos follows CTA');
    }
    await open('?empty=1');await waitFor('document.querySelector("main")');
    assert.equal(await evaluate(`document.querySelectorAll('nav[aria-label="Media sosial"]').length`),0);
    await open('?form=1');await waitFor('document.querySelector("input[aria-label=Instagram]")');
    await evaluate(`(()=>{const i=document.querySelector('input[aria-label=Instagram]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'https://instagram.com/test');i.dispatchEvent(new Event('input',{bubbles:true}));window.__fail=true})()`);
    await evaluate('document.querySelector("button[type=submit]").click()');await waitFor('document.querySelector("[role=alert]")');
    assert.equal(await evaluate('document.querySelector("input[aria-label=Instagram]").value'),'https://instagram.com/test','Draft retained after validation');
    await evaluate('window.__fail=false;document.querySelector("button[type=submit]").click()');await waitFor('window.__requests.length===2 && !document.querySelector("button[type=submit]").disabled');
    assert.equal(await evaluate('window.__requests[1].data.links.instagram'),'https://instagram.com/test');
    await evaluate(`(()=>{const i=document.querySelector('input[aria-label=Instagram]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await evaluate('document.querySelector("button[type=submit]").click()');await waitFor('window.__requests.length===3');
    assert.equal(await evaluate('window.__requests[2].data.links.instagram'),'');
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Form overflow');
    assert.deepEqual(errors,[]);
    for(const width of [390,1366]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
        await open();await waitFor(`document.querySelectorAll('nav[aria-label="Media sosial"] a').length===10`);
        await evaluate('document.getAnimations().forEach(animation=>animation.cancel())');
        const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:70,captureBeyondViewport:false});
        writeFileSync(path.join(shots,'landing-'+width+'.jpg'),Buffer.from(data,'base64'));
    }
    console.log(JSON.stringify({passed:true,screenshots:shots,checks:['actual landing hero/footer','mobile/desktop overflow','safe links/touch targets','empty settings hidden','form error retention/save/clear']},null,2));
}finally{
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null);}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise(r=>chrome.once('exit',r)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}
    await server.close();
    const resolved=path.resolve(temp);
    if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('tokuup-social-test-'))try{rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch(e){console.warn('Temporary cache cleanup',e.code,resolved);}
}
