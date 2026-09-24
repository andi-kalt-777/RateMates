/* global __PRECACHE__ */
// Service Worker: macht RateMates installierbar und lädt die App-Hülle auch ohne Netz.
// Der Build (Plugin in vite.config.js) ersetzt __VERSION__ und __PRECACHE__.
// Daten aus Firebase laufen nie über diesen Worker, nur Dateien von GitHub Pages und
// die Google-Schriften.
const VERSION="__VERSION__";
const PRECACHE=__PRECACHE__;
const CACHE="rm-app-"+VERSION;
const FONTS="rm-fonts";
const INDEX=new URL("./",self.location).href;

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});
// Alte Stände wegräumen: jede neue Version bringt ihre Dateien selbst mit
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==FONTS).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  // Seite selbst: erst Netz (neue Version sofort), ohne Netz die gespeicherte Hülle
  if(req.mode==="navigate"&&url.origin===self.location.origin){
    e.respondWith(fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(INDEX,copy));}
      return res;
    }).catch(()=>caches.match(INDEX,{ignoreVary:true})));
    return;
  }
  // Eigene Dateien: Namen enthalten einen Hash, gespeicherte Kopie ist immer richtig.
  // ignoreVary: Skripte kommen mit Origin-Kopfzeile, gespeichert wurden sie ohne
  if(url.origin===self.location.origin){
    e.respondWith(caches.match(req,{ignoreVary:true}).then(hit=>hit||fetch(req)));
    return;
  }
  // Schriften: gespeicherte Kopie sofort, im Hintergrund auffrischen
  if(url.hostname==="fonts.googleapis.com"||url.hostname==="fonts.gstatic.com"){
    e.respondWith(caches.open(FONTS).then(c=>c.match(req,{ignoreVary:true}).then(hit=>{
      const net=fetch(req).then(res=>{if(res.ok||res.type==="opaque")c.put(req,res.clone());return res;}).catch(()=>hit);
      return hit||net;
    })));
  }
});
