/* BamBoozle PWA – Vegas happy hours, brunch & late night */
function startApp(DATA){
"use strict";

var DAYN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var STRIP=[36.1147,-115.1728];
var $=function(id){return document.getElementById(id)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function present(s){return s&&String(s).trim()&&String(s).trim().toLowerCase()!=='not listed'}
function safeUrl(u){return /^https?:\/\//i.test(u||'')?u:null}
function icon(n,cls){return '<svg class="ic'+(cls?' '+cls:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
var mq=window.matchMedia('(min-width:900px)');
function isDesk(){return mq.matches}

/* ---------- map + theme ---------- */
var map=L.map('map',{maxZoom:20,minZoom:3,zoomControl:false,attributionControl:false,tap:true}).setView(STRIP,11);
L.control.zoom({position:'topright'}).addTo(map);
var attr=L.control.attribution({prefix:false,position:isDesk()?'bottomright':'bottomleft'}).addTo(map);
mq.addEventListener&&mq.addEventListener('change',function(){attr.setPosition(isDesk()?'bottomright':'bottomleft');layout()});
/* basemap: OpenFreeMap vector styles (Dark / Positron, no API key) via MapLibre GL; OSM raster fallback without WebGL */
var STYLE_URL={dark:'https://tiles.openfreemap.org/styles/dark',light:'https://tiles.openfreemap.org/styles/positron'};
var ATTR='<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
var hasGL=(function(){try{var c=document.createElement('canvas');return !!(window.maplibregl&&L.maplibreGL&&(c.getContext('webgl2')||c.getContext('webgl')))}catch(e){return false}})();
var NEON={background:{'background-color':'#0c0b15'},water:{'fill-color':'#111a33'},landuse_residential:{'fill-color':'hsl(250,22%,9%)','fill-opacity':0.5},
  landuse_park:{'fill-color':'#10201d'},landcover_wood:{'fill-color':'#10201d'},building:{'fill-color':'#15142a','fill-outline-color':'#211e3a'},
  highway_minor:{'line-color':'#1d1b30'},highway_major_casing:{'line-color':'rgba(110,90,190,0.45)'},highway_major_inner:{'line-color':'#211e38'},
  highway_major_subtle:{'line-color':'#2b2747'},highway_motorway_casing:{'line-color':'rgba(150,95,230,0.55)'},highway_motorway_subtle:{'line-color':'#2b2747'},
  highway_name_other:{'text-color':'#8a86ad','text-halo-color':'#0c0b15'},highway_name_motorway:{'text-color':'#a39fc8'},
  place_other:{'text-color':'#8f8bb3'},place_suburb:{'text-color':'#8f8bb3'},place_village:{'text-color':'#a5a2c6'},place_town:{'text-color':'#b9b6d8'},place_city:{'text-color':'#cfcdea'},place_city_large:{'text-color':'#dedcf5'}};
var styleCache={},glLayer=null,rasterLayer=null,curTheme=null;
function loadStyle(t){
  if(styleCache[t])return Promise.resolve(styleCache[t]);
  return fetch(STYLE_URL[t]).then(function(r){if(!r.ok)throw new Error('style '+r.status);return r.json()}).then(function(st){
    st.layers.forEach(function(l){if(l.paint&&l.paint['fill-pattern']==='wood-pattern')delete l.paint['fill-pattern']});
    if(t==='dark')st.layers.forEach(function(l){var o=NEON[l.id];if(o){l.paint=l.paint||{};for(var k in o)l.paint[k]=o[k]}});
    styleCache[t]=st;return st});
}
function useRaster(t){
  if(glLayer){map.removeLayer(glLayer);glLayer=null}
  if(!rasterLayer)rasterLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,className:'osm-raster',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
}
function setBasemap(t){
  if(!hasGL){useRaster(t);return}
  loadStyle(t).then(function(st){
    if(t!==curTheme)return;
    if(!glLayer){glLayer=L.maplibreGL({style:st,attribution:ATTR,interactive:false}).addTo(map)}
    else glLayer.getMaplibreMap().setStyle(st,{diff:false});
  }).catch(function(e){console.warn('Vector basemap unavailable, using raster',e);hasGL=false;useRaster(t)});
}
function themePref(){try{return localStorage.getItem('vhhTheme')||'dark'}catch(e){return 'dark'}}
var sysLight=window.matchMedia('(prefers-color-scheme: light)');
function resolvedTheme(){var p=themePref();return p==='system'?(sysLight.matches?'light':'dark'):p}
function applyTheme(){
  var t=resolvedTheme();
  document.documentElement.setAttribute('data-theme',t);
  var mc=document.querySelector('meta[name=theme-color]');if(mc)mc.content=t==='dark'?'#0b0b12':'#f3f3f8';
  if(t!==curTheme){curTheme=t;setBasemap(t)}
  var tb=$('themeBtn');tb.innerHTML=icon(t==='dark'?'sun':'moon');tb.setAttribute('aria-label',t==='dark'?'Switch to light mode':'Switch to dark mode');
  Array.prototype.forEach.call($('themeSeg').children,function(b){var on=b.getAttribute('data-t')===themePref();b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
}
function setTheme(p){try{localStorage.setItem('vhhTheme',p)}catch(e){}applyTheme()}
$('themeBtn').onclick=function(){setTheme(resolvedTheme()==='dark'?'light':'dark')};
Array.prototype.forEach.call($('themeSeg').children,function(b){b.onclick=function(){setTheme(b.getAttribute('data-t'))}});
sysLight.addEventListener&&sysLight.addEventListener('change',function(){if(themePref()==='system')applyTheme()});
applyTheme();

var cluster=L.markerClusterGroup({maxClusterRadius:48,showCoverageOnHover:false,spiderfyOnMaxZoom:true,disableClusteringAtZoom:18,
  iconCreateFunction:function(c){var n=c.getChildCount(),s=n<10?36:n<50?42:n<150?50:58,cls=n<10?'':n<150?' m':' l';
    return L.divIcon({html:'<div class="cl'+cls+'">'+n+'</div>',className:'',iconSize:[s,s]})}});
map.addLayer(cluster);

var user=null,userMarker=null,markers={},activeId=null;
function defaultModes(){return {hh:false,br:false,ln:false}}
function loadModes(){
  try{
    var raw=localStorage.getItem('vhhModes');
    if(!raw)return defaultModes();
    var o=JSON.parse(raw),m={hh:!!o.hh,br:!!o.br,ln:!!o.ln};
    /* migrate old default (all three on) → none selected = show all */
    if(m.hh&&m.br&&m.ln)return defaultModes();
    return m;
  }catch(e){return defaultModes()}
}
function saveModes(){try{localStorage.setItem('vhhModes',JSON.stringify(state.modes))}catch(e){}}
function freshState(){return {modes:defaultModes(),q:'',zip:'',days:{},now:false,minRating:0,exactOnly:false,bothOnly:false,ikOnly:false}}
var state=freshState();state.modes=loadModes();
var KS=['hh','br','ln'],COL={hh:'var(--hh)',br:'var(--br)',ln:'var(--ln)'};
function has(v){return KS.filter(function(k){return !!v[k]})}
function anyMode(){return KS.some(function(k){return state.modes[k]})}
function cats(v){return anyMode()?KS.filter(function(k){return v[k]&&state.modes[k]}):has(v)}
function shown(v){return cats(v)}
function kindOf(v){var c=shown(v);return c.length>1?'multi':c[0]}
function onIK(v){return !!(v.ik&&v.ik.s==='Yes')}
function pinBg(v){var c=shown(v);if(c.length===1)return '';
  var st=[],w=100/c.length;c.forEach(function(k,i){st.push(COL[k]+' '+(i*w).toFixed(1)+'% '+((i+1)*w).toFixed(1)+'%')});return ' style="background:conic-gradient('+st.join(',')+')"'}
function iconFor(v){var k=kindOf(v);
  return L.divIcon({className:'',html:'<div class="mk '+k+(v.approx?' approx':'')+(onIK(v)?' ik':'')+(v.id===activeId?' on':'')+'" data-cats="'+cats(v).join(' ')+'"><i'+pinBg(v)+'></i></div>',iconSize:[28,28],iconAnchor:[14,14]})}
var CATN={hh:'Happy Hour',br:'Brunch',ln:'Late night'},CATL={hh:'Happy Hour',br:'Brunch',ln:'Late night / reverse happy hour'};
DATA.forEach(function(v,i){v.id=i;
  if(v.lat!=null){
    var m=L.marker([v.lat,v.lng],{icon:iconFor(v),title:v.name,keyboard:true,riseOnHover:true});
    m.on('click',function(){openDetail(v.id,{fromMap:true})});
    markers[v.id]=m;
  }
});

function dirUrl(v){
  var dest=v.approx?(v.name+', '+v.addr):(v.lat+','+v.lng);
  if(v.lat==null)dest=v.name+', '+v.addr;
  return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest);
}
function dist(v){
  if(!user||v.lat==null)return null;
  var R=3958.8,p=Math.PI/180,dLa=(v.lat-user[0])*p,dLo=(v.lng-user[1])*p;
  var a=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(user[0]*p)*Math.cos(v.lat*p)*Math.sin(dLo/2)*Math.sin(dLo/2);
  return 2*R*Math.asin(Math.sqrt(a));
}
function fmtDist(d,v){if(d==null)return '';var n=d<0.1?(v.approx?'0.1':'<0.1'):d<10?d.toFixed(1):String(Math.round(d));return (v.approx?'~':'')+n+' mi'}
function fmtNum(n){n=Number(n);return n>=10000?(n/1000).toFixed(0)+'k':n>=1000?(n/1000).toFixed(1).replace(/\.0$/,'')+'k':String(n)}

/* ---------- happening now (Las Vegas time) ---------- */
var NOW_OVERRIDE=null;
function vegasNow(){
  if(NOW_OVERRIDE)return NOW_OVERRIDE;
  try{
    var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'short',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date());
    var o={};parts.forEach(function(p){o[p.type]=p.value});
    var d=({Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6})[o.weekday];
    return {day:d,min:(parseInt(o.hour,10)%24)*60+parseInt(o.minute,10)};
  }catch(e){var n=new Date();return {day:(n.getDay()+6)%7,min:n.getHours()*60+n.getMinutes()}}
}
function isNowC(c){
  if(!c||!c.sch)return false;
  var n=vegasNow(),prev=(n.day+6)%7,i,w;
  /* windows are [start,end] minutes from midnight of the listed day; values >1440 run past midnight */
  var t=c.sch[n.day]||[];
  for(i=0;i<t.length;i++){w=t[i];if(n.min>=w[0]&&n.min<w[1])return true}
  var y=c.sch[prev]||[],m2=n.min+1440;
  for(i=0;i<y.length;i++){w=y[i];if(m2>=w[0]&&m2<w[1])return true}
  return false;
}
function isNow(v){return cats(v).some(function(k){return isNowC(v[k])})}

/* ---------- filters UI ---------- */
var zips={};DATA.forEach(function(v){if(v.zip)zips[v.zip]=(zips[v.zip]||0)+1});
Object.keys(zips).sort().forEach(function(z){var o=document.createElement('option');o.value=z;o.textContent=z+'  ·  '+zips[z]+' spots';$('zip').appendChild(o)});
var today=vegasNow().day;
DAYN.forEach(function(d,i){var b=document.createElement('button');b.className='chip'+(i===today?' today':'');b.textContent=d;b.setAttribute('aria-pressed','false');
  if(i===today)b.title='Today in Las Vegas';
  b.onclick=function(){state.days[i]=!state.days[i];b.setAttribute('aria-pressed',!!state.days[i]);refresh()};$('days').appendChild(b)});
var qT=null;
$('q').addEventListener('input',function(){var val=this.value;$('qclear').hidden=!val;clearTimeout(qT);qT=setTimeout(function(){state.q=val.trim().toLowerCase();refresh();if(!isDesk()&&state.q&&sheetState==='peek')setSheet('half')},120)});
$('q').addEventListener('keydown',function(e){if(e.key==='Enter'){this.blur();if(!isDesk())setSheet('half')}});
$('qclear').onclick=function(e){e.preventDefault();$('q').value='';this.hidden=true;state.q='';refresh();$('q').focus()};
$('zip').onchange=function(){state.zip=this.value;refresh()};
function syncRating(){Array.prototype.forEach.call($('rating').children,function(b){var on=parseFloat(b.getAttribute('data-r'))===state.minRating;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});$('r4Chip').setAttribute('aria-pressed',state.minRating>=4)}
Array.prototype.forEach.call($('rating').children,function(b){b.onclick=function(){state.minRating=parseFloat(b.getAttribute('data-r'));syncRating();refresh()}});
$('r4Chip').onclick=function(){state.minRating=state.minRating>=4?0:4;syncRating();refresh()};
$('exactOnly').onchange=function(){state.exactOnly=this.checked;refresh()};
$('bothOnly').onchange=function(){state.bothOnly=this.checked;refresh()};
function syncIK(){$('ikOnly').checked=state.ikOnly;$('ikChip').setAttribute('aria-pressed',state.ikOnly)}
$('ikOnly').onchange=function(){state.ikOnly=this.checked;syncIK();refresh()};
$('ikChip').onclick=function(){state.ikOnly=!state.ikOnly;syncIK();refresh()};
var modeBtns=Array.prototype.slice.call($('mode').querySelectorAll('button'));
modeBtns.forEach(function(b){b.onclick=function(){
  var m=b.getAttribute('data-mode');
  state.modes[m]=!state.modes[m];saveModes();syncMode();refresh();
}});
function syncMode(){
  modeBtns.forEach(function(b){
    var m=b.getAttribute('data-mode'),on=!!state.modes[m];
    b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');
  });
}
$('now').onclick=function(){state.now=!state.now;this.setAttribute('aria-pressed',state.now);this.classList.toggle('on',state.now);refresh()};
function resetAll(){
  state=freshState();saveModes();syncMode();syncRating();syncIK();
  $('q').value='';$('qclear').hidden=true;$('zip').value='';$('exactOnly').checked=false;$('bothOnly').checked=false;
  $('now').setAttribute('aria-pressed','false');$('now').classList.remove('on');
  Array.prototype.forEach.call($('days').children,function(b){b.setAttribute('aria-pressed','false')});
  refresh();fitAll();
}
$('reset').onclick=resetAll;

function activeFilterCount(){var n=0,k;if(state.zip)n++;if(state.minRating)n++;if(state.exactOnly)n++;if(state.bothOnly)n++;if(state.ikOnly)n++;if(state.now)n++;for(k in state.days)if(state.days[k])n++;return n}

function passes(v){
  var act=cats(v);if(!act.length)return false;
  if(state.bothOnly&&has(v).length<2)return false;
  if(state.ikOnly&&!onIK(v))return false;
  if(state.zip&&v.zip!==state.zip)return false;
  if(state.exactOnly&&v.approx)return false;
  if(state.minRating>0&&!(v.rating!=null&&v.rating>=state.minRating))return false;
  var anyDay=false,k;for(k in state.days)if(state.days[k])anyDay=true;
  if(anyDay){var ok=false;for(k in state.days)if(state.days[k])act.forEach(function(c){if(v[c].ds.indexOf(+k)>=0)ok=true});if(!ok)return false}
  if(state.now&&!isNow(v))return false;
  if(state.q){var hay=v.name+' '+v.loc+' '+v.addr+' '+v.zip;
    act.forEach(function(c){var x=v[c];hay+=' '+(c==='br'?x.spec+' '+(x.bname||''):x.deals)+' '+(x.lname||'')+' '+x.items+' '+x.days+' '+x.times});
    hay=hay.toLowerCase();
    var toks=state.q.split(/\s+/);for(var i=0;i<toks.length;i++)if(hay.indexOf(toks[i])<0)return false}
  return true;
}
var visible=[],sorted=[],rendered=0,PAGE=40;
function refresh(){
  visible=DATA.filter(passes);
  cluster.clearLayers();
  var ms=[];visible.forEach(function(v){var m=markers[v.id];if(m){m.setIcon(iconFor(v));ms.push(m)}});
  cluster.addLayers(ms);
  var fc=activeFilterCount();$('fcount').hidden=!fc;$('fcount').textContent=fc;
  renderList();
}

/* ---------- list ---------- */
function stars(r){
  var p=Math.max(0,Math.min(100,r/5*100));
  var row='<svg viewBox="0 0 80 15" aria-hidden="true">'+[0,1,2,3,4].map(function(i){return '<path transform="translate('+(i*16)+',0) scale(.625)" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9Z"/>'}).join('')+'</svg>';
  return '<span class="stars" role="img" aria-label="'+r+' out of 5 stars"><span style="opacity:.35;fill:currentColor">'+row.replace('<svg','<svg fill="currentColor"')+'</span><span class="fill" style="width:'+p+'%">'+row.replace('<svg','<svg fill="#fcc54b"')+'</span></span>';
}
function firstSeg(s){return String(s||'').split(' | ')[0]}
function dealLine(v,k){var x=v[k];var t=k==='br'?(present(x.spec)?x.spec:x.bname):x.deals;
  if(!present(t)||/^.{0,40}happy hour in [a-z ]+$/i.test(t)){if(present(x.items))t=x.items.split(/;\s*/).slice(0,3).join(' · ');else if(!present(t))t=''}
  return String(t||'').replace(/\s*\[[^\]]*\]\s*/g,' ').trim()}
function priceHL(s){return esc(s).replace(/(\$\s?\d[\d,]*(?:\.\d+)?(?:\s?[-–]\s?\$?\d[\d,]*(?:\.\d+)?)?|\d+\s?%\s?off|half[- ]off|half[- ]price|bottomless|BOGO)/gi,'<b>$1</b>')}
function cardHtml(v){
  var c=cats(v),d=dist(v),now=isNow(v);
  var h='<article class="card'+(v.id===activeId?' active':'')+'" data-id="'+v.id+'" role="listitem" tabindex="0" aria-label="'+esc(v.name)+'">';
  h+='<div class="body">';
  h+='<div class="r1"><h3>'+esc(v.name)+'</h3>'+(d!=null?'<span class="dist">'+fmtDist(d,v)+'</span>':'')+'</div>';
  var r2=[];if(v.rating!=null)r2.push('<span class="rate">'+icon('star')+v.rating+'</span>'+(v.reviews?' ('+fmtNum(v.reviews)+')':''));
  if(present(v.loc))r2.push(esc(v.loc));else if(v.zip)r2.push(esc(v.zip));
  h+='<div class="r2">'+r2.join(' · ')+'</div>';
  var tk=c.filter(function(x){return present(v[x].times)||present(v[x].days)});
  if(tk.length){h+='<div class="when">'+icon('clock')+'<span>'+tk.slice(0,2).map(function(x){var y=v[x];return (c.length>1?'<span class="c-'+x+'">'+CATN[x].split(' ')[0]+'</span> ':'')+esc([present(y.days)?y.days:'',present(y.times)?firstSeg(y.times):''].filter(Boolean).join(' · '))}).join('  ·  ')+'</span></div>'}
  var dl=dealLine(v,c[0]);if(dl)h+='<div class="deal">'+priceHL(dl)+'</div>';
  var bd='';if(now)bd+='<span class="b now">Now</span>';
  c.forEach(function(x){bd+='<span class="b '+x+'">'+CATN[x]+'</span>'});
  if(v.ik)bd+='<span class="b ik'+(onIK(v)?'':' unc')+'">'+(onIK(v)?'inKind':'inKind?')+'</span>';
  if(v.approx)bd+='<span class="b muted" title="'+esc(v.q)+'">Approx. pin</span>';
  h+='<div class="badges">'+bd+'</div>';
  return h+'</div></article>';
}
function renderList(){
  sorted=visible.slice();
  if(user)sorted.sort(function(a,b){var x=dist(a),y=dist(b);return (x==null?1e9:x)-(y==null?1e9:y)});
  else sorted.sort(function(a,b){return a.name.localeCompare(b.name)});
  rendered=0;$('list').innerHTML='';$('list').scrollTop=0;
  if(!sorted.length){
    $('list').innerHTML='<div class="empty"><div class="em-ic">'+icon(state.now?'clock':'search')+'</div><h3>No spots match</h3><p>'+(state.now?'Nothing is running right this minute with these filters. Try another category or turn off “Happening now”.':'Try a different search or loosen a filter.')+'</p><button class="btn primary" id="emptyReset">Clear filters</button></div>';
    $('emptyReset').onclick=resetAll;
  } else renderMore();
  var unm=visible.filter(function(v){return v.lat==null}).length;
  var onCats=KS.filter(function(k){return state.modes[k]});
  var lab=onCats.length?onCats.map(function(k){return {hh:'happy hour',br:'brunch',ln:'late night'}[k]}).join(' + '):'all categories';
  $('count').textContent=visible.length+(visible.length===1?' spot':' spots');
  var lab2=onCats.length?onCats.map(function(k){return CATN[k]}).join(' · '):'All categories';
  $('status').textContent=(visible.length<DATA.length?'of '+DATA.length+' · ':'')+lab2+' · '+(user?'Nearest first':'Sorted A–Z');
  $('status').setAttribute('data-full',visible.length+' of '+DATA.length+' venues ('+lab+')');
  var sb=$('sortBtn');sb.hidden=false;sb.innerHTML=user?icon('nav')+'Nearest':icon('locate')+'Sort by distance';
}
function renderMore(){
  var el=$('list'),chunk=sorted.slice(rendered,rendered+PAGE),h='';
  chunk.forEach(function(v){h+=cardHtml(v)});rendered+=chunk.length;
  var old=el.querySelector('.more');if(old)old.remove();
  var unm=sorted.filter(function(v){return v.lat==null}).length;
  el.insertAdjacentHTML('beforeend',h+(rendered<sorted.length?'<div class="more">Loading more…</div>':(unm?'<div class="more end">'+unm+' of these couldn’t be placed on the map</div>':'')));
}
$('list').addEventListener('scroll',function(){var el=this;if(rendered<sorted.length&&el.scrollTop+el.clientHeight>el.scrollHeight-400)renderMore()},{passive:true});
$('sortBtn').onclick=function(){if(!user)$('loc').click()};
$('list').addEventListener('click',function(e){var el=e.target.closest('.card[data-id]');if(!el)return;openDetail(+el.getAttribute('data-id'),{fromList:true})});
$('list').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('card')){e.preventDefault();openDetail(+e.target.getAttribute('data-id'),{fromList:true})}});

function setActive(id){
  var prev=activeId;activeId=id;
  [prev,id].forEach(function(x){if(x!=null&&markers[x]){var el=markers[x].getElement&&markers[x].getElement();if(el){var mk=el.querySelector('.mk');if(mk)mk.classList.toggle('on',x===id)}if(x===id)markers[x].setZIndexOffset(1000);else markers[x].setZIndexOffset(0)}});
  Array.prototype.forEach.call($('list').querySelectorAll('.card'),function(el){el.classList.toggle('active',+el.getAttribute('data-id')===id)});
}

/* ---------- detail ---------- */
function flagHtml(t){return '<div class="flag">'+icon('info')+'<div>'+t+'</div></div>'}
function confFlags(v,k){
  var c=v[k],h='';
  // Unverified is only shown inside the collapsed Confidence & notes section (see confText).
  if(k==='ln'){var f=c.conf||'';
    var fl=[];['CONFLICTING','OUTDATED','POSSIBLY OUTDATED','LOW CONFIDENCE','INDUSTRY ONLY'].forEach(function(x){if(f.indexOf(x)>=0&&!(x==='OUTDATED'&&f.indexOf('POSSIBLY OUTDATED')>=0))fl.push(x.toLowerCase())});
    if(fl.length)h+=flagHtml('<b>Heads up:</b> '+esc(fl.join(' · '))+' — see source notes.');}
  return h;
}
function confText(v,k){var c=v[k];
  if(k==='br'){if(c.conf==='official')return 'Verified on the venue’s own page.';if(c.conf==='snippet')return 'Partially verified from a search-result snippet of the venue/resort page.';if(c.conf==='editorial')return 'Unverified — editorial / aggregator listing only. Check before you go.'}
  if(k==='ln'){var f=c.conf||'';if(/^VERIFIED/.test(f))return 'Verified on the venue/resort official page.';if(/^PARTIALLY/.test(f))return 'Partially verified ('+f+').';if(/^UNVERIFIED/.test(f))return 'Unverified — aggregator/editorial listing only. Call ahead.';if(/^DERIVED/.test(f))return 'Derived from a happy hour window starting at 7 PM or later.';}
  return '';
}
function itemsHtml(s){
  if(!present(s))return '';
  var parts=String(s).split(/;\s*/).map(function(x){return x.trim()}).filter(Boolean);
  var h='<p class="items-title">Menu &amp; prices</p><ul class="items">';
  parts.forEach(function(p){
    var aside='';p=p.replace(/\s*\[([^\]]*)\]\s*/g,function(_,a){aside+=a;return ' '}).trim();
    var m=p.match(/^(.*?)[\s:–-]+((?:\$\s?\d[\d,]*(?:\.\d+)?)(?:\s?(?:[-–\/]|to)\s?\$?\d[\d,]*(?:\.\d+)?)?(?:\s?(?:each|ea\.?|\+|per person|pp))?(?:\s?-\s?\d+\s?pcs?)?)$/i);
    if(m&&m[1]&&m[1].length>1)h+='<li><span class="nm">'+priceHL(m[1])+'</span><span class="pr">'+esc(m[2])+'</span></li>';
    else if(p)h+='<li><span class="nm">'+priceHL(p)+'</span></li>';
    if(aside)h+='<li><span class="aside">'+esc(aside)+'</span></li>';
  });
  return h+'</ul>';
}
function secHtml(v,k){
  var c=v[k];if(!c)return '';
  var sub=k==='br'&&c.bname?c.bname:(k==='ln'&&c.lname?c.lname:'');
  var now=isNowC(c);
  var h='<div class="dsec"><div class="panel cat '+k+'"><div class="ph"><span class="pi">'+icon(k)+'</span><h4>'+CATL[k]+(sub?'<small>'+esc(sub)+'</small>':'')+'</h4>'+(now?'<span class="b now">Now</span>':'')+'</div>';
  if(present(c.days))h+='<div class="whenrow">'+icon('cal')+'<div>'+esc(c.days)+'</div></div>';
  if(present(c.times))h+='<div class="whenrow">'+icon('clock')+'<div>'+String(c.times).split(' | ').map(function(x){return '<span class="seglist">'+esc(x)+'</span>'}).join('')+'</div></div>';
  if(!present(c.days)&&!present(c.times))h+='<div class="whenrow">'+icon('clock')+'<div class="muted">Days &amp; times not listed — call ahead</div></div>';
  var deal=k==='br'?c.spec:c.deals;
  if(present(deal))h+='<div class="dealbox">'+priceHL(String(deal).replace(/\s*\[[^\]]*\]\s*/g,' '))+'</div>';
  h+=itemsHtml(c.items);
  h+=confFlags(v,k);
  var u=safeUrl(c.url),ct=confText(v,k);
  if(u)h+='<a class="src" href="'+esc(u)+'" target="_blank" rel="noopener">'+icon('ext')+'Source: '+esc(u.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])+'</a>';
  if(present(c.notes)||ct)h+='<details class="conf"><summary>'+icon('info')+'Confidence &amp; notes</summary>'+(ct?'<p>'+esc(ct)+'</p>':'')+(present(c.notes)?'<p>'+esc(c.notes)+'</p>':'')+'</details>';
  return h+'</div></div>';
}
function ikHtml(v){
  var i=v.ik;
  if(!i)return '<p class="foot-note">Not found in inKind’s Las Vegas list (checked Oct 9, 2026) — not proof it isn’t on inKind.</p>';
  var u=safeUrl(i.url);
  var h='<div class="dsec"><div class="panel ikp"><div class="ph"><span class="pi">'+icon('gift')+'</span><h4>'+(i.s==='Yes'?'On inKind':'Possibly on inKind')+'<small>'+(i.s==='Yes'?'Pay with inKind credit for bonus value':'Unclear match — check the app')+'</small></h4></div>';
  if(present(i.note))h+='<p class="muted">'+esc(i.note)+'</p>';
  return h+'</div></div>';
}
function detailHtml(v){
  var hv=has(v),act=cats(v),k=act.length>1?'multi':(act[0]||hv[0]),d=dist(v);
  var h='<div class="hero '+k+'"><div class="kicker">';
  if(isNow(v))h+='<span><span class="live" style="background:#fff"></span>Happening now</span>';
  hv.forEach(function(x){h+='<span>'+icon(x)+CATN[x]+'</span>'});
  if(onIK(v))h+='<span>'+icon('gift')+'inKind</span>';
  h+='</div><h2 id="dName">'+esc(v.name)+'</h2>';
  if(present(v.loc))h+='<div class="loc">'+esc(v.loc)+'</div>';
  h+='<div class="meta">';
  if(v.rating!=null)h+='<span>'+stars(v.rating)+' '+v.rating+(v.reviews?' <span class="rv">('+Number(v.reviews).toLocaleString()+')</span>':'')+(v.src?' <span class="rv">· '+esc(v.src.replace(/\s*\(.*\)/,''))+'</span>':'')+'</span>';
  else h+='<span class="rv">No rating found</span>';
  if(d!=null)h+='<span>'+icon('nav','inl')+' '+fmtDist(d,v)+' away</span>';
  h+='</div></div>';
  h+='<div class="actions"><a class="btn primary" href="'+dirUrl(v)+'" target="_blank" rel="noopener">'+icon('nav')+'Directions</a>';
  var iu=v.ik&&safeUrl(v.ik.url);if(iu)h+='<a class="btn teal" href="'+esc(iu)+'" target="_blank" rel="noopener">'+icon('gift')+'Open on inKind</a>';
  h+='</div>';
  h+='<div class="dsec"><div class="addr">'+icon('pin')+'<div>'+esc(v.addr)+(v.approx?'<div class="muted" style="font-size:12.5px;margin-top:2px">Approximate pin ('+esc(v.q)+') — not a verified street location.</div>':'')+'</div></div></div>';
  var ks=KS.slice();ks.sort(function(a,b){return (act.indexOf(b)>=0)-(act.indexOf(a)>=0)});
  ks.forEach(function(x){h+=secHtml(v,x)});
  h+=ikHtml(v);
  if(v.rating!=null&&v.src)h+='<p class="foot-note">Rating: '+esc(v.src)+'. Deals and prices change often — confirm before you go.</p>';
  else h+='<p class="foot-note">Deals and prices change often — confirm before you go.</p>';
  return h;
}
var detailOpen=false,lastFocus=null;
function openDetail(id,opt){
  opt=opt||{};var v=DATA[id],m=markers[id];
  lastFocus=document.activeElement;
  setActive(id);
  $('dBody').innerHTML=detailHtml(v);$('dBody').scrollTop=0;$('dMini').textContent=v.name;$('detail').classList.remove('scrolled');
  var dt=$('detail');dt.hidden=false;dt.style.transform='';
  requestAnimationFrame(function(){requestAnimationFrame(function(){dt.classList.add('show')})});
  detailOpen=true;document.body.classList.add('detail-open');
  setTimeout(function(){$('dClose').focus({preventScroll:true})},350);
  if(!m){if(opt.fromList)toast('This venue could not be placed on the map.');return}
  if(opt.fromList){
    cluster.zoomToShowLayer(m,function(){centerOn(m.getLatLng(),Math.max(map.getZoom(),16));setActive(id)});
  } else centerOn(m.getLatLng(),map.getZoom());
}
function closeDetail(){
  if(!detailOpen)return;detailOpen=false;
  var dt=$('detail');dt.classList.remove('show');dt.style.transform='';
  document.body.classList.remove('detail-open');
  setTimeout(function(){if(!detailOpen)dt.hidden=true},400);
  setActive(null);
  if(lastFocus&&lastFocus.focus&&document.body.contains(lastFocus))lastFocus.focus({preventScroll:true});
}
$('dClose').onclick=closeDetail;
$('dBody').addEventListener('scroll',function(){$('detail').classList.toggle('scrolled',this.scrollTop>110)},{passive:true});
$('scrim').onclick=function(){if(filtersOpen)closeFilters()};
map.on('click',function(){if(detailOpen)closeDetail()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(filtersOpen)closeFilters();else if(detailOpen)closeDetail()}});
/* map viewport helpers – keep pins clear of the overlays */
function overlayBox(){
  var W=window.innerWidth,H=window.innerHeight,top=0,left=0,bottom=0;
  if(isDesk()){left=$('sheet').getBoundingClientRect().right+12;if(detailOpen)left=Math.max(left,$('detail').getBoundingClientRect().right+12)}
  else{top=detailOpen?40:topH;bottom=detailOpen?Math.min(H*0.86,$('detail').offsetHeight||H*0.6):sheetPx()}
  return {W:W,H:H,top:top,left:left,bottom:bottom};
}
function centerOn(ll,z){
  var b=overlayBox(),tx=(b.left+b.W)/2,ty=(b.top+(b.H-b.bottom))/2;
  if(!isDesk()&&detailOpen)ty=Math.max(b.top+60,ty);
  var p=map.project(ll,z).add([b.W/2-tx,b.H/2-ty]);
  map.setView(map.unproject(p,z),z,{animate:true});
}
function fitTo(bounds,maxZoom){
  var b=overlayBox();
  map.fitBounds(bounds,{paddingTopLeft:[b.left+24,b.top+24],paddingBottomRight:[24,b.bottom+24],maxZoom:maxZoom||16});
}
/* swipe-down to close detail (mobile) */
(function(){
  var g=$('dgrab'),dt=$('detail'),y0=null,dy=0;
  function down(e){if(isDesk())return;y0=e.clientY;dy=0;dt.classList.add('dragging');g.setPointerCapture(e.pointerId)}
  function move(e){if(y0==null)return;dy=Math.max(0,e.clientY-y0);dt.style.transform='translateY('+dy+'px)'}
  function up(){if(y0==null)return;y0=null;dt.classList.remove('dragging');if(dy>90)closeDetail();else dt.style.transform=''}
  g.addEventListener('pointerdown',down);g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up);
})();

/* ---------- filters sheet ---------- */
var filtersOpen=false;
function openFilters(){filtersOpen=true;var f=$('filters');f.hidden=false;$('scrim').hidden=false;document.body.classList.add('filters-open');
  requestAnimationFrame(function(){requestAnimationFrame(function(){f.classList.add('show');$('scrim').classList.add('show')})});
  $('filtertoggle').setAttribute('aria-expanded','true');$('filtertoggle').classList.add('on');updateApply();setTimeout(function(){$('fClose').focus({preventScroll:true})},300)}
function closeFilters(){filtersOpen=false;var f=$('filters');f.classList.remove('show');document.body.classList.remove('filters-open');$('scrim').classList.remove('show');
  $('filtertoggle').setAttribute('aria-expanded','false');$('filtertoggle').classList.remove('on');
  setTimeout(function(){if(!filtersOpen){f.hidden=true;$('scrim').hidden=true}},400);$('filtertoggle').focus({preventScroll:true})}
function updateApply(){$('fApply').textContent='Show '+visible.length+' spot'+(visible.length===1?'':'s')}
$('filtertoggle').onclick=function(){filtersOpen?closeFilters():openFilters()};
$('fClose').onclick=closeFilters;$('fApply').onclick=closeFilters;
var _rl=renderList;renderList=function(){_rl();if(filtersOpen)updateApply()};

/* ---------- bottom sheet (mobile) ---------- */
var sheetState='half',topH=150;
function sheetPx(st){st=st||sheetState;var H=window.innerHeight;
  if(st==='peek')return Math.round(Math.min(150,H*0.2)+0);
  if(st==='full')return Math.round(H-topH+8);
  return Math.round(H*0.46)}
function setSheet(st,instant){
  sheetState=st;if(isDesk())return;
  var s=$('sheet');if(instant)s.classList.add('dragging');
  document.documentElement.style.setProperty('--sheet-h',sheetPx(st)+'px');
  document.body.classList.toggle('sheet-full',st==='full');
  $('handle').setAttribute('aria-label',st==='full'?'Collapse list':'Expand list');
  if(instant){s.offsetHeight;s.classList.remove('dragging')}
}
(function(){
  var g=$('grab'),s=$('sheet'),y0=null,h0=0,moved=false,lastY=0,lastT=0,vel=0;
  function down(e){if(isDesk()||e.target.closest('#sortBtn'))return;y0=e.clientY;h0=s.offsetHeight;moved=false;lastY=y0;lastT=performance.now();vel=0;g.setPointerCapture(e.pointerId)}
  function move(e){if(y0==null)return;var dy=e.clientY-y0;if(Math.abs(dy)>4){moved=true;s.classList.add('dragging')}
    if(!moved)return;var t=performance.now();vel=(e.clientY-lastY)/Math.max(1,t-lastT);lastY=e.clientY;lastT=t;
    var h=Math.max(90,Math.min(sheetPx('full'),h0-dy));document.documentElement.style.setProperty('--sheet-h',h+'px')}
  function up(){if(y0==null)return;y0=null;s.classList.remove('dragging');
    if(!moved){setSheet(sheetState==='peek'?'half':sheetState==='half'?'full':'half');return}
    var h=s.offsetHeight,opts=['peek','half','full'],best='half',bd=1e9;
    if(vel<-0.5)best=h>sheetPx('half')?'full':'half';else if(vel>0.5)best=h<sheetPx('half')?'peek':'half';
    else opts.forEach(function(o){var dd=Math.abs(sheetPx(o)-h);if(dd<bd){bd=dd;best=o}});
    setSheet(best)}
  g.addEventListener('pointerdown',down);g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up);
  $('handle').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation()}});
  $('handle').addEventListener('click',function(e){if(e.detail===0)setSheet(sheetState==='full'?'half':'full')});
})();
map.on('dragstart',function(){if(!isDesk()&&sheetState==='full')setSheet('half')});
var lastW=window.innerWidth;
function layout(){
  topH=Math.round($('topbar').getBoundingClientRect().bottom);
  document.documentElement.style.setProperty('--top-h',(isDesk()?$('topbar').offsetHeight:topH)+'px');
  if(!isDesk())setSheet(sheetState,true);else document.body.classList.remove('sheet-full');
  syncMode();map.invalidateSize();
}
window.addEventListener('resize',function(){layout()});
if(window.ResizeObserver)new ResizeObserver(function(){layout()}).observe($('topbar'));

/* ---------- toast ---------- */
function toast(msg,ms){var t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('show')},ms||4500)}
function fitAll(){
  var pts=DATA.filter(function(v){return v.lat!=null}).map(function(v){return [v.lat,v.lng]});
  if(pts.length)map.fitBounds(L.latLngBounds(pts).pad(0.05));
  map.setView(STRIP,11);
}

/* ---------- geolocation ---------- */
$('loc').onclick=function(){
  if(!navigator.geolocation){toast('Geolocation isn’t supported here. Showing the Strip.');map.setView(STRIP,13);return}
  var btn=this;btn.disabled=true;btn.classList.add('busy');btn.setAttribute('aria-label','Locating…');
  navigator.geolocation.getCurrentPosition(function(pos){
    btn.disabled=false;btn.classList.remove('busy');btn.classList.add('on');btn.setAttribute('aria-label','Update my location');
    user=[pos.coords.latitude,pos.coords.longitude];
    if(userMarker)map.removeLayer(userMarker);
    userMarker=L.marker(user,{icon:L.divIcon({className:'',html:'<div class="you"></div>',iconSize:[20,20],iconAnchor:[10,10]}),zIndexOffset:2000,title:'You are here',keyboard:false}).addTo(map);
    if(detailOpen&&activeId!=null)$('dBody').innerHTML=detailHtml(DATA[activeId]);
    renderList();
    var near=visible.filter(function(v){return v.lat!=null}).sort(function(a,b){return dist(a)-dist(b)}).slice(0,10);
    var b=L.latLngBounds([user]);near.forEach(function(v){b.extend([v.lat,v.lng])});
    fitTo(b,15);
    var far=near.length&&dist(near[0])>50;
    toast(far?'You’re far from Las Vegas — nearest spot is '+Math.round(dist(near[0]))+' mi away.':'Showing the closest spots first.',4000);
  },function(err){
    btn.disabled=false;btn.classList.remove('busy');btn.setAttribute('aria-label','Use my location');
    var msg=err&&err.code===1?'Location permission denied.':(err&&err.code===3?'Location request timed out.':'Couldn’t find your location.');
    toast(msg+' Showing the Strip instead.',6000);
    map.setView(STRIP,13);
  },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
};

var nHH=DATA.filter(function(v){return v.hh}).length,nBR=DATA.filter(function(v){return v.br}).length,nLN=DATA.filter(function(v){return v.ln}).length,nBoth=DATA.filter(function(v){return has(v).length>1}).length;
var nIK=DATA.filter(onIK).length,nApx=DATA.filter(function(v){return v.approx}).length;
$('sub').textContent=DATA.length+' spots · happy hour, brunch & late night';
$('about').textContent=DATA.length+' venues: '+nHH+' happy hour, '+nBR+' brunch, '+nLN+' late night ('+nBoth+' on 2+ lists), '+nIK+' on inKind, '+nApx+' approximate pins. Late-night windows after midnight belong to the previous evening. Times use Las Vegas time. Data gathered from venue sites and third-party guides (Oct 2026) — many entries are unverified; confirm before you go.';
modeBtns.forEach(function(b){var m=b.getAttribute('data-mode'),n={hh:nHH,br:nBR,ln:nLN}[m];b.title=n+' venues · tap to toggle';b.setAttribute('aria-label',({hh:'Happy Hour',br:'Brunch',ln:'Late night'})[m]+' ('+n+')')});
layout();setSheet('half',true);
refresh();syncRating();
requestAnimationFrame(syncMode);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){layout()});
setInterval(function(){if(state.now)refresh()},60000);
window.__vhh={nIK:nIK,count:DATA.length,nHH:nHH,nBR:nBR,nLN:nLN,nBoth:nBoth,setNow:function(d,m){NOW_OVERRIDE=(d==null?null:{day:d,min:m});refresh()},nowCount:function(){return DATA.filter(function(v){return isNow(v)}).length},isNowC:function(c){return isNowC(c)},markers:function(){return Object.keys(markers).length},visible:function(){return visible.length},onMap:function(){return cluster.getLayers().length},modes:function(){return {hh:!!state.modes.hh,br:!!state.modes.br,ln:!!state.modes.ln}},setModes:function(m){if(!m||typeof m!=='object')return;state.modes={hh:!!m.hh,br:!!m.br,ln:!!m.ln};saveModes();syncMode();refresh()},open:function(id){openDetail(id,{fromList:true})},close:closeDetail,sheet:function(s){if(s)setSheet(s);return sheetState},find:function(n){for(var i=0;i<DATA.length;i++)if(DATA[i].name===n)return i;return -1}};
}

(function(){
  function fail(e){var s=document.getElementById('status'),c=document.getElementById('count');if(c)c.textContent='Couldn’t load spots';if(s)s.textContent='Could not load venue data ('+(e&&e.message||e)+'). Check your connection and reload.';var l=document.getElementById('list');if(l)l.innerHTML='';}
  fetch('data.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(startApp).catch(function(e){
    console.error('startApp failed',e&&e.stack||e);if(window.__vhh)return;
    // offline fallback: try the SW cache explicitly
    if(window.caches){caches.match('data.json',{ignoreSearch:true}).then(function(r){return r?r.json().then(startApp):fail(e)}).catch(fail)}else fail(e);
  });
  if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(e){console.warn('SW registration failed',e)})})}
  // iOS "Add to Home Screen" hint
  var ua=navigator.userAgent||'',isIOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var standalone=window.navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
  var hint=document.getElementById('a2hs');
  var dismissed=false;try{dismissed=localStorage.getItem('a2hsDismissed')==='1'}catch(e){}
  if(hint&&isIOS&&!standalone&&!dismissed){hint.classList.add('show');document.body.classList.add('a2hs-on')}
  var hx=document.getElementById('a2hsClose');
  if(hx)hx.onclick=function(){hint.classList.remove('show');document.body.classList.remove('a2hs-on');try{localStorage.setItem('a2hsDismissed','1')}catch(e){}};
  // Android/Chrome install prompt
  var deferred=null,ibs=[document.getElementById('installBtn'),document.getElementById('installBtn2')];
  function showIB(on){ibs.forEach(function(b){if(b)b.hidden=!on})}
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;showIB(true)});
  ibs.forEach(function(ib){if(ib)ib.onclick=function(){if(!deferred)return;deferred.prompt();deferred.userChoice.finally(function(){deferred=null;showIB(false)})}});
  window.addEventListener('appinstalled',function(){showIB(false)});
})();
