import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const native = readFileSync('.A_context_project/gambar_logo/Copy of mentahan tokuup.ai').toString('base64');
const browser = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium'].find(existsSync);
assert(browser);
const temp = mkdtempSync(path.join(tmpdir(), 'tokuup-export-'));
const pending = new Map(), errors = [];
let chrome, socket, session, sequence = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function send(method, params = {}, sessionId = session) {
    return new Promise((resolve, reject) => {
        const id = ++sequence, timer = setTimeout(() => reject(new Error('CDP timeout: ' + method)), 30000);
        pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
}
async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
}
async function waitFor(expression) {
    const end = Date.now() + 90000;
    while (Date.now() < end) { if (await evaluate('Boolean(' + expression + ')')) return; await sleep(200); }
    throw new Error('Timeout: ' + expression + ' ' + JSON.stringify({ view, errors, body: await evaluate('document.body.innerText.slice(0,1200)') }));
}
try {
    chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + path.join(temp, 'chrome'), 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    const endpoint = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Chrome timeout')), 30000);
        chrome.stderr.on('data', chunk => { const match = String(chunk).match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
        chrome.on('error', reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', async event => {
        const message = JSON.parse(event.data);
        if (pending.has(message.id)) { const callback = pending.get(message.id); pending.delete(message.id); message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result); }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);

    });
    const { targetInfos } = await send('Target.getTargets', {}, null);
    ({ sessionId: session } = await send('Target.attachToTarget', { targetId: targetInfos.find(target => target.type === 'page').targetId, flatten: true }, null));

    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.navigate', { url: 'http://[::1]:5173/__brand-export' });
    await sleep(2000);
    const pages = await evaluate(`(async()=>{
        const pdfjs = await import('/node_modules/pdfjs-dist/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
        const pdf = await pdfjs.getDocument({data:Uint8Array.from(atob('${native}'),c=>c.charCodeAt(0))}).promise;
        const output=[];
        for(let n=1;n<=pdf.numPages;n++){
            const page=await pdf.getPage(n), viewport=page.getViewport({scale:2});
            const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
            const ctx=canvas.getContext('2d');
            await page.render({canvasContext:ctx, viewport, background:'rgba(0,0,0,0)'}).promise;
            const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
            let x0=canvas.width,y0=canvas.height,x1=0,y1=0,transparent=0;
            for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
                const a=pixels[(y*canvas.width+x)*4+3];
                if(a===0){transparent++;continue;} if(a>20){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
            }
            output.push({n,width:canvas.width,height:canvas.height,bounds:[x0,y0,x1,y1],transparent,png:canvas.toDataURL('image/png').split(',')[1]});
        }
        const first=output[0];
        const image=new Image(); image.src='data:image/png;base64,'+first.png; await image.decode();
        const canvas=document.createElement('canvas');canvas.width=first.width;canvas.height=first.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        const rows=[];
        for(let y=0;y<canvas.height;y++){let ink=false;for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>20){ink=true;break}rows[y]=ink;}
        const groups=[];let begin=null;
        for(let y=0;y<=rows.length;y++){if(rows[y]&&begin===null)begin=y;if(!rows[y]&&begin!==null){groups.push([begin,y]);begin=null;}}
        const emblem=groups.find(g=>g[1]-g[0]>1000);
        const text=[groups.filter(g=>g[0]>=emblem[1])[0][0],groups.at(-1)[1]];
        function bounds(y0,y1){let left=canvas.width,right=0;for(let y=y0;y<y1;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>20){left=Math.min(left,x);right=Math.max(right,x)}return [left,y0,right-left+1,y1-y0];}
        const mark=bounds(...emblem),word=bounds(...text);
        function exportPart(name,box,width,dark=false,whiteCircle=false){
            const out=document.createElement('canvas');out.width=width;out.height=Math.round(width*box[3]/box[2]);const c=out.getContext('2d');
            if(whiteCircle){c.fillStyle='white';c.beginPath();c.arc(out.width/2,out.height/2,Math.min(out.width,out.height)/2,0,Math.PI*2);c.fill();}
            c.drawImage(canvas,...box,0,0,out.width,out.height);
            if(dark){const d=c.getImageData(0,0,out.width,out.height);for(let i=0;i<d.data.length;i+=4)if(d.data[i]<70&&d.data[i+1]<70&&d.data[i+2]<70){d.data[i]=255;d.data[i+1]=255;d.data[i+2]=255}c.putImageData(d,0,0);}
            return {name,width:out.width,height:out.height,png:out.toDataURL('image/png').split(',')[1]};
        }
        const markPart=exportPart('tokuup-mark',mark,256,false,true);
        const fullCanvas=document.createElement('canvas');fullCanvas.width=first.bounds[2]-first.bounds[0]+1;fullCanvas.height=first.bounds[3]-first.bounds[1]+1;
        const f=fullCanvas.getContext('2d');f.fillStyle='white';f.beginPath();f.arc(mark[0]+mark[2]/2-first.bounds[0],mark[1]+mark[3]/2-first.bounds[1],mark[2]/2,0,Math.PI*2);f.fill();f.drawImage(canvas,-first.bounds[0],-first.bounds[1]);
        const full=document.createElement('canvas');full.width=640;full.height=Math.round(640*fullCanvas.height/fullCanvas.width);full.getContext('2d').drawImage(fullCanvas,0,0,full.width,full.height);
        return [markPart,exportPart('tokuup-wordmark',word,768),exportPart('tokuup-wordmark-dark',word,768,true),{name:'tokuup-full',width:full.width,height:full.height,png:full.toDataURL('image/png').split(',')[1]}];
    })()`);
    for (const page of pages) {
        writeFileSync('public/images/logos/' + page.name + '.png', Buffer.from(page.png, 'base64'));
        console.log(JSON.stringify({...page, png:undefined}));
    }
    for (const [target, source] of Object.entries({
        'public/logo.png': 'tokuup-full',
        'public/images/logos/toku-up-logo.png': 'tokuup-full',
        'public/images/logos/toku-up-wordmark.png': 'tokuup-wordmark',
        'public/images/logos/toku-up-mark.png': 'tokuup-mark',
    })) writeFileSync(target, Buffer.from(pages.find(page => page.name === source).png, 'base64'));
    const mark = Buffer.from(pages.find(page => page.name === 'tokuup-mark').png, 'base64');
    const ico = Buffer.alloc(22); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
    ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(mark.length, 14); ico.writeUInt32LE(22, 18);
    writeFileSync('public/favicon.ico', Buffer.concat([ico, mark]));
} finally {
    if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null)}catch{}socket.close()}
    if(chrome && chrome.exitCode===null){await Promise.race([new Promise(r=>chrome.once('exit',r)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill()}
    if(path.dirname(path.resolve(temp))===path.resolve(tmpdir()) && path.basename(temp).startsWith('tokuup-export-'))rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:300});
}
