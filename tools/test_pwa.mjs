// Headless test for the BamBoozle PWA (2026 redesign).
// Usage: python3 -m http.server 8765 &  node tools/test_pwa.mjs [url] [shotDir]
import pkg from '/node_modules/playwright-core/index.js'; const { chromium, devices } = pkg;
const URL = process.argv[2] || 'http://127.0.0.1:8765/';
const DIR = process.argv[3] || '/workspace';
const b = await chromium.launch({executablePath:'/opt/google/chrome/chrome', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const EXPECT = {n:738, markers:733, nHH:657, nBR:110, nLN:176, nIK:76};

async function session(ctxOpts, fn) {
  const ctx = await b.newContext({...ctxOpts, geolocation:{latitude:36.1070, longitude:-115.1760}, permissions:['geolocation']});
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
const clickMode = async (p, m) => { await p.click(`#mode button[data-mode=${m}]`); await p.waitForTimeout(250); return st(p); };

// ---------------- mobile (iPhone 13) ----------------
await session(devices['iPhone 13'], async (p, ctx) => {
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
  for (const [m, n] of [['hh',657],['br',110],['ln',176],['all',738]]) { const s = await clickMode(p, m); ok(s.vis === n, `mode ${m}: ${s.vis}`); }
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
  await p.screenshot({path: DIR + '/redesign_mobile_list.png'});
  await p.screenshot({path: DIR + '/bamboozle_mobile.png'});
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

// ---------------- desktop ----------------
await session({viewport:{width:1440, height:900}, deviceScaleFactor:2}, async p => {
  const c = await p.evaluate(() => ({n:__vhh.count, markers:__vhh.markers(), nIK:__vhh.nIK}));
  ok(c.n === 738 && c.markers === 733 && c.nIK === 76, 'desktop counts ' + JSON.stringify(c));
  for (const [m, n] of [['hh',657],['br',110],['ln',176],['all',738]]) { const s = await clickMode(p, m); ok(s.vis === n, `desktop mode ${m}: ${s.vis}`); }
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
