// Headless test for the BamBoozle PWA (2026 redesign).
// Usage: python3 -m http.server 8765 &  node tools/test_pwa.mjs [url] [shotDir]
import pkg from '/node_modules/playwright-core/index.js'; const { chromium, devices } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const URL = process.argv[2] || 'http://127.0.0.1:8765/';
const DIR = process.argv[3] || '/workspace';
const DATA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data.json'), 'utf8'));
const union = (...keys) => DATA.filter(v => keys.some(k => v[k])).length;
const b = await chromium.launch({executablePath:'/opt/google/chrome/chrome', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const EXPECT = {n:738, markers:733, nHH:657, nBR:110, nLN:176, nIK:76};

async function session(ctxOpts, fn, init) {
  const ctx = await b.newContext({...ctxOpts, geolocation:{latitude:36.1070, longitude:-115.1760}, permissions:['geolocation']});
  await ctx.addInitScript(init || (() => { try { if (!sessionStorage.getItem('t_keepDisc')) localStorage.setItem('bbDisclaimer', '1'); } catch (e) {} }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.goto(URL, {waitUntil:'networkidle', timeout:90000});
  await p.waitForFunction(() => window.__vhh, null, {timeout:30000});
  await fn(p, ctx);
  const real = errs.filter(e => !/ERR_INTERNET_DISCONNECTED|Failed to load resource|tiles\.openfreemap|Failed to fetch|AJAXError/.test(e));
  ok(real.length === 0, 'no JS errors (' + (real.join(' | ') || 'none') + ')');
  await ctx.close();
}
const st = p => p.evaluate(() => ({count:document.getElementById('count').textContent, vis:__vhh.visible(), onMap:__vhh.onMap()}));
const setModes = async (p, modes) => { await p.evaluate(m => __vhh.setModes(m), modes); await p.waitForTimeout(300); return st(p); };
const modePressed = async (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#mode button')].map(b => [b.dataset.mode, b.getAttribute('aria-pressed')==='true' && b.classList.contains('on')])));

// ---------------- mobile (iPhone 13) ----------------
if (!process.env.ONLY_NEW) await session(devices['iPhone 13'], async (p, ctx) => {
  const c = await p.evaluate(() => ({n:__vhh.count, nIK:__vhh.nIK, nHH:__vhh.nHH, nBR:__vhh.nBR, nLN:__vhh.nLN, markers:__vhh.markers()}));
  for (const k in EXPECT) ok(c[k] === EXPECT[k], `count ${k}=${c[k]} (expect ${EXPECT[k]})`);
  ok((await st(p)).vis === 738 && (await st(p)).onMap === 733, 'all 738 listed / 733 pins on map at start');
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; }); ok(sw, 'service worker active');
  const man = await p.evaluate(async () => { const m = await (await fetch('manifest.webmanifest')).json(); return {d:m.display, n:m.icons.length, name:m.name, short:m.short_name}; });
  ok(man.d === 'standalone' && man.n === 4, 'manifest ' + man.d + ' ' + man.n);
  ok(man.name === 'BamBoozle' && man.short === 'BamBoozle', 'manifest name BamBoozle (' + man.name + '/' + man.short + ')');
  ok(await p.evaluate(() => document.title === 'BamBoozle' && document.querySelector('meta[name="apple-mobile-web-app-title"]').content === 'BamBoozle'), 'document title / apple title BamBoozle');
  ok(await p.evaluate(() => {
    const app = document.querySelector('meta[name="application-name"]');
    const og = document.querySelector('meta[property="og:site_name"]');
    const ml = document.querySelector('link[rel="manifest"]');
    return app && app.content === 'BamBoozle' && og && og.content === 'BamBoozle' && ml && /manifest\.webmanifest\?v=[a-f0-9]+$/.test(ml.href);
  }), 'application-name / og:site_name BamBoozle + cache-busted manifest');
  ok(await p.evaluate(() => document.querySelector('#topbar h1').textContent === 'BamBoozle'), 'header brand BamBoozle');
  ok(await p.evaluate(() => document.getElementById('a2hs').classList.contains('show')), 'iOS add-to-home hint shown');
  ok(await p.evaluate(() => document.querySelector('#a2hs b').textContent.includes('BamBoozle')), 'iOS hint mentions BamBoozle');
  ok(!(await p.evaluate(() => !!document.querySelector('#mode [data-mode=all], #mode .seg-ind'))), 'no All button / sliding indicator');
  ok(await p.evaluate(() => document.getElementById('mode').classList.contains('cats') && document.getElementById('mode').getAttribute('role')==='group'), 'mode is cats group');
  let pressed = await modePressed(p);
  ok(!pressed.hh && !pressed.br && !pressed.ln, 'none selected by default (show all) ' + JSON.stringify(pressed));
  ok((await st(p)).vis === 738, 'none selected -> 738');
  ok(await p.evaluate(() => (document.getElementById('status').textContent || '').includes('All categories')), 'status says All categories');
  ok(await p.evaluate(() => {
    const btns = [...document.querySelectorAll('#mode button')];
    return btns.every(b => {
      const cs = getComputedStyle(b);
      return parseFloat(cs.fontSize) === 12.5 && Math.round(b.getBoundingClientRect().height) === 34 && !b.classList.contains('on');
    });
  }), 'inactive toggles are 12.5px / 34px tall / gray (not .on)');
  ok(await p.evaluate(() => {
    const lbl = document.querySelector('#mode button[data-mode=hh] .lbl')?.textContent.trim();
    return lbl === 'Happy Hour';
  }), 'Happy Hour label on category toggle');
  // legend lives in filters sheet
  await p.click('#filtertoggle'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => [...document.querySelectorAll('#filters .legend li')].some(e => e.textContent.trim() === 'Happy Hour')), 'Happy Hour in map key legend');
  await p.click('#fApply'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => {
    const card = [...document.querySelectorAll('#list .card .badges .b.hh')].find(e => e.textContent.trim() === 'Happy Hour');
    return !!card;
  }), 'card badge text Happy Hour');
  const KS_OK = (pr, keep) => ['hh','br','ln'].every(k => pr[k] === (k===keep));
  for (const [m, n] of [['hh',657],['br',110],['ln',176]]) {
    const only = {hh:false,br:false,ln:false}; only[m]=true;
    const s = await setModes(p, only);
    pressed = await modePressed(p);
    ok(s.vis === n && pressed[m] && KS_OK(pressed, m), `only ${m}: ${s.vis} pressed=${JSON.stringify(pressed)}`);
  }
  // multi-select unions
  let s = await setModes(p, {hh:true,br:true,ln:false});
  ok(s.vis === union('hh','br'), `hh+br union -> ${s.vis} (expect ${union('hh','br')})`);
  s = await setModes(p, {hh:true,br:false,ln:true});
  ok(s.vis === union('hh','ln'), `hh+ln union -> ${s.vis} (expect ${union('hh','ln')})`);
  s = await setModes(p, {hh:false,br:true,ln:true});
  ok(s.vis === union('br','ln'), `br+ln union -> ${s.vis} (expect ${union('br','ln')})`);
  // can turn last one off → show all
  await setModes(p, {hh:true,br:false,ln:false});
  await p.click('#mode button[data-mode=hh]'); await p.waitForTimeout(300);
  pressed = await modePressed(p);
  ok(!pressed.hh && !pressed.br && !pressed.ln && (await st(p)).vis === 738, 'deselect all returns to all categories ' + JSON.stringify(pressed));
  // persist a partial selection
  await setModes(p, {hh:false,br:true,ln:true});
  const stored = await p.evaluate(() => localStorage.getItem('vhhModes'));
  ok(/"br":true/.test(stored) && /"hh":false/.test(stored), 'modes persisted in localStorage: ' + stored);
  await p.reload({waitUntil:'networkidle'}); await p.waitForFunction(() => window.__vhh, null, {timeout:30000});
  pressed = await modePressed(p);
  ok(!pressed.hh && pressed.br && pressed.ln, 'modes restored after reload ' + JSON.stringify(pressed));
  // migrate: all-three-on stored → treat as none
  await p.evaluate(() => localStorage.setItem('vhhModes', JSON.stringify({hh:true,br:true,ln:true})));
  await p.reload({waitUntil:'networkidle'}); await p.waitForFunction(() => window.__vhh, null, {timeout:30000});
  pressed = await modePressed(p);
  ok(!pressed.hh && !pressed.br && !pressed.ln && (await st(p)).vis === 738, 'migrate all-on storage → none selected');
  // reset clears selection
  await setModes(p, {hh:true,br:false,ln:false});
  await p.click('#filtertoggle'); await p.waitForTimeout(400);
  await p.click('#reset'); await p.waitForTimeout(400);
  pressed = await modePressed(p);
  ok(!pressed.hh && !pressed.br && !pressed.ln && (await st(p)).vis === 738, 'reset clears category selection');
  await p.click('#fApply').catch(()=>{}); await p.waitForTimeout(300);
  // leave none selected (show all) for remaining tests
  await setModes(p, {hh:false,br:false,ln:false});
  await p.click('#ikChip'); await p.waitForTimeout(250); ok((await st(p)).vis === 76, 'inKind chip -> ' + (await st(p)).vis);
  await p.click('#ikChip'); await p.waitForTimeout(250);
  await p.evaluate(() => __vhh.setNow(1, 90)); // Tue 1:30 AM Vegas time
  await p.click('#now'); await p.waitForTimeout(250); const lateNow = (await st(p)).vis; ok(lateNow > 0, 'happening now (Tue 1:30 AM) -> ' + lateNow);
  await p.click('#now'); await p.evaluate(() => __vhh.setNow(null)); await p.waitForTimeout(250);
  await p.click('#r4Chip'); await p.waitForTimeout(250); const r4 = (await st(p)).vis; ok(r4 > 0 && r4 < 738, 'rating 4.0+ -> ' + r4); await p.click('#r4Chip');
  await p.click('#days .chip:nth-child(1)'); await p.waitForTimeout(250); const mon = (await st(p)).vis; ok(mon > 0 && mon < 738, 'Mon chip -> ' + mon); await p.click('#days .chip:nth-child(1)');
  await p.fill('#q', 'oyster'); await p.waitForTimeout(500); const oy = (await st(p)).vis; ok(oy > 0 && oy < 100, 'search oyster -> ' + oy);
  await p.click('#qclear'); await p.waitForTimeout(400);
  // filters sheet
  await p.click('#filtertoggle'); await p.waitForTimeout(500);
  ok(await p.isVisible('#filters'), 'filters sheet opens');
  await p.click('label.switch:has(#bothOnly)'); await p.waitForTimeout(250); const both = (await st(p)).vis; ok(both === await p.evaluate(() => __vhh.nBoth), 'on 2+ lists -> ' + both);
  await p.click('label.switch:has(#bothOnly)');
  await p.click('label.switch:has(#exactOnly)'); await p.waitForTimeout(250); const ex = (await st(p)).vis; ok(ex < 738, 'exact addresses only -> ' + ex);
  await p.click('label.switch:has(#exactOnly)');
  await p.selectOption('#zip', '89158'); await p.waitForTimeout(250); const z = (await st(p)).vis; ok(z > 0 && z < 60, 'zip 89158 -> ' + z);
  await p.click('#reset'); await p.waitForTimeout(400); ok((await st(p)).vis === 738, 'reset -> 738');
  await p.click('#fApply'); await p.waitForTimeout(500);
  // empty state
  await p.fill('#q', 'zzzxxyy'); await p.waitForTimeout(500); ok(await p.isVisible('.empty'), 'empty state shown'); await p.click('#emptyReset'); await p.waitForTimeout(400);
  // geolocation
  await p.click('#loc'); await p.waitForTimeout(2500);
  const near = await p.evaluate(() => [...document.querySelectorAll('#list .card')].slice(0, 3).map(e => e.querySelector('h3').textContent + ' ' + (e.querySelector('.dist')||{}).textContent));
  ok(near.length === 3 && near.every(t => /mi$/.test(t)), 'nearest-first: ' + near.join(' | '));
  ok(await p.evaluate(() => document.querySelectorAll('#list .card .thumb').length === 0 && document.querySelectorAll('#list .card .body').length > 0), 'list cards have no thumb tile');
  ok(await p.evaluate(() => {
    const c = document.querySelector('#list .card .body'); if (!c) return false;
    const kids = [...c.children].map(e => e.className.split(' ')[0]);
    const bi = kids.indexOf('badges');
    return bi === kids.length - 1 && kids.indexOf('r2') < bi && (kids.indexOf('deal') === -1 || kids.indexOf('deal') < bi);
  }), 'badges are last in card body');
  ok(await p.evaluate(() => ![...document.querySelectorAll('#list .card .badges .b')].some(e => /^Unverified$/i.test(e.textContent.trim()))), 'list cards have no Unverified badge');
  ok(await p.evaluate(() => {
    const el = [...document.querySelectorAll('#list .card .badges .b.ik')].find(e => e.textContent.trim()==='inKind');
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.backgroundColor === 'rgb(230, 184, 74)' && (cs.color === 'rgb(0, 0, 0)' || cs.color === 'rgb(0,0,0)');
  }), 'inKind badge is gold #e6b84a on black text');
  // detail: Unverified only inside collapsed Confidence & notes, never as a flag banner / hero badge
  const eataly = await p.evaluate(() => __vhh.find('Eataly'));
  ok(eataly >= 0, 'Eataly present for late-night derive check');
  await p.evaluate(i => __vhh.open(i), eataly);
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => {
    const flags = [...document.querySelectorAll('#dBody .flag')].map(e => e.textContent);
    const hero = document.querySelector('#dBody .hero .kicker')?.textContent || '';
    const conf = [...document.querySelectorAll('#dBody details.conf')].map(e => e.textContent).join(' ');
    return !flags.some(t => /Unverified/i.test(t)) && !/Unverified/i.test(hero) && /Late night|Evening/i.test(document.querySelector('#dBody')?.textContent||'');
  }), 'detail has late night for Eataly; Unverified not in header/flags');
  await p.click('#dClose'); await p.waitForTimeout(400);
  // tap targets
  const small = await p.evaluate(() => [...document.querySelectorAll('#topbar button, .fab, #sheet .pill-btn')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 34).map(e => e.id || e.className));
  ok(small.length === 0, 'tap targets >= 34px tall in top bar (' + small.join(',') + ')');
  // screenshot: list sheet half open over map (dismiss install hint + toast first)
  await p.click('#a2hsClose'); await p.evaluate(() => { document.getElementById('chips').scrollLeft = 0; }); await p.waitForTimeout(4500);
  await setModes(p, {hh:false,br:false,ln:false});
  await p.waitForTimeout(400);
  await p.screenshot({path: DIR + '/redesign_mobile_list.png'});
  await p.screenshot({path: DIR + '/bamboozle_mobile.png'});
  await p.screenshot({path: DIR + '/bamboozle_toggles2.png'});
  await setModes(p, {hh:true,br:false,ln:false});
  await p.waitForTimeout(400);
  await p.screenshot({path: DIR + '/bamboozle_toggles3.png'});
  await setModes(p, {hh:true,br:false,ln:true});
  await p.waitForTimeout(400);
  await p.screenshot({path: DIR + '/bamboozle_toggles.png'});
  await setModes(p, {hh:false,br:false,ln:false});
  // sheet states
  for (const s of ['peek', 'full', 'half']) { await p.evaluate(s => __vhh.sheet(s), s); await p.waitForTimeout(500); }
  ok(await p.evaluate(() => __vhh.sheet()) === 'half', 'sheet snaps peek/full/half');
  // detail
  const id = await p.evaluate(() => __vhh.find('Bardot Brasserie'));
  await p.click(`#list .card[data-id="${id}"]`).catch(async () => { await p.evaluate(i => __vhh.open(i), id); });
  await p.waitForTimeout(1800);
  ok(await p.isVisible('#detail.show'), 'detail sheet opens');
  ok(await p.evaluate(() => !!document.querySelector('#dBody a.btn.primary[href*="google.com/maps/dir"]')), 'directions button present');
  await p.screenshot({path: DIR + '/redesign_mobile_detail.png'});
  await p.click('#dClose'); await p.waitForTimeout(500); ok(!(await p.isVisible('#detail.show')), 'detail closes');
  // offline reload
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'page controlled by SW');
  console.log('caches', await p.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).length; return o; }));
  await ctx.setOffline(true);
  await p.reload({waitUntil:'load'}); await p.waitForFunction(() => window.__vhh, null, {timeout:20000}).catch(() => {});
  const off = await p.evaluate(() => window.__vhh ? {n:__vhh.count, markers:__vhh.markers()} : null);
  ok(off && off.n === 738 && off.markers === 733, 'offline reload works ' + JSON.stringify(off));
  await ctx.setOffline(false);
});

// ---------------- saved spots / share / disclaimer / deep link (web) ----------------
await session(devices['iPhone 13'], async (p, ctx) => {
  ok(await p.isVisible('#disc'), 'first-run data accuracy notice shown');
  await p.click('#discOk'); await p.waitForTimeout(200);
  ok(!(await p.isVisible('#disc')) && await p.evaluate(() => localStorage.getItem('bbDisclaimer') === '1'), 'notice dismissed + remembered');
  ok(await p.evaluate(() => document.getElementById('alertsGroup').hidden), 'alerts toggle hidden on web');
  ok(await p.evaluate(() => [...document.querySelectorAll('#filters .about.links a')].map(a => a.href).join(' ').includes('privacy.html')), 'privacy/support links in About');
  ok(await p.evaluate(() => !window.BB.isNative && window.BB.platform === 'web'), 'BB bridge in web mode');
  await p.click('#savedChip'); await p.waitForTimeout(300);
  ok((await st(p)).vis === 0 && await p.isVisible('.empty') && /No saved spots/.test(await p.textContent('.empty h3')), 'Saved filter empty state');
  await p.click('#emptyReset'); await p.waitForTimeout(300);
  ok((await st(p)).vis === 738 && await p.evaluate(() => document.getElementById('savedChip').getAttribute('aria-pressed')) === 'false', 'empty-state reset clears Saved filter');
  const id = await p.evaluate(() => __vhh.find('Bardot Brasserie'));
  await p.evaluate(i => __vhh.open(i), id); await p.waitForTimeout(900);
  ok(await p.isVisible('#dSave') && await p.isVisible('#dShare'), 'detail has Save + Share');
  await p.click('#dSave'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __vhh.saved()) === 1 && await p.evaluate(() => document.getElementById('dSave').getAttribute('aria-pressed')) === 'true', 'Save toggles on');
  ok(await p.evaluate(() => document.getElementById('savedN').textContent) === '1', 'Saved chip count = 1');
  const txt = await p.evaluate(i => __vhh.shareText(i), id);
  ok(/Bardot/.test(txt) && /Las Vegas Blvd/.test(txt), 'share text has name + address: ' + JSON.stringify(txt.slice(0, 80)));
  await p.screenshot({path: DIR + '/bamboozle_saved_detail.png'});
  await p.click('#dClose'); await p.waitForTimeout(400);
  await p.click('#savedChip'); await p.waitForTimeout(300);
  ok((await st(p)).vis === 1, 'Saved filter -> 1');
  ok(await p.evaluate(i => !!document.querySelector(`#list .card[data-id="${i}"] .sv`), id), 'saved heart on card');
  await p.screenshot({path: DIR + '/bamboozle_saved_list.png'});
  const plan = await p.evaluate(() => __vhh.alertPlan(Date.UTC(2026, 9, 12, 19, 0), 7)); // Mon Oct 12 12:00 PT
  const fmt = new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles', weekday:'short', hour:'numeric', minute:'2-digit'});
  ok(plan.length > 0 && plan.every(x => x.start - x.at === 15 * 60000), 'alert plan for saved spot: ' + plan.slice(0, 3).map(x => x.k + ' ' + fmt.format(new Date(x.start))).join(', '));
  ok(plan.some(x => /5:00 PM/.test(fmt.format(new Date(x.start)))), 'alert start times are in Vegas wall-clock time');
  await p.reload({waitUntil:'networkidle'}); await p.waitForFunction(() => window.__vhh, null, {timeout:30000});
  ok(await p.evaluate(() => __vhh.saved()) === 1, 'saved persists after reload');
  await p.evaluate(i => __vhh.toggleSave(i), id); ok(await p.evaluate(() => __vhh.saved()) === 0, 'unsave');
}, () => { sessionStorage.setItem('t_keepDisc', '1'); });

// deep link
await session(devices['iPhone 13'], async p => {
  const bv = DATA.find(v => v.name === 'Bardot Brasserie');
  await p.goto(URL + '#spot=' + encodeURIComponent(bv.name + '|' + bv.addr)); await p.waitForTimeout(1500);
  ok(await p.isVisible('#detail.show') && /Bardot/.test(await p.textContent('#dName')), 'deep link #spot= opens venue');
}, null);

// ---------------- desktop ----------------
await session({viewport:{width:1440, height:900}, deviceScaleFactor:2}, async p => {
  const c = await p.evaluate(() => ({n:__vhh.count, markers:__vhh.markers(), nIK:__vhh.nIK}));
  ok(c.n === 738 && c.markers === 733 && c.nIK === 76, 'desktop counts ' + JSON.stringify(c));
  ok((await st(p)).vis === 738, 'desktop none selected -> 738');
  for (const [m, n] of [['hh',657],['br',110],['ln',176]]) {
    const only = {hh:false,br:false,ln:false}; only[m]=true;
    const s = await setModes(p, only);
    ok(s.vis === n, `desktop only ${m}: ${s.vis}`);
  }
  await setModes(p, {hh:false,br:false,ln:false});
  await p.click('#loc'); await p.waitForTimeout(2500);
  const id = await p.evaluate(() => __vhh.find('Ocean Prime'));
  await p.click(`#list .card[data-id="${id}"]`); await p.waitForTimeout(2000);
  ok(await p.isVisible('#detail.show'), 'desktop detail panel opens');
  const ov = await p.evaluate(() => { const a = document.getElementById('sheet').getBoundingClientRect(), d = document.getElementById('detail').getBoundingClientRect(); return d.left >= a.right - 1; });
  ok(ov, 'detail panel sits beside list (no overlap)');
  await p.screenshot({path: DIR + '/redesign_desktop.png'});
});
await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
