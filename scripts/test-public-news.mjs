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
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-news-test-'));
const shots = mkdtempSync(path.join(tmpdir(), 'tokuup-news-shots-'));
const entry = path.join(root, '__news_fixture.jsx').replaceAll('\\', '/');
const fixture = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createInertiaApp,router} from '@inertiajs/react';
import Index from '@/Pages/Public/Berita/Index';
import Detail from '@/Pages/User/Berita/DetailBerita';
import Landing from '@/Pages/LandingPage';
import '/resources/css/app.css';
window.route=(name,id)=>name==='public.news.index'?'/berita':name==='public.news.show'?'/berita/'+id:'/fixture/'+name;
window.axios={get:async()=>({data:{}})};
window.__requests=[];
router.get=(url,data,options)=>{window.__requests.push({url,data});options.onFinish?.();};
const params=new URLSearchParams(location.search);
const items=Array.from({length:3},(_,i)=>({id:i+1,slug:'artikel-'+i,title:i===0?'Panduan Belajar Bahasa Jepang untuk Memulai Kebiasaan yang Konsisten':'Materi dan Kegiatan Kelas Bahasa Jepang',excerpt:'Ringkasan artikel pembelajaran bahasa Jepang dan kegiatan kelas.',category:'tips-belajar',published_label:'14 November 2026',thumbnail_url:'/images/logos/toku-up-wordmark.png',url:'/berita/artikel-'+i}));
const links=[{url:null,label:'Previous',active:false},{url:'/berita',label:'1',active:true},{url:'/berita?page=2',label:'2',active:false},{url:'/berita?page=2',label:'Next',active:false}];
const news={data:params.has('empty')?[]:items,links:params.has('empty')?[]:links};
const seo={title:'Berita',description:'Berita TOKU-UP',canonical:'http://localhost/berita',robots:'noindex, nofollow'};
const detail={...items[0],body:'<h2>Rencana belajar</h2><p>'+('Materi belajar bahasa Jepang. '.repeat(30))+'</p><p>'+('Panjang'.repeat(80))+'</p><table><tbody><tr>'+Array.from({length:10},()=>'<td>Materi pembelajaran</td>').join('')+'</tr></tbody></table>',attachments:[],reading_blocks:[],author_name:'TOKU-UP',reading_time_minutes:2};
function Fixture(){return params.has('detail')?<Detail newsItem={detail} relatedNews={items.slice(1)} publicView seo={seo}/>:params.has('landing')?<Landing latestNews={params.has('empty')?[]:items}/>:<Index news={news} filters={{}} categories={['tips-belajar','platform']} seo={seo}/>;}
await createInertiaApp({page:{component:'Fixture',props:{auth:{user:null},socialLinks:{}},url:'/berita',version:'test'},resolve:()=>Fixture,setup:({el,App,props})=>createRoot(el).render(<App {...props}/>)});
window.__ready=true;
`;
const icons = ['Search','AccessTime','ArrowBack','AttachFile','Assignment','ArrowForward','Bolt','Check','EmojiEvents','Headset','ListAlt','LocalFireDepartment','PlayCircle','School','VideogameAsset','VolumeUp','Close','Menu','ChatBubbleOutlined','Send','WhatsApp','Campaign','Instagram','Facebook','YouTube','X','AutoAwesome','AutoStories','CheckCircle','DarkMode','Dashboard','ErrorOutlineOutlined','Explore','FactCheckOutlined','FeedbackOutlined','InfoOutlined','KeyboardArrowDown','KeyboardArrowRight','LibraryBooks','LightMode','LogoutOutlined','MenuBook','MonitorHeart','NotificationsOutlined','OpenInNew','People','ReceiptLongOutlined','Replay','Settings','SettingsOutlined','Shield','VideoCameraFront','WarningAmber','WorkspacePremium'];
const server = await createServer({configFile:false,root,cacheDir:path.join(temp,'vite'),
    resolve:{alias:{'@':path.join(root,'resources/js')}},
    optimizeDeps:{entries:[],include:['react','react-dom','react-dom/client','@inertiajs/react','framer-motion','@mui/material/Tooltip','laravel-echo','pusher-js','tiny-segmenter',...icons.map(name=>'@mui/icons-material/'+name)]},
    plugins:[react(),{name:'news-fixture',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
        if(req.url.split('?')[0]!=='/__news')return next();
        res.setHeader('Content-Type','text/html');
        res.end(await vite.transformIndexHtml('/__news','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__news_fixture.jsx"></script></body></html>'));
    });},resolveId(id){if(id==='/__news_fixture.jsx'||id===entry)return entry;},load(id){if(id===entry)return fixture;}}],
    server:{host:'127.0.0.1',port:5208,strictPort:false,hmr:false}});
let chrome, socket, session, sequence=0;
const pending=new Map(), errors=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},30000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
    socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function waitFor(expression){const until=Date.now()+90000;while(Date.now()<until){if(await evaluate('Boolean('+expression+')'))return;await sleep(150);}throw new Error('Timeout '+expression);}
async function open(query=''){await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__news'+query});await waitFor('window.__ready');}
try {
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
        for(const query of ['', '?detail=1', '?landing=1']){
            await open(query);
            await waitFor(query.includes('detail')?'document.querySelector("article h1")':query.includes('landing')?'document.querySelector("#latest-news-heading")':'document.querySelectorAll("main article").length===3');
            for(const dark of [false,true]){
                await evaluate(`document.documentElement.classList.toggle('dark',${dark})`);
                await sleep(250);
                assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Page overflow '+width+query+dark);
            }
            if(query===''){
                const contrast=await evaluate(`(()=>{const a=Array.from(document.querySelectorAll('main a')).find(a=>a.textContent==='2');const luminance=c=>{const rgb=c.match(/[\\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4});return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722};const fg=luminance(getComputedStyle(a).color),bg=luminance(getComputedStyle(document.querySelector('main')).backgroundColor);return (Math.max(fg,bg)+0.05)/(Math.min(fg,bg)+0.05)})()`);
                assert(contrast>=4.5,'Dark pagination contrast '+contrast);
            }
            if(query.includes('landing')){
                await evaluate('document.querySelector("#latest-news-heading").scrollIntoView();document.getAnimations().forEach(a=>a.cancel())');
                assert.equal(await evaluate('document.querySelectorAll("section[aria-labelledby=latest-news-heading] article").length'),3);
                assert(await evaluate('Array.from(document.querySelectorAll("section[aria-labelledby=latest-news-heading] img")).every(i=>i.complete&&i.naturalWidth>0)'),'News images rendered');
            }
            if(query.includes('detail')){
                assert(await evaluate('document.querySelector("article h1").getBoundingClientRect().bottom < document.querySelector("figure").getBoundingClientRect().top'),'Article title does not overlap cover');
                assert(await evaluate('parseFloat(getComputedStyle(document.querySelector(".public-news-body h2")).fontSize)>=20'),'Public article typography');
                assert(await evaluate('Array.from(document.querySelectorAll("aside a")).every(a=>a.getAttribute("href").startsWith("/berita/"))'),'Related articles stay public');
            }
            const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:70,captureBeyondViewport:false});
            writeFileSync(path.join(shots,(query.includes('detail')?'detail':query.includes('landing')?'landing':'index')+'-'+width+'.jpg'),Buffer.from(data,'base64'));
        }
    }
    await open();
    await evaluate(`(()=>{const i=document.querySelector('input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Panduan');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await evaluate(`(()=>{const s=document.querySelector('main select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'platform');s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await evaluate('document.querySelector("main button[type=submit]").click()');
    await waitFor('window.__requests.length===1');
    assert.deepEqual(await evaluate('window.__requests[0].data'),{search:'Panduan',category:'platform'});
    await open('?empty=1');assert(await evaluate('document.querySelector("[role=status]").textContent.includes("Belum ada berita")'));
    await open('?landing=1&empty=1');assert.equal(await evaluate('document.querySelector("#latest-news-heading")'),null);
    if(process.env.NEWS_LIVE_URL){
        await send('Page.navigate',{url:process.env.NEWS_LIVE_URL.replace(/\/$/,'')+'/berita'});
        await waitFor('document.querySelector("main h1")?.textContent==="Berita"');
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Actual localhost overflow');
        assert(await evaluate('document.querySelector("main form input[type=search]")!==null'),'Actual localhost search rendered');
        console.log('Actual Laravel localhost page rendered successfully.');
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,screenshots:shots,checks:['real list/detail/landing components','desktop/mobile light/dark overflow','real image rendering','search/category submission','public detail links','empty states']},null,2));
} finally {
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null);}catch{}socket.close();}
    if(chrome&&chrome.exitCode===null){await Promise.race([new Promise(r=>chrome.once('exit',r)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();}
    await server.close();
    const resolved=path.resolve(temp);
    if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('tokuup-news-test-'))rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});
}
