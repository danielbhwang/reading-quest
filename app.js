/* ============================================================
   READING QUEST — app engine
   ============================================================ */
(function(){
'use strict';

const TRACKS = { son: SON_TRACK, daughter: DAUGHTER_TRACK };
function renameCat(name){
  if (!name || name === 'Biscuit') return;
  const swap = v => typeof v === 'string' ? v.replace(/Biscuit/g, name) : Array.isArray(v) ? v.map(swap) : (v && typeof v === 'object') ? (Object.keys(v).forEach(k => v[k] = swap(v[k])), v) : v;
  swap(SON_TRACK);
}
let CAT = 'Biscuit';
try { const saved = JSON.parse(localStorage.getItem('readingQuest_v1')); if (saved && saved.catName){ CAT = saved.catName; renameCat(CAT); } } catch(e){}
const KID_NAMES = { son: 'Biscuit Track', daughter: 'Dragon Academy' };
const STORE_KEY = 'readingQuest_v1';
const SESSION_GOAL_MS = 10 * 60 * 1000;
const $ = (s, el=document) => el.querySelector(s);
const el = (tag, attrs={}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const todayStr = (d=new Date()) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; };

/* ---------------- storage ---------------- */
function freshKid(){
  return { level:1, placed:false, passStreak:0, failStreak:0, storyIdx:{}, stars:0,
           collection:[], eggProgress:0, streak:{count:0,last:null}, today:{date:null,ms:0},
           missed:{}, words:{}, sessions:[], spent:0, trophies:[], badges:[], quizStreak:0,
           avatar:{ base:null, owned:[], equipped:{} } };
}
let DB;
function load(){
  let d = null;
  try { d = JSON.parse(localStorage.getItem(STORE_KEY)); } catch(e){}
  if (!d || !d.kids) d = { pin:'1234', record:false, forceManual:false, lastKid:null, kids:{ son:freshKid(), daughter:freshKid() } };
  for (const k of ['son','daughter']){
    d.kids[k] = Object.assign(freshKid(), d.kids[k]||{});
    const K0 = d.kids[k];
    // migrate the old simple missed-word counts into the word tracker
    for (const [w,c] of Object.entries(K0.missed||{})) if (!K0.words[w]) K0.words[w] = { miss:c, streak:0, mastered:null, last:null, disp:w };
    K0.missed = {};
    K0.avatar = Object.assign({ base:null, owned:[], equipped:{} }, K0.avatar||{});
  }
  d.names = Object.assign({ daughter:'Gianna', son:'Miles' }, d.names||{});
  return d;
}
function save(){ try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch(e){} try { cloudQueue(); } catch(e){ /* cloud code not set up yet during startup */ } }
DB = load();

// One-time gifts from a grown-up. Each id is granted once per device and announced on the kid's home screen.
const GIFTS = [{ id:'world-refund-2026-11', stars:70, msg:'🎁 Surprise! You got 70 bonus stars to rebuild your world. Sorry your things went missing!' }];
DB.gifts = DB.gifts || [];
GIFTS.forEach(g => {
  if (DB.gifts.includes(g.id)) return;
  for (const k of ['son','daughter']){ DB.kids[k].stars = (DB.kids[k].stars||0) + g.stars; DB.kids[k].giftMsg = g.msg; }
  DB.gifts.push(g.id);
  save();
});

/* IndexedDB for recordings */
const idb = {
  db:null,
  open(){ return new Promise(res => {
    if (this.db) return res(this.db);
    try {
      const r = indexedDB.open('readingQuestRec', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rec');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => res(null);
    } catch(e){ res(null); }
  });},
  async put(key, val){ const db = await this.open(); if(!db) return false;
    return new Promise(res => { try { const t = db.transaction('rec','readwrite'); t.objectStore('rec').put(val,key); t.oncomplete=()=>res(true); t.onerror=()=>res(false);} catch(e){res(false);} }); },
  async get(key){ const db = await this.open(); if(!db) return null;
    return new Promise(res => { try { const r = db.transaction('rec').objectStore('rec').get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null);} catch(e){res(null);} }); },
  async clear(prefix){ const db = await this.open(); if(!db) return;
    try { const st = db.transaction('rec','readwrite').objectStore('rec'); const r = st.openCursor();
      r.onsuccess = () => { const c = r.result; if (c){ if (String(c.key).startsWith(prefix)) c.delete(); c.continue(); } }; } catch(e){} }
};

/* ---------------- sound + speech ---------------- */
let actx = null;
function beep(type){
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok:[660,880], bad:[300,220], level:[523,659,784,1047], tap:[700], star:[880,1175] }[type] || [600];
    notes.forEach((f,i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type==='bad' ? 'triangle' : 'sine'; o.frequency.value = f;
      const t = actx.currentTime + i*0.12;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.25,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t+0.3);
    });
  } catch(e){}
}
let voice = null;
// Rank voices so the most human-sounding one wins: Natural/Neural (Edge), Premium/Enhanced (iPad, Mac), Google (Chrome).
// Novelty and old robotic system voices are pushed to the bottom.
const ROBOTIC = /compact|eloquence|albert|bad news|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|good news|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo\b|reed|sandy|eddy/i;
function voiceScore(v){
  if (!/^en/i.test(v.lang)) return -1;
  let s = /^en[-_]US/i.test(v.lang) ? 50 : 20;
  if (/natural|neural/i.test(v.name)) s += 40;
  if (/premium/i.test(v.name)) s += 35;
  if (/enhanced/i.test(v.name)) s += 30;
  if (/google us english/i.test(v.name)) s += 25;
  if (/\b(ava|zoe|samantha|allison|aria|jenny|michelle|nicky|evan|nathan|joelle|noelle)\b/i.test(v.name)) s += 10;
  if (ROBOTIC.test(v.name)) s -= 80;
  return s;
}
function englishVoices(){
  try { return speechSynthesis.getVoices().filter(v => voiceScore(v) >= 0).sort((a,b) => voiceScore(b) - voiceScore(a)); } catch(e){ return []; }
}
function pickVoice(){
  try {
    const vs = englishVoices();
    voice = (DB.voiceName && vs.find(v => v.name === DB.voiceName)) || vs[0] || null;
  } catch(e){}
}
if ('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, opts={}){
  return new Promise(res => {
    try {
      if (!('speechSynthesis' in window)) return res();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[🌀-🫶☀-➿️]/gu,''));
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-US'; u.rate = opts.rate || (kid==='son' ? 0.9 : 0.95); u.pitch = 1;
      u.onend = res; u.onerror = res;
      speechSynthesis.speak(u);
      setTimeout(res, 8000);
    } catch(e){ res(); }
  });
}

/* ---------------- word matching ---------------- */
const HOMO = [
  ['to','too','two','2'],['for','four','4','fore'],['see','sea','c'],['be','bee','b'],['hear','here'],
  ['there','their','theyre'],['no','know'],['one','won','1'],['right','write'],['red','read'],['blue','blew'],
  ['i','eye','aye'],['by','buy','bye'],['ate','eight','8'],['son','sun'],['hole','whole'],['new','knew'],
  ['night','knight'],['tail','tale'],['so','sew'],['our','hour'],['wood','would'],['not','knot'],
  ['flower','flour'],['meet','meat'],['pear','pair'],['deer','dear'],['road','rode'],['plain','plane'],
  ['hi','high'],['hey','hay'],['you','u','ya'],['okay','ok'],['mom','mum','mam'],['cant','cannot'],
  ['wren','ren','rent','when','wrenn','rin','rain','wren\'s'],['oona','una','oonah','luna','uno','oola'],
  ['vex','vax','vexed','vecs','vecks','backs','vets'],['tobin','toben','tobyn','toby','tobins'],
  ['mira','meera','mirror','mera','miras'],['nim','nem','nym','them'],['plip','flip','blip','lip','plipp'],
  ['zip','zipp','zips'],['biscuit','biscuits'],['toasty','toastie','toasties','tostie'],['leafy','leafie','leafs'],
  ['skyfire','sky','skyfires'],['pebble','pebbles'],['blaze','blazes','blades'],['ripple','ripples'],
  ['wow','whoa','woah'],['oh','o','ooh'],['shh','sh','shhh'],['cheep','cheap','chirp'],['zoomed','zoom','zooms'],
  ['grr','grrr'],['mr','mister'],['vines','vine'],['oak','oke']
];
const HOMO_MAP = {};
HOMO.forEach(g => g.forEach(w => { HOMO_MAP[w] = HOMO_MAP[w] || new Set(); g.forEach(x => HOMO_MAP[w].add(x)); }));
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numWords(n){
  if (n < 20) return [ONES[n]];
  if (n < 100) return [TENS[Math.floor(n/10)]].concat(n%10 ? [ONES[n%10]] : []);
  if (n < 1000) return [ONES[Math.floor(n/100)],'hundred'].concat(n%100 ? numWords(n%100) : []);
  if (n < 10000) return numWords(Math.floor(n/1000)).concat(['thousand']).concat(n%1000 ? numWords(n%1000) : []);
  return [String(n)];
}
const norm = w => w.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
function tokenizeHeard(text){
  const out = [];
  text.split(/[\s\-–—]+/).forEach(raw => {
    const w = norm(raw); if (!w) return;
    if (/^\d+$/.test(w)) out.push(...numWords(parseInt(w,10)));
    else out.push(w);
  });
  return out;
}
function lev(a,b){
  if (a===b) return 0; const m=a.length,n=b.length; if(!m) return n; if(!n) return m;
  let prev = Array.from({length:n+1},(_,j)=>j);
  for (let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev=cur; }
  return prev[n];
}
function wordMatch(target, heard, strict){
  if (!target || !heard) return false;
  if (target === heard) return true;
  if (HOMO_MAP[target] && HOMO_MAP[target].has(heard)) return true;
  if (strict) return false;
  const L = Math.max(target.length, heard.length);
  if (target.length <= 3) return false;
  const d = lev(target, heard);
  if (L <= 6 && d <= 1) return true;
  if (L >= 7 && d <= 2) return true;
  // plural / tense endings
  const stems = [heard+'s', heard+'es', heard+'ed', heard+'d', heard+'ing'];
  if (stems.includes(target)) return true;
  if ([target+'s', target+'es', target+'ed', target+'d'].includes(heard)) return true;
  return false;
}
const LETTER_NAMES = {
  a:['a','ay','eh','ah','ahh','aa'], b:['b','be','bee','buh','bih'], c:['c','see','sea','si','k','kuh','kay','cuh'], d:['d','dee','duh','di'],
  e:['e','eh','ee','ehh'], f:['f','ef','eff','ff','fff','fuh'], g:['g','gee','guh','ji','jee'], h:['h','aitch','huh','ha','hh'],
  i:['i','eye','ih','aye','ick','it'], j:['j','jay','juh','ja'], k:['k','kay','okay','kuh','ca'], l:['l','el','elle','ll','la','luh'],
  m:['m','em','mm','mmm','hmm','mmmm','mmhmm','mhm'], n:['n','en','nn','nnn','in','an'], o:['o','oh','owe','ah','aw','awe','ok'],
  p:['p','pee','pea','puh','pe'], q:['q','queue','cue','kw','kwuh','qu'], r:['r','are','our','rr','rrr','ruh','er','arr'],
  s:['s','es','ss','sss','ssss','yes','ess'], t:['t','tea','tee','tuh','ti'], u:['u','you','uh','um','up','uhh'],
  v:['v','vee','vv','vvv','vuh','we'], w:['w','double','wuh','wa','woo'], x:['x','ex','ecks','ks','eggs','x'],
  y:['y','why','yuh','ya','yeah'], z:['z','zee','zed','zz','zzz','zuh']
};
function letterMatch(letter, keyword, heardList){
  const kw = norm(keyword);
  return heardList.some(h => h === letter || (LETTER_NAMES[letter]||[]).includes(h) || h === kw || (h[0] === letter && h.length <= 6));
}

/* Align heard tokens against target tokens. Returns status array: 'ok'|'miss'|null */
function align(target, heard, strict){
  const st = target.map(()=>null);
  let pos = 0;
  for (let i=0; i<heard.length && pos<target.length; i++){
    const h = heard[i], h2 = heard[i+1] ? h + heard[i+1] : null;
    let matched = false;
    for (let k=0; k<=3 && pos+k<target.length; k++){
      const t = target[pos+k];
      let used = 0;
      if (wordMatch(t, h, strict)) used = 1;
      else if (h2 && wordMatch(t, h2, strict)) used = 2;
      else if (pos+k+1 < target.length && wordMatch(t + target[pos+k+1], h, strict)) used = -1; // "cannot" vs "can not"
      if (used){
        for (let s=pos; s<pos+k; s++) st[s] = 'miss';
        st[pos+k] = 'ok';
        if (used === -1){ st[pos+k+1] = 'ok'; pos = pos+k+2; }
        else { pos = pos+k+1; if (used === 2) i++; }
        matched = true; break;
      }
    }
    // unmatched heard word = extra word or misread; ignore
  }
  return st;
}

/* ---------------- speech recognition ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const srSupported = !!SR;
function useManual(){ return DB.forceManual || !srSupported || micBroken; }
// If listening fails twice in a row, switch to grown-up scoring for the rest of this visit instead of leaving the kid stuck.
let micFails = 0, micBroken = false;
function micFailed(){
  if (++micFails < 2 || micBroken) return;
  micBroken = true;
  try { stopRecog(); } catch(e){}
  if (run){ renderReader(); setHint('The microphone isn\'t working right now, so a grown-up can tap any missed words. Keep reading out loud!'); }
}

/* ---------------- app state ---------------- */
let kid = null;               // 'son' | 'daughter'
let K = null;                 // DB.kids[kid]
let T = null;                 // track
let run = null;               // current passage run

function kidName(k){ return DB.names[k||kid]; }
function setKid(k){
  kid = k; K = DB.kids[k]; T = TRACKS[k]; DB.lastKid = k; save();
  document.body.className = 'theme-' + k;
}
function levelDef(n){ return T.levels[Math.min(Math.max(n,1), T.levels.length) - 1]; }
function show(node){
  onCloudUpdate = null; // screens that can redraw on a cloud change set this again after show()
  const root = $('#app'); root.innerHTML = ''; root.append(node); window.scrollTo(0,0);
}

/* ---------------- cloud save ----------------
   When the app runs inside its Claude artifact, both kids' progress (worlds included) and the
   shared settings are kept in the artifact's database, so every device sees the same data and the
   kids can visit each other's worlds anywhere. Elsewhere (GitHub Pages) it saves on the device only.
   Docs: rq/son, rq/daughter, rq/settings = { json, ts }. Newest save wins. */
// The release version is the ?v= on app.js in index.html (bump it there on every release; it also busts caches).
const APP_VERSION = (function(){ const s = document.querySelector('script[src*="app.js"]'), m = s && /[?&]v=([^&]+)/.exec(s.getAttribute('src')); return m ? m[1] : 'dev'; })();
const CLOUD_KEYS = ['son','daughter','settings'];
const CLOUD = { db:null, on:false, status:'local', last:{}, timers:{}, busy:{}, again:{}, mine:{} };
let onCloudUpdate = null;
const CLOUD_TEXT = {
  local: /github\.io$/.test(location.hostname) ? '📱 Saved on this iPad only. For cloud save on every device, use the Claude link.' : '📱 Saved on this device only',
  syncing:'☁️ Connecting to cloud save…',
  cloud:'☁️ Cloud save is on: works on every device',
  offline:'⚠️ Can\'t reach cloud save right now. Saving on this device until it\'s back.'
};
function cloudStatusNode(){ return el('div',{class:'cloud-status'}, CLOUD_TEXT[CLOUD.status] + ' · v' + APP_VERSION); }
function setCloudStatus(s){ CLOUD.status = s; document.querySelectorAll('.cloud-status').forEach(n => n.textContent = CLOUD_TEXT[s] + ' · v' + APP_VERSION); }
const settingsOf = d => ({ pin:d.pin, names:d.names, catName:d.catName || null, gifts:d.gifts || [], record:!!d.record, forceManual:!!d.forceManual, goalMin:d.goalMin || {} });
const cloudBody = key => key === 'settings' ? settingsOf(DB) : DB.kids[key];
// real progress only (never stars: a fresh device's one-time gift must not outrank the cloud copy)
const kidScore = k => (k.sessions||[]).length + ((k.world && k.world.items) || []).length + (k.collection||[]).length + (k.placed ? k.level || 1 : 0);
function setCloudTs(key, ts){ DB.cloudTs = DB.cloudTs || {}; DB.cloudTs[key] = ts; }
function cloudQueue(){
  if (!CLOUD.on) return;
  CLOUD_KEYS.forEach(key => {
    if (JSON.stringify(cloudBody(key)) === CLOUD.last[key]) return;
    clearTimeout(CLOUD.timers[key]); CLOUD.timers[key] = setTimeout(() => cloudPush(key), 1200);
  });
}
async function cloudPush(key, retried){
  if (!CLOUD.on) return;
  if (CLOUD.busy[key]){ CLOUD.again[key] = true; return; }
  let body = cloudBody(key), j = JSON.stringify(body);
  if (j === CLOUD.last[key]) return;
  CLOUD.busy[key] = true;
  const ts = Date.now();
  CLOUD.mine[key] = ts;
  try {
    try { await CLOUD.db.doc('rq/' + key).set({ json:j, ts }); }
    catch(e){
      if (e && e.code === 'invalid_argument' && key !== 'settings'){ // too big: keep the cloud copy's history shorter
        j = JSON.stringify(Object.assign({}, body, { sessions:(body.sessions||[]).slice(0,40) }));
        await CLOUD.db.doc('rq/' + key).set({ json:j, ts });
      } else throw e;
    }
    CLOUD.last[key] = JSON.stringify(body); setCloudTs(key, ts);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch(e){}
    if (CLOUD.status !== 'cloud') setCloudStatus('cloud');
  } catch(e){
    setCloudStatus('offline');
    if (!retried && (!e || e.code === 'unavailable' || e.code === 'resource_exhausted')) setTimeout(() => cloudPush(key, true), 3000 + Math.random()*3000);
  }
  CLOUD.busy[key] = false;
  if (CLOUD.again[key]){ CLOUD.again[key] = false; cloudPush(key); }
}
function cloudApply(key, snap){
  if (snap.metadata.hasPendingWrites) return;
  const d = snap.exists ? snap.data() : null;
  if (!d || typeof d.json !== 'string'){ if (!snap.metadata.fromCache) cloudPush(key); return; } // cloud empty: seed it from this device
  const mine = JSON.stringify(cloudBody(key));
  if (d.json === mine){ CLOUD.last[key] = mine; setCloudTs(key, d.ts); return; }
  // our own save coming back (or something older than it): nothing new to take
  if (CLOUD.mine[key] && d.ts <= CLOUD.mine[key]){ if (!snap.metadata.fromCache) cloudQueue(); return; }
  let remote; try { remote = JSON.parse(d.json); } catch(e){ return; }
  const base = (DB.cloudTs || {})[key];
  // after the first sync, a newer cloud save wins; on a device's very first sync, keep whichever copy has more progress
  const takeRemote = base ? d.ts > base : (key === 'settings' || kidScore(remote) >= kidScore(DB.kids[key]));
  if (!takeRemote){ if (!snap.metadata.fromCache) cloudPush(key); return; }
  if (key === 'settings') Object.assign(DB, settingsOf(Object.assign(settingsOf(DB), remote)));
  else { DB.kids[key] = Object.assign(freshKid(), remote); if (kid === key) K = DB.kids[key]; }
  CLOUD.last[key] = JSON.stringify(cloudBody(key)); setCloudTs(key, d.ts);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch(e){}
  if (onCloudUpdate) onCloudUpdate();
}
// On the GitHub site, check now and then whether a newer version was published; offer a Refresh.
// (Inside Claude, a new artifact version reloads open pages by itself.)
function watchForUpdates(){
  if (!/github\.io$/.test(location.hostname)) return;
  const check = async () => {
    try {
      const t = await (await fetch(location.pathname + '?v=' + Date.now(), { cache:'no-store' })).text();
      const m = t.match(/app\.js\?v=([^"'&]+)/);
      if (m && m[1] !== APP_VERSION && !$('.update-banner'))
        document.body.append(el('div',{class:'update-banner'}, '✨ A new version of Reading Quest is ready!',
          el('button',{class:'btn small', onclick:()=>location.reload()},'Refresh')));
    } catch(e){}
  };
  setTimeout(check, 5000);
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}

async function cloudStart(){
  let db = null;
  try { if (window.claude && window.claude.use) db = await window.claude.use('db'); } catch(e){}
  if (!db){ setCloudStatus('local'); return; }
  CLOUD.db = db; CLOUD.on = true; setCloudStatus('syncing');
  const timer = setTimeout(() => { if (CLOUD.status === 'syncing') setCloudStatus('offline'); }, 10000);
  CLOUD_KEYS.forEach(key => {
    try {
      db.doc('rq/' + key).onSnapshot(snap => {
        if (!snap.metadata.fromCache){ clearTimeout(timer); if (CLOUD.status !== 'cloud') setCloudStatus('cloud'); }
        cloudApply(key, snap);
      }, () => setCloudStatus('offline'));
    } catch(e){ setCloudStatus('offline'); }
  });
}
function burst(word){
  const b = el('div',{class:'pow'}, word || pick(['POW!','ZAP!','WHAM!','BOOM!','YES!','WOW!']));
  document.body.append(b); setTimeout(()=>b.remove(), 1100);
}
function confetti(n=70){
  const colors = ['#f97316','#22c55e','#3b82f6','#eab308','#ec4899','#a855f7'];
  for (let i=0;i<n;i++){
    const c = el('div',{class:'confetti'});
    c.style.left = Math.random()*100 + 'vw'; c.style.background = colors[i%colors.length];
    c.style.animationDuration = (2 + Math.random()*2) + 's'; c.style.animationDelay = (Math.random()*0.6)+'s';
    document.body.append(c); setTimeout(()=>c.remove(), 5000);
  }
}
function modal(content, buttons){
  return new Promise(res => {
    const ov = el('div',{class:'overlay'});
    const m = el('div',{class:'modal'}, content);
    const row = el('div',{class:'row center', style:'margin-top:20px'});
    buttons.forEach(([label, cls, val]) => row.append(el('button',{class:'btn '+(cls||''), onclick:()=>{ ov.remove(); res(val); }}, label)));
    m.append(row); ov.append(m); document.body.append(ov);
  });
}

/* Biscuit SVG (original character: orange cat in a red cap) */
function biscuitSVG(){
  return `<svg viewBox="0 0 200 200" class="mascot" aria-label="Biscuit the cat">
  <path d="M40 80 L52 22 L88 60 Z" fill="#fb923c" stroke="#7c2d12" stroke-width="5" stroke-linejoin="round"/>
  <path d="M160 80 L148 22 L112 60 Z" fill="#fb923c" stroke="#7c2d12" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="100" cy="112" rx="70" ry="62" fill="#fdba74" stroke="#7c2d12" stroke-width="5"/>
  <path d="M60 70 Q100 30 140 70 L140 78 L60 78 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="5" stroke-linejoin="round"/>
  <path d="M136 74 Q170 74 176 86 L138 84 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="5" stroke-linejoin="round"/>
  <path d="M70 105 q12 -10 24 0" fill="none" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>
  <path d="M106 105 q12 -10 24 0" fill="none" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>
  <path d="M92 124 L108 124 L100 133 Z" fill="#f472b6"/>
  <path d="M100 133 q-10 14 -22 6 M100 133 q10 14 22 6" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>
  <path d="M40 120 L68 124 M40 136 L68 132 M160 120 L132 124 M160 136 L132 132" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>
  <path d="M74 92 q6 -4 10 2 M116 92 q6 -4 10 2" stroke="#ea580c" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;
}
function mascotNode(){
  if (kid === 'son'){ const d = el('div',{html:biscuitSVG()}); return d.firstElementChild; }
  return el('div',{class:'mascot emoji'},'🐲');
}

/* ================= SCREENS ================= */

function screenProfiles(){
  document.body.className = '';
  stopAll();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar center'}, el('div',{}, el('h1',{class:'title center'},'📚 Reading Quest'), el('p',{class:'subtitle center'},'Who is reading today?'))),
    el('div',{class:'profiles'},
      el('button',{class:'profile daughter', onclick:()=>{ beep('tap'); enterKid('daughter'); }},
        DB.kids.daughter.avatar.base ? el('div',{html: avatarSVG(DB.kids.daughter.avatar, 120)}) : el('div',{class:'pic'},'🐰'), DB.names.daughter, el('small',{},'Dragon Academy · Sunny Day Club')),
      el('button',{class:'profile son', onclick:()=>{ beep('tap'); enterKid('son'); }},
        DB.kids.son.avatar.base ? el('div',{html: avatarSVG(DB.kids.son.avatar, 120)}) : el('div',{class:'pic'},'🐲'), DB.names.son, el('small',{},`${CAT} & Pals · Detective ${CAT}`))
    ),
    cloudStatusNode(),
    el('button',{class:'gear', onclick:()=>screenPin()},'⚙︎ Grown-ups')
  );
  show(s);
  onCloudUpdate = () => screenProfiles();
}

// back to the "Who is reading today?" screen
function homeBtn(){ return el('button',{class:'btn small home-btn', onclick:()=>{ beep('tap'); screenProfiles(); }},'🏠 Home'); }

function enterKid(k){
  setKid(k);
  // Gianna reads quietly, so she skips the read-aloud placement check (a grown-up can set her rank)
  if (!K.placed && k === 'daughter'){ K.placed = true; K.level = K.level || 1; awardTrophiesUpTo(K.level); save(); }
  if (!K.placed) screenPlacementIntro(); else if (!K.avatar.base) screenAvatarPick(); else screenHome();
}

function seriesAt(levelN){
  const L = levelDef(levelN);
  if (!L.stories || !L.stories.length) return [];
  return [...new Set(L.stories.map(s => s.series))];
}
function storyFor(levelN, series){
  const L = levelDef(levelN);
  if (!L.stories || !L.stories.length) return null;
  series = series || seriesAt(levelN)[0];
  const list = L.stories.filter(s => s.series === series);
  const key = levelN + '_' + series;
  const i = (K.storyIdx[key] || 0) % list.length;
  return { story: list[i], index: i, key, series };
}

function screenHome(msg){
  stopAll();
  if (!K.avatar.base || !AVATAR_BASES[K.avatar.base] || !AVATAR_BASES[K.avatar.base].kid) return screenAvatarPick();
  if (awardTrophiesUpTo(K.level).length) save();
  if (K.giftMsg){ msg = msg ? K.giftMsg + ' ' + msg : K.giftMsg; delete K.giftMsg; save(); confetti(80); beep('level'); }
  const L = levelDef(K.level);
  const max = T.levels.length;
  const today = K.today.date === todayStr() ? K.today.ms : 0;
  const doneToday = today >= goalMs();
  const todo = practiceWords(K);
  const rankWord = kid==='daughter' ? 'Rank' : 'Level';
  // one card per story series available at this level (or one card for word/letter rounds)
  const cards = [];
  if (kid === 'daughter'){
    // Gianna: three sections, read quietly, 5 questions each
    const st = nextQuietStory(), book = currentBook(), bs = book && bookState(book.id);
    cards.push(
      st ? el('div',{class:'card next-card series-card'},
        el('div',{class:'series-tag'},'📖 Short Stories'),
        el('h2',{}, st.emoji + ' ' + st.title),
        el('p',{},'Read it to yourself, then answer 5 questions. Highlight clues as you go!'),
        el('button',{class:'btn big', onclick:()=>{ beep('tap'); startQuietStory(); }},'▶ Read')) : null,
      book ? el('div',{class:'card next-card series-card'},
        el('div',{class:'series-tag'},'📚 Chapter Books'),
        el('h2',{}, book.emoji + ' ' + book.title),
        el('p',{}, `Chapter ${bs.ch + 1} of ${book.chapters.length}: ${book.chapters[bs.ch].title}`),
        el('div',{class:'chapter-dots', style:'margin:-8px 0 14px'}, ...book.chapters.map((_, i) => el('span',{class:'dot' + (i < bs.ch ? ' on' : '')}))),
        el('div',{class:'row'},
          el('button',{class:'btn big', onclick:()=>{ beep('tap'); startChapter(book, bs.ch); }}, bs.ch ? '▶ Keep reading' : '▶ Start'),
          el('button',{class:'btn small blue', onclick:()=>{ beep('tap'); screenBookshelf(); }},'📚 Bookshelf'))) : null,
      el('div',{class:'card next-card spell-card'},
        el('div',{class:'series-tag'},'✏️ Spelling Check'),
        el('h2',{},'Spelling Check'),
        el('p',{},'Hear a word, then type it. 8 words · +1 ⭐ for each one you spell right.'),
        el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); startSpellCheck(); }},'✏️ Start')));
  }
  if (kid !== 'daughter' && L.kind !== 'story') cards.push(el('div',{class:'card next-card'},
      el('div',{class:'series-tag'}, L.kind === 'letters' ? '🔤 Practice' : '⭐ Practice'),
      el('h2',{}, L.kind === 'letters' ? 'Letter Sounds Round' : L.title + ' Round'), el('p',{}, L.intro),
      el('button',{class:'btn big', onclick:()=>{ beep('tap'); startActivity(); }},'▶ Start')));
  if (kid !== 'daughter'){
    seriesAt(K.level).forEach(sid => {
      const st = storyFor(K.level, sid).story, info = (T.series||{})[sid] || { name:'', emoji:'' };
      cards.push(el('div',{class:'card next-card series-card'},
        el('div',{class:'series-tag'}, info.emoji + ' ' + info.name),
        el('h2',{}, st.emoji + ' ' + st.title), el('p',{}, 'Read it out loud, then answer questions!'),
        el('button',{class:'btn big', onclick:()=>{ beep('tap'); startActivity(sid); }},'▶ Read')));
    });
  }
  if (kid !== 'daughter' && todo.length) cards.push(el('div',{class:'card next-card practice-card'},
    el('div',{class:'series-tag'},'🎯 My Words'),
    el('h2',{}, `${todo.length} tricky word${todo.length>1?'s':''} to practice`),
    el('p',{}, todo.slice(0,6).map(w => K.words[w].disp||w).join(' · ')),
    el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); startPractice(); }},'💪 Practice')));
  if (kid !== 'daughter' && spellWords().length) cards.push(el('div',{class:'card next-card spell-card'},
    el('div',{class:'series-tag'},'✏️ Spelling'),
    el('h2',{},'Spelling Practice'),
    el('p',{},'Hear a word, then build it with letter tiles! +1 ⭐ for each word you spell on the first try.'),
    el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); startSpelling(); }},'✏️ Spell')));
  const avatar = avatarNode(150);
  avatar.classList.add('mascot-av');
  avatar.onclick = () => screenShop();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      homeBtn(),
      el('div',{class:'row'},
        el('button',{class:'btn ghost small', onclick:()=>screenWorld()},'🏗️ My World'),
        el('button',{class:'btn ghost small', onclick:()=>{ ensureSkillStart(); screenPath(); }},'🧠 Skills'),
        el('button',{class:'btn ghost small', onclick:screenShop},'🛍️ Shop'),
        el('button',{class:'btn ghost small', onclick:screenTrophies},'🏆 Trophies'),
        el('button',{class:'btn ghost small', onclick:screenCollection}, kid==='daughter' ? '🐉 Roost' : '📖 Pals'),
        el('button',{class:'btn ghost small', onclick:screenWords},'🎯 Words'),
        el('button',{class:'btn ghost small', onclick:()=>{ beep('tap'); kid === 'daughter' ? startSpellCheck() : startSpelling(); }},'✏️ Spelling'))),
    el('div',{class:'hero'}, avatar,
      el('div',{class:'grow'},
        el('h1',{class:'title'}, `Hi, ${kidName()}!`),
        el('p',{class:'subtitle'}, `${rankWord} ${K.level}: ${L.title}`),
        el('div',{class:'tier-track'}, ...T.levels.map((Lv,i) => { const n = i+1, tr = TROPHIES[kid][i];
          return el('div',{class:'tier' + (n < K.level ? ' done' : n === K.level ? ' now' : '')}, el('span',{class:'tier-n'}, n), el('span',{class:'tier-e'}, n <= K.level ? tr[0] : '🔒')); })),
        el('div',{class:'stats'},
          el('span',{class:'pill'},'⭐ ' + balance()),
          el('span',{class:'pill'},'🔥 ' + (K.streak.count||0) + ' day streak'),
          el('span',{class:'pill'},'🏆 ' + K.trophies.length + ' · 🎖️ ' + K.badges.length),
          el('span',{class:'pill'},(kid==='daughter'?'🐉 ':'🐾 ') + K.collection.length)),
        levelProgress(), goalBar())),
    msg ? el('div',{class:'banner'}, msg) : null,
    doneToday ? el('div',{class:'banner'},`🎉 Great reading today! You reached your goal of ${goalMin()} minutes. You can stop here, or keep going!`) : null,
    el('div',{class:'cards'}, ...cards),
    useManual() ? el('div',{class:'banner'}, srSupported ? 'Grown-up scoring mode is on.' : 'This browser can\'t listen, so a grown-up will tap any words that are missed. (Open in Safari on an https site for listening mode.)') : null,
    cloudStatusNode(),
    el('button',{class:'gear', onclick:()=>screenPin()},'⚙︎ Grown-ups')
  );
  show(s);
  onCloudUpdate = () => screenHome();
}

/* ---------- daily reading goal ----------
   A grown-up sets minutes per day for each kid (default 10). Time from stories, lessons and spelling
   adds up; the day streak grows once per day when the goal is reached. */
const MAX_ACTIVITY_MS = 20 * 60 * 1000; // an app left open doesn't count as an hour of reading
const goalMin = k => ((DB.goalMin || {})[k || kid]) || 10;
const goalMs = () => goalMin() * 60000;
const todayMs = () => K.today.date === todayStr() ? K.today.ms : 0;
function addReadingTime(ms){
  if (K.today.date !== todayStr()) K.today = { date: todayStr(), ms: 0, goalHit: false };
  K.today.ms += Math.max(0, ms);
  if (K.today.goalHit || K.today.ms < goalMs()) return false;
  K.today.goalHit = true;
  if (K.streak.last !== todayStr()){
    const y = new Date(); y.setDate(y.getDate() - 1);
    K.streak.count = K.streak.last === todayStr(y) ? (K.streak.count || 0) + 1 : 1;
    K.streak.last = todayStr();
  }
  return true;
}
async function celebrateGoal(){
  K.stars += 3; save();
  confetti(90); beep('level'); say(`You reached your reading goal! ${K.streak.count} day streak!`);
  await modal(el('div',{}, el('div',{class:'big-e'},'🔥'), el('h2',{}, 'Daily goal done!'),
    el('p',{}, `${goalMin()} minutes of reading today · ${K.streak.count}-day streak · +3 ⭐`)), [['Yay! ▶','',1]]);
}
function goalBar(){
  const min = Math.floor(todayMs() / 60000), goal = goalMin(), pct = Math.min(100, Math.round(todayMs() / goalMs() * 100));
  return el('div',{class:'goal-bar'}, el('span',{}, pct >= 100 ? `✅ Goal done: ${min} min today!` : `⏱️ ${min} of ${goal} min today`),
    el('div',{class:'goal-track'}, el('div',{class:'goal-fill', style:`width:${pct}%`})));
}

// How close the kid is to the next level: 3 great (3-star) reads level up; a rough read starts the count over (see commitResults).
const LEVEL_UP_STREAK = 3;
function levelProgress(){
  const word = kid==='daughter' ? 'Rank' : 'Level';
  if (K.level >= T.levels.length) return el('div',{class:'lvl-progress'}, el('div',{class:'lvl-tip'}, `🏆 You reached the top ${word.toLowerCase()}! Amazing!`));
  const have = Math.min(K.passStreak||0, LEVEL_UP_STREAK), left = LEVEL_UP_STREAK - have;
  return el('div',{class:'lvl-progress'},
    el('div',{class:'lvl-head'}, el('span',{}, `${word} ${K.level}`), el('span',{}, `${word} ${K.level+1} 🔓`)),
    el('div',{class:'lvl-bar'}, ...Array.from({length:LEVEL_UP_STREAK}, (_,i) => el('div',{class:'lvl-seg' + (i < have ? ' on' : '')}, i < have ? '⭐⭐⭐' : ''))),
    el('div',{class:'lvl-tip'}, kid === 'daughter'
      ? `${left} more stor${left>1?'ies':'y'} with 4 or 5 questions right to reach ${word} ${K.level+1}!`
      : `${left} more ⭐⭐⭐ read${left>1?'s':''} to reach ${word} ${K.level+1}!`));
}

/* ---------- spelling practice ---------- */
// Words come from the kid's tricky-word list first, then from their current level.
function spellWords(n = 5, minLen = 3){
  const L = levelDef(K.level), maxLen = kid==='son' ? 6 : 9;
  let pool;
  if (L.kind === 'words') pool = L.items.slice();
  else if (L.kind === 'letters') pool = levelDef(2).items.slice();
  else pool = L.stories.flatMap(s => s.text.split(/\s+/)).map(w => w.replace(/[^A-Za-z]/g,'')).filter(w => /^[a-z]+$/.test(w));
  pool = pool.filter(w => /^[a-z]+$/.test(w) && w.length >= 3 && w.length <= maxLen && !PROPER.has(w));
  const tricky = practiceWords(K).filter(w => /^[a-z]+$/.test(w) && w.length >= 2 && w.length <= maxLen && !PROPER.has(w));
  pool = pool.filter(w => w.length >= minLen);
  return [...new Set(shuffle(tricky).slice(0,2).concat(shuffle(pool)))].slice(0, n);
}

/* ---------- Gianna: quiet reading (no microphone) ----------
   Short Stories = the standalone Academy Tales from her rank and the rank below.
   Chapter Books = the Dragon Academy quest and the Sunny Day Club, read in order, chapter by chapter.
   She reads to herself and answers 5 questions with the story beside them; only the questions are
   scored (4 or 5 right is a passing read). */
function quietPool(){
  const lv = K.level;
  return (lv > 1 ? DAUGHTER_EXTRA[lv - 1] || [] : []).concat(DAUGHTER_EXTRA[lv] || []);
}
function nextQuietStory(){
  const pool = quietPool();
  return pool.length ? pool[(K.storyIdx.quiet_short || 0) % pool.length] : null;
}
function startQuietRead(story, extra){
  stopAll();
  const pages = story.text.split(/\n\s*\n/).map(p => { const tokens = tokensOf(p.trim()); return { tokens, status: tokens.map(() => 'ok'), helped: tokens.map(() => false) }; });
  const act = Object.assign({ kind:'story', level:K.level, title:story.title, emoji:story.emoji, story, series:story.series, pages, quiet:true }, extra);
  run = { act, opts:{ mode:'normal' }, page:0, micMs:0, micStart:null, startedAt:Date.now(), clips:[], sessionId: kid + '_' + Date.now(), marks:{} };
  run.reading = { total:0, correct:0, helped:0, missed:[], accuracy:1, wcpm:null, quiet:true };
  screenQuiz();
}
function startQuietStory(){
  const story = nextQuietStory();
  story ? startQuietRead(story, { storyKey:'quiet_short' }) : screenHome();
}

/* ---------- Gianna: chapter books ----------
   Each book is a run of connected chapters from her story series, two ranks per book.
   A book opens once she is within one rank of where it starts. Scoring 3+ of 5 on a chapter
   moves her bookmark to the next chapter; otherwise she re-reads that chapter. */
const BOOK_DEFS = [
  { id:'quest1', title:'Pebble Can\'t Fly',          emoji:'🐉', series:'quest', from:1 },
  { id:'club1',  title:'The Sunny Day Club',         emoji:'🌻', series:'club',  from:1 },
  { id:'quest2', title:'The Golden Star Egg',        emoji:'🥚', series:'quest', from:3 },
  { id:'club2',  title:'Club Troubles',              emoji:'📒', series:'club',  from:3 },
  { id:'lighthouse', title:'The Lighthouse on Gull Island', emoji:'🗼', series:'club', from:4, chapters: LIGHTHOUSE_BOOK },
  { id:'quest3', title:'Into the Whispering Woods',  emoji:'🌲', series:'quest', from:5 },
  { id:'club3',  title:'Mysteries on Maple Lane',    emoji:'🍅', series:'club',  from:5 },
  { id:'quest4', title:'The Storm Dragon',           emoji:'⛈️', series:'quest', from:7 },
  { id:'club4',  title:'One Year of Sunshine',       emoji:'🎉', series:'club',  from:7 }
];
const TALES = new Set(Object.values(DAUGHTER_EXTRA).flat());
const BOOKS = BOOK_DEFS.map(b => Object.assign({}, b, {
  chapters: b.chapters || [b.from, b.from + 1].flatMap(n => DAUGHTER_TRACK.levels[n - 1].stories.filter(s => s.series === b.series && !TALES.has(s)))
}));
const bookState = id => { K.books = K.books || {}; return K.books[id] || (K.books[id] = { ch:0, finished:0 }); };
const bookOpen = b => b.from <= K.level + 1;
function currentBook(){
  const open = BOOKS.filter(bookOpen);
  const atRank = b => b.from <= K.level && K.level <= b.from + 1;
  return BOOKS.find(b => b.id === K.currentBook && bookOpen(b))
    || open.find(b => bookState(b.id).ch > 0)
    || open.find(b => atRank(b) && !bookState(b.id).finished)
    || open.find(b => !bookState(b.id).finished)
    || open[0];
}
function startChapter(book, i){
  K.currentBook = book.id; save();
  startQuietRead(book.chapters[i], { storyKey:'book_' + book.id, book, chapterIndex:i });
}
function screenBookshelf(){
  stopAll();
  const shelf = el('div',{class:'bookshelf'}, ...BOOKS.map(b => {
    const st = bookState(b.id), open = bookOpen(b), n = b.chapters.length;
    if (!open) return el('div',{class:'book-card locked'}, el('div',{class:'book-cover'}, '🔒'), el('h3',{}, b.title), el('p',{class:'muted'}, `Opens at Rank ${b.from - 1}`));
    return el('div',{class:'book-card'},
      el('div',{class:'book-cover'}, b.emoji),
      el('h3',{}, b.title),
      el('p',{class:'muted'}, `${n} chapters · Ranks ${b.from}–${b.from + 1}` + (st.finished ? ` · ✅ finished${st.finished > 1 ? ' ×' + st.finished : ''}` : '')),
      el('div',{class:'chapter-dots'}, ...b.chapters.map((_, i) => el('span',{class:'dot' + (i < st.ch ? ' on' : '')}))),
      el('ol',{class:'chapter-list'}, ...b.chapters.map((c, i) => el('li',{class: i < st.ch ? 'done' : i === st.ch ? 'now' : ''},
        el('button',{class:'chapter-link', disabled: i > st.ch, onclick:()=>startChapter(b, i)}, `${c.emoji} ${c.title}` + (i < st.ch ? ' ✓' : i === st.ch ? ' ◀ next' : ''))))),
      el('button',{class:'btn', onclick:()=>startChapter(b, st.ch)}, st.ch === 0 ? (st.finished ? '🔁 Read it again' : '▶ Start reading') : `▶ Chapter ${st.ch + 1}`));
  }));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'📚 Bookshelf'), el('div')),
    el('p',{class:'subtitle'},'Pick a chapter book. Your bookmark saves your place!'),
    shelf));
}

/* ---------- Gianna: spelling check (typed) ---------- */
function sentenceWith(word){
  const re = new RegExp('\\b' + word + '\\b', 'i');
  for (const s of levelDef(K.level).stories){
    const hit = (s.text.replace(/\n+/g,' ').match(/[^.!?]+[.!?]+["”]?/g) || []).find(x => re.test(x) && x.length < 160);
    if (hit) return hit.trim();
  }
  return '';
}
function startSpellCheck(){
  stopAll();
  const words = spellWords(8, 4);
  if (!words.length) return screenHome();
  let i = 0, right = 0;
  const started = Date.now();
  const results = [];
  const finish = async () => {
    K.stars += right;
    if (addReadingTime(Math.min(Date.now() - started, MAX_ACTIVITY_MS))) await celebrateGoal();
    K.sessions.unshift({ id: kid + '_' + Date.now(), date: new Date().toISOString(), level: K.level, title:'Spelling check', kind:'spelling', mode:'spelling',
      total: words.length, correct: right, helped: 0, accuracy: Math.round(right / words.length * 1000) / 10, wcpm: null, quiz: null,
      missed: results.filter(r => !r.ok).map(r => r.w), stars: right, ms: Math.min(Date.now() - started, MAX_ACTIVITY_MS) });
    save();
    confetti(right === words.length ? 90 : 35); beep('level');
    say(right === words.length ? 'Perfect spelling check!' : `You spelled ${right} out of ${words.length} words!`);
    const again = await modal(el('div',{}, el('div',{class:'big-e'},'✏️'), el('h2',{}, right === words.length ? 'Perfect spelling!' : 'Spelling check done!'),
      el('p',{}, `${right} of ${words.length} right · +${right} ⭐`),
      el('div',{class:'spell-summary'}, ...results.map(r => el('span',{class:'chip' + (r.ok ? ' ok' : '')}, (r.ok ? '✓ ' : '✗ ') + r.w)))),
      [['Another check ▶','',true],['Done','gray',false]]);
    again ? startSpellCheck() : screenHome();
  };
  const render = () => {
    if (i >= words.length) return finish();
    const w = words[i], sent = sentenceWith(w);
    const blanked = sent ? sent.replace(new RegExp('\\b' + w + '\\b', 'i'), '_____') : '';
    let checked = false;
    const input = el('input',{type:'text', class:'spell-input', autocomplete:'off', autocapitalize:'off', autocorrect:'off', spellcheck:'false', placeholder:'Type the word'});
    const fb = el('div',{class:'feedback'});
    const next = el('button',{class:'btn big hidden', onclick:()=>{ i++; render(); }}, i < words.length - 1 ? 'Next word ▶' : 'Finish ▶');
    const check = () => {
      if (checked || !input.value.trim()) return;
      checked = true; input.disabled = true;
      const ok = input.value.trim().toLowerCase() === w;
      results.push({ w, ok });
      if (ok){ right++; beep('ok'); burst(pick(['YES!','WOW!','NICE!'])); fb.textContent = '✅ Correct!'; fb.style.color = 'var(--ok)'; input.classList.add('right'); }
      else {
        beep('bad'); fb.textContent = `It's spelled: ${w}`; fb.style.color = 'var(--bad)'; input.classList.add('wrong'); say(`${w} is spelled ${w.split('').join(', ')}`, { rate:0.8 });
        const r = K.words[w] || (K.words[w] = { miss:0, streak:0, mastered:null, last:null, disp:w }); r.miss++; r.streak = 0; r.mastered = null; r.last = todayStr(); save();
      }
      checkBtn.classList.add('hidden'); next.classList.remove('hidden');
    };
    const checkBtn = el('button',{class:'btn big green', onclick:check},'✓ Check');
    input.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); checked ? next.click() : check(); } });
    show(el('div',{class:'screen'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
        el('div',{class:'pageinfo'}, `✏️ Spelling Check · ${i + 1} / ${words.length}`), el('div',{style:'width:80px'})),
      el('div',{class:'card center spell-card'},
        el('p',{class:'q-text'},'Listen, then type the word!'),
        el('div',{class:'row center'},
          el('button',{class:'btn blue big', onclick:()=>say(w, { rate:0.8 })},'🔊 Hear word'),
          sent ? el('button',{class:'btn', onclick:()=>say(sent, { rate:0.9 })},'🔊 Hear it in a sentence') : null),
        blanked ? el('p',{class:'spell-sentence'}, blanked) : null,
        input, fb,
        el('div',{class:'row center', style:'margin-top:10px'}, checkBtn, next))));
    say(w, { rate:0.8 });
    setTimeout(() => { try { input.focus(); } catch(e){} }, 50);
  };
  render();
}
function startSpelling(){
  stopAll();
  const words = spellWords();
  if (!words.length) return screenHome();
  const items = words.map(w => ({ word:w, parts:graphemes(w).map(g => g.g) }));
  const header = () => el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
    el('div',{class:'pageinfo'},'✏️ Spelling Practice'), el('div',{style:'width:80px'}));
  const started = Date.now();
  buildGame(items, words, header, async score => {
    const right = Math.round(score * items.length);
    K.stars += right;
    if (addReadingTime(Math.min(Date.now() - started, MAX_ACTIVITY_MS))) await celebrateGoal();
    K.sessions.unshift({ id: kid + '_' + Date.now(), date: new Date().toISOString(), level: K.level, title:'Spelling practice', kind:'spelling', mode:'spelling',
      total: items.length, correct: right, helped: 0, accuracy: Math.round(score*1000)/10, wcpm: null, quiz: null, missed: [], stars: right, ms: Math.min(Date.now() - started, MAX_ACTIVITY_MS) });
    save();
    confetti(right === items.length ? 80 : 30); beep('level');
    say(right === items.length ? 'Perfect spelling!' : `You spelled ${right} words on the first try!`);
    const again = await modal(el('div',{}, el('div',{class:'big-e'},'✏️'), el('h2',{}, right === items.length ? 'Perfect spelling!' : 'Nice spelling!'),
      el('p',{}, `${right} of ${items.length} on the first try · +${right} ⭐`)), [['Spell more ▶','',true],['Done','gray',false]]);
    again ? startSpelling() : screenHome();
  });
}

/* ---------- building passages ---------- */
function tokensOf(text){
  return text.split(/\s+/).filter(Boolean).map(disp => { const n = norm(disp); return n ? { disp, n } : { disp, n:'', skip:true }; });
}
function buildActivity(levelN, mode){
  const L = levelDef(levelN);
  const wantsStory = L.kind === 'story' || (mode && seriesAt(levelN).includes(mode));
  if (!wantsStory && L.kind === 'letters'){
    const items = shuffle(L.items).slice(0, L.roundSize);
    return { kind:'letters', level:levelN, title:'Letter Sounds', pages: items.map(([l,e,k]) => ({ single:true, letter:l, pic:e, keyword:k, tokens:[{disp:l.toUpperCase()+l, n:l}] })) };
  }
  if (!wantsStory && L.kind === 'words'){
    const items = shuffle(L.items).slice(0, L.roundSize);
    return { kind:'words', level:levelN, title:L.title, pages: items.map(w => ({ single:true, tokens:[{disp:w, n:norm(w)}] })) };
  }
  const { story, index, key, series } = storyFor(levelN, mode);
  const pages = story.text.split(/\n\s*\n/).map(p => ({ tokens: tokensOf(p.trim()) }));
  return { kind:'story', level:levelN, title:story.title, emoji:story.emoji, story, storyIndex:index, storyKey:key, series, pages };
}
function startActivity(series){
  const a = buildActivity(K.level, series);
  if (a.kind === 'story') return startStoryWithSkill(a);
  beginRun(a, { mode:'normal' });
}


/* ---------- placement ---------- */
function placementProbes(){
  const probes = [];
  T.levels.forEach(L => {
    if (L.kind === 'letters') return; // letters handled as the fallback start
    let text;
    if (L.kind === 'words') text = shuffle(L.items).slice(0,5).join(' ');
    else { const st = L.stories[L.stories.length-1]; text = st.text.split(/\n\s*\n/)[0].trim(); }
    probes.push({ level:L.n, page:{ tokens: tokensOf(text) } });
  });
  return probes;
}
function screenPlacementIntro(){
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, homeBtn(), el('div')),
    el('div',{class:'hero'}, mascotNode(), el('div',{}, el('h1',{class:'title'}, kid==='daughter' ? 'Welcome to Skyfire Academy!' : `Hi! I'm ${CAT}!`),
      el('p',{class:'subtitle'}, kid==='daughter' ? 'Master Oona wants to hear you read, so she can pick the right rank for you.' : 'Let\'s read a little so I know where to start!'))),
    el('div',{class:'card', style:'margin-top:24px'},
      el('p',{style:'font-size:22px;margin-top:0'},'Read each line out loud. It\'s okay if it gets hard. That just tells us where to start!'),
      el('div',{class:'row'},
        el('button',{class:'btn big', onclick:()=>startPlacement()},'▶ Let\'s go!'),
        el('button',{class:'btn gray small', onclick:()=>{ K.placed = true; K.level = skipLevel(); save(); screenHome(); }},`Skip: start at Level ${skipLevel()}`))),
    el('button',{class:'gear', onclick:()=>screenPin()},'⚙︎ Grown-ups')
  );
  show(s);
}
// Miles already reads early "Level 2" readers, so skipping placement drops him into short stories, not letter drills.
const SKIP_START = { son: 5, daughter: 1 };
function skipLevel(){ return SKIP_START[kid] || 1; }
function startPlacement(){
  const probes = placementProbes();
  const a = { kind:'placement', level:0, title:'Quick Check', pages: probes.map(p => Object.assign({ probeLevel:p.level }, p.page)) };
  beginRun(a, { mode:'placement' });
}
function finishPlacement(r){
  // walk probes in order; stop at first that scores < 90%
  let start = 1;
  for (const p of r.act.pages){
    const tot = p.tokens.length, ok = p.status.filter(x=>x==='ok').length;
    if (ok / tot >= 0.9) start = p.probeLevel; else break;
  }
  K.level = start; K.placed = true; K.passStreak = 0; K.failStreak = 0; awardTrophiesUpTo(start); save();
  confetti(50); beep('level');
  modal(el('div',{}, el('div',{class:'big-e'}, kid==='daughter'?'🏅':'🎉'),
    el('h2',{}, kid==='daughter' ? `You start at Rank ${start}!` : `You start at Level ${start}!`),
    el('p',{}, levelDef(start).title)), [['Yay! ▶','',1]]).then(()=>{ K.avatar.base ? screenHome() : screenAvatarPick(); });
}

/* ---------- reader ---------- */
let recog = null, recogOn = false, mediaStream = null, recorder = null;
function stopAll(){
  try { if (recog){ recog.onend = null; recog.abort(); } } catch(e){}
  recog = null; recogOn = false;
  try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch(e){}
  try { if (mediaStream) mediaStream.getTracks().forEach(t=>t.stop()); } catch(e){}
  mediaStream = null; recorder = null;
  try { speechSynthesis.cancel(); } catch(e){}
  buildGen++; // stop any spelling/build game still waiting on a timer
}

function beginRun(act, opts){
  stopAll();
  act.pages.forEach(p => { p.status = p.tokens.map(t => t.skip ? 'ok' : null); p.helped = p.tokens.map(()=>false); p.heardFinal = []; p.tries = 0; });
  run = { act, opts, page:0, micMs:0, micStart:null, startedAt:Date.now(), clips:[], sessionId: kid + '_' + Date.now() };
  renderReader();
}

function renderReader(){
  const r = run, a = r.act, p = a.pages[r.page];
  const manual = useManual();
  const single = !!p.single;
  const passage = el('div',{class:'passage' + (single ? ' single' : '') + (p.letter ? ' letter' : '')});
  const focusSet = r.opts.focus ? new Set(r.opts.focus.words) : null;
  p.tokens.forEach((t,i) => {
    const w = el('span',{class:'w' + (focusSet && focusSet.has(t.n) ? ' focus' : '') + (!single && r.opts.focus && heartNew(t.n) ? ' heartw' : ''), 'data-i':i}, t.disp);
    w.addEventListener('click', () => onWordTap(i));
    passage.append(w);
  });
  const isLast = r.page === a.pages.length - 1;
  const hint = el('div',{class:'hint', id:'hint'},
    manual ? 'Read out loud! Grown-up: tap any word that was missed.' :
    single ? (p.letter ? 'Tap the mic and say the letter\'s sound!' : 'Tap the mic and read the word!') : 'Tap the 🎤 and read out loud!');
  const heard = el('div',{class:'heard', id:'heard'});
  const micBtn = manual ? null : el('button',{class:'mic', id:'mic', onclick:toggleMic, 'aria-label':'microphone'},'🎤');
  const nextBtn = el('button',{class:'btn ' + (manual ? 'green' : 'blue'), id:'next', onclick:()=>nextPage(true)}, isLast ? 'Done ✓' : 'Next ▶');
  const checks = single && !manual ? el('div',{class:'grownup-checks'},
      el('button',{class:'btn small green', onclick:()=>gradeSingle(true)},'✓ Grown-up: right'),
      el('button',{class:'btn small red', onclick:()=>gradeSingle(false)},'✗ Missed')) : null;
  const pageCard = el('div',{class:'card page-card'},
    manual ? el('span',{class:'mode-tag'},'grown-up scoring') : null,
    el('div',{}, passage, p.pic ? el('div',{class:'keypic'}, p.pic) : null,
      p.blend ? el('div',{class:'blend-help'}, tileRow(p.tokens[0].disp, true), el('div',{class:'muted center'},'Tap each sound, then read the whole word!')) : null,
      p.heart ? el('div',{class:'heart-help'}, '❤️ Heart word! ', heartWordNode(p.tokens[0].disp), ' — ', p.heart.tip) : null));
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); r.opts.onStop ? r.opts.onStop() : a.kind==='placement' ? screenPlacementIntro() : screenHome(); }},'← Back'),
      el('div',{class:'pageinfo'}, (a.emoji ? a.emoji + ' ' : '') + a.title + ' · ' + (r.page+1) + ' / ' + a.pages.length),
      el('div',{style:'width:80px'})),
    el('div',{class:'reader-wrap'}, pageCard, hint, heard,
      el('div',{class:'controls'},
        (r.opts.echo || kid === 'son') && !single ? el('button',{class:'btn blue', onclick:()=>{ if (recogOn) stopRecog(); readAlong(); }},'👂 Hear it first') : null,
        p.blend && !manual ? el('button',{class:'btn', onclick:()=>{ p.helped[0] = true; paintWords(); say(p.tokens[0].disp, {rate:0.35}); }},'🐢 Say it slowly') : null,
        micBtn, nextBtn), checks)
  );
  show(s);
  paintWords();
}

// Read the page aloud and light up each word as it's spoken (karaoke style).
// Uses the voice's word-boundary events when the device sends them, otherwise a timing estimate.
function readAlong(){
  const p = run.act.pages[run.page], spans = [...document.querySelectorAll('.passage .w')];
  const parts = [], starts = [];
  let text = '';
  p.tokens.forEach((t, i) => { if (t.skip) return; starts.push([text.length, i]); text += t.disp + ' '; parts.push(i); });
  if (!parts.length || !('speechSynthesis' in window)) return;
  const mark = i => spans.forEach((s, j) => s.classList.toggle('karaoke', j === i));
  const rate = 0.8;
  let timer = null, gotBoundary = false, k = 0, done = false;
  const finish = () => { done = true; clearTimeout(timer); mark(-1); };
  const step = () => { if (done || gotBoundary || k >= parts.length) return; const i = parts[k++]; mark(i);
    timer = setTimeout(step, (p.tokens[i].disp.length * 75 + 260) / rate); };
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice){ u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
    u.rate = rate; u.pitch = 1;
    u.onstart = () => step();
    u.onboundary = e => {
      if (e.name && e.name !== 'word') return;
      if (!gotBoundary){ gotBoundary = true; clearTimeout(timer); }
      let hit = starts[0][1]; for (const [at, i] of starts) if (at <= e.charIndex) hit = i;
      mark(hit);
    };
    u.onend = finish; u.onerror = finish;
    speechSynthesis.speak(u);
  } catch(e){ finish(); }
}

function paintWords(){
  const p = run.act.pages[run.page];
  let firstPending = p.status.findIndex(x => x === null);
  document.querySelectorAll('.passage .w').forEach((w,i) => {
    w.classList.toggle('ok', p.status[i] === 'ok' && !p.helped[i]);
    w.classList.toggle('miss', p.status[i] === 'miss');
    w.classList.toggle('help', !!p.helped[i]);
    w.classList.toggle('cur', recogOn && i === firstPending);
    if (p.tokens[i].skip){ w.className = 'w pic'; }
  });
}

function onWordTap(i){
  const p = run.act.pages[run.page];
  if (p.tokens[i].skip) return;
  if (useManual()){
    p.status[i] = p.status[i] === 'miss' ? null : 'miss';
    beep('tap'); paintWords(); return;
  }
  // listening mode: tap = hear the word (counts as helped)
  p.helped[i] = true; paintWords();
  const t = p.tokens[i];
  if (run.opts.focus && run.opts.focus.words.includes(t.n)){
    const old = $('.tile-pop'); if (old) old.remove();
    const pop = el('div',{class:'tile-pop'}, tileRow(t.disp, true), el('button',{class:'btn small gray', onclick:()=>pop.remove()},'✕'));
    document.body.append(pop); setTimeout(()=>pop.remove(), 6000);
    const gs = graphemes(t.disp).filter(g => g.sound);
    let k = 0; const nextSnd = () => { if (k < gs.length) { say(gs[k++].sound, {rate:0.8}).then(nextSnd); } else say(t.disp, {rate:0.8}); };
    nextSnd();
  } else say(t.disp, { rate:0.8 });
}

function gradeSingle(ok){
  const p = run.act.pages[run.page];
  p.status = p.status.map(() => ok ? 'ok' : 'miss');
  beep(ok ? 'ok' : 'bad'); paintWords();
  setTimeout(()=>nextPage(false, true), ok ? 500 : 900);
}

async function toggleMic(){
  if (recogOn){ stopRecog(); return; }
  startRecog();
}
async function startRecog(){
  const p = run.act.pages[run.page];
  try { speechSynthesis.cancel(); } catch(e){}
  if (DB.record && window.MediaRecorder && !recorder){
    try {
      mediaStream = mediaStream || await navigator.mediaDevices.getUserMedia({ audio:true });
      recorder = new MediaRecorder(mediaStream);
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { if (chunks.length) run && run.clips.push(new Blob(chunks, { type: chunks[0].type || 'audio/mp4' })); recorder = null; };
      recorder.start();
    } catch(e){ recorder = null; }
  }
  try {
    recog = new SR();
    recog.lang = 'en-US'; recog.continuous = true; recog.interimResults = true; recog.maxAlternatives = 3;
  } catch(e){ setHint('Listening is not available here. Ask a grown-up to turn on grown-up scoring.'); return; }
  recog.onresult = ev => {
    micFails = 0;
    const pg = run.act.pages[run.page];
    let interim = [];
    const altsAll = [];
    for (let i = ev.resultIndex; i < ev.results.length; i++){
      const res = ev.results[i];
      const best = tokenizeHeard(res[0].transcript);
      for (let a = 0; a < res.length; a++) altsAll.push(...tokenizeHeard(res[a].transcript));
      if (res.isFinal) pg.heardFinal.push(...best); else interim.push(...best);
    }
    const heardAll = pg.heardFinal.concat(interim);
    const hd = $('#heard'); if (hd) hd.textContent = heardAll.slice(-12).join(' ');
    if (pg.single){
      const pool = heardAll.concat(altsAll);
      const ok = pg.letter ? letterMatch(pg.letter, pg.keyword, pool) : pool.some(h => wordMatch(pg.tokens[0].n, h, true));
      if (ok){ if (pg.done) return; pg.done = true; pg.status[0] = 'ok'; paintWords(); beep('ok'); flash(0); setTimeout(()=>nextPage(false, true), 700); }
      else if (ev.results[ev.results.length-1].isFinal){
        pg.tries++; beep('bad'); setHint(pg.tries >= 2 ? 'Hmm, try once more, or a grown-up can tap ✓ or ✗.' : 'Almost! Try again.');
      }
      return;
    }
    const idx = pg.tokens.map((t,i) => t.skip ? -1 : i).filter(i => i >= 0);
    const st = align(idx.map(i => pg.tokens[i].n), heardAll, false);
    // never downgrade a word already marked ok
    st.forEach((v,j) => { const i = idx[j]; if (pg.status[i] !== 'ok') pg.status[i] = v; });
    paintWords();
    if (pg.status.every(x => x !== null) && !pg.done){
      pg.done = true; beep('ok'); burst(); setHint('Great reading! 🌟');
      setTimeout(()=>nextPage(false, true), 900);
    }
  };
  recog.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setHint('Please allow the microphone. (iPad: Settings › Safari › Microphone, and turn on Siri & Dictation.)');
    else if (e.error === 'no-speech') setHint('I didn\'t hear anything. Tap the 🎤 and try again!');
    else if (e.error === 'audio-capture'){ setHint('The mic is busy. Turning off recordings and trying again…'); DB.record = false; save(); }
    if (e.error !== 'no-speech' && e.error !== 'aborted') micFailed();
  };
  recog.onend = () => {
    if (recogOn){ // ended on its own (silence or iOS timeout)
      endMicTime(); recogOn = false; updateMicBtn(); paintWords();
      const pg = run && run.act.pages[run.page];
      if (pg && pg.status.some(x=>x===null)) setHint('Tap the 🎤 to keep reading, or tap Next.');
    }
  };
  try { recog.start(); recogOn = true; run.micStart = Date.now(); updateMicBtn(); setHint('I\'m listening… 👂'); paintWords(); }
  catch(e){ setHint('Could not start listening. Tap the 🎤 again.'); micFailed(); }
}
function endMicTime(){ if (run && run.micStart){ run.micMs += Date.now() - run.micStart; run.micStart = null; } }
function stopRecog(){
  endMicTime();
  recogOn = false;
  try { if (recog){ recog.onend = null; recog.stop(); } } catch(e){}
  recog = null;
  try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch(e){}
  updateMicBtn(); paintWords();
}
function updateMicBtn(){ const m = $('#mic'); if (m){ m.classList.toggle('on', recogOn); m.textContent = recogOn ? '⏹' : '🎤'; } }
function setHint(t){ const h = $('#hint'); if (h) h.textContent = t; }
function flash(i){ const w = document.querySelectorAll('.passage .w')[i]; if (w){ w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash'); } }

function nextPage(manualPress, keepMic){
  if (!run) return;
  const isLastPage = run.page >= run.act.pages.length - 1;
  if (recogOn && (!keepMic || isLastPage)) stopRecog();
  const p = run.act.pages[run.page];
  p.done = true;
  // anything not confirmed counts as missed (manual mode: unmarked = read correctly)
  p.status = p.status.map(x => x === null ? (useManual() ? 'ok' : 'miss') : x);
  if (run.act.kind === 'placement' && p.status.filter(x=>x==='ok').length / p.tokens.length < 0.9){
    if (recogOn) stopRecog();
    run.act.pages = run.act.pages.slice(0, run.page + 1);   // stop at the first probe that's too hard
    return finishReading();
  }
  if (!isLastPage){ run.page++; renderReader(); if (recogOn){ updateMicBtn(); setHint('I\'m still listening… keep reading! 👂'); paintWords(); } return; }
  finishReading();
}

function computeReading(){
  let total = 0, correct = 0, helped = 0; const missed = [];
  run.act.pages.forEach(p => p.tokens.forEach((t,i) => {
    if (t.skip) return;
    total++;
    if (p.helped[i]) { helped++; missed.push(t.n); if (kid === 'son') correct += 0.5; }
    else if (p.status[i] === 'ok') correct++;
    else missed.push(t.n);
  }));
  const minutes = Math.max(run.micMs || (Date.now() - run.startedAt), 1000) / 60000;
  correct = Math.round(correct*2)/2;
  return { total, correct, helped, missed: missed.filter(Boolean), accuracy: total ? correct/total : 0,
           wcpm: run.act.kind === 'story' && correct / minutes < 400 ? Math.round(correct / minutes) : null };
}

function finishReading(){
  stopAll();
  if (run.opts.onDone){ const res = computeReading(); return run.opts.onDone(res, run.act); }
  if (run.act.kind === 'placement') return finishPlacement(run);
  run.reading = computeReading();
  const a = run.act;
  const hasQuiz = a.kind === 'story' && run.opts.mode === 'normal';
  if (hasQuiz) screenQuiz(); else screenResults();
}

/* ---------- quiz ---------- */
function screenQuiz(){
  const qs = run.act.story.qs.slice(0, 5).map(([q, opts, ans]) => ({ q, opts: shuffle(opts.map((o,i)=>({ t:o, right:i===ans }))) }));
  run.quiz = { qs, i:0, correct:0 };
  renderQuestion();
}
function renderQuestion(){
  const Q = run.quiz, item = Q.qs[Q.i];
  let answered = false;
  const fb = el('div',{class:'feedback'});
  const nextBtn = el('button',{class:'btn hidden', onclick:()=>{ Q.i++; Q.i < Q.qs.length ? renderQuestion() : (run.opts.focus ? storyBuilder(run.opts.focus, screenResults) : screenResults()); }}, Q.i < Q.qs.length-1 ? 'Next question ▶' : 'See my stars ⭐');
  const opts = el('div',{class:'options'});
  const proofBox = el('div',{class:'proof-box hidden'});
  item.opts.forEach(o => {
    const b = el('button',{class:'opt'}, el('span',{}, o.t),
      el('span',{class:'say', onclick:ev=>{ ev.stopPropagation(); say(o.t); }}, '🔊'));
    b.addEventListener('click', () => {
      if (answered) return; answered = true;
      if (o.right){ b.classList.add('right'); Q.correct++; beep('ok'); burst(); fb.textContent = pick(['Yes! 🎉','You got it! ⭐','Awesome! 🙌','Correct! 🌟']); fb.style.color = 'var(--ok)'; startProof(o.t); }
      else {
        b.classList.add('wrong'); beep('bad'); fb.textContent = 'Good try! The answer is highlighted in green.'; fb.style.color = 'var(--bad)';
        [...opts.children].forEach((c, idx) => { if (item.opts[idx].right) c.classList.add('right'); });
      }
      nextBtn.classList.remove('hidden');
    });
    opts.append(b);
  });
  // Gianna's quiet reads: after a right answer, find the sentence in the story that proves it (+1 ⭐).
  // Skipped for feeling/opinion questions where no single sentence clearly says the answer.
  const startProof = answer => {
    if (!run.act.quiet) return;
    const sc = proofScores(card.sentences, item.q, answer.replace(/[^\w\s'’-]/g,' ')), best = Math.max(0, ...sc);
    if (best < 2) return;
    let tries = 0;
    proofBox.classList.remove('hidden');
    proofBox.textContent = '🔎 Bonus: tap the sentence in the story that proves your answer!';
    card.proof((s, spans) => {
      card.sentSpans.forEach(sp => (sp || []).forEach(n => n.classList.remove('proof-pick','proof-ok','proof-no')));
      if (sc[s] >= Math.max(2, best * 0.6)){
        spans.forEach(n => n.classList.add('proof-ok')); card.proof(null);
        run.proofStars = (run.proofStars || 0) + 1; beep('star'); burst('PROOF!');
        proofBox.textContent = '🔎 Great detective work! That sentence proves it. +1 ⭐';
      } else if (++tries < 2){
        spans.forEach(n => n.classList.add('proof-no')); beep('bad');
        proofBox.textContent = '🔎 Hmm, not that one. Look for the sentence that talks about the answer!';
      } else {
        card.proof(null);
        card.sentSpans[sc.indexOf(best)].forEach(n => n.classList.add('proof-ok'));
        proofBox.textContent = '🔎 Here\'s the sentence that proves it, in green.';
      }
    });
  };
  const st = run.act.story;
  const card = passageCard(run.act.book
      ? `${run.act.book.emoji} ${run.act.book.title} · Chapter ${run.act.chapterIndex + 1} of ${run.act.book.chapters.length}: ${st.title}`
      : (st.emoji ? st.emoji + ' ' : '') + st.title,
    st.text, run.marks || (run.marks = {}));
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); const book = run && run.act.book; run = null; book ? screenBookshelf() : screenHome(); }},'← Back'),
      el('div',{class:'pageinfo'}, '🤔 Question ' + (Q.i+1) + ' of ' + Q.qs.length), el('div',{style:'width:80px'})),
    el('div',{class:'quiz-layout'},
      card,
      el('div',{class:'card'},
        el('div',{class:'row', style:'align-items:flex-start'},
          el('p',{class:'q-text grow'}, item.q),
          el('button',{class:'btn small blue', onclick:()=>say(item.q)},'🔊')),
        opts, fb, proofBox, el('div',{class:'row', style:'margin-top:10px'}, nextBtn))));
  show(s);
  if (kid === 'son'){ (async()=>{ await say(item.q); })(); }
}
const pick = a => a[Math.floor(Math.random()*a.length)];
/* Kid-friendly meanings for harder words in the stories (📖 Meaning tool). Keys are base forms;
   defFor() also finds -s, -es, -ed, -ing, -ly forms. */
const GLOSSARY = {
  academy:'a special school', apprentice:'someone who is just starting to learn a skill', merchant:'a person who buys and sells things',
  staff:'a tall walking stick', practice:'to do something again and again to get better', gift:'a special talent; or a present',
  glow:'to shine with a soft light', magic:'a power that makes impossible things happen', floating:'resting on air or water without sinking',
  crystal:'a clear, shiny stone', fade:'to slowly get weaker or dimmer', dangerous:'likely to hurt you; not safe',
  droop:'to hang down, tired or sad', mysterious:'strange and hard to explain', stranger:'someone you don\'t know',
  cloak:'a loose coat with no sleeves', firmly:'in a strong, sure way', pale:'light in color, almost white',
  trust:'to believe someone is honest and good', wagon:'a cart with four wheels', goods:'things for sale',
  winding:'twisting and turning', staircase:'a set of stairs', velvet:'a soft, fuzzy cloth', sparkling:'shining with tiny flashes of light',
  rare:'not often found; special', hatch:'to break out of an egg', bond:'a close, special friendship',
  cruel:'mean and hurtful on purpose', control:'to make something do what you want', shiver:'to shake a little from cold or fear',
  kneel:'to rest on your knees', allowed:'given permission', nervously:'in a worried, jumpy way', courage:'being brave even when you\'re scared',
  shadow:'a dark shape made when something blocks light', foam:'to make lots of tiny bubbles', leap:'to jump high or far',
  skid:'to slide without meaning to', tumble:'to fall and roll over', whisper:'to talk very softly', rustle:'to make a soft, crackly sound',
  clearing:'an open space in a forest', crooked:'bent, not straight', knotted:'tied or twisted together', freeze:'to stop moving suddenly',
  scales:'small hard plates that cover a dragon or fish', sprite:'a small magical creature', flatten:'to press down flat',
  trap:'to catch and keep someone from leaving', warn:'to tell someone about danger', deal:'an agreement between two people',
  rumble:'a deep, rolling sound', canyon:'a deep valley with steep rock sides', entirely:'completely', vanish:'to disappear suddenly',
  tremble:'to shake', pound:'to beat hard and fast', brilliant:'very bright; or very smart', effort:'hard work and trying',
  glisten:'to shine because it is wet', refuse:'to say no', exhausted:'extremely tired', collapse:'to fall down suddenly',
  sturdy:'strong and hard to break', gargoyle:'a stone statue of a scary creature', distract:'to pull someone\'s attention away',
  cluttered:'messy and full of stuff', enormous:'very, very big', boulder:'a very large rock', swirl:'to spin around and around',
  grip:'to hold on tightly', flicker:'to shine on and off quickly', shrivel:'to dry up and shrink', budge:'to move a tiny bit',
  spiral:'curling around and around, like a spring', lash:'to hit hard, like rain in a storm', howl:'to make a long, loud cry',
  zigzag:'going sharply one way, then the other', shriek:'a high, loud scream', flinch:'to jerk back because you\'re scared',
  command:'to give an order', drizzle:'light, gentle rain', lonely:'sad because you are alone', earn:'to get something by working for it',
  genuinely:'really and truly', crescent:'shaped like a thin, curved moon', fascinated:'very, very interested', observe:'to watch carefully',
  gracefully:'in a smooth, beautiful way', stern:'serious and strict', expression:'the look on someone\'s face',
  ceremony:'a special event to celebrate something', extraordinary:'very unusual and amazing', fasten:'to attach or close tightly',
  rafters:'the beams that hold up a roof', ancient:'very, very old', restless:'not able to stay still or calm', magnificent:'beautiful and grand',
  patience:'waiting calmly without getting upset', delicate:'fine and easy to break', facet:'one flat, shiny side of a gem',
  bustling:'busy and full of people', chaos:'a big, wild mess', grateful:'thankful', expedition:'a trip to explore a place',
  breathtaking:'so beautiful it surprises you', chandelier:'a fancy hanging light with many parts', shimmer:'to shine with a soft, wavy light',
  desperately:'needing something very badly', navigator:'the person who figures out which way to go', spyglass:'a small telescope',
  miserable:'very unhappy', cautious:'careful to stay safe', suspiciously:'in a way that shows you don\'t trust something',
  curious:'wanting to know or learn more', battered:'old and worn out from use', sketch:'to draw quickly',
  frantic:'wildly worried and rushing', grid:'a pattern of squares made by crossing lines', stakeout:'watching quietly to see what happens',
  responsible:'doing what you promised, and doing it well', latch:'a small lock that keeps a gate or door shut', flyer:'a paper that tells people about something',
  official:'real and approved', memory:'something you remember', appropriate:'right for the time or place', anniversary:'the same date as a special event, years later',
  program:'a planned group or set of activities', guilty:'feeling bad because you did something wrong', relieved:'happy that a worry is gone',
  furious:'very, very angry', retrace:'to go back the same way you came', mystery:'something strange that needs to be figured out',
  detective:'someone who solves mysteries by finding clues', clue:'a hint that helps solve a mystery', expert:'someone who knows a lot about something',
  lighthouse:'a tall tower with a bright light that guides ships', horizon:'the line where the sky seems to meet the land or sea',
  creak:'to make a squeaky sound, like an old door', echo:'a sound that bounces back so you hear it again', signal:'a sign that sends a message',
  telescope:'a tube that makes faraway things look close', journal:'a book where you write about your days', inherit:'to receive something from someone in your family',
  lantern:'a light you can carry', tide:'the rising and falling of the sea each day', gust:'a quick, strong rush of wind', puzzled:'confused; not sure what something means'
};
function defFor(raw){
  const w = norm(raw);
  if (!w) return null;
  const tries = [w, w.replace(/ies$/,'y'), w.replace(/es$/,''), w.replace(/s$/,''), w.replace(/ed$/,''), w.replace(/ed$/,'e'), w.replace(/d$/,''),
    w.replace(/ing$/,''), w.replace(/ing$/,'e'), w.replace(/ly$/,''), w.replace(/ily$/,'y'), w.replace(/([a-z])\1(ed|ing)$/,'$1'), w.replace(/elt$/,'eel'), w.replace(/oze$/,'eeze'), w.replace(/eapt$/,'eap')];
  for (const t of tries) if (GLOSSARY[t]) return GLOSSARY[t];
  return null;
}
function showDef(word){
  const old = $('.def-pop'); if (old) old.remove();
  const clean = word.replace(/[^A-Za-z'’-]/g,''), d = defFor(clean);
  const pop = el('div',{class:'def-pop'},
    el('div',{}, el('b',{class:'def-word'}, clean), el('div',{class:'def-text'}, d ? d : 'No meaning saved for this word yet. Try asking a grown-up!')),
    el('button',{class:'btn small blue', onclick:()=>say(d ? `${clean}. ${d}` : clean)},'🔊'),
    el('button',{class:'btn small gray', onclick:()=>pop.remove()},'✕'));
  document.body.append(pop); setTimeout(() => pop.remove(), 9000);
  say(d ? `${clean}. ${d}` : clean, { rate:0.9 });
}

// "Find the proof": which sentence best backs up an answer, by shared content words with the answer (and the question).
const STOP = new Set('the a an and or but to of in on at for with from by is are was were be been it its this that these those he she they them his her their you your we our i my me as so if then than not no yes do did does done have has had what who whom where when why how which there here into onto out up down over under very just also can could would should will shall about after before because while until'.split(' '));
const contentWords = s => s.toLowerCase().replace(/[^a-z' ]/g,' ').split(/\s+/).map(w => w.replace(/'s$/,'')).filter(w => w.length > 2 && !STOP.has(w));
function proofScores(sentences, question, answer){
  const aw = new Set(contentWords(answer)), qw = new Set(contentWords(question));
  return sentences.map(s => { const sw = new Set(contentWords(s)); let sc = 0; aw.forEach(w => { if (sw.has(w)) sc += 2; }); qw.forEach(w => { if (sw.has(w)) sc += 1; }); return sc; });
}

// The story stays on screen during questions so kids can look back for the answer.
// Tools: highlight / underline / erase words to mark clues, or 📖 tap a word for its meaning.
// `marks` ({ "para-word": {h, u} }) lives on the run, so marks stay put from one question to the next.
// card.proof(handler) turns on "tap the sentence that proves it": handler(sentenceIndex, spans).
let markTool = 'h';
function passageCard(title, text, marks){
  marks = marks || {};
  const paint = (n, m) => { n.classList.toggle('hl', !!(m && m.h)); n.classList.toggle('ul', !!(m && m.u)); };
  const apply = (n, toggle) => {
    if (markTool === 'm'){ if (toggle) showDef(n.textContent); return; }
    const k = n.dataset.k, m = marks[k] || (marks[k] = {});
    if (markTool === 'e'){ m.h = false; m.u = false; } else m[markTool] = toggle ? !m[markTool] : true;
    paint(n, m);
  };
  const body = el('div',{class:'mark-body' + (markTool === 'm' ? ' meaning' : '')});
  const sentences = [], sentSpans = [];
  let si = 0, cur = '';
  text.split(/\n\s*\n/).forEach((p, pi) => {
    const para = el('p',{});
    p.trim().split(/\s+/).forEach((w, wi) => {
      const n = el('span',{class:'mw' + (defFor(w) ? ' has-def' : ''), 'data-k': pi + '-' + wi, 'data-s': si}, w);
      paint(n, marks[pi + '-' + wi]); para.append(n, ' ');
      (sentSpans[si] = sentSpans[si] || []).push(n); cur += w + ' ';
      if (/[.!?]["”’)]*$/.test(w)){ sentences[si] = cur.trim(); cur = ''; si++; }
    });
    if (cur){ sentences[si] = cur.trim(); cur = ''; si++; }
    body.append(para);
  });
  const tools = el('div',{class:'mark-tools'});
  const drawTools = () => {
    tools.innerHTML = '';
    [['h','🖍️ Highlight'],['u','U̲ Underline'],['e','🧽 Erase'],['m','📖 Meaning']].forEach(([t, label]) =>
      tools.append(el('button',{class:'mark-tool' + (markTool === t ? ' on' : ''), onclick:()=>{ markTool = t; body.classList.toggle('meaning', t === 'm'); drawTools(); }}, label)));
    tools.append(el('button',{class:'mark-tool', onclick:()=>{ Object.keys(marks).forEach(k => delete marks[k]); body.querySelectorAll('.mw').forEach(n => paint(n, null)); }},'↺ Clear'));
  };
  drawTools();
  let proofHandler = null;
  // tap a word to toggle; slide sideways across words to mark a phrase (up/down still scrolls)
  let dragging = false, moved = false, last = null;
  body.addEventListener('pointerdown', e => { const n = e.target.closest('.mw'); if (!n) return; dragging = true; moved = false; last = n; });
  body.addEventListener('pointermove', e => {
    if (!dragging || proofHandler || markTool === 'm') return;
    const t = document.elementFromPoint(e.clientX, e.clientY), n = t && t.closest ? t.closest('.mw') : null;
    if (n && n !== last && body.contains(n)){ if (!moved){ apply(last, false); moved = true; } apply(n, false); last = n; }
  });
  body.addEventListener('pointerup', () => {
    if (dragging && !moved && last){ if (proofHandler){ const s = +last.dataset.s; proofHandler(s, sentSpans[s]); } else apply(last, true); }
    dragging = false;
  });
  body.addEventListener('pointercancel', () => { dragging = false; });
  const card = el('div',{class:'card quiz-passage'},
    el('div',{class:'series-tag'},'📖 Look back in the story'),
    el('h3',{}, title),
    el('p',{class:'muted', style:'margin:0 0 4px'},'Tap a word or slide across words to mark clues. 📖 Meaning: tap a word to learn what it means.'),
    tools, body);
  card.sentences = sentences; card.sentSpans = sentSpans;
  card.proof = fn => { proofHandler = fn; body.classList.toggle('proof', !!fn); };
  return card;
}

/* ---------- results + leveling ---------- */
function screenResults(){
  const r = run, R = r.reading, a = r.act;
  const quiz = r.quiz ? { c:r.quiz.correct, t:r.quiz.qs.length } : null;
  const starsFor = () => {
    const L = levelDef(a.level);
    const passAcc = a.kind === 'story' ? 0.95 : (L.pass || 0.9);
    const passQ = !quiz || quiz.c / quiz.t >= 0.8;
    if (R.accuracy >= passAcc && passQ) return 3;
    if (R.accuracy >= 0.85 && (!quiz || quiz.c / quiz.t >= 0.6)) return 2;
    return 1;
  };
  const statsBox = el('div',{class:'result-grid'});
  const fixBox = el('div',{class:'fixwords hidden'});
  const starsBox = el('div',{class:'stars'});
  let committed = false;
  const commitOnce = () => { if (committed) return; committed = true; commitResults(starsFor(), quiz); };
  const countsForLevel = r.opts.mode === 'normal' && a.level === K.level && K.level < T.levels.length;
  const lvlNote = countsForLevel ? el('div',{class:'lvl-note'}) : null;
  const paint = () => {
    const st = starsFor();
    starsBox.innerHTML = ''; for (let i=0;i<3;i++) starsBox.append(el('span',{}, i < st ? '⭐' : '☆'));
    if (lvlNote){
      const have = Math.min((K.passStreak||0) + (st === 3 ? 1 : 0), LEVEL_UP_STREAK);
      lvlNote.textContent = st === 3
        ? (have >= LEVEL_UP_STREAK ? `🎉 That's ${LEVEL_UP_STREAK} great reads. ${kid === 'daughter' ? 'Rank' : 'Level'} up!` : `✅ This counts! ${have} of ${LEVEL_UP_STREAK} toward the next ${kid === 'daughter' ? 'rank' : 'level'}.`)
        : starsFor() === 2 ? `Good read! Your level-up count stays at ${Math.min(K.passStreak||0, LEVEL_UP_STREAK)} of ${LEVEL_UP_STREAK}. Get ${a.quiet ? '4 or 5 right' : '⭐⭐⭐'} to add one.`
        : a.quiet ? `Get 4 or 5 questions right for a story to count toward the next rank.`
        : `Get ⭐⭐⭐ for a read to count toward the next level.`;
    }
    statsBox.innerHTML = '';
    if (!a.quiet) statsBox.append(el('div',{class:'stat'}, el('b',{}, Math.round(R.accuracy*100)+'%'), el('span',{},'words read right')));
    if (R.wcpm != null) statsBox.append(el('div',{class:'stat'}, el('b',{}, R.wcpm), el('span',{},'words per minute')));
    if (quiz) statsBox.append(el('div',{class:'stat'}, el('b',{}, quiz.c + '/' + quiz.t), el('span',{},'questions right')));
    if (r.proofStars) statsBox.append(el('div',{class:'stat'}, el('b',{}, '🔎 ' + r.proofStars), el('span',{},'proofs found (+1 ⭐ each)')));
    if (R.helped) statsBox.append(el('div',{class:'stat'}, el('b',{}, R.helped), el('span',{},'words helped')));
  };
  // grown-up fix: list every word; tap toggles ok/miss
  const buildFix = () => {
    fixBox.innerHTML = '';
    fixBox.append(el('p',{class:'muted'},'Grown-up: tap a word to switch it between ✓ right (green) and ✗ missed (red). Scores update before saving.'));
    a.pages.forEach(p => p.tokens.forEach((t,i) => {
      if (t.skip) return;
      const w = el('span',{class:'w ' + (p.status[i]==='ok' && !p.helped[i] ? 'ok' : 'miss')}, t.disp);
      w.addEventListener('click', () => {
        if (p.status[i] === 'ok' && !p.helped[i]){ p.status[i] = 'miss'; }
        else { p.status[i] = 'ok'; p.helped[i] = false; }
        run.reading = Object.assign(computeReading(), { wcpm: R.wcpm });
        Object.assign(R, run.reading);
        w.className = 'w ' + (p.status[i]==='ok' ? 'ok' : 'miss'); paint();
      });
      fixBox.append(w);
    }));
  };
  paint();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      // going back still saves the stars and progress from this read
      el('button',{class:'btn ghost small', onclick:commitOnce},'← Back'),
      el('h1',{class:'title'}, r.opts.mode==='practice' ? 'Practice done!' : 'You did it!'), el('div')),
    el('div',{class:'card'},
      el('div',{class:'result-avatar'}),
      starsBox,
      el('h2',{class:'center', style:'margin:6px 0'}, (a.emoji||'') + ' ' + a.title),
      lvlNote,
      statsBox,
      r.opts.focus ? (()=>{ const f = scoreFocus(a, r.opts.focus), st = skillsState()[r.opts.focus.id] || { reads:0, right:0, stories:0 };
        return el('div',{class:'skill-line'}, el('b',{}, `⚡ ${r.opts.focus.lesson.title} skill: `), `${f.right} of ${f.reads} pattern words read right this story`,
          el('span',{class:'muted'}, skillKnown(r.opts.focus.id) ? ' · ✅ mastered' : ` · ${st.stories} of 2+ stories toward mastery`)); })() : null,
      a.quiet ? null : R.missed.length ? el('p',{style:'font-size:20px'}, 'Words to practice: ', ...[...new Set(R.missed)].slice(0,8).map(w => el('span',{class:'chip', onclick:()=>say(w)}, '🔊 ' + w))) : el('p',{style:'font-size:22px'},'Every word right! 🎉'),
      el('div',{class:'row', style:'margin-top:16px'},
        el('button',{class:'btn big green', onclick:commitOnce},'Continue ▶'),
        a.quiet ? null : el('button',{class:'btn small gray', onclick:()=>{ if (fixBox.classList.contains('hidden')){ buildFix(); fixBox.classList.remove('hidden'); } else fixBox.classList.add('hidden'); }},'✎ Grown-up fix')),
      fixBox));
  show(s);
  beep('star'); if (starsFor() === 3) confetti(40);
  const av = $('.result-avatar'); if (av) av.append(avatarNode(110));
}

async function commitResults(stars, quiz){
  const r = run, R = r.reading, a = r.act;
  const L = levelDef(a.level);
  const now = new Date();
  // time + daily goal (the streak grows on days the goal is reached)
  const elapsed = Math.min(Date.now() - r.startedAt, MAX_ACTIVITY_MS);
  const goalJustHit = addReadingTime(elapsed);
  // word tracker: misses go on the practice list; 3 correct reads in a row = mastered
  const mastered = a.quiet ? [] : trackWords(a); // quiet reading isn't scored word by word
  K.stars += stars + (r.proofStars || 0);
  if (quiz) K.quizStreak = quiz.c === quiz.t ? (K.quizStreak||0) + 1 : 0;

  // session record
  const rec = { id:r.sessionId, date: now.toISOString(), level:a.level, title:a.title, kind:a.kind, mode:r.opts.mode, series:a.series||null,
    total:R.total, correct:R.correct, helped:R.helped, accuracy: a.quiet && quiz ? Math.round(quiz.c / quiz.t * 1000)/10 : Math.round(R.accuracy*1000)/10, wcpm:R.wcpm,
    quiz: quiz ? quiz.c + '/' + quiz.t : null, missed:[...new Set(R.missed)].slice(0,20), stars, hasRec: r.clips.length > 0, ms: elapsed };
  K.sessions.unshift(rec); K.sessions = K.sessions.slice(0, 200);
  if (r.clips.length) idb.put(r.sessionId, r.clips);

  let levelMsg = null, levelUp = false, bookDone = null, bookMsg = null;
  if (r.opts.mode === 'normal'){
    if (a.kind === 'story') K.storyIdx[a.storyKey] = (K.storyIdx[a.storyKey]||0) + 1;
    if (a.book){ // chapter books: move the bookmark on a decent score, otherwise re-read this chapter
      const B = bookState(a.book.id);
      if (quiz && quiz.c >= 3){
        if (a.chapterIndex >= B.ch) B.ch = a.chapterIndex + 1;
        if (B.ch >= a.book.chapters.length){ B.ch = 0; B.finished = (B.finished || 0) + 1; bookDone = a.book; K.stars += 10; }
      } else bookMsg = `📖 Read Chapter ${a.chapterIndex + 1} of ${a.book.title} again, then you can go on to the next chapter!`;
    }
    const passAcc = a.kind === 'story' ? 0.95 : (L.pass || 0.9);
    const failAcc = a.kind === 'story' ? 0.85 : (a.kind === 'letters' ? 0.6 : 0.7);
    const passed = R.accuracy >= passAcc && (!quiz || quiz.c / quiz.t >= 0.8);
    const failed = R.accuracy < failAcc || (quiz && quiz.c / quiz.t < 0.6);
    // a great read adds to the level-up count, a rough read starts it over, an okay read leaves it alone
    if (passed){ K.passStreak++; K.failStreak = 0; }
    else if (failed){ K.failStreak++; K.passStreak = 0; }
    else K.failStreak = 0;
    if (K.passStreak >= 3 && K.level < T.levels.length){ K.level++; K.passStreak = 0; levelUp = true; }
    else if (K.failStreak >= 2 && K.level > 1){ K.level--; K.failStreak = 0;
      levelMsg = kid==='daughter' ? '🛡️ Training mission! Let\'s build your dragon skills with some practice stories.' : '💪 Practice time! Let\'s make your reading muscles super strong.'; }
  }
  save();

  if (r.opts.focus) await commitSkill(a, r.opts.focus);
  // rewards
  if (mastered.length){
    confetti(50); beep('level'); say(`You mastered ${mastered.length === 1 ? 'a tricky word' : mastered.length + ' tricky words'}!`);
    await modal(el('div',{}, el('div',{class:'big-e'},'🎯'), el('h2',{}, 'Word mastered!'),
      el('p',{}, mastered.map(w => (K.words[w].disp||w)).join(', ') + ' — read right 3 times in a row!')), [['Yes! ▶','',1]]);
  }
  if (stars >= 2 && r.opts.mode === 'normal') await giveReward();
  if (levelUp){
    const newTrophies = awardTrophiesUpTo(K.level); save();
    confetti(120); beep('level');
    say(kid==='daughter' ? `Amazing! You reached rank ${K.level}!` : `Wow! You made it to level ${K.level}!`);
    const tr = TROPHIES[kid][K.level-1];
    await modal(el('div',{}, el('div',{class:'big-e'}, tr ? tr[0] : '🏆'),
      el('h2',{}, (kid==='daughter' ? 'New Rank: ' : 'Level ') + K.level + '!'),
      el('p',{}, (tr ? 'You won the ' + tr[1] + ' trophy! ' : '') + levelDef(K.level).title + ' unlocked.'),
      K.level === AVATAR_UNLOCK_LEVEL ? el('p',{style:'font-weight:700;color:#7c3aed'}, '🎁 A new reading buddy is unlocked in the Star Shop!') : null,
      legendaryAt(K.level) ? el('p',{style:'font-weight:700;color:#d97706'}, '✨ A legendary ' + (kid==='daughter'?'dragon':'Pocket Pal') + ' can now appear!') : null), [['Awesome! ▶','',1]]);
  }
  if (goalJustHit) await celebrateGoal();
  if (bookDone){
    confetti(140); beep('level'); say(`You finished the book ${bookDone.title}!`);
    await modal(el('div',{}, el('div',{class:'big-e'}, '📚' + bookDone.emoji), el('h2',{}, 'You finished a chapter book!'),
      el('p',{}, `${bookDone.title}: all ${bookDone.chapters.length} chapters! +10 ⭐`)), [['Hooray! ▶','',1]]);
  }
  await checkBadges();
  run = null;
  screenHome([levelMsg, bookMsg].filter(Boolean).join(' ') || null);
}

function legendaryAt(level){ return T.rewards.find(r => r[3] === level); }
async function giveReward(){
  const list = T.rewards;
  const owned = new Set(K.collection);
  const eligible = list.filter(r => !owned.has(r[1]) && (r[3]||0) <= K.level);
  // legendaries the kid has unlocked come first; otherwise normal order
  const available = eligible.filter(r => r[3]).concat(kid==='son' ? shuffle(eligible.filter(r => !r[3])) : eligible.filter(r => !r[3]));
  if (!available.length){
    K.stars += 3; save(); beep('star');
    await modal(el('div',{}, el('div',{class:'big-e'},'🎁'), el('h2',{},'Bonus stars!'), el('p',{},'You found everyone at this level! +3 ⭐ for the Star Shop. Level up to unlock legendary friends!')), [['Yay! ▶','',1]]);
    return;
  }
  if (kid === 'daughter'){
    K.eggProgress = (K.eggProgress||0) + 1;
    if (K.eggProgress < 2){
      save();
      await modal(el('div',{}, el('div',{class:'egg'},'🥚'), el('h2',{},'Your dragon egg is warming up!'),
        el('p',{},'Read one more great story to hatch it!')), [['Keep reading! ▶','',1]]);
      return;
    }
    K.eggProgress = 0;
    const [e, n, type, lv] = available[0];
    K.collection.push(n); save();
    confetti(lv ? 140 : 60); beep('level'); say(`Your egg hatched! Meet ${n}, the ${type} dragon!`);
    await modal(el('div',{}, el('div',{class:'big-e'}, '🐉' + e), el('h2',{}, (lv ? '✨ LEGENDARY! ' : '') + 'Meet ' + n + '!'),
      el('p',{}, `A baby ${type} dragon hatched and flew to your Dragon Roost!`)), [['Hooray! ▶','',1]]);
  } else {
    const [e, n, , lv] = available[0];
    K.collection.push(n); save();
    confetti(lv ? 140 : 50); beep('star'); say(`You found ${n}! It joined your creature book!`);
    await modal(el('div',{}, el('div',{class:'big-e'}, e), el('h2',{}, (lv ? '✨ LEGENDARY! ' : '') + 'You found ' + n + '!'),
      el('p',{},'A new Pocket Pal joined your Creature Book!')), [['Yay! ▶','',1]]);
  }
}

function screenCollection(){
  const owned = new Set(K.collection);
  const grid = el('div',{class:'collection'});
  T.rewards.forEach(([e,n,type,lv]) => grid.append(el('div',{class:'critter' + (owned.has(n)?'':' locked') + (lv?' legendary':'')},
    el('div',{class:'e'}, owned.has(n) ? e : (lv && lv > K.level ? '🔒' : '❔')), el('div',{class:'n'}, owned.has(n) ? n : '???'),
    lv ? el('div',{class:'muted'}, owned.has(n) ? '✨ Legendary' : '✨ Legendary · Level ' + lv) : (type && owned.has(n) ? el('div',{class:'muted'}, type + ' dragon') : null))));
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
      el('h1',{class:'title'}, kid==='daughter' ? '🐉 Dragon Roost' : '📖 Creature Book'), el('div')),
    kid==='daughter' ? el('div',{class:'card', style:'margin-bottom:16px; display:flex; align-items:center; gap:20px'},
      el('div',{class:'egg'},'🥚'), el('div',{style:'font-size:22px'}, `Egg warmth: ${'🔥'.repeat(K.eggProgress||0)}${'⚪'.repeat(2-(K.eggProgress||0))}`, el('br'), el('span',{class:'muted'},'Great stories (2+ stars) warm your egg. 2 warmth = hatch!'))) : null,
    el('p',{class:'subtitle'}, `${K.collection.length} of ${T.rewards.length} found`),
    grid);
  show(s);
}

/* ================= AVATARS, SHOP, TROPHIES, BADGES, WORD TRACKER ================= */

const AVATAR_BASES = {
  bunny:  { name:'Bunny',  emoji:'🐰', kid:'daughter', color:'#f5ece4' },
  puppy:  { name:'Puppy',  emoji:'🐶', kid:null,       color:'#f4c27a' },   // retired option; still renders if already chosen
  koala:  { name:'Koala',  emoji:'🐨', kid:'daughter', color:'#a8b0bd' },
  kitten: { name:'Kitten', emoji:'🐱', kid:null,       color:'#c9c3d9' },   // retired option; still renders if already chosen
  dragon: { name:'Dragon', emoji:'🐲', kid:'son',      color:'#4ade80' },
  robot:  { name:'Robot',  emoji:'🤖', kid:'son',      color:'#7dd3fc' },
  ninja:  { name:'Ninja',  emoji:'🥷', kid:'son',      color:'#334155' }
};
const AVATAR_UNLOCK_LEVEL = 3;
const COLORS = { pink:'#f9a8d4', mint:'#86efac', sky:'#93c5fd', gold:'#facc15', lilac:'#c4b5fd', fire:'#fb923c', snow:'#f8fafc', midnight:'#1e3a8a' };

// slot, id, name, price, svg-maker
const SHOP = [
  // backgrounds
  ['bg','bg_meadow','Sunny Meadow',10], ['bg','bg_space','Outer Space',20], ['bg','bg_rainbow','Rainbow Sky',20],
  ['bg','bg_castle','Castle Night',25], ['bg','bg_city','Sunset City',25], ['bg','bg_ocean','Under the Sea',25],
  // back
  ['back','rocket','Rocket Boosters',30], ['back','cape','Hero Cape',15], ['back','fairy','Fairy Wings',20],
  ['back','dragonw','Dragon Wings',30], ['back','jetstripes','Lightning Trail',25],
  // head
  ['head','party','Party Hat',10], ['head','crown','Royal Crown',40], ['head','wizard','Wizard Hat',25],
  ['head','bow','Big Bow',10], ['head','headphones','Headphones',15], ['head','propeller','Propeller Cap',20],
  ['head','helmet','Space Helmet',35], ['head','flower','Flower Crown',15],
  // face
  ['face','shades','Cool Shades',10], ['face','stars','Star Glasses',15], ['face','blush','Rosy Cheeks',5], ['face','monocle','Detective Monocle',15],
  // hand
  ['hand','balloon','Balloon',10], ['hand','wand','Magic Wand',15], ['hand','icecream','Ice Cream',10],
  ['hand','glowsword','Glow Sword',20], ['hand','magnifier','Magnifying Glass',15], ['hand','trophycup','Mini Trophy',25],
  // colors
  ...Object.keys(COLORS).map(c => ['color','c_'+c, c[0].toUpperCase()+c.slice(1)+' Paint',15])
];
const SHOP_BY_ID = Object.fromEntries(SHOP.map(s => [s[1], s]));
const SLOT_NAMES = { base:'Buddies', bg:'Backgrounds', back:'Backpacks & Wings', head:'Hats', face:'Faces', hand:'Hands', color:'Colors' };

function avatarSVG(av, size=160, override={}){
  const base = override.base || av.base || 'puppy';
  const eq = Object.assign({}, av.equipped || {}, override);
  const col = eq.color ? COLORS[eq.color.replace('c_','')] : AVATAR_BASES[base].color;
  const dark = shade(col, -0.25);
  let s = `<svg viewBox="0 0 200 220" width="${size}" height="${size*1.1}" xmlns="http://www.w3.org/2000/svg" class="avatar-svg">`;
  s += `<defs><radialGradient id="glow" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity=".9"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  const layer = (tbl, id, arg) => { try { return (tbl && id && tbl[id]) ? tbl[id](arg) : ''; } catch(e){ return ''; } };
  s += BG[eq.bg || 'none']();
  s += layer(typeof AURA !== 'undefined' ? AURA : null, eq.aura);
  s += layer(BACK, eq.back, col);
  s += BODY[base](col, dark);
  s += layer(typeof NECK !== 'undefined' ? NECK : null, eq.neck);
  s += layer(FACE, eq.face, base);
  s += layer(HEAD, eq.head, base);
  s += layer(typeof SHIELD !== 'undefined' ? SHIELD : null, eq.shield);
  s += layer(HAND, eq.hand);
  s += layer(typeof PET !== 'undefined' ? PET : null, eq.pet);
  return s + '</svg>';
}
function shade(hex, p){
  const n = parseInt(hex.slice(1),16); let r=n>>16, g=(n>>8)&255, b=n&255;
  const f = v => Math.max(0, Math.min(255, Math.round(p<0 ? v*(1+p) : v+(255-v)*p)));
  return '#' + [f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
const BG = {
  none: () => `<circle cx="100" cy="115" r="98" fill="#ffffff" opacity=".55"/>`,
  bg_meadow: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#bae6fd"/><circle cx="160" cy="40" r="18" fill="#fde047"/><path d="M2 170 Q60 140 110 165 T198 160 V188 Q198 218 168 218 H32 Q2 218 2 188Z" fill="#86efac"/>`,
  bg_space: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#0f172a"/>${[[30,30],[170,25],[150,80],[20,120],[180,150],[60,60],[120,20],[40,190],[175,200]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.2" fill="#fff"/>`).join('')}<circle cx="165" cy="55" r="14" fill="#f97316"/><ellipse cx="165" cy="55" rx="24" ry="5" fill="none" stroke="#fde68a" stroke-width="2.5"/>`,
  bg_rainbow: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#e0f2fe"/>${['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'].map((c,i)=>`<path d="M${10+i*9} 150 A${90-i*9} ${90-i*9} 0 0 1 ${190-i*9} 150" fill="none" stroke="${c}" stroke-width="9"/>`).join('')}`,
  bg_castle: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#4c1d95"/><circle cx="40" cy="40" r="14" fill="#fef3c7"/><path d="M110 120 v-40 h10 v10 h8 v-10 h10 v10 h8 v-10 h10 v40 h10 v-55 l8 -14 l8 14 v55 h10 V218 H100 V120Z" fill="#312e81" opacity=".9"/>`,
  bg_city: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="url(#sun)"/><defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#fcd34d"/></linearGradient></defs><path d="M2 150 h20 v-40 h18 v40 h10 v-60 h22 v60 h70 v-50 h20 v50 h14 v-30 h20 V188 Q198 218 168 218 H32 Q2 218 2 188Z" fill="#7c2d12" opacity=".55"/>`,
  bg_ocean: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#0e7490"/>${[[30,60,6],[50,40,4],[170,90,7],[160,60,4],[25,150,5]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#a5f3fc" stroke-width="2"/>`).join('')}<path d="M20 218 q10 -40 0 -70 M35 218 q-8 -30 4 -55" stroke="#22c55e" stroke-width="6" fill="none" stroke-linecap="round"/>`
};
const BACK = {
  rocket: () => `<g class="flame"><path d="M19 194 q10 30 20 0 q-10 12 -20 0z" fill="#f97316"/><path d="M161 194 q10 30 20 0 q-10 12 -20 0z" fill="#f97316"/><path d="M24 194 q5 16 10 0z" fill="#fde047"/><path d="M166 194 q5 16 10 0z" fill="#fde047"/></g>
    <rect x="14" y="116" width="30" height="80" rx="12" fill="#cbd5e1" stroke="#334155" stroke-width="4"/><rect x="156" y="116" width="30" height="80" rx="12" fill="#cbd5e1" stroke="#334155" stroke-width="4"/>
    <path d="M14 128 q15 -28 30 0z M156 128 q15 -28 30 0z" fill="#ef4444" stroke="#334155" stroke-width="4" stroke-linejoin="round"/><circle cx="29" cy="156" r="6" fill="#38bdf8"/><circle cx="171" cy="156" r="6" fill="#38bdf8"/>
    <path d="M44 150 h14 M142 150 h14" stroke="#334155" stroke-width="6"/>`,
  cape: () => `<path d="M58 130 Q100 118 142 130 L170 214 Q100 226 30 214Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="4" stroke-linejoin="round"/>`,
  fairy: () => `<g opacity=".85"><ellipse cx="45" cy="135" rx="34" ry="22" transform="rotate(-30 45 135)" fill="#f5d0fe" stroke="#c026d3" stroke-width="3"/><ellipse cx="155" cy="135" rx="34" ry="22" transform="rotate(30 155 135)" fill="#f5d0fe" stroke="#c026d3" stroke-width="3"/><ellipse cx="52" cy="172" rx="22" ry="14" transform="rotate(25 52 172)" fill="#e9d5ff" stroke="#c026d3" stroke-width="3"/><ellipse cx="148" cy="172" rx="22" ry="14" transform="rotate(-25 148 172)" fill="#e9d5ff" stroke="#c026d3" stroke-width="3"/></g>`,
  dragonw: () => `<path d="M70 140 L10 95 L22 130 L4 135 L26 158 L12 170 L70 172Z" fill="#16a34a" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/><path d="M130 140 L190 95 L178 130 L196 135 L174 158 L188 170 L130 172Z" fill="#16a34a" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/>`,
  jetstripes: () => `<path d="M20 150 l18 -10 l-6 14 l18 -8" stroke="#facc15" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M180 150 l-18 -10 l6 14 l-18 -8" stroke="#facc15" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 185 l18 -8 l-6 12 l18 -6" stroke="#fde047" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M186 185 l-18 -8 l6 12 l-18 -6" stroke="#fde047" stroke-width="5" fill="none" stroke-linecap="round"/>`
};
const BODY = {
  puppy: (c, d) => `<ellipse cx="100" cy="170" rx="44" ry="38" fill="${c}" stroke="#78350f" stroke-width="4"/><ellipse cx="100" cy="178" rx="24" ry="20" fill="#fff7ed"/>
    <ellipse cx="78" cy="204" rx="14" ry="9" fill="${c}" stroke="#78350f" stroke-width="4"/><ellipse cx="122" cy="204" rx="14" ry="9" fill="${c}" stroke="#78350f" stroke-width="4"/>
    <ellipse cx="56" cy="98" rx="17" ry="32" transform="rotate(18 56 98)" fill="${d}" stroke="#78350f" stroke-width="4"/><ellipse cx="144" cy="98" rx="17" ry="32" transform="rotate(-18 144 98)" fill="${d}" stroke="#78350f" stroke-width="4"/>
    <circle cx="100" cy="92" r="46" fill="${c}" stroke="#78350f" stroke-width="4"/><ellipse cx="100" cy="110" rx="24" ry="17" fill="#fff7ed"/>
    <circle cx="82" cy="86" r="7" fill="#1f2937"/><circle cx="118" cy="86" r="7" fill="#1f2937"/><circle cx="84" cy="84" r="2.4" fill="#fff"/><circle cx="120" cy="84" r="2.4" fill="#fff"/>
    <ellipse cx="100" cy="103" rx="9" ry="6.5" fill="#1f2937"/><path d="M100 109 v6 M90 116 q10 8 20 0" stroke="#1f2937" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M96 118 q4 10 8 0z" fill="#f472b6"/>`,
  bunny: (c, d) => `<ellipse cx="100" cy="170" rx="42" ry="38" fill="${c}" stroke="#7c5a46" stroke-width="4"/><ellipse cx="100" cy="178" rx="22" ry="20" fill="#fff"/>
    <ellipse cx="80" cy="204" rx="14" ry="9" fill="${c}" stroke="#7c5a46" stroke-width="4"/><ellipse cx="122" cy="204" rx="14" ry="9" fill="${c}" stroke="#7c5a46" stroke-width="4"/>
    <circle cx="140" cy="192" r="12" fill="#fff" stroke="#7c5a46" stroke-width="3"/>
    <ellipse cx="78" cy="38" rx="15" ry="38" transform="rotate(-10 78 38)" fill="${c}" stroke="#7c5a46" stroke-width="4"/><ellipse cx="122" cy="38" rx="15" ry="38" transform="rotate(10 122 38)" fill="${c}" stroke="#7c5a46" stroke-width="4"/>
    <ellipse cx="78" cy="40" rx="7" ry="28" transform="rotate(-10 78 40)" fill="#fbcfe8"/><ellipse cx="122" cy="40" rx="7" ry="28" transform="rotate(10 122 40)" fill="#fbcfe8"/>
    <circle cx="100" cy="94" r="46" fill="${c}" stroke="#7c5a46" stroke-width="4"/>
    <circle cx="82" cy="88" r="7" fill="#1f2937"/><circle cx="118" cy="88" r="7" fill="#1f2937"/><circle cx="84" cy="85" r="2.5" fill="#fff"/><circle cx="120" cy="85" r="2.5" fill="#fff"/>
    <path d="M95 102 h10 l-5 6z" fill="#f472b6"/><path d="M100 108 v5 M100 113 q-6 6 -12 2 M100 113 q6 6 12 2" stroke="#7c5a46" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="95" y="114" width="10" height="7" rx="2" fill="#fff" stroke="#7c5a46" stroke-width="1.5"/>
    <ellipse cx="70" cy="106" rx="8" ry="5" fill="#f9a8d4" opacity=".7"/><ellipse cx="130" cy="106" rx="8" ry="5" fill="#f9a8d4" opacity=".7"/>
    <path d="M58 100 h18 M60 108 l16 -3 M142 100 h-18 M140 108 l-16 -3" stroke="#7c5a46" stroke-width="2" stroke-linecap="round"/>`,
  koala: (c, d) => `<ellipse cx="100" cy="170" rx="44" ry="38" fill="${c}" stroke="#374151" stroke-width="4"/><ellipse cx="100" cy="178" rx="24" ry="20" fill="#f3f4f6"/>
    <ellipse cx="78" cy="204" rx="14" ry="9" fill="${c}" stroke="#374151" stroke-width="4"/><ellipse cx="122" cy="204" rx="14" ry="9" fill="${c}" stroke="#374151" stroke-width="4"/>
    <circle cx="54" cy="66" r="28" fill="${c}" stroke="#374151" stroke-width="4"/><circle cx="146" cy="66" r="28" fill="${c}" stroke="#374151" stroke-width="4"/>
    <circle cx="56" cy="68" r="16" fill="#f9d5e5"/><circle cx="144" cy="68" r="16" fill="#f9d5e5"/>
    <path d="M40 58 q-6 -4 -4 -10 M160 58 q6 -4 4 -10" stroke="#f3f4f6" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="94" r="46" fill="${c}" stroke="#374151" stroke-width="4"/>
    <circle cx="80" cy="86" r="6.5" fill="#1f2937"/><circle cx="120" cy="86" r="6.5" fill="#1f2937"/><circle cx="82" cy="84" r="2.2" fill="#fff"/><circle cx="122" cy="84" r="2.2" fill="#fff"/>
    <ellipse cx="100" cy="102" rx="13" ry="17" fill="#374151"/><ellipse cx="96" cy="96" rx="4" ry="6" fill="#6b7280"/>
    <path d="M90 122 q10 7 20 0" stroke="#1f2937" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="70" cy="108" rx="8" ry="5" fill="#f9a8d4" opacity=".6"/><ellipse cx="130" cy="108" rx="8" ry="5" fill="#f9a8d4" opacity=".6"/>`,
  dragon: (c, d) => `<path d="M136 196 q44 4 46 -30 q2 -14 -10 -18" stroke="${d}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M168 146 l14 -6 l-4 14z" fill="#f97316" stroke="#14532d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M62 150 L30 120 L38 146 L24 152 L58 170Z" fill="${d}" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/><path d="M138 150 L170 120 L162 146 L176 152 L142 170Z" fill="${d}" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="100" cy="170" rx="42" ry="38" fill="${c}" stroke="#14532d" stroke-width="4"/>
    <ellipse cx="100" cy="176" rx="22" ry="26" fill="#fef08a"/><path d="M82 166 h36 M80 178 h40 M84 190 h32" stroke="#ca8a04" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="80" cy="204" rx="13" ry="9" fill="${c}" stroke="#14532d" stroke-width="4"/><ellipse cx="120" cy="204" rx="13" ry="9" fill="${c}" stroke="#14532d" stroke-width="4"/>
    <path d="M72 58 L62 26 L88 50Z M128 58 L138 26 L112 50Z" fill="#fde68a" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="100" cy="90" r="46" fill="${c}" stroke="#14532d" stroke-width="4"/>
    <path d="M92 46 l8 -14 l8 14z" fill="#f97316" stroke="#14532d" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="80" cy="82" rx="10" ry="12" fill="#fff"/><ellipse cx="120" cy="82" rx="10" ry="12" fill="#fff"/><circle cx="82" cy="84" r="6" fill="#1f2937"/><circle cx="118" cy="84" r="6" fill="#1f2937"/><circle cx="84" cy="81" r="2" fill="#fff"/><circle cx="120" cy="81" r="2" fill="#fff"/>
    <ellipse cx="100" cy="110" rx="26" ry="16" fill="${shade(c, 0.35)}" stroke="#14532d" stroke-width="3"/><circle cx="92" cy="106" r="3" fill="#14532d"/><circle cx="108" cy="106" r="3" fill="#14532d"/>
    <path d="M86 116 q14 10 28 0" stroke="#14532d" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M92 118 l3 6 l3 -5 M104 118 l3 5 l3 -6" fill="#fff" stroke="#14532d" stroke-width="1.5"/>`,
  kitten: (c, d) => `<path d="M140 190 q40 -10 30 -50" stroke="${d}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="170" rx="42" ry="38" fill="${c}" stroke="#4c1d95" stroke-width="4"/><ellipse cx="100" cy="178" rx="22" ry="19" fill="#faf5ff"/>
    <ellipse cx="80" cy="204" rx="13" ry="9" fill="${c}" stroke="#4c1d95" stroke-width="4"/><ellipse cx="120" cy="204" rx="13" ry="9" fill="${c}" stroke="#4c1d95" stroke-width="4"/>
    <path d="M60 70 L64 30 L94 54Z" fill="${c}" stroke="#4c1d95" stroke-width="4" stroke-linejoin="round"/><path d="M140 70 L136 30 L106 54Z" fill="${c}" stroke="#4c1d95" stroke-width="4" stroke-linejoin="round"/>
    <path d="M67 60 L69 41 L84 53Z M133 60 L131 41 L116 53Z" fill="#f9a8d4"/>
    <circle cx="100" cy="92" r="46" fill="${c}" stroke="#4c1d95" stroke-width="4"/>
    <ellipse cx="82" cy="88" rx="7" ry="9" fill="#1f2937"/><ellipse cx="118" cy="88" rx="7" ry="9" fill="#1f2937"/><circle cx="84" cy="85" r="2.6" fill="#fff"/><circle cx="120" cy="85" r="2.6" fill="#fff"/>
    <path d="M95 102 h10 l-5 6z" fill="#f472b6"/><path d="M100 108 q-6 8 -12 3 M100 108 q6 8 12 3" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M58 100 h20 M58 110 l20 -4 M142 100 h-20 M142 110 l-20 -4" stroke="#4c1d95" stroke-width="2.5" stroke-linecap="round"/>`,
  robot: (c, d) => `<rect x="34" y="140" width="18" height="44" rx="9" fill="${d}" stroke="#1e293b" stroke-width="4"/><rect x="148" y="140" width="18" height="44" rx="9" fill="${d}" stroke="#1e293b" stroke-width="4"/>
    <rect x="56" y="134" width="88" height="68" rx="16" fill="${c}" stroke="#1e293b" stroke-width="4"/><rect x="74" y="148" width="52" height="34" rx="8" fill="#e2e8f0" stroke="#1e293b" stroke-width="3"/>
    <circle cx="88" cy="165" r="6" fill="#ef4444"/><circle cx="104" cy="165" r="6" fill="#facc15"/><circle cx="118" cy="160" r="3" fill="#22c55e"/><circle cx="118" cy="171" r="3" fill="#22c55e"/>
    <rect x="70" y="200" width="22" height="14" rx="5" fill="${d}" stroke="#1e293b" stroke-width="4"/><rect x="108" y="200" width="22" height="14" rx="5" fill="${d}" stroke="#1e293b" stroke-width="4"/>
    <line x1="100" y1="50" x2="100" y2="28" stroke="#1e293b" stroke-width="4"/><circle cx="100" cy="24" r="7" fill="#f43f5e" stroke="#1e293b" stroke-width="3"/>
    <rect x="52" y="48" width="96" height="82" rx="20" fill="${c}" stroke="#1e293b" stroke-width="4"/><rect x="44" y="76" width="10" height="24" rx="4" fill="${d}" stroke="#1e293b" stroke-width="3"/><rect x="146" y="76" width="10" height="24" rx="4" fill="${d}" stroke="#1e293b" stroke-width="3"/>
    <rect x="64" y="64" width="72" height="40" rx="12" fill="#0f172a"/><circle cx="84" cy="84" r="9" fill="#22d3ee"/><circle cx="116" cy="84" r="9" fill="#22d3ee"/><circle cx="86" cy="81" r="3" fill="#fff"/><circle cx="118" cy="81" r="3" fill="#fff"/>
    <path d="M80 114 h40" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/><path d="M86 114 v6 M94 114 v6 M102 114 v6 M110 114 v6" stroke="#1e293b" stroke-width="3"/>`,
  ninja: (c, d) => `<ellipse cx="100" cy="170" rx="42" ry="38" fill="${c}" stroke="#0f172a" stroke-width="4"/><rect x="58" y="160" width="84" height="12" fill="#dc2626"/><path d="M134 166 l18 10 l-4 -14z" fill="#dc2626"/>
    <ellipse cx="80" cy="204" rx="13" ry="9" fill="${c}" stroke="#0f172a" stroke-width="4"/><ellipse cx="120" cy="204" rx="13" ry="9" fill="${c}" stroke="#0f172a" stroke-width="4"/>
    <circle cx="100" cy="92" r="46" fill="${c}" stroke="#0f172a" stroke-width="4"/>
    <rect x="58" y="72" width="84" height="30" rx="14" fill="#fde2c4" stroke="#0f172a" stroke-width="3"/>
    <path d="M74 86 q8 -7 16 0" stroke="#0f172a" stroke-width="3" fill="none"/><path d="M110 86 q8 -7 16 0" stroke="#0f172a" stroke-width="3" fill="none"/>
    <ellipse cx="82" cy="89" rx="6" ry="7" fill="#0f172a"/><ellipse cx="118" cy="89" rx="6" ry="7" fill="#0f172a"/><circle cx="84" cy="87" r="2.2" fill="#fff"/><circle cx="120" cy="87" r="2.2" fill="#fff"/>
    <path d="M56 62 Q100 48 144 62 L144 72 Q100 60 56 72Z" fill="#dc2626"/><path d="M140 64 q26 -6 40 8 M140 68 q22 6 34 22" stroke="#dc2626" stroke-width="7" fill="none" stroke-linecap="round"/>`
};
const headTop = base => base === 'robot' ? 48 : base === 'kitten' ? 50 : base === 'koala' ? 50 : 44;
const HEAD = {
  party: b => { const y = headTop(b); return `<path d="M78 ${y+6} L100 ${y-44} L122 ${y+6}Z" fill="#ec4899" stroke="#831843" stroke-width="3" stroke-linejoin="round"/><path d="M86 ${y-10} L114 ${y-14} M82 ${y-1} L118 ${y-4}" stroke="#fde047" stroke-width="5"/><circle cx="100" cy="${y-46}" r="8" fill="#fde047" stroke="#831843" stroke-width="3"/>`; },
  crown: b => { const y = headTop(b); return `<path d="M68 ${y+6} L64 ${y-26} L82 ${y-8} L100 ${y-34} L118 ${y-8} L136 ${y-26} L132 ${y+6}Z" fill="#facc15" stroke="#a16207" stroke-width="3.5" stroke-linejoin="round"/><circle cx="100" cy="${y-8}" r="5" fill="#ef4444"/><circle cx="82" cy="${y-2}" r="4" fill="#3b82f6"/><circle cx="118" cy="${y-2}" r="4" fill="#22c55e"/>`; },
  wizard: b => { const y = headTop(b); return `<path d="M64 ${y+4} Q100 ${y-90} 128 ${y-64} Q110 ${y-40} 136 ${y+4}Z" fill="#6d28d9" stroke="#2e1065" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="100" cy="${y+6}" rx="52" ry="10" fill="#7c3aed" stroke="#2e1065" stroke-width="3.5"/><path d="M96 ${y-30} l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="#fde047"/>`; },
  bow: b => { const y = headTop(b); return `<path d="M120 ${y+2} l-26 -16 l2 30z M120 ${y+2} l26 -16 l-2 30z" fill="#f472b6" stroke="#9d174d" stroke-width="3" stroke-linejoin="round"/><circle cx="120" cy="${y+2}" r="7" fill="#ec4899" stroke="#9d174d" stroke-width="3"/>`; },
  headphones: b => `<path d="M52 98 Q52 38 100 38 Q148 38 148 98" stroke="#1f2937" stroke-width="9" fill="none"/><rect x="40" y="84" width="20" height="32" rx="9" fill="#ef4444" stroke="#1f2937" stroke-width="3"/><rect x="140" y="84" width="20" height="32" rx="9" fill="#ef4444" stroke="#1f2937" stroke-width="3"/>`,
  propeller: b => { const y = headTop(b); return `<path d="M62 ${y+12} Q100 ${y-30} 138 ${y+12}Z" fill="#3b82f6" stroke="#1e3a8a" stroke-width="3.5"/><path d="M62 ${y+12} Q100 ${y-30} 100 ${y+12}" fill="#facc15" opacity=".8"/><line x1="100" y1="${y-16}" x2="100" y2="${y-26}" stroke="#1e3a8a" stroke-width="4"/><g class="spin" style="transform-origin:100px ${y-28}px"><ellipse cx="86" cy="${y-28}" rx="16" ry="5" fill="#ef4444"/><ellipse cx="114" cy="${y-28}" rx="16" ry="5" fill="#22c55e"/></g>`; },
  helmet: b => `<circle cx="100" cy="92" r="60" fill="#bae6fd" opacity=".35" stroke="#e2e8f0" stroke-width="7"/><path d="M60 60 q20 -18 40 -20" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/><rect x="66" y="146" width="68" height="12" rx="6" fill="#e2e8f0" stroke="#64748b" stroke-width="3"/>`,
  flower: b => { const y = headTop(b); return [70,85,100,115,130].map((x,i)=>`<circle cx="${x}" cy="${y+ (i%2?-2:2)}" r="9" fill="${['#f472b6','#facc15','#a78bfa','#fb923c','#f472b6'][i]}" stroke="#fff" stroke-width="2"/><circle cx="${x}" cy="${y+(i%2?-2:2)}" r="3" fill="#fff"/>`).join(''); }
};
const FACE = {
  shades: b => `<rect x="66" y="76" width="30" height="20" rx="8" fill="#0f172a"/><rect x="104" y="76" width="30" height="20" rx="8" fill="#0f172a"/><path d="M96 84 h8" stroke="#0f172a" stroke-width="4"/><path d="M70 80 l8 0" stroke="#fff" stroke-width="3" opacity=".7"/>`,
  stars: b => `${[82,118].map(x=>`<path d="M${x} 72 l5 10 l11 2 l-8 8 l2 11 l-10 -5 l-10 5 l2 -11 l-8 -8 l11 -2z" fill="#f472b6" fill-opacity=".55" stroke="#be185d" stroke-width="3" stroke-linejoin="round"/>`).join('')}`,
  blush: b => `<ellipse cx="70" cy="104" rx="9" ry="5" fill="#fb7185" opacity=".6"/><ellipse cx="130" cy="104" rx="9" ry="5" fill="#fb7185" opacity=".6"/>`,
  monocle: b => `<circle cx="118" cy="87" r="13" fill="#e0f2fe" fill-opacity=".35" stroke="#a16207" stroke-width="4"/><path d="M130 94 q8 20 -2 40" stroke="#a16207" stroke-width="2" fill="none"/>`
};
const HAND = {
  balloon: () => `<path d="M160 190 Q170 130 172 70" stroke="#475569" stroke-width="2" fill="none"/><ellipse cx="174" cy="50" rx="20" ry="25" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/><path d="M170 74 l4 8 l4 -8z" fill="#ef4444"/><ellipse cx="167" cy="42" rx="5" ry="8" fill="#fff" opacity=".6"/>`,
  wand: () => `<line x1="152" y1="196" x2="180" y2="146" stroke="#78350f" stroke-width="6" stroke-linecap="round"/><path d="M182 124 l6 12 l13 2 l-9 9 l2 13 l-12 -6 l-12 6 l2 -13 l-9 -9 l13 -2z" fill="#fde047" stroke="#a16207" stroke-width="3" stroke-linejoin="round"/>`,
  icecream: () => `<path d="M156 168 l12 36 l12 -36z" fill="#f59e0b" stroke="#78350f" stroke-width="3" stroke-linejoin="round"/><circle cx="168" cy="160" r="13" fill="#f9a8d4" stroke="#9d174d" stroke-width="3"/><circle cx="168" cy="142" r="11" fill="#fef3c7" stroke="#92400e" stroke-width="3"/><circle cx="168" cy="128" r="4" fill="#dc2626"/>`,
  glowsword: () => `<line x1="160" y1="140" x2="190" y2="60" stroke="#67e8f9" stroke-width="12" stroke-linecap="round" opacity=".5"/><line x1="160" y1="140" x2="190" y2="60" stroke="#ecfeff" stroke-width="5" stroke-linecap="round"/><rect x="150" y="138" width="18" height="30" rx="5" transform="rotate(20 159 153)" fill="#475569" stroke="#0f172a" stroke-width="3"/>`,
  magnifier: () => `<line x1="152" y1="198" x2="170" y2="160" stroke="#78350f" stroke-width="8" stroke-linecap="round"/><circle cx="178" cy="142" r="18" fill="#e0f2fe" fill-opacity=".5" stroke="#334155" stroke-width="6"/>`,
  trophycup: () => `<path d="M160 150 h32 v10 q0 22 -16 24 q-16 -2 -16 -24z" fill="#facc15" stroke="#a16207" stroke-width="3"/><path d="M160 156 q-10 0 -8 10 q2 8 10 8 M192 156 q10 0 8 10 q-2 8 -10 8" stroke="#a16207" stroke-width="3" fill="none"/><rect x="170" y="184" width="12" height="8" fill="#a16207"/><rect x="164" y="192" width="24" height="7" rx="2" fill="#78350f"/>`
};

function avatarNode(size=150, override){
  const d = el('div',{class:'avatar-wrap', html: avatarSVG(K.avatar, size, override)});
  return d;
}
function rarity(price, lvl){ return lvl || price >= 60 ? 'legendary' : price >= 40 ? 'epic' : price >= 25 ? 'rare' : price >= 15 ? 'uncommon' : 'common'; }
function balance(){ return (K.stars||0) - (K.spent||0); }

/* ---------- avatar pick (first time) ---------- */
function screenAvatarPick(){
  const choices = Object.entries(AVATAR_BASES).filter(([,b]) => b.kid === kid);
  const name = kidName();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, homeBtn(), el('div')),
    el('div',{class:'topbar center'}, el('div',{}, el('h1',{class:'title center'}, `Pick your reading buddy, ${name}!`),
      el('p',{class:'subtitle center'}, `Choose one now. The ${choices.length > 2 ? 'others unlock' : 'other one unlocks'} at Level ${AVATAR_UNLOCK_LEVEL}!`))),
    el('div',{class:'profiles'}, ...choices.map(([id,b]) => {
      const btn = el('button',{class:'profile ' + (kid==='son'?'son':'daughter'), onclick:()=>{
        K.avatar.base = id; if (!K.avatar.owned.includes(id)) K.avatar.owned.push(id); save(); beep('level'); confetti(50);
        say(`Hooray! Your ${b.name} is ready to read!`); screenHome(); }});
      btn.append(el('div',{html: avatarSVG({base:id, equipped:{}}, 170)}), b.name);
      return btn;
    })));
  show(s);
}

/* ---------- shop ---------- */
let shopTab = 'back';
function screenShop(){
  const tabs = ['base','hand','shield','back','head','face','neck','pet','aura','bg','color'];
  const preview = el('div',{class:'shop-preview'}, avatarNode(200));
  const grid = el('div',{class:'shop-grid'});
  const bal = el('span',{class:'pill'}, '⭐ ' + balance() + ' stars to spend');
  const renderGrid = () => {
    grid.innerHTML = '';
    if (shopTab === 'base'){
      Object.entries(AVATAR_BASES).filter(([,b]) => b.kid === kid).forEach(([id,b]) => {
        const owned = K.avatar.owned.includes(id) || K.level >= AVATAR_UNLOCK_LEVEL;
        if (owned && !K.avatar.owned.includes(id)) { K.avatar.owned.push(id); save(); }
        const on = K.avatar.base === id;
        grid.append(el('div',{class:'shop-item' + (on?' on':'') + (owned?'':' locked')},
          el('div',{html: avatarSVG(K.avatar, 90, {base:id})}), el('div',{class:'n'}, b.name),
          owned ? el('button',{class:'btn small ' + (on?'gray':'green'), onclick:()=>{ K.avatar.base = id; save(); beep('tap'); screenShop(); }}, on ? 'Wearing' : 'Switch')
                : el('div',{class:'lock'}, `🔒 Level ${AVATAR_UNLOCK_LEVEL}`)));
      });
      return;
    }
    SHOP.filter(i => i[0] === shopTab).forEach(([slot,id,name,price,lvl]) => {
      const owned = K.avatar.owned.includes(id);
      if (!owned && lvl && K.level < lvl){
        grid.append(el('div',{class:'shop-item locked legendary-item'},
          el('div',{html: avatarSVG(K.avatar, 90, {[slot]: id})}), el('div',{class:'n'}, '✨ ' + name), el('div',{class:'lock'}, `🔒 Level ${lvl}`)));
        return;
      }
      const on = K.avatar.equipped[slot] === id;
      const can = balance() >= price;
      const action = owned
        ? el('button',{class:'btn small ' + (on?'gray':'green'), onclick:()=>{ if (on) delete K.avatar.equipped[slot]; else K.avatar.equipped[slot] = id; save(); beep('tap'); screenShop(); }}, on ? 'Take off' : 'Wear')
        : el('button',{class:'btn small ' + (can?'':'gray'), onclick:async()=>{
            if (!can){ say('Keep reading to earn more stars!'); return; }
            K.spent = (K.spent||0) + price; K.avatar.owned.push(id); K.avatar.equipped[slot] = id; save();
            beep('level'); confetti(40); say(`You got the ${name}!`);
            await checkBadges(); screenShop(); }}, `⭐ ${price}`);
      const rar = rarity(price, lvl);
      grid.append(el('div',{class:'shop-item rar-' + rar + (on?' on':'')},
        el('div',{class:'rar-tag'}, rar.toUpperCase()),
        el('div',{html: avatarSVG(K.avatar, 90, {[slot]: id})}), el('div',{class:'n'}, name), action));
    });
  };
  renderGrid();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🛍️ Star Shop'), bal),
    el('div',{class:'shop-layout'}, preview,
      el('div',{class:'grow'},
        el('div',{class:'tabs shop-tabs'}, ...tabs.map(t => el('button',{class:'tab' + (t===shopTab?' active':''), onclick:()=>{ shopTab = t; screenShop(); }}, SLOT_NAMES[t]))),
        grid)));
  show(s);
}

/* ---------- trophies ---------- */
const TROPHIES = {
  daughter: [['🥉','Bronze Egg'],['📌','Apprentice Pin'],['🥈','Silver Wing'],['🛡️','Rider\'s Shield'],['🥇','Golden Saddle'],['🏅','Knight\'s Crest'],['🌟','Captain\'s Star'],['👑','Guardian Crown']],
  son: [['🔤','Letter Champ'],['🪄','Word Wizard'],['⭐','Sight Word Star'],['🦸','Sentence Hero'],['🧭','Story Explorer'],['📚','Big Reader'],['🔍','Junior Detective'],['🕵️','Super Sleuth']]
};
function awardTrophiesUpTo(level){
  const got = [];
  for (let n = 1; n <= level; n++) if (!K.trophies.includes(n)){ K.trophies.push(n); got.push(n); }
  return got;
}

/* ---------- badges ---------- */
const BADGES = [
  ['first','📖','First Story','Finish your first reading', k => normalSessions(k).length >= 1],
  ['perfect','💯','Perfect Reader','Read every word right in a story', k => normalSessions(k).some(s => s.accuracy >= 100 && s.total >= 8)],
  ['quiz','🧠','Quiz Whiz','Get every question right', k => normalSessions(k).some(s => s.quiz && s.quiz.split('/')[0] === s.quiz.split('/')[1])],
  ['quiz3','🔥','Quiz Streak','Perfect quizzes 3 times in a row', k => (k.quizStreak||0) >= 3],
  ['streak3','📅','3-Day Streak','Read 3 days in a row', k => (k.streak.count||0) >= 3],
  ['streak7','🗓️','Week Warrior','Read 7 days in a row', k => (k.streak.count||0) >= 7],
  ['read10','🔟','Ten Reads','Finish 10 readings', k => normalSessions(k).length >= 10],
  ['read25','🚀','Reading Rocket','Finish 25 readings', k => normalSessions(k).length >= 25],
  ['read50','🌠','Reading Legend','Finish 50 readings', k => normalSessions(k).length >= 50],
  ['word1','🎯','Word Master','Master your first tricky word', k => masteredWords(k).length >= 1],
  ['word10','🏹','Word Hunter','Master 10 tricky words', k => masteredWords(k).length >= 10],
  ['collect5','🧺','Collector','Collect 5 friends', k => k.collection.length >= 5],
  ['collect15','🏰','Super Collector','Collect 15 friends', k => k.collection.length >= 15],
  ['shop','🛍️','First Purchase','Buy something in the Star Shop', k => k.avatar.owned.some(id => SHOP_BY_ID[id])],
  ['stylish','😎','Style Star','Wear 3 accessories at once', k => Object.keys(k.avatar.equipped).length >= 3],
  ['series','📚','Series Explorer','Read stories from both series', k => new Set(normalSessions(k).map(s => s.series).filter(Boolean)).size >= 2],
  ['build1','🧱','Builder','Put 5 things in your world', k => (k.world?.items?.length || 0) >= 5],
  ['build20','🏙️','Master Builder','Put 20 things in your world', k => (k.world?.items?.length || 0) >= 20],
  ['skill1','⚡','Skill Up','Master a phonics skill in your stories', k => Object.values(k.skills||{}).some(s => s.mastered)],
  ['skill5','🧠','Sound Expert','Master 5 phonics skills', k => Object.values(k.skills||{}).filter(s => s.mastered).length >= 5],
  ['speed','🚀','Speed Reader','Beat your own reading speed', k => Object.keys((k.path||{}).best||{}).length >= 1],
  ['top','🏆','Top of the Track','Reach the highest level', k => k.level >= TRACKS[kid].levels.length]
];
const normalSessions = k => k.sessions.filter(s => s.mode === 'normal');
async function checkBadges(){
  for (const [id, e, name, desc, test] of BADGES){
    if (K.badges.includes(id)) continue;
    let ok = false; try { ok = test(K); } catch(err){}
    if (ok){
      K.badges.push(id); K.stars += 5; save();
      beep('level'); confetti(60); say(`New badge! ${name}!`);
      await modal(el('div',{}, el('div',{class:'big-e'}, e), el('h2',{}, 'Badge: ' + name), el('p',{}, desc + '. Bonus: +5 ⭐')), [['Awesome! ▶','',1]]);
    }
  }
}
function screenTrophies(){
  const tlist = TROPHIES[kid];
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🏆 Trophy Hall'), el('div')),
    el('h2',{class:'subtitle', style:'font-size:24px'}, 'Level Trophies'),
    el('div',{class:'collection'}, ...tlist.map(([e,n],i) => el('div',{class:'critter' + (K.trophies.includes(i+1)?'':' locked')},
      el('div',{class:'e'}, K.trophies.includes(i+1) ? e : '🔒'), el('div',{class:'n'}, n), el('div',{class:'muted'}, 'Level ' + (i+1)),
      i+1 === AVATAR_UNLOCK_LEVEL ? el('div',{class:'muted'}, '+ new buddy!') : null))),
    el('h2',{class:'subtitle', style:'font-size:24px;margin-top:24px'}, `Badges (${K.badges.length}/${BADGES.length})`),
    el('div',{class:'collection'}, ...BADGES.map(([id,e,n,d]) => el('div',{class:'critter' + (K.badges.includes(id)?'':' locked')},
      el('div',{class:'e'}, K.badges.includes(id) ? e : '❔'), el('div',{class:'n'}, n), el('div',{class:'muted'}, d)))));
  show(s);
}

/* ---------- missed-word tracker ---------- */
// K.words[word] = { miss: total misses, streak: correct reads in a row, mastered: date|null, last: date }
const MASTER_STREAK = 3;
const PROPER = new Set(norm(CAT) + ' biscuit zip plip toasty leafy chip wren pebble oona tobin mira blaze ripple vex nim rosie priya jules lena noodle pepper ortiz lee park max mia daisy fen breeze quill moss skyfire thunder johnsons i'.split(' '));
const practiceWords = k => Object.entries(k.words).filter(([,w]) => !w.mastered).sort((a,b) => b[1].miss - a[1].miss).map(([w]) => w);
const masteredWords = k => Object.entries(k.words).filter(([,w]) => w.mastered).map(([w]) => w);
function trackWords(act){
  const newlyMastered = [];
  const seenMiss = new Set(), seenOk = new Set();
  act.pages.forEach(p => p.tokens.forEach((t,i) => {
    const w = t.n; if (!w || w.length < 2 || /^\d+$/.test(w)) return;
    const missed = p.status[i] !== 'ok' || p.helped[i];
    if (missed){ if (!seenMiss.has(w)){ seenMiss.add(w);
      const clean = t.disp.replace(/[^\w'’-]/g,'');
      const r = K.words[w] || (K.words[w] = { miss:0, streak:0, mastered:null, last:null, disp: PROPER.has(w) ? clean : clean.toLowerCase() });
      r.miss++; r.streak = 0; r.mastered = null; r.last = todayStr(); } }
    else if (K.words[w] && !K.words[w].mastered && !seenOk.has(w) && !seenMiss.has(w)){
      seenOk.add(w); const r = K.words[w]; r.streak++;
      if (r.streak >= MASTER_STREAK){ r.mastered = todayStr(); newlyMastered.push(w); }
    }
  }));
  return newlyMastered;
}
function startPractice(){
  const words = practiceWords(K).slice(0, 8);
  if (!words.length) return;
  const a = { kind:'words', level:K.level, title:'My Practice Words', pages: shuffle(words).map(w => ({ single:true, tokens:[{disp:(K.words[w].disp||w).toLowerCase(), n:w}] })) };
  beginRun(a, { mode:'practice' });
}
function screenWords(){
  const todo = practiceWords(K), done = masteredWords(K);
  const row = w => { const r = K.words[w];
    return el('div',{class:'word-row'}, el('button',{class:'btn small blue', onclick:()=>say(r.disp||w)},'🔊'),
      el('span',{class:'word-big'}, r.disp||w),
      el('span',{class:'dots'}, ...Array.from({length:MASTER_STREAK},(_,i)=>el('span',{class:'dot' + (i < r.streak ? ' on' : '')}))),
      el('span',{class:'muted'}, 'missed ' + r.miss + '×')); };
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🎯 My Words'), el('div')),
    el('div',{class:'card'},
      el('p',{style:'font-size:20px;margin-top:0'}, `Read a word right ${MASTER_STREAK} times in a row to master it! ⭐`),
      todo.length ? el('button',{class:'btn big', onclick:startPractice}, `▶ Practice ${Math.min(8,todo.length)} words`) : el('p',{style:'font-size:22px'},'No tricky words right now. Amazing! 🎉'),
      el('div',{class:'word-list'}, ...todo.map(row))),
    done.length ? el('div',{class:'card', style:'margin-top:16px'}, el('h2',{style:'margin-top:0'}, `✅ Mastered (${done.length})`),
      el('div',{}, ...done.map(w => el('span',{class:'chip ok'}, '⭐ ' + (K.words[w].disp||w))))) : null);
  show(s);
}

/* ---------- Star Shop: extra items (swords, shields, pets, auras, neckwear, more hats & wings) ---------- */
// [slot, id, name, price, unlockLevel?]
SHOP.push(
  // swords & hand items
  ['hand','firesword','Fire Sword',35], ['hand','icesword','Ice Sword',35], ['hand','goldsword','Golden Sword',60,5],
  ['hand','rainbowsword','Rainbow Sword',70,6], ['hand','staff','Magic Staff',30], ['hand','bubblewand','Bubble Wand',15],
  ['hand','lollipop','Giant Lollipop',10], ['hand','teddy','Teddy Bear',20], ['hand','guitar','Rock Guitar',30], ['hand','flag','Star Flag',15],
  // shields (left hand, so they go WITH a sword)
  ['shield','sh_knight','Knight Shield',25], ['shield','sh_star','Star Shield',30], ['shield','sh_heart','Heart Shield',25],
  ['shield','sh_bolt','Lightning Shield',30], ['shield','sh_wood','Viking Shield',20], ['shield','sh_dragon','Golden Dragon Shield',60,5],
  // backs
  ['back','goldboost','Golden Boosters',50,4], ['back','rainbowboost','Rainbow Boosters',70,6], ['back','butterfly','Butterfly Wings',25],
  ['back','angel','Angel Wings',35], ['back','batwings','Bat Wings',25], ['back','goldcape','Golden Cape',45,5], ['back','jetpack','Jet Pack',35],
  // hats
  ['head','tiara','Sparkle Tiara',30], ['head','unicorn','Unicorn Horn',40], ['head','catears','Kitty Ears',15], ['head','bunny','Bunny Ears',15],
  ['head','knight','Knight Helmet',35], ['head','viking','Viking Helmet',30], ['head','pirate','Pirate Hat',25], ['head','cowboy','Cowboy Hat',20],
  ['head','cap','Ball Cap',10], ['head','halo','Golden Halo',45,4], ['head','tophat','Top Hat',20], ['head','beanie','Cozy Beanie',10], ['head','flowerclip','Flower Clip',10],
  // faces
  ['face','hearts','Heart Glasses',15], ['face','rainbowshades','Rainbow Shades',25], ['face','goggles','Pilot Goggles',20],
  ['face','eyepatch','Pirate Eye Patch',10], ['face','mustache','Silly Mustache',10], ['face','heromask','Hero Mask',20], ['face','facepaint','Star Face Paint',10],
  // neck
  ['neck','bowtie','Bow Tie',10], ['neck','pearls','Pearl Necklace',20], ['neck','scarf','Cozy Scarf',15], ['neck','medal','Gold Medal',30], ['neck','locket','Heart Locket',20],
  // pets
  ['pet','p_dragon','Baby Dragon',40], ['pet','p_kitty','Kitty',25], ['pet','p_puppy','Puppy',25], ['pet','p_bunny','Bunny',20],
  ['pet','p_unicorn','Unicorn',45,4], ['pet','p_owl','Owl',20], ['pet','p_panda','Panda',30], ['pet','p_robot','Robo Buddy',35], ['pet','p_turtle','Turtle',15], ['pet','p_phoenix','Phoenix',80,7],
  // auras (glow around your buddy)
  ['aura','a_sparkle','Sparkles',20], ['aura','a_hearts','Floating Hearts',20], ['aura','a_stars','Star Swirl',25], ['aura','a_snow','Snowflakes',20],
  ['aura','a_bubbles','Bubbles',15], ['aura','a_bolt','Lightning Power',35], ['aura','a_fire','Fire Power',50,5], ['aura','a_rainbow','Rainbow Glow',60,6]
);
SHOP.forEach(s => SHOP_BY_ID[s[1]] = s);
Object.assign(SLOT_NAMES, { shield:'Shields', neck:'Necklaces', pet:'Pets', aura:'Magic Glow' });

/* shapes */
const rocketPair = (body, nose, f1, f2) => `<g class="flame"><path d="M19 194 q10 30 20 0 q-10 12 -20 0z" fill="${f1}"/><path d="M161 194 q10 30 20 0 q-10 12 -20 0z" fill="${f1}"/><path d="M24 194 q5 16 10 0z" fill="${f2}"/><path d="M166 194 q5 16 10 0z" fill="${f2}"/></g>
    <rect x="14" y="116" width="30" height="80" rx="12" fill="${body}" stroke="#334155" stroke-width="4"/><rect x="156" y="116" width="30" height="80" rx="12" fill="${body}" stroke="#334155" stroke-width="4"/>
    <path d="M14 128 q15 -28 30 0z M156 128 q15 -28 30 0z" fill="${nose}" stroke="#334155" stroke-width="4" stroke-linejoin="round"/><circle cx="29" cy="156" r="6" fill="#fff" opacity=".8"/><circle cx="171" cy="156" r="6" fill="#fff" opacity=".8"/>
    <path d="M44 150 h14 M142 150 h14" stroke="#334155" stroke-width="6"/>`;
const RB = ['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'];
Object.assign(BACK, {
  goldboost: () => rocketPair('#facc15', '#f97316', '#f97316', '#fef08a') + `<g class="sparkle"><path d="M10 110 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1z" fill="#fde047"/><path d="M182 104 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1z" fill="#fde047"/></g>`,
  rainbowboost: () => `<g class="flame">${RB.map((c,i)=>`<rect x="${18+i*4}" y="196" width="4" height="${16+(i%2)*6}" fill="${c}"/><rect x="${160+i*4}" y="196" width="4" height="${16+(i%2)*6}" fill="${c}"/>`).join('')}</g>` + rocketPair('#e0e7ff', '#ec4899', 'none', 'none'),
  butterfly: () => `<g opacity=".95"><path d="M96 140 Q30 80 20 130 Q16 160 96 150Z" fill="#fb923c" stroke="#7c2d12" stroke-width="3"/><path d="M104 140 Q170 80 180 130 Q184 160 104 150Z" fill="#fb923c" stroke="#7c2d12" stroke-width="3"/><path d="M96 152 Q40 200 54 180 Q50 160 96 156Z" fill="#f472b6" stroke="#7c2d12" stroke-width="3"/><path d="M104 152 Q160 200 146 180 Q150 160 104 156Z" fill="#f472b6" stroke="#7c2d12" stroke-width="3"/><circle cx="44" cy="124" r="7" fill="#fde047"/><circle cx="156" cy="124" r="7" fill="#fde047"/></g>`,
  angel: () => `<g fill="#fff" stroke="#cbd5e1" stroke-width="3">${[0,1,2].map(i=>`<ellipse cx="${44-i*6}" cy="${130+i*16}" rx="${30-i*4}" ry="11" transform="rotate(${-20+i*10} ${44-i*6} ${130+i*16})"/><ellipse cx="${156+i*6}" cy="${130+i*16}" rx="${30-i*4}" ry="11" transform="rotate(${20-i*10} ${156+i*6} ${130+i*16})"/>`).join('')}</g>`,
  batwings: () => `<path d="M70 140 Q40 100 6 112 Q22 124 16 140 Q30 136 34 152 Q46 142 70 168Z" fill="#4c1d95" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/><path d="M130 140 Q160 100 194 112 Q178 124 184 140 Q170 136 166 152 Q154 142 130 168Z" fill="#4c1d95" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/>`,
  goldcape: () => `<path d="M58 130 Q100 118 142 130 L172 214 Q100 228 28 214Z" fill="#facc15" stroke="#a16207" stroke-width="4" stroke-linejoin="round"/><path d="M60 140 Q100 128 140 140" stroke="#fef08a" stroke-width="4" fill="none"/><g class="sparkle"><circle cx="50" cy="200" r="3" fill="#fff"/><circle cx="150" cy="196" r="3" fill="#fff"/></g>`,
  jetpack: () => `<rect x="60" y="120" width="80" height="62" rx="14" fill="#64748b" stroke="#1e293b" stroke-width="4"/><g class="flame"><path d="M66 182 q10 30 20 0z M114 182 q10 30 20 0z" fill="#f97316"/><path d="M71 182 q5 16 10 0z M119 182 q5 16 10 0z" fill="#fde047"/></g>`
});
Object.assign(HEAD, {
  tiara: b => { const y = headTop(b); return `<path d="M72 ${y+8} Q100 ${y-2} 128 ${y+8}" stroke="#e5e7eb" stroke-width="5" fill="none"/><path d="M78 ${y+4} L84 ${y-14} L92 ${y+1} L100 ${y-24} L108 ${y+1} L116 ${y-14} L122 ${y+4}" fill="#e0e7ff" stroke="#94a3b8" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="${y-8}" r="5" fill="#ec4899"/><circle cx="85" cy="${y-3}" r="3" fill="#38bdf8"/><circle cx="115" cy="${y-3}" r="3" fill="#38bdf8"/><g class="sparkle"><path d="M126 ${y-20} l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z" fill="#fde047"/></g>`; },
  unicorn: b => { const y = headTop(b); return `<path d="M91 ${y+6} L100 ${y-48} L109 ${y+6}Z" fill="#fef3c7" stroke="#d97706" stroke-width="3" stroke-linejoin="round"/><path d="M93 ${y-4} l14 -6 M95 ${y-18} l10 -5 M97 ${y-32} l6 -4" stroke="#f472b6" stroke-width="4"/>${[[76,'#f9a8d4'],[124,'#c4b5fd']].map(([x,c])=>`<circle cx="${x}" cy="${y+4}" r="7" fill="${c}"/><circle cx="${x}" cy="${y+4}" r="2.5" fill="#fff"/>`).join('')}`; },
  catears: b => { const y = headTop(b); return `<path d="M56 ${y+20} Q100 ${y-14} 144 ${y+20}" stroke="#f472b6" stroke-width="6" fill="none"/><path d="M62 ${y+8} L66 ${y-24} L88 ${y-2}Z M138 ${y+8} L134 ${y-24} L112 ${y-2}Z" fill="#f9a8d4" stroke="#be185d" stroke-width="3" stroke-linejoin="round"/><path d="M68 ${y} L70 ${y-14} L80 ${y-3}Z M132 ${y} L130 ${y-14} L120 ${y-3}Z" fill="#fff" opacity=".7"/>`; },
  bunny: b => { const y = headTop(b); return `<ellipse cx="80" cy="${y-24}" rx="11" ry="32" transform="rotate(-12 80 ${y-24})" fill="#fff" stroke="#94a3b8" stroke-width="3"/><ellipse cx="120" cy="${y-24}" rx="11" ry="32" transform="rotate(12 120 ${y-24})" fill="#fff" stroke="#94a3b8" stroke-width="3"/><ellipse cx="80" cy="${y-24}" rx="5" ry="22" transform="rotate(-12 80 ${y-24})" fill="#fbcfe8"/><ellipse cx="120" cy="${y-24}" rx="5" ry="22" transform="rotate(12 120 ${y-24})" fill="#fbcfe8"/>`; },
  knight: b => { const y = headTop(b); return `<path d="M56 ${y+30} Q56 ${y-20} 100 ${y-22} Q144 ${y-20} 144 ${y+30} L134 ${y+30} Q132 ${y-4} 100 ${y-6} Q68 ${y-4} 66 ${y+30}Z" fill="#cbd5e1" stroke="#334155" stroke-width="3.5"/><path d="M100 ${y-22} v16" stroke="#334155" stroke-width="3"/><path d="M100 ${y-22} q-4 -26 20 -32 q-8 14 -12 32z" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/>`; },
  viking: b => { const y = headTop(b); return `<path d="M60 ${y+18} Q60 ${y-22} 100 ${y-24} Q140 ${y-22} 140 ${y+18}Z" fill="#94a3b8" stroke="#334155" stroke-width="3.5"/><rect x="58" y="${y+10}" width="84" height="10" rx="4" fill="#a16207" stroke="#422006" stroke-width="3"/><path d="M62 ${y+6} Q36 ${y-6} 40 ${y-36} Q50 ${y-14} 66 ${y-6}Z M138 ${y+6} Q164 ${y-6} 160 ${y-36} Q150 ${y-14} 134 ${y-6}Z" fill="#fef3c7" stroke="#78350f" stroke-width="3" stroke-linejoin="round"/>`; },
  pirate: b => { const y = headTop(b); return `<path d="M52 ${y+10} Q100 ${y-44} 148 ${y+10} Q100 ${y-6} 52 ${y+10}Z" fill="#1f2937" stroke="#000" stroke-width="3"/><path d="M58 ${y+6} Q100 ${y-8} 142 ${y+6}" stroke="#facc15" stroke-width="3" fill="none"/><circle cx="100" cy="${y-14}" r="7" fill="#fff"/><circle cx="97" cy="${y-15}" r="1.6" fill="#000"/><circle cx="103" cy="${y-15}" r="1.6" fill="#000"/><path d="M92 ${y-3} l16 -6 M92 ${y-9} l16 6" stroke="#fff" stroke-width="2.5"/>`; },
  cowboy: b => { const y = headTop(b); return `<ellipse cx="100" cy="${y+8}" rx="62" ry="12" fill="#a16207" stroke="#422006" stroke-width="3"/><path d="M72 ${y+6} Q70 ${y-30} 100 ${y-22} Q130 ${y-30} 128 ${y+6}Z" fill="#b45309" stroke="#422006" stroke-width="3"/><rect x="72" y="${y-2}" width="56" height="7" fill="#422006"/>`; },
  cap: b => { const y = headTop(b); return `<path d="M58 ${y+16} Q60 ${y-24} 100 ${y-24} Q140 ${y-24} 142 ${y+16}Z" fill="#2563eb" stroke="#1e3a8a" stroke-width="3.5"/><path d="M130 ${y+14} Q168 ${y+10} 172 ${y+22} L134 ${y+22}Z" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="3"/><circle cx="100" cy="${y-22}" r="4" fill="#1e3a8a"/><text x="88" y="${y+8}" font-size="18" font-weight="700" fill="#fff" font-family="sans-serif">★</text>`; },
  halo: b => { const y = headTop(b); return `<g class="sparkle"><ellipse cx="100" cy="${y-20}" rx="34" ry="9" fill="none" stroke="#fde047" stroke-width="7"/><ellipse cx="100" cy="${y-20}" rx="34" ry="9" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/></g>`; },
  tophat: b => { const y = headTop(b); return `<ellipse cx="100" cy="${y+8}" rx="44" ry="8" fill="#111827"/><rect x="74" y="${y-38}" width="52" height="46" rx="4" fill="#111827"/><rect x="74" y="${y-6}" width="52" height="9" fill="#dc2626"/>`; },
  beanie: b => { const y = headTop(b); return `<path d="M56 ${y+22} Q56 ${y-28} 100 ${y-28} Q144 ${y-28} 144 ${y+22}Z" fill="#14b8a6" stroke="#115e59" stroke-width="3.5"/><rect x="54" y="${y+12}" width="92" height="14" rx="6" fill="#0d9488" stroke="#115e59" stroke-width="3"/><circle cx="100" cy="${y-30}" r="10" fill="#fef3c7" stroke="#115e59" stroke-width="3"/>`; },
  flowerclip: b => { const y = headTop(b); return `${[0,72,144,216,288].map(a=>`<circle cx="${128+10*Math.cos(a*Math.PI/180)}" cy="${y+8+10*Math.sin(a*Math.PI/180)}" r="8" fill="#f472b6" stroke="#be185d" stroke-width="2"/>`).join('')}<circle cx="128" cy="${y+8}" r="6" fill="#fde047"/>`; }
});
Object.assign(FACE, {
  hearts: b => `${[82,118].map(x=>`<path d="M${x} 98 l-14 -14 a7 7 0 0 1 14 -8 a7 7 0 0 1 14 8z" fill="#f472b6" fill-opacity=".75" stroke="#be185d" stroke-width="3" stroke-linejoin="round"/>`).join('')}<path d="M96 84 h8" stroke="#be185d" stroke-width="3"/>`,
  rainbowshades: b => `<defs><linearGradient id="rbg" x1="0" x2="1">${RB.map((c,i)=>`<stop offset="${i/5}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect x="64" y="76" width="32" height="20" rx="8" fill="url(#rbg)" stroke="#111827" stroke-width="2.5"/><rect x="104" y="76" width="32" height="20" rx="8" fill="url(#rbg)" stroke="#111827" stroke-width="2.5"/><path d="M96 84 h8" stroke="#111827" stroke-width="4"/>`,
  goggles: b => `<path d="M54 86 h92" stroke="#78350f" stroke-width="7"/><circle cx="82" cy="86" r="15" fill="#bae6fd" fill-opacity=".6" stroke="#a16207" stroke-width="5"/><circle cx="118" cy="86" r="15" fill="#bae6fd" fill-opacity=".6" stroke="#a16207" stroke-width="5"/>`,
  eyepatch: b => `<path d="M56 70 L144 100" stroke="#111827" stroke-width="3"/><ellipse cx="118" cy="88" rx="13" ry="11" fill="#111827"/>`,
  mustache: b => `<path d="M100 112 q-12 -8 -24 2 q-8 6 -16 0 q8 14 22 8 q12 -4 18 -10 q6 6 18 10 q14 6 22 -8 q-8 6 -16 0 q-12 -10 -24 -2z" fill="#3f2a1d"/>`,
  heromask: b => `<path d="M58 80 Q80 66 100 78 Q120 66 142 80 Q140 98 120 98 Q106 98 100 88 Q94 98 80 98 Q60 98 58 80Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3"/><ellipse cx="82" cy="86" rx="8" ry="6" fill="#fff"/><ellipse cx="118" cy="86" rx="8" ry="6" fill="#fff"/><circle cx="82" cy="86" r="4" fill="#111827"/><circle cx="118" cy="86" r="4" fill="#111827"/>`,
  facepaint: b => `${[[68,106,'#38bdf8'],[132,106,'#f472b6'],[126,96,'#facc15']].map(([x,y,c])=>`<path d="M${x} ${y-7} l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z" fill="${c}"/>`).join('')}`
});
const NECK = {
  bowtie: () => `<path d="M100 140 l-18 -10 v20z M100 140 l18 -10 v20z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="140" r="5" fill="#b91c1c"/>`,
  pearls: () => `${Array.from({length:9},(_,i)=>{const a=(200+i*17.5)*Math.PI/180;return `<circle cx="${100+34*Math.cos(a)*-1}" cy="${132-18*Math.sin(a)}" r="4.5" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/>`;}).join('')}`,
  scarf: () => `<path d="M62 134 Q100 152 138 134 L138 146 Q100 164 62 146Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/><path d="M118 148 l6 34 l14 -4 l-8 -32z" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/><path d="M66 140 Q100 156 134 140" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="6 6"/>`,
  medal: () => `<path d="M84 132 l16 26 l16 -26" stroke="#2563eb" stroke-width="8" fill="none"/><circle cx="100" cy="166" r="12" fill="#facc15" stroke="#a16207" stroke-width="3"/><text x="94" y="171" font-size="13" font-weight="700" fill="#a16207" font-family="sans-serif">1</text>`,
  locket: () => `<path d="M76 134 Q100 156 124 134" stroke="#fbbf24" stroke-width="2.5" fill="none"/><path d="M100 162 l-10 -10 a5.5 5.5 0 0 1 10 -6 a5.5 5.5 0 0 1 10 6z" fill="#f472b6" stroke="#be185d" stroke-width="2.5"/>`
};
const swordSVG = (blade, glow, hilt, extra='') => `<path d="M158 152 L184 62 L192 58 L191 67 L166 155Z" fill="${glow}" opacity=".45" stroke="${glow}" stroke-width="10" stroke-linejoin="round"/>
  <path d="M158 152 L184 62 L192 58 L191 67 L166 155Z" fill="${blade}" stroke="#334155" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M166 130 L182 74" stroke="#fff" stroke-width="2.5" opacity=".8" class="sparkle"/>${extra}
  <path d="M146 148 L180 160" stroke="${hilt}" stroke-width="8" stroke-linecap="round"/><path d="M161 156 L154 180" stroke="#78350f" stroke-width="8" stroke-linecap="round"/><circle cx="153" cy="184" r="6" fill="${hilt}" stroke="#334155" stroke-width="2"/>`;
Object.assign(HAND, {
  firesword: () => swordSVG('#fb923c', '#ef4444', '#facc15', `<g class="flame"><path d="M186 58 q8 -14 0 -26 q-2 12 -8 18z" fill="#f97316"/></g>`),
  icesword: () => swordSVG('#bae6fd', '#38bdf8', '#e0f2fe', `<g class="sparkle"><path d="M176 96 l3 -6 l3 6 l-3 6z M170 120 l2 -4 l2 4 l-2 4z" fill="#fff"/></g>`),
  goldsword: () => swordSVG('#fde047', '#facc15', '#ef4444', `<g class="sparkle"><path d="M194 50 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z" fill="#fff"/></g>`),
  rainbowsword: () => `<defs><linearGradient id="rbs" x1="0" y1="1" x2="0" y2="0">${RB.map((c,i)=>`<stop offset="${i/5}" stop-color="${c}"/>`).join('')}</linearGradient></defs>` + swordSVG('url(#rbs)', '#e879f9', '#facc15'),
  staff: () => `<line x1="152" y1="204" x2="176" y2="80" stroke="#78350f" stroke-width="7" stroke-linecap="round"/><circle cx="178" cy="70" r="14" fill="#a855f7" stroke="#581c87" stroke-width="3"/><circle cx="174" cy="66" r="4" fill="#fff" opacity=".8"/><g class="sparkle"><circle cx="196" cy="58" r="3" fill="#e9d5ff"/><circle cx="162" cy="52" r="2.5" fill="#e9d5ff"/></g>`,
  bubblewand: () => `<line x1="152" y1="196" x2="174" y2="140" stroke="#f472b6" stroke-width="5" stroke-linecap="round"/><circle cx="178" cy="130" r="10" fill="none" stroke="#f472b6" stroke-width="4"/><g class="sparkle">${[[184,100,9],[168,84,6],[192,70,5],[176,54,7]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#e0f2fe" fill-opacity=".4" stroke="#7dd3fc" stroke-width="2"/>`).join('')}</g>`,
  lollipop: () => `<line x1="156" y1="196" x2="170" y2="130" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/><circle cx="174" cy="112" r="22" fill="#f472b6" stroke="#9d174d" stroke-width="3"/><path d="M174 112 m-14 0 a14 14 0 1 1 14 14 a9 9 0 1 1 -9 -9 a4 4 0 1 1 4 4" stroke="#fff" stroke-width="4" fill="none"/>`,
  teddy: () => `<circle cx="160" cy="180" r="18" fill="#b45309" stroke="#78350f" stroke-width="3"/><circle cx="160" cy="154" r="14" fill="#b45309" stroke="#78350f" stroke-width="3"/><circle cx="149" cy="143" r="6" fill="#b45309" stroke="#78350f" stroke-width="3"/><circle cx="171" cy="143" r="6" fill="#b45309" stroke="#78350f" stroke-width="3"/><circle cx="155" cy="152" r="2" fill="#1f2937"/><circle cx="165" cy="152" r="2" fill="#1f2937"/><ellipse cx="160" cy="159" rx="5" ry="3.5" fill="#fde68a"/><circle cx="160" cy="180" r="9" fill="#fde68a"/>`,
  guitar: () => `<line x1="160" y1="170" x2="194" y2="92" stroke="#78350f" stroke-width="6"/><rect x="186" y="80" width="12" height="16" rx="3" transform="rotate(24 192 88)" fill="#1f2937"/><path d="M136 188 Q128 166 146 160 Q150 146 166 152 Q182 158 176 176 Q186 194 166 200 Q146 206 136 188Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3"/><circle cx="158" cy="178" r="6" fill="#1f2937"/>`,
  flag: () => `<line x1="158" y1="204" x2="170" y2="60" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/><path d="M170 62 Q186 54 200 64 L198 98 Q184 88 168 96Z" fill="#8b5cf6" stroke="#4c1d95" stroke-width="3"/><path d="M184 70 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z" fill="#fde047"/>`
});
const shieldShape = 'M14 124 H66 V146 Q66 176 40 192 Q14 176 14 146Z';
const SHIELD = {
  sh_knight: () => `<path d="${shieldShape}" fill="#cbd5e1" stroke="#334155" stroke-width="4"/><path d="M22 132 H58 V146 Q58 170 40 182 Q22 170 22 146Z" fill="#2563eb"/><path d="M24 150 L40 140 L56 150 M24 162 L40 152 L56 162" stroke="#facc15" stroke-width="5" fill="none"/>`,
  sh_star: () => `<path d="${shieldShape}" fill="#7c3aed" stroke="#2e1065" stroke-width="4"/><path d="M40 136 l6 13 l14 2 l-10 10 l2 14 l-12 -7 l-12 7 l2 -14 l-10 -10 l14 -2z" fill="#fde047" stroke="#a16207" stroke-width="2"/>`,
  sh_heart: () => `<path d="${shieldShape}" fill="#fbcfe8" stroke="#be185d" stroke-width="4"/><path d="M40 176 l-16 -16 a8 8 0 0 1 16 -10 a8 8 0 0 1 16 10z" fill="#ec4899" stroke="#9d174d" stroke-width="2.5"/><g class="sparkle"><circle cx="26" cy="134" r="3" fill="#fff"/></g>`,
  sh_bolt: () => `<path d="${shieldShape}" fill="#111827" stroke="#facc15" stroke-width="4"/><path d="M44 130 L28 158 H40 L34 184 L54 150 H42 L50 130Z" fill="#facc15"/>`,
  sh_wood: () => `<circle cx="40" cy="158" r="30" fill="#b45309" stroke="#422006" stroke-width="4"/><path d="M40 128 V188 M10 158 H70" stroke="#78350f" stroke-width="3"/><circle cx="40" cy="158" r="9" fill="#94a3b8" stroke="#334155" stroke-width="3"/>`,
  sh_dragon: () => `<path d="${shieldShape}" fill="#facc15" stroke="#a16207" stroke-width="4"/><path d="M26 168 Q30 140 46 140 Q56 140 54 150 Q48 146 44 150 Q52 156 44 164 Q50 170 40 178 Q36 170 26 168Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/><g class="sparkle"><path d="M58 130 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z" fill="#fff"/></g>`
};
const PETS = { p_dragon:'🐲', p_kitty:'🐱', p_puppy:'🐶', p_bunny:'🐰', p_unicorn:'🦄', p_owl:'🦉', p_panda:'🐼', p_robot:'🤖', p_turtle:'🐢', p_phoenix:'🐦‍🔥' };
const PET = Object.fromEntries(Object.entries(PETS).map(([id,e]) => [id, () => `<g class="petbob"><ellipse cx="34" cy="214" rx="18" ry="4" fill="#000" opacity=".15"/><text x="34" y="210" font-size="34" text-anchor="middle">${e}</text></g>`]));
const auraEmoji = (e, pts) => `<g class="twinkle">${pts.map(([x,y,s],i)=>`<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" style="animation-delay:${i*0.25}s">${e}</text>`).join('')}</g>`;
const AURA_PTS = [[30,40,20],[172,36,18],[18,110,16],[186,112,20],[44,76,14],[160,80,14],[100,22,16]];
const AURA = {
  a_sparkle: () => auraEmoji('✨', AURA_PTS),
  a_hearts: () => auraEmoji('💖', AURA_PTS),
  a_stars: () => auraEmoji('⭐', AURA_PTS),
  a_snow: () => auraEmoji('❄️', AURA_PTS),
  a_bubbles: () => auraEmoji('🫧', AURA_PTS),
  a_bolt: () => `<circle cx="100" cy="120" r="88" fill="#facc15" opacity=".18"/>` + auraEmoji('⚡', AURA_PTS),
  a_fire: () => `<g class="flame"><path d="M30 214 Q20 150 50 120 Q46 150 62 160 Q60 110 100 80 Q96 130 120 140 Q130 110 150 104 Q140 150 170 160 Q186 190 170 214Z" fill="#f97316" opacity=".55"/><path d="M50 214 Q44 170 70 150 Q74 180 100 120 Q110 170 130 160 Q150 190 150 214Z" fill="#fde047" opacity=".5"/></g>`,
  a_rainbow: () => `<g class="twinkle">${RB.map((c,i)=>`<circle cx="100" cy="118" r="${92-i*6}" fill="none" stroke="${c}" stroke-width="5" opacity=".55"/>`).join('')}</g>`
};

/* ================= MY WORLD: free-placement world builder ================= */
// [category, id, emoji, name, price, unlockLevel?]
const WORLD_ITEMS = [
  ['home','house','🏠','House',15], ['home','garden','🏡','Garden House',20], ['home','hut','🛖','Hut',10], ['home','tent','⛺','Tent',10],
  ['home','school','🏫','School',30], ['home','hq','🏢','Hero HQ',50], ['home','tower','🗼','Tall Tower',40], ['home','museum','🏛️','Museum',40],
  ['home','circus','🎪','Circus Tent',35], ['home','factory','🏭','Robot Factory',45], ['home','castle','🏰','Castle',60,4], ['home','ufo','🛸','UFO Base',70,6],
  ['nature','tree','🌳','Tree',5], ['nature','pine','🌲','Pine Tree',5], ['nature','palm','🌴','Palm Tree',8], ['nature','blossom','🌸','Blossom',5],
  ['nature','sunflower','🌻','Sunflower',5], ['nature','tulip','🌷','Tulip',5], ['nature','mushroom','🍄','Mushroom',5], ['nature','rock','🪨','Rock',3],
  ['nature','mountain','⛰️','Mountain',25], ['nature','volcano','🌋','Volcano',40], ['nature','rainbow','🌈','Rainbow',30], ['nature','cloud','☁️','Cloud',5],
  ['nature','sun','☀️','Sun',10], ['nature','moon','🌙','Moon',10], ['nature','star','⭐','Star',5], ['nature','crystal','💎','Giant Crystal',20],
  ['fun','ferris','🎡','Ferris Wheel',50], ['fun','coaster','🎢','Roller Coaster',60,5], ['fun','carousel','🎠','Carousel',45], ['fun','slide','🛝','Slide',20],
  ['fun','fountain','⛲','Fountain',25], ['fun','balloons','🎈','Balloon',8], ['fun','campfire','🔥','Campfire',10], ['fun','kite','🪁','Kite',8],
  ['fun','ball','⚽','Ball',5], ['fun','target','🎯','Target',8], ['fun','trophy','🏆','Trophy',20], ['fun','present','🎁','Present',8],
  ['fun','icecream','🍦','Ice Cream',5], ['fun','cupcake','🧁','Cupcake',5], ['fun','pizza','🍕','Pizza',5], ['fun','treasure','💰','Treasure',30],
  ['ride','rocket','🚀','Rocket',40], ['ride','jet','✈️','Jet',35], ['ride','heli','🚁','Helicopter',35], ['ride','car','🚗','Car',20],
  ['ride','racecar','🏎️','Race Car',35], ['ride','train','🚂','Train',40], ['ride','ship','🚢','Ship',40], ['ride','sailboat','⛵','Sailboat',20],
  ['ride','firetruck','🚒','Fire Truck',30], ['ride','scooter','🛴','Scooter',10],
  ['animal','trex','🦖','T-Rex',40], ['animal','dino','🦕','Long-Neck Dino',40], ['animal','dragon','🐉','Dragon',50,4], ['animal','unicorn','🦄','Unicorn',45],
  ['animal','dolphin','🐬','Dolphin',20], ['animal','butterfly','🦋','Butterfly',8], ['animal','bee','🐝','Bee',5], ['animal','ladybug','🐞','Ladybug',5],
  ['animal','parrot','🦜','Parrot',15], ['animal','penguin','🐧','Penguin',15], ['animal','panda','🐼','Panda',20], ['animal','lion','🦁','Lion',25],
  ['animal','elephant','🐘','Elephant',25], ['animal','giraffe','🦒','Giraffe',25]
];
const WORLD_BY_ID = Object.fromEntries(WORLD_ITEMS.map(i => [i[1], i]));
const WORLD_CATS = { home:'🏠 Buildings', nature:'🌳 Nature', fun:'🎡 Fun', ride:'🚀 Rides', animal:'🦖 Animals', friends:'💛 My Friends' };
const WORLD_THEMES = {
  meadow:  { name:'Sunny Meadow', price:0,  sky:'linear-gradient(#7dd3fc,#e0f2fe)', ground:'linear-gradient(#86efac,#22c55e)' },
  beach:   { name:'Beach Day',    price:25, sky:'linear-gradient(#38bdf8,#bae6fd)', ground:'linear-gradient(#fde68a 0 45%,#38bdf8 45%)' },
  snow:    { name:'Snow Land',    price:25, sky:'linear-gradient(#a5b4fc,#e0e7ff)', ground:'linear-gradient(#f8fafc,#cbd5e1)' },
  night:   { name:'Night Sky',    price:30, sky:'radial-gradient(#fff 1px,transparent 1.5px) 0 0/40px 40px, linear-gradient(#0f172a,#312e81)', ground:'linear-gradient(#166534,#14532d)' },
  candy:   { name:'Candy Land',   price:40, sky:'linear-gradient(#fbcfe8,#fdf2f8)', ground:'repeating-linear-gradient(45deg,#f9a8d4 0 20px,#fff 20px 40px)' },
  space:   { name:'Outer Space',  price:40, sky:'radial-gradient(#fff 1.2px,transparent 1.7px) 0 0/34px 34px, linear-gradient(#020617,#1e1b4b)', ground:'radial-gradient(#94a3b8 10px,transparent 11px) 0 0/60px 40px, linear-gradient(#64748b,#334155)' },
  lava:    { name:'Volcano Island', price:40, sky:'linear-gradient(#7c2d12,#fb923c)', ground:'linear-gradient(#292524,#7f1d1d)' }
};
const WORLD_W = 1800, WORLD_H = 470, GROUND_Y = 300;

/* ---------- island scenery ----------
   Each place draws a layered scene: sky and clouds, far and near mountains, hills with trees,
   a sparkling lake with a dock, a sandy shore, and grass where things are placed (from y≈280).
   Positions come from a seeded random, so the scene looks the same every visit. */
const SCENE_PAL = {
  meadow:{ sky:['#4cc3ff','#d6f3ff'], sun:'#fff7b0', far:'#a7c0e0', mid:'#8e9fb6', midHi:'#c3cfdc', cap:'#ffffff', hill:'#5cc85e', hill2:'#43a94b', tree:'#1f8a46', tree2:'#14663a', water:['#3cc6ff','#0f86e0'], sand:'#f7dfa1', grass:['#82dc58','#4fb53e'], tuft:'#3f9e34', trees:'pine' },
  beach: { sky:['#2fb9f5','#e3f8ff'], sun:'#fff3a3', far:'#b5d3ee', mid:'#d6c08f', midHi:'#efe0b8', cap:'#f5ead0', hill:'#86d06f', hill2:'#5fb655', tree:'#2f9e54', tree2:'#7c5a33', water:['#2ee0f2','#0891d6'], sand:'#fde7a3', grass:['#fde7a3','#f3cf79'], tuft:'#d9b45a', trees:'palm' },
  snow:  { sky:['#8ea6ff','#eef2ff'], sun:'#ffffff', far:'#cdd6fb', mid:'#dfe6f1', midHi:'#ffffff', cap:'#ffffff', hill:'#f4f7fb', hill2:'#dfe7f1', tree:'#2f6f5e', tree2:'#1f4f43', water:['#c5ecff','#86cdf2'], sand:'#e6edf5', grass:['#ffffff','#dde6f0'], tuft:'#c3d0de', trees:'snowpine' },
  night: { sky:['#070b22','#2b2f7d'], sun:'#fef6c3', far:'#283363', mid:'#323d6c', midHi:'#46538a', cap:'#c7d2fe', hill:'#1f5c3a', hill2:'#174a2f', tree:'#0f3d26', tree2:'#0a2c1b', water:['#2849a8','#0b1a4a'], sand:'#8f8c78', grass:['#2f7a45','#1c5530'], tuft:'#174a2a', trees:'pine', stars:true },
  candy: { sky:['#ffbde4','#fff1f9'], sun:'#ffffff', far:'#f7add6', mid:'#ea8dc6', midHi:'#ffd0ea', cap:'#ffffff', hill:'#ffb6dc', hill2:'#f79ccc', tree:'#c084fc', tree2:'#a855f7', water:['#cbbcff','#a58bfa'], sand:'#ffe3f4', grass:['#ffd3ee','#f9a8d4'], tuft:'#f472b6', trees:'lolly' },
  space: { sky:['#020617','#231e5c'], sun:'#fb923c', far:'#4c1d95', mid:'#5b21b6', midHi:'#7c3aed', cap:'#c4b5fd', hill:'#3b4558', hill2:'#2b3446', tree:'#22d3ee', tree2:'#0e7490', water:['#2ee6ff','#6366f1'], sand:'#9aa6b8', grass:['#6b778c','#3a4457'], tuft:'#4b566b', trees:'crystal', stars:true },
  lava:  { sky:['#6f2410','#ff9a4d'], sun:'#ffe08a', far:'#4a2a1d', mid:'#5c3322', midHi:'#7a4a33', cap:'#ff7a3d', hill:'#45403f', hill2:'#36312f', tree:'#1f1a17', tree2:'#000000', water:['#ffb347','#e0321c'], sand:'#80766f', grass:['#4a4542','#2c2826'], tuft:'#1f1b19', trees:'dead' }
};
function seeded(n){ return () => { n = (n * 1664525 + 1013904223) % 4294967296; return n / 4294967296; }; }
function sceneSVG(themeId){
  const P = SCENE_PAL[themeId] || SCENE_PAL.meadow, R = seeded([...themeId].reduce((a, c) => a + c.charCodeAt(0), 7));
  const W = WORLD_W, H = WORLD_H;
  // a jagged ridge line across the whole width
  const ridge = (base, minH, maxH, step) => { let d = `M0 ${base}`; for (let x = 0; x <= W + step; x += step) d += ` L${x} ${base - minH - R() * (maxH - minH)} L${x + step / 2} ${base - minH * 0.5 - R() * minH}`; return d + ` L${W} ${base + 40} L0 ${base + 40}Z`; };
  const hills = (base, amp) => { let d = `M0 ${base}`; for (let x = 0; x <= W; x += 150) d += ` Q${x + 75} ${base - amp - R() * amp} ${x + 150} ${base}`; return d + ` L${W} ${base + 60} L0 ${base + 60}Z`; };
  const tree = (x, y, s) => {
    if (P.trees === 'palm') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q4 -30 2 -58" stroke="${P.tree2}" stroke-width="5" fill="none"/>${[-60,-20,20,60,100].map(a => `<path d="M2 -58 q${Math.cos(a*Math.PI/180)*26} ${-10+Math.sin(a*Math.PI/180)*6} ${Math.cos(a*Math.PI/180)*40} 14" stroke="${P.tree}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
    if (P.trees === 'lolly') return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="-40" width="4" height="40" fill="#fff"/><circle cx="0" cy="-48" r="16" fill="${R() < .5 ? P.tree : '#f472b6'}"/><path d="M-10 -48 a10 10 0 1 1 10 10" stroke="#fff" stroke-width="3" fill="none"/></g>`;
    if (P.trees === 'crystal') return `<g transform="translate(${x} ${y}) scale(${s})" opacity=".9"><path d="M0 0 L-8 -30 L0 -52 L8 -30Z" fill="${P.tree}"/><path d="M0 -52 L8 -30 L0 0Z" fill="${P.tree2}"/></g>`;
    if (P.trees === 'dead') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 L0 -40 M0 -26 L-12 -38 M0 -32 L10 -44" stroke="${P.tree}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
    const snow = P.trees === 'snowpine' ? `<path d="M0 -62 L-8 -48 L8 -48Z M-12 -34 L12 -34 L0 -44Z" fill="#fff"/>` : '';
    return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-8" width="6" height="10" fill="#7a4b2a"/><path d="M0 -62 L-14 -36 L-7 -36 L-20 -12 L20 -12 L7 -36 L14 -36Z" fill="${P.tree}"/><path d="M0 -62 L14 -36 L7 -36 L20 -12 L0 -12Z" fill="${P.tree2}" opacity=".55"/>${snow}</g>`;
  };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[1]}"/></linearGradient>
    <linearGradient id="sc-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.water[0]}"/><stop offset="1" stop-color="${P.water[1]}"/></linearGradient>
    <linearGradient id="sc-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.grass[0]}"/><stop offset="1" stop-color="${P.grass[1]}"/></linearGradient>
    <radialGradient id="sc-sun"><stop offset="0" stop-color="${P.sun}"/><stop offset=".35" stop-color="${P.sun}" stop-opacity=".9"/><stop offset="1" stop-color="${P.sun}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sc-sky)"/>`;
  if (P.stars) for (let i = 0; i < 90; i++) s += `<circle cx="${R() * W}" cy="${R() * 180}" r="${(R() * 1.4 + .4).toFixed(1)}" fill="#fff" opacity="${(R() * .6 + .3).toFixed(2)}"/>`;
  s += `<circle cx="1480" cy="78" r="90" fill="url(#sc-sun)"/><circle cx="1480" cy="78" r="30" fill="${P.sun}"/>`;
  // drifting clouds
  for (let i = 0; i < 6; i++){ const x = R() * W, y = 30 + R() * 90, c = R() * .5 + .8;
    s += `<g class="sc-cloud" style="animation-duration:${(60 + R() * 60).toFixed(0)}s;animation-delay:-${(R() * 60).toFixed(0)}s" opacity="${P.stars ? .35 : .9}"><g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${c.toFixed(2)})"><ellipse cx="0" cy="0" rx="46" ry="18" fill="#fff"/><ellipse cx="-24" cy="-8" rx="24" ry="18" fill="#fff"/><ellipse cx="16" cy="-14" rx="28" ry="22" fill="#fff"/></g></g>`; }
  // far mountains, near mountains with highlights and caps
  s += `<path d="${ridge(232, 60, 140, 160)}" fill="${P.far}"/>`;
  const peaks = [];
  for (let x = 60; x < W; x += 260 + R() * 120) peaks.push([x, 110 + R() * 60, 120 + R() * 80]);
  peaks.forEach(([x, top, half]) => {
    s += `<path d="M${x - half} 250 L${x} ${top} L${x + half} 250Z" fill="${P.mid}"/><path d="M${x} ${top} L${x + half} 250 L${x + half * .2} 250Z" fill="${P.midHi}" opacity=".55"/>`;
    s += `<path d="M${x} ${top} L${x - half * .22} ${top + 30} L${x - half * .08} ${top + 24} L${x + half * .06} ${top + 34} L${x + half * .22} ${top + 30}Z" fill="${P.cap}" opacity=".95"/>`;
  });
  // hills with trees
  s += `<path d="${hills(238, 26)}" fill="${P.hill2}"/><path d="${hills(252, 18)}" fill="${P.hill}"/>`;
  for (let i = 0; i < 46; i++){ const x = R() * W, y = 226 + R() * 30; s += tree(x.toFixed(0), y.toFixed(0), (.55 + R() * .5).toFixed(2)); }
  // lake with shimmer, a dock and a float ring
  s += `<rect x="0" y="246" width="${W}" height="32" fill="url(#sc-water)"/>`;
  for (let i = 0; i < 28; i++) s += `<rect class="sc-shimmer" style="animation-delay:-${(R() * 3).toFixed(1)}s" x="${(R() * W).toFixed(0)}" y="${(250 + R() * 24).toFixed(0)}" width="${(16 + R() * 34).toFixed(0)}" height="2.5" rx="1.5" fill="#fff" opacity=".7"/>`;
  s += `<g transform="translate(250 252)"><rect x="0" y="0" width="120" height="9" fill="#a0693c"/><rect x="0" y="-4" width="120" height="5" fill="#c08350"/>${[6, 40, 74, 108].map(px => `<rect x="${px}" y="6" width="6" height="18" fill="#7a4b2a"/>`).join('')}</g>`;
  s += `<g class="sc-bob"><circle cx="1180" cy="262" r="10" fill="none" stroke="#ff5a5a" stroke-width="6"/><circle cx="1180" cy="262" r="10" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="7 8"/></g>`;
  // sandy shore and grass
  let shore = `M0 274`; for (let x = 0; x <= W; x += 120) shore += ` Q${x + 60} ${266 + R() * 8} ${x + 120} 274`;
  s += `<path d="${shore} L${W} 296 L0 296Z" fill="${P.sand}"/>`;
  let edge = `M0 286`; for (let x = 0; x <= W; x += 90) edge += ` Q${x + 45} ${278 + R() * 10} ${x + 90} 286`;
  s += `<path d="${edge} L${W} ${H} L0 ${H}Z" fill="url(#sc-grass)"/>`;
  for (let i = 0; i < 160; i++){ const x = R() * W, y = 300 + R() * (H - 300); s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l-3 -9 M${x.toFixed(0)} ${y.toFixed(0)} l1 -11 M${x.toFixed(0)} ${y.toFixed(0)} l4 -8" stroke="${P.tuft}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`; }
  return s + '</svg>';
}
// tall grass along the front edge, drawn over everything so things look like they stand in it
function frontGrassSVG(themeId){
  const P = SCENE_PAL[themeId] || SCENE_PAL.meadow, R = seeded(99);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${WORLD_W}" height="44" viewBox="0 0 ${WORLD_W} 44" preserveAspectRatio="none">`;
  for (let x = 0; x < WORLD_W; x += 7){ const h = 18 + R() * 24, lean = (R() - .5) * 14;
    s += `<path d="M${x} 44 Q${x + lean / 2} ${44 - h / 2} ${x + lean} ${44 - h}" stroke="${R() < .5 ? P.grass[1] : P.tuft}" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
  return s + '</svg>';
}

function worldOf(k){
  const D = DB.kids[k];
  D.world = Object.assign({ theme:'meadow', themes:['meadow'], items:[], nextId:1 }, D.world || {});
  return D.world;
}
function friendItems(k){
  const D = DB.kids[k], T2 = TRACKS[k];
  return (D.collection || []).map(n => { const r = T2.rewards.find(x => x[1] === n); return r ? ['friends','f_'+n, r[0], n, 0] : null; }).filter(Boolean);
}

let worldSel = null, worldCat = 'home';
function screenWorld(visitKid){
  const owner = visitKid || kid, readOnly = !!visitKid && visitKid !== kid;
  const W = worldOf(owner), theme = WORLD_THEMES[W.theme] || WORLD_THEMES.meadow;
  const otherKid = kid === 'son' ? 'daughter' : 'son';
  const themeId = WORLD_THEMES[W.theme] ? W.theme : 'meadow';
  const stage = el('div',{class:'world-stage', style:`width:${WORLD_W}px;height:${WORLD_H}px;background:${(SCENE_PAL[themeId] || SCENE_PAL.meadow).sky[1]}`});
  stage.append(el('div',{class:'world-scene', html: sceneSVG(themeId)}), el('div',{class:'world-front', html: frontGrassSVG(themeId)}));
  stage.append(el('div',{class:'world-ground', style:`top:${GROUND_Y - 20}px`}));
  // the owner's avatar lives in their world and wanders around (see the life loop at the end)
  const avBody = el('div',{class:'av-body', html: avatarSVG(DB.kids[owner].avatar, 120)});
  const bubble = el('div',{class:'av-bubble'});
  const av = el('div',{class:'world-avatar'}, bubble, avBody);
  let ax = 60;
  av.style.left = ax + 'px'; av.style.top = (GROUND_Y - 110) + 'px';
  stage.append(av);
  const nodes = {};
  const place = it => {
    const n = el('div',{class:'world-item' + (worldSel === it.id ? ' sel' : ''), 'data-id':it.id}, it.e);
    n.style.left = it.x + 'px'; n.style.top = it.y + 'px';
    n.style.fontSize = Math.round(64 * it.s) + 'px';
    n.style.transform = it.f ? 'scaleX(-1)' : '';
    n.style.zIndex = it.z || 1;
    // animals and friends wander around a little, like pets
    const cat = (WORLD_BY_ID[it.k] || ['friends'])[0];
    if (cat === 'animal' || cat === 'friends'){ n.classList.add('wander'); n.style.setProperty('--wd', (6 + (it.id % 5)) + 's'); n.style.setProperty('--wdl', '-' + (it.id % 7) + 's'); }
    if (!readOnly) attachDrag(n, it);
    nodes[it.id] = n; stage.append(n);
  };
  W.items.forEach(place);
  const scroller = el('div',{class:'world-scroll'}, stage);

  // selection toolbar
  const tools = el('div',{class:'world-tools hidden'});
  const selected = () => W.items.find(i => i.id === worldSel);
  const refreshSel = () => {
    Object.values(nodes).forEach(n => n.classList.toggle('sel', +n.dataset.id === worldSel));
    tools.classList.toggle('hidden', !selected());
  };
  const act = fn => () => { const it = selected(); if (!it) return; fn(it); save(); const n = nodes[it.id];
    if (n){ n.style.fontSize = Math.round(64*it.s)+'px'; n.style.transform = it.f ? 'scaleX(-1)' : ''; n.style.zIndex = it.z || 1; } };
  tools.append(
    el('button',{class:'btn small', onclick:act(it => it.s = Math.min(4, +(it.s + 0.25).toFixed(2)))},'➕ Bigger'),
    el('button',{class:'btn small', onclick:act(it => it.s = Math.max(0.5, +(it.s - 0.25).toFixed(2)))},'➖ Smaller'),
    el('button',{class:'btn small', onclick:act(it => it.f = !it.f)},'↔️ Flip'),
    el('button',{class:'btn small', onclick:act(it => it.z = Math.max(...W.items.map(i => i.z || 1)) + 1)},'⬆️ Front'),
    el('button',{class:'btn small red', onclick:async()=>{ const it = selected(); if (!it) return;
      // removing gives back only half of what the item cost
      const def = WORLD_BY_ID[it.k], price = def ? def[4] : 0, refund = Math.floor(price / 2);
      if (price){
        const ok = await modal(el('div',{}, el('div',{class:'big-e'}, it.e), el('h2',{}, `Remove the ${def[3]}?`),
          el('p',{}, `You paid ⭐ ${price}. If you remove it, you only get ⭐ ${refund} back.`)), [['Keep it','green',false],[`Remove (+${refund} ⭐)`,'red',true]]);
        if (!ok) return;
      }
      W.items = W.items.filter(i => i !== it); K.spent = Math.max(0, (K.spent||0) - refund);
      nodes[it.id].remove(); delete nodes[it.id]; worldSel = null; save(); refreshSel(); bal.textContent = '⭐ ' + balance();
      if (refund) say(`You got ${refund} stars back.`); }},'🗑️ Remove'));
  function attachDrag(n, it){
    n.addEventListener('pointerdown', ev => {
      ev.preventDefault(); worldSel = it.id; refreshSel();
      const sx = ev.clientX, sy = ev.clientY, ox = it.x, oy = it.y;
      n.setPointerCapture(ev.pointerId); n.classList.add('drag');
      const move = e => { it.x = Math.max(-20, Math.min(WORLD_W - 40, ox + (e.clientX - sx))); it.y = Math.max(-20, Math.min(WORLD_H - 40, oy + (e.clientY - sy)));
        n.style.left = it.x + 'px'; n.style.top = it.y + 'px'; };
      const up = () => { n.removeEventListener('pointermove', move); n.removeEventListener('pointerup', up); n.removeEventListener('pointercancel', up); n.classList.remove('drag'); save(); };
      n.addEventListener('pointermove', move); n.addEventListener('pointerup', up); n.addEventListener('pointercancel', up);
    });
  }
  stage.addEventListener('pointerdown', ev => { if (ev.target === stage || ev.target.classList.contains('world-ground')){ worldSel = null; refreshSel(); } });

  // build palette
  const bal = el('span',{class:'pill'}, '⭐ ' + balance());
  const palette = el('div',{class:'world-palette'});
  const catTabs = el('div',{class:'tabs shop-tabs'});
  const drawPalette = () => {
    catTabs.innerHTML = ''; palette.innerHTML = '';
    Object.entries(WORLD_CATS).forEach(([c, label]) => catTabs.append(el('button',{class:'tab' + (c===worldCat?' active':''), onclick:()=>{ worldCat = c; drawPalette(); }}, label)));
    catTabs.append(el('button',{class:'tab' + (worldCat==='theme'?' active':''), onclick:()=>{ worldCat = 'theme'; drawPalette(); }},'🎨 Places'));
    if (worldCat === 'theme'){
      Object.entries(WORLD_THEMES).forEach(([id, t]) => {
        const owned = W.themes.includes(id), on = W.theme === id;
        palette.append(el('button',{class:'world-chip theme-chip' + (on?' on':''), style:`background:${t.sky}`, onclick:()=>{
          if (!owned){ if (balance() < t.price){ say('Keep reading to earn more stars!'); return; } K.spent = (K.spent||0) + t.price; W.themes.push(id); beep('level'); confetti(40); }
          W.theme = id; save(); screenWorld(); }},
          el('span',{class:'chip-name'}, t.name), el('span',{class:'chip-price'}, owned ? (on ? '✓ Here' : 'Go!') : '⭐ ' + t.price)));
      });
      return;
    }
    const list = worldCat === 'friends' ? friendItems(kid) : WORLD_ITEMS.filter(i => i[0] === worldCat);
    if (!list.length) palette.append(el('p',{class:'muted', style:'color:#fff'}, 'Collect friends by reading great stories. They live here for free!'));
    list.forEach(([cat, id, e, name, price, lvl]) => {
      const locked = lvl && K.level < lvl;
      palette.append(el('button',{class:'world-chip rar-' + (cat === 'friends' ? 'epic' : rarity(price, lvl)) + (locked?' locked':''), onclick:()=>{
        if (locked){ say(`Unlocks at level ${lvl}!`); return; }
        if (balance() < price){ say('Keep reading to earn more stars!'); beep('bad'); return; }
        K.spent = (K.spent||0) + price;
        const sl = scroller.scrollLeft;
        const it = { id: W.nextId++, k:id, e, x: Math.round(sl + 300 + Math.random()*300), y: GROUND_Y - 80 - Math.round(Math.random()*60), s: cat==='home' ? 1.6 : cat==='ride' ? 1.2 : 1, f:false, z: W.items.length + 2 };
        W.items.push(it); worldSel = it.id; save(); place(it); refreshSel(); beep('star'); bal.textContent = '⭐ ' + balance();
        checkBadges(); }},
        el('span',{class:'chip-e'}, e), el('span',{class:'chip-name'}, name), el('span',{class:'chip-price'}, locked ? `🔒 Lv ${lvl}` : price ? '⭐ ' + price : 'Free')));
    });
  };
  if (!readOnly) drawPalette();

  const s = el('div',{class:'screen world-screen'},
    el('div',{class:'topbar'},
      el('button',{class:'btn ghost small', onclick:()=>{ worldSel = null; screenHome(); }},'← Back'),
      el('h1',{class:'title'}, readOnly ? `${kidName(owner)}'s World` : `${kidName()}'s World`),
      readOnly ? el('button',{class:'btn small', onclick:()=>screenWorld()},'🏠 My World')
               : el('div',{class:'row'}, bal, el('button',{class:'btn small blue', onclick:()=>{ worldSel = null; screenWorld(otherKid); }}, `👀 Visit ${kidName(otherKid)}`))),
    readOnly && !DB.kids[owner].world?.items?.length ? el('div',{class:'banner'}, `${kidName(owner)} hasn't built anything here yet. (Visiting shows worlds saved on this iPad, for now.)`) : null,
    scroller,
    el('div',{class:'row', style:'margin-top:10px'},
      el('button',{class:'btn small blue', onclick:()=>scroller.scrollTo({ left: ax - scroller.clientWidth/2 + 60, behavior:'smooth' })},'🔎 Find my buddy'),
      el('span',{class:'world-hint', style:'margin:0'}, readOnly ? `Watch ${kidName(owner)}'s buddy play!` : 'Tap your buddy to make them jump!')),
    readOnly ? null : el('div',{class:'world-hint'}, 'Tap something to buy it, then drag it anywhere! Tap a thing in your world to change it. Removing something gives back only half its stars.'),
    readOnly ? null : tools,
    readOnly ? null : catTabs,
    readOnly ? null : palette,
    cloudStatusNode());
  show(s);
  refreshSel();
  // redraw when the other kid (or another device) saves, unless something here is being moved
  onCloudUpdate = () => { if (!document.querySelector('.world-item.drag')) screenWorld(visitKid); };

  // ---- buddy life loop: wander, play, and use the things in the world ----
  const life = ++worldLifeGen;
  const alive = () => life === worldLifeGen && av.isConnected;
  let facing = 1;
  const setFace = d => { facing = d; avBody.style.transform = d < 0 ? 'scaleX(-1)' : ''; };
  const pop = (txt, ms=1900) => { bubble.textContent = txt; bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
    setTimeout(() => { if (bubble.textContent === txt) bubble.classList.remove('show'); }, ms); };
  const pose = (cls, ms) => { avBody.classList.add(cls); return wsleep(ms).then(() => avBody.classList.remove(cls)); };
  const itemAct = (it, cls, ms) => { const n = nodes[it.id]; if (!n) return wsleep(ms); n.classList.add(cls); return wsleep(ms).then(() => n.classList.remove(cls)); };
  const hide = async ms => { av.classList.add('away'); await wsleep(ms); av.classList.remove('away'); };
  const walkTo = async x => {
    x = Math.max(0, Math.min(WORLD_W - 120, Math.round(x)));
    const dist = Math.abs(x - ax); if (dist < 4) return;
    setFace(x > ax ? 1 : -1);
    const secs = Math.max(0.4, dist / 110);
    av.style.transition = `left ${secs}s linear, opacity .4s`; avBody.classList.add('walking');
    av.style.left = x + 'px'; ax = x;
    await wsleep(secs * 1000);
    avBody.classList.remove('walking');
  };
  const ctx = { pop, pose, itemAct, hide };
  const visit = async it => {
    const w = Math.round(64 * (it.s || 1)), fromLeft = it.x - 100 >= 0;
    await walkTo(fromLeft ? it.x - 100 : it.x + w - 20);
    if (!alive() || !W.items.includes(it)) return;
    setFace(fromLeft ? 1 : -1);
    const def = WORLD_BY_ID[it.k], cat = def ? def[0] : 'friends';
    await (BUDDY_ACTS[it.k] || BUDDY_ACTS['@' + cat] || BUDDY_ACTS['@any'])(Object.assign({ it }, ctx));
  };
  const idle = [
    () => walkTo(ax + (Math.random() < .5 ? -1 : 1) * (150 + Math.random() * 350)),
    () => walkTo(ax + (Math.random() < .5 ? -1 : 1) * (150 + Math.random() * 350)),
    async () => { pop('🦘'); await pose('jumping', 700); await pose('jumping', 700); },
    async () => { pop(pick(['😊','🎵','😎'])); await pose('sitting', 3000); },
    async () => { pop('👋'); await pose('waving', 1500); },
    async () => { pop('🎶'); await pose('dancing', 2400); },
    async () => { pop('💤', 3200); await pose('sitting', 3400); },
    async () => { setFace(-facing); await wsleep(600); setFace(-facing); pop('👀'); await wsleep(700); }
  ];
  avBody.addEventListener('pointerdown', ev => { ev.stopPropagation(); beep('tap'); pop(pick(['😄','🎉','⭐','💖','🤩'])); pose('jumping', 700); });
  (async () => {
    await wsleep(900);
    while (alive()){
      if (W.items.length && Math.random() < 0.55) await visit(pick(W.items));
      else await pick(idle)();
      await wsleep(500 + Math.random() * 1200);
    }
  })();
}

// What the buddy does with each kind of world item. Keys are item ids, '@category', or '@any'.
let worldLifeGen = 0;
const wsleep = ms => new Promise(r => setTimeout(r, ms));
const BUDDY_ACTS = {
  '@home': async c => { c.pop('🚪'); await wsleep(700); c.pop(pick(['💤','📺','🍪','🎮']), 2600); await c.hide(2800); c.pop('👋'); },
  '@nature': async c => { c.pop('😌', 2800); await c.pose('sitting', 3000); },
  sunflower: async c => { c.pop('🌻😊'); await c.pose('bend', 1800); },
  tulip: async c => { c.pop('🌷😊'); await c.pose('bend', 1800); },
  blossom: async c => { c.pop('🌸😊'); await c.pose('bend', 1800); },
  rock: async c => { c.pop('⛰️'); await c.pose('jumping', 700); await c.pose('jumping', 700); },
  mountain: async c => { c.pop('🧗'); await c.pose('jumping', 700); await c.pose('jumping', 700); },
  volcano: async c => { c.pop('😮'); await Promise.all([c.itemAct(c.it, 'act-wiggle', 2400), c.pose('waving', 1500)]); },
  sun: async c => { c.pop('😎'); await c.pose('waving', 1500); },
  moon: async c => { c.pop('🌙💤', 3000); await c.pose('sitting', 3200); },
  star: async c => { c.pop('✨🤩'); await c.pose('jumping', 700); },
  cloud: async c => { c.pop('☁️'); await c.itemAct(c.it, 'act-float', 2400); },
  rainbow: async c => { c.pop('🌈🤩'); await c.pose('dancing', 2400); },
  crystal: async c => { c.pop('💎✨'); await c.itemAct(c.it, 'act-hop', 1500); },
  ball: async c => { c.pop('⚽'); await c.pose('jumping', 500); await c.itemAct(c.it, 'act-kick', 1400); },
  balloons: async c => { c.pop('🎈'); await Promise.all([c.pose('jumping', 700), c.itemAct(c.it, 'act-float', 2400)]); },
  kite: async c => { c.pop('🪁'); await Promise.all([c.pose('waving', 1500), c.itemAct(c.it, 'act-float', 2400)]); },
  campfire: async c => { c.pop('🔥😊', 2800); await c.pose('sitting', 3000); },
  icecream: async c => { c.pop('😋'); await c.pose('munch', 1800); },
  cupcake: async c => { c.pop('😋'); await c.pose('munch', 1800); },
  pizza: async c => { c.pop('🍕😋'); await c.pose('munch', 1800); },
  trophy: async c => { c.pop('🏆'); await c.pose('jumping', 700); await c.pose('jumping', 700); },
  present: async c => { c.pop('🎁'); await c.itemAct(c.it, 'act-hop', 1500); c.pop('🎉'); await c.pose('dancing', 1800); },
  treasure: async c => { c.pop('💰✨'); await c.pose('jumping', 700); },
  fountain: async c => { c.pop('💦'); await c.itemAct(c.it, 'act-wiggle', 2400); },
  target: async c => { c.pop('🎯'); await c.pose('waving', 1200); c.pop('🎯✅'); await c.itemAct(c.it, 'act-wiggle', 1200); },
  slide: async c => { c.pop('🛝'); await c.pose('jumping', 700); await c.pose('sitting', 1400); c.pop('😄'); },
  ferris: async c => { c.pop('🎡'); await Promise.all([c.hide(3200), c.itemAct(c.it, 'act-spin', 3000)]); c.pop('😄'); },
  carousel: async c => { c.pop('🎠'); await Promise.all([c.hide(3200), c.itemAct(c.it, 'act-spin', 3000)]); c.pop('😄'); },
  coaster: async c => { c.pop('🎢'); await Promise.all([c.hide(2800), c.itemAct(c.it, 'act-wiggle', 2400)]); c.pop('😆'); },
  '@ride': async c => { const fly = ['rocket','jet','heli'].includes(c.it.k), boat = ['ship','sailboat'].includes(c.it.k);
    c.pop(fly ? '🚀' : boat ? '⚓' : '🏁');
    await Promise.all([c.hide(3300), c.itemAct(c.it, fly ? 'act-fly' : boat ? 'act-bob' : 'act-drive', 3200)]); c.pop('😄'); },
  '@animal': async c => { c.pop('❤️'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('waving', 1500)]); },
  '@friends': async c => { c.pop('👋💛'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('jumping', 700)]); },
  '@any': async c => { c.pop('😊'); await c.pose('waving', 1200); }
};

/* ================= PHONICS PATH: lesson engine =================
   Each lesson follows an explicit "I do / we do / you do" routine:
   review → learn the pattern → blend words → build (spell) words →
   heart words → read a decodable story (+ hear-it-first) → questions →
   mastery check. Spaced review pulls words from earlier lessons and the
   missed-word tracker. Repeated reading lets kids beat their own speed.
   ================================================================= */
const MULTI_G = ['augh','tch','igh','oul','sh','ch','th','wh','ck','ng','nk','qu','ai','ay','ee','ea','oa','ow','oo','ar','or','er','ir','ur','oi','oy','ou','ey','ie','ew'];
const G_SOUND = { b:'buh', c:'kuh', d:'duh', f:'fff', g:'guh', h:'huh', j:'juh', k:'kuh', l:'lll', m:'mmm', n:'nnn', p:'puh', q:'kwuh', r:'rrr', s:'sss', t:'tuh', v:'vvv', w:'wuh', x:'ks', y:'yuh', z:'zzz',
  a:'aah', e:'eh', i:'ih', o:'ah', u:'uh', sh:'shhh', ch:'chuh', th:'thh', wh:'wuh', ck:'kuh', ng:'ng', nk:'nk', qu:'kwuh', tch:'chuh', igh:'eye', augh:'aff', oul:'ood',
  ai:'ay', ay:'ay', ee:'ee', ea:'ee', oa:'oh', ow:'oh', oo:'oo', ar:'are', or:'or', er:'er', ir:'er', ur:'er', oi:'oy', oy:'oy', ou:'ow', ey:'ay', ie:'eh', ew:'oo', le:'ul', "'":'' };
const LONG_V = { a:'ay', e:'ee', i:'eye', o:'oh', u:'you' };
function graphemes(word){
  const w = word.toLowerCase().replace(/[^a-z']/g,'');
  const out = []; let i = 0;
  while (i < w.length){
    let m = MULTI_G.find(g => w.startsWith(g, i));
    if (w.endsWith('le') && i === w.length - 2 && /[^aeiou]le$/.test(w)) m = 'le';
    m = m || w[i];
    out.push({ g:m, sound:G_SOUND[m] ?? m });
    i += m.length;
  }
  // magic e: vowel + consonant + e at the end → long vowel, silent e
  if (/[aeiou][^aeiouwy]e$/.test(w) && out.length >= 3 && out[out.length-1].g === 'e'){
    out[out.length-1].silent = true; out[out.length-1].sound = '';
    const v = out[out.length-3]; if (v && LONG_V[v.g]){ v.sound = LONG_V[v.g]; v.long = true; }
  }
  return out;
}

function pathState(){
  K.path = Object.assign({ placed:false, done:{}, tries:{}, best:{} }, K.path || {});
  return K.path;
}
function nextLesson(){ const P = pathState(); return PHONICS.find(l => !P.done[l.id]) || null; }
function reviewWords(n){
  const P = pathState();
  const pool = PHONICS.filter(l => P.done[l.id] && l.words).flatMap(l => l.words);
  const tracked = practiceWords(K).filter(w => pool.includes(w));
  return [...new Set(tracked.concat(shuffle(pool)))].slice(0, n);
}

/* ---------- path map ---------- */
function screenPath(){
  stopAll();
  const P = pathState(), nxt = nextLesson();
  const stages = PHONICS_STAGES.map(st => {
    const ls = PHONICS.filter(l => l.stage === st.n);
    const doneN = ls.filter(l => P.done[l.id]).length;
    return el('div',{class:'card path-stage'},
      el('div',{class:'path-stage-head'}, el('span',{class:'path-icon'}, st.icon),
        el('div',{}, el('h2',{}, `Stage ${st.n}: ${st.name}`), el('p',{class:'muted'}, st.desc)),
        el('span',{class:'pill'}, `${doneN}/${ls.length}`)),
      el('div',{class:'path-nodes'}, ...ls.map((l,i) => {
        const d = P.done[l.id], isNext = nxt && nxt.id === l.id;
        const state = d ? (d.tested ? 'tested' : 'done') : isNext ? 'next' : 'locked';
        const node = el('button',{class:'path-node ' + state + (i%2 ? ' low' : ''), onclick:()=>{
          if (state === 'locked'){ say('Finish the lessons before this one first!'); return; }
          beep('tap'); runLesson(l); }},
          el('span',{class:'pn-show'}, l.stage === 0 ? l.title.split(' ').slice(0,3).join(' ') : l.show),
          el('span',{class:'pn-title'}, l.title),
          el('span',{class:'pn-state'}, state === 'done' ? '⭐'.repeat(d.stars||1) : state === 'tested' ? '✓ known' : state === 'next' ? '▶ GO!' : '🔒'));
        return node;
      })));
  });
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
      el('h1',{class:'title'},'🧠 Skills'),
      el('button',{class:'btn small', onclick:()=>startPathCheck()},'🎯 Phonics Check')),
    nxt ? el('div',{class:'card next-card'},
      el('div',{class:'series-tag'}, `Next skill · Stage ${nxt.stage}`),
      el('h2',{}, nxt.title), el('p',{}, nxt.say),
      el('p',{style:'font-weight:600'}, '📖 Your stories will practice this skill automatically. Want extra practice? Do the mini-lesson!'),
      el('button',{class:'btn', onclick:()=>runLesson(nxt)},'🧠 Practice now')) :
      el('div',{class:'banner'},'🎓 You finished the whole Phonics Path! Replay any lesson to earn more stars.'),
    ...stages);
  show(s);
}

/* ---------- phonics check (placement) ---------- */
function pathIntro(){
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🧠 Phonics Path'), el('div')),
    el('div',{class:'card'},
      el('h2',{style:'margin-top:0'},'First, a quick Phonics Check!'),
      el('p',{style:'font-size:20px'},'Read 4 short lines of words. Easy ones first, then harder. It tells us which lesson to start on, so you never repeat stuff you already know.'),
      el('div',{class:'row'},
        el('button',{class:'btn big', onclick:startPathCheck},'▶ Start the check'),
        el('button',{class:'btn small gray', onclick:()=>{ setPathStart(PHONICS_DEFAULT_START[kid]); screenPath(); }}, `Skip: start at lesson ${PHONICS_DEFAULT_START[kid]}`))));
  show(s);
}
function setPathStart(id){
  const P = pathState(); P.placed = true;
  for (const l of PHONICS){ if (l.id === id) break; if (!P.done[l.id]) P.done[l.id] = { tested:true, date:todayStr() }; }
  save();
}
function startPathCheck(){
  const P = pathState();
  P.done = Object.fromEntries(Object.entries(P.done).filter(([,d]) => !d.tested));
  const pages = [1,2,3,4].map(st => {
    const words = shuffle(PHONICS.filter(l => l.stage === st && l.words).flatMap(l => l.words.filter(w => !/'/.test(w)))).slice(0,6);
    return { probeStage:st, tokens: words.map(w => ({ disp:w, n:norm(w) })) };
  });
  beginRun({ kind:'story', level:K.level, title:'Phonics Check', pages }, { mode:'lesson', onStop:screenPath, onDone:() => {
    let start = '4-1';
    for (const p of run.act.pages){
      const acc = p.status.filter(x => x === 'ok').length / p.tokens.length;
      if (acc < 0.85){ start = p.probeStage === 1 && acc < 0.5 ? '0-1' : PHONICS.find(l => l.stage === p.probeStage).id; break; }
    }
    setPathStart(start); confetti(50); beep('level');
    const L0 = PHONICS_BY_ID[start];
    modal(el('div',{}, el('div',{class:'big-e'},'🎯'), el('h2',{}, `Start at Lesson ${start}!`), el('p',{}, `Stage ${L0.stage}: ${L0.title}. The lessons before it are marked as known.`)), [['Let\'s go! ▶','',1]]).then(screenPath);
  }});
}

/* ---------- running a lesson ---------- */
let LS = null; // lesson session
function runLesson(lesson){
  ensureSkillStart();
  const P = pathState();
  const steps = [];
  const rev = reviewWords(4);
  if (rev.length) steps.push('review');
  steps.push('learn');
  if (lesson.letters){ steps.push('listen', 'sayletters'); }
  else { steps.push('blend', 'build'); if (lesson.heart && lesson.heart.length) steps.push('heart'); steps.push('read', 'questions'); }
  LS = { lesson, steps, i:0, rev, scores:{}, started:Date.now() };
  P.tries[lesson.id] = (P.tries[lesson.id] || 0) + 1; save();
  nextStep();
}
function stepBar(){
  const names = { review:'Review', learn:'Learn', listen:'Listen', sayletters:'Say it', blend:'Blend', build:'Build', heart:'Heart words', read:'Read', questions:'Think' };
  return el('div',{class:'step-bar'}, ...LS.steps.map((s,i) => el('span',{class:'step' + (i < LS.i ? ' done' : i === LS.i ? ' now' : '')}, names[s])));
}
function nextStep(){
  if (!LS) return screenPath();
  if (LS.i >= LS.steps.length) return lessonResults();
  const step = LS.steps[LS.i], L = LS.lesson;
  const advance = (key, val) => { if (key) LS.scores[key] = val; LS.i++; nextStep(); };
  const lessonRun = (act, key, extra={}) => beginRun(act, Object.assign({ mode:'lesson', onStop:()=>{ LS = null; screenPath(); }, onDone:(res, a) => {
    trackWords(a); save(); advance(key, res); }}, extra));
  if (step === 'review'){
    lessonRun({ kind:'words', level:K.level, title:'🔁 Quick Review', pages: LS.rev.map(w => ({ single:true, blend:true, g:graphemes(w), tokens:[{disp:w, n:norm(w)}] })) }, 'review');
  } else if (step === 'learn'){ screenLearn(() => advance()); }
  else if (step === 'listen'){ screenListen(score => advance('listen', score)); }
  else if (step === 'sayletters'){
    lessonRun({ kind:'letters', level:K.level, title:'Say the sounds', pages: shuffle(L.letters).map(([l,,k,e]) => ({ single:true, letter:l, pic:e, keyword:k, tokens:[{disp:l.toUpperCase()+l, n:l}] })) }, 'say');
  } else if (step === 'blend'){
    lessonRun({ kind:'words', level:K.level, title:`Blend it: ${L.show}`, pages: L.words.map(w => ({ single:true, blend:true, g:graphemes(w), tokens:[{disp:w, n:norm(w)}] })) }, 'blend');
  } else if (step === 'build'){ screenBuild(score => advance('build', score)); }
  else if (step === 'heart'){
    lessonRun({ kind:'words', level:K.level, title:'❤️ Heart words', pages: L.heart.map(([w,part,tip]) => ({ single:true, heart:{ part, tip }, tokens:[{disp:w, n:norm(w)}] })) }, 'heart');
  } else if (step === 'read'){
    const pages = L.text.split(/\n\s*\n/).map(p => ({ tokens: tokensOf(p.trim()) }));
    lessonRun({ kind:'story', level:K.level, title:'📖 ' + L.title, pages }, 'read', { echo:true });
  } else if (step === 'questions'){ screenLessonQuiz(score => advance('questions', score)); }
}

function screenLearn(done){
  const L = LS.lesson;
  const body = el('div',{class:'card learn-card'});
  body.append(el('div',{class:'learn-big'}, L.show));
  if (L.letters){
    body.append(el('div',{class:'letter-grid'}, ...L.letters.map(([l,snd,kw,e]) => el('button',{class:'letter-tile', onclick:()=>say(`${snd}. ${snd}, like ${kw}.`, {rate:0.75})},
      el('b',{}, l), el('span',{}, e), el('small',{}, kw)))));
  } else {
    body.append(el('div',{class:'ex-row'}, ...L.ex.map(([w,e]) => el('button',{class:'ex-word', onclick:()=>say(w, {rate:0.7})}, el('span',{class:'ex-e'}, e), el('span',{}, w)))));
  }
  body.append(el('p',{class:'learn-say'}, L.say),
    el('div',{class:'row'}, el('button',{class:'btn blue', onclick:()=>say(L.say, {rate:0.85})},'🔊 Hear it again'), el('button',{class:'btn big', onclick:done},'Got it! ▶')));
  show(el('div',{class:'screen'}, lessonTop(), stepBar(), body));
  say(L.say, { rate:0.85 });
}
function lessonTop(){
  return el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); LS = null; screenPath(); }},'← Back'),
    el('div',{class:'pageinfo'}, `Lesson ${LS.lesson.id}: ${LS.lesson.title}`), el('div',{style:'width:80px'}));
}

/* Stage 0 listening game: hear a sound, tap the letter */
function screenListen(done){
  const L = LS.lesson;
  const rounds = shuffle(L.letters).slice(0, 6);
  let r = 0, right = 0;
  const render = () => {
    if (r >= rounds.length) return done(right / rounds.length);
    const [l, snd, kw, e] = rounds[r];
    const opts = shuffle([l, ...shuffle(L.letters.map(x => x[0]).filter(x => x !== l)).slice(0,2)]);
    const prompt = `Which letter says ${snd}, like in ${kw}?`;
    let answered = false;
    const grid = el('div',{class:'listen-grid'}, ...opts.map(o => el('button',{class:'listen-opt', onclick:ev=>{
      if (answered) return; answered = true;
      if (o === l){ right++; ev.currentTarget.classList.add('right'); beep('ok'); burst(); }
      else { ev.currentTarget.classList.add('wrong'); beep('bad'); [...grid.children].forEach(c => { if (c.textContent === l) c.classList.add('right'); }); say(`${l} says ${snd}`); }
      setTimeout(() => { r++; render(); }, 1300);
    }}, o)));
    show(el('div',{class:'screen'}, lessonTop(), stepBar(),
      el('div',{class:'card center'}, el('p',{class:'q-text'}, `👂 Which letter makes this sound?`), el('div',{class:'big-e'}, e),
        el('button',{class:'btn blue', onclick:()=>say(prompt, {rate:0.75})},'🔊 Hear it'), grid,
        el('p',{class:'muted'}, `${r+1} of ${rounds.length}`))));
    say(prompt, { rate:0.75 });
  };
  render();
}

/* Build it: hear a word, spell it with sound tiles (encoding) */
function screenBuild(done){
  const L = LS.lesson;
  const items = L.build.map(b => Array.isArray(b) ? { word:b.join(''), parts:b } : { word:b, parts:graphemes(b).map(x => x.g) });
  buildGame(items, L.words, () => el('div',{}, lessonTop(), stepBar()), done);
}
let buildGen = 0;
function buildGame(items, poolWords, header, done){
  let k = 0, right = 0;
  const gen = ++buildGen;
  const render = () => {
    if (gen !== buildGen) return;
    if (k >= items.length) return done(right / items.length);
    const it = items[k];
    const pool = [...new Set(poolWords.concat(items.map(x => x.word)).flatMap(w => graphemes(w).map(x => x.g)))];
    const distract = shuffle(pool.filter(g => !it.parts.includes(g)).concat(['a','e','i','o','u','s','t','m'].filter(g => !it.parts.includes(g)))).slice(0, 3);
    const tiles = shuffle(it.parts.map((p,i) => ({ p, id:'t'+i })).concat(distract.map((p,i) => ({ p, id:'d'+i }))));
    const placed = [];
    let tries = 0;
    const slots = el('div',{class:'build-slots'});
    const tray = el('div',{class:'build-tray'});
    const fb = el('div',{class:'feedback'});
    const draw = () => {
      slots.innerHTML = '';
      it.parts.forEach((_,i) => { const t = placed[i];
        slots.append(el('button',{class:'build-slot' + (t ? ' full' : ''), onclick:()=>{ if (t){ placed.splice(i,1); draw(); } }}, t ? t.p : '')); });
      tray.innerHTML = '';
      tiles.forEach(t => { const used = placed.includes(t);
        tray.append(el('button',{class:'build-tile' + (used ? ' used' : ''), onclick:()=>{ if (used || placed.length >= it.parts.length) return;
          placed.push(t); say(G_SOUND[t.p] || t.p, {rate:0.8}); draw(); if (placed.length === it.parts.length) check(); }}, t.p)); });
    };
    const check = () => {
      const got = placed.map(t => t.p).join('');
      if (got === it.word){ if (tries === 0) right++; fb.textContent = '✅ ' + pick(['You built it!','Perfect spelling!','Nailed it!']); fb.style.color = 'var(--ok)'; beep('ok'); burst();
        say(it.word); setTimeout(() => { k++; render(); }, 1400); }
      else { tries++; beep('bad'); fb.style.color = 'var(--bad)';
        if (tries >= 2){ fb.textContent = `It's spelled: ${it.parts.join(' · ')}`; say(`${it.word} is spelled ${it.parts.join(', ')}`); setTimeout(() => { k++; render(); }, 2600); }
        else { fb.textContent = 'Not quite! Listen again and try.'; setTimeout(() => { placed.length = 0; draw(); say(it.word, {rate:0.6}); }, 900); } }
    };
    draw();
    show(el('div',{class:'screen'}, header(),
      el('div',{class:'card center'},
        el('p',{class:'q-text'}, '🧱 Build the word you hear!'),
        el('div',{class:'row center'}, el('button',{class:'btn blue big', onclick:()=>say(it.word, {rate:0.7})},'🔊 Hear word'), el('button',{class:'btn', onclick:()=>say(it.word, {rate:0.35})},'🐢 Slowly')),
        slots, tray, fb, el('p',{class:'muted'}, `Word ${k+1} of ${items.length} · tap a filled box to take a tile back`))));
    say(it.word, { rate:0.7 });
  };
  render();
}

/* Quick comprehension check after the decodable story */
function screenLessonQuiz(done){
  const qs = (LS.lesson.qs || []).map(([q, o, a]) => ({ q, opts: shuffle(o.map((t,i) => ({ t, right:i===a }))) }));
  if (!qs.length) return done(1);
  let i = 0, right = 0;
  const render = () => {
    if (i >= qs.length) return done(right / qs.length);
    const item = qs[i]; let answered = false;
    const fb = el('div',{class:'feedback'});
    const next = el('button',{class:'btn hidden', onclick:()=>{ i++; render(); }}, i < qs.length - 1 ? 'Next ▶' : 'Finish ▶');
    const opts = el('div',{class:'options'}, ...item.opts.map(o => { const b = el('button',{class:'opt'}, el('span',{}, o.t), el('span',{class:'say', onclick:ev=>{ ev.stopPropagation(); say(o.t); }},'🔊'));
      b.onclick = () => { if (answered) return; answered = true;
        if (o.right){ right++; b.classList.add('right'); beep('ok'); burst(); fb.textContent = 'Yes! 🎉'; }
        else { b.classList.add('wrong'); beep('bad'); fb.textContent = 'Good try! The answer is in green.'; [...opts.children].forEach((c,j) => { if (item.opts[j].right) c.classList.add('right'); }); }
        next.classList.remove('hidden'); };
      return b; }));
    show(el('div',{class:'screen'}, lessonTop(), stepBar(),
      el('div',{class:'quiz-layout'},
        passageCard('📖 ' + LS.lesson.title, LS.lesson.text, LS.marks || (LS.marks = {})),
        el('div',{class:'card'}, el('div',{class:'row', style:'align-items:flex-start'}, el('p',{class:'q-text grow'}, item.q), el('button',{class:'btn small blue', onclick:()=>say(item.q)},'🔊')),
          opts, fb, el('div',{class:'row', style:'margin-top:10px'}, next)))));
    if (kid === 'son') say(item.q);
  };
  render();
}

/* Mastery decision + rewards + repeated reading */
async function lessonResults(){
  const L = LS.lesson, S = LS.scores, P = pathState();
  const acc = r => r ? r.accuracy : null;
  let mastered, parts = [];
  if (L.letters){
    mastered = (S.listen ?? 0) >= 0.67 && (acc(S.say) ?? 0) >= 0.75;
    parts = [['👂 Listening', Math.round((S.listen||0)*100) + '%'], ['🗣️ Saying sounds', Math.round((acc(S.say)||0)*100) + '%']];
  } else {
    const b = acc(S.blend) ?? 0, rd = acc(S.read) ?? 0, q = S.questions ?? 1;
    mastered = b >= 0.8 && rd >= 0.9 && q >= 0.5;
    parts = [['🔗 Blending', Math.round(b*100) + '%'], ['🧱 Building', Math.round((S.build||0)*100) + '%'], ['📖 Story reading', Math.round(rd*100) + '%'],
      ['⏱️ Words per minute', S.read && S.read.wcpm ? S.read.wcpm : '–'], ['🤔 Questions', Math.round(q*100) + '%']];
  }
  const tries = P.tries[L.id] || 1;
  const moveOn = mastered || tries >= 3;
  const stars = mastered ? 3 : moveOn ? 1 : 1;
  K.stars += stars;
  const goalJustHit = addReadingTime(Math.min(Date.now() - LS.started, MAX_ACTIVITY_MS));
  const wc = S.read && S.read.wcpm;
  if (wc) P.best[L.id] = Math.max(P.best[L.id] || 0, wc);
  if (moveOn) P.done[L.id] = { stars: mastered ? 3 : 1, mastered, date: todayStr(), scores: parts, needsReview: !mastered };
  K.sessions.unshift({ id: kid + '_' + Date.now(), date: new Date().toISOString(), level: K.level, title: `Phonics ${L.id}: ${L.title}`, kind:'lesson', mode:'lesson',
    total: S.read ? S.read.total : 0, correct: S.read ? S.read.correct : 0, helped: S.read ? S.read.helped : 0,
    accuracy: S.read ? Math.round(S.read.accuracy*1000)/10 : Math.round((acc(S.say)||0)*1000)/10, wcpm: wc || null,
    quiz: S.questions != null ? Math.round(S.questions * (L.qs||[]).length) + '/' + (L.qs||[]).length : null, missed: S.read ? [...new Set(S.read.missed)].slice(0,20) : [], stars, ms: Math.min(Date.now() - LS.started, MAX_ACTIVITY_MS) });
  save();
  if (mastered){ confetti(90); beep('level'); say('Lesson mastered! Amazing!'); } else beep('star');
  const nxt = nextLesson();
  const card = el('div',{class:'card'},
    el('div',{class:'result-avatar'}),
    el('div',{class:'stars'}, ...[0,1,2].map(i => el('span',{}, i < stars ? '⭐' : '☆'))),
    el('h2',{class:'center'}, mastered ? `Lesson ${L.id} mastered!` : moveOn ? 'Good effort! Moving on, and we\'ll review this one.' : 'Almost there! Let\'s try this lesson again soon.'),
    el('div',{class:'result-grid'}, ...parts.map(([k,v]) => el('div',{class:'stat'}, el('b',{}, v), el('span',{}, k)))),
    el('div',{class:'row', style:'margin-top:14px'},
      S.read ? el('button',{class:'btn blue', onclick:()=>rereadForSpeed(L)}, `🔁 Read it again${wc ? ` (beat ${wc} wpm!)` : ''}`) : null,
      nxt && moveOn ? el('button',{class:'btn big green', onclick:()=>{ LS = null; runLesson(nxt); }},'Next lesson ▶') : null,
      !moveOn ? el('button',{class:'btn big', onclick:()=>{ LS = null; runLesson(L); }},'🔄 Try again') : null,
      el('button',{class:'btn gray', onclick:()=>{ LS = null; screenPath(); }},'🗺️ Path')));
  show(el('div',{class:'screen'}, el('div',{class:'topbar'},
    el('button',{class:'btn ghost small', onclick:()=>{ LS = null; screenPath(); }},'← Back'),
    el('h1',{class:'title'}, mastered ? 'Mastered!' : 'Nice work!'), el('div')), card));
  const av = $('.result-avatar'); if (av) av.append(avatarNode(110));
  if (goalJustHit) await celebrateGoal();
  await checkBadges();
}
function rereadForSpeed(L){
  const before = pathState().best[L.id] || 0;
  const pages = L.text.split(/\n\s*\n/).map(p => ({ tokens: tokensOf(p.trim()) }));
  beginRun({ kind:'story', level:K.level, title:'🔁 Speed read: ' + L.title, pages }, { mode:'lesson', onStop:screenPath, onDone:async (res, a) => {
    trackWords(a);
    const P = pathState(), now = res.wcpm || 0;
    if (now) P.best[L.id] = Math.max(before, now);
    const beat = now > before;
    if (beat){ K.stars += 2; confetti(70); beep('level'); say(`New record! ${now} words per minute!`); }
    save();
    await modal(el('div',{}, el('div',{class:'big-e'}, beat ? '🚀' : '💪'), el('h2',{}, beat ? 'New speed record!' : 'Smooth reading!'),
      el('p',{}, `Before: ${before || '–'} wpm → Now: ${now || '–'} wpm${beat ? ' · +2 ⭐' : ''}`),
      el('p',{}, `Accuracy: ${Math.round(res.accuracy*100)}%`)), [['🗺️ Back to path','',1]]);
    LS = null; screenPath();
  }});
}

/* ================= SKILLS INSIDE STORIES =================
   Every story gets a focus phonics pattern, picked from the kid's next
   not-yet-mastered skill that appears in that story. Flow:
   Skill Spark (learn pattern + blend 3 words from the story + heart-word
   preview) → read the story with pattern words highlighted → questions →
   Word Builder (spell 2 story words) → results with skill progress.
   ========================================================== */
const SK_C = '[^aeiouy]';
const cvc = v => w => w.length <= 4 && new RegExp(`^${SK_C}{1,2}${v}${SK_C}{1,2}$`).test(w) && !/(sh|ch|th|wh|ck|ng)/.test(w);
const SKILL_DETECT = {
  '1-1': cvc('a'), '1-2': cvc('i'), '1-3': cvc('o'), '1-4': cvc('u'), '1-5': cvc('e'),
  '2-1': w => /sh/.test(w), '2-2': w => /ch/.test(w) && !/^chr/.test(w), '2-3': w => /ck/.test(w), '2-4': w => /th/.test(w),
  '2-5': w => /^wh|ng$/.test(w), '2-6': w => /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sl|sm|sn|sp|st|sw|tr|tw)[aeiou]/.test(w),
  '2-7': w => /[aeiou](mp|nd|nt|st|lk|lt|sk|ft|nk|lp)$/.test(w), '2-8': w => w.length >= 5 && /(ing|ed)$/.test(w),
  '3-1': w => /a[^aeiouwy]e$/.test(w), '3-2': w => /[io][^aeiouwy]e$/.test(w) && !/(ive|ove|one)$/.test(w), '3-3': w => /[ue][^aeiouwy]e$/.test(w) && w.length >= 4,
  '3-4': w => /ai|ay/.test(w), '3-5': w => /ee|ea/.test(w), '3-6': w => /oa|ow$/.test(w), '3-7': w => /igh/.test(w) || /^[^aeiou]{1,3}y$/.test(w),
  '3-8': w => /ar|or/.test(w), '3-9': w => /er|ir|ur/.test(w), '3-10': w => /oi|oy|ou|ow/.test(w) && !/ow$/.test(w), '3-11': w => /oo/.test(w),
  '4-2': w => w.length >= 6 && /^[^aeiou]*[aeiou][^aeiou]{2}[aeiou][^aeiouy]+$/.test(w), '4-3': w => /[^aeiou]le$/.test(w) && w.length >= 5,
  '4-4': w => /^(un|re)[a-z]{3,}/.test(w) && !/^(under|ready|really|reach|read|rest)/.test(w), '4-5': w => w.length >= 6 && /(ful|less|ly)$/.test(w),
  '4-6': w => false
};
const HEART_WORDS = {};
PHONICS.forEach(l => (l.heart || []).forEach(([w, part, tip]) => { HEART_WORDS[norm(w)] = { word:w, part, tip, lesson:l.id }; }));
const heartNew = w => HEART_WORDS[w] && !skillKnown(HEART_WORDS[w].lesson);

function skillsState(){ K.skills = K.skills || {}; return K.skills; }
function ensureSkillStart(){ const P = pathState(); if (!P.placed) setPathStart(PHONICS_DEFAULT_START[kid]); skillsState(); }
function skillKnown(id){ const P = pathState(); return !!P.done[id] || !!(skillsState()[id] && skillsState()[id].mastered); }
function chooseFocus(story){
  ensureSkillStart();
  const IRREG = new Set(['floor','door','flood','blood','great','break','steak','bread','head','dead','ready','heavy','early','learn','heard','pear','bear','wear','sword','word','world','worm','warm','war','work','toward','cousin','country','touch','young','enough','shoulder','your','four','pour','could','would','should','eyes','buy','guy']);
  const ws = [...new Set(story.text.split(/\s+/).map(norm).filter(Boolean))].filter(w => !HEART_WORDS[w] && !IRREG.has(w));
  const cands = PHONICS.filter(l => SKILL_DETECT[l.id]).map(l => ({ l, words: ws.filter(w => SKILL_DETECT[l.id](w)) })).filter(c => c.words.length >= 3);
  if (!cands.length) return null;
  const fresh = cands.find(c => !skillKnown(c.l.id));
  const ch = fresh || cands.slice().sort((a,b) => b.words.length - a.words.length)[0];
  return { id: ch.l.id, lesson: ch.l, words: ch.words, review: !fresh };
}
function tileRow(word, big){
  return el('div',{class:'tile-row' + (big ? ' big' : '')}, ...graphemes(word).map(g =>
    el('button',{class:'snd-tile' + (g.silent ? ' silent' : '') + (g.long ? ' long' : ''), onclick:ev=>{ ev.stopPropagation(); if (g.sound) say(g.sound, {rate:0.8}); else say('quiet e'); }}, g.g)));
}
function heartWordNode(w){
  const h = HEART_WORDS[norm(w)]; if (!h) return el('span',{}, w);
  const i = h.word.toLowerCase().indexOf(h.part.toLowerCase());
  return el('span',{class:'heart-word'}, h.word.slice(0, i), el('span',{class:'heart-part'}, h.word.slice(i, i + h.part.length)), h.word.slice(i + h.part.length));
}

function startStoryWithSkill(act){
  const focus = chooseFocus(act.story);
  if (!focus) return beginRun(act, { mode:'normal' });
  const L = focus.lesson;
  const power = focus.words.slice().sort((a,b) => a.length - b.length).slice(0, 3);
  const hearts = [...new Set(act.story.text.split(/\s+/).map(norm))].filter(heartNew).slice(0, 2);
  const go = () => beginRun(act, { mode:'normal', focus });
  const warm = () => beginRun({ kind:'words', level:K.level, title:'⚡ Warm-up', pages: power.map(w => ({ single:true, blend:true, tokens:[{disp:w, n:w}] })) },
    { mode:'lesson', onStop:()=>screenHome(), onDone:(res, a) => { trackWords(a); save(); go(); } });
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
      el('div',{class:'pageinfo'}, (act.emoji||'') + ' ' + act.title), el('div',{style:'width:80px'})),
    el('div',{class:'card spark-card'},
      el('div',{class:'series-tag'}, focus.review ? '🔁 Skill Review' : '⚡ Skill Spark'),
      el('div',{class:'spark-head'}, el('div',{class:'learn-big'}, L.show),
        el('div',{}, el('h2',{style:'margin:0'}, `This story has ${L.title} words!`), el('p',{class:'learn-say'}, L.say))),
      el('h3',{}, '💥 Power words from the story (tap the sounds!)'),
      el('div',{class:'power-words'}, ...power.map(w => el('div',{class:'power-word'}, tileRow(w, true),
        el('button',{class:'btn small blue', onclick:()=>{ say(w, {rate:0.35}); setTimeout(()=>say(w), 1600); }}, `🔊 ${w}`)))),
      hearts.length ? el('div',{class:'heart-preview'}, el('h3',{}, '❤️ Heart words (you just have to know the red part)'),
        ...hearts.map(w => el('button',{class:'heart-chip', onclick:()=>say(`${HEART_WORDS[w].word}. ${HEART_WORDS[w].tip}`)}, heartWordNode(w), el('small',{}, HEART_WORDS[w].tip)))) : null,
      el('div',{class:'row', style:'margin-top:16px'},
        el('button',{class:'btn big', onclick:warm},'▶ Warm up & read'),
        el('button',{class:'btn gray small', onclick:go},'Skip to the story'))));
  show(s);
  say(`This story has lots of ${L.title} words. ${L.say}`, { rate:0.9 });
}

/* Word Builder after the story: spell two of the story's pattern words */
function storyBuilder(focus, done){
  const words = focus.words.filter(w => w.length <= 8 && !/'/.test(w)).sort((a,b) => a.length - b.length);
  const picks = shuffle(words.slice(0, 5)).slice(0, 2);
  if (!picks.length) return done();
  const items = picks.map(w => ({ word:w, parts:graphemes(w).map(g => g.g) }));
  buildGame(items, focus.words, () => el('div',{class:'topbar'},
    el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); done(); }},'← Back'), // skips the builder, keeps the story's results
    el('div',{class:'pageinfo'}, `🧱 Word Builder: ${focus.lesson.title}`), el('div',{style:'width:80px'})), () => done());
}

/* Skill progress after a story */
function scoreFocus(act, focus){
  let reads = 0, right = 0;
  const set = new Set(focus.words);
  act.pages.forEach(p => p.tokens.forEach((t,i) => { if (set.has(t.n)){ reads++; if (p.status[i] === 'ok' && !p.helped[i]) right++; } }));
  return { reads, right };
}
async function commitSkill(act, focus){
  const S = skillsState();
  const r = scoreFocus(act, focus);
  const s = S[focus.id] = Object.assign({ reads:0, right:0, stories:0, mastered:null }, S[focus.id] || {});
  s.reads += r.reads; s.right += r.right; s.stories++; s.last = todayStr();
  let newly = false;
  if (!s.mastered && s.stories >= 2 && s.reads >= 6 && s.right / s.reads >= 0.9){
    s.mastered = todayStr(); newly = true;
    const P = pathState(); P.done[focus.id] = Object.assign({ mastered:true, stars:3, date:todayStr(), viaStories:true }, P.done[focus.id] || {});
    K.stars += 5;
  }
  save();
  if (newly){
    confetti(120); beep('level'); burst('SKILL UP!'); say(`New skill unlocked: ${focus.lesson.title}!`);
    await modal(el('div',{}, el('div',{class:'big-e'},'🏅'), el('h2',{}, `Skill unlocked: ${focus.lesson.title}!`),
      el('p',{}, `You read ${s.right} of ${s.reads} ${focus.lesson.title} words right across ${s.stories} stories. +5 ⭐`)), [['Awesome! ▶','',1]]);
  }
}

/* ================= PARENT AREA ================= */
function screenPin(){
  stopAll();
  let entered = '';
  const dots = el('div',{class:'pin-dots'},'○○○○');
  const msg = el('p',{class:'muted'},'Enter the grown-up PIN (starts as 1234)');
  const pad = el('div',{class:'pad'});
  const press = d => {
    if (d === '⌫') entered = entered.slice(0,-1); else if (entered.length < 4) entered += d;
    dots.textContent = '●'.repeat(entered.length) + '○'.repeat(4-entered.length);
    if (entered.length === 4){
      if (entered === DB.pin) setTimeout(()=>screenParent(kid || 'daughter'), 150);
      else { msg.textContent = 'Not quite. Try again.'; entered = ''; setTimeout(()=>dots.textContent='○○○○', 300); }
    }
  };
  ['1','2','3','4','5','6','7','8','9','','0','⌫'].forEach(d => pad.append(d ? el('button',{onclick:()=>press(d)}, d) : el('div')));
  const back = () => kid ? screenHome() : screenProfiles();
  document.body.className = 'parent';
  show(el('div',{class:'screen center', style:'align-items:center;justify-content:center'},
    el('div',{class:'card', style:'max-width:420px;width:100%;text-align:center'},
      el('h2',{},'🔒 Grown-ups Only'), msg, dots, pad,
      el('button',{class:'btn small gray', style:'margin-top:18px', onclick:back},'Cancel'))));
}

/* Weekly summary for grown-ups: minutes and activities per day, this week vs last week, tricky words,
   and one plain-language suggestion. Minutes come from each session's `ms` (recorded from Nov 2026 on). */
function weeklySummary(which){
  const k = DB.kids[which], name = DB.names[which];
  const dayKey = d => todayStr(d);
  const days = Array.from({ length:7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const inRange = (s, from, to) => { const t = new Date(s.date); return t >= from && t < to; };
  const start = n => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - n); return d; };
  const thisWeek = k.sessions.filter(s => inRange(s, start(6), new Date(Date.now() + 1)));
  const lastWeek = k.sessions.filter(s => inRange(s, start(13), start(6)));
  const minutes = list => Math.round(list.reduce((t, s) => t + (s.ms || 0), 0) / 60000);
  const quizAvg = list => { const q = list.filter(s => s.quiz).map(s => { const [c, t] = s.quiz.split('/').map(Number); return c / t; }); return q.length ? Math.round(q.reduce((a, b) => a + b, 0) / q.length * 100) : null; };
  const accAvg = list => { const r = list.filter(s => s.mode === 'normal' && s.total); return r.length ? Math.round(r.reduce((t, s) => t + s.accuracy, 0) / r.length) : null; };
  const stories = list => list.filter(s => s.mode === 'normal' && s.kind === 'story').length;
  const perDay = days.map(d => { const list = k.sessions.filter(s => dayKey(new Date(s.date)) === dayKey(d)); return { d, n: list.length, min: minutes(list) }; });
  const maxMin = Math.max(goalMin(which), ...perDay.map(x => x.min));
  const goalDays = perDay.filter(x => x.min >= goalMin(which)).length;
  const qNow = quizAvg(thisWeek), qBefore = quizAvg(lastWeek), aNow = accAvg(thisWeek);
  const tricky = practiceWords(k).slice(0, 5).map(w => k.words[w].disp || w);
  const arrow = (now, before) => now == null || before == null ? '' : now > before ? ` ▲ up from ${before}%` : now < before ? ` ▼ down from ${before}%` : ' (same as last week)';
  let tip;
  if (!thisWeek.length) tip = `No reading yet this week. A short story at a set time each day (after school or before bed) builds the habit.`;
  else if (qNow != null && qNow < 70) tip = `Questions are the hard part right now. Before answering, ask ${name} to tell you what happened in the story, and encourage highlighting clues.`;
  else if (which === 'son' && aNow != null && aNow < 90) tip = `Some words are tricky. Have ${name} tap 👂 Hear it first, then read the same story again. A second read builds speed and confidence.`;
  else if (goalDays < 4) tip = `${name} met the ${goalMin(which)}-minute goal on ${goalDays} of 7 days. A regular reading time helps the streak grow.`;
  else if (tricky.length >= 3) tip = `Great week! Practice these words together: ${tricky.slice(0, 3).join(', ')}.`;
  else tip = `Great week! ${name} is ready for a challenge. Try a longer story or the next chapter book.`;
  return el('div',{class:'card weekly'},
    el('h2',{}, `📅 ${name}'s week`),
    el('div',{class:'week-bars'}, ...perDay.map(x => el('div',{class:'week-day'},
      el('div',{class:'week-bar-wrap'}, el('div',{class:'week-bar' + (x.min >= goalMin(which) ? ' met' : ''), style:`height:${Math.round(x.min / maxMin * 100)}%`})),
      el('b',{}, x.min + 'm'), el('span',{class:'muted'}, x.d.toLocaleDateString(undefined, { weekday:'short' })), el('span',{class:'muted'}, x.n ? x.n + ' done' : '–')))),
    el('div',{class:'result-grid'},
      el('div',{class:'stat'}, el('b',{}, minutes(thisWeek) + ' min'), el('span',{}, `read this week (goal met ${goalDays}/7 days)`)),
      el('div',{class:'stat'}, el('b',{}, stories(thisWeek)), el('span',{}, `stories & chapters finished (last week ${stories(lastWeek)})`)),
      el('div',{class:'stat'}, el('b',{}, qNow == null ? '–' : qNow + '%'), el('span',{}, 'questions right' + arrow(qNow, qBefore))),
      which === 'son' ? el('div',{class:'stat'}, el('b',{}, aNow == null ? '–' : aNow + '%'), el('span',{}, 'words read right' + arrow(aNow, accAvg(lastWeek)))) : null),
    el('p',{}, el('b',{},'Tricky words: '), tricky.length ? tricky.join(', ') : 'none right now 🎉'),
    el('p',{class:'week-tip'}, '💡 ' + tip));
}

function screenParent(which){
  document.body.className = 'parent';
  const k = DB.kids[which], track = TRACKS[which];
  const label = DB.names[which] + (which === 'daughter' ? ' (Dragon Academy · Sunny Day Club)' : ` (${CAT} & Pals · Detective ${CAT})`);
  const tabs = el('div',{class:'tabs'},
    el('button',{class:'tab' + (which==='daughter'?' active':''), onclick:()=>screenParent('daughter')},'🐉 ' + DB.names.daughter),
    el('button',{class:'tab' + (which==='son'?' active':''), onclick:()=>screenParent('son')},'🐲 ' + DB.names.son));

  const recent = k.sessions.filter(s => s.mode === 'normal').slice(0,10);
  const avg = f => recent.length ? Math.round(recent.reduce((t,s)=>t+(f(s)||0),0)/recent.length) : '–';
  const quizPct = recent.filter(s=>s.quiz).map(s => { const [c,t]=s.quiz.split('/').map(Number); return c/t; });
  const wordRows = Object.entries(k.words).sort((a,b) => (!!a[1].mastered - !!b[1].mastered) || (b[1].miss - a[1].miss));

  const levelSel = el('select',{}, ...track.levels.map(L => { const o = el('option',{value:L.n}, `Level ${L.n}: ${L.title}`); if (L.n === k.level) o.selected = true; return o; }));
  const table = el('table',{}, el('tr',{}, ...['Date','Lvl','Activity','Accuracy','WCPM','Quiz','Missed','🎧'].map(h=>el('th',{},h))));
  k.sessions.slice(0,40).forEach(s => {
    const d = new Date(s.date);
    table.append(el('tr',{},
      el('td',{}, d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' ' + d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})),
      el('td',{}, s.level), el('td',{}, s.title + (s.mode!=='normal' ? ' (warm-up)' : '')),
      el('td',{}, s.accuracy + '%'), el('td',{}, s.wcpm ?? '–'), el('td',{}, s.quiz ?? '–'),
      el('td',{}, (s.missed||[]).slice(0,6).join(', ')),
      el('td',{}, s.hasRec ? el('button',{class:'btn small blue', onclick:ev=>playRec(s.id, ev.currentTarget)},'▶') : '–')));
  });

  const exportBox = el('textarea',{readonly:true});
  const importBox = el('textarea',{placeholder:'Paste exported progress here, then tap Import'});
  const status = el('p',{class:'muted'});

  const s = el('div',{class:'screen', style:'max-width:1000px'},
    el('div',{class:'row', style:'justify-content:space-between;margin-bottom:12px'},
      el('h1',{style:'margin:0;font-size:30px'},'Grown-up Dashboard'),
      el('button',{class:'btn small', onclick:()=>{ document.body.className=''; kid ? (setKid(kid), screenHome()) : screenProfiles(); }},'Done')),
    tabs,
    weeklySummary(which),
    el('div',{class:'card'},
      el('h2',{}, label),
      el('div',{class:'result-grid'},
        el('div',{class:'stat'}, el('b',{}, k.placed ? k.level + '/' + track.levels.length : 'Not placed'), el('span',{},'current level')),
        el('div',{class:'stat'}, el('b',{}, avg(s=>s.accuracy) + (recent.length?'%':'')), el('span',{},'avg accuracy (last 10)')),
        el('div',{class:'stat'}, el('b',{}, which==='daughter' || k.level>=4 ? avg(s=>s.wcpm) : '–'), el('span',{},'avg words/min')),
        el('div',{class:'stat'}, el('b',{}, quizPct.length ? Math.round(quizPct.reduce((a,b)=>a+b,0)/quizPct.length*100)+'%' : '–'), el('span',{},'avg quiz score')),
        el('div',{class:'stat'}, el('b',{}, k.passStreak + ' / ' + k.failStreak), el('span',{},'pass / struggle streak')),
        el('div',{class:'stat'}, el('b',{}, k.streak.count||0), el('span',{},'day streak'))),
      el('p',{class:'muted'}, `Stars earned ${k.stars} · spent ${k.spent||0} · trophies ${k.trophies.length}/${track.levels.length} · badges ${k.badges.length}/${BADGES.length} · collection ${k.collection.length}/${track.rewards.length}`),
      el('h3',{},'Level controls'),
      el('div',{class:'row'}, levelSel,
        el('button',{class:'btn small blue', onclick:()=>{ k.level = +levelSel.value; k.placed = true; k.passStreak = 0; k.failStreak = 0; save(); status.textContent = 'Level set to ' + k.level + '.'; screenParent(which); }},'Set level'),
        el('button',{class:'btn small gray', onclick:()=>{ k.placed = false; save(); status.textContent = 'Placement check will run next time.'; }},'Redo placement check'),
        el('button',{class:'btn small gray', onclick:()=>{ k.avatar.base = null; save(); status.textContent = 'They\'ll pick a new buddy next time they open the app. Shop items stay.'; }},'Let them re-pick buddy'),
        el('button',{class:'btn small red', onclick:async()=>{
          const ok = await modal(el('div',{}, el('h2',{},'Reset all progress?'), el('p',{},`This erases ${label}'s levels, stars, collection and history on this iPad.`)), [['Cancel','gray',false],['Reset','red',true]]);
          if (ok){ DB.kids[which] = freshKid(); save(); idb.clear(which + '_'); screenParent(which); }
        }},'Reset progress')),
      status),
    el('div',{class:'card'},
      el('h2',{},'Word tracker'),
      el('p',{class:'muted'}, `Every missed or helped word is tracked. A word is mastered after it's read right ${MASTER_STREAK} times in a row (in stories or practice). ${practiceWords(k).length} to practice · ${masteredWords(k).length} mastered.`),
      wordRows.length ? el('div',{style:'overflow-x:auto;max-height:420px;overflow-y:auto'}, el('table',{},
        el('tr',{}, ...['Word','Times missed','Right in a row','Status','Last missed',''].map(h=>el('th',{},h))),
        ...wordRows.map(([w,r]) => el('tr',{},
          el('td',{style:'font-weight:600;font-size:18px'}, r.disp||w), el('td',{}, r.miss), el('td',{}, r.streak + ' / ' + MASTER_STREAK),
          el('td',{}, r.mastered ? '✅ mastered ' + r.mastered : '🎯 practicing'), el('td',{}, r.last || '–'),
          el('td',{}, el('button',{class:'btn small gray', onclick:()=>{ delete k.words[w]; save(); screenParent(which); }},'Remove')))))) : el('p',{class:'muted'},'No missed words yet.'),
      el('div',{class:'row', style:'margin-top:10px'},
        (()=>{ const i = el('input',{type:'text', placeholder:'Add a word to practice'}); return i; })(),
        el('button',{class:'btn small blue', onclick:ev=>{ const inp = ev.currentTarget.previousSibling; const w = norm(inp.value); if (w){ k.words[w] = k.words[w] || { miss:0, streak:0, mastered:null, last:null, disp:inp.value.trim() }; k.words[w].mastered = null; save(); screenParent(which); } }},'Add word'))),
    el('div',{class:'card'}, el('h2',{},'Reading history'), k.sessions.length ? el('div',{style:'overflow-x:auto'}, table) : el('p',{class:'muted'},'No sessions yet.')),
    el('div',{class:'card'},
      el('h2',{},'Settings (this iPad)'),
      el('label',{class:'toggle'}, (()=>{ const c = el('input',{type:'checkbox'}); c.checked = !!DB.record; c.onchange = () => { DB.record = c.checked; save(); }; return c; })(),
        'Save audio recordings of reading (test it: on some iPads, recording at the same time can stop listening from working)'),
      el('label',{class:'toggle'}, (()=>{ const c = el('input',{type:'checkbox'}); c.checked = !!DB.forceManual; c.onchange = () => { DB.forceManual = c.checked; save(); }; return c; })(),
        'Grown-up scoring mode (you tap missed words instead of the app listening)'),
      el('p',{class:'muted'}, 'Listening available in this browser: ' + (srSupported ? 'yes ✅' : 'no ❌ (open in Safari from an https:// address)')),
      el('div',{class:'row', style:'margin-top:8px'}, (()=>{ const sel = el('select',{style:'max-width:100%'},
          el('option',{value:''},'Reading voice: best available (auto)'),
          ...englishVoices().map(v => el('option',{value:v.name}, v.name + ' (' + v.lang + ')')));
          sel.value = DB.voiceName || ''; sel.onchange = () => { DB.voiceName = sel.value || null; save(); pickVoice(); say('Hi! This is how I will sound when I read to you.'); }; return sel; })(),
        el('button',{class:'btn small blue', onclick:()=>{ pickVoice(); say('Hi! This is how I will sound when I read to you.'); }},'🔊 Test voice')),
      el('p',{class:'muted'}, 'Now using: ' + (voice ? voice.name : 'device default') + '. For the most natural voice on iPad: Settings › Accessibility › Spoken Content › Voices › English, download an "Enhanced" or "Premium" voice (like Ava or Zoe), then pick it here.'),
      el('div',{class:'row'}, (()=>{ const i = el('input',{type:'text', value: DB.names[which]}); i.onchange = () => { if (i.value.trim()){ DB.names[which] = i.value.trim(); save(); } }; return i; })(), el('span',{class:'muted'},'Name shown in the app')),
      el('div',{class:'row', style:'margin-top:8px'}, (()=>{ const i = el('input',{type:'number', min:'5', max:'60', step:'5', value: goalMin(which), style:'width:110px'});
          i.onchange = () => { const v = Math.max(5, Math.min(60, parseInt(i.value, 10) || 10)); DB.goalMin = Object.assign({}, DB.goalMin, { [which]: v }); i.value = v; save(); }; return i; })(),
        el('span',{class:'muted'}, `Daily reading goal in minutes for ${DB.names[which]} (the day streak grows when it's reached)`)),
      el('div',{class:'row', style:'margin-top:8px'}, (()=>{ const i = el('input',{type:'text', value: CAT}); return i; })(),
        el('button',{class:'btn small blue', onclick:ev=>{ const v = ev.currentTarget.previousSibling.value.trim().replace(/[^A-Za-z' -]/g,''); if (v){ DB.catName = v[0].toUpperCase() + v.slice(1); save(); location.reload(); } }},'Rename the cat'),
        el('span',{class:'muted'},`Miles's story cat (now "${CAT}") — renames him in every story`)),
      el('div',{class:'row', style:'margin-top:8px'}, (()=>{ const sel = el('select',{},
          el('option',{value:''},'Ask who\'s reading (show both kids)'),
          el('option',{value:'daughter'},'Always open ' + DB.names.daughter),
          el('option',{value:'son'},'Always open ' + DB.names.son));
          sel.value = DB.pinKid || ''; sel.onchange = () => { DB.pinKid = sel.value || null; save(); }; return sel; })(),
        el('span',{class:'muted'},'When this iPad opens the app')),
      el('div',{class:'row', style:'margin:8px 0'}, (()=>{ const i = el('input',{type:'number', placeholder:'Bonus stars', style:'width:150px'}); return i; })(),
        el('button',{class:'btn small blue', onclick:ev=>{ const v = parseInt(ev.currentTarget.previousSibling.value,10); if (v){ k.stars += v; save(); screenParent(which); } }},'Give stars')),
      el('div',{class:'row'}, (()=>{ const i = el('input',{type:'number', placeholder:'New 4-digit PIN', inputmode:'numeric'}); return i; })(),
        el('button',{class:'btn small blue', onclick:ev=>{ const v = ev.currentTarget.previousSibling.value.trim(); if (/^\d{4}$/.test(v)){ DB.pin = v; save(); status.textContent = 'PIN changed.'; ev.currentTarget.previousSibling.value=''; } else status.textContent = 'PIN must be 4 digits.'; }},'Change PIN'))),
    el('div',{class:'card'},
      el('h2',{},'Back up / move progress'),
      el('p',{class:'muted'},'Progress lives on each iPad. Export here, then Import on another device to copy it over. (Recordings stay on this iPad.)'),
      el('div',{class:'row'},
        el('button',{class:'btn small blue', onclick:()=>{ exportBox.value = JSON.stringify(DB); exportBox.select?.(); }},'Show export'),
        el('button',{class:'btn small blue', onclick:async()=>{ exportBox.value = JSON.stringify(DB); try { await navigator.clipboard.writeText(exportBox.value); status2.textContent = 'Copied to clipboard ✅'; } catch(e){ status2.textContent = 'Copy blocked here. Select the text below and copy it.'; } }},'Copy'),
        el('button',{class:'btn small blue', onclick:()=>{ try { const b = new Blob([JSON.stringify(DB,null,1)],{type:'application/json'}); const a = el('a',{href:URL.createObjectURL(b), download:'reading-quest-progress-' + todayStr() + '.json'}); document.body.append(a); a.click(); a.remove(); status2.textContent='Download started (if your browser allows it).'; } catch(e){ status2.textContent='Download not allowed here; use Copy.'; } }},'Download file')),
      exportBox,
      el('h3',{},'Import'),
      importBox,
      el('div',{class:'row'},
        el('button',{class:'btn small green', onclick:()=>doImport(importBox.value)},'Import pasted text'),
        (()=>{ const f = el('input',{type:'file', accept:'.json,application/json'}); f.onchange = async () => { if (f.files[0]) doImport(await f.files[0].text()); }; return f; })()),
      (status2 = el('p',{class:'muted'}))));
  show(s);
  function doImport(txt){
    try { const d = JSON.parse(txt); if (!d.kids) throw 0; DB = Object.assign(load(), d); for (const kk of ['son','daughter']) DB.kids[kk] = Object.assign(freshKid(), d.kids[kk]||{}); save(); status2.textContent = 'Imported ✅'; setTimeout(()=>screenParent(which), 600); }
    catch(e){ status2.textContent = 'That doesn\'t look like a Reading Quest export.'; }
  }
}
let status2 = null;
let playing = null;
async function playRec(id, btn){
  if (playing){ playing.pause(); playing = null; btn.textContent = '▶'; return; }
  const clips = await idb.get(id);
  if (!clips || !clips.length){ btn.textContent = 'n/a'; return; }
  let i = 0; btn.textContent = '⏹';
  const next = () => {
    if (i >= clips.length){ playing = null; btn.textContent = '▶'; return; }
    const au = new Audio(URL.createObjectURL(clips[i++])); playing = au;
    au.onended = next; au.play().catch(()=>{ btn.textContent = '▶'; playing = null; });
  };
  next();
}

/* ---------------- boot ---------------- */
window.addEventListener('pagehide', stopAll);
document.addEventListener('visibilitychange', () => { if (document.hidden && recogOn) stopRecog(); });
if (DB.pinKid && DB.kids[DB.pinKid]) enterKid(DB.pinKid);
else screenProfiles();
cloudStart();
watchForUpdates();

// test hooks
window.__RQ = { graphemes: typeof graphemes !== 'undefined' ? graphemes : null, align, wordMatch, tokenizeHeard, letterMatch, get run(){ return run; }, get DB(){ return DB; } };
})();


