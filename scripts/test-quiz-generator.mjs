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
import HighlightedLearningText from '@/Components/Features/Learning/HighlightedLearningText';
import QuestionHighlightField from '@/Components/Features/Quiz/Shared/QuestionHighlightField';
import QuestionReadingField from '@/Components/Features/Quiz/Shared/QuestionReadingField';
import { vocabularyQuestionsFromDraft, appendVocabularyQuestionsFromDraft, grammarStagesFromDraft, dokkaiMaterialFromDraft } from '@/Components/Features/Quiz/Shared/generatorDraftAdapters';
import { emptyQuestion } from '@/lib/quizHelpers';
import '/resources/css/app.css';
const type = new URLSearchParams(location.search).get('type') || 'vocab';
const appendMode = new URLSearchParams(location.search).get('apply') === 'append';
window.__appendVocabulary = appendVocabularyQuestionsFromDraft;
window.__emptyQuestion = emptyQuestion;
window.route = (name, type) => '/fixture/' + name + (type ? '/' + type : '');
window.__generator = { calls: [], applied: [], mode: 'success', closed: 0 };
const q = (stage, index, suffix = '') => ({ id:'q'+index,kind:stage==='sentence_builder'?'sentence_builder':'choice',stage,
    highlight_text:'Question',show_question_reading:false,
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
function HighlightFixture(){
    const [target,setTarget]=React.useState('Question');
    const [reading,setReading]=React.useState('kana');
    const [showReading,setShowReading]=React.useState(false);
    return <main className="space-y-4 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div id="reading-field"><QuestionReadingField value={reading} showReading={showReading} onReadingChange={setReading} onVisibilityChange={setShowReading}/><output data-visible={showReading}>{reading}</output></div>
        <QuestionHighlightField text="Question one. Question two." value={target} onChange={setTarget}/>
        <div id="question-highlight"><HighlightedLearningText text={'  \u304d\u3085\u3046 / \u304d\u3085\u3046\n'} term={'\u304d\u3085\u3046'} variant="question"/></div>
        <div id="special-highlight"><HighlightedLearningText text="a+b? [a+b?]" term="a+b?" variant="question"/></div>
        <div id="html-highlight"><HighlightedLearningText text={'<img src=x onerror=alert(1)>'} term="img" variant="question"/></div>
        <div id="literal-parentheses"><HighlightedLearningText text={'(Noun) (\u99c5) \\\u0028\u5b66\u6821\\\u0029'} variant="question"/></div>
        <div id="marked-preview"><QuestionHighlightField text={'Pilih (\u99c5) (Noun).'} value="" onChange={()=>{}} /></div>
        <div id="ambiguous-preview"><QuestionHighlightField text={'Pilih (\u99c5) (\u5b66\u6821).'} value="" onChange={()=>{}} /></div>
        <div id="legacy-highlight"><HighlightedLearningText text="Word word" term="word"/></div>
    </main>;
}
function Fixture(){
    const [open,setOpen]=React.useState(true);
    const [version,setVersion]=React.useState(0);
    const [builderQuestions,setBuilderQuestions]=React.useState([{...emptyQuestion(),id:42,question_text:'Original unsaved question',correct_answer:'A',options:['A','B'],points:3,explanation:'Keep this draft'}]);
    return <><button onClick={()=>{setVersion(v=>v+1);setOpen(true)}}>Open generator</button><p>Original builder draft</p>
    <Modal key={version} open={open} type={type} applyMode={appendMode?'append':'replace'} onClose={()=>{window.__generator.closed++;setOpen(false)}}
        initialData={{moduleDayId:1,level:'N3',hasContent:true,input:type==='grammar'?{pattern:'〜ば〜ほど',meaning:'Semakin',examples:[{japanese:'読めば読むほど、上手になります。',translation:'Semakin membaca semakin mahir.'}]}:{}}}
        onApplyDraft={(draft,settings)=>{
            window.__generator.settings=settings;
            if(appendMode){
                const next=appendVocabularyQuestionsFromDraft(draft,builderQuestions);
                setBuilderQuestions(next);
                window.__generator.draft=draft;
                window.__generator.applied.push(next);
            }else window.__generator.applied.push(type==='vocab'?vocabularyQuestionsFromDraft(draft):type==='grammar'?grammarStagesFromDraft(draft):dokkaiMaterialFromDraft(draft));
        }}/></>;
}
const GrammarBuilder = type==='grammar-builder'
    ? (await import('@/Components/Features/GrammarQuiz/BuilderKuisGrammar')).default
    : null;
const FlashcardBuilder = type==='flashcard-builder'
    ? (await import('@/Pages/Admin/Flashcard/BuilderFlashcard')).default
    : null;
if(type==='flashcard-builder'){
    const {router}=await import('@inertiajs/react');
    router.post=(url,body,options)=>{
        window.__generator.calls.push({url,body});
        options.onError({'cards.0.vocabulary_id':'Kosakata tidak tersedia untuk minggu ini.'});
        options.onFinish();
    };
}
function GrammarBuilderFixture(){
    const stages = ['transformation','sentence_builder','context_choice'].map(id=>({id,questions:[]}));
    window.axios.get=async()=>({data:{lessons:[
        {id:41,title:'Lesson pertama',pattern:'Pattern A',status:'draft',intro:{examples:[]},stages},
        {id:42,title:'Lesson kedua',pattern:'Pattern B',status:'draft',intro:{examples:[]},stages},
    ]}});
    window.axios.delete=async(url)=>{
        window.__generator.calls.push({url});
        if(window.__generator.mode==='fail')throw {response:{status:422,data:{errors:{lesson:['Lesson memiliki riwayat pengerjaan. Ubah menjadi draf untuk menyembunyikannya.']}}}};
    };
    return <GrammarBuilder open day={{id:1,day_number:1}} module={{title:'Week 1'}} onClose={()=>{}}/>;
}
const flashcardSet={id:1,module_id:1,title:'Set lama',status:'draft',flashcards:[{
    id:4,vocabulary_id:7,front_text:'Station',reading:'eki',back_text:'Arti kartu tersimpan',
    vocabulary:{id:7,module_id:2,word:'Station',reading:'eki',meaning_id:'Arti bank',content_type:'kanji'},
}]};
createRoot(document.getElementById('app')).render(type==='highlight'?<HighlightFixture/>:type==='grammar-builder'?<GrammarBuilderFixture/>:type==='flashcard-builder'?<FlashcardBuilder embedded set={flashcardSet} vocabulary={{data:[]}}/>:<Fixture/>);
window.__ready=true;
`;
const icons=['Close','Add','DeleteOutlineOutlined','Refresh','AutoAwesome','CheckCircle','ErrorOutlineOutlined','InfoOutlined','WarningAmber','ArrowBack','ArrowDownward','ArrowForward','ArrowUpward','AutoStories','BackspaceOutlined','Bolt','CheckCircleOutlined','ChevronRight','ContentCopy','DescriptionOutlined','EditOutlined','EmojiEvents','ErrorOutlineRounded','FormatListBulleted','GraphicEq','LibraryBooks','LightbulbOutlined','MenuBook','MicNoneOutlined','PlayArrow','RadioButtonUnchecked','Restore','SaveOutlined','Search','SettingsOutlined','UploadFile','Visibility','VolumeOff','VolumeUp'];
const server = await createServer({configFile:false,root,cacheDir:path.join(screenshots,'vite-cache'),optimizeDeps:{entries:[],include:['react','react-dom','react-dom/client','@headlessui/react','framer-motion','@mui/material/Tooltip','@inertiajs/react','tiny-segmenter',...icons.map(name=>'@mui/icons-material/'+name)]},resolve:{alias:[{find:'@/Layouts/AuthenticatedLayout',replacement:'virtual:fixture-layout'},{find:'@',replacement:path.join(root,'resources/js')}]},plugins:[react(),{
    name:'generator-fixture',
    configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
        if(req.url.split('?')[0]!=='/__generator')return next();
        res.setHeader('Content-Type','text/html');
        res.end(await vite.transformIndexHtml('/__generator','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/__generator-fixture.jsx"></script></body></html>'));
    });},
    resolveId(id){if(id==='/__generator-fixture.jsx'||id===entry)return entry;if(id==='virtual:fixture-layout')return '\0fixture-layout';},
    load(id){if(id===entry)return fixture;if(id==='\0fixture-layout')return 'export default ({children})=>children;';}
}],server:{host:'127.0.0.1',port:5199,strictPort:false,hmr:false}});
let chrome, socket, session, sequence=0;
const pending=new Map(), errors=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},40000);
    pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});
    socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function waitFor(expression){const until=Date.now()+90000;while(Date.now()<until){if(await evaluate('Boolean('+expression+')'))return;await sleep(100);}throw new Error('Timeout: '+expression+' '+await evaluate('document.body.innerText'));}
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
        if(type==='grammar'){
            const calls=await evaluate('window.__generator.calls.map(call=>call.body)');
            const keys=['autoMeaning','count','counts','difficulty','target_form','useDistractors'];
            assert.deepEqual(Object.keys(calls[0].settings).sort(),keys);
            assert.deepEqual(Object.keys(calls.find(call=>call.operation==='regenerate').settings).sort(),keys);
        }
        if(type==='vocab')assert.equal(await evaluate('window.__generator.applied[0][0].id'),null);
        assert.equal(await evaluate(type==='vocab'?'window.__generator.applied[0][0].highlight_text':type==='grammar'?'window.__generator.applied[0][0].questions[0].highlight_text':'window.__generator.applied[0].questions[0].highlight_text'),'Question','Adapters must preserve highlight');
        if(type==='dokkai')assert.equal(await evaluate('window.__generator.applied[0].questions[0].evidence_paragraph_number'),1);
        await click('Open generator');
        if(type==='dokkai'){await waitFor('document.querySelector("input[type=radio]")');await evaluate('document.querySelector("input[type=radio]").click()');}
        await click('Buat Draf');await waitFor('document.body.innerText.includes("Pratinjau:")');
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await waitFor('!document.querySelector("[role=dialog]")');
    }
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__generator?type=vocab&apply=append'});
    await waitFor('window.__ready&&document.querySelector("[role=dialog]")');
    await evaluate(`(()=>{const selects=Array.from(document.querySelectorAll('select'));const mode=selects.find(s=>Array.from(s.options).some(o=>o.value==='meaning_to_word'));mode.value='meaning_to_word';mode.dispatchEvent(new Event('change',{bubbles:true}));const content=selects.find(s=>Array.from(s.options).some(o=>o.value==='kanji'));content.value='kanji';content.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await click('Buat Draf');await waitFor('document.body.innerText.includes("Pratinjau:")');
    const flashcardInput = `Array.from(document.querySelectorAll('label')).find(label=>label.textContent.trim()==='Sertakan flashcard').querySelector('input')`;
    assert.equal(await evaluate(flashcardInput+'.checked'),true,'Day generator includes flashcards by default');
    await evaluate(flashcardInput+'.click()');
    assert(await evaluate('document.body.innerText.includes("Pratinjau:")'),'Flashcard selection retains preview');
    assert.equal(await evaluate('window.__generator.calls[0].body.input.mode'),'meaning_to_word');
    assert.equal(await evaluate('window.__generator.calls[0].body.input.content_type'),'kanji');
    await capture('vocab-append-mobile');
    await click('Tambahkan ke Kuis');
    await waitFor('window.__generator.applied.length===1');
    assert.equal(await evaluate('window.__generator.settings.syncFlashcards'),false,'Apply preserves explicit flashcard opt-out');
    assert.equal(await evaluate('document.body.innerText.includes("Ganti isi draf editor?")'),false);
    assert.equal(await evaluate('window.__generator.applied[0].length'),3);
    assert.equal(await evaluate('window.__generator.applied[0][0].id'),42);
    assert.equal(await evaluate('window.__generator.applied[0][0].question_text'),'Original unsaved question');
    assert.equal(await evaluate('window.__generator.applied[0][0].points'),3);
    assert.equal(await evaluate('window.__generator.applied[0][0].explanation'),'Keep this draft');
    assert.equal(await evaluate('window.__generator.applied[0][1].show_question_reading'),false,'Preserve generator visibility on append');
    assert.equal(await evaluate('window.__generator.calls.length'),1,'Append must not save');
    assert.equal(await evaluate('window.__appendVocabulary(window.__generator.draft,[window.__emptyQuestion()]).length'),2,'Remove only pristine placeholder');
    assert.equal(await evaluate('window.__appendVocabulary(window.__generator.draft,[{...window.__emptyQuestion(),audio_url:"/draft-audio.mp3"}]).length'),3,'Keep partially edited placeholder');
    await click('Open generator');await click('Buat Draf');await waitFor('document.body.innerText.includes("Pratinjau:")');
    await click('Tambahkan ke Kuis');await waitFor('window.__generator.applied.length===2');
    assert.equal(await evaluate('window.__generator.applied[1].length'),3,'Repeated append deduplicates generated sources and keeps existing questions');
    assert(await evaluate('window.__generator.applied[1].slice(1).every(q=>q.id===null)'),'Generated IDs must remain database-safe');
    await click('Open generator');
    await evaluate('window.__generator.mode="fail"');await click('Buat Draf');
    await waitFor('document.body.innerText.includes("Bahan belum cukup.")');
    assert.equal(await evaluate('document.body.innerText.includes("Pratinjau:")'),false);
    await evaluate('window.__generator.mode="slow"');await click('Buat Draf');await click('Batal');await sleep(950);
    assert.equal(await evaluate('document.body.innerText.includes("Pratinjau:")'),false,'Closed modal must ignore stale response');
    await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__generator?type=grammar-builder'});
    await waitFor('document.body.innerText.includes("Lesson pertama")');
    await click('Hapus Lesson');
    await waitFor('document.body.innerText.includes("Hapus Lesson?")');
    await click('Batal');
    assert.equal(await evaluate('window.__generator.calls.length'),0);
    const confirmDelete=async()=>{
        await click('Hapus Lesson');
        await waitFor('document.body.innerText.includes("Hapus Lesson?")');
        await evaluate('Array.from(document.querySelectorAll("button")).filter(b=>b.textContent.trim()==="Hapus Lesson").at(-1).click()');
        await waitFor('!document.body.innerText.includes("Hapus Lesson?")');
    };
    await evaluate('window.__generator.mode="fail"');
    await confirmDelete();
    await waitFor('document.body.innerText.includes("Lesson memiliki riwayat pengerjaan.")');
    assert(await evaluate('document.body.innerText.includes("Lesson pertama")'));
    await evaluate('window.__generator.mode="success"');
    await confirmDelete();
    await waitFor('document.body.innerText.includes("Lesson berhasil dihapus.")');
    assert.equal(await evaluate('window.__generator.calls[1].url'),'/fixture/admin.grammar-quizzes.destroy/41');
    assert.equal(await evaluate('document.body.innerText.includes("Lesson pertama")'),false);
    assert(await evaluate('document.body.innerText.includes("Lesson kedua")'));
    await capture('grammar-after-delete');
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__generator?type=flashcard-builder'});
    await waitFor('document.body.innerText.includes("Bank minggu lain")');
    assert(await evaluate('Array.from(document.querySelectorAll("input")).some(input=>input.value==="Arti kartu tersimpan"&&!input.readOnly)'));
    assert(await evaluate('Array.from(document.querySelectorAll("select")).some(select=>select.value==="kanji"&&select.disabled)'));
    await click('Simpan Flashcard');
    await waitFor('Array.from(document.querySelectorAll("[role=alert]")).some(el=>el.textContent.includes("Kartu ke-1: Kosakata tidak tersedia"))');
    assert.equal(await evaluate('window.__generator.calls[0].body.cards[0].vocabulary_id'),7);
    if(process.argv.includes('--skip-highlight')){
        assert.deepEqual(errors,[],'Uncaught browser errors');
        console.log('Generator, Grammar deletion, and legacy flashcard browser checks passed.');
    }else{
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'__generator?type=highlight'});
    await waitFor('window.__ready&&document.querySelector("#question-highlight mark")');
    assert.equal(await evaluate('window.__emptyQuestion().show_question_reading'),false,'New builder questions default to hidden reading');
    assert.equal(await evaluate('document.querySelector("#reading-field [role=switch]").checked'),false,'Reading toggle defaults off');
    await evaluate('document.querySelector("#reading-field [role=switch]").click()');
    await waitFor('document.querySelector("#reading-field output").dataset.visible==="true"');
    await evaluate('document.querySelector("#reading-field [role=switch]").click()');
    await waitFor('document.querySelector("#reading-field output").dataset.visible==="false"');
    assert.equal(await evaluate('document.querySelector("#reading-field input[type=text]").value'),'kana','Hiding must retain the reading');
    await evaluate(`(()=>{const input=document.querySelector('#reading-field input[type=text]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'updated kana');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await waitFor('document.querySelector("#reading-field output").textContent==="updated kana"');
    await evaluate('document.querySelector("#reading-field [role=switch]").focus()');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await waitFor('document.querySelector("#reading-field output").dataset.visible==="true"');
    assert.equal(await evaluate('document.querySelector("#reading-field input[type=text]").value'),'updated kana','Keyboard toggle preserves the edited reading');
    assert.equal(await evaluate('document.querySelectorAll("#question-highlight mark").length'),2);
    assert.equal(await evaluate('document.querySelector("#question-highlight").textContent'),'  \u304d\u3085\u3046 / \u304d\u3085\u3046\n');
    assert.equal(await evaluate('document.querySelectorAll("#special-highlight mark").length'),2,'Literal regex characters');
    assert.equal(await evaluate('document.querySelectorAll("#html-highlight img").length'),0,'HTML must remain escaped');
    assert.equal(await evaluate('document.querySelector("#html-highlight").textContent'),'<img src=x onerror=alert(1)>');
    assert.equal(await evaluate('document.querySelector("#literal-parentheses").textContent'),'(Noun) (\u99c5) (\u5b66\u6821)');
    assert.equal(await evaluate('document.querySelectorAll("#literal-parentheses mark").length'),0,'Runner never infers a target');
    assert.equal(await evaluate('document.querySelector("#marked-preview mark").textContent'),'\u99c5');
    assert.equal(await evaluate('document.querySelector("#marked-preview p[lang=ja]").textContent'),'Pilih \u99c5 (Noun).');
    assert(await evaluate('document.querySelector("#ambiguous-preview [role=alert]").textContent.includes("beberapa penanda")'));
    assert.equal(await evaluate('document.querySelectorAll("#legacy-highlight mark").length'),2,'Existing case-insensitive highlights unchanged');
    assert(await evaluate('document.querySelector("#legacy-highlight mark").classList.contains("text-inherit")'));
    for(const [width,dark] of [[390,false],[1366,true]]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
        await evaluate(`document.documentElement.classList.toggle('dark',${dark})`);
        await capture('highlight-'+width);
    }
    await evaluate(`(()=>{const input=document.querySelector('#reading-field + div input') || Array.from(document.querySelectorAll('input')).find(i=>i.value==='Question');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'missing');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await waitFor('document.querySelector("#reading-field + div [role=alert]")');
    assert.deepEqual(errors,[],'Uncaught browser errors');
    console.log(JSON.stringify({passed:true,types:3,checks:['preview','local adapters and highlight metadata','replace confirmation/cancel','append preserves draft','repeated append','kanji meaning-to-word filters','pristine placeholder','no save on apply','Escape','422','abort stale response','literal Unicode highlight','escaped HTML and regex characters','inline target validation','legacy highlights unchanged','reading visibility metadata','keyboard reading toggle and draft retention','light/dark responsive overflow'],screenshots:'temporary; removed after test'},null,2));
    }
}catch(error){
    console.error('Generator browser test failed:',error,errors);
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
    const resolvedScreenshots=path.resolve(screenshots);
    if(resolvedScreenshots.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolvedScreenshots).startsWith('tokuup-generator-images-')){
        rmSync(resolvedScreenshots,{recursive:true,force:true});
    }
}
