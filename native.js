/* BamBoozle native bridge – thin feature-detecting wrapper.
   In the Capacitor app (iOS/Android) it uses native plugins; in the browser PWA every call
   falls back to a web API or becomes a no-op, so the same app.js runs in both. */
(function(){
"use strict";
var cap=window.Capacitor||null;
var isNative=!!(cap&&cap.isNativePlatform&&cap.isNativePlatform());
var platform=isNative&&cap.getPlatform?cap.getPlatform():'web';
var reg=(window.capacitorExports&&window.capacitorExports.registerPlugin)||(cap&&cap.registerPlugin);
var plugins={};
function P(name){
  if(!isNative||!reg)return null;
  if(plugins[name]!==undefined)return plugins[name];
  try{plugins[name]=(cap.isPluginAvailable&&!cap.isPluginAvailable(name))?null:reg(name)}catch(e){plugins[name]=null}
  return plugins[name];
}
function noop(){return Promise.resolve()}
function swallow(p){return p&&p.catch?p.catch(function(e){console.warn('[BB]',e)}):Promise.resolve()}
var ua=navigator.userAgent||'';
var isAppleUA=/iPad|iPhone|iPod|Macintosh/.test(ua);

var BB={
  isNative:isNative,platform:platform,
  /* light tap on toggles */
  haptic:function(kind){
    var h=P('Haptics');if(!h)return;
    if(kind==='select')swallow(h.selectionChanged?h.selectionChanged():null);
    else swallow(h.impact({style:kind==='medium'?'MEDIUM':'LIGHT'}));
  },
  /* one-shot location -> Promise<[lat,lng]>; rejects with {code} like the web API (1 = denied) */
  getPosition:function(){
    var g=P('Geolocation');
    if(g){
      return g.checkPermissions().catch(function(){return {}}).then(function(st){
        if(st&&(st.location==='granted'||st.coarseLocation==='granted'))return st;
        return g.requestPermissions({permissions:['location','coarseLocation']});
      }).then(function(st){
        if(st&&st.location==='denied'&&st.coarseLocation!=='granted'){var e=new Error('denied');e.code=1;throw e}
        return g.getCurrentPosition({enableHighAccuracy:true,timeout:15000,maximumAge:60000});
      }).then(function(pos){return [pos.coords.latitude,pos.coords.longitude]},function(err){
        var e=err instanceof Error?err:new Error(String(err));
        if(e.code==null)e.code=/denied|permission/i.test(e.message||'')?1:(/time/i.test(e.message||'')?3:2);
        throw e;
      });
    }
    return new Promise(function(res,rej){
      if(!navigator.geolocation){var e=new Error('unsupported');e.code=0;rej(e);return}
      navigator.geolocation.getCurrentPosition(function(p){res([p.coords.latitude,p.coords.longitude])},rej,{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
    });
  },
  /* directions: Apple Maps on iOS, Google Maps elsewhere */
  dirUrl:function(v){
    var dest=(v.lat==null||v.approx)?(v.name+', '+v.addr):(v.lat+','+v.lng);
    if(platform==='ios')return 'https://maps.apple.com/?daddr='+encodeURIComponent(dest)+'&q='+encodeURIComponent(v.name);
    return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest);
  },
  /* open a link outside the web view (Maps app, system browser) */
  openExternal:function(url,opts){
    if(!isNative){window.open(url,'_blank','noopener');return Promise.resolve()}
    var maps=/^https:\/\/(maps\.apple\.com|www\.google\.com\/maps)/.test(url)||/^(geo|maps|comgooglemaps):/.test(url);
    var al=P('AppLauncher'),br=P('Browser');
    if((maps||(opts&&opts.app))&&al)return swallow(al.openUrl({url:url}));
    if(br)return swallow(br.open({url:url,presentationStyle:'popover'}));
    if(al)return swallow(al.openUrl({url:url}));
    window.open(url,'_system');return Promise.resolve();
  },
  canShare:function(){return isNative?!!P('Share'):!!navigator.share||!!(navigator.clipboard&&navigator.clipboard.writeText)},
  /* share text+url; resolves 'shared' | 'copied' | 'cancelled' */
  share:function(o){
    var s=P('Share');
    if(s)return s.share({title:o.title,text:o.text,url:o.url,dialogTitle:'Share '+o.title}).then(function(){return 'shared'},function(e){return /cancel/i.test(e&&e.message||'')?'cancelled':Promise.reject(e)});
    if(navigator.share)return navigator.share({title:o.title,text:o.text,url:o.url}).then(function(){return 'shared'},function(e){if(e&&e.name==='AbortError')return 'cancelled';throw e});
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(o.text+(o.url?'\n'+o.url:'')).then(function(){return 'copied'});
    return Promise.reject(new Error('Sharing not supported'));
  },
  setTheme:function(t){
    var sb=P('StatusBar');if(!sb)return;
    swallow(sb.setStyle({style:t==='dark'?'DARK':'LIGHT'}));
    if(platform==='android')swallow(sb.setBackgroundColor&&sb.setBackgroundColor({color:t==='dark'?'#0b0b12':'#f3f3f8'}));
  },
  ready:function(){var sp=P('SplashScreen');if(sp)swallow(sp.hide({fadeOutDuration:250}))},
  /* Android hardware back: handler returns true if it consumed the event */
  onBack:function(handler){
    var app=P('App');if(!app||platform!=='android')return;
    app.addListener('backButton',function(ev){if(!handler()){if(ev&&ev.canGoBack)window.history.back();else swallow(app.minimizeApp())}});
  },
  onResume:function(fn){var app=P('App');if(app)app.addListener('resume',fn)},
  /* local notifications (native only) */
  notif:{
    supported:function(){return !!P('LocalNotifications')},
    request:function(){var ln=P('LocalNotifications');if(!ln)return Promise.resolve(false);
      return ln.checkPermissions().then(function(st){return st.display==='granted'?st:ln.requestPermissions()}).then(function(st){return st.display==='granted'})},
    clear:function(){var ln=P('LocalNotifications');if(!ln)return Promise.resolve();
      return ln.getPending().then(function(r){var n=(r&&r.notifications)||[];return n.length?ln.cancel({notifications:n.map(function(x){return {id:x.id}})}):null}).catch(function(e){console.warn('[BB]',e)})},
    /* items: [{id,title,body,at:Date,extra}] */
    schedule:function(items){var ln=P('LocalNotifications');if(!ln)return Promise.resolve(0);
      return BB.notif.clear().then(function(){
        if(!items.length)return 0;
        return ln.schedule({notifications:items.map(function(x){return {id:x.id,title:x.title,body:x.body,schedule:{at:x.at,allowWhileIdle:true},isExactNotification:false,extra:x.extra||null}})}).then(function(){return items.length});
      });
    },
    onTap:function(fn){var ln=P('LocalNotifications');if(ln)ln.addListener('localNotificationActionPerformed',function(a){fn(a&&a.notification&&a.notification.extra)})}
  },
  isAppleUA:isAppleUA
};
window.BB=BB;
if(isNative)document.documentElement.classList.add('native','native-'+platform);
})();
