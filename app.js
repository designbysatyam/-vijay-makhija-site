(function(){
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var root=document.documentElement;
var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var ICON={
  tg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 4.3 2.9 11.5c-.9.3-.9 1.5 0 1.8l4.7 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.4 4.8 3.5c.6.4 1.4.1 1.6-.6L23 5.4c.2-.8-.6-1.4-1.5-1.1zM9.5 14.3l8.9-5.5-7 6.7-.3 3z"/></svg>',
  yt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2C.5 9.1.5 12 .5 12s0 2.9.5 4.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.5-4.8zM9.8 15.2V8.8l5.6 3.2z"/></svg>',
  ig:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.6-4.9A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-.8.8c-.8-.4-1.6-1.2-2-2l.8-.8-1-2z"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>',
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>'
};

var CREDIT='<span class="credit"><span class="cm" aria-hidden="true">$</span><span>Design by <b>$atyam</b></span></span>';
function ensureCredit(){
  $$("footer").forEach(function(f){if(!f.querySelector(".credit")){var d=document.createElement("div");d.className="f-credit";d.innerHTML=CREDIT;f.appendChild(d)}});
  var i=$("#intro");if(i&&!i.querySelector(".credit")){var c=document.createElement("div");c.className="cr";c.innerHTML=CREDIT;i.appendChild(c)}
}

/* ---------- editable content and theme (written by the admin panel) ---------- */
function introLetters(el,name){
  el.innerHTML=name.split("").map(function(c,i){return c===" "?'<span class="sp" style="--i:'+i+'"></span>':'<span style="--i:'+i+'">'+esc(c)+'</span>'}).join("");
}
function applyTheme(th){
  th=th||{};var s=root.style;
  [["bg","--bg"],["amber","--amber"],["amber2","--amber2"],["teal","--teal"],["blue","--blue"],["violet","--violet"],["g1","--g1"],["g2","--g2"],["g3","--g3"]].forEach(function(p){if(th[p[0]])s.setProperty(p[1],th[p[0]])});
  if(th.display)s.setProperty("--display","'"+th.display+"','Segoe UI',system-ui,sans-serif");
  if(th.body)s.setProperty("--body","'"+th.body+"','Segoe UI',system-ui,sans-serif");
  if(th.scale)s.setProperty("--fs",String(th.scale));
  if(th.hscale)s.setProperty("--hs",String(th.hscale));
  if(th.grain===false)root.classList.add("nograin");
  if(th.motion==="calm")root.classList.add("calm");
  if(th.fontLinks&&th.fontLinks.length){var l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?"+th.fontLinks.join("&")+"&display=swap";document.head.appendChild(l)}
}
function applyContent(C){
  var T=(C&&C.text)||{};
  $$("[data-c]").forEach(function(el){
    var k=el.getAttribute("data-c"),t=el.getAttribute("data-t"),v=T[k];if(v==null||v==="")return;
    var lines=String(v).split("\n").map(function(x){return x.trim()}).filter(Boolean);
    if(t==="lines-li"||t==="lines-span"){var tg=t==="lines-li"?"li":"span";el.innerHTML=lines.map(function(x){return "<"+tg+">"+esc(x)+"</"+tg+">"}).join("")}
    else if(t==="marquee"){
      var one=lines.map(function(x){return "<span>"+esc(x)+"</span><i></i>"}).join(""),two=lines.slice().reverse().map(function(x){return "<span>"+esc(x)+"</span><i></i>"}).join("");
      el.innerHTML='<div class="track">'+one+one+'</div><div class="track rev">'+two+two+'</div>';
    }
    else if(t==="intro")introLetters(el,String(v));
    else el.textContent=v;
  });
  applyTheme(C&&C.theme);
}
/* ---------- private vault: password gate and page viewer ---------- */
var CAT=null,SITE={},LEC={levels:{}},lecData={},ownData={},dkeys={},gateTry=null,gateOk=null,keys={},curDoc=null,vdoc=null,vkey=null,vcache={},vio=null,vio2=null,zoom=1;
var enc=new TextEncoder();
function b64(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function deriveKey(pw,w){
  return crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]).then(function(m){
    return crypto.subtle.deriveKey({name:"PBKDF2",salt:b64(w.salt),iterations:w.iter,hash:"SHA-256"},m,{name:"AES-GCM",length:256},false,["decrypt"]);
  });
}
function decryptBuf(key,buf){var u=new Uint8Array(buf);return crypto.subtle.decrypt({name:"AES-GCM",iv:u.slice(0,12)},key,u.slice(12))}
/* every level has a random master key; every document or lecture with its own password has its own key.
   A password only unwraps a key, so passwords can be added or removed without touching the encrypted files. */
function tryWraps(ws,pw){
  var i=0;
  function next(){
    if(i>=ws.length)return Promise.reject(new Error("bad"));
    var w=ws[i++];
    return deriveKey(pw,w).then(function(k){return decryptBuf(k,b64(w.wrap))}).then(function(raw){
      return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["decrypt"]);
    }).catch(next);
  }
  return next();
}
function tryUnlock(level,pw){var g=CAT.groups&&CAT.groups[level];return tryWraps((g&&g.wraps)||[],pw).then(function(k){keys[level]=k;return k})}
function tryDocUnlock(d,pw){return tryWraps(d.wraps||[],pw).then(function(k){dkeys[d.id]=k;return k})}
function docKey(d){return d.mode==="own"?dkeys[d.id]:keys[d.level]}

/* ---------- helpers ---------- */
var PAIRS=[["#1D3A86","#0E5E63"],["#5B2A7A","#1A3C86"],["#0F5A5A","#26307A"],["#7A4A12","#2B3E86"],["#124E70","#6B4A14"],["#2A3F8F","#0B5B58"]];
function pair(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return PAIRS[h%PAIRS.length]}
function fdate(d){if(!d)return"";var x=new Date(d);return isNaN(x)?"":x.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
function btn(url,label,icon,cls){
  return '<a class="btn '+(cls||"")+'"'+(url?' href="'+esc(url)+'" target="_blank" rel="noopener"':' aria-disabled="true"')+'>'+icon+label+'</a>';
}
function docCard(d){
  var meta=[d.pages+" pages",fdate(d.added),d.dl?"Download allowed":""].filter(Boolean).join("  /  ");
  return '<article class="panel doc"><div class="dt"><span class="lockico">'+ICON.lock+'</span><div><div class="meta"><b>'+esc(d.level)+'</b><span>'+esc(d.folder)+'</span>'+(d.mode==="own"?'<em class="own">Own password</em>':'')+'</div><h3>'+esc(d.title)+'</h3></div></div>'+
    '<div class="foot"><span class="fmeta">'+esc(meta)+'</span><button type="button" class="btn primary" data-doc="'+esc(d.id)+'">'+ICON.lock+'Unlock and read</button></div></article>';
}
document.addEventListener("error",function(e){var t=e.target;if(t&&t.tagName==="IMG"&&t.closest&&t.closest(".thumb")){var a=t.closest(".lec");if(a)a.classList.remove("has-img");t.remove()}},true);

function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
function levelSlug(l){return slugify(l)}

var vaultReady=false,gate,viewer;
function ensureVault(){
  if(vaultReady)return; vaultReady=true;
  var wa=SITE.whatsapp?'<p class="gate-foot">Need the password? <a href="'+esc(SITE.whatsapp)+'" target="_blank" rel="noopener">Ask your faculty on WhatsApp</a></p>':'<p class="gate-foot">Need the password? Ask your faculty.</p>';
  document.body.insertAdjacentHTML("beforeend",
  '<div id="gate" class="gate" hidden role="dialog" aria-modal="true" aria-labelledby="gate-title"><form class="gate-card panel" id="gate-form" autocomplete="off">'+
    '<button type="button" class="x" id="gate-x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'+
    '<span class="lockbadge">'+ICON.lock+'</span><h2 id="gate-title">Private library</h2><p class="gate-doc" id="gate-doc"></p>'+
    '<label for="gate-pw">Access password</label><div class="pw"><input id="gate-pw" type="password" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" id="gate-eye">Show</button></div>'+
    '<p class="gate-err" id="gate-err" role="alert"></p><button class="btn primary" id="gate-go" type="submit">'+ICON.lock+'Unlock</button>'+wa+'</form></div>'+
  '<div id="viewer" class="viewer" hidden role="dialog" aria-modal="true" aria-label="Notes viewer"><header class="v-bar"><button type="button" class="v-close" id="v-close">'+ICON.back+'<span>Close</span></button>'+
    '<div class="v-title"><b id="v-title"></b><small id="v-sub"></small></div><div class="v-tools"><span id="v-page" class="v-page-no"></span><button type="button" id="v-dl" class="v-dl" hidden>Download PDF</button><button type="button" id="v-zout" aria-label="Zoom out">&minus;</button><button type="button" id="v-zin" aria-label="Zoom in">+</button></div></header>'+
    '<div class="v-scroll" id="v-scroll"><div class="v-pages" id="v-pages"></div><p class="v-end">Private study material. Please do not share the password or these pages.</p></div></div>');
  gate=$("#gate");viewer=$("#viewer");
  $("#gate-x").addEventListener("click",closeGate);
  gate.addEventListener("pointerdown",function(e){if(e.target===gate)closeGate()});
  $("#gate-eye").addEventListener("click",function(){var i=$("#gate-pw"),s=i.type==="password";i.type=s?"text":"password";this.textContent=s?"Hide":"Show"});
  $("#gate-form").addEventListener("submit",function(e){
    e.preventDefault();
    var pw=$("#gate-pw"),err=$("#gate-err"),go=$("#gate-go");
    if(!pw.value){err.textContent="Please enter the access password.";return}
    if(!(window.crypto&&crypto.subtle)){err.textContent="This browser cannot open private notes. Please use an up-to-date browser.";return}
    go.disabled=true;go.lastChild.nodeValue="Checking";err.textContent="";
    gateTry(pw.value).then(function(){
      pw.value="";closeGate();if(gateOk)gateOk();
    }).catch(function(){
      err.textContent="That password is not correct. Please check it and try again.";
      gate.classList.remove("shake");void gate.offsetWidth;gate.classList.add("shake");pw.select();
    }).then(function(){go.disabled=false;go.lastChild.nodeValue="Unlock"});
  });
  $("#v-close").addEventListener("click",closeViewer);
  $("#v-zin").addEventListener("click",function(){setZoom(zoom+.25)});
  $("#v-dl").addEventListener("click",downloadPdf);
  $("#v-zout").addEventListener("click",function(){setZoom(zoom-.25)});
  viewer.addEventListener("contextmenu",function(e){e.preventDefault()});
  viewer.addEventListener("dragstart",function(e){e.preventDefault()});
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"){if(!viewer.hidden)closeViewer();else if(!gate.hidden)closeGate()}
    if(!viewer.hidden&&(e.ctrlKey||e.metaKey)&&/^[spuac]$/i.test(e.key))e.preventDefault();
  });
}
function askPassword(tryFn,label,ok){
  ensureVault();gateTry=tryFn;gateOk=ok;
  $("#gate-doc").textContent=label;$("#gate-err").textContent="";$("#gate-pw").value="";$("#gate-pw").type="password";$("#gate-eye").textContent="Show";
  gate.classList.remove("shake");gate.hidden=false;root.classList.add("lock");
  setTimeout(function(){$("#gate-pw").focus()},60);
}
function openDoc(id){
  if(!CAT)return;
  var d=CAT.docs.filter(function(x){return x.id===id})[0]; if(!d)return;
  ensureVault(); curDoc=d;
  if(docKey(d)){openViewer(d);return}
  askPassword(function(pw){return d.mode==="own"?tryDocUnlock(d,pw):tryUnlock(d.level,pw)},d.folder+": "+d.title+(d.mode==="own"?" (this document has its own password)":""),function(){openViewer(d)});
}
function closeGate(){if(gate)gate.hidden=true;if(!viewer||viewer.hidden)root.classList.remove("lock")}
function pad3(n){return ("00"+n).slice(-3)}
function arOf(d,i){return Array.isArray(d.ar)?d.ar[i]:d.ar}
function openViewer(d){
  vdoc=d;vkey=docKey(d);vcache={};zoom=1;$("#v-dl").hidden=!d.dl;
  $("#v-title").textContent=d.title;$("#v-sub").textContent=d.folder+" / "+d.pages+" pages";
  var box=$("#v-pages");box.innerHTML="";
  for(var i=1;i<=d.pages;i++){
    var p=document.createElement("div");p.className="v-page";p.dataset.i=i;p.style.aspectRatio=String(arOf(d,i-1));
    p.innerHTML='<canvas></canvas><span class="sp">Loading page '+i+'</span>';box.appendChild(p);
  }
  viewer.hidden=false;gate&&(gate.hidden=true);root.classList.add("lock","viewing");
  $("#v-scroll").scrollTop=0;sizePages();setupObservers();pageNo();
  $("#v-scroll").onscroll=pageNo;
}
function sizePages(){
  var sc=$("#v-scroll"),base=Math.min(sc.clientWidth-24,880);
  $("#v-pages").style.width=Math.round(base*zoom)+"px";
}
function setZoom(z){
  zoom=Math.max(1,Math.min(3,z));sizePages();
  $$(".v-page",viewer).forEach(unloadPage);setupObservers();
}
function setupObservers(){
  if(vio){vio.disconnect();vio2.disconnect()}
  var root_=$("#v-scroll");
  vio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)loadPage(e.target)})},{root:root_,rootMargin:"120% 0px"});
  vio2=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)unloadPage(e.target)})},{root:root_,rootMargin:"400% 0px"});
  $$(".v-page",viewer).forEach(function(p){vio.observe(p);vio2.observe(p)});
}
function unloadPage(el){if(!el._on)return;var c=el.firstChild;c.width=0;c.height=0;el._on=false;el.classList.remove("ready")}
function loadPage(el){
  if(el._busy||el._on)return;el._busy=true;
  var i=+el.dataset.i,d=vdoc,key=vkey;
  var src=vcache[i]?Promise.resolve(vcache[i]):fetch("vault/"+d.id+"/"+pad3(i)+".txt").then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(t){return decryptBuf(key,b64(t.trim()))}).then(function(buf){vcache[i]=buf;return buf});
  src.then(function(buf){return createImageBitmap(new Blob([buf],{type:"image/jpeg"}))}).then(function(bm){
    if(d!==vdoc||viewer.hidden){bm.close&&bm.close();return}
    var cv=el.firstChild,w=Math.min(bm.width,Math.max(700,Math.round(el.clientWidth*Math.min(window.devicePixelRatio||1,2.5))));
    cv.width=w;cv.height=Math.round(w*bm.height/bm.width);
    var c=cv.getContext("2d");c.drawImage(bm,0,0,cv.width,cv.height);bm.close&&bm.close();
    stamp(c,cv.width,cv.height);el._on=true;el.classList.add("ready");
  }).catch(function(){el.querySelector(".sp").textContent="This page could not be loaded."}).then(function(){el._busy=false});
}
function stamp(c,w,h){
  var t="CS Vijay Makhija  \u00b7  Private notes";
  var fs=Math.round(w*.03);
  c.save();c.globalAlpha=.12;c.fillStyle="#16224f";c.font="600 "+fs+"px 'Instrument Sans',Arial,sans-serif";c.textBaseline="middle";
  c.translate(w/2,h/2);c.rotate(-Math.PI/7);
  var step=fs*6,tw=c.measureText(t).width+fs*4,row=0;
  for(var y=-h;y<h;y+=step,row++){for(var x=-w*1.3+(row%2?tw/2:0);x<w*1.3;x+=tw)c.fillText(t,x,y)}
  c.restore();
}
/* ---- optional PDF download (only for documents the faculty has allowed) ---- */
function buildPdf(pg){
  var te=new TextEncoder(),chunks=[],off=0,xref=[];
  function put(x){var u=typeof x==="string"?te.encode(x):x;chunks.push(u);off+=u.length}
  function obj(n,body){xref[n]=off;put(n+" 0 obj\n"+body+"\nendobj\n")}
  put("%PDF-1.4\n");
  var N=pg.length,kids=[];
  for(var k=0;k<N;k++)kids.push((3+3*k)+" 0 R");
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
  obj(2,"<< /Type /Pages /Count "+N+" /Kids ["+kids.join(" ")+"] >>");
  pg.forEach(function(p,k){
    var W=595.28,H=+(W*p.h/p.w).toFixed(2),a=3+3*k,c=a+1,im=a+2,cs="q "+W+" 0 0 "+H+" 0 0 cm /Im0 Do Q";
    obj(a,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+W+" "+H+"] /Resources << /XObject << /Im0 "+im+" 0 R >> >> /Contents "+c+" 0 R >>");
    obj(c,"<< /Length "+cs.length+" >>\nstream\n"+cs+"\nendstream");
    xref[im]=off;put(im+" 0 obj\n<< /Type /XObject /Subtype /Image /Width "+p.w+" /Height "+p.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+p.jpg.length+" >>\nstream\n");
    put(p.jpg);put("\nendstream\nendobj\n");
  });
  var xr=off,total=3*N+3,t="xref\n0 "+total+"\n0000000000 65535 f \n";
  for(var n=1;n<total;n++)t+=("0000000000"+xref[n]).slice(-10)+" 00000 n \n";
  put(t+"trailer\n<< /Size "+total+" /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF");
  return new Blob(chunks,{type:"application/pdf"});
}
function downloadPdf(){
  var d=vdoc,key=vkey,b=$("#v-dl");if(!d||!d.dl||!key||b.disabled)return;
  var label=b.textContent,parts=[],i=0;b.disabled=true;
  function step(){
    if(i>=d.pages)return Promise.resolve();
    var n=++i;b.textContent="Preparing "+n+" / "+d.pages;
    var src=vcache[n]?Promise.resolve(vcache[n]):fetch("vault/"+d.id+"/"+pad3(n)+".txt").then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(t){return decryptBuf(key,b64(t.trim()))});
    return src.then(function(buf){return createImageBitmap(new Blob([buf],{type:"image/jpeg"}))}).then(function(bm){
      var cv=document.createElement("canvas");cv.width=bm.width;cv.height=bm.height;var c=cv.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,cv.width,cv.height);c.drawImage(bm,0,0);bm.close&&bm.close();stamp(c,cv.width,cv.height);
      return new Promise(function(res){cv.toBlob(res,"image/jpeg",.88)}).then(function(bl){return bl.arrayBuffer()}).then(function(ab){parts.push({jpg:new Uint8Array(ab),w:cv.width,h:cv.height});cv.width=cv.height=0});
    }).then(step);
  }
  step().then(function(){
    var u=URL.createObjectURL(buildPdf(parts)),a=document.createElement("a");a.href=u;a.download=(slugify(d.title)||"notes")+".pdf";document.body.appendChild(a);a.click();
    setTimeout(function(){a.remove();URL.revokeObjectURL(u)},4000);
  }).catch(function(){alert("The PDF could not be prepared. Please try again.")}).then(function(){b.disabled=false;b.textContent=label});
}
function pageNo(){
  var sc=$("#v-scroll"),mid=sc.getBoundingClientRect().top+sc.clientHeight*.4,cur=1;
  $$(".v-page",viewer).some(function(p){var r=p.getBoundingClientRect();if(r.bottom>mid){cur=+p.dataset.i;return true}});
  $("#v-page").textContent=cur+" / "+vdoc.pages;
}
function closeViewer(){
  viewer.hidden=true;root.classList.remove("lock","viewing");
  if(vio){vio.disconnect();vio2.disconnect();vio=vio2=null}
  $("#v-pages").innerHTML="";vcache={};vdoc=null;vkey=null;
}
document.addEventListener("click",function(e){var b=e.target.closest("[data-doc]");if(b)openDoc(b.dataset.doc)});


/* ---------- notes explorer: levels > folders > documents ---------- */
function folderCard(f,docsIn,showLevel){
  var n=docsIn.length,soon=!n;
  return '<a class="panel folder'+(soon?' soon':'')+'" href="#'+levelSlug(f.level)+'--'+slugify(f.name)+'"><span class="fi">'+ICON.folder+'</span>'+
    '<div>'+(showLevel?'<span class="fl">'+esc(f.level)+'</span>':'')+'<h4>'+esc(f.name)+'</h4></div>'+
    '<div class="fm"><span>'+(soon?'Coming soon':n+(n===1?' document':' documents'))+'</span>'+(soon?'':'<span class="lk">'+ICON.lock+'Private</span>')+'</div></a>';
}
function drawExplorer(box,chipsBox,countEl){
  var folders=CAT.folders||[],docs=CAT.docs||[];
  var levels=[];folders.forEach(function(f){if(levels.indexOf(f.level)<0)levels.push(f.level)});
  var h=(location.hash||"").slice(1).toLowerCase(),parts=h.split("--"),level=levels.filter(function(l){return levelSlug(l)===parts[0]})[0]||null,
      folder=null;
  if(level&&parts[1])folder=folders.filter(function(f){return f.level===level&&slugify(f.name)===parts[1]})[0]||null;
  var q=($("#q").value||"").trim().toLowerCase();
  chipsBox.innerHTML=["All"].concat(levels).map(function(l){return '<a class="chip" href="'+(l==="All"?'#all':'#'+levelSlug(l))+'" data-l="'+esc(l)+'" aria-pressed="'+((l==="All"&&!level)||l===level)+'">'+esc(l)+'</a>'}).join("");
  var inF=function(f){return docs.filter(function(d){return d.level===f.level&&d.folder===f.name})};
  var html="",count="";
  if(q){
    var rd=docs.filter(function(d){return (!level||d.level===level)&&(d.title+" "+d.folder+" "+d.level).toLowerCase().indexOf(q)>-1});
    var rf=folders.filter(function(f){return (!level||f.level===level)&&f.name.toLowerCase().indexOf(q)>-1});
    count=rd.length+(rd.length===1?" document":" documents")+" and "+rf.length+(rf.length===1?" folder":" folders");
    html=(rf.length?'<div class="folders sp-b">'+rf.map(function(f){return folderCard(f,inF(f),true)}).join("")+'</div>':'')+
         (rd.length?'<div class="docs">'+rd.map(docCard).join("")+'</div>':'')+
         (!rd.length&&!rf.length?'<div class="panel empty">Nothing matches your search. Try a statute name such as "Partnership".</div>':'');
  }else if(folder){
    var fd=inF(folder);
    count=fd.length+(fd.length===1?" document":" documents");
    html='<nav class="crumbs" aria-label="Breadcrumb"><a href="#all">Notes</a><i></i><a href="#'+levelSlug(level)+'">'+esc(level)+'</a><i></i><b>'+esc(folder.name)+'</b></nav>'+
      (fd.length?'<div class="docs">'+fd.map(docCard).join("")+'</div>':'<div class="panel empty">No notes in this folder yet. New documents appear here as soon as they are published.</div>');
  }else if(level){
    var lf=folders.filter(function(f){return f.level===level});
    count=lf.length+" folders";
    html='<nav class="crumbs" aria-label="Breadcrumb"><a href="#all">Notes</a><i></i><b>'+esc(level)+'</b></nav><div class="folders">'+lf.map(function(f){return folderCard(f,inF(f),false)}).join("")+'</div>';
  }else{
    count=docs.length+(docs.length===1?" document":" documents")+" in "+folders.length+" folders";
    html=levels.map(function(l){
      var lf=folders.filter(function(f){return f.level===l}),nd=docs.filter(function(d){return d.level===l}).length;
      return '<div class="level-block"><h3><a href="#'+levelSlug(l)+'">'+esc(l)+'</a><small>'+nd+(nd===1?' document':' documents')+'</small></h3><div class="folders">'+lf.map(function(f){return folderCard(f,inF(f),false)}).join("")+'</div></div>';
    }).join("");
  }
  box.innerHTML=html;if(countEl)countEl.textContent=count;
}


function main(C,cat){
/* ---------- entrance and intro ---------- */
/* word-by-word headline split (before reveal observers start) */
$$(".sec-head h2,.page-head h1,.band h2,.about h2").forEach(function(h){
  var txt=h.textContent.trim(),words=txt.split(/\s+/);
  h.setAttribute("aria-label",txt);
  h.innerHTML=words.map(function(w,i){return '<span class="w" aria-hidden="true"><i style="--k:'+i+'">'+esc(w)+'</i></span>'}).join(" ");
  h.classList.add("split"); h.classList.remove("rise");
});
var io=null,started=false;
function reveal(el){
  if(el.classList.contains("in"))return;
  el.classList.add("in");
  if(el.classList.contains("rise"))setTimeout(function(){el.classList.remove("rise")},2600);
}
function go(){
  if(started)return; started=true; root.classList.add("go");
  var els=$$(".rise,.split");
  if(!("IntersectionObserver" in window)){els.forEach(reveal);return}
  io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){reveal(e.target);io.unobserve(e.target)}})},{threshold:.12,rootMargin:"0px 0px -6% 0px"});
  els.forEach(function(e){io.observe(e)});
}
setTimeout(go,7000);
/* scroll progress */
var pb=document.createElement("div");pb.id="progress";document.body.appendChild(pb);
function prog(){var h=root.scrollHeight-innerHeight;pb.style.transform="scaleX("+(h>0?Math.min(1,scrollY/h):0)+")"}
addEventListener("scroll",prog,{passive:true});prog();
var intro=$("#intro");
if(intro&&C.theme&&C.theme.intro===false){intro.parentNode.removeChild(intro);intro=null}
function finishIntro(){
  if(!intro)return;
  intro.classList.add("out");
  setTimeout(go,520);
  setTimeout(function(){if(intro&&intro.parentNode)intro.parentNode.removeChild(intro);intro=null;root.classList.remove("lock")},1150);
}
if(intro){
  var skipIntro=reduce;
  try{ if(document.referrer && document.referrer.indexOf(location.origin)===0) skipIntro=true; }catch(e){}
  if(skipIntro){intro.parentNode.removeChild(intro);intro=null;requestAnimationFrame(function(){requestAnimationFrame(go)})}
  else{
    root.classList.add("lock");
    var t=setTimeout(finishIntro,3400);
    var sk=$(".skip",intro);
    if(sk)sk.addEventListener("click",function(){clearTimeout(t);finishIntro()});
  }
}else{requestAnimationFrame(function(){requestAnimationFrame(go)})}

/* ---------- nav ---------- */
var burger=$("#burger"),links=$("#links");
if(burger&&links){
  burger.addEventListener("click",function(){var o=links.classList.toggle("open");burger.setAttribute("aria-expanded",String(o))});
  document.addEventListener("click",function(e){if(!e.target.closest(".bar")){links.classList.remove("open");burger.setAttribute("aria-expanded","false")}});
}

/* ---------- parallax light, card tilt, magnetic buttons ---------- */
var fine=window.matchMedia&&window.matchMedia("(hover:hover)").matches&&!reduce&&!root.classList.contains("calm");
if(fine){
  document.addEventListener("pointermove",function(e){root.style.setProperty("--px",(e.clientX/innerWidth-.5).toFixed(3));root.style.setProperty("--py",(e.clientY/innerHeight-.5).toFixed(3))});
  var TILT=".portal,.note,.doc,.folder,.lec,.level,.soc,.step";
  document.addEventListener("pointermove",function(e){
    var c=e.target.closest&&e.target.closest(TILT); if(!c)return;
    var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.style.transform="perspective(900px) rotateX("+(-y*5).toFixed(2)+"deg) rotateY("+(x*6).toFixed(2)+"deg) translateY(-4px)";
  });
  document.addEventListener("pointerout",function(e){var c=e.target.closest&&e.target.closest(TILT);if(c&&!c.contains(e.relatedTarget))c.style.transform=""});
  document.addEventListener("pointermove",function(e){
    var b=e.target.closest&&e.target.closest(".btn.primary"); if(!b)return;
    var r=b.getBoundingClientRect();b.style.transform="translate("+((e.clientX-r.left-r.width/2)*.16).toFixed(1)+"px,"+((e.clientY-r.top-r.height/2)*.28).toFixed(1)+"px)";
  });
  document.addEventListener("pointerout",function(e){var b=e.target.closest&&e.target.closest(".btn.primary");if(b&&!b.contains(e.relatedTarget))b.style.transform=""});
}
function countTo(el,n){
  if(reduce||!n){el.textContent=n;return}
  var t0=performance.now();(function f(t){var p=Math.min(1,(t-t0)/1000);el.textContent=Math.round(n*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(t0);
}

/* ---------- glass spotlight and hero tilt ---------- */
document.addEventListener("pointermove",function(e){
  var p=e.target.closest&&e.target.closest(".panel"); if(!p)return;
  var r=p.getBoundingClientRect(); p.style.setProperty("--mx",(e.clientX-r.left)+"px"); p.style.setProperty("--my",(e.clientY-r.top)+"px");
});
var stage=$(".stage"),tilt=$(".tilt");
if(stage&&tilt&&fine){
  stage.addEventListener("pointermove",function(e){
    var r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    tilt.style.transform="rotateY("+(x*9)+"deg) rotateX("+(-y*7)+"deg)";
  });
  stage.addEventListener("pointerleave",function(){tilt.style.transform=""});
}

/* ---------- Section 10 card: the six essentials tick off, then the result confirms ---------- */
var items=$$(".sec10 li");
if(items.length){
  var seal=$("#seal"),result=$("#s10result"),bar=$("#s10bar");
  var finish=function(){items.forEach(function(i){i.classList.add("on")});if(bar)bar.style.width="100%";if(seal)seal.classList.add("on");if(result)result.classList.add("in")};
  if(reduce){finish()}
  else{
    var start=intro?4300:1300;
    items.forEach(function(li,i){setTimeout(function(){li.classList.add("on");if(bar)bar.style.width=Math.round((i+1)/items.length*100)+"%"},start+i*560)});
    setTimeout(function(){if(seal)seal.classList.add("on");if(result)result.classList.add("in")},start+items.length*560+250);
  }
}

/* ---------- private lectures ---------- */
function ytId(v){var m=String(v||"").match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);return m?m[1]:(/^[\w-]{11}$/.test(v||"")?v:"")}
function lecCount(level){var x=LEC.levels&&LEC.levels[level];return x?(x.count||0):0}
function ownList(level){return (LEC.own||[]).filter(function(x){return x.level===level})}
function lecTotal(){return Object.keys(LEC.levels||{}).reduce(function(n,k){return n+lecCount(k)},0)+(LEC.own||[]).length}
function decryptLectures(level){
  if(lecData[level])return Promise.resolve(lecData[level]);
  var x=LEC.levels[level];if(!x||!x.data)return Promise.resolve([]);
  return decryptBuf(keys[level],b64(x.data)).then(function(buf){var a=JSON.parse(new TextDecoder().decode(buf));lecData[level]=a;return a});
}
/* a lecture with its own password: public title, encrypted video link */
function unlockOwn(l,pw){
  return tryWraps(l.wraps||[],pw).then(function(k){return decryptBuf(k,b64(l.data))}).then(function(buf){ownData[l.id]=JSON.parse(new TextDecoder().decode(buf))});
}
function lecCard2(l,level){
  var id=ytId(l.yt),c=pair(l.title||"");
  return '<button type="button" class="panel lec has-img" data-play="'+esc(level)+'|'+esc(l.id)+'"><div class="thumb" style="--c1:'+c[0]+';--c2:'+c[1]+'">'+(id?'<img src="https://i.ytimg.com/vi/'+esc(id)+'/hqdefault.jpg" alt="" loading="lazy">':'')+'<span class="play">'+ICON.play+'</span><span class="t">'+esc(l.title)+'</span></div>'+
    '<div class="info"><b>'+esc(l.title)+'</b><span>'+esc(l.subject||level)+(l.date?'  /  '+esc(fdate(l.date)):'')+'</span></div></button>';
}
function lecCardLocked(l){
  var c=pair(l.title||"");
  return '<button type="button" class="panel lec" data-lec-own="'+esc(l.id)+'"><div class="thumb" style="--c1:'+c[0]+';--c2:'+c[1]+'"><span class="play lockplay">'+ICON.lock+'</span><span class="t">'+esc(l.title)+'</span></div>'+
    '<div class="info"><b>'+esc(l.title)+'</b><span>'+esc(l.subject||l.level)+(l.date?'  /  '+esc(fdate(l.date)):'')+'  /  Own password</span></div></button>';
}
var player=null;
function ensurePlayer(){
  if(player)return;
  document.body.insertAdjacentHTML("beforeend",'<div id="player" class="viewer pl" hidden role="dialog" aria-modal="true" aria-label="Lecture player"><header class="v-bar"><button type="button" class="v-close" id="pl-close">'+ICON.back+'<span>Close</span></button><div class="v-title"><b id="pl-title"></b><small id="pl-sub"></small></div></header><div class="pl-body"><div class="pl-frame" id="pl-frame"></div><p class="pl-desc" id="pl-desc"></p><p class="v-end">Private lecture. Please do not share the password or the lecture.</p></div></div>');
  player=$("#player");
  $("#pl-close").addEventListener("click",closePlayer);
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&player&&!player.hidden)closePlayer()});
  player.addEventListener("contextmenu",function(e){e.preventDefault()});
}
function closePlayer(){if(!player)return;player.hidden=true;$("#pl-frame").innerHTML="";root.classList.remove("lock","viewing")}
function findLecture(level,id){
  var l=(lecData[level]||[]).filter(function(x){return x.id===id})[0];if(l)return l;
  var o=(LEC.own||[]).filter(function(x){return x.id===id})[0];
  return o&&ownData[id]?{id:o.id,title:o.title,subject:o.subject,date:o.date,yt:ownData[id].yt,desc:ownData[id].desc}:null;
}
function openPlayer(level,id){
  var l=findLecture(level,id);if(!l)return;
  var v=ytId(l.yt);if(!v)return;ensurePlayer();
  $("#pl-title").textContent=l.title;$("#pl-sub").textContent=(l.subject||level)+(l.date?" / "+fdate(l.date):"");$("#pl-desc").textContent=l.desc||"";
  $("#pl-frame").innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(v)+'?rel=0&modestbranding=1&playsinline=1" title="'+esc(l.title)+'" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  player.hidden=false;root.classList.add("lock","viewing");
}
document.addEventListener("click",function(e){
  var p=e.target.closest("[data-play]");if(p){var a=p.dataset.play.split("|");openPlayer(a[0],a[1]);return}
  var u=e.target.closest("[data-lec-unlock]");
  if(u){var lv=u.dataset.lecUnlock;askPassword(function(pw){return tryUnlock(lv,pw)},lv+" lectures",function(){decryptLectures(lv).then(function(){drawLectures()})});return}
  var o=e.target.closest("[data-lec-own]");
  if(o){var l=(LEC.own||[]).filter(function(x){return x.id===o.dataset.lecOwn})[0];if(l)askPassword(function(pw){return unlockOwn(l,pw)},l.title+" (this lecture has its own password)",function(){drawLectures();openPlayer(l.level,l.id)})}
});
var lecSubject={};
function lecLevels(){
  var out=[];(CAT.folders||[]).forEach(function(f){if(out.indexOf(f.level)<0)out.push(f.level)});
  Object.keys(LEC.levels||{}).forEach(function(k){if(out.indexOf(k)<0)out.push(k)});
  (LEC.own||[]).forEach(function(x){if(out.indexOf(x.level)<0)out.push(x.level)});
  return out;
}
function drawLectures(){
  var box=$("#lec-root");if(!box)return;
  var h=(location.hash||"").slice(1).toLowerCase(),want=lecLevels().filter(function(l){return levelSlug(l)===h})[0]||null;
  var lv=lecLevels().filter(function(l){return !want||l===want});
  var total=lecTotal();
  var chips='<div class="tools"><div class="chips" role="group" aria-label="Filter by level">'+['All'].concat(lecLevels()).map(function(l){return '<a class="chip" href="'+(l==="All"?'#all':'#'+levelSlug(l))+'" aria-pressed="'+((l==="All"&&!want)||l===want)+'">'+esc(l)+'</a>'}).join("")+'</div></div>';
  if(!total){box.innerHTML='<div class="panel empty">Lectures will be published here soon.</div>';return}
  box.innerHTML=chips+lv.map(function(l){
    var n=lecCount(l),own=ownList(l);
    if(!n&&!own.length)return '<div class="level-block"><h3>'+esc(l)+'<small>Coming soon</small></h3><div class="panel empty">No lectures for this level yet.</div></div>';
    var items=[],lock="";
    if(n&&!lecData[l])lock='<div class="panel lockcard"><span class="lockbadge">'+ICON.lock+'</span><div><b>Private lectures</b><span>Enter the level access password to watch the '+esc(l)+' lectures.</span></div><button type="button" class="btn primary" data-lec-unlock="'+esc(l)+'">'+ICON.lock+'Unlock lectures</button></div>';
    if(lecData[l])lecData[l].forEach(function(x){items.push({l:x,locked:false})});
    own.forEach(function(x){items.push({l:x,locked:!ownData[x.id]})});
    items.sort(function(a,b){return (b.l.date||"")<(a.l.date||"")?-1:1});
    var subs=[];items.forEach(function(x){var s=x.l.subject||"General";if(subs.indexOf(s)<0)subs.push(s)});
    var cur=lecSubject[l]||"All";if(cur!=="All"&&subs.indexOf(cur)<0)cur="All";
    var shown=items.filter(function(x){return cur==="All"||(x.l.subject||"General")===cur});
    var count=n+own.length;
    return '<div class="level-block"><h3>'+esc(l)+'<small>'+count+(count===1?' lecture':' lectures')+'</small></h3>'+lock+
      (subs.length>1?'<div class="chips sub" role="group">'+['All'].concat(subs).map(function(s){return '<button type="button" class="chip" data-lsub="'+esc(l)+'|'+esc(s)+'" aria-pressed="'+(s===cur)+'">'+esc(s)+'</button>'}).join("")+'</div>':'')+
      (shown.length?'<div class="lectures"'+(lock?' style="margin-top:16px"':'')+'>'+shown.map(function(x){return x.locked?lecCardLocked(x.l):lecCard2(x.l,l)}).join("")+'</div>':'')+'</div>';
  }).join("");
}
document.addEventListener("click",function(e){var b=e.target.closest("[data-lsub]");if(!b)return;var a=b.dataset.lsub.split("|");lecSubject[a[0]]=a[1];drawLectures()});

/* ---------- data-driven rendering ---------- */
function render(C,cat){
  CAT=cat&&cat.docs?cat:{groups:{},folders:[],docs:[]};
  var S=C.links||{};SITE=S;
  var notes=CAT.docs.slice().sort(function(a,b){return (b.added||"")<(a.added||"")?-1:1});
  var wa=S.whatsapp;
  /* links */
  $$(".tg-btn").forEach(function(a){if(S.telegram){a.href=S.telegram;a.target="_blank";a.rel="noopener";a.removeAttribute("aria-disabled")}});
  $$("[data-count=notes]").forEach(function(e){countTo(e,notes.length)});
  $$("[data-count=lectures]").forEach(function(e){countTo(e,lecTotal())});
  $$("[data-updated]").forEach(function(e){var d=fdate(C.updated);e.textContent=d?"Library updated "+d:""});

  /* home: latest */
  var ln=$("#latest-notes"); if(ln)ln.innerHTML=notes.length?notes.slice(0,3).map(docCard).join(""):'<div class="panel empty">New notes will appear here as soon as they are published.</div>';
  var ll=$("#latest-lectures");
  if(ll){var tl=lecTotal();ll.innerHTML=tl?'<div class="panel lockcard wide"><span class="lockbadge">'+ICON.lock+'</span><div><b>'+tl+(tl===1?' private lecture':' private lectures')+'</b><span>Lectures are available to enrolled students. Open the lectures page and enter your access password.</span></div><a class="btn primary" href="lectures.html">Open lectures</a></div>':'<div class="panel empty">New lectures will appear here as soon as they are published.</div>'}

  /* notes page */
  var ng=$("#notes-grid");
  if(ng){
    var cnt0=$("#result-count"),chipsBox=$("#chips");
    var redraw=function(){drawExplorer(ng,chipsBox,cnt0)};
    window.addEventListener("hashchange",redraw);
    $("#q").addEventListener("input",redraw);
    redraw();
  }

  /* lectures page */
  if($("#lec-root")){window.addEventListener("hashchange",drawLectures);drawLectures()}

  /* contact: social tiles */
  var soc=$("#social");
  if(soc){
    var defs=[["telegram","Telegram",S.telegram_label||"Practice questions and announcements","tg",S.telegram],["youtube","YouTube",S.youtube_label||"Channel",
      "yt",S.youtube],["instagram","Instagram",S.instagram_label||"Updates and reels","ig",S.instagram],["whatsapp","WhatsApp",S.whatsapp_label||"Doubts and queries","wa",S.whatsapp],["email","Email",S.email_label||S.email||"Write to us","mail",S.email?"mailto:"+S.email:""]];
    soc.innerHTML=defs.map(function(d){
      var u=d[4];if(!u&&d[0]!=="telegram")return"";
      return '<a class="panel soc"'+(u?' href="'+esc(u)+'"'+(u.indexOf("mailto:")===0?'':' target="_blank" rel="noopener"'):' aria-disabled="true"')+'><span class="ico">'+ICON[d[3]]+'</span><div><b>'+d[1]+'</b><span>'+(u?esc(d[2]):'Link coming soon')+'</span></div></a>';
    }).join("");
  }

  /* about photo */
  if($("#portrait")&&C.photo){var f=$("#portrait"),im=document.createElement("img");im.alt="";im.src=C.photo;f.classList.add("cutout");f.insertBefore(im,f.firstChild);var ini=$("#ini");if(ini)ini.style.display="none"}
}
function fail(){
  ["#notes-grid","#lec-root","#latest-notes","#latest-lectures"].forEach(function(s){var e=$(s);if(e)e.innerHTML='<div class="panel empty">The library could not be loaded. Please refresh the page.</div>'});
}
ensureCredit();
render(C,cat);
if(!cat)fail();
}
function getJSON(u){return fetch(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw 0;return r.json()})}
var booted=false;
function boot(a){
  if(booted)return;booted=true;
  var C=a[0]||{},cat=a[1];
  try{applyContent(C);LEC=a[2]&&a[2].levels?a[2]:{levels:{}};main(C,cat)}catch(err){console.error(err);root.classList.remove("anim");booted=true}
}
root.classList.add("anim");
Promise.all([getJSON("content.json").catch(function(){return {}}),getJSON("catalog.json").catch(function(){return null}),getJSON("lectures.json").catch(function(){return {levels:{}}})]).then(boot);
setTimeout(function(){boot([{},null,{levels:{}}])},5000);
})();
