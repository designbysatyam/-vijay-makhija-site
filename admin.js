/* Admin panel for the website. Runs entirely in the browser and saves to the GitHub repository. */
(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var enc=new TextEncoder(),dec=new TextDecoder();
function b64e(u){var s="";for(var i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
function b64d(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function rnd(n){return crypto.getRandomValues(new Uint8Array(n))}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
var ITER=600000,LS="vm_admin_cfg_v1";
var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};

/* ---------------- crypto ---------------- */
function kdf(pw,salt,iter,use){return crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]).then(function(m){return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:iter,hash:"SHA-256"},m,{name:"AES-GCM",length:256},false,use)})}
function seal(key,u8){var iv=rnd(12);return crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,u8).then(function(ct){var o=new Uint8Array(12+ct.byteLength);o.set(iv);o.set(new Uint8Array(ct),12);return o})}
function openBox(key,u8){return crypto.subtle.decrypt({name:"AES-GCM",iv:u8.slice(0,12)},key,u8.slice(12)).then(function(b){return new Uint8Array(b)})}
function sha6(buf){return crypto.subtle.digest("SHA-256",buf).then(function(d){return Array.from(new Uint8Array(d)).slice(0,3).map(function(x){return ("0"+x.toString(16)).slice(-2)}).join("")})}

/* ---------------- state ---------------- */
var cfg=null,tok=null;                       // connection
var content=null,schema=[],catalog=null,lectures=null; // site data
var staged={},changes=[],dirty={content:false,catalog:false,lectures:false},lecDirty={};
var publishedIds={},masters={},lecPlain={},ownKeys={};
var ui={tab:"overview",level:null,filter:"",queue:[],open:{}};
var app=$("#app");

var DEFAULT_THEME={bg:"#050713",amber:"#FFC24B",amber2:"#FFE29A",teal:"#46E0CC",blue:"#6F86FF",violet:"#8B5CFF",g1:"#2A45FF",g2:"#8B3BFF",g3:"#C47A14",
  display:"Bricolage Grotesque",body:"Instrument Sans",scale:1,hscale:1,grain:true,motion:"full",intro:true};
var FONTS={display:[
  ["Bricolage Grotesque","family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800"],
  ["Plus Jakarta Sans","family=Plus+Jakarta+Sans:wght@500;600;700;800"],["Sora","family=Sora:wght@500;600;700;800"],["Outfit","family=Outfit:wght@500;600;700;800"],
  ["Manrope","family=Manrope:wght@500;600;700;800"],["Space Grotesk","family=Space+Grotesk:wght@500;600;700"],["Playfair Display","family=Playfair+Display:wght@500;600;700;800"],
  ["Fraunces","family=Fraunces:wght@500;600;700;800"],["DM Serif Display","family=DM+Serif+Display"],["Cormorant Garamond","family=Cormorant+Garamond:wght@500;600;700"]],
 body:[["Instrument Sans","family=Instrument+Sans:wght@400;500;600"],["Inter","family=Inter:wght@400;500;600"],["DM Sans","family=DM+Sans:wght@400;500;600"],
  ["Manrope","family=Manrope:wght@400;500;600"],["Plus Jakarta Sans","family=Plus+Jakarta+Sans:wght@400;500;600"],["Source Sans 3","family=Source+Sans+3:wght@400;500;600"],["Lora","family=Lora:wght@400;500;600"]]};
var LINKS=[["telegram","Telegram channel link","https://t.me/yourchannel","Telegram tile text"],["youtube","YouTube channel link","https://www.youtube.com/@yourchannel","YouTube tile text"],
  ["instagram","Instagram link","https://www.instagram.com/yourpage","Instagram tile text"],["whatsapp","WhatsApp link","https://wa.me/919999999999","WhatsApp tile text"],["email","Email address","name@example.com","Email tile text"]];

/* ---------------- GitHub ---------------- */
function api(){return (cfg.api||"https://api.github.com").replace(/\/$/,"")}
function gh(method,path,body,raw){
  return fetch(api()+"/repos/"+cfg.repo+path,{method:method,cache:"no-store",headers:Object.assign({Authorization:"Bearer "+tok,Accept:raw?"application/vnd.github.raw+json":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},body?{"Content-Type":"application/json"}:{}),body:body?JSON.stringify(body):undefined}).then(function(r){
    if(r.status===404&&raw)return null;
    if(!r.ok)return r.text().then(function(t){var m="";try{m=JSON.parse(t).message}catch(e){m=t.slice(0,160)}var e=new Error(r.status===401?"GitHub rejected the access token. Open Security and add a new token.":r.status===403?"GitHub refused the request ("+(m||"permission or rate limit")+").":"GitHub error "+r.status+": "+m);e.status=r.status;throw e});
    return raw?r.text():r.json();
  });
}
function readText(p){return gh("GET","/contents/"+p.split("/").map(encodeURIComponent).join("/")+"?ref="+encodeURIComponent(cfg.branch),null,true)}
function pool(items,n,fn){var i=0,errs=null;return new Promise(function(res,rej){var run=0;function next(){if(errs)return;if(i>=items.length){if(!run)res();return}var it=items[i++];run++;fn(it).then(function(){run--;next()},function(e){errs=e;rej(e)})}for(var k=0;k<n;k++)next();if(!items.length)res()})}
function commitAll(list,msg,onp){
  var head,baseTree,tree=[],done=0;
  return gh("GET","/git/ref/heads/"+cfg.branch).then(function(r){head=r.object.sha;return gh("GET","/git/commits/"+head)}).then(function(c){baseTree=c.tree.sha;
    return pool(list,4,function(ch){
      if(ch.del){tree.push({path:ch.path,mode:"100644",type:"blob",sha:null});onp&&onp(++done,list.length);return Promise.resolve()}
      return gh("POST","/git/blobs",ch.b64!=null?{content:ch.b64,encoding:"base64"}:{content:ch.text,encoding:"utf-8"}).then(function(b){tree.push({path:ch.path,mode:"100644",type:"blob",sha:b.sha});onp&&onp(++done,list.length)});
    });
  }).then(function(){return gh("POST","/git/trees",{base_tree:baseTree,tree:tree})}).then(function(t){return gh("POST","/git/commits",{message:msg,tree:t.sha,parents:[head]})}).then(function(nc){return gh("PATCH","/git/refs/heads/"+cfg.branch,{sha:nc.sha})});
}

/* ---------------- small UI helpers ---------------- */
function toast(msg,kind,ms){var t=document.createElement("div");t.className="a-toast "+(kind||"");t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove()},ms||4200)}
function modal(html){
  var m=document.createElement("div");m.className="a-modal";m.innerHTML='<div class="a-card panel" role="dialog" aria-modal="true">'+html+'</div>';document.body.appendChild(m);
  var o={el:m,close:function(){m.remove()}};return o;
}
function ask(opts){ /* {title,text,fields:[{id,label,type,value,placeholder,options}],ok,danger} -> Promise(values|null) */
  return new Promise(function(res){
    var f=(opts.fields||[]).map(function(x){
      var inp=x.type==="select"?'<select id="m-'+x.id+'">'+x.options.map(function(o){return '<option value="'+esc(o)+'"'+(o===x.value?' selected':'')+'>'+esc(o)+'</option>'}).join("")+'</select>':
        x.type==="textarea"?'<textarea id="m-'+x.id+'" placeholder="'+esc(x.placeholder||"")+'">'+esc(x.value||"")+'</textarea>':
        '<input id="m-'+x.id+'" type="'+(x.type||"text")+'" value="'+esc(x.value||"")+'" placeholder="'+esc(x.placeholder||"")+'" autocomplete="off">';
      return '<div class="a-field"><label for="m-'+x.id+'">'+esc(x.label)+'</label>'+inp+(x.hint?'<small>'+esc(x.hint)+'</small>':'')+'</div>'}).join("");
    var m=modal('<h1 style="font-size:26px">'+esc(opts.title)+'</h1>'+(opts.text?'<p>'+opts.text+'</p>':'')+f+'<p class="a-err" id="m-err"></p><div class="a-row" style="border:0;background:none;padding:0;justify-content:flex-end"><button class="a-btn" id="m-cancel" type="button">Cancel</button><button class="a-btn '+(opts.danger?'dan':'pri')+'" id="m-ok" type="button">'+esc(opts.ok||"Save")+'</button></div>');
    var first=$("input,select,textarea",m.el);if(first)setTimeout(function(){first.focus()},40);
    function submit(){var v={};(opts.fields||[]).forEach(function(x){v[x.id]=$("#m-"+x.id,m.el).value});
      var er=opts.validate?opts.validate(v):"";if(er){$("#m-err",m.el).textContent=er;return}m.close();res(v)}
    $("#m-ok",m.el).onclick=submit;$("#m-cancel",m.el).onclick=function(){m.close();res(null)};
    m.el.addEventListener("keydown",function(e){if(e.key==="Enter"&&e.target.tagName!=="TEXTAREA"){e.preventDefault();submit()}if(e.key==="Escape"){m.close();res(null)}});
  });
}
function note(s){changes.indexOf(s)<0&&changes.push(s)}
function pending(){return Object.keys(staged).length+(dirty.content?1:0)+(dirty.catalog?1:0)+(dirty.lectures?1:0)}
function updateBar(){var n=changes.length,p=$("#a-pend");if(!p)return;p.textContent=n?n+(n===1?" unpublished change":" unpublished changes"):"All changes are published";p.classList.toggle("on",!!n);var b=$("#a-pub");if(b)b.disabled=!n}
addEventListener("beforeunload",function(e){if(changes.length){e.preventDefault();e.returnValue=""}});
function levels(){var out=[];(catalog.folders||[]).forEach(function(f){if(out.indexOf(f.level)<0)out.push(f.level)});Object.keys(catalog.groups||{}).forEach(function(k){if(out.indexOf(k)<0)out.push(k)});return out}
function foldersOf(l){return (catalog.folders||[]).filter(function(f){return f.level===l})}
function docsOf(l,f){return (catalog.docs||[]).filter(function(d){return d.level===l&&(f==null||d.folder===f)})}
function fdate(d){var x=new Date(d);return isNaN(x)?"":x.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
function today(){return new Date().toISOString().slice(0,10)}
function ytId(v){var m=String(v||"").match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);return m?m[1]:(/^[\w-]{11}$/.test(String(v||"").trim())?String(v).trim():"")}

/* ---------------- master keys (one random key per level; passwords only wrap it) ---------------- */
function wrapMaster(raw,pw,label){var salt=rnd(16);return kdf(pw,salt,ITER,["encrypt"]).then(function(k){return seal(k,raw)}).then(function(w){return {id:"w"+Date.now().toString(36)+Math.floor(Math.random()*99),label:label||"Password",salt:b64e(salt),iter:ITER,wrap:b64e(w)}})}
function importMaster(raw){return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"])}
function tryPassword(level,pw){
  var ws=((catalog.groups||{})[level]||{}).wraps||[],i=0;
  function next(){if(i>=ws.length)return Promise.reject(new Error("bad"));var w=ws[i++];
    return kdf(pw,b64d(w.salt),w.iter,["decrypt"]).then(function(k){return openBox(k,b64d(w.wrap))}).then(function(raw){return importMaster(raw).then(function(key){return {raw:raw,key:key}})}).catch(next)}
  return next();
}
function createGroup(level){
  return ask({title:"Set an access password for "+level,text:"<b>"+esc(level)+"</b> has no access password yet. Choose one now. Students will need it to open the notes and lectures of this level.",ok:"Set password",fields:[{id:"pw",label:"Access password",type:"password",hint:"At least 10 characters. Three words and a number works well."},{id:"p2",label:"Repeat password",type:"password"}],
    validate:function(v){if(v.pw.length<10)return"Use at least 10 characters.";if(v.pw!==v.p2)return"The two passwords do not match."}}).then(function(v){
    if(!v)throw new Error("cancelled");var raw=rnd(32);
    return wrapMaster(raw,v.pw,"Main password").then(function(w){return importMaster(raw).then(function(key){catalog.groups[level]={wraps:[w]};masters[level]={raw:raw,key:key};catDirty("Set a password for "+level);return masters[level]})});
  });
}
function getMaster(level){
  if(masters[level])return Promise.resolve(masters[level]);
  if(!(((catalog.groups||{})[level]||{}).wraps||[]).length)return createGroup(level);
  return new Promise(function(res,rej){
    (function again(msg){
      ask({title:"Access password for "+level,text:"Enter any current access password for <b>"+esc(level)+"</b>. It is used only in this browser to encrypt and open your files.",ok:"Continue",fields:[{id:"pw",label:"Access password",type:"password"}],
        validate:function(v){return v.pw?"":"Please enter the password."}}).then(function(v){
        if(!v)return rej(new Error("cancelled"));
        tryPassword(level,v.pw).then(function(m){masters[level]=m;res(m)},function(){toast("That password is not correct for "+level+".","bad");again()});
      });
    })();
  });
}
function lecList(level){
  if(lecPlain[level])return Promise.resolve(lecPlain[level]);
  var x=(lectures.levels||{})[level];
  if(!x||!x.data){lecPlain[level]=[];return Promise.resolve(lecPlain[level])}
  return getMaster(level).then(function(m){return openBox(m.key,b64d(x.data))}).then(function(u){lecPlain[level]=JSON.parse(dec.decode(u));return lecPlain[level]});
}

/* ---------------- own-password keys (one random key per document / lecture) ---------------- */
function tryWrapsAdm(ws,pw){var i=0;function next(){if(i>=ws.length)return Promise.reject(new Error("bad"));var w=ws[i++];return kdf(pw,b64d(w.salt),w.iter,["decrypt"]).then(function(k){return openBox(k,b64d(w.wrap))}).then(function(raw){return importMaster(raw).then(function(key){return {raw:raw,key:key}})}).catch(next)}return next()}
function getOwnKey(id,ws,title){
  if(ownKeys[id])return Promise.resolve(ownKeys[id]);
  return new Promise(function(res,rej){(function again(){
    ask({title:"Password for this item",text:"Enter any current password of <b>"+esc(title)+"</b>. It is used only in this browser.",ok:"Continue",fields:[{id:"pw",label:"Password",type:"password"}],validate:function(v){return v.pw?"":"Please enter the password."}}).then(function(v){
      if(!v)return rej(new Error("cancelled"));
      tryWrapsAdm(ws,v.pw).then(function(m){ownKeys[id]=m;res(m)},function(){toast("That password is not correct.","bad");again()});
    });})()});
}
function newOwnKey(pw,label){var raw=rnd(32);return Promise.all([wrapMaster(raw,pw,label),importMaster(raw)]).then(function(r){return {raw:raw,key:r[1],wrap:r[0]}})}
function pagePath(id,i){return "vault/"+id+"/"+("00"+i).slice(-3)+".txt"}
function pageText(id,i){var p=pagePath(id,i),s0=staged[p];if(s0&&s0.text!=null)return Promise.resolve(s0.text);return readText(p).then(function(t){if(t==null)throw new Error("Could not read page "+i+" from the website.");return t.trim()})}
function rekeyDoc(d,oldKey,newKey,onp){
  var n=d.pages;
  function one(i){if(i>n)return Promise.resolve();
    return pageText(d.id,i).then(function(t){return openBox(oldKey,b64d(t))}).then(function(u){return seal(newKey,u)}).then(function(u){staged[pagePath(d.id,i)]={b64:null,text:b64e(u)};onp&&onp(i,n);return sleep(0)}).then(function(){return one(i+1)});}
  return one(1);
}
function pwFields(){return [{id:"l",label:"Label (only you see this)",placeholder:"Rahul's batch"},{id:"pw",label:"New password",type:"password",hint:"At least 10 characters. Three words and a number works well."},{id:"p2",label:"Repeat password",type:"password"}]}
function pwCheck(v){if(v.pw.length<10)return"Use at least 10 characters.";if(v.pw!==v.p2)return"The two passwords do not match."}
function accessModal(kind,id){
  var isDoc=kind==="doc",it=isDoc?catalog.docs.filter(function(x){return x.id===id})[0]:(lectures.own||[]).filter(function(x){return x.id===id})[0];
  if(!it)return;
  var m=modal(""),busy=false,what=isDoc?"document":"lecture";
  function mark(){if(isDoc)catDirty("Changed passwords of "+it.title);else{dirty.lectures=true;note("Changed passwords of "+it.title);updateBar()}}
  function paint(msg,err){
    var own=!isDoc||it.mode==="own",ws=it.wraps||[];
    var h='<h1 style="font-size:26px">Password and access</h1><p><b>'+esc(it.title)+'</b></p>';
    if(own){h+='<div class="a-sub">Passwords for this '+what+'</div><div class="a-list">'+ws.map(function(w,i){return '<div class="a-row"><div class="grow"><b>'+esc(w.label)+'</b><small>Password '+(i+1)+' of '+ws.length+'</small></div><button class="a-btn sm dan" data-a="rm:'+esc(w.id)+'" '+(ws.length<2?'disabled title="At least one password is needed"':'')+'>Remove</button></div>'}).join("")+'</div><div style="margin:10px 0"><button class="a-btn" data-a="add">+ Add password</button></div><div class="a-note">Only these passwords open this '+what+'. The <b>'+esc(it.level)+'</b> level password will <b>not</b> open it.</div>';
      if(isDoc)h+='<div style="margin-top:12px"><button class="a-btn" data-a="tolevel">Use the '+esc(it.level)+' level password instead</button></div>'}
    else h+='<div class="a-note">This document opens with the <b>'+esc(it.level)+'</b> level password, so everyone who has that password can open it.</div><div style="margin-top:12px"><button class="a-btn pri" data-a="toown">Give this document its own password</button></div>';
    h+=(msg?'<p class="'+(err?'a-err':'a-ok')+'" style="margin-top:12px">'+esc(msg)+'</p>':'')+'<div class="a-row" style="border:0;background:none;padding:0;justify-content:flex-end;margin-top:12px"><button class="a-btn" data-a="close" '+(busy?'disabled':'')+'>Done</button></div>';
    m.el.firstChild.innerHTML=h;
  }
  function fail(e){busy=false;paint(e&&e.message!=="cancelled"?e.message:"",true)}
  m.el.addEventListener("click",function(e){
    var b=e.target.closest("[data-a]");if(!b||busy)return;var a=b.dataset.a.split(":"),k=a[0],v=a.slice(1).join(":");
    if(k==="close"){m.close();draw()}
    else if(k==="add"){getOwnKey(it.id,it.wraps,it.title).then(function(mk){return ask({title:"Add password",ok:"Add password",fields:pwFields(),validate:pwCheck}).then(function(r){if(!r)return;return wrapMaster(mk.raw,r.pw,r.l.trim()||"Password").then(function(w){it.wraps.push(w);mark();paint("Password added. Publish to make it live.")})})}).catch(fail)}
    else if(k==="rm"){if(it.wraps.length<2)return;it.wraps=it.wraps.filter(function(w){return w.id!==v});mark();paint("Password removed. It stops working after you publish.")}
    else if(k==="toown"){ask({title:"Own password for this document",text:"Only this password will open <b>"+esc(it.title)+"</b>. The level password will stop opening it.",ok:"Set password",fields:pwFields(),validate:pwCheck}).then(function(r){if(!r)return;busy=true;paint("Preparing");
      return getMaster(it.level).then(function(lm){return newOwnKey(r.pw,r.l.trim()||"Main password").then(function(nk){return rekeyDoc(it,lm.key,nk.key,function(i,n){paint("Re-encrypting page "+i+" of "+n)}).then(function(){it.mode="own";it.wraps=[nk.wrap];ownKeys[it.id]=nk;busy=false;mark();paint("Done. This document now has its own password. Publish to make it live.")})})})}).catch(fail)}
    else if(k==="tolevel"){busy=true;paint("Preparing");getOwnKey(it.id,it.wraps,it.title).then(function(ok){return getMaster(it.level).then(function(lm){return rekeyDoc(it,ok.key,lm.key,function(i,n){paint("Re-encrypting page "+i+" of "+n)}).then(function(){delete it.mode;delete it.wraps;delete ownKeys[it.id];busy=false;mark();paint("Done. This document opens with the level password again. Publish to make it live.")})})}).catch(fail)}
  });
  paint();
}

/* ---------------- sign-in ---------------- */
function saved(){try{return JSON.parse(localStorage.getItem(LS)||"null")}catch(e){return null}}
function screen(html){app.innerHTML='<div class="a-center"><div class="a-card panel">'+html+'</div></div>'}
function setupScreen(){
  var s=saved()||{};
  screen('<span class="lockbadge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span><h1>Connect the admin panel</h1>'+
    '<p>One-time setup on this device. Your GitHub access token is encrypted with the admin password you choose below and never leaves this browser except to talk to GitHub.</p>'+
    '<div class="a-field"><label for="s-repo">GitHub repository</label><input id="s-repo" type="text" placeholder="username/repository" value="'+esc(s.repo||"")+'" autocomplete="off"><small>Example: vijaymakhija/website</small></div>'+
    '<div class="a-field"><label for="s-tok">GitHub access token</label><input id="s-tok" type="password" autocomplete="off" placeholder="github_pat_..."><small>Fine-grained token with "Contents: Read and write" for this repository only. See the guide.</small></div>'+
    '<div class="a-field"><label for="s-pw">Admin password</label><input id="s-pw" type="password" autocomplete="new-password"><small>At least 8 characters. You will type this every time you open the admin panel.</small></div>'+
    '<div class="a-field"><label for="s-pw2">Repeat admin password</label><input id="s-pw2" type="password" autocomplete="new-password"></div>'+
    '<details><summary class="a-lab" style="cursor:pointer">Advanced</summary><div class="a-field" style="margin-top:10px"><label for="s-br">Branch</label><input id="s-br" type="text" value="'+esc(s.branch||"main")+'"></div><div class="a-field" style="margin-top:10px"><label for="s-api">GitHub API address</label><input id="s-api" type="text" value="'+esc(s.api||"")+'" placeholder="leave empty"></div></details>'+
    '<p class="a-err" id="s-err" role="alert"></p><button class="a-btn pri" id="s-go" type="button">Connect and open admin</button>');
  $("#s-go").onclick=function(){
    var repo=$("#s-repo").value.trim().replace(/^https?:\/\/github\.com\//,"").replace(/\.git$/,"").replace(/\/$/,""),t=$("#s-tok").value.trim(),pw=$("#s-pw").value,pw2=$("#s-pw2").value,err=$("#s-err");
    if(!/^[\w.-]+\/[\w.-]+$/.test(repo)){err.textContent="Enter the repository as username/repository.";return}
    if(!t){err.textContent="Paste your GitHub access token.";return}
    if(pw.length<8){err.textContent="The admin password needs at least 8 characters.";return}
    if(pw!==pw2){err.textContent="The two passwords do not match.";return}
    err.textContent="";var b=$("#s-go");b.disabled=true;b.textContent="Checking";
    var c={repo:repo,branch:$("#s-br").value.trim()||"main",api:$("#s-api").value.trim()};
    cfg=c;tok=t;
    gh("GET","").then(function(r){if(r.permissions&&r.permissions.push===false)throw new Error("This token can only read the repository. Create it with Contents: Read and write.");return gh("GET","/git/ref/heads/"+c.branch)})
    .then(function(){var salt=rnd(16);return kdf(pw,salt,250000,["encrypt"]).then(function(k){return seal(k,enc.encode(t))}).then(function(x){c.salt=b64e(salt);c.tok=b64e(x);localStorage.setItem(LS,JSON.stringify(c));start()})})
    .catch(function(e){cfg=null;tok=null;err.textContent=e.message==="Failed to fetch"?"Could not reach GitHub. Check your internet connection.":e.message;b.disabled=false;b.textContent="Connect and open admin"});
  };
}
function loginScreen(){
  var s=saved();
  screen('<span class="lockbadge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span><h1>Admin sign in</h1><p>Website for <b>'+esc(s.repo)+'</b>. Enter your admin password to continue.</p>'+
    '<div class="a-field"><label for="l-pw">Admin password</label><input id="l-pw" type="password" autocomplete="current-password"></div><p class="a-err" id="l-err" role="alert"></p>'+
    '<button class="a-btn pri" id="l-go" type="button">Sign in</button><button class="a-btn sm" id="l-forget" type="button">Forget this device and set up again</button>');
  var pw=$("#l-pw");pw.focus();
  function go(){
    if(!pw.value)return;var b=$("#l-go");b.disabled=true;b.textContent="Checking";
    kdf(pw.value,b64d(s.salt),250000,["decrypt"]).then(function(k){return openBox(k,b64d(s.tok))}).then(function(u){cfg=s;tok=dec.decode(u);start()}).catch(function(){$("#l-err").textContent="That password is not correct.";b.disabled=false;b.textContent="Sign in";pw.select()});
  }
  $("#l-go").onclick=go;pw.addEventListener("keydown",function(e){if(e.key==="Enter")go()});
  $("#l-forget").onclick=function(){if(confirm("Remove the saved connection from this device? Your website is not affected.")){localStorage.removeItem(LS);setupScreen()}};
}

/* ---------------- load ---------------- */
function start(){
  app.innerHTML='<p class="a-boot">Loading your website data</p>';
  var pj=function(t,d){try{return t?JSON.parse(t):d}catch(e){return d}};
  Promise.all([readText("content.json"),readText("catalog.json"),readText("lectures.json"),readText("schema.json")]).then(function(a){
    content=pj(a[0],{});content.text=content.text||{};content.links=content.links||{};content.theme=content.theme||{};
    catalog=pj(a[1],{version:2,groups:{},folders:[],docs:[]});catalog.groups=catalog.groups||{};catalog.folders=catalog.folders||[];catalog.docs=catalog.docs||[];
    lectures=pj(a[2],{version:2,levels:{},own:[]});lectures.levels=lectures.levels||{};lectures.own=lectures.own||[];lectures.version=2;
    schema=pj(a[3],{fields:[]}).fields||[];
    publishedIds={};catalog.docs.forEach(function(d){publishedIds[d.id]=d.pages});
    if(!ui.level)ui.level=levels()[0]||null;
    shell();
  }).catch(function(e){screen('<h1>Could not load the site</h1><p class="a-err">'+esc(e.message)+'</p><button class="a-btn" onclick="location.reload()">Try again</button>')});
}

/* ---------------- shell ---------------- */
var ICO={
  home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  play:'<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>',key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  text:'<path d="M4 6h16M4 12h16M4 18h10"/>',link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  paint:'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'};
var TABS=[["overview","Overview","home"],["notes","Notes and folders","doc"],["lectures","Lectures","play"],["passwords","Passwords","key"],["sep"],["text","Page text","text"],["links","Contact and links","link"],["look","Appearance","paint"],["photo","Photo and logo","user"],["sep"],["settings","Security","gear"]];
function shell(){
  app.innerHTML='<div class="a-shell"><aside class="a-side"><div class="a-brand"><span class="logo">VM</span><div><b>Admin panel</b><small>CS Vijay Makhija</small></div></div><nav class="a-nav" aria-label="Admin sections">'+
    TABS.map(function(t){return t[0]==="sep"?'<div class="sep"></div>':'<button type="button" data-tab="'+t[0]+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ICO[t[2]]+'</svg>'+t[1]+'</button>'}).join("")+
    '</nav></aside><main class="a-main"><div class="a-bar"><h1 id="a-title"></h1><span class="a-pend" id="a-pend"></span><a class="a-btn" id="a-view" target="_blank" rel="noopener" href="index.html">View website</a><button class="a-btn pri" id="a-pub" type="button">Publish changes</button></div><div id="a-view-box"></div></main></div>';
  $(".a-nav").addEventListener("click",function(e){var b=e.target.closest("[data-tab]");if(b){ui.tab=b.dataset.tab;draw()}});
  $("#a-pub").onclick=publish;draw();
}
function draw(){
  $$(".a-nav button").forEach(function(b){b.setAttribute("aria-current",String(b.dataset.tab===ui.tab))});
  var t=TABS.filter(function(x){return x[0]===ui.tab})[0];$("#a-title").textContent=t?t[1]:"";
  var v={overview:vOverview,notes:vNotes,lectures:vLectures,passwords:vPasswords,text:vText,links:vLinks,look:vLook,photo:vPhoto,settings:vSettings}[ui.tab]||vOverview;
  var old=$("#a-view-box"),box=old.cloneNode(false);old.parentNode.replaceChild(box,old);v(box);updateBar();window.scrollTo(0,0);
}
function section(box,title,lead){var s=document.createElement("section");s.className="panel a-sec";s.innerHTML=(title?'<h2>'+esc(title)+'</h2>':'')+(lead?'<p class="lead">'+lead+'</p>':'');box.appendChild(s);return s}
function html(el,h){var d=document.createElement("div");d.style.display="contents";d.innerHTML=h;el.appendChild(d);return d}
function onClick(el,fn){el.addEventListener("click",function(e){var b=e.target.closest("[data-a]");if(b&&el.contains(b))fn(b.dataset.a,b,e)})}

/* ---------------- overview ---------------- */
function siteUrl(){var p=cfg.repo.split("/");return p[1].toLowerCase()===(p[0]+".github.io").toLowerCase()?"https://"+p[0]+".github.io/":"https://"+p[0]+".github.io/"+p[1]+"/"}
function vOverview(box){
  var tl=Object.keys(lectures.levels||{}).reduce(function(n,k){return n+((lectures.levels[k]||{}).count||0)},0)+(lectures.own||[]).length;
  $("#a-view").href=cfg.api?"index.html":siteUrl();
  var s=section(box,"Welcome","Everything on the website is managed from this panel. Make your changes, then press <b>Publish changes</b>. The live site updates about a minute later.");
  html(s,'<div class="a-grid"><div class="a-row"><div class="grow"><b>'+(catalog.docs||[]).length+' documents</b><small>in '+(catalog.folders||[]).length+' folders</small></div><button class="a-btn sm" data-a="go:notes">Manage</button></div>'+
    '<div class="a-row"><div class="grow"><b>'+tl+' lectures</b><small>private, across '+levels().length+' levels</small></div><button class="a-btn sm" data-a="go:lectures">Manage</button></div>'+
    '<div class="a-row"><div class="grow"><b>'+Object.keys(catalog.groups||{}).reduce(function(n,k){return n+((catalog.groups[k].wraps||[]).length)},0)+' access passwords</b><small>one or more per level</small></div><button class="a-btn sm" data-a="go:passwords">Manage</button></div></div>'+
    '<dl class="a-kv"><dt>Website address</dt><dd><a href="'+esc(siteUrl())+'" target="_blank" rel="noopener">'+esc(siteUrl())+'</a></dd><dt>Repository</dt><dd>'+esc(cfg.repo)+' ('+esc(cfg.branch)+')</dd><dt>Last published</dt><dd>'+(content.updated?esc(fdate(content.updated)):"Not yet")+'</dd></dl>'+
    '<div class="a-note">Tip: nothing goes live until you press <b>Publish changes</b>. If you close this tab with unpublished changes, the browser will warn you first.</div>');
  onClick(s,function(a){if(a.indexOf("go:")===0){ui.tab=a.slice(3);draw()}});
}

/* ---------------- notes ---------------- */
function vNotes(box){
  var lv=levels();if(!ui.level||lv.indexOf(ui.level)<0)ui.level=lv[0]||null;
  var s=section(box,"","Upload PDFs and organise them in folders by level and statute. Each PDF is turned into encrypted pages inside your browser before it is saved.");
  html(s,'<div class="a-chips" id="lv">'+lv.map(function(l){return '<button type="button" data-a="lv:'+esc(l)+'" aria-pressed="'+(l===ui.level)+'">'+esc(l)+'</button>'}).join("")+'<button type="button" data-a="addlevel">+ Add level</button></div>');
  if(!ui.level){html(s,'<div class="a-note warn">There are no levels yet. Choose <b>Add level</b> to create the first one.</div>');onClick(s,function(a){if(a==="addlevel")addLevel()});return}
  var L=ui.level,fl=foldersOf(L);
  var up=section(box,"Upload notes to "+L);
  up.id="upl";
  if(!fl.length)html(up,'<div class="a-note warn">Create a folder first (below), then upload PDFs into it.</div>');
  else{
    html(up,'<label class="a-drop" id="drop" for="file">Drop PDF files here or <b>choose files</b><input id="file" type="file" accept="application/pdf,.pdf" multiple hidden></label><div class="a-list" id="queue"></div>');
    var drop=$("#drop",up),inp=$("#file",up);
    inp.onchange=function(){addQueue(inp.files);inp.value=""};
    ["dragenter","dragover"].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.add("on")})});
    ["dragleave","drop"].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.remove("on")})});
    drop.addEventListener("drop",function(e){addQueue(e.dataTransfer.files)});
    drawQueue();
  }
  var fs=section(box,"Folders in "+L,"Folders appear on the website in this order.");
  html(fs,'<div class="a-list">'+(fl.length?fl.map(function(f,i){var n=docsOf(L,f.name).length;return '<div class="a-row"><div class="grow"><b>'+esc(f.name)+'</b><small>'+n+(n===1?' document':' documents')+'</small></div>'+
    '<button class="a-btn sm" data-a="fup:'+i+'" '+(i?'':'disabled')+' aria-label="Move up">&uarr;</button><button class="a-btn sm" data-a="fdn:'+i+'" '+(i<fl.length-1?'':'disabled')+' aria-label="Move down">&darr;</button>'+
    '<button class="a-btn sm" data-a="fren:'+i+'">Rename</button><button class="a-btn sm dan" data-a="fdel:'+i+'">Delete</button></div>'}).join(""):'<div class="a-note">No folders yet.</div>')+'</div><div><button class="a-btn" data-a="fadd">+ Add folder</button></div>');
  var ds=section(box,"Documents in "+L);
  var hasDocs=docsOf(L).length;
  html(ds,hasDocs?fl.concat(docsOf(L).filter(function(d){return !fl.some(function(f){return f.name===d.folder})}).map(function(d){return {name:d.folder}})).filter(function(f,i,a){return a.findIndex(function(x){return x.name===f.name})===i}).map(function(f){
    var dl=docsOf(L,f.name);if(!dl.length)return "";
    return '<div class="a-sub">'+esc(f.name)+'</div><div class="a-list">'+dl.map(function(d){return '<div class="a-row"><div class="grow"><b>'+esc(d.title)+'</b><small>'+d.pages+' pages, added '+esc(fdate(d.added))+(publishedIds[d.id]?'':' (not published yet)')+'</small><small class="a-tags"><span class="a-tag '+(d.mode==="own"?'own':'')+'">'+(d.mode==="own"?'Own password':esc(d.level)+' password')+'</span><span class="a-tag '+(d.dl?'yes':'')+'">Download: '+(d.dl?'Yes':'No')+'</span></small></div><button class="a-btn sm" data-a="dacc:'+esc(d.id)+'">Password</button><button class="a-btn sm" data-a="dedit:'+esc(d.id)+'">Edit</button><button class="a-btn sm dan" data-a="ddel:'+esc(d.id)+'">Delete</button></div>'}).join("")+'</div>'}).join(""):'<div class="a-note">No documents in this level yet.</div>');
  onClick(box,function(a){
    var p=a.split(":"),k=p[0],v=p.slice(1).join(":");
    if(k==="lv"){ui.level=v;ui.queue=[];draw()}
    else if(k==="addlevel")addLevel();
    else if(k==="fadd")folderAdd();
    else if(k==="fren")folderRename(+v);
    else if(k==="fdel")folderDelete(+v);
    else if(k==="fup"||k==="fdn")folderMove(+v,k==="fup"?-1:1);
    else if(k==="dedit")docEdit(v);
    else if(k==="dacc")accessModal("doc",v);
    else if(k==="ddel")docDelete(v);
  });
}
function catDirty(msg){dirty.catalog=true;if(msg)note(msg);updateBar()}
function addLevel(){
  ask({title:"Add a level",text:"A level groups its own folders, notes and lectures, and has its own access password (for example <i>CA Final</i>).",ok:"Create level",fields:[{id:"n",label:"Level name",placeholder:"CA Final"},{id:"f",label:"First folder name",placeholder:"Companies Act, 2013"},{id:"pw",label:"Access password for this level",type:"password",hint:"At least 10 characters. Three words and a number works well."}],
    validate:function(v){if(!v.n.trim())return"Enter a level name.";if(levels().some(function(l){return l.toLowerCase()===v.n.trim().toLowerCase()}))return"That level already exists.";if(!v.f.trim())return"Enter a folder name.";if(v.pw.length<10)return"Use at least 10 characters for the password."}}).then(function(v){
    if(!v)return;var raw=rnd(32);
    wrapMaster(raw,v.pw,"Main password").then(function(w){importMaster(raw).then(function(key){
      catalog.groups[v.n.trim()]={wraps:[w]};masters[v.n.trim()]={raw:raw,key:key};catalog.folders.push({level:v.n.trim(),name:v.f.trim()});ui.level=v.n.trim();catDirty("Added level "+v.n.trim());draw()})});
  });
}
function folderAdd(){ask({title:"Add folder",ok:"Add folder",fields:[{id:"n",label:"Folder name",placeholder:"Indian Contract Act, 1872"}],validate:function(v){if(!v.n.trim())return"Enter a folder name.";if(foldersOf(ui.level).some(function(f){return f.name.toLowerCase()===v.n.trim().toLowerCase()}))return"This folder already exists."}}).then(function(v){if(!v)return;catalog.folders.push({level:ui.level,name:v.n.trim()});catDirty("Added folder "+v.n.trim());draw()})}
function folderRename(i){var f=foldersOf(ui.level)[i];ask({title:"Rename folder",ok:"Rename",fields:[{id:"n",label:"Folder name",value:f.name}],validate:function(v){return v.n.trim()?"":"Enter a folder name."}}).then(function(v){if(!v||v.n.trim()===f.name)return;var old=f.name;f.name=v.n.trim();catalog.docs.forEach(function(d){if(d.level===ui.level&&d.folder===old)d.folder=f.name});if(lecPlain[ui.level]){var ch=false;lecPlain[ui.level].forEach(function(x){if(x.subject===old){x.subject=f.name;ch=true}});if(ch){lecDirty[ui.level]=true;dirty.lectures=true}}(lectures.own||[]).forEach(function(x){if(x.level===ui.level&&x.subject===old){x.subject=f.name;dirty.lectures=true}});catDirty("Renamed folder "+old);draw()})}
function folderDelete(i){var f=foldersOf(ui.level)[i];if(docsOf(ui.level,f.name).length){toast("Move or delete the documents in this folder first.","bad");return}ask({title:"Delete folder",text:"Delete the empty folder <b>"+esc(f.name)+"</b>?",ok:"Delete",danger:true}).then(function(v){if(!v)return;catalog.folders.splice(catalog.folders.indexOf(f),1);catDirty("Deleted folder "+f.name);draw()})}
function folderMove(i,d){var fl=foldersOf(ui.level),a=fl[i],b=fl[i+d];if(!a||!b)return;var ia=catalog.folders.indexOf(a),ib=catalog.folders.indexOf(b);catalog.folders[ia]=b;catalog.folders[ib]=a;catDirty("Reordered folders");draw()}
function docEdit(id){var d=catalog.docs.filter(function(x){return x.id===id})[0],fl=foldersOf(d.level).map(function(f){return f.name});ask({title:"Edit document",ok:"Save",fields:[{id:"t",label:"Title",value:d.title},{id:"f",label:"Folder",type:"select",options:fl,value:d.folder},{id:"dl",label:"Students can download this PDF",type:"select",options:["No","Yes"],value:d.dl?"Yes":"No",hint:"Yes shows a Download PDF button for this document only."}],validate:function(v){return v.t.trim()?"":"Enter a title."}}).then(function(v){if(!v)return;d.title=v.t.trim();d.folder=v.f;if(v.dl==="Yes")d.dl=true;else delete d.dl;catDirty("Edited document "+d.title);draw()})}
function docDelete(id){var d=catalog.docs.filter(function(x){return x.id===id})[0];ask({title:"Delete document",text:"Permanently remove <b>"+esc(d.title)+"</b> ("+d.pages+" pages) from the website?",ok:"Delete document",danger:true}).then(function(v){if(!v)return;
  for(var i=1;i<=d.pages;i++){var p="vault/"+d.id+"/"+("00"+i).slice(-3)+".txt";if(publishedIds[d.id])staged[p]={del:true};else delete staged[p]}
  catalog.docs.splice(catalog.docs.indexOf(d),1);catDirty("Deleted document "+d.title);draw()})}

/* ---------------- PDF upload ---------------- */
var pdfjs=null;
function loadPdf(){if(pdfjs)return Promise.resolve(pdfjs);return import("./admin/pdf.min.mjs").then(function(m){m.GlobalWorkerOptions.workerSrc=new URL("./admin/pdf.worker.min.mjs",location.href).href;pdfjs=m;return m})}
function addQueue(files){
  var fl=foldersOf(ui.level);
  [].slice.call(files).forEach(function(f){
    if(!/\.pdf$/i.test(f.name)&&f.type!=="application/pdf")return;
    ui.queue.push({file:f,title:f.name.replace(/\.pdf$/i,"").replace(/^\d+[\s._-]+/,"").replace(/[_]+/g," ").trim(),folder:fl[0].name,access:"Level password",pw:"",dl:"No",state:"ready",pct:0});
  });drawQueue();
}
function drawQueue(){
  var q=$("#queue");if(!q)return;
  if(!ui.queue.length){q.innerHTML="";return}
  var fl=foldersOf(ui.level).map(function(f){return f.name}),busy=ui.queue.some(function(x){return x.state==="busy"});
  q.innerHTML=ui.queue.map(function(x,i){return '<div class="a-row" data-i="'+i+'"><div class="grow" style="min-width:240px"><div class="a-field"><label>Title</label><input type="text" data-f="t" value="'+esc(x.title)+'" '+(x.state!=="ready"?'disabled':'')+'></div>'+
    '<small>'+esc(x.file.name)+' ('+(x.file.size/1048576).toFixed(1)+' MB)</small>'+(x.state==="busy"?'<div class="a-prog"><i style="width:'+x.pct+'%"></i></div><small>'+esc(x.msg||"")+'</small>':'')+(x.state==="done"?'<small class="a-ok">Added. Press Publish changes to make it live.</small>':'')+(x.state==="error"?'<small class="a-err">'+esc(x.msg)+'</small>':'')+'</div>'+
    '<div class="a-field" style="min-width:170px"><label>Who can open it</label><select data-f="a" '+(x.state!=="ready"?'disabled':'')+'>'+["Level password","Own password"].map(function(n){return '<option'+(n===x.access?' selected':'')+'>'+n+'</option>'}).join("")+'</select>'+(x.access==="Own password"&&x.state==="ready"?'<input type="password" data-f="p" placeholder="Password for this PDF" value="'+esc(x.pw)+'" autocomplete="off" style="margin-top:6px">':'')+'</div>'+
    '<div class="a-field" style="min-width:120px"><label>Download</label><select data-f="dl" '+(x.state!=="ready"?'disabled':'')+'>'+["No","Yes"].map(function(n){return '<option'+(n===x.dl?' selected':'')+'>'+n+'</option>'}).join("")+'</select></div>'+
    '<div class="a-field" style="min-width:200px"><label>Folder</label><select data-f="f" '+(x.state!=="ready"?'disabled':'')+'>'+fl.map(function(n){return '<option'+(n===x.folder?' selected':'')+'>'+esc(n)+'</option>'}).join("")+'</select></div>'+
    (x.state==="ready"?'<button class="a-btn sm dan" data-r="'+i+'">Remove</button>':'')+'</div>'}).join("")+
    '<div><button class="a-btn pri" id="goUp" '+(busy||!ui.queue.some(function(x){return x.state==="ready"})?'disabled':'')+'>Encrypt and add</button></div>';
  $$("[data-f]",q).forEach(function(el){el.onchange=function(){var r=el.closest("[data-i]"),it=ui.queue[+r.dataset.i];var f0=el.dataset.f;if(f0==="t")it.title=el.value;else if(f0==="p")it.pw=el.value;else if(f0==="dl")it.dl=el.value;else if(f0==="a"){it.access=el.value;drawQueue()}else it.folder=el.value}});
  $$("[data-f='p']",q).forEach(function(el){el.oninput=function(){ui.queue[+el.closest("[data-i]").dataset.i].pw=el.value}});
  $$("[data-r]",q).forEach(function(b){b.onclick=function(){ui.queue.splice(+b.dataset.r,1);drawQueue()}});
  var g=$("#goUp",q);if(g)g.onclick=runQueue;
}
function runQueue(){
  var L=ui.level,ready=ui.queue.filter(function(x){return x.state==="ready"});
  if(ready.some(function(x){return x.access==="Own password"&&(x.pw||"").length<10})){toast("Type a password of at least 10 characters for each PDF set to Own password.","bad",6000);return}
  (ready.some(function(x){return x.access!=="Own password"})?getMaster(L):Promise.resolve(null)).then(function(m){return loadPdf().then(function(){
    var items=ready;
    return items.reduce(function(p,it){return p.then(function(){it.state="busy";it.pct=0;it.msg="Reading PDF";drawQueue();return encryptPdf(it,L,m).then(function(){it.state="done"},function(e){it.state="error";it.msg=e.message||String(e);console.error(e)}).then(drawQueue)})},Promise.resolve());
  })}).catch(function(e){if(e.message!=="cancelled")toast(e.message,"bad")});
}
function encryptPdf(it,L,m){
  var title=it.title.trim()||"Untitled",pages=[],ar=[],size=0,id,pdf,nk=null,own=it.access==="Own password";
  return (own?newOwnKey(it.pw,"Main password"):Promise.resolve(null)).then(function(k){nk=k;return it.file.arrayBuffer()}).then(function(buf){
    return sha6(buf).then(function(h){id=(slug(L+" "+it.folder+" "+title).slice(0,60)+"-"+h);return pdfjs.getDocument({data:new Uint8Array(buf)}).promise});
  }).then(function(d){
    pdf=d;var n=pdf.numPages;
    function page(i){
      if(i>n)return Promise.resolve();
      return pdf.getPage(i).then(function(pg){
        var v0=pg.getViewport({scale:1}),sc=1400/v0.width,vp=pg.getViewport({scale:sc}),cv=document.createElement("canvas");cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
        var ctx=cv.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,cv.width,cv.height);
        return pg.render({canvasContext:ctx,viewport:vp,canvas:cv,background:"#ffffff"}).promise.then(function(){
          return new Promise(function(res,rej){cv.toBlob(function(b){b?res(b):rej(new Error("Could not render page "+i))},"image/jpeg",.62)})}).then(function(b){return b.arrayBuffer()}).then(function(ab){
          ar.push(+(cv.width/cv.height).toFixed(4));return seal(nk?nk.key:m.key,new Uint8Array(ab))}).then(function(u){
          var t=b64e(u);size+=t.length;pages.push(t);pg.cleanup();cv.width=cv.height=0;it.pct=Math.round(i/n*100);it.msg="Encrypting page "+i+" of "+n;drawQueue();return sleep(0)}).then(function(){return page(i+1)});
      });
    }
    return page(1);
  }).then(function(){
    var old=catalog.docs.filter(function(x){return x.id===id})[0];
    pages.forEach(function(t,i){staged["vault/"+id+"/"+("00"+(i+1)).slice(-3)+".txt"]={b64:null,text:t}});
    var rec={id:id,title:title,level:L,folder:it.folder,pages:pages.length,ar:(ar.every(function(x){return x===ar[0]})?ar[0]:ar),size:size,added:old?old.added:today()};
    if(it.dl==="Yes")rec.dl=true;if(nk){rec.mode="own";rec.wraps=[nk.wrap];ownKeys[id]=nk}
    if(old)catalog.docs[catalog.docs.indexOf(old)]=rec;else catalog.docs.push(rec);
    catDirty("Added document "+title+" ("+pages.length+" pages)");
  });
}

/* ---------------- lectures ---------------- */
function vLectures(box){
  var lv=levels();if(!ui.level||lv.indexOf(ui.level)<0)ui.level=lv[0]||null;
  var s=section(box,"","Add lecture links from YouTube. Upload each lecture as <b>Unlisted</b> on YouTube: it will not appear in search or on the channel, and the link is stored encrypted here, so only students with the access password can play it on the website.");
  html(s,'<div class="a-chips">'+lv.map(function(l){return '<button type="button" data-a="lv:'+esc(l)+'" aria-pressed="'+(l===ui.level)+'">'+esc(l)+'</button>'}).join("")+'</div>');
  onClick(s,function(a){if(a.indexOf("lv:")===0){ui.level=a.slice(3);draw()}});
  if(!ui.level)return;
  var L=ui.level,box2=section(box,"Lectures for "+L);
  box2.innerHTML+='<div id="lown"></div><p class="a-err" id="lerr"></p><div id="lbody"><p class="lead">Opening encrypted list</p></div>';
  var lo=$("#lown"),ol=(lectures.own||[]).filter(function(x){return x.level===L}).sort(function(a,c){return (c.date||"")<(a.date||"")?-1:1});
  lo.innerHTML='<div style="margin-bottom:14px"><button class="a-btn pri" data-a="ladd">+ Add lecture</button></div>'+(ol.length?'<div class="a-sub">Lectures with their own password</div><div class="a-list">'+ol.map(function(x){return '<div class="a-row"><div class="grow"><b>'+esc(x.title)+'</b><small>'+esc(x.subject||"General")+(x.date?' / '+esc(fdate(x.date)):'')+'</small><small class="a-tags"><span class="a-tag own">Own password</span></small></div><button class="a-btn sm" data-a="lpw:'+esc(x.id)+'">Password</button><button class="a-btn sm" data-a="lown-edit:'+esc(x.id)+'">Edit</button><button class="a-btn sm dan" data-a="lown-del:'+esc(x.id)+'">Delete</button></div>'}).join("")+'</div>':'');
  onClick(lo,function(a){var p=a.split(":"),v=p.slice(1).join(":");if(a==="ladd")lecForm(L,null);else if(p[0]==="lpw")accessModal("lec",v);else if(p[0]==="lown-edit")lecForm(L,null,v);else if(p[0]==="lown-del")lecOwnDel(v)});
  lecList(L).then(function(list){
    var b=$("#lbody");if(!b)return;
    var sorted=list.slice().sort(function(a,c){return (c.date||"")<(a.date||"")?-1:1});
    b.innerHTML='<div class="a-list">'+(sorted.length?sorted.map(function(x){var id=ytId(x.yt);return '<div class="a-row">'+(id?'<img class="a-thumb" alt="" src="https://i.ytimg.com/vi/'+esc(id)+'/mqdefault.jpg">':'')+'<div class="grow"><b>'+esc(x.title)+'</b><small>'+esc(x.subject||"General")+(x.date?' / '+esc(fdate(x.date)):'')+'</small><small class="a-tags"><span class="a-tag">'+esc(L)+' password</span></small></div><button class="a-btn sm" data-a="ledit:'+esc(x.id)+'">Edit</button><button class="a-btn sm dan" data-a="ldel:'+esc(x.id)+'">Delete</button></div>'}).join(""):'<div class="a-note">No lectures in this level yet.</div>')+'</div>';
    onClick(b,function(a){var p=a.split(":");if(p[0]==="ledit")lecForm(L,p[1]);else if(p[0]==="ldel")lecDel(L,p[1])});
  }).catch(function(e){var el=$("#lbody");if(el)el.innerHTML='<div class="a-note warn">'+(e.message==="cancelled"?'Enter the access password for this level to view or change its lectures.':esc(e.message))+'</div><div style="margin-top:12px"><button class="a-btn" data-a="retry">Enter password</button></div>';var bb=$("#lbody");if(bb)onClick(bb,function(){draw()})});
}
function lecForm(L,id,ownId){
  var o=ownId?(lectures.own||[]).filter(function(x){return x.id===ownId})[0]:null;
  if(o){getOwnKey(o.id,o.wraps,o.title).then(function(m){return openBox(m.key,b64d(o.data))}).then(function(u){form(null,o,JSON.parse(dec.decode(u)))}).catch(function(e){if(e.message!=="cancelled")toast(e.message,"bad")});return}
  if(id){lecList(L).then(function(list){form(list.filter(function(x){return x.id===id})[0],null,null)});return}
  form(null,null,null);
  function form(cur,o,pl){
    var subs=foldersOf(L).map(function(f){return f.name}).filter(function(n){return !/^practice/i.test(n)});if(subs.indexOf("General")<0)subs.push("General");
    var src=cur||(o?{title:o.title,subject:o.subject,date:o.date,yt:pl.yt,desc:pl.desc}:null),isNew=!src;
    var fields=[
      {id:"yt",label:"YouTube link",value:src?"https://youtu.be/"+ytId(src.yt):"",placeholder:"https://youtu.be/xxxxxxxxxxx",hint:"Paste the video link. Unlisted videos work."},
      {id:"t",label:"Title",value:src?src.title:""},{id:"s",label:"Subject",type:"select",options:subs,value:src?src.subject:subs[0]},{id:"d",label:"Date",type:"date",value:src?src.date:today()},
      {id:"x",label:"Short description (optional)",type:"textarea",value:src?src.desc:""}];
    if(isNew)fields.push({id:"a",label:"Who can watch it",type:"select",options:["Level password","Own password"],value:"Level password",hint:"Own password: only the password you type below opens this lecture, not the level password."},{id:"pw",label:"Password for this lecture (only if Own password)",type:"password"});
    ask({title:src?"Edit lecture":"Add lecture",ok:"Save lecture",fields:fields,
      validate:function(v){if(!ytId(v.yt))return"Paste a valid YouTube video link.";if(!v.t.trim())return"Enter a title.";if(isNew&&v.a==="Own password"&&v.pw.length<10)return"Use at least 10 characters for the lecture password."}}).then(function(v){
      if(!v)return;var done=function(){dirty.lectures=true;note("Lectures changed in "+L);draw()};
      if(o){var m=ownKeys[o.id];return seal(m.key,enc.encode(JSON.stringify({yt:ytId(v.yt),desc:v.x.trim()}))).then(function(u){o.title=v.t.trim();o.subject=v.s;o.date=v.d;o.data=b64e(u);done()})}
      if(cur){var list=lecPlain[L];list[list.indexOf(cur)]={id:cur.id,yt:ytId(v.yt),title:v.t.trim(),subject:v.s,date:v.d,desc:v.x.trim()};lecDirty[L]=true;return done()}
      if(v.a==="Own password"){return newOwnKey(v.pw,"Main password").then(function(nk){var rid="l"+Date.now().toString(36);return seal(nk.key,enc.encode(JSON.stringify({yt:ytId(v.yt),desc:v.x.trim()}))).then(function(u){lectures.own.push({id:rid,level:L,title:v.t.trim(),subject:v.s,date:v.d,wraps:[nk.wrap],data:b64e(u)});ownKeys[rid]=nk;done()})})}
      return lecList(L).then(function(list){list.push({id:"l"+Date.now().toString(36),yt:ytId(v.yt),title:v.t.trim(),subject:v.s,date:v.d,desc:v.x.trim()});lecDirty[L]=true;done()}).catch(function(e){if(e.message!=="cancelled")toast(e.message,"bad")});
    });
  }
}
function lecOwnDel(id){var x=lectures.own.filter(function(y){return y.id===id})[0];ask({title:"Delete lecture",text:"Remove <b>"+esc(x.title)+"</b> from the website?",ok:"Delete",danger:true}).then(function(v){if(!v)return;lectures.own.splice(lectures.own.indexOf(x),1);delete ownKeys[id];dirty.lectures=true;note("Lectures changed in "+x.level);draw()})}
function lecDel(L,id){var list=lecPlain[L],x=list.filter(function(y){return y.id===id})[0];ask({title:"Delete lecture",text:"Remove <b>"+esc(x.title)+"</b> from the website?",ok:"Delete",danger:true}).then(function(v){if(!v)return;list.splice(list.indexOf(x),1);lecDirty[L]=true;dirty.lectures=true;note("Lectures changed in "+L);draw()})}

/* ---------------- passwords ---------------- */
function vPasswords(box){
  var s=section(box,"","Each level has its own access password. You can give different batches different passwords, and remove one without affecting the others. Changing a password is instant: no document needs to be uploaded again.");
  levels().forEach(function(L){
    var ws=((catalog.groups||{})[L]||{}).wraps||[];
    html(s,'<div class="a-sub">'+esc(L)+'</div><div class="a-list">'+(ws.length?ws.map(function(w,i){return '<div class="a-row"><div class="grow"><b>'+esc(w.label)+'</b><small>Password '+(i+1)+' of '+ws.length+'</small></div><button class="a-btn sm dan" data-a="wdel:'+esc(L)+'|'+esc(w.id)+'" '+(ws.length<2?'disabled title="A level needs at least one password"':'')+'>Remove</button></div>'}).join(""):'<div class="a-note warn">This level has no password yet.</div>')+'</div><div><button class="a-btn" data-a="wadd:'+esc(L)+'">+ Add password</button></div>');
  });
  html(s,'<div class="a-note"><b>To change a password:</b> add the new one, then remove the old one. Share the new password with students after you publish.</div>');
  onClick(s,function(a){var p=a.split(":"),k=p[0],v=p.slice(1).join(":");if(k==="wadd")pwAdd(v);else if(k==="wdel"){var q=v.split("|");pwDel(q[0],q[1])}});
}
function pwAdd(L){
  if(!(((catalog.groups||{})[L]||{}).wraps||[]).length){getMaster(L).then(function(){draw()}).catch(function(e){if(e.message!=="cancelled")toast(e.message,"bad")});return}
  getMaster(L).then(function(m){return ask({title:"Add password for "+L,ok:"Add password",fields:[{id:"l",label:"Label (only you see this)",placeholder:"January 2027 batch"},{id:"pw",label:"New password",type:"password",hint:"At least 10 characters. Three words and a number works well."},{id:"p2",label:"Repeat password",type:"password"}],
    validate:function(v){if(v.pw.length<10)return"Use at least 10 characters.";if(v.pw!==v.p2)return"The two passwords do not match."}}).then(function(v){if(!v)return;
    return wrapMaster(m.raw,v.pw,v.l.trim()||"Password").then(function(w){catalog.groups[L].wraps.push(w);catDirty("Added a password for "+L);draw()})})}).catch(function(e){if(e.message!=="cancelled")toast(e.message,"bad")});
}
function pwDel(L,id){var ws=catalog.groups[L].wraps;if(ws.length<2)return;ask({title:"Remove password",text:"The password <b>"+esc(ws.filter(function(w){return w.id===id})[0].label)+"</b> will stop working on the website after you publish.",ok:"Remove",danger:true}).then(function(v){if(!v)return;catalog.groups[L].wraps=ws.filter(function(w){return w.id!==id});catDirty("Removed a password for "+L);draw()})}

/* ---------------- page text ---------------- */
function vText(box){
  var s=section(box,"","Change any heading, paragraph or button label on the website. Leave a field as it is to keep the original wording. Use the reset link to return one field to its original text.");
  html(s,'<div class="a-field"><label for="tf">Find a field</label><input id="tf" type="text" placeholder="Search, for example: heading, telegram, about" value="'+esc(ui.filter)+'"></div><div id="tgroups"></div>');
  var groups=[];schema.forEach(function(f){if(groups.indexOf(f.group)<0)groups.push(f.group)});
  function paint(){
    var q=ui.filter.trim().toLowerCase();
    $("#tgroups",s).innerHTML=groups.map(function(g){
      var fl=schema.filter(function(f){return f.group===g&&(!q||(f.label+" "+f.key+" "+f.default).toLowerCase().indexOf(q)>-1)});if(!fl.length)return"";
      return '<details class="a-acc" style="margin-top:12px"'+((ui.open[g]||q)?' open':'')+' data-g="'+esc(g)+'"><summary>'+esc(g)+'</summary><div>'+fl.map(function(f){
        var v=content.text[f.key]!=null?content.text[f.key]:f.default,multi=f.type==="area"||f.type==="lines-li"||f.type==="lines-span"||f.type==="marquee";
        return '<div class="a-field'+(multi?' full':'')+'"><label for="f-'+esc(f.key)+'">'+esc(f.label)+(content.text[f.key]!=null?' <a href="#" data-reset="'+esc(f.key)+'" style="color:var(--amber);margin-left:8px">reset</a>':'')+'</label>'+
          (multi?'<textarea id="f-'+esc(f.key)+'" data-k="'+esc(f.key)+'">'+esc(v)+'</textarea>':'<input type="text" id="f-'+esc(f.key)+'" data-k="'+esc(f.key)+'" value="'+esc(v)+'">')+'</div>'}).join("")+'</div></details>'}).join("");
    $$("details",s).forEach(function(d){d.addEventListener("toggle",function(){ui.open[d.dataset.g]=d.open})});
  }
  paint();
  $("#tf",s).addEventListener("input",function(e){ui.filter=e.target.value;paint()});
  s.addEventListener("input",function(e){var k=e.target.dataset&&e.target.dataset.k;if(!k)return;var f=schema.filter(function(x){return x.key===k})[0],v=e.target.value;
    if(v===f.default||v==="")delete content.text[k];else content.text[k]=v;dirty.content=true;note("Page text edited");updateBar()});
  s.addEventListener("click",function(e){var r=e.target.closest("[data-reset]");if(!r)return;e.preventDefault();delete content.text[r.dataset.reset];dirty.content=true;note("Page text edited");paint();updateBar()});
}

/* ---------------- links ---------------- */
function vLinks(box){
  var s=section(box,"","These appear on the Contact page and on every Telegram button. Leave a link empty to hide that tile.");
  html(s,'<div class="a-grid">'+LINKS.map(function(l){return '<div class="a-field"><label for="k-'+l[0]+'">'+l[1]+'</label><input id="k-'+l[0]+'" type="'+(l[0]==="email"?"email":"text")+'" data-l="'+l[0]+'" placeholder="'+esc(l[2])+'" value="'+esc(content.links[l[0]]||"")+'"></div>'+
    '<div class="a-field"><label for="k-'+l[0]+'_label">'+l[3]+'</label><input id="k-'+l[0]+'_label" type="text" data-l="'+l[0]+'_label" value="'+esc(content.links[l[0]+"_label"]||"")+'"></div>'}).join("")+'</div>');
  s.addEventListener("input",function(e){var k=e.target.dataset&&e.target.dataset.l;if(!k)return;content.links[k]=e.target.value.trim();dirty.content=true;note("Contact links edited");updateBar()});
}

/* ---------------- appearance ---------------- */
function th(k){return content.theme[k]!=null?content.theme[k]:DEFAULT_THEME[k]}
function fontLink(list,n){var f=list.filter(function(x){return x[0]===n})[0];return f?f[1]:""}
function loadPreviewFonts(){[["display",th("display")],["body",th("body")]].forEach(function(p){var q=fontLink(FONTS[p[0]],p[1]);if(!q)return;var id="pf-"+slug(p[1]);if($("#"+id))return;var l=document.createElement("link");l.id=id;l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?"+q+"&display=swap";document.head.appendChild(l)})}
function applyPreview(){
  var p=$("#prev");if(!p)return;loadPreviewFonts();
  p.style.setProperty("--pbg",th("bg"));p.style.setProperty("--pamber",th("amber"));p.style.setProperty("--pdisplay","'"+th("display")+"',system-ui,sans-serif");p.style.setProperty("--pbody","'"+th("body")+"',system-ui,sans-serif");p.style.setProperty("--phs",th("hscale"));p.style.setProperty("--pfs",th("scale"));
  var d=$$(".dots i",p);["amber","amber2","teal","blue","violet"].forEach(function(k,i){if(d[i])d[i].style.background=th(k)});
}
function saveTheme(){
  var t=content.theme,links=[];
  [["display",FONTS.display],["body",FONTS.body]].forEach(function(p){var n=th(p[0]);if(n!==DEFAULT_THEME[p[0]]){var q=fontLink(p[1],n);if(q&&links.indexOf(q)<0)links.push(q)}});
  t.fontLinks=links;if(!links.length)delete t.fontLinks;
  Object.keys(t).forEach(function(k){if(k!=="fontLinks"&&JSON.stringify(t[k])===JSON.stringify(DEFAULT_THEME[k]))delete t[k]});
  dirty.content=true;note("Appearance changed");updateBar();applyPreview();
}
function vLook(box){
  var s=section(box,"","Colours, fonts and sizes for the whole website. The preview below updates as you change things.");
  var colors=[["bg","Page background"],["amber","Main accent (buttons, highlights)"],["amber2","Accent, lighter shade"],["teal","Success and tick colour"],["blue","Cool accent"],["violet","Violet accent"],["g1","Background glow 1"],["g2","Background glow 2"],["g3","Background glow 3"]];
  html(s,'<div class="a-prev" id="prev"><div class="dots"><i></i><i></i><i></i><i></i><i></i></div><h3>CS Vijay Makhija</h3><p>Law faculty for CAF, CA Inter and CS students. Private study notes organised statute by statute.</p><div class="row"><span class="b1">Browse notes</span><span class="b2">Watch lectures</span></div></div>'+
   '<div class="a-sub">Colours</div><div class="a-grid">'+colors.map(function(c){return '<div class="a-field"><label>'+c[1]+'</label><div class="a-color"><input type="color" data-c="'+c[0]+'" value="'+th(c[0])+'" aria-label="'+c[1]+'"><input type="text" data-ch="'+c[0]+'" value="'+th(c[0])+'" maxlength="7"></div></div>'}).join("")+'</div>'+
   '<div class="a-sub">Fonts</div><div class="a-grid"><div class="a-field"><label for="fd">Headings font</label><select id="fd" data-t="display">'+FONTS.display.map(function(f){return '<option'+(f[0]===th("display")?' selected':'')+'>'+f[0]+'</option>'}).join("")+'</select></div>'+
   '<div class="a-field"><label for="fb">Body font</label><select id="fb" data-t="body">'+FONTS.body.map(function(f){return '<option'+(f[0]===th("body")?' selected':'')+'>'+f[0]+'</option>'}).join("")+'</select></div></div>'+
   '<div class="a-sub">Sizes</div><div class="a-grid"><div class="a-field"><label for="sc">Overall text and layout size</label><div class="a-range"><input id="sc" type="range" min="0.9" max="1.15" step="0.01" data-r="scale" value="'+th("scale")+'"><output>'+Number(th("scale")).toFixed(2)+'</output></div></div>'+
   '<div class="a-field"><label for="hs">Heading size</label><div class="a-range"><input id="hs" type="range" min="0.7" max="1.3" step="0.01" data-r="hscale" value="'+th("hscale")+'"><output>'+Number(th("hscale")).toFixed(2)+'</output></div></div></div>'+
   '<div class="a-sub">Effects</div><div class="a-grid"><label class="a-sw"><input type="checkbox" data-s="intro" '+(th("intro")!==false?'checked':'')+'> Opening intro animation</label><label class="a-sw"><input type="checkbox" data-s="grain" '+(th("grain")!==false?'checked':'')+'> Fine film grain over the page</label><label class="a-sw"><input type="checkbox" data-s="calm" '+(th("motion")==="calm"?'checked':'')+'> Calm mode (no moving background, tilt or ticker)</label></div>'+
   '<div><button class="a-btn" data-a="resetlook">Reset appearance to the original design</button></div>');
  applyPreview();
  s.addEventListener("input",function(e){var t=e.target;
    if(t.dataset.c){content.theme[t.dataset.c]=t.value;$('[data-ch="'+t.dataset.c+'"]',s).value=t.value;saveTheme()}
    else if(t.dataset.ch){if(/^#[0-9a-f]{6}$/i.test(t.value)){content.theme[t.dataset.ch]=t.value;$('[data-c="'+t.dataset.ch+'"]',s).value=t.value;saveTheme()}}
    else if(t.dataset.r){content.theme[t.dataset.r]=+t.value;t.nextElementSibling.textContent=(+t.value).toFixed(2);saveTheme()}});
  s.addEventListener("change",function(e){var t=e.target;
    if(t.dataset.t){content.theme[t.dataset.t]=t.value;saveTheme()}
    else if(t.dataset.s){var k=t.dataset.s;if(k==="calm")content.theme.motion=t.checked?"calm":"full";else content.theme[k]=t.checked;saveTheme()}});
  onClick(s,function(a){if(a==="resetlook"){content.theme={};dirty.content=true;note("Appearance reset");draw()}});
}

/* ---------------- photo ---------------- */
function vPhoto(box){
  var s=section(box,"Portrait photo","Shown on the About page. A photo with a transparent background (PNG) looks best; any photo works.");
  html(s,'<div class="a-row">'+(content.photo?'<img class="a-photo" alt="Current portrait" src="'+esc(content.photo)+'">':'<div class="a-photo"></div>')+'<div class="grow"><b>'+(content.photo?"Current photo":"No photo set")+'</b><small>The About page shows the initials when there is no photo.</small></div>'+
    '<label class="a-btn pri" for="ph">Choose new photo<input id="ph" type="file" accept="image/*" hidden></label>'+(content.photo?'<button class="a-btn dan" data-a="phdel">Remove photo</button>':'')+'</div>');
  $("#ph",s).onchange=function(e){var f=e.target.files[0];if(!f)return;
    var img=new Image();img.onload=function(){var sc=Math.min(1,1100/img.height),cv=document.createElement("canvas");cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
      cv.toBlob(function(b){b.arrayBuffer().then(function(ab){var p="assets/photo-"+Date.now().toString(36)+".png";staged[p]={b64:b64e(new Uint8Array(ab))};content.photo=p;dirty.content=true;note("Photo changed");draw()})},"image/png")};img.onerror=function(){toast("That file could not be read as an image.","bad")};img.src=URL.createObjectURL(f)};
  onClick(s,function(a){if(a==="phdel"){content.photo="";dirty.content=true;note("Photo removed");draw()}});
  var n=section(box,"Logo initials and name","Edit the initials in the logo and the brand name under <b>Page text</b> &rarr; Brand and footer.");
  html(n,'<div><button class="a-btn" data-a="gotext">Open Brand and footer text</button></div>');
  onClick(n,function(a){if(a==="gotext"){ui.tab="text";ui.open["Brand and footer"]=true;draw()}});
}

/* ---------------- security ---------------- */
function vSettings(box){
  var s=section(box,"Connection","Your GitHub access token is stored encrypted on this device only.");
  html(s,'<dl class="a-kv"><dt>Repository</dt><dd>'+esc(cfg.repo)+'</dd><dt>Branch</dt><dd>'+esc(cfg.branch)+'</dd></dl><div class="a-row" style="border:0;background:none;padding:0"><button class="a-btn" data-a="newtok">Use a new GitHub token</button><button class="a-btn" data-a="newpw">Change admin password</button><button class="a-btn dan" data-a="out">Sign out</button></div>');
  var c=section(box,"Design credit","The footer line “Design by $atyam” is part of the website design and is not editable here.");
  onClick(s,function(a){
    if(a==="out"){if(changes.length&&!confirm("You have unpublished changes. Sign out anyway?"))return;changes=[];location.reload()}
    else if(a==="newpw")ask({title:"Change admin password",ok:"Change",fields:[{id:"n",label:"New admin password",type:"password"},{id:"n2",label:"Repeat new password",type:"password"}],validate:function(v){if(v.n.length<8)return"At least 8 characters.";if(v.n!==v.n2)return"The passwords do not match."}}).then(function(v){if(!v)return;var salt=rnd(16);kdf(v.n,salt,250000,["encrypt"]).then(function(k){return seal(k,enc.encode(tok))}).then(function(x){cfg.salt=b64e(salt);cfg.tok=b64e(x);localStorage.setItem(LS,JSON.stringify(cfg));toast("Admin password changed.","good")})});
    else if(a==="newtok")ask({title:"New GitHub token",ok:"Save token",fields:[{id:"t",label:"Token",type:"password",placeholder:"github_pat_..."},{id:"p",label:"Your admin password",type:"password"}],validate:function(v){return v.t.trim()&&v.p?"":"Fill in both fields."}}).then(function(v){if(!v)return;var s0=cfg,old=tok;tok=v.t.trim();gh("GET","").then(function(){var salt=rnd(16);return kdf(v.p,salt,250000,["encrypt"]).then(function(k){return seal(k,enc.encode(tok))}).then(function(x){s0.salt=b64e(salt);s0.tok=b64e(x);localStorage.setItem(LS,JSON.stringify(s0));toast("Token updated.","good")})}).catch(function(e){tok=old;toast(e.message,"bad")})});
  });
}

/* ---------------- publish ---------------- */
function publish(){
  if(!changes.length)return;
  var btn=$("#a-pub");btn.disabled=true;btn.textContent="Preparing";
  var list=[],tasks=Promise.resolve();
  Object.keys(lecDirty).forEach(function(L){
    tasks=tasks.then(function(){return getMaster(L)}).then(function(m){var arr=lecPlain[L]||[];return seal(m.key,enc.encode(JSON.stringify(arr))).then(function(u){lectures.levels[L]={count:arr.length,data:arr.length?b64e(u):""}})});
  });
  tasks.then(function(){
    if(dirty.content){content.updated=new Date().toISOString();list.push({path:"content.json",text:JSON.stringify(content,null,1)})}
    if(dirty.catalog)list.push({path:"catalog.json",text:JSON.stringify(catalog,null,1)});
    if(dirty.lectures)list.push({path:"lectures.json",text:JSON.stringify(lectures)});
    Object.keys(staged).forEach(function(p){var s=staged[p];list.push(s.del?{path:p,del:true}:{path:p,b64:s.b64,text:s.b64==null?s.text:undefined})});
    var msg="Admin: "+changes.slice(0,4).join("; ")+(changes.length>4?" and more":"");
    return commitAll(list,msg,function(d,n){btn.textContent="Publishing "+d+" of "+n});
  }).then(function(){
    staged={};changes=[];dirty={content:false,catalog:false,lectures:false};lecDirty={};publishedIds={};catalog.docs.forEach(function(d){publishedIds[d.id]=d.pages});
    ui.queue=ui.queue.filter(function(x){return x.state!=="done"});
    btn.textContent="Publish changes";toast("Published. The website updates in about a minute.","good",6000);draw();
  }).catch(function(e){btn.textContent="Publish changes";btn.disabled=false;if(e.message!=="cancelled")toast("Publishing failed: "+e.message,"bad",9000)});
}

/* ---------------- boot ---------------- */
if(!(window.crypto&&crypto.subtle)){app.innerHTML='<p class="a-boot">This browser cannot run the admin panel. Please use a current version of Chrome, Edge, Safari or Firefox over https.</p>'}
else{var sv=saved();if(sv&&sv.tok)loginScreen();else setupScreen()}
window.__vmAdmin={staged:function(){return staged}};
})();
