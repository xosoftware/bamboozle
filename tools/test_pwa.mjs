import pkg from '/node_modules/playwright-core/index.js'; const { chromium, devices } = pkg;
const URL = process.argv[2] || 'http://127.0.0.1:8765/';
const SHOT = process.argv[3] || '/workspace/pwa_mobile_screenshot.png';
const b = await chromium.launch({executablePath:'/opt/google/chrome/chrome', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx = await b.newContext({...devices['iPhone 13'], geolocation:{latitude:36.1070,longitude:-115.1760}, permissions:['geolocation']});
const p = await ctx.newPage(); const errs=[];
p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
await p.goto(URL,{waitUntil:'networkidle',timeout:90000});
await p.waitForFunction(()=>window.__vhh,null,{timeout:30000});
const st=()=>p.evaluate(()=>({status:document.getElementById('status').textContent,vis:__vhh.visible(),onMap:__vhh.onMap()}));
console.log('load', await p.evaluate(()=>({n:__vhh.count,nIK:__vhh.nIK,nHH:__vhh.nHH,nBR:__vhh.nBR,nLN:__vhh.nLN,markers:__vhh.markers()})), await st());
const sw = await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return {scope:r.scope,active:!!r.active}});
console.log('sw', sw);
const man = await p.evaluate(async()=>{const l=document.querySelector('link[rel=manifest]');const m=await (await fetch(l.href)).json();return {name:m.name,short:m.short_name,display:m.display,start:m.start_url,scope:m.scope,icons:m.icons.map(i=>i.sizes+':'+(i.purpose||'any'))}});
console.log('manifest', man);
const meta = await p.evaluate(()=>['theme-color','apple-mobile-web-app-capable','viewport'].map(n=>n+'='+document.querySelector(`meta[name="${n}"]`)?.content).concat([document.querySelector('link[rel=apple-touch-icon]')?.href]));
console.log('meta', meta, 'a2hs visible', await p.evaluate(()=>getComputedStyle(document.getElementById('a2hs')).display));
// features
for (const m of ['hh','br','ln','all']) { await p.click(`#mode button[data-mode=${m}]`); await p.waitForTimeout(250); console.log(' mode',m,(await st()).status); }
await p.click('#filtertoggle'); await p.waitForTimeout(200);
await p.click('#ikOnly'); await p.waitForTimeout(300); console.log('ikOnly', (await st()).status);
await p.click('#ikOnly'); await p.click('#now'); await p.waitForTimeout(300); console.log('now', (await st()).status); await p.click('#now');
await p.click('#filtertoggle'); await p.waitForTimeout(200);
await p.click('#loc'); await p.waitForTimeout(2500);
console.log('nearest', await p.evaluate(()=>[...document.querySelectorAll('#list .item')].slice(0,3).map(e=>e.innerText.replace(/\n/g,' | ').slice(0,120))));
await p.waitForTimeout(2500);
await p.screenshot({path:SHOT});
// offline reload
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1500); // ensure SW controls page
console.log('controlled', await p.evaluate(()=>!!navigator.serviceWorker.controller));
console.log('caches', await p.evaluate(async()=>{const o={};for(const k of await caches.keys()){o[k]=(await (await caches.open(k)).keys()).length}return o}));
await ctx.setOffline(true);
await p.reload({waitUntil:'load'}); await p.waitForFunction(()=>window.__vhh,null,{timeout:20000}).catch(()=>{});
console.log('offline', await p.evaluate(()=>window.__vhh?{n:__vhh.count,markers:__vhh.markers(),status:document.getElementById('status').textContent}:'FAILED'));
await ctx.setOffline(false);
console.log('errors', errs.filter(e=>!/tile|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e)), 'allErrCount', errs.length);
await b.close();
