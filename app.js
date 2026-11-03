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
  if (d.kids.dev){ d.kids.dev = Object.assign(freshKid(), d.kids.dev); d.kids.dev.avatar = Object.assign({ base:null, owned:[], equipped:{} }, d.kids.dev.avatar||{}); }
  d.names = Object.assign({ daughter:'Gianna', son:'Miles' }, d.names||{});
  d.devName = d.devName || 'The Wizard';
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
      u.lang = voice ? voice.lang : 'en-US'; u.rate = opts.rate || (TK==='son' ? 0.9 : 0.95); u.pitch = 1;
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
    // skipped a line? jump ahead when two heard words in a row match further on in the story
    if (!matched && heard[i+1]){
      for (let k=4; k<=40 && pos+k+1<target.length; k++){
        if (wordMatch(target[pos+k], h, strict) && wordMatch(target[pos+k+1], heard[i+1], strict)){
          for (let s=pos; s<pos+k; s++) st[s] = 'miss';
          st[pos+k] = 'ok'; pos = pos+k+1; break;
        }
      }
    }
    // otherwise an unmatched heard word = extra word or misread; ignore
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
let TK = null;                // whose reading track is in use ('son' or 'daughter'); the Wizard can switch
const isDev = () => kid === 'dev';
let run = null;               // current passage run

function kidName(k){ k = k || kid; return k === 'dev' ? (DB.devName || 'The Wizard') : DB.names[k]; }
function setKid(k){
  kid = k; K = DB.kids[k]; TK = k === 'dev' ? (DB.devTrack || 'daughter') : k; T = TRACKS[TK]; if (k !== 'dev') DB.lastKid = k; save();
  document.body.className = 'theme-' + TK + (k === 'dev' ? ' wizard-mode' : '');
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
  if (TK === 'son'){ const d = el('div',{html:biscuitSVG()}); return d.firstElementChild; }
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
        DB.kids.daughter.hero ? profileHero('daughter') : DB.kids.daughter.avatar.base ? el('div',{html: avatarSVG(DB.kids.daughter.avatar, 120)}) : el('div',{class:'pic'},'🐰'), DB.names.daughter, el('small',{},'Dragon Academy · Sunny Day Club')),
      el('button',{class:'profile son', onclick:()=>{ beep('tap'); enterKid('son'); }},
        DB.kids.son.hero ? profileHero('son') : DB.kids.son.avatar.base ? el('div',{html: avatarSVG(DB.kids.son.avatar, 120)}) : el('div',{class:'pic'},'🐲'), DB.names.son, el('small',{},`${CAT} & Pals · Detective ${CAT}`)),
      DB.devOn && DB.kids.dev ? el('button',{class:'profile wizard', onclick:()=>{ beep('tap'); enterKid('dev'); }},
        DB.kids.dev.hero ? profileHero('dev') : el('div',{class:'pic'},'🧙'), kidName('dev'), el('small',{},'Master Developer · everything unlocked')) : null
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
  if (k === 'dev'){ DB.devOn = true; DB.kids.dev = DB.kids.dev || freshKid(); DB.kids.dev.avatar = Object.assign({ base:null, owned:[], equipped:{} }, DB.kids.dev.avatar || {}); }
  setKid(k);
  if (k === 'dev') wizardSetup();
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
  { const h = $('.boss-hud'); if (h) h.remove(); }
  if (!K.avatar.base || !AVATAR_BASES[K.avatar.base] || !AVATAR_BASES[K.avatar.base].kid) return screenAvatarPick();
  if (!K.hero) return screenHeroCreate();
  if (awardTrophiesUpTo(K.level).length) save();
  if (K.giftMsg){ msg = msg ? K.giftMsg + ' ' + msg : K.giftMsg; delete K.giftMsg; save(); confetti(80); beep('level'); }
  const L = levelDef(K.level);
  const max = T.levels.length;
  const today = K.today.date === todayStr() ? K.today.ms : 0;
  const doneToday = today >= goalMs();
  const todo = practiceWords(K);
  const rankWord = TK==='daughter' ? 'Rank' : 'Level';
  // one card per story series available at this level (or one card for word/letter rounds)
  const cards = [];
  if (bossReady()) cards.push(bossCard());
  if (TK === 'daughter'){
    // Gianna: three sections, read quietly, 5 questions each
    const st = nextQuietStory(), book = currentBook(), bs = book && bookState(book.id);
    cards.push(
      st ? el('div',{class:'card next-card series-card'},
        el('div',{class:'series-tag'},'📖 Short Stories'), COUNTS_TAG(),
        el('h2',{}, st.emoji + ' ' + st.title),
        el('p',{},'Read it to yourself, then answer 5 questions. Highlight clues as you go!'),
        el('button',{class:'btn big', onclick:()=>{ beep('tap'); startQuietStory(); }},'▶ Read')) : null,
      book ? el('div',{class:'card next-card series-card'},
        el('div',{class:'series-tag'},'📚 Chapter Books'), COUNTS_TAG(),
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
  if (TK !== 'daughter' && L.kind !== 'story') cards.push(el('div',{class:'card next-card'},
      el('div',{class:'series-tag'}, L.kind === 'letters' ? '🔤 Practice' : '⭐ Practice'), COUNTS_TAG(),
      el('h2',{}, L.kind === 'letters' ? 'Letter Sounds Round' : L.title + ' Round'), el('p',{}, L.intro),
      el('button',{class:'btn big', onclick:()=>{ beep('tap'); startActivity(); }},'▶ Start')));
  if (TK !== 'daughter'){
    seriesAt(K.level).forEach(sid => {
      const st = storyFor(K.level, sid).story, info = (T.series||{})[sid] || { name:'', emoji:'' };
      cards.push(el('div',{class:'card next-card series-card'},
        el('div',{class:'series-tag'}, info.emoji + ' ' + info.name), COUNTS_TAG(),
        el('h2',{}, st.emoji + ' ' + st.title), el('p',{}, 'Read it out loud, then answer questions!'),
        el('button',{class:'btn big', onclick:()=>{ beep('tap'); startActivity(sid); }},'▶ Read')));
    });
  }
  if (TK !== 'daughter' && todo.length) cards.push(el('div',{class:'card next-card practice-card'},
    el('div',{class:'series-tag'},'🎯 My Words'),
    el('h2',{}, `${todo.length} tricky word${todo.length>1?'s':''} to practice`),
    el('p',{}, todo.slice(0,6).map(w => K.words[w].disp||w).join(' · ')),
    el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); startPractice(); }},'💪 Practice')));
  if (TK !== 'daughter' && spellWords().length) cards.push(el('div',{class:'card next-card spell-card'},
    el('div',{class:'series-tag'},'✏️ Spelling'),
    el('h2',{},'Spelling Practice'),
    el('p',{},'Hear a word, then build it with letter tiles! +1 ⭐ for each word you spell on the first try.'),
    el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); startSpelling(); }},'✏️ Spell')));
  const avatar = K.hero ? heroNode(150) : avatarNode(150);
  avatar.classList.add('mascot-av');
  avatar.onclick = () => K.hero ? screenArmory() : screenShop();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      homeBtn(),
      el('div',{class:'row'},
        isDev() ? el('button',{class:'btn small wizard-btn', onclick:()=>{ beep('tap'); screenWizard(); }},'🧙 Wizard') : null,
        el('button',{class:'btn small town-btn', onclick:()=>{ beep('tap'); screenTownSquare(); }},'🏰 Town Square'),
        el('button',{class:'btn ghost small', onclick:()=>screenWorld()},'🏗️ My World'),
        el('button',{class:'btn ghost small', onclick:screenQuestMap},'🗺️ Quest Map'),
        el('button',{class:'btn ghost small', onclick:screenArmory},'🛡️ Armory'),
        el('button',{class:'btn ghost small', onclick:screenHeroHall},'🏛️ Heroes'),
        el('button',{class:'btn ghost small', onclick:screenRealBooks},'📚 Real Books'),
        el('button',{class:'btn ghost small', onclick:()=>{ ensureSkillStart(); screenPath(); }},'🧠 Skills'),
        el('button',{class:'btn ghost small', onclick:screenShop},'🛍️ Shop'),
        el('button',{class:'btn ghost small', onclick:screenTrophies},'🏆 Trophies'),
        el('button',{class:'btn ghost small', onclick:screenCollection}, TK==='daughter' ? '🐉 Roost' : '📖 Pals'),
        el('button',{class:'btn ghost small', onclick:screenWords},'🎯 Words'),
        el('button',{class:'btn ghost small', onclick:()=>{ beep('tap'); TK === 'daughter' ? startSpellCheck() : startSpelling(); }},'✏️ Spelling'))),
    el('div',{class:'hero'}, avatar,
      el('div',{class:'grow'},
        el('h1',{class:'title'}, `Hi, ${kidName()}!`),
        el('p',{class:'subtitle'}, `${rankWord} ${K.level}: ${L.title}`),
        el('div',{class:'tier-track'}, ...T.levels.map((Lv,i) => { const n = i+1, tr = TROPHIES[TK][i];
          return el('div',{class:'tier' + (n < K.level ? ' done' : n === K.level ? ' now' : '')}, el('span',{class:'tier-n'}, n), el('span',{class:'tier-e'}, n <= K.level ? tr[0] : '🔒')); })),
        el('div',{class:'stats'},
          el('span',{class:'pill'},'⭐ ' + balance()),
          el('span',{class:'pill cosmic-pill', onclick:()=>cosmicInfo()},'💫 ' + cosmicBal()),
          el('span',{class:'pill'},'🔥 ' + (K.streak.count||0) + ' day streak'),
          el('span',{class:'pill'},'🏆 ' + K.trophies.length + ' · 🎖️ ' + K.badges.length),
          el('span',{class:'pill'},(TK==='daughter'?'🐉 ':'🐾 ') + K.collection.length)),
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

// How close the kid is to the next level: 3 great (3-star) reads level up; a rough read takes one away (see commitResults).
const LEVEL_UP_STREAK = 3;
function levelProgress(){
  const word = TK==='daughter' ? 'Rank' : 'Level';
  if (K.level >= T.levels.length && (K.bossesBeaten||[]).includes(K.level)) return el('div',{class:'lvl-progress'}, el('div',{class:'lvl-tip'}, `👑 You beat the final boss! Reading legend!`));
  const have = Math.min(K.passStreak||0, LEVEL_UP_STREAK), left = LEVEL_UP_STREAK - have;
  return el('div',{class:'lvl-progress'},
    el('div',{class:'lvl-head'}, el('span',{}, `${word} ${K.level}`), el('span',{}, bossFor(K.level) ? `${bossFor(K.level).e} Boss → ${word} ${K.level+1}` : `${word} ${K.level+1} 🔓`)),
    el('div',{class:'lvl-bar'}, ...Array.from({length:LEVEL_UP_STREAK}, (_,i) => el('div',{class:'lvl-seg' + (i < have ? ' on' : '')}, i < have ? '⭐⭐⭐' : ''))),
    el('div',{class:'lvl-tip'}, TK === 'daughter'
      ? (bossReady() ? `⚔️ The boss is waiting! Beat it to reach ${word} ${K.level+1}.` : `${left} more stor${left>1?'ies':'y'} with 4 or 5 questions right to face the boss!`)
      : (bossReady() ? `⚔️ The boss is waiting! Beat it to reach ${word} ${K.level+1}.` : `${left} more ⭐⭐⭐ read${left>1?'s':''} to face the boss!`)),
    bossReady() ? null : el('div',{class:'lvl-rule'}, '⭐⭐⭐ = ' + greatRule().short),
    el('button',{class:'btn small lvl-how', onclick:()=>{ beep('tap'); levelGuide(); }},'❓ How do I level up?'));
}

// What a ⭐⭐⭐ (great) read means at the kid's current level, in kid words (matches starsFor in screenResults).
function greatRule(){
  const L = levelDef(K.level);
  if (TK === 'daughter') return { short:'4 or 5 of the 5 questions right', long:'Get 4 or 5 of the 5 questions right.' };
  if (L.kind === 'letters'){ const n = Math.ceil(L.pass * L.roundSize - 1e-9); return { short:`${n} of ${L.roundSize} letter sounds right`, long:`Say at least ${n} of the ${L.roundSize} letter sounds right.` }; }
  if (L.kind === 'words'){ const n = Math.ceil(L.pass * L.roundSize - 1e-9); return { short:`${n} of ${L.roundSize} words right`, long:`Read at least ${n} of the ${L.roundSize} words right.` }; }
  return { short:'almost every word right + most questions right', long:'Read almost every word right, then get most of the questions right (like 4 out of 5).' };
}
const COUNTS_TAG = () => el('span',{class:'counts-tag'},'⬆️ Levels you up');

// Step-by-step "how to level up" guide, with the kid's own progress, read aloud for Miles.
function levelGuide(){
  const word = TK === 'daughter' ? 'Rank' : 'Level', next = K.level + 1, rule = greatRule();
  const have = Math.min(K.passStreak||0, LEVEL_UP_STREAK), boss = bossFor(K.level), ready = bossReady();
  const L = levelDef(K.level);
  const round = L.kind === 'letters' ? 'Letter Sounds Round' : L.title + ' Round';
  // word/letter levels can also have story cards, which use the story rule
  const how = TK === 'daughter' ? `Read a Short Story or a Chapter Book. ${rule.long}`
    : L.kind === 'story' ? `Read a story card. ${rule.long}`
    : `In the ${round}: ${rule.long.replace(/^./, c => c.toLowerCase())}` + (seriesAt(K.level).length ? ' In a story: read almost every word right and get most questions right.' : '');
  const steps = [
    ['⭐⭐⭐', `Tap a card with the ⬆️ Levels you up sticker and get 3 stars. ${how}`, have > 0 || ready ? 'done' : 'now'],
    ['3️⃣', `Do that 3 times. You have ${ready ? LEVEL_UP_STREAK : have} of ${LEVEL_UP_STREAK}.`, ready ? 'done' : have > 0 ? 'now' : 'todo'],
    boss ? [boss.e, `Beat the boss, ${boss.name}! It shows up at the top of your page.`, ready ? 'now' : 'todo'] : null,
    ['🏆', `You reach ${word} ${next}!`, 'todo']
  ].filter(Boolean);
  const notes = [
    '⭐⭐ Good read: your star boxes stay the same.',
    '⭐ Tricky read: you lose one star box. Keep trying!',
    TK === 'daughter' ? '✏️ Spelling Checks earn stars for the shop, but they don\'t change your rank.'
      : '✏️ Spelling, 🧠 Skills and 💪 Practice earn stars for the shop, but they don\'t change your level.'
  ];
  const ov = el('div',{class:'overlay'});
  const speak = () => say([`How to reach ${word} ${next}.`, ...steps.map((s, i) => `Step ${i + 1}. ${s[1].replace('⬆️ ', '')}`), ...notes.map(n => n.replace(/^[^A-Za-z]+/, ''))].join(' '));
  ov.append(el('div',{class:'modal level-guide'},
    el('h2',{}, `How to reach ${word} ${next}`),
    el('ol',{class:'lg-steps'}, ...steps.map(([e, t, st], i) => el('li',{class:'lg-step ' + st},
      el('span',{class:'lg-num'}, st === 'done' ? '✅' : i + 1), el('span',{class:'lg-e'}, e), el('span',{class:'lg-t'}, t),
      st === 'now' ? el('span',{class:'lg-now'},'👈 You are here') : null))),
    el('ul',{class:'lg-notes'}, ...notes.map(n => el('li',{}, n))),
    el('div',{class:'row center', style:'margin-top:16px'},
      el('button',{class:'btn blue', onclick:speak},'🔊 Read it to me'),
      el('button',{class:'btn green', onclick:()=>{ if (window.speechSynthesis) speechSynthesis.cancel(); ov.remove(); }},'Got it! ▶'))));
  document.body.append(ov);
}

/* ---------- spelling practice ---------- */
// Words come from the kid's tricky-word list first, then from their current level.
function spellWords(n = 5, minLen = 3){
  const L = levelDef(K.level), maxLen = TK==='son' ? 6 : 9;
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
// Read-aloud stories go on one screen; blank lines in the text become paragraph breaks.
function storyPages(text){
  const tokens = [];
  text.split(/\n\s*\n/).forEach((p, pi) => tokensOf(p.trim()).forEach((t, i) => tokens.push(i === 0 && pi > 0 ? Object.assign(t, { para:true }) : t)));
  return [{ tokens }];
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
  const pages = storyPages(story.text);
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
    el('div',{class:'hero'}, mascotNode(), el('div',{}, el('h1',{class:'title'}, TK==='daughter' ? 'Welcome to Skyfire Academy!' : `Hi! I'm ${CAT}!`),
      el('p',{class:'subtitle'}, TK==='daughter' ? 'Master Oona wants to hear you read, so she can pick the right rank for you.' : 'Let\'s read a little so I know where to start!'))),
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
function skipLevel(){ return SKIP_START[TK] || 1; }
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
  modal(el('div',{}, el('div',{class:'big-e'}, TK==='daughter'?'🏅':'🎉'),
    el('h2',{}, TK==='daughter' ? `You start at Rank ${start}!` : `You start at Level ${start}!`),
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
    if (t.para) passage.append(el('span',{class:'pbreak'}));
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
      el('div',{class:'pageinfo'}, (a.emoji ? a.emoji + ' ' : '') + a.title + (a.pages.length > 1 ? ' · ' + (r.page+1) + ' / ' + a.pages.length : '')),
      el('div',{style:'width:80px'})),
    el('div',{class:'reader-wrap'}, pageCard, hint, heard,
      el('div',{class:'controls'},
        (r.opts.echo || TK === 'son') && !single ? el('button',{class:'btn blue', onclick:()=>{ if (recogOn) stopRecog(); readAlong(); }},'👂 Hear it first') : null,
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
  if (run.opts.boss) bossHud();
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
        pg.tries++;
        // the mic is bad at hearing lone letter sounds ("mmm", "sss"), so a real second try earns half credit
        if (pg.letter && pg.tries >= 2 && !pg.done){
          pg.done = true; pg.status[0] = 'ok'; pg.helped[0] = true; paintWords(); beep('ok'); setHint('Good try! 👍');
          setTimeout(()=>nextPage(false, true), 700); return;
        }
        beep('bad'); setHint(pg.tries >= 2 ? 'Hmm, try once more, or a grown-up can tap ✓ or ✗.' : 'Almost! Try again.');
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
    if (p.helped[i]) { helped++; missed.push(t.n); if (TK === 'son') correct += 0.5; }
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
  const hasQuiz = a.kind === 'story' && (run.opts.mode === 'normal' || run.opts.boss);
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
  const nextBtn = el('button',{class:'btn hidden', onclick:()=>{ Q.i++; Q.i < Q.qs.length ? renderQuestion() : run.opts.boss ? bossResult() : (run.opts.focus ? storyBuilder(run.opts.focus, screenResults) : screenResults()); }}, Q.i < Q.qs.length-1 ? 'Next question ▶' : 'See my stars ⭐');
  const opts = el('div',{class:'options'});
  const proofBox = el('div',{class:'proof-box hidden'});
  item.opts.forEach(o => {
    const b = el('button',{class:'opt'}, el('span',{}, o.t),
      el('span',{class:'say', onclick:ev=>{ ev.stopPropagation(); say(o.t); }}, '🔊'));
    b.addEventListener('click', () => {
      if (answered) return; answered = true;
      if (o.right){ b.classList.add('right'); Q.correct++; beep('ok'); burst(); if (run.opts.boss) bossHud(true); fb.textContent = pick(['Yes! 🎉','You got it! ⭐','Awesome! 🙌','Correct! 🌟']); fb.style.color = 'var(--ok)'; startProof(o.t); }
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
  if (TK === 'son'){ (async()=>{ await say(item.q); })(); }
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
    if (R.accuracy >= Math.min(0.85, passAcc - 0.1) && (!quiz || quiz.c / quiz.t >= 0.6)) return 2;
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
      // say exactly what this read got vs. what ⭐⭐⭐ needs
      const L = levelDef(a.level), passAcc = a.kind === 'story' ? 0.95 : (L.pass || 0.9);
      const gap = st === 3 ? '' : [
        !a.quiet && R.accuracy < passAcc ? `You read ${R.correct} of ${R.total} ${a.kind === 'letters' ? 'sounds' : 'words'} right. ⭐⭐⭐ needs ${Math.ceil(passAcc * R.total - 1e-9)}.` : '',
        quiz && quiz.c / quiz.t < 0.8 ? `You got ${quiz.c} of ${quiz.t} questions. ⭐⭐⭐ needs ${Math.ceil(0.8 * quiz.t - 1e-9)}.` : ''
      ].filter(Boolean).join(' ') + ' ';
      const failAcc = a.kind === 'story' ? 0.85 : (a.kind === 'letters' ? 0.6 : 0.7);
      const rough = R.accuracy < failAcc || (quiz && quiz.c / quiz.t < 0.6), cur = Math.min(K.passStreak||0, LEVEL_UP_STREAK);
      lvlNote.textContent = gap + (st === 3
        ? (have >= LEVEL_UP_STREAK ? (bossFor(K.level) ? `🎉 That's ${LEVEL_UP_STREAK} great reads. ⚔️ The boss is coming!` : `🎉 That's ${LEVEL_UP_STREAK} great reads. ${TK === 'daughter' ? 'Rank' : 'Level'} up!`) : `✅ This counts! ${have} of ${LEVEL_UP_STREAK} toward the next ${TK === 'daughter' ? 'rank' : 'level'}.`)
        : rough ? `Your star boxes go from ${cur} to ${Math.max(0, cur - 1)} of ${LEVEL_UP_STREAK}. You can do it next time!`
        : `Good read! Your star boxes stay at ${cur} of ${LEVEL_UP_STREAK}.`);
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
  const cosmicGains = [];
  if (goalJustHit) cosmicGains.push([1, 'Daily reading goal reached!']);
  // word tracker: misses go on the practice list; 3 correct reads in a row = mastered
  const mastered = a.quiet ? [] : trackWords(a); // quiet reading isn't scored word by word
  K.stars += stars + (r.proofStars || 0);
  if (quiz) K.quizStreak = quiz.c === quiz.t ? (K.quizStreak||0) + 1 : 0;
  if (r.opts.mode === 'normal' && stars === 3) cosmicGains.push([1, 'Perfect 3-star reading!']);
  if (quiz && quiz.c === quiz.t) cosmicGains.push([1, 'Every question right!']);
  if (mastered.length) cosmicGains.push([mastered.length, 'Tricky words mastered!']);

  // session record
  const rec = { id:r.sessionId, date: now.toISOString(), level:a.level, title:a.title, kind:a.kind, mode:r.opts.mode, series:a.series||null,
    total:R.total, correct:R.correct, helped:R.helped, accuracy: a.quiet && quiz ? Math.round(quiz.c / quiz.t * 1000)/10 : Math.round(R.accuracy*1000)/10, wcpm:R.wcpm,
    quiz: quiz ? quiz.c + '/' + quiz.t : null, missed:[...new Set(R.missed)].slice(0,20), stars, hasRec: r.clips.length > 0, ms: elapsed };
  K.sessions.unshift(rec); K.sessions = K.sessions.slice(0, 200);
  if (r.clips.length) idb.put(r.sessionId, r.clips);

  let levelMsg = null, levelUp = false, bookDone = null, bookMsg = null, bossUnlocked = false;
  if (r.opts.mode === 'normal'){
    if (a.kind === 'story') K.storyIdx[a.storyKey] = (K.storyIdx[a.storyKey]||0) + 1;
    if (a.book){ // chapter books: move the bookmark on a decent score, otherwise re-read this chapter
      const B = bookState(a.book.id);
      if (quiz && quiz.c >= 3){
        if (a.chapterIndex >= B.ch) B.ch = a.chapterIndex + 1;
        if (B.ch >= a.book.chapters.length){ B.ch = 0; B.finished = (B.finished || 0) + 1; bookDone = a.book; K.stars += 10; cosmicGains.push([3, 'You finished a chapter book!']); }
      } else bookMsg = `📖 Read Chapter ${a.chapterIndex + 1} of ${a.book.title} again, then you can go on to the next chapter!`;
    }
    const passAcc = a.kind === 'story' ? 0.95 : (L.pass || 0.9);
    const failAcc = a.kind === 'story' ? 0.85 : (a.kind === 'letters' ? 0.6 : 0.7);
    const passed = R.accuracy >= passAcc && (!quiz || quiz.c / quiz.t >= 0.8);
    const failed = R.accuracy < failAcc || (quiz && quiz.c / quiz.t < 0.6);
    // a great read adds to the level-up count, a rough read takes one away, an okay read leaves it alone
    if (passed){ K.passStreak++; K.failStreak = 0; }
    else if (failed){ K.failStreak++; K.passStreak = Math.max(0, (K.passStreak||0) - 1); }
    else K.failStreak = 0;
    if (K.passStreak >= 3 && bossFor(K.level) && K.bossReady !== K.level && !(K.level >= T.levels.length && (K.bossesBeaten||[]).includes(K.level))){ K.bossReady = K.level; K.passStreak = 0; bossUnlocked = true; }
    else if (K.passStreak >= 3 && K.level < T.levels.length && !bossFor(K.level)){ K.level++; K.passStreak = 0; levelUp = true; cosmicGains.push([5, 'You leveled up!']); }
    // drop back only after 3 rough reads in a row, and never back to Miles' mic-unfriendly letter sounds
    else if (K.failStreak >= 3 && K.level > (TK === 'son' ? 2 : 1)){ K.level--; K.failStreak = 0; K.passStreak = 0;
      levelMsg = TK==='daughter' ? '🛡️ Training mission! Let\'s build your dragon skills with some practice stories.' : '💪 Practice time! Let\'s make your reading muscles super strong.'; }
  }
  save();
  cosmicGains.forEach(([n, why]) => addCosmic(n, why));

  if (r.opts.focus) await commitSkill(a, r.opts.focus);
  // rewards
  if (mastered.length){
    confetti(50); beep('level'); say(`You mastered ${mastered.length === 1 ? 'a tricky word' : mastered.length + ' tricky words'}!`);
    await modal(el('div',{}, el('div',{class:'big-e'},'🎯'), el('h2',{}, 'Word mastered!'),
      el('p',{}, mastered.map(w => (K.words[w].disp||w)).join(', ') + ' — read right 3 times in a row!')), [['Yes! ▶','',1]]);
  }
  if (stars >= 2 && r.opts.mode === 'normal') await giveReward();
  if (stars >= 2 && r.opts.mode === 'normal') await maybeGearDrop();
  if (stars >= 3 && r.opts.mode === 'normal') await maybeStarfallChest(); // super rare mythic drop
  if (levelUp){
    const newTrophies = awardTrophiesUpTo(K.level); save();
    confetti(120); beep('level');
    say(TK==='daughter' ? `Amazing! You reached rank ${K.level}!` : `Wow! You made it to level ${K.level}!`);
    const tr = TROPHIES[TK][K.level-1];
    await modal(el('div',{}, el('div',{class:'big-e'}, tr ? tr[0] : '🏆'),
      el('h2',{}, (TK==='daughter' ? 'New Rank: ' : 'Level ') + K.level + '!'),
      el('p',{}, (tr ? 'You won the ' + tr[1] + ' trophy! ' : '') + levelDef(K.level).title + ' unlocked.'),
      K.level === AVATAR_UNLOCK_LEVEL ? el('p',{style:'font-weight:700;color:#7c3aed'}, '🎁 A new reading buddy is unlocked in the Star Shop!') : null,
      legendaryAt(K.level) ? el('p',{style:'font-weight:700;color:#d97706'}, '✨ A legendary ' + (TK==='daughter'?'dragon':'Pocket Pal') + ' can now appear!') : null), [['Awesome! ▶','',1]]);
  }
  if (bossUnlocked){
    const B = bossFor(K.level); confetti(80); beep('level'); burst('BOSS!');
    say(`A boss appeared! ${B.name} is guarding the next level!`);
    await modal(el('div',{}, el('div',{class:'big-e boss-shake'}, B.e), el('h2',{}, '⚔️ BOSS UNLOCKED!'),
      el('p',{}, `${B.name} guards ${TK === 'daughter' ? 'Rank' : 'Level'} ${K.level + 1}. Beat the boss story to level up!`), el('p',{class:'boss-taunt'}, `"${B.taunt}"`)), [['⚔️ Let me at it!','',1]]);
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
  const available = eligible.filter(r => r[3]).concat(TK==='son' ? shuffle(eligible.filter(r => !r[3])) : eligible.filter(r => !r[3]));
  if (!available.length){
    K.stars += 3; save(); beep('star');
    await modal(el('div',{}, el('div',{class:'big-e'},'🎁'), el('h2',{},'Bonus stars!'), el('p',{},'You found everyone at this level! +3 ⭐ for the Star Shop. Level up to unlock legendary friends!')), [['Yay! ▶','',1]]);
    return;
  }
  if (TK === 'daughter'){
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
      el('h1',{class:'title'}, TK==='daughter' ? '🐉 Dragon Roost' : '📖 Creature Book'), el('div')),
    TK==='daughter' ? el('div',{class:'card', style:'margin-bottom:16px; display:flex; align-items:center; gap:20px'},
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
function balance(){ return isDev() ? 999999 : (K.stars||0) - (K.spent||0); }
/* 💫 Cosmic Power: rare second currency for pets and legendary things.
   Collected only for great reading moments (see addCosmic calls). */
function cosmicBal(){ return isDev() ? 99999 : (K.cosmic||0) - (K.cosmicSpent||0); }
function addCosmic(n, why){
  if (!n) return; K.cosmic = (K.cosmic||0) + n; save();
  const t = el('div',{class:'cosmic-toast'}, el('span',{class:'ct-e'},'💫'), el('div',{}, el('b',{}, `+${n} Cosmic Power`), el('small',{}, why || '')));
  t.style.top = (16 + document.querySelectorAll('.cosmic-toast').length * 74) + 'px';
  document.body.append(t); setTimeout(() => t.remove(), 3200);
}
function cosmicInfo(){
  modal(el('div',{}, el('div',{class:'big-e'},'💫'), el('h2',{}, `Cosmic Power: ${cosmicBal()}`),
    el('p',{}, 'Cosmic Power unlocks pets and legendary treasures. Collect it by:'),
    el('div',{class:'cosmic-list'},
      ...[['⭐⭐⭐','A perfect 3-star reading','+1'],['🧠','Every question right','+1'],['🎯','Mastering a tricky word','+1'],['📅','Reaching your daily reading goal','+1'],
          ['🚀','Beating your speed record','+1'],['🎖️','Earning a badge','+2'],['🧩','Mastering a lesson','+2'],['📚','Finishing a chapter book','+3'],['⚡','Unlocking a new skill','+3'],['🏆','Leveling up','+5']]
        .map(([e,t,n]) => el('div',{class:'cosmic-row'}, el('span',{}, e), el('span',{}, t), el('b',{}, n + ' 💫'))))), [['Got it!','',1]]);
}
// Pets and legendary shop items cost Cosmic Power instead of stars
function costOf(slot, price, lvl){
  if (slot === 'pet' || lvl || price >= 60) return { cur:'cosmic', amt: Math.max(3, Math.round(price / 5)) };
  return { cur:'star', amt: price };
}
const legendCosmic = l => Math.round(l.price / 10);   // legendary world items: 18–30 💫
const canPay = c => c.cur === 'cosmic' ? cosmicBal() >= c.amt : balance() >= c.amt;
const pay = c => { if (c.cur === 'cosmic') K.cosmicSpent = (K.cosmicSpent||0) + c.amt; else K.spent = (K.spent||0) + c.amt; };
const costLabel = c => (c.cur === 'cosmic' ? '💫 ' : '⭐ ') + c.amt;

/* ---------- avatar pick (first time) ---------- */
function screenAvatarPick(){
  const choices = Object.entries(AVATAR_BASES).filter(([,b]) => (isDev() || b.kid === TK));
  const name = kidName();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, homeBtn(), el('div')),
    el('div',{class:'topbar center'}, el('div',{}, el('h1',{class:'title center'}, `Pick your reading buddy, ${name}!`),
      el('p',{class:'subtitle center'}, `Choose one now. The ${choices.length > 2 ? 'others unlock' : 'other one unlocks'} at Level ${AVATAR_UNLOCK_LEVEL}!`))),
    el('div',{class:'profiles'}, ...choices.map(([id,b]) => {
      const btn = el('button',{class:'profile ' + (TK==='son'?'son':'daughter'), onclick:()=>{
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
  const bal = el('div',{class:'row'}, el('span',{class:'pill'}, '⭐ ' + balance()), el('span',{class:'pill cosmic-pill', onclick:()=>cosmicInfo()}, '💫 ' + cosmicBal()));
  const renderGrid = () => {
    grid.innerHTML = '';
    if (shopTab === 'base'){
      Object.entries(AVATAR_BASES).filter(([,b]) => (isDev() || b.kid === TK)).forEach(([id,b]) => {
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
      const cost = costOf(slot, price, lvl);
      const can = canPay(cost);
      const action = owned
        ? el('button',{class:'btn small ' + (on?'gray':'green'), onclick:()=>{ if (on) delete K.avatar.equipped[slot]; else K.avatar.equipped[slot] = id; save(); beep('tap'); screenShop(); }}, on ? 'Take off' : 'Wear')
        : el('button',{class:'btn small ' + (can?'':'gray'), onclick:async()=>{
            if (!can){ say(cost.cur === 'cosmic' ? 'You need more Cosmic Power! Get it from perfect stories, leveling up, and new skills.' : 'Keep reading to earn more stars!'); return; }
            pay(cost); K.avatar.owned.push(id); K.avatar.equipped[slot] = id; save();
            beep('level'); confetti(40); say(`You got the ${name}!`);
            await checkBadges(); screenShop(); }}, costLabel(cost));
      if (cost.cur === 'cosmic' && !owned) action.classList.add('cosmic-btn');
      const rar = rarity(price, lvl);
      grid.append(el('div',{class:'shop-item rar-' + rar + (cost.cur === 'cosmic' ? ' cosmic-item' : '') + (on?' on':'')},
        el('div',{class:'rar-tag'}, cost.cur === 'cosmic' ? (slot === 'pet' && rar !== 'legendary' ? 'COSMIC PET' : 'COSMIC') : rar.toUpperCase()),
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
  ['top','🏆','Top of the Track','Reach the highest level', k => k.level >= TRACKS[TK].levels.length],
  ['gear1','🛡️','Geared Up','Collect your first gear piece', k => Object.entries((k.gear||{}).owned||{}).some(([id, l]) => id !== 'traveler' && l.length)],
  ['set1','✨','Full Set','Collect a complete 8-piece gear set', k => (k.setsDone||[]).length >= 1],
  ['set4','👑','Armor Master','Collect 4 complete gear sets', k => (k.setsDone||[]).length >= 4],
  ['boss1','⚔️','Boss Slayer','Defeat your first boss', k => (k.bossesBeaten||[]).length >= 1],
  ['boss4','🛡️','Boss Hunter','Defeat 4 bosses', k => (k.bossesBeaten||[]).length >= 4],
  ['bossfinal','👑','Reading Legend','Defeat the final boss', k => (k.bossesBeaten||[]).includes(TRACKS[TK].levels.length)],
  ['realbook1','📕','Real Reader','Add a real book you finished', k => (k.realBooks||[]).length >= 1],
  ['realbook10','🐛','Bookworm','Finish 10 real books', k => (k.realBooks||[]).length >= 10],
  ['legend1','✨','Legend Hunter','Own a legendary or mythic item', k => (k.legendOwned||[]).length + (k.mythics||[]).length >= 1]
];
const normalSessions = k => k.sessions.filter(s => s.mode === 'normal');
async function checkBadges(){
  for (const [id, e, name, desc, test] of BADGES){
    if (K.badges.includes(id)) continue;
    let ok = false; try { ok = test(K); } catch(err){}
    if (ok){
      K.badges.push(id); K.stars += 5; save(); addCosmic(2, 'New badge: ' + name);
      beep('level'); confetti(60); say(`New badge! ${name}!`);
      await modal(el('div',{}, el('div',{class:'big-e'}, e), el('h2',{}, 'Badge: ' + name), el('p',{}, desc + '. Bonus: +5 ⭐')), [['Awesome! ▶','',1]]);
    }
  }
  await checkLegends();
}
function screenTrophies(){
  const tlist = TROPHIES[TK];
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
  // holiday costumes
  ['head','witchhat','Witch Hat',20], ['head','santahat','Santa Hat',15], ['head','antlers','Reindeer Antlers',15], ['head','pumpkinhat','Pumpkin Head',20],
  ['back','vampcape','Vampire Cape',25],
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
const LASERS = { laser_blue:'#38bdf8', laser_green:'#4ade80', laser_pink:'#f472b6', laser_red:'#ef4444', laser_purple:'#a855f7', laser_gold:'#facc15' };
Object.entries(LASERS).forEach(([id, c]) => {
  HAND[id] = () => `<line x1="160" y1="140" x2="188" y2="52" stroke="${c}" stroke-width="16" stroke-linecap="round" opacity=".35"/><line x1="160" y1="140" x2="188" y2="52" stroke="${c}" stroke-width="9" stroke-linecap="round"/><line x1="160" y1="140" x2="188" y2="52" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><rect x="150" y="136" width="16" height="34" rx="4" transform="rotate(18 158 153)" fill="#94a3b8" stroke="#0f172a" stroke-width="3"/><rect x="151" y="146" width="14" height="4" transform="rotate(18 158 153)" fill="#0f172a"/>`;
});
SHOP.push(['hand','laser_blue','Blue Laser Sword',30], ['hand','laser_green','Green Laser Sword',30], ['hand','laser_pink','Pink Laser Sword',30],
  ['hand','laser_red','Red Laser Sword',35], ['hand','laser_purple','Purple Laser Sword',35], ['hand','laser_gold','Golden Laser Sword',60,5]);
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
  jetpack: () => `<rect x="60" y="120" width="80" height="62" rx="14" fill="#64748b" stroke="#1e293b" stroke-width="4"/><g class="flame"><path d="M66 182 q10 30 20 0z M114 182 q10 30 20 0z" fill="#f97316"/><path d="M71 182 q5 16 10 0z M119 182 q5 16 10 0z" fill="#fde047"/></g>`,
  vampcape: () => `<path d="M48 104 L66 132 L134 132 L152 104 L142 140 L58 140Z" fill="#b91c1c" stroke="#450a0a" stroke-width="3.5" stroke-linejoin="round"/><path d="M60 132 Q100 120 140 132 L172 216 Q100 230 28 216Z" fill="#111827" stroke="#000" stroke-width="4" stroke-linejoin="round"/><path d="M70 140 Q100 132 130 140 L150 206 Q100 216 50 206Z" fill="#991b1b" opacity=".85"/>`
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
  flowerclip: b => { const y = headTop(b); return `${[0,72,144,216,288].map(a=>`<circle cx="${128+10*Math.cos(a*Math.PI/180)}" cy="${y+8+10*Math.sin(a*Math.PI/180)}" r="8" fill="#f472b6" stroke="#be185d" stroke-width="2"/>`).join('')}<circle cx="128" cy="${y+8}" r="6" fill="#fde047"/>`; },
  // holiday costumes
  witchhat: b => { const y = headTop(b); return `<ellipse cx="100" cy="${y+8}" rx="58" ry="11" fill="#4c1d95" stroke="#1e1b4b" stroke-width="3.5"/><path d="M70 ${y+6} L104 ${y-62} Q112 ${y-70} 122 ${y-58} L114 ${y-52} L130 ${y+6}Z" fill="#6d28d9" stroke="#1e1b4b" stroke-width="3.5" stroke-linejoin="round"/><rect x="72" y="${y-6}" width="56" height="9" fill="#f97316"/><rect x="94" y="${y-8}" width="12" height="13" rx="2" fill="none" stroke="#fde047" stroke-width="3"/>`; },
  santahat: b => { const y = headTop(b); return `<path d="M62 ${y+10} Q70 ${y-40} 112 ${y-44} Q146 ${y-46} 156 ${y-12} L140 ${y-16} Q132 ${y-30} 118 ${y-24} L138 ${y+10}Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3.5" stroke-linejoin="round"/><rect x="58" y="${y+2}" width="84" height="16" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2.5"/><circle cx="154" cy="${y-10}" r="11" fill="#fff" stroke="#cbd5e1" stroke-width="2.5"/>`; },
  antlers: b => { const y = headTop(b); return `<path d="M78 ${y+8} L66 ${y-30} M70 ${y-16} L52 ${y-24} M68 ${y-26} L60 ${y-44} M122 ${y+8} L134 ${y-30} M130 ${y-16} L148 ${y-24} M132 ${y-26} L140 ${y-44}" stroke="#92400e" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="76" cy="${y+8}" r="6" fill="#b45309"/><circle cx="124" cy="${y+8}" r="6" fill="#b45309"/>`; },
  pumpkinhat: b => { const y = headTop(b); return `<ellipse cx="100" cy="${y-8}" rx="40" ry="28" fill="#f97316" stroke="#9a3412" stroke-width="3.5"/><path d="M86 ${y-34} Q80 ${y-8} 86 ${y+18} M114 ${y-34} Q120 ${y-8} 114 ${y+18}" stroke="#c2410c" stroke-width="3" fill="none"/><rect x="96" y="${y-46}" width="8" height="14" rx="3" fill="#15803d"/><path d="M84 ${y-14} l8 -8 l8 8z M108 ${y-14} l8 -8 l8 8z" fill="#422006"/><path d="M84 ${y-2} q16 12 32 0 l-6 4 l-4 -4 l-6 6 l-6 -6 l-4 4z" fill="#422006"/>`; }
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
  ['animal','elephant','🐘','Elephant',25], ['animal','giraffe','🦒','Giraffe',25],
  // holidays: Christmas & winter
  ['holiday','xmastree','🎄','Christmas Tree',25], ['holiday','santa','🎅','Santa',35], ['holiday','mrsclaus','🤶','Mrs. Claus',35],
  ['holiday','reindeer','🦌','Reindeer',25], ['holiday','sleigh','🛷','Sleigh',40], ['holiday','snowman','⛄','Snowman',15],
  ['holiday','stocking','🧦','Stocking',8], ['holiday','bells','🔔','Jingle Bells',8], ['holiday','giftpile','🎁','Pile of Gifts',15],
  ['holiday','cookies','🍪','Cookies for Santa',8], ['holiday','snowflake','❄️','Giant Snowflake',10], ['holiday','hotcocoa','☕','Hot Cocoa',8],
  // holidays: blow-up yard decorations (they sway in the breeze)
  ['holiday','inf_santa','🎅','Blow-Up Santa',45], ['holiday','inf_snowman','⛄','Blow-Up Snowman',40], ['holiday','inf_reindeer','🦌','Blow-Up Reindeer',40],
  ['holiday','inf_pumpkin','🎃','Blow-Up Pumpkin',40], ['holiday','inf_ghost','👻','Blow-Up Ghost',40], ['holiday','inf_bunny','🐰','Blow-Up Bunny',40],
  ['holiday','inf_turkey','🦃','Blow-Up Turkey',40], ['holiday','inf_dino','🦖','Blow-Up Holiday Dino',50],
  // holidays: Halloween
  ['holiday','jackolantern','🎃','Jack-o\'-Lantern',10], ['holiday','ghost','👻','Ghost',15], ['holiday','witch','🧙','Witch',25],
  ['holiday','vampire','🧛','Vampire',25], ['holiday','zombie','🧟','Zombie',25], ['holiday','skeleton','💀','Skeleton',15],
  ['holiday','bats','🦇','Bats',10], ['holiday','web','🕸️','Spider Web',8], ['holiday','spider','🕷️','Spider',8],
  ['holiday','candy','🍬','Trick-or-Treat Candy',8], ['holiday','haunted','🏚️','Haunted House',45], ['holiday','broom','🧹','Witch\'s Broom',15],
  // holidays: Easter & spring
  ['holiday','easterbunny','🐰','Easter Bunny',25], ['holiday','easteregg','🥚','Easter Egg',5], ['holiday','chick','🐣','Baby Chick',10],
  ['holiday','eggbasket','🧺','Egg Basket',15],
  // holidays: Thanksgiving, Valentine's, St. Patrick's
  ['holiday','turkey','🦃','Turkey',20], ['holiday','pie','🥧','Pumpkin Pie',8], ['holiday','corn','🌽','Harvest Corn',8], ['holiday','leaves','🍂','Fall Leaves',5],
  ['holiday','valentine','💝','Valentine Heart',10], ['holiday','loveletter','💌','Love Letter',8], ['holiday','rose','🌹','Rose',8],
  ['holiday','clover','🍀','Lucky Clover',8], ['holiday','goldcoins','🪙','Pot of Gold Coins',20],
  // holidays: celebrations around the world
  ['holiday','fireworks','🎆','Fireworks',30], ['holiday','sparkler','🎇','Sparkler',15], ['holiday','popper','🎉','Party Popper',10],
  ['holiday','lantern','🏮','Paper Lantern',15], ['holiday','redenvelope','🧧','Red Envelope',10], ['holiday','menorah','🕎','Menorah',20],
  ['holiday','diya','🪔','Diya Lamp',15], ['holiday','candles','🕯️','Candles',8]
];

/* ---------- Town: original drawn buildings, shops, restaurants and vehicles ----------
   Each entry draws an SVG sized in em, so the world's Bigger/Smaller buttons still work. */
const TOWN_INK = '#1f2937';
const svgItem = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" style="width:${(w/60).toFixed(2)}em;height:${(h/60).toFixed(2)}em;display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const awning = (x, y, w, c1, c2) => { let s = ''; const n = Math.max(4, Math.round(w / 16)), sw = w / n; for (let i = 0; i < n; i++) s += `<path d="M${x+i*sw} ${y} h${sw} v14 q-${sw/2} 10 -${sw} 0z" fill="${i%2 ? c2 : c1}" stroke="${TOWN_INK}" stroke-width="2"/>`; return s; };
const winRow = (x, y, n, w, gap, col='#bae6fd') => Array.from({length:n}, (_, i) => `<rect x="${x+i*(w+gap)}" y="${y}" width="${w}" height="${w*1.1}" rx="3" fill="${col}" stroke="${TOWN_INK}" stroke-width="2"/><path d="M${x+i*(w+gap)+w/2} ${y} v${w*1.1}" stroke="#fff" stroke-width="1.5" opacity=".7"/>`).join('');
function shop(wall, a1, a2, sign, label, extra=''){
  return svgItem(150, 130, `<rect x="8" y="34" width="134" height="92" rx="4" fill="${wall}" stroke="${TOWN_INK}" stroke-width="3"/>
    <rect x="16" y="6" width="118" height="30" rx="8" fill="#fff" stroke="${TOWN_INK}" stroke-width="3"/><text x="75" y="27" text-anchor="middle" font-family="Lilita One,Fredoka,sans-serif" font-size="17" fill="${TOWN_INK}">${sign} ${label}</text>
    ${awning(10, 44, 130, a1, a2)}
    <rect x="18" y="68" width="62" height="40" rx="3" fill="#bae6fd" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M26 72 l12 30" stroke="#fff" stroke-width="3" opacity=".7"/>
    <rect x="92" y="66" width="38" height="60" rx="3" fill="${a1}" stroke="${TOWN_INK}" stroke-width="2.5"/><circle cx="122" cy="98" r="3" fill="#facc15"/>${extra}`);
}
const TOWN_SVG = {
  dreamhouse: svgItem(220, 190, `<rect x="20" y="70" width="180" height="116" rx="6" fill="#fbcfe8" stroke="${TOWN_INK}" stroke-width="3"/>
    <path d="M10 74 L110 14 L210 74z" fill="#ec4899" stroke="${TOWN_INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="110" cy="50" r="12" fill="#fff" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M104 50 l6 -6 l6 6 l-6 6z" fill="#f472b6"/>
    <rect x="20" y="120" width="180" height="6" fill="#f9a8d4"/>
    ${winRow(34, 84, 4, 26, 20, '#fdf2f8')}${winRow(34, 134, 1, 26, 0, '#fdf2f8')}${winRow(150, 134, 1, 26, 0, '#fdf2f8')}
    <path d="M94 186 v-38 a16 16 0 0 1 32 0 v38z" fill="#f472b6" stroke="${TOWN_INK}" stroke-width="2.5"/><circle cx="120" cy="168" r="2.5" fill="#fde047"/>
    <path d="M200 120 h16 v10 h-16" fill="#fff" stroke="${TOWN_INK}" stroke-width="2"/><path d="M216 130 q20 20 6 56" stroke="#f9a8d4" stroke-width="10" fill="none" stroke-linecap="round"/>
    <rect x="-30" y="166" width="70" height="20" rx="8" fill="#67e8f9" stroke="${TOWN_INK}" stroke-width="2.5"/>
    ${[40,70,150,180].map(x => `<path d="M${x} 186 q-6 -12 0 -18 q6 6 0 18z" fill="#f472b6"/>`).join('')}<path d="M100 74 q10 -8 20 0" stroke="#fde047" stroke-width="3" fill="none"/>`),
  herocar: svgItem(200, 80, `<path d="M6 56 q4 -18 30 -22 l40 -16 h44 l34 16 q30 4 40 22 l-4 10 h-180z" fill="#111827" stroke="#374151" stroke-width="3" stroke-linejoin="round"/>
    <path d="M150 34 l38 -26 l-4 30z M44 34 l-30 -20 l2 26z" fill="#111827" stroke="#374151" stroke-width="2.5"/>
    <path d="M82 22 h34 l22 14 h-72z" fill="#38bdf8" opacity=".85"/><path d="M16 50 h170" stroke="#facc15" stroke-width="3"/>
    <circle cx="44" cy="66" r="14" fill="#1f2937" stroke="#6b7280" stroke-width="4"/><circle cx="156" cy="66" r="14" fill="#1f2937" stroke="#6b7280" stroke-width="4"/><circle cx="44" cy="66" r="4" fill="#facc15"/><circle cx="156" cy="66" r="4" fill="#facc15"/>
    <path d="M186 50 h12 M-2 54 l-8 2" stroke="#fde047" stroke-width="4" stroke-linecap="round"/><path d="M0 48 q-14 2 -20 10 q12 -2 18 2" fill="#f97316" class="flame"/>`),
  pizza: shop('#fef3c7', '#dc2626', '#fff', '🍕', 'Pizza Place', `<circle cx="49" cy="88" r="14" fill="#fbbf24" stroke="#b45309" stroke-width="2"/><circle cx="44" cy="84" r="3" fill="#dc2626"/><circle cx="54" cy="90" r="3" fill="#dc2626"/>`),
  burger: shop('#e0f2fe', '#ef4444', '#facc15', '🍔', 'Burger Diner'),
  icecream: shop('#fce7f3', '#f9a8d4', '#fff', '🍦', 'Ice Cream'),
  bakery: shop('#fef9c3', '#a16207', '#fde68a', '🧁', 'Bakery'),
  sushi: shop('#fff7ed', '#111827', '#ef4444', '🍣', 'Sushi Bar'),
  noodles: shop('#fee2e2', '#dc2626', '#facc15', '🍜', 'Noodle House'),
  cafe: shop('#ecfccb', '#16a34a', '#fff', '☕', 'Café'),
  candy: shop('#fae8ff', '#c026d3', '#fff', '🍭', 'Candy Shop'),
  toystore: shop('#dbeafe', '#2563eb', '#facc15', '🧸', 'Toy Store'),
  bookstore: shop('#ede9fe', '#7c3aed', '#fff', '📚', 'Book Shop'),
  petshop: shop('#dcfce7', '#22c55e', '#fff', '🐾', 'Pet Shop'),
  flowers: shop('#fdf2f8', '#ec4899', '#86efac', '🌷', 'Flowers'),
  market: shop('#fef3c7', '#16a34a', '#fde68a', '🍎', 'Market'),
  arcade: shop('#1e1b4b', '#7c3aed', '#22d3ee', '🕹️', 'Arcade'),
  cinema: svgItem(170, 150, `<rect x="10" y="40" width="150" height="106" rx="4" fill="#7f1d1d" stroke="${TOWN_INK}" stroke-width="3"/><rect x="24" y="6" width="122" height="38" rx="6" fill="#111827" stroke="#facc15" stroke-width="3"/><text x="85" y="32" text-anchor="middle" font-family="Bangers,Lilita One,sans-serif" font-size="22" fill="#facc15" letter-spacing="2">CINEMA</text>${[30,50,70,90,110,130].map(x => `<circle cx="${x}" cy="44" r="3" fill="#fde047"/>`).join('')}<rect x="24" y="60" width="122" height="30" rx="3" fill="#fff" stroke="${TOWN_INK}" stroke-width="2"/><text x="85" y="81" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="14" fill="#7f1d1d">🍿 NOW SHOWING</text><path d="M62 146 v-36 h46 v36" fill="#fde68a" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M85 110 v36" stroke="${TOWN_INK}" stroke-width="2"/>`),
  townhall: svgItem(200, 180, `<path d="M20 64 L100 18 L180 64z" fill="#e2e8f0" stroke="${TOWN_INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="46" r="11" fill="#fff" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M100 40 v6 l4 3" stroke="${TOWN_INK}" stroke-width="2" fill="none"/>
    <rect x="22" y="64" width="156" height="10" fill="#cbd5e1" stroke="${TOWN_INK}" stroke-width="2.5"/>${[34,62,90,118,146].map(x => `<rect x="${x}" y="74" width="16" height="84" fill="#f8fafc" stroke="${TOWN_INK}" stroke-width="2"/>`).join('')}
    <rect x="14" y="158" width="172" height="10" fill="#cbd5e1" stroke="${TOWN_INK}" stroke-width="2.5"/><rect x="6" y="168" width="188" height="10" fill="#94a3b8" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M100 18 v-14 l18 6 l-18 6" fill="#ef4444" stroke="${TOWN_INK}" stroke-width="1.5"/>`),
  clocktower: svgItem(70, 210, `<rect x="14" y="60" width="42" height="146" fill="#d6b88a" stroke="${TOWN_INK}" stroke-width="3"/><path d="M8 62 L35 14 L62 62z" fill="#1e3a8a" stroke="${TOWN_INK}" stroke-width="3"/><circle cx="35" cy="86" r="16" fill="#fff" stroke="${TOWN_INK}" stroke-width="3"/><path d="M35 76 v10 l7 5" stroke="${TOWN_INK}" stroke-width="2.5" fill="none"/>${[120,150,180].map(y => `<rect x="27" y="${y}" width="16" height="18" rx="8" fill="#bae6fd" stroke="${TOWN_INK}" stroke-width="2"/>`).join('')}`),
  skyscraper: svgItem(90, 260, `<rect x="10" y="20" width="70" height="236" fill="#60a5fa" stroke="${TOWN_INK}" stroke-width="3"/>${Array.from({length:11}, (_, r) => winRow(18, 30 + r*20, 4, 10, 6, r % 3 ? '#e0f2fe' : '#fde68a')).join('')}<path d="M45 20 v-18" stroke="${TOWN_INK}" stroke-width="3"/><circle cx="45" cy="2" r="4" fill="#ef4444"/>`),
  apartments: svgItem(130, 190, `<rect x="8" y="16" width="114" height="170" fill="#fda4af" stroke="${TOWN_INK}" stroke-width="3"/><rect x="2" y="8" width="126" height="12" fill="#e11d48" stroke="${TOWN_INK}" stroke-width="2.5"/>${Array.from({length:5}, (_, r) => winRow(18, 30 + r*28, 4, 18, 8)).join('')}<rect x="50" y="160" width="30" height="26" fill="#7c2d12" stroke="${TOWN_INK}" stroke-width="2"/>`),
  firestation: shop('#fecaca', '#dc2626', '#fff', '🚒', 'Fire Station'),
  police: shop('#dbeafe', '#1e3a8a', '#fff', '🚓', 'Police'),
  hospital: shop('#f8fafc', '#ef4444', '#fff', '🏥', 'Hospital'),
  library: shop('#fef3c7', '#92400e', '#fde68a', '📖', 'Library'),
  lamp: svgItem(30, 130, `<rect x="13" y="20" width="5" height="106" fill="#334155"/><rect x="6" y="122" width="19" height="6" rx="2" fill="#334155"/><path d="M4 22 h22 l-4 -14 h-14z" fill="#334155"/><circle cx="15" cy="20" r="6" fill="#fde68a" class="sc-firefly"/>`),
  bench: svgItem(110, 56, `<rect x="6" y="10" width="98" height="10" rx="3" fill="#a16207" stroke="${TOWN_INK}" stroke-width="2"/><rect x="6" y="26" width="98" height="10" rx="3" fill="#a16207" stroke="${TOWN_INK}" stroke-width="2"/><path d="M14 36 v18 M96 36 v18" stroke="#334155" stroke-width="5"/>`),
  road: svgItem(240, 34, `<rect x="0" y="0" width="240" height="34" fill="#4b5563"/><path d="M0 17 h240" stroke="#facc15" stroke-width="4" stroke-dasharray="22 16"/><rect x="0" y="0" width="240" height="3" fill="#9ca3af"/><rect x="0" y="31" width="240" height="3" fill="#9ca3af"/>`),
  crosswalk: svgItem(120, 34, `<rect x="0" y="0" width="120" height="34" fill="#4b5563"/>${[6,26,46,66,86,106].map(x => `<rect x="${x}" y="3" width="10" height="28" fill="#f8fafc"/>`).join('')}`),
  stall: svgItem(110, 100, `${awning(4, 4, 102, '#f97316', '#fff')}<rect x="10" y="20" width="90" height="10" fill="#fff" stroke="${TOWN_INK}" stroke-width="2"/><path d="M14 30 v66 M96 30 v66" stroke="#7c4a24" stroke-width="5"/><rect x="8" y="60" width="94" height="36" fill="#a16207" stroke="${TOWN_INK}" stroke-width="2"/><text x="55" y="58" text-anchor="middle" font-size="22">🍉🍋🍓</text>`),
  planter: svgItem(90, 60, `<rect x="6" y="28" width="78" height="30" rx="4" fill="#a16207" stroke="${TOWN_INK}" stroke-width="2"/>${[16,30,44,58,72].map((x,i) => `<circle cx="${x}" cy="24" r="9" fill="${['#f472b6','#facc15','#a78bfa','#fb7185','#f97316'][i]}" stroke="${TOWN_INK}" stroke-width="1.5"/>`).join('')}`),
  tacotruck: svgItem(180, 110, `<rect x="6" y="20" width="120" height="70" rx="8" fill="#facc15" stroke="${TOWN_INK}" stroke-width="3"/><path d="M126 40 h28 l18 22 v28 h-46z" fill="#facc15" stroke="${TOWN_INK}" stroke-width="3"/><path d="M134 46 h18 l12 16 h-30z" fill="#bae6fd" stroke="${TOWN_INK}" stroke-width="2"/><rect x="20" y="32" width="80" height="30" rx="4" fill="#fff" stroke="${TOWN_INK}" stroke-width="2"/><text x="60" y="54" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="16" fill="#b91c1c">🌮 TACOS</text>${awning(16, 22, 92, '#ef4444', '#16a34a')}<circle cx="40" cy="92" r="12" fill="#1f2937" stroke="#6b7280" stroke-width="4"/><circle cx="146" cy="92" r="12" fill="#1f2937" stroke="#6b7280" stroke-width="4"/>`)
};

WORLD_ITEMS.push(
  ['dream','dreamhouse','🏩','Pink Dream Mansion',80], ['dream','herocar','🦇','Midnight Hero Car',70], ['dream','townhall','🏛️','Town Hall',50],
  ['dream','clocktower','🕰️','Clock Tower',35], ['dream','skyscraper','🏙️','Skyscraper',40], ['dream','apartments','🏢','Apartments',30], ['dream','cinema','🎬','Movie Theater',45],
  ['food','pizza','🍕','Pizza Place',30], ['food','burger','🍔','Burger Diner',30], ['food','icecream','🍦','Ice Cream Shop',25], ['food','bakery','🧁','Bakery',25],
  ['food','sushi','🍣','Sushi Bar',30], ['food','noodles','🍜','Noodle House',30], ['food','cafe','☕','Café',20], ['food','candy','🍭','Candy Shop',25], ['food','tacotruck','🌮','Taco Truck',25], ['food','stall','🍉','Fruit Stall',15],
  ['shops','toystore','🧸','Toy Store',30], ['shops','bookstore','📚','Book Shop',20], ['shops','petshop','🐾','Pet Shop',25], ['shops','flowers','🌷','Flower Shop',20],
  ['shops','market','🍎','Market',25], ['shops','arcade','🕹️','Arcade',35], ['shops','library','📖','Library',20], ['shops','firestation','🚒','Fire Station',30],
  ['shops','police','🚓','Police Station',30], ['shops','hospital','🏥','Hospital',30],
  ['street','road','🛣️','Road',5], ['street','crosswalk','🚸','Crosswalk',5], ['street','lamp','💡','Street Lamp',5], ['street','bench','🪑','Park Bench',5],
  ['street','planter','🌼','Flower Planter',5], ['street','trafficlight','🚦','Traffic Light',5], ['street','busstop','🚏','Bus Stop',8], ['street','bus','🚌','City Bus',25],
  ['street','taxi','🚕','Taxi',15], ['street','scooter2','🛵','Moped',10], ['street','statue','🗽','Town Statue',30]
);
const WORLD_BY_ID = Object.fromEntries(WORLD_ITEMS.map(i => [i[1], i]));

/* ---------- Legendary & Mythic world items ----------
   LEGENDARY: each unlocks with a real achievement, then still costs a lot of stars. Bought once, kept forever.
   MYTHIC: can't be bought. Only found in a Starfall Chest, which can drop after a great read (1 in 20,
   and guaranteed by the 20th great read without one). Both get a cinematic reveal and live effects in the world.
   fx: 'fly' circles the sky, 'float' bobs, 'spin' swirls, 'pulse' glows bigger. */
const LEGENDS = [
  { id:'lg_dragon',  e:'🐲', name:'Golden Sky Dragon',   price:250, req:'level6',  fx:'fly',   say:'A golden dragon soars over your world!' },
  { id:'lg_palace',  e:'🏯', name:'Crystal Palace',      price:220, req:'reads50', fx:'pulse', say:'A shining crystal palace rises from the ground!' },
  { id:'lg_unicorn', e:'🦄', name:'Rainbow Unicorn',     price:200, req:'streak7', fx:'float', say:'A rainbow unicorn gallops into your world!' },
  { id:'lg_phoenix', e:'🐦‍🔥', name:'Phoenix of Fire',     price:220, req:'perfect10', fx:'fly', say:'A phoenix bursts into flames and flies!' },
  { id:'lg_whale',   e:'🐋', name:'Sky Whale',           price:180, req:'stories25', fx:'fly', say:'A giant whale swims through the sky!' },
  { id:'lg_rocket',  e:'🚀', name:'Galaxy Rocket',       price:200, req:'badges12', fx:'pulse', say:'A galaxy rocket is ready for launch!' },
  { id:'lg_rainbow', e:'🌈', name:'Endless Rainbow',     price:180, req:'words20', fx:'pulse', say:'An endless rainbow lights up the sky!' },
  { id:'lg_trophy',  e:'🏆', name:'Hall of Fame Trophy', price:300, req:'top',     fx:'pulse', say:'The Hall of Fame Trophy! You reached the very top!' }
];
const MYTHICS = [
  { id:'my_portal', e:'🌀', name:'Galaxy Portal',        fx:'spin' },
  { id:'my_planet', e:'🪐', name:'Tiny Planet',          fx:'float' },
  { id:'my_star',   e:'🌠', name:'Wishing Star',         fx:'fly' },
  { id:'my_genie',  e:'🧞', name:'Wish Genie',           fx:'float' },
  { id:'my_island', e:'🏝️', name:'Floating Island',      fx:'float' },
  { id:'my_peacock',e:'🦚', name:'Rainbow Peacock',      fx:'pulse' }
];
LEGENDS.forEach(l => { const row = ['legendary', l.id, l.e, l.name, l.price]; WORLD_ITEMS.push(row); WORLD_BY_ID[l.id] = row; });
MYTHICS.forEach(m => { const row = ['mythic', m.id, m.e, m.name, 0]; WORLD_ITEMS.push(row); WORLD_BY_ID[m.id] = row; });
const LEGEND_FX = Object.fromEntries(LEGENDS.concat(MYTHICS).map(x => [x.id, x.fx]));
// requirement id -> [label, () => [have, need]]
function legendReq(req){
  const word = TK === 'daughter' ? 'Rank' : 'Level', top = T.levels.length;
  const perfect = () => normalSessions(K).filter(s => s.quiz && s.quiz.split('/')[0] === s.quiz.split('/')[1]).length;
  return {
    level6:    [`Reach ${word} 6`, () => [Math.min(K.level, 6), 6]],
    reads50:   ['Finish 50 readings', () => [Math.min(normalSessions(K).length, 50), 50]],
    streak7:   ['Reach your reading goal 7 days in a row', () => [Math.min(K.streak.count || 0, 7), 7]],
    perfect10: ['Get every question right on 10 stories', () => [Math.min(perfect(), 10), 10]],
    stories25: ['Finish 25 stories', () => [Math.min(normalSessions(K).filter(s => s.kind === 'story').length, 25), 25]],
    badges12:  ['Earn 12 badges', () => [Math.min(K.badges.length, 12), 12]],
    words20:   ['Master 20 tricky words', () => [Math.min(masteredWords(K).length, 20), 20]],
    top:       [`Reach the top ${word.toLowerCase()} (${top})`, () => [Math.min(K.level, top), top]]
  }[req];
}
const legendUnlocked = l => { const [have, need] = legendReq(l.req)[1](); return have >= need; };
const legendOwned = id => (K.legendOwned || []).includes(id) || (K.mythics || []).includes(id);

// Full-screen reveal with spinning light rays, the item zooming in, and a fanfare.
function epicReveal(item, tier, title, sub){
  return new Promise(res => {
    const ov = el('div',{class:'epic-overlay epic-' + tier},
      el('div',{class:'epic-rays'}),
      el('div',{class:'epic-card'},
        el('div',{class:'epic-tier'}, tier === 'mythic' ? '🌈 MYTHIC 🌈' : '✨ LEGENDARY ✨'),
        el('div',{class:'epic-item'}, item.e),
        el('h2',{class:'epic-title'}, title),
        el('p',{class:'epic-name'}, item.name),
        sub ? el('p',{class:'epic-sub'}, sub) : null,
        el('button',{class:'btn big', onclick:()=>{ ov.remove(); res(); }},'AMAZING! ▶')));
    document.body.append(ov);
    try { [523,659,784,1047,784,1047,1319].forEach((f, i) => setTimeout(() => { try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.3, actx.currentTime + .02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + .45);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .5); } catch(e){} }, i * 160)); } catch(e){}
    confetti(160); setTimeout(() => confetti(120), 900);
    say(`${tier === 'mythic' ? 'Mythic' : 'Legendary'}! ${item.name}! ${item.say || ''}`);
  });
}
// Called with the badges: shows the reveal the first time each legendary's achievement is reached.
async function checkLegends(){
  K.legendSeen = K.legendSeen || [];
  for (const l of LEGENDS){
    if (K.legendSeen.includes(l.id) || !legendUnlocked(l)) continue;
    K.legendSeen.push(l.id); save();
    await epicReveal(l, 'legendary', 'LEGENDARY UNLOCKED!', `${legendReq(l.req)[0]}: done! Find it in My World › ✨ Legendary for 💫 ${legendCosmic(l)} Cosmic Power.`);
  }
}
// After a great read: maybe a Starfall Chest with a random mythic inside.
const CHEST_ODDS = 20;
const CHEST_SVG = `<svg viewBox="0 0 120 100" width="200" height="167" aria-label="treasure chest">
  <ellipse cx="60" cy="94" rx="52" ry="6" fill="#000" opacity=".35"/>
  <rect x="10" y="44" width="100" height="48" rx="8" fill="#92400e" stroke="#451a03" stroke-width="5"/>
  <path d="M10 48 Q10 14 60 14 Q110 14 110 48Z" fill="#b45309" stroke="#451a03" stroke-width="5"/>
  <rect x="10" y="44" width="100" height="9" fill="#fbbf24" stroke="#78350f" stroke-width="2.5"/>
  <rect x="24" y="16" width="10" height="76" fill="#fbbf24" stroke="#78350f" stroke-width="2.5"/>
  <rect x="86" y="16" width="10" height="76" fill="#fbbf24" stroke="#78350f" stroke-width="2.5"/>
  <rect x="50" y="42" width="20" height="24" rx="4" fill="#fde68a" stroke="#78350f" stroke-width="3"/>
  <circle cx="60" cy="52" r="3.5" fill="#78350f"/><rect x="58.5" y="52" width="3" height="8" fill="#78350f"/>
  <g class="sparkle"><path d="M8 10 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill="#fde047"/><path d="M106 4 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 l6 -2.5z" fill="#f0abfc"/></g>
</svg>`;
async function maybeStarfallChest(){
  K.chestPity = (K.chestPity || 0) + 1;
  if (Math.random() >= 1 / CHEST_ODDS && K.chestPity < CHEST_ODDS){ save(); return; }
  K.chestPity = 0;
  const left = MYTHICS.filter(m => !(K.mythics || []).includes(m.id));
  await new Promise(res => {
    const ov = el('div',{class:'epic-overlay epic-mythic'}, el('div',{class:'epic-rays'}),
      el('div',{class:'epic-card'}, el('div',{class:'epic-tier'},'🌠 STARFALL CHEST 🌠'), el('div',{class:'chest-shake', html: CHEST_SVG}),
        el('h2',{class:'epic-title'},'A Starfall Chest fell from the sky!'), el('p',{class:'epic-sub'},'Super rare! Tap to open it.'),
        el('button',{class:'btn big', onclick:()=>{ ov.remove(); res(); }},'🗝️ Open it!')));
    document.body.append(ov); beep('level'); confetti(60); say('Whoa! A Starfall Chest fell from the sky!');
  });
  if (!left.length){ K.stars += 25; save(); await modal(el('div',{}, el('div',{class:'big-e'},'💰'), el('h2',{},'Chest full of stars!'), el('p',{},'You already found every mythic! +25 ⭐')), [['Yay! ▶','',1]]); return; }
  const m = pick(left);
  K.mythics = (K.mythics || []).concat(m.id); save();
  await epicReveal(m, 'mythic', 'MYTHIC FOUND!', 'Only found in Starfall Chests. Place it in My World › ✨ Legendary!');
}
const WORLD_CATS = { dream:'🏙️ Town', food:'🍕 Food', shops:'🛍️ Shops', street:'🚦 Streets', home:'🏠 Buildings', nature:'🌳 Nature', fun:'🎡 Fun', ride:'🚀 Rides', animal:'🦖 Animals', holiday:'🎉 Holidays', friends:'💛 My Friends' };
const WORLD_THEMES = {
  meadow:  { name:'Sunny Meadow', price:0,  sky:'linear-gradient(#7dd3fc,#e0f2fe)', ground:'linear-gradient(#86efac,#22c55e)' },
  beach:   { name:'Beach Day',    price:25, sky:'linear-gradient(#38bdf8,#bae6fd)', ground:'linear-gradient(#fde68a 0 45%,#38bdf8 45%)' },
  snow:    { name:'Snow Land',    price:25, sky:'linear-gradient(#a5b4fc,#e0e7ff)', ground:'linear-gradient(#f8fafc,#cbd5e1)' },
  night:   { name:'Night Sky',    price:30, sky:'radial-gradient(#fff 1px,transparent 1.5px) 0 0/40px 40px, linear-gradient(#0f172a,#312e81)', ground:'linear-gradient(#166534,#14532d)' },
  candy:   { name:'Candy Land',   price:40, sky:'linear-gradient(#fbcfe8,#fdf2f8)', ground:'repeating-linear-gradient(45deg,#f9a8d4 0 20px,#fff 20px 40px)' },
  space:   { name:'Outer Space',  price:40, sky:'radial-gradient(#fff 1.2px,transparent 1.7px) 0 0/34px 34px, linear-gradient(#020617,#1e1b4b)', ground:'radial-gradient(#94a3b8 10px,transparent 11px) 0 0/60px 40px, linear-gradient(#64748b,#334155)' },
  lava:    { name:'Volcano Island', price:40, sky:'linear-gradient(#7c2d12,#fb923c)', ground:'linear-gradient(#292524,#7f1d1d)' },
  // ---- new places (Nov 2) ----
  town:      { name:'Town Center',       price:30, sky:'linear-gradient(#60a5fa,#e0f2fe)', ground:'linear-gradient(#e7e5e4,#d6d3d1)' },
  sunset:    { name:'Sunset Beach',      price:30, sky:'linear-gradient(#f97316,#fde68a)' },
  tropic:    { name:'Tropical Island',   price:35, sky:'linear-gradient(#22d3ee,#a5f3fc)' },
  forest:    { name:'Enchanted Forest',  price:30, sky:'linear-gradient(#065f46,#a7f3d0)' },
  desert:    { name:'Desert Dunes',      price:30, sky:'linear-gradient(#fb923c,#fef3c7)' },
  waterpark: { name:'Splash Water Park', price:45, sky:'linear-gradient(#0ea5e9,#e0f2fe)' },
  jungle:    { name:'Jungle Falls',      price:40, sky:'linear-gradient(#15803d,#bbf7d0)' },
  under:     { name:'Under the Sea',     price:45, sky:'linear-gradient(#0c4a6e,#22d3ee)' },
  rainbow:   { name:'Rainbow Land',      price:40, sky:'linear-gradient(#f472b6,#a78bfa,#60a5fa)' },
  castle:    { name:'Castle Kingdom',    price:45, sky:'linear-gradient(#6366f1,#e0e7ff)' },
  dino:      { name:'Dino Valley',       price:40, sky:'linear-gradient(#ca8a04,#fef9c3)' },
  pirate:    { name:'Pirate Cove',       price:40, sky:'linear-gradient(#1e3a8a,#93c5fd)' },
  farm:      { name:'Autumn Farm',       price:30, sky:'linear-gradient(#f59e0b,#fef3c7)' },
  blossom:   { name:'Cherry Blossom Garden', price:35, sky:'linear-gradient(#f9a8d4,#fdf2f8)' },
  skycity:   { name:'Sky City',          cosmic:8,  sky:'linear-gradient(#3b82f6,#c7d2fe)' },
  clouds:    { name:'Cloud Kingdom',     cosmic:8,  sky:'linear-gradient(#a5b4fc,#fdf4ff)' },
  aurora:    { name:'Northern Lights',   cosmic:10, sky:'linear-gradient(#020617,#065f46,#7c3aed)' }
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
  town:     { sky:['#5aa9ff','#e3f2ff'], sun:'#fff7c2', far:'#a8bfdc', mid:'#8ea4c2', midHi:'#c1d0e4', cap:'#ffffff', hill:'#7cc96e', hill2:'#5aab55', tree:'#22a05a', tree2:'#15803d', water:['#7dd3fc','#0ea5e9'], sand:'#d6d3d1', grass:['#e7e5e4','#d6d3d1'], tuft:'#e7e5e4', trees:'round', noMtn:true, noDock:true, extra:'town' },
  sunset:   { sky:['#ff7a3d','#ffe3a3'], sun:'#ffefb0', far:'#c46b8e', mid:'#a35a7d', midHi:'#d892a6', cap:'#ffd1c4', hill:'#7fbf6a', hill2:'#5d9a52', tree:'#2f7a46', tree2:'#7c5a33', water:['#ff9f6b','#7c3aed'], sand:'#ffd39a', grass:['#ffd39a','#f2b66c'], tuft:'#d99a4b', trees:'palm', extra:'sunset' },
  tropic:   { sky:['#19c8f0','#e6fcff'], sun:'#fff7b0', far:'#9be3d6', mid:'#4fb38a', midHi:'#86d9b4', cap:'#4fb38a', hill:'#38b26b', hill2:'#249a57', tree:'#1f9a52', tree2:'#7c5a33', water:['#2df0e6','#0a8fd6'], sand:'#fff0b8', grass:['#fff0b8','#f6d987'], tuft:'#e2bd62', trees:'palm', extra:'tropic', noMtn:true },
  forest:   { sky:['#2d8f6f','#d4f7e6'], sun:'#fffbd1', far:'#4e9b7e', mid:'#2f6f57', midHi:'#4f9478', cap:'#2f6f57', hill:'#2e8b4f', hill2:'#1f6b3c', tree:'#166534', tree2:'#14532d', water:['#57d5c8','#1d8a87'], sand:'#a07a52', grass:['#4caf50','#2e7d32'], tuft:'#1b5e20', trees:'oak', dense:true, extra:'forest' },
  desert:   { sky:['#ff9e4a','#fff2cc'], sun:'#fff7c2', far:'#e8b37a', mid:'#d99a5e', midHi:'#f2c58e', cap:'#d99a5e', hill:'#f0c27e', hill2:'#e0a964', tree:'#3f8f4f', tree2:'#2d6b3a', water:['#3fd0e8','#1792c9'], sand:'#f4d08f', grass:['#f6d59a','#e7b86d'], tuft:'#c99247', trees:'cactus', extra:'desert' },
  waterpark:{ sky:['#1fb2f5','#e9f9ff'], sun:'#fffbd1', far:'#b9dcf2', mid:'#8fc3e6', midHi:'#c6e4f7', cap:'#ffffff', hill:'#7bd36b', hill2:'#5bb553', tree:'#2f9e54', tree2:'#7c5a33', water:['#53f2ff','#13a4ec'], sand:'#ffe9b0', grass:['#9be36b','#64c44a'], tuft:'#4ea338', trees:'palm', extra:'waterpark', noMtn:true },
  jungle:   { sky:['#2fa25c','#dcfce7'], sun:'#fffbd1', far:'#3c8f5a', mid:'#2b7448', midHi:'#3f9562', cap:'#2b7448', hill:'#1f8a3f', hill2:'#166a30', tree:'#15803d', tree2:'#065f46', water:['#5fe3d0','#0f8f84'], sand:'#a8865a', grass:['#3fbf5a','#238a3c'], tuft:'#14532d', trees:'jungle', dense:true, extra:'jungle' },
  under:    { sky:['#06395e','#2bb7dd'], sun:false, far:'#0b5577', mid:'#0a6a8f', midHi:'#2e8fb3', cap:'#0a6a8f', hill:'#e9cf8f', hill2:'#d4b574', tree:'#fb7185', tree2:'#f59e0b', water:['#1fa7cf','#0b6f99'], sand:'#f3dba0', grass:['#f3dba0','#e2c27e'], tuft:'#2fa36b', trees:'coral', noMtn:true, noDock:true, extra:'under' },
  rainbow:  { sky:['#ff9fd6','#bfe2ff'], sun:'#ffffff', far:'#d8b4fe', mid:'#c4b5fd', midHi:'#ede9fe', cap:'#ffffff', hill:'#86efac', hill2:'#4ade80', tree:'#f472b6', tree2:'#a78bfa', water:['#a5f3fc','#818cf8'], sand:'#fde68a', grass:['#bbf7d0','#86efac'], tuft:'#f9a8d4', trees:'round', extra:'rainbow' },
  castle:   { sky:['#6d7cf5','#eef0ff'], sun:'#fff7c2', far:'#a5b0e8', mid:'#8a95cf', midHi:'#c3cbf2', cap:'#ffffff', hill:'#5fbf5f', hill2:'#469f4a', tree:'#1f7a3d', tree2:'#14532d', water:['#60a5fa','#1d4ed8'], sand:'#c9b48a', grass:['#7fd36a','#4fae45'], tuft:'#3a8f33', trees:'pine', extra:'castle' },
  dino:     { sky:['#e2a33b','#fff7d6'], sun:'#fff3b0', far:'#b88a5a', mid:'#9b6f45', midHi:'#c4976a', cap:'#9b6f45', hill:'#8bbf4a', hill2:'#6a9e35', tree:'#3f7f2a', tree2:'#7c5a33', water:['#4fd1c5','#0f766e'], sand:'#c9a26b', grass:['#9ccc5a','#6b9e35'], tuft:'#4d7c25', trees:'fern', extra:'dino' },
  pirate:   { sky:['#2b4fa8','#bcd7ff'], sun:'#fff7c2', far:'#5b7bb8', mid:'#4a5f8a', midHi:'#7b8fb5', cap:'#4a5f8a', hill:'#5aa860', hill2:'#3f8a49', tree:'#1f7a3d', tree2:'#7c5a33', water:['#1f6fd1','#0b2e6b'], sand:'#efd7a0', grass:['#efd7a0','#d9b878'], tuft:'#b89350', trees:'palm', extra:'pirate' },
  farm:     { sky:['#f6a83b','#fff4d6'], sun:'#fff3b0', far:'#d7a46a', mid:'#b98049', midHi:'#dba673', cap:'#b98049', hill:'#d1b04a', hill2:'#b38f2e', tree:'#ea580c', tree2:'#b45309', water:['#7cc6e8','#2f7fb0'], sand:'#c79a5a', grass:['#c8b452','#9c8a2e'], tuft:'#7a6a22', trees:'autumn', extra:'farm', noMtn:true },
  blossom:  { sky:['#ffb3d9','#fff3fa'], sun:'#ffffff', far:'#e9b7d6', mid:'#cf9fc0', midHi:'#f1cfe3', cap:'#ffffff', hill:'#9ad98b', hill2:'#77c06a', tree:'#f9a8d4', tree2:'#ec4899', water:['#a5d8ff','#5b9bd5'], sand:'#f4e3c8', grass:['#b6e8a2','#8fcf7b'], tuft:'#f472b6', trees:'round', extra:'blossom' },
  skycity:  { sky:['#3d7bf2','#dfe6ff'], sun:'#ffffff', far:'#b8c6f5', mid:'#9fb0e8', midHi:'#dbe3ff', cap:'#ffffff', hill:'#ffffff', hill2:'#e6ebff', tree:'#7dd3fc', tree2:'#38bdf8', water:['#ffffff','#dbe4ff'], sand:'#ffffff', grass:['#ffffff','#e3e9ff'], tuft:'#c7d2fe', trees:'none', noMtn:true, noDock:true, extra:'skycity' },
  clouds:   { sky:['#9fb1ff','#fff5ff'], sun:'#fff7c2', far:'#ffffff', mid:'#f5f3ff', midHi:'#ffffff', cap:'#ffffff', hill:'#ffffff', hill2:'#f1eaff', tree:'#fde68a', tree2:'#f9a8d4', water:['#ffffff','#e9e3ff'], sand:'#ffffff', grass:['#ffffff','#efe8ff'], tuft:'#ddd6fe', trees:'none', noMtn:true, noDock:true, extra:'clouds' },
  aurora:   { sky:['#020617','#0b3b3a'], sun:'#e0f2fe', far:'#1e293b', mid:'#273449', midHi:'#3b4a63', cap:'#e2e8f0', hill:'#e2e8f0', hill2:'#cbd5e1', tree:'#1f4f43', tree2:'#163a31', water:['#1e3a5f','#0b1a33'], sand:'#cbd5e1', grass:['#f1f5f9','#cbd5e1'], tuft:'#94a3b8', trees:'snowpine', stars:true, extra:'aurora' },
  lava:  { sky:['#6f2410','#ff9a4d'], sun:'#ffe08a', far:'#4a2a1d', mid:'#5c3322', midHi:'#7a4a33', cap:'#ff7a3d', hill:'#45403f', hill2:'#36312f', tree:'#1f1a17', tree2:'#000000', water:['#ffb347','#e0321c'], sand:'#80766f', grass:['#4a4542','#2c2826'], tuft:'#1f1b19', trees:'dead' }
};
/* Place-specific scenery. SCENE_SKY draws behind the mountains; SCENE_EXTRA draws in front of the
   hills/trees but behind the lake and grass (the play area). Each gets (width, height, random, palette). */
const cloudPuff = (x, y, c, col='#fff') => `<g transform="translate(${x} ${y}) scale(${c})"><ellipse cx="0" cy="0" rx="60" ry="22" fill="${col}"/><ellipse cx="-30" cy="-10" rx="30" ry="22" fill="${col}"/><ellipse cx="22" cy="-18" rx="36" ry="28" fill="${col}"/></g>`;
const SCENE_SKY = {
  sunset: (W) => `<circle cx="${W/2}" cy="236" r="120" fill="#ffd166" opacity=".9"/><circle cx="${W/2}" cy="236" r="160" fill="#ff8a3d" opacity=".25"/>`,
  rainbow: (W) => ['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'].map((c, i) => `<path d="M${W/2 - 620 + i*22} 250 A${620 - i*22} ${210 - i*8} 0 0 1 ${W/2 + 620 - i*22} 250" fill="none" stroke="${c}" stroke-width="22" opacity=".85"/>`).join(''),
  aurora: (W, H, R) => [0,1,2].map(i => `<path class="sc-aurora" style="animation-delay:-${i*2}s" d="M0 ${70+i*28} C${W*.2} ${20+i*30} ${W*.4} ${130+i*20} ${W*.6} ${60+i*25} S${W} ${40+i*30} ${W} ${90+i*24}" fill="none" stroke="${['#34d399','#a78bfa','#22d3ee'][i]}" stroke-width="${28-i*6}" opacity=".45" stroke-linecap="round"/>`).join(''),
  skycity: (W, H, R) => { let s = ''; for (let i = 0; i < 7; i++) s += cloudPuff(R()*W, 200 + R()*60, 1.4 + R(), '#ffffff'); return s; },
  clouds: (W, H, R) => { let s = ''; for (let i = 0; i < 9; i++) s += cloudPuff(R()*W, 150 + R()*100, 1.3 + R()*1.2, i % 3 ? '#ffffff' : '#fdf4ff'); return s; },
  under: (W, H, R) => { let s = `<g opacity=".25">`; for (let i = 0; i < 8; i++) s += `<path d="M${R()*W} 0 L${R()*W} 260" stroke="#e0f2fe" stroke-width="${20+R()*40}"/>`; return s + `</g>`; }
};
const SCENE_EXTRA = {
  town: (W, H, R) => { let s = ''; let x = 0;
    while (x < W){ const w = 50 + R()*70, h = 70 + R()*130, c = ['#93c5fd','#a5b4fc','#fca5a5','#fde68a','#86efac','#c4b5fd','#f9a8d4'][Math.floor(R()*7)];
      s += `<rect x="${x}" y="${246-h}" width="${w}" height="${h}" fill="${c}" stroke="#475569" stroke-width="2" opacity=".75"/>`;
      for (let yy = 246-h+10; yy < 236; yy += 18) for (let xx = x+8; xx < x+w-10; xx += 16) s += `<rect x="${xx}" y="${yy}" width="8" height="10" fill="#fff" opacity=".6"/>`;
      x += w + 4 + R()*20; }
    return s + `<rect x="0" y="244" width="${W}" height="10" fill="#9ca3af"/>`; },
  sunset: (W, H, R) => { let s = ''; for (let i = 0; i < 4; i++) s += `<path d="M${200+i*380} 200 l12 -6 l12 6 M${230+i*380} 180 l9 -5 l9 5" stroke="#4a2545" stroke-width="3" fill="none"/>`; return s; },
  tropic: (W, H, R) => { let s = ''; [[300,1],[900,1.4],[1450,.9]].forEach(([x, k]) => { s += `<ellipse cx="${x}" cy="246" rx="${150*k}" ry="${40*k}" fill="#f6dc8f"/><ellipse cx="${x}" cy="240" rx="${120*k}" ry="${30*k}" fill="#3fbf6b"/>`; }); s += `<g transform="translate(1100 244)"><path d="M-40 0 L40 0 L30 12 L-30 12Z" fill="#8b5a2b"/><path d="M0 0 V-40" stroke="#5b3a1a" stroke-width="3"/><path d="M2 -38 L26 -8 L2 -8Z" fill="#fff"/></g>`; return s; },
  forest: (W, H, R) => { let s = ''; for (let i = 0; i < 14; i++){ const x = R()*W, y = 240 + R()*10; s += `<g transform="translate(${x} ${y})"><rect x="-3" y="-12" width="6" height="12" fill="#f8fafc"/><ellipse cx="0" cy="-14" rx="12" ry="8" fill="#ef4444"/><circle cx="-4" cy="-16" r="2" fill="#fff"/><circle cx="4" cy="-14" r="1.6" fill="#fff"/></g>`; } for (let i = 0; i < 24; i++) s += `<circle class="sc-firefly" style="animation-delay:-${(R()*4).toFixed(1)}s" cx="${R()*W}" cy="${120+R()*120}" r="2.5" fill="#fef08a"/>`; return s; },
  desert: (W, H, R) => `<path d="M260 246 L380 120 L500 246Z" fill="#e2b46c"/><path d="M380 120 L500 246 L400 246Z" fill="#c9954d"/><path d="M560 246 L640 160 L720 246Z" fill="#e2b46c"/><path d="M640 160 L720 246 L655 246Z" fill="#c9954d"/><g transform="translate(1300 246)"><ellipse cx="0" cy="0" rx="90" ry="12" fill="#2fb8d8"/><path d="M-50 0 Q-46 -40 -40 -70" stroke="#7c5a33" stroke-width="5" fill="none"/>${[-60,-20,20,60].map(a => `<path d="M-40 -70 q${Math.cos(a*Math.PI/180)*22} -8 ${Math.cos(a*Math.PI/180)*36} 12" stroke="#2f9e54" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('')}</g><g transform="translate(980 230)"><ellipse cx="0" cy="0" rx="26" ry="16" fill="#c08a4a"/><path d="M-10 -12 q4 -14 12 -2 M8 -14 q4 -12 12 0" fill="#c08a4a"/><path d="M20 -8 q14 -10 18 -24" stroke="#c08a4a" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-16 14 v14 M-4 14 v14 M8 14 v14 M18 14 v14" stroke="#a87438" stroke-width="5"/></g>`,
  waterpark: (W, H, R) => { const slide = (x, c, flip) => `<g transform="translate(${x} 0) scale(${flip ? -1 : 1} 1)"><rect x="-6" y="90" width="12" height="160" fill="#94a3b8"/><rect x="40" y="120" width="10" height="130" fill="#94a3b8"/><rect x="-24" y="80" width="56" height="14" rx="4" fill="#64748b"/><path d="M20 90 C120 100 20 150 110 170 S60 230 160 246" stroke="${c}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M20 90 C120 100 20 150 110 170 S60 230 160 246" stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="10 14" opacity=".7"/></g>`;
    return slide(180, '#f43f5e') + slide(700, '#facc15', true) + slide(1250, '#22c55e') + `<rect x="840" y="226" width="300" height="24" rx="12" fill="#5ee7ff" stroke="#fff" stroke-width="4"/><g class="sc-bob"><circle cx="900" cy="236" r="9" fill="none" stroke="#f97316" stroke-width="5"/><circle cx="1060" cy="238" r="9" fill="none" stroke="#a855f7" stroke-width="5"/></g>${[400,1550,1700].map(x => `<g transform="translate(${x} 246)"><path d="M0 0 V-60" stroke="#475569" stroke-width="3"/><path d="M-30 -56 Q0 -76 30 -56Z" fill="${['#f43f5e','#3b82f6','#facc15'][x%3]}"/></g>`).join('')}`; },
  jungle: (W, H, R) => `<path d="M780 40 Q760 120 800 246 L860 246 Q830 140 850 40Z" fill="#7dd3fc" opacity=".8"/><path d="M790 40 L795 246 M815 40 L822 246 M838 40 L845 246" stroke="#fff" stroke-width="3" opacity=".7" class="sc-shimmer"/><path d="M700 60 Q750 40 790 40 L850 40 Q910 40 940 60 L940 90 L700 90Z" fill="#57534e"/>${[1,2,3,4,5].map(i => `<path d="M${R()*W} 0 q${(R()-.5)*30} 80 ${(R()-.5)*20} ${120+R()*80}" stroke="#2f7a3a" stroke-width="4" fill="none"/>`).join('')}<g transform="translate(1350 150)"><circle cx="0" cy="0" r="12" fill="#7c4a24"/><circle cx="0" cy="3" r="7" fill="#d4a373"/><path d="M0 12 q20 20 0 40" stroke="#7c4a24" stroke-width="4" fill="none"/></g>`,
  under: (W, H, R) => { let s = ''; for (let i = 0; i < 26; i++){ const x = R()*W; s += `<path d="M${x} 250 q-8 -30 0 -60 q8 -30 0 -60" stroke="${R() < .5 ? '#16a34a' : '#22c55e'}" stroke-width="6" fill="none" class="sc-sway" style="animation-delay:-${(R()*3).toFixed(1)}s"/>`; }
    for (let i = 0; i < 10; i++){ const x = R()*W, y = 60 + R()*160, c = ['#fb923c','#facc15','#f472b6','#60a5fa'][i%4]; s += `<g class="sc-fish" style="animation-duration:${(20+R()*20).toFixed(0)}s;animation-delay:-${(R()*20).toFixed(0)}s"><g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="16" ry="9" fill="${c}"/><path d="M14 0 l12 -8 v16z" fill="${c}"/><circle cx="-8" cy="-2" r="2" fill="#000"/></g></g>`; }
    for (let i = 0; i < 30; i++) s += `<circle class="sc-bubble" style="animation-delay:-${(R()*6).toFixed(1)}s" cx="${R()*W}" cy="${100+R()*150}" r="${2+R()*5}" fill="none" stroke="#e0f2fe" stroke-width="1.5"/>`;
    return s + `<g transform="translate(1400 238)"><path d="M-40 10 L-30 -20 L30 -20 L40 10Z" fill="#a16207"/><rect x="-32" y="-34" width="64" height="16" rx="6" fill="#ca8a04"/><circle cx="0" cy="-26" r="4" fill="#fde047"/></g>`; },
  rainbow: (W, H, R) => { let s = ''; for (let i = 0; i < 8; i++) s += cloudPuff(R()*W, 200 + R()*40, .8, '#fff'); for (let i = 0; i < 20; i++) s += `<path class="sc-firefly" style="animation-delay:-${(R()*4).toFixed(1)}s" d="M${R()*W} ${40+R()*180} l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="#fde047"/>`; return s; },
  castle: (W) => { const x = W/2 - 160, t = (tx, h, c) => `<rect x="${tx}" y="${246-h}" width="44" height="${h}" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/><path d="M${tx-6} ${246-h} L${tx+22} ${246-h-40} L${tx+50} ${246-h}Z" fill="${c}"/><path d="M${tx+22} ${246-h-40} v-18" stroke="#334155" stroke-width="2"/><path d="M${tx+22} ${246-h-58} l16 6 l-16 6z" fill="#facc15"/>`;
    return `<rect x="${x+40}" y="146" width="240" height="100" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>${[0,1,2,3,4,5,6,7].map(i => `<rect x="${x+42+i*30}" y="134" width="16" height="14" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>`).join('')}<path d="M${x+130} 246 v-50 a30 30 0 0 1 60 0 v50z" fill="#7c4a24"/>` + t(x, 150, '#ef4444') + t(x+276, 150, '#ef4444') + t(x+138, 200, '#3b82f6') + `<path d="M${x-120} 246 h560" stroke="#60a5fa" stroke-width="8" opacity=".6"/>`; },
  dino: (W, H, R) => `<path d="M1200 246 L1300 110 L1340 120 L1420 246Z" fill="#6b4b33"/><path d="M1300 110 q10 -30 30 -60 q10 30 10 70" fill="#ef4444" opacity=".7" class="sc-firefly"/><g transform="translate(420 190)"><ellipse cx="0" cy="20" rx="60" ry="28" fill="#4d7c0f"/><path d="M40 6 Q90 -60 120 -70 q12 -4 12 8 q-6 10 -20 8 Q100 -30 60 14Z" fill="#4d7c0f"/><circle cx="122" cy="-64" r="2.5" fill="#000"/><path d="M-60 20 q-50 0 -80 -10" stroke="#4d7c0f" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M-30 44 v12 M-6 44 v12 M20 44 v12 M38 44 v12" stroke="#3f6212" stroke-width="10" stroke-linecap="round"/></g><g transform="translate(900 120) scale(.6)"><path d="M0 0 l40 -10 l20 10 l40 -30 l-20 30 l40 6 l-60 10 l-20 14z" fill="#7c2d12" opacity=".7"/></g><g transform="translate(1000 230)"><ellipse cx="0" cy="0" rx="18" ry="22" fill="#f5f5f4"/><path d="M-12 -6 l6 4 l6 -6 l6 6 l6 -4" stroke="#a8a29e" stroke-width="2" fill="none"/></g>`,
  pirate: (W) => `<g transform="translate(1250 230)"><path d="M-120 0 L120 0 L95 32 L-95 32Z" fill="#7c4a24"/><rect x="-120" y="-6" width="240" height="8" fill="#5b3418"/><path d="M-30 0 V-150 M50 0 V-120" stroke="#3f2a1d" stroke-width="6"/><path d="M-26 -140 Q20 -110 -26 -60Z" fill="#f8fafc"/><path d="M54 -112 Q90 -90 54 -50Z" fill="#f8fafc"/><path d="M-30 -150 h-30 v18 h30z" fill="#111827"/><circle cx="-45" cy="-141" r="4" fill="#fff"/></g><g transform="translate(300 246)"><path d="M-30 0 L-20 -26 L20 -26 L30 0Z" fill="#a16207"/><rect x="-24" y="-38" width="48" height="14" rx="5" fill="#ca8a04"/><circle cx="0" cy="-30" r="4" fill="#fde047"/><text x="40" y="-6" font-size="22">💰</text></g><text x="700" y="240" font-size="40">❌</text>`,
  farm: (W) => `<g transform="translate(300 246)"><rect x="-80" y="-90" width="160" height="90" fill="#b91c1c"/><path d="M-96 -88 L0 -150 L96 -88Z" fill="#7f1d1d"/><path d="M-30 0 v-60 h60 v60" fill="#fef3c7"/><path d="M-30 -60 L30 0 M30 -60 L-30 0" stroke="#b91c1c" stroke-width="5"/><rect x="-14" y="-125" width="28" height="22" fill="#fef3c7"/></g><g transform="translate(560 246)"><rect x="-24" y="-130" width="48" height="130" rx="22" fill="#94a3b8"/><path d="M-24 -110 a24 24 0 0 1 48 0" fill="#64748b"/></g>${[900,1040,1180,1320,1460,1600].map((x,i) => `<g transform="translate(${x} 240)"><circle cx="0" cy="0" r="${12+i%3*4}" fill="#f97316"/><path d="M0 -${12+i%3*4} v-8" stroke="#166534" stroke-width="4"/></g>`).join('')}<g transform="translate(760 240)"><path d="M0 0 V-60 M-26 -44 H26" stroke="#7c4a24" stroke-width="5"/><circle cx="0" cy="-66" r="10" fill="#fde68a"/><path d="M-10 -72 h20 l-4 -8 h-12z" fill="#a16207"/></g>`,
  blossom: (W, H, R) => { let s = `<g transform="translate(${W/2} 246)"><path d="M-140 0 Q0 -90 140 0" stroke="#dc2626" stroke-width="12" fill="none"/><path d="M-110 -24 V0 M110 -24 V0" stroke="#dc2626" stroke-width="10"/></g><g transform="translate(1400 246)"><rect x="-40" y="-60" width="80" height="60" fill="#fef3c7"/><path d="M-60 -60 L0 -100 L60 -60Z" fill="#b91c1c"/><path d="M-50 -82 L0 -112 L50 -82" stroke="#b91c1c" stroke-width="8" fill="none"/></g>`;
    for (let i = 0; i < 40; i++) s += `<ellipse class="sc-petal" style="animation-delay:-${(R()*8).toFixed(1)}s;animation-duration:${(6+R()*6).toFixed(1)}s" cx="${R()*W}" cy="${R()*60}" rx="4" ry="2.5" fill="#f9a8d4"/>`; return s; },
  skycity: (W, H, R) => { let s = ''; const tower = (x, h, c, w=60) => `<rect x="${x}" y="${246-h}" width="${w}" height="${h}" rx="6" fill="${c}"/>${Array.from({length:Math.floor(h/24)}, (_, j) => `<rect x="${x+10}" y="${256-h+j*24}" width="${w-20}" height="8" rx="3" fill="#e0f2fe" opacity=".8"/>`).join('')}`;
    [[120,150,'#6366f1'],[200,210,'#0ea5e9',70],[290,120,'#a855f7'],[560,180,'#14b8a6'],[640,240,'#3b82f6',80],[740,140,'#6366f1'],[1080,200,'#0ea5e9'],[1160,150,'#a855f7',70],[1500,230,'#3b82f6',80],[1600,160,'#14b8a6']].forEach(([x,h,c,w]) => s += tower(x,h,c,w));
    s += `<path d="M640 6 V0" stroke="#fff"/><circle cx="680" cy="0" r="0"/>`;
    for (let i = 0; i < 6; i++){ const x = R()*W, y = 60 + R()*100; s += `<g class="sc-fish" style="animation-duration:${(30+R()*30).toFixed(0)}s;animation-delay:-${(R()*30).toFixed(0)}s"><g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="22" ry="7" fill="#e2e8f0"/><ellipse cx="0" cy="-5" rx="9" ry="6" fill="#7dd3fc"/></g></g>`; }
    s += `<path d="M380 170 Q480 140 560 170" stroke="#e0e7ff" stroke-width="6" fill="none"/><path d="M820 160 Q950 120 1080 160" stroke="#e0e7ff" stroke-width="6" fill="none"/>`;
    for (let i = 0; i < 6; i++) s += cloudPuff(R()*W, 250, 1.6, '#ffffff'); return s; },
  clouds: (W, H, R) => { let s = ''; for (let i = 0; i < 10; i++) s += cloudPuff(R()*W, 250 + R()*10, 1.2 + R()*.8, '#ffffff'); s += `<g transform="translate(${W/2 - 400} 246)"><rect x="-90" y="-130" width="180" height="130" fill="#fdf4ff" stroke="#e9d5ff" stroke-width="3"/>${[-80,-40,0,40,80].map(x => `<rect x="${x-10}" y="-146" width="20" height="18" fill="#fdf4ff" stroke="#e9d5ff" stroke-width="3"/>`).join('')}<path d="M-120 -130 L-90 -190 L-60 -130Z M60 -130 L90 -190 L120 -130Z" fill="#fde68a"/><path d="M-20 0 v-50 a20 20 0 0 1 40 0 v50z" fill="#f9a8d4"/></g>`;
    for (let i = 0; i < 14; i++) s += `<path class="sc-firefly" style="animation-delay:-${(R()*4).toFixed(1)}s" d="M${R()*W} ${40+R()*140} l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="#fde68a"/>`; return s; },
  aurora: (W, H, R) => `<g transform="translate(420 246)"><path d="M-50 0 A50 40 0 0 1 50 0Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/><path d="M-30 -14 h60 M-40 -26 h80" stroke="#cbd5e1" stroke-width="2"/><path d="M-10 0 v-16 a10 10 0 0 1 20 0 v16" fill="#475569"/></g><g transform="translate(1300 240)"><ellipse cx="0" cy="0" rx="18" ry="20" fill="#f8fafc"/><circle cx="0" cy="-22" r="12" fill="#f8fafc"/><circle cx="-4" cy="-24" r="1.6"/><circle cx="4" cy="-24" r="1.6"/><path d="M-4 -18 l4 4 l4 -4" fill="#f97316"/></g>`
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
    if (P.trees === 'none') return '';
    if (P.trees === 'cactus') return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-50" width="12" height="50" rx="6" fill="${P.tree}"/><path d="M-6 -26 h-10 v-14" stroke="${P.tree}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M6 -32 h9 v-12" stroke="${P.tree}" stroke-width="9" fill="none" stroke-linecap="round"/><rect x="-2" y="-46" width="3" height="40" fill="${P.tree2}" opacity=".5"/></g>`;
    if (P.trees === 'oak' || P.trees === 'round' || P.trees === 'autumn'){ const c = R() < .5 ? P.tree : P.tree2;
      return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-22" width="8" height="24" fill="#7a4b2a"/><circle cx="0" cy="-40" r="22" fill="${c}"/><circle cx="-14" cy="-30" r="14" fill="${c}"/><circle cx="14" cy="-30" r="14" fill="${c}"/><circle cx="-6" cy="-48" r="8" fill="#fff" opacity=".18"/></g>`; }
    if (P.trees === 'jungle') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q-3 -34 1 -64" stroke="#6b4423" stroke-width="6" fill="none"/>${[-70,-35,0,35,70,110,145].map(a => `<path d="M1 -64 q${Math.cos(a*Math.PI/180)*22} ${-14+Math.sin(a*Math.PI/180)*8} ${Math.cos(a*Math.PI/180)*44} 10" stroke="${a%2?P.tree:P.tree2}" stroke-width="10" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
    if (P.trees === 'fern') return `<g transform="translate(${x} ${y}) scale(${s})">${[-50,-25,0,25,50].map(a => `<path d="M0 0 q${a*.4} -30 ${a*.9} -44" stroke="${P.tree}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
    if (P.trees === 'coral') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 V-30 M0 -16 L-12 -30 M0 -22 L10 -38 M-12 -30 V-40" stroke="${R() < .5 ? P.tree : P.tree2}" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
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
  if (P.sun) s += `<circle cx="1480" cy="78" r="90" fill="url(#sc-sun)"/><circle cx="1480" cy="78" r="30" fill="${P.sun}"/>`;
  if (P.extra && SCENE_SKY[P.extra]) s += SCENE_SKY[P.extra](W, H, R, P);
  // drifting clouds
  for (let i = 0; i < (P.sun === false ? 0 : 6); i++){ const x = R() * W, y = 30 + R() * 90, c = R() * .5 + .8;
    s += `<g class="sc-cloud" style="animation-duration:${(60 + R() * 60).toFixed(0)}s;animation-delay:-${(R() * 60).toFixed(0)}s" opacity="${P.stars ? .35 : .9}"><g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${c.toFixed(2)})"><ellipse cx="0" cy="0" rx="46" ry="18" fill="#fff"/><ellipse cx="-24" cy="-8" rx="24" ry="18" fill="#fff"/><ellipse cx="16" cy="-14" rx="28" ry="22" fill="#fff"/></g></g>`; }
  // far mountains, near mountains with highlights and caps
  if (!P.noMtn) s += `<path d="${ridge(232, 60, 140, 160)}" fill="${P.far}"/>`;
  const peaks = [];
  if (!P.noMtn) for (let x = 60; x < W; x += 260 + R() * 120) peaks.push([x, 110 + R() * 60, 120 + R() * 80]);
  peaks.forEach(([x, top, half]) => {
    s += `<path d="M${x - half} 250 L${x} ${top} L${x + half} 250Z" fill="${P.mid}"/><path d="M${x} ${top} L${x + half} 250 L${x + half * .2} 250Z" fill="${P.midHi}" opacity=".55"/>`;
    s += `<path d="M${x} ${top} L${x - half * .22} ${top + 30} L${x - half * .08} ${top + 24} L${x + half * .06} ${top + 34} L${x + half * .22} ${top + 30}Z" fill="${P.cap}" opacity=".95"/>`;
  });
  // hills with trees
  s += `<path d="${hills(238, 26)}" fill="${P.hill2}"/><path d="${hills(252, 18)}" fill="${P.hill}"/>`;
  for (let i = 0; i < (P.dense ? 90 : 46); i++){ const x = R() * W, y = 226 + R() * 30; s += tree(x.toFixed(0), y.toFixed(0), (.55 + R() * .5).toFixed(2)); }
  if (P.extra && SCENE_EXTRA[P.extra]) s += SCENE_EXTRA[P.extra](W, H, R, P);
  // lake with shimmer, a dock and a float ring
  s += `<rect x="0" y="246" width="${W}" height="32" fill="url(#sc-water)"/>`;
  for (let i = 0; i < 28; i++) s += `<rect class="sc-shimmer" style="animation-delay:-${(R() * 3).toFixed(1)}s" x="${(R() * W).toFixed(0)}" y="${(250 + R() * 24).toFixed(0)}" width="${(16 + R() * 34).toFixed(0)}" height="2.5" rx="1.5" fill="#fff" opacity=".7"/>`;
  if (!P.noDock) s += `<g transform="translate(250 252)"><rect x="0" y="0" width="120" height="9" fill="#a0693c"/><rect x="0" y="-4" width="120" height="5" fill="#c08350"/>${[6, 40, 74, 108].map(px => `<rect x="${px}" y="6" width="6" height="18" fill="#7a4b2a"/>`).join('')}</g>`;
  if (!P.noDock) s += `<g class="sc-bob"><circle cx="1180" cy="262" r="10" fill="none" stroke="#ff5a5a" stroke-width="6"/><circle cx="1180" cy="262" r="10" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="7 8"/></g>`;
  // sandy shore and grass
  let shore = `M0 274`; for (let x = 0; x <= W; x += 120) shore += ` Q${x + 60} ${266 + R() * 8} ${x + 120} 274`;
  s += `<path d="${shore} L${W} 296 L0 296Z" fill="${P.sand}"/>`;
  let edge = `M0 286`; for (let x = 0; x <= W; x += 90) edge += ` Q${x + 45} ${278 + R() * 10} ${x + 90} 286`;
  s += `<path d="${edge} L${W} ${H} L0 ${H}Z" fill="url(#sc-grass)"/>`;
  for (let i = 0; i < 160; i++){ const x = R() * W, y = 300 + R() * (H - 300); s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l-3 -9 M${x.toFixed(0)} ${y.toFixed(0)} l1 -11 M${x.toFixed(0)} ${y.toFixed(0)} l4 -8" stroke="${P.tuft}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`; }
  if (P.extra === 'town'){ for (let x = 0; x < W; x += 40) s += `<path d="M${x} 296 V${H}" stroke="#a8a29e" stroke-width="1.5" opacity=".6"/>`; for (let y = 310; y < H; y += 30) s += `<path d="M0 ${y} H${W}" stroke="#a8a29e" stroke-width="1.5" opacity=".6"/>`; }
  return s + '</svg>';
}
// tall grass along the front edge, drawn over everything so things look like they stand in it
function frontGrassSVG(themeId){
  const P = SCENE_PAL[themeId] || SCENE_PAL.meadow, R = seeded(99);
  if (P.extra === 'town') return `<svg xmlns="http://www.w3.org/2000/svg" width="${WORLD_W}" height="44" viewBox="0 0 ${WORLD_W} 44" preserveAspectRatio="none"><rect y="24" width="${WORLD_W}" height="20" fill="#9ca3af"/><rect y="22" width="${WORLD_W}" height="4" fill="#78716c"/></svg>`;
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
  const D = DB.kids[k], all = k === 'dev' ? TRACKS.son.rewards.concat(TRACKS.daughter.rewards) : TRACKS[k].rewards;
  return (D.collection || []).map(n => { const r = all.find(x => x[1] === n); return r ? ['friends','f_'+n, r[0], n, 0] : null; }).filter(Boolean);
}

let worldSel = null, worldCat = 'home';
function screenWorld(visitKid){
  const owner = visitKid || kid, readOnly = !!visitKid && visitKid !== kid;
  const W = worldOf(owner), theme = WORLD_THEMES[W.theme] || WORLD_THEMES.meadow;
  const otherKid = kid === 'son' ? 'daughter' : 'son', visitBoth = isDev();
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
    const n = el('div',{class:'world-item' + (worldSel === it.id ? ' sel' : '') + (TOWN_SVG[it.k] ? ' drawn' : ''), 'data-id':it.id}, TOWN_SVG[it.k] ? null : it.e);
    if (TOWN_SVG[it.k]) n.innerHTML = TOWN_SVG[it.k];
    n.style.left = it.x + 'px'; n.style.top = it.y + 'px';
    n.style.fontSize = Math.round(64 * it.s) + 'px';
    n.style.transform = it.f ? 'scaleX(-1)' : '';
    n.style.zIndex = it.z || 1;
    // animals and friends wander around a little, like pets
    const cat = (WORLD_BY_ID[it.k] || ['friends'])[0];
    if (cat === 'animal' || cat === 'friends'){ n.classList.add('wander'); n.style.setProperty('--wd', (6 + (it.id % 5)) + 's'); n.style.setProperty('--wdl', '-' + (it.id % 7) + 's'); }
    if (/^inf_/.test(it.k)){ n.classList.add('inflatable'); n.style.setProperty('--wdl', '-' + (it.id % 4) + 's'); } // blow-ups sway on their air base
    if (cat === 'legendary' || cat === 'mythic'){ n.classList.add(cat === 'mythic' ? 'mythic' : 'legend', 'fx-' + (LEGEND_FX[it.k] || 'pulse')); n.style.setProperty('--wdl', '-' + (it.id % 9) + 's'); }
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
      // removing gives back only half of what the item cost; legendary and mythic items go back to the vault instead
      const def = WORLD_BY_ID[it.k], vault = def && (def[0] === 'legendary' || def[0] === 'mythic');
      const price = def && !vault ? def[4] : 0, refund = Math.floor(price / 2);
      if (vault) say(`The ${def[3]} goes back to your Legendary Vault. You can put it out again any time.`);
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
  const bal = el('span',{class:'pill cosmic-mix', onclick:()=>cosmicInfo()}, '⭐ ' + balance() + '   💫 ' + cosmicBal());
  const palette = el('div',{class:'world-palette'});
  const catTabs = el('div',{class:'tabs shop-tabs'});
  const drawPalette = () => {
    catTabs.innerHTML = ''; palette.innerHTML = '';
    Object.entries(WORLD_CATS).forEach(([c, label]) => catTabs.append(el('button',{class:'tab' + (c===worldCat?' active':''), onclick:()=>{ worldCat = c; drawPalette(); }}, label)));
    catTabs.append(el('button',{class:'tab' + (worldCat==='theme'?' active':''), onclick:()=>{ worldCat = 'theme'; drawPalette(); }},'🎨 Places'));
    catTabs.append(el('button',{class:'tab legend-tab' + (worldCat==='legend'?' active':''), onclick:()=>{ worldCat = 'legend'; drawPalette(); }},'✨ Legendary'));
    if (worldCat === 'legend'){
      const inWorld = id => W.items.some(i => i.k === id);
      const putOut = (row) => {
        const sl = scroller.scrollLeft;
        const it = { id: W.nextId++, k:row[1], e:row[2], x: Math.round(sl + 300 + Math.random()*300), y: GROUND_Y - 150, s:1.8, f:false, z: W.items.length + 2 };
        W.items.push(it); worldSel = it.id; save(); place(it); refreshSel();
        const n = nodes[it.id]; if (n){ n.classList.add('summon'); setTimeout(() => n.classList.remove('summon'), 1600); }
        confetti(90); beep('level'); burst('WOW!'); drawPalette();
      };
      LEGENDS.forEach(l => {
        const row = WORLD_BY_ID[l.id], owned = legendOwned(l.id), open = owned || legendUnlocked(l), [label, prog] = legendReq(l.req), [have, need] = prog();
        palette.append(el('button',{class:'world-chip rar-legendary legend-chip' + (open ? '' : ' locked'), onclick: async () => {
          if (!open){ say(`${l.name} is locked. ${label}. You have ${have} of ${need}.`); return; }
          if (owned){ if (inWorld(l.id)) { say(`Your ${l.name} is already in your world!`); return; } putOut(row); return; }
          if (cosmicBal() < legendCosmic(l)){ say(`You need ${legendCosmic(l)} Cosmic Power for the ${l.name}. You have ${cosmicBal()}. Keep reading!`); beep('bad'); return; }
          K.cosmicSpent = (K.cosmicSpent||0) + legendCosmic(l); K.legendOwned = (K.legendOwned || []).concat(l.id); save(); bal.textContent = '⭐ ' + balance() + '   💫 ' + cosmicBal();
          await epicReveal(l, 'legendary', 'LEGENDARY SUMMONED!', 'It\'s yours forever. Watch it come alive in your world!');
          putOut(row); checkBadges(); }},
          el('span',{class:'chip-e' + (open ? '' : ' silhouette')}, l.e),
          el('span',{class:'chip-name'}, l.name),
          open ? el('span',{class:'chip-price' + (owned ? '' : ' cosmic')}, owned ? (inWorld(l.id) ? '✓ In world' : 'Place it') : '💫 ' + legendCosmic(l))
               : el('span',{class:'chip-req'}, `🔒 ${label} · ${have}/${need}`)));
      });
      MYTHICS.forEach(m => {
        const row = WORLD_BY_ID[m.id], owned = legendOwned(m.id);
        palette.append(el('button',{class:'world-chip rar-mythic legend-chip' + (owned ? '' : ' locked'), onclick:()=>{
          if (!owned){ say(`Mythic items are only found in Starfall Chests. Great reads can make one fall from the sky!`); return; }
          if (inWorld(m.id)){ say(`Your ${m.name} is already in your world!`); return; }
          putOut(row); }},
          el('span',{class:'chip-e' + (owned ? '' : ' silhouette')}, owned ? m.e : '❔'),
          el('span',{class:'chip-name'}, owned ? m.name : 'Mythic ???'),
          el('span',{class: owned ? 'chip-price' : 'chip-req'}, owned ? (inWorld(m.id) ? '✓ In world' : 'Place it') : `🌠 Starfall Chest only · ${K.chestPity || 0}/${CHEST_ODDS}`)));
      });
      return;
    }
    if (worldCat === 'theme'){
      Object.entries(WORLD_THEMES).forEach(([id, t]) => {
        const owned = W.themes.includes(id), on = W.theme === id;
        const cost = t.cosmic ? { cur:'cosmic', amt:t.cosmic } : { cur:'star', amt:t.price };
        palette.append(el('button',{class:'world-chip theme-chip' + (on?' on':'') + (t.cosmic && !owned ? ' cosmic-place' : ''), style:`background:${t.sky}`, onclick:()=>{
          if (!owned){ if (!canPay(cost)){ say(cost.cur === 'cosmic' ? `${t.name} costs ${cost.amt} Cosmic Power. Keep reading to collect more!` : 'Keep reading to earn more stars!'); beep('bad'); return; } pay(cost); W.themes.push(id); beep('level'); confetti(40); say(`Welcome to ${t.name}!`); }
          W.theme = id; save(); screenWorld(); }},
          el('span',{class:'chip-name'}, t.name), el('span',{class:'chip-price' + (cost.cur === 'cosmic' && !owned ? ' cosmic' : '')}, owned ? (on ? '✓ Here' : 'Go!') : costLabel(cost))));
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
        const it = { id: W.nextId++, k:id, e, x: Math.round(sl + 300 + Math.random()*300), y: GROUND_Y - 80 - Math.round(Math.random()*60), s: /^inf_/.test(id) ? 1.9 : cat==='home' ? 1.6 : cat==='ride' ? 1.2 : 1, f:false, z: W.items.length + 2 };
        W.items.push(it); worldSel = it.id; save(); place(it); refreshSel(); beep('star'); bal.textContent = '⭐ ' + balance() + '   💫 ' + cosmicBal();
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
               : el('div',{class:'row'}, bal, el('button',{class:'btn small blue', onclick:()=>{ worldSel = null; screenWorld(otherKid); }}, `👀 Visit ${kidName(otherKid)}`),
                 visitBoth ? el('button',{class:'btn small blue', onclick:()=>{ worldSel = null; screenWorld('daughter'); }}, `👀 Visit ${kidName('daughter')}`) : null)),
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
  // holidays
  xmastree: async c => { c.pop('🎄✨'); await c.pose('dancing', 2400); },
  santa: async c => { c.pop('🎅👋'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('jumping', 700)]); c.pop('🎁😄'); },
  mrsclaus: async c => { c.pop('🍪😋'); await c.pose('munch', 1800); },
  reindeer: async c => { c.pop('🦌❤️'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('waving', 1500)]); },
  sleigh: async c => { c.pop('🛷🎶'); await Promise.all([c.hide(3300), c.itemAct(c.it, 'act-fly', 3200)]); c.pop('🤩'); },
  snowman: async c => { c.pop('⛄'); await c.pose('waving', 1500); c.pop('❄️😄'); },
  giftpile: async c => { c.pop('🎁'); await c.itemAct(c.it, 'act-hop', 1500); c.pop('🎉'); await c.pose('dancing', 1800); },
  cookies: async c => { c.pop('🍪😋'); await c.pose('munch', 1800); },
  hotcocoa: async c => { c.pop('☕😋'); await c.pose('munch', 1800); },
  ghost: async c => { c.pop('😱'); await c.pose('jumping', 700); c.pop('😂'); await c.itemAct(c.it, 'act-float', 2400); },
  witch: async c => { c.pop('🧙✨'); await c.pose('waving', 1500); },
  vampire: async c => { c.pop('😱'); await c.pose('jumping', 700); c.pop('🧛😄'); },
  zombie: async c => { c.pop('🧟'); await Promise.all([c.itemAct(c.it, 'act-wiggle', 2400), c.pose('dancing', 2400)]); },
  skeleton: async c => { c.pop('💀🎶'); await c.pose('dancing', 2400); },
  jackolantern: async c => { c.pop('🎃😄'); await c.pose('jumping', 700); },
  haunted: async c => { c.pop('👻🚪'); await wsleep(700); c.pop('😱', 2600); await c.hide(2800); c.pop('😂'); },
  candy: async c => { c.pop('🍬😋'); await c.pose('munch', 1800); },
  broom: async c => { c.pop('🧹✨'); await Promise.all([c.hide(3300), c.itemAct(c.it, 'act-fly', 3200)]); c.pop('😄'); },
  easterbunny: async c => { c.pop('🐰❤️'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('jumping', 700)]); },
  easteregg: async c => { c.pop('🥚🔎'); await c.pose('bend', 1800); c.pop('🎉'); },
  eggbasket: async c => { c.pop('🧺🥚'); await c.pose('bend', 1800); },
  chick: async c => { c.pop('🐣❤️'); await c.itemAct(c.it, 'act-hop', 1500); },
  turkey: async c => { c.pop('🦃'); await Promise.all([c.itemAct(c.it, 'act-wiggle', 2400), c.pose('waving', 1500)]); },
  pie: async c => { c.pop('🥧😋'); await c.pose('munch', 1800); },
  fireworks: async c => { c.pop('🎆🤩'); await Promise.all([c.itemAct(c.it, 'act-burst', 2400), c.pose('jumping', 700)]); },
  sparkler: async c => { c.pop('🎇'); await c.pose('waving', 1500); },
  popper: async c => { c.pop('🎉'); await c.pose('jumping', 700); await c.pose('dancing', 1800); },
  menorah: async c => { c.pop('🕎✨', 2800); await c.pose('sitting', 3000); },
  diya: async c => { c.pop('🪔✨', 2800); await c.pose('sitting', 3000); },
  candles: async c => { c.pop('🕯️✨', 2800); await c.pose('sitting', 3000); },
  lantern: async c => { c.pop('🏮'); await c.itemAct(c.it, 'act-float', 2400); },
  '@holiday': async c => {
    if (/^inf_/.test(c.it.k)){ c.pop('😆'); await Promise.all([c.pose('jumping', 700), c.itemAct(c.it, 'act-wiggle', 2400)]); await c.pose('jumping', 700); return; } // bounce on the blow-ups
    c.pop(c.it.e + '😊'); await c.pose('dancing', 1800);
  },
  '@legendary': async c => { c.pop('🤩✨'); await Promise.all([c.itemAct(c.it, 'act-burst', 2400), c.pose('jumping', 700)]); await c.pose('jumping', 700); c.pop('💛'); },
  '@mythic': async c => { c.pop('😲🌈'); await Promise.all([c.itemAct(c.it, 'act-burst', 2400), c.pose('dancing', 2400)]); },
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
        el('button',{class:'btn small gray', onclick:()=>{ setPathStart(PHONICS_DEFAULT_START[TK]); screenPath(); }}, `Skip: start at lesson ${PHONICS_DEFAULT_START[TK]}`))));
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
    const pages = storyPages(L.text);
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
    if (TK === 'son') say(item.q);
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
  if (mastered && !(P.done[L.id] && P.done[L.id].mastered)) addCosmic(2, 'Lesson mastered!');
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
  const pages = storyPages(L.text);
  beginRun({ kind:'story', level:K.level, title:'🔁 Speed read: ' + L.title, pages }, { mode:'lesson', onStop:screenPath, onDone:async (res, a) => {
    trackWords(a);
    const P = pathState(), now = res.wcpm || 0;
    if (now) P.best[L.id] = Math.max(before, now);
    const beat = now > before;
    if (beat){ K.stars += 2; addCosmic(1, 'New speed record!'); confetti(70); beep('level'); say(`New record! ${now} words per minute!`); }
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
function ensureSkillStart(){ const P = pathState(); if (!P.placed) setPathStart(PHONICS_DEFAULT_START[TK]); skillsState(); }
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
    s.mastered = todayStr(); newly = true; addCosmic(3, 'New skill: ' + focus.lesson.title);
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

/* ================= BOSS BATTLES =================
   3 great reads unlock the level's boss instead of an automatic level-up.
   Beat the boss to rise a level:
     Miles (read aloud): 90%+ of words read right AND 80%+ questions right
     Gianna (quiet):     4 or 5 of 5 tough questions right
   Reading pages and right answers knock the boss's power bar down live. */
function bossFor(level){ return (BOSSES[TK] || {})[level] || null; }
function bossReady(){ return K.bossReady === K.level && !!bossFor(K.level); }
function bossCard(){
  const B = bossFor(K.level); if (!B) return null;
  const rec = (K.bossLog || {})[K.level] || { tries:0 };
  return el('div',{class:'card boss-card', style:`--boss:${B.color}`},
    el('div',{class:'boss-tag'}, K.level >= T.levels.length ? '👑 FINAL BOSS' : `⚔️ LEVEL ${K.level} BOSS`),
    el('div',{class:'boss-row'},
      el('div',{class:'boss-face'}, B.e),
      el('div',{class:'grow'},
        el('h2',{}, B.name), el('p',{class:'boss-taunt'}, `"${B.taunt}"`),
        el('div',{class:'hp'}, el('div',{class:'hp-fill', style:'width:100%'}), el('span',{}, 'BOSS POWER 100%')),
        el('p',{class:'muted', style:'color:#fff;opacity:.9'}, TK === 'daughter'
          ? 'Read the boss story, then get 4 or 5 tough questions right to win!'
          : 'Read the boss story out loud (90% of words right), then answer the questions to win!'),
        rec.tries ? el('p',{class:'muted', style:'color:#fde68a'}, `Battles tried: ${rec.tries}. You can do it!`) : null,
        el('button',{class:'btn big boss-btn', onclick:()=>{ beep('tap'); bossIntro(); }},'⚔️ BATTLE!'))));
}
function bossIntro(level){
  level = level || K.level;
  const B = bossFor(level);
  const ov = el('div',{class:'boss-intro', style:`--boss:${B.color}`},
    el('div',{class:'epic-rays'}),
    el('div',{class:'boss-intro-card'},
      el('div',{class:'boss-vs'}, K.hero ? heroNode(130) : el('div',{html: avatarSVG(K.avatar, 120)}), el('span',{class:'vs'},'VS'), el('div',{class:'boss-face big'}, B.e)),
      (K.bossesBeaten || []).includes(level) || level < K.level ? el('p',{style:'color:#fde68a;font-weight:700'}, `Rematch! Win to collect a missing ${(setForLevel(level) || {}).name || ''} gear piece.`) : null,
      el('h2',{}, B.name), el('p',{class:'boss-taunt'}, `"${B.taunt}"`),
      el('div',{class:'row center'},
        el('button',{class:'btn big boss-btn', onclick:()=>{ ov.remove(); startBossBattle(level); }},'⚔️ FIGHT WITH READING!'),
        el('button',{class:'btn small gray', onclick:()=>ov.remove()},'Not yet'))));
  document.body.append(ov); beep('level'); say(`${B.name} appears! ${B.taunt}`);
}
function startBossBattle(level){
  level = level || K.level;
  const B = bossFor(level);
  K.bossLog = K.bossLog || {}; const rec = K.bossLog[level] = Object.assign({ tries:0, wins:0 }, K.bossLog[level] || {});
  rec.tries++; save();
  const story = Object.assign({ series:'boss' }, B.story);
  if (TK === 'daughter'){
    startQuietRead(story, { storyKey:'boss_' + level, boss:B, level });
    run.opts.boss = B; bossHud();
  } else {
    const pages = storyPages(story.text);
    beginRun({ kind:'story', level, title:'⚔️ ' + story.title, emoji:B.e, story, storyKey:'boss_' + level, series:'boss', pages }, { mode:'normal', boss:B });
  }
}
// Boss power: Miles = 60% from reading + 40% from questions; Gianna = 100% from questions
function bossPower(){
  if (!run || !run.opts.boss) return 100;
  const a = run.act, quiz = run.quiz;
  const qFrac = quiz ? quiz.correct / quiz.qs.length : 0;
  if (a.quiet) return Math.max(0, Math.round(100 - 100 * qFrac));
  let tot = 0, ok = 0;
  a.pages.forEach(p => p.tokens.forEach((t,i) => { if (t.skip) return; tot++; if (p.status[i] === 'ok' && !p.helped[i]) ok++; }));
  return Math.max(0, Math.round(100 - 60 * (tot ? ok / tot : 0) - 40 * qFrac));
}
function bossHud(hit){
  if (!run || !run.opts.boss){ const h = $('.boss-hud'); if (h) h.remove(); return; }
  const B = run.opts.boss, pw = bossPower();
  let h = $('.boss-hud');
  if (!h){ h = el('div',{class:'boss-hud', style:`--boss:${B.color}`}, el('span',{class:'boss-face sm'}, B.e), el('div',{class:'grow'}, el('b',{}, B.name), el('div',{class:'hp'}, el('div',{class:'hp-fill'}), el('span',{})))); document.body.append(h); }
  h.querySelector('.hp-fill').style.width = pw + '%';
  h.querySelector('.hp span').textContent = `BOSS POWER ${pw}%`;
  if (hit){ const f = h.querySelector('.boss-face'); f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); }
}
async function bossResult(){
  const r = run, a = r.act, B = r.opts.boss, R = r.reading || computeReading();
  const quiz = r.quiz ? { c:r.quiz.correct, t:r.quiz.qs.length } : { c:0, t:1 };
  const won = a.quiet ? quiz.c >= 4 : (R.accuracy >= 0.9 && quiz.c / quiz.t >= 0.8);
  const hud = $('.boss-hud'); if (hud) hud.remove();
  addReadingTime(Math.min(Date.now() - r.startedAt, MAX_ACTIVITY_MS));
  if (!a.quiet) trackWords(a);
  K.sessions.unshift({ id:r.sessionId, date:new Date().toISOString(), level:a.level, title:'⚔️ Boss: ' + B.name, kind:'story', mode:'boss', series:'boss',
    total:R.total||0, correct:R.correct||0, helped:R.helped||0, accuracy: a.quiet ? Math.round(quiz.c / quiz.t * 1000)/10 : Math.round((R.accuracy||0)*1000)/10,
    wcpm:R.wcpm||null, quiz: quiz.c + '/' + quiz.t, missed:[...new Set(R.missed||[])].slice(0,20), stars: won ? 3 : 1, ms: Date.now() - r.startedAt });
  const rec = K.bossLog[a.level];
  const replay = a.level !== K.level || (K.bossesBeaten || []).includes(a.level);
  if (won && replay){
    rec.wins++; rec.date = todayStr();
    K.bossesBeaten = [...new Set((K.bossesBeaten || []).concat(a.level))];
    K.stars += 3; save();
    confetti(100); beep('level'); burst('K.O.!'); say(`You beat ${B.name} again!`);
    await modal(el('div',{}, el('div',{class:'big-e'}, B.e), el('h2',{}, `${B.name} defeated again!`), el('p',{}, `"${B.defeat}" +3 ⭐`)), [['🎁 Get my loot!','',1]]);
    await bossGearDrop(a.level, true);
    await checkBadges(); run = null; return screenQuestMap();
  }
  if (won){
    rec.wins++; rec.date = todayStr();
    K.bossesBeaten = [...new Set((K.bossesBeaten || []).concat(a.level))];
    K.bossReady = null; K.stars += 10;
    const top = K.level >= T.levels.length;
    if (!top){ K.level++; K.passStreak = 0; K.failStreak = 0; awardTrophiesUpTo(K.level); }
    save();
    addCosmic(5, `Defeated ${B.name}!`);
    const ov = el('div',{class:'boss-intro boss-win', style:`--boss:${B.color}`}, el('div',{class:'epic-rays'}),
      el('div',{class:'boss-intro-card'},
        el('div',{class:'boss-face big defeated'}, B.e),
        el('h2',{}, 'BOSS DEFEATED!'), el('p',{class:'boss-taunt'}, `"${B.defeat}"`),
        el('p',{style:'font-size:22px;font-weight:700'}, top ? '👑 You beat the FINAL BOSS! You are a reading legend!' : `${TK === 'daughter' ? 'Rank' : 'Level'} ${K.level} unlocked! +10 ⭐ +5 💫`),
        el('button',{class:'btn big', onclick:async()=>{ ov.remove(); await bossGearDrop(a.level, false); await checkBadges(); run = null; screenHome(); }},'🏆 Victory! Get my loot ▶')));
    document.body.append(ov); confetti(160); beep('level'); burst('K.O.!');
    say(`You defeated ${B.name}! ${B.defeat}`);
  } else {
    save();
    const pw = bossPower();
    const tip = a.quiet ? `You got ${quiz.c} of ${quiz.t}. You need 4 or 5 to win.`
      : `Words right: ${Math.round((R.accuracy||0)*100)}% (need 90%) · Questions: ${quiz.c} of ${quiz.t} (need ${Math.ceil(quiz.t*0.8)}).`;
    await modal(el('div',{}, el('div',{class:'big-e'}, B.e), el('h2',{}, `${B.name} is still standing!`),
      el('p',{}, `Boss power left: ${pw}%. ${tip}`), el('p',{}, 'Every battle makes you stronger. Try again anytime!')), [['💪 Back','',1]]);
    await checkBadges(); run = null; replay ? screenQuestMap() : screenHome();
  }
}

/* ================= REAL BOOKS: log the books they read on paper ================= */
const REAL_BOOK_IDEAS = {
  son: ['Nate the Great','Pete the Cat (I Can Read)','Elephant & Piggie','Frog and Toad Are Friends','Hi! Fly Guy','Danny and the Dinosaur','Go, Dog. Go!','Green Eggs and Ham','The Cat in the Hat','Bob Books'],
  daughter: ['Dragon Masters','The Baby-Sitters Club (graphic novel)','Frog and Toad Together','Henry and Mudge','Mercy Watson','Magic Tree House','Princess in Black','Owl Diaries','Elephant & Piggie','Fly Guy']
};
const BOOK_COVERS = ['📕','📗','📘','📙','🐉','🐱','🦖','🦄','🚀','🕵️','🏰','🌈'];
function realBooks(){ K.realBooks = K.realBooks || []; return K.realBooks; }
function screenRealBooks(){
  stopAll();
  const list = realBooks();
  const shelf = el('div',{class:'real-shelf'}, ...list.slice().reverse().map(b => el('div',{class:'real-book', title:b.title},
    el('span',{class:'rb-cover'}, b.cover), el('span',{class:'rb-title'}, b.title), el('span',{class:'rb-meta'}, '⭐'.repeat(b.rating||0) + ' · ' + b.date))));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'📚 My Real Books'), el('div')),
    el('div',{class:'card'},
      el('h2',{style:'margin-top:0'}, `${list.length} real book${list.length === 1 ? '' : 's'} read!`),
      el('p',{style:'font-size:19px'}, 'Finished a paper book? Add it to your shelf! Tell about it in your own words to earn +5 ⭐ and +2 💫.'),
      el('button',{class:'btn big', onclick:addRealBook},'➕ I finished a book!')),
    list.length ? el('div',{class:'card', style:'margin-top:16px'}, shelf) : null));
}
function addRealBook(){
  let cover = BOOK_COVERS[0], rating = 0;
  const title = el('input',{type:'text', class:'rb-input', placeholder:'Book title'});
  const ideas = el('div',{class:'rb-ideas'}, ...REAL_BOOK_IDEAS[TK].map(t => el('button',{class:'chip', onclick:()=>{ title.value = t; }}, t)));
  const covers = el('div',{class:'rb-covers'}, ...BOOK_COVERS.map(c => { const b = el('button',{class:'rb-cov' + (c === cover ? ' on' : ''), onclick:()=>{ cover = c; [...covers.children].forEach(x => x.classList.toggle('on', x === b)); }}, c); return b; }));
  const stars = el('div',{class:'rb-stars'}, ...[1,2,3,4,5].map(n => { const b = el('button',{onclick:()=>{ rating = n; [...stars.children].forEach((x,i) => x.textContent = i < n ? '⭐' : '☆'); }}, '☆'); return b; }));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:screenRealBooks},'← Back'), el('h1',{class:'title'},'➕ Add a Book'), el('div')),
    el('div',{class:'card'},
      el('h3',{style:'margin-top:0'},'1. What book did you read?'), title, el('p',{class:'muted'},'Ideas:'), ideas,
      el('h3',{},'2. Pick a cover'), covers,
      el('h3',{},'3. How much did you like it?'), stars,
      el('div',{class:'row', style:'margin-top:16px'},
        el('button',{class:'btn big', onclick:()=>{ if (!title.value.trim()){ say('Type the name of the book first!'); return; } retellBook({ title:title.value.trim(), cover, rating }); }},'▶ Next: tell about it')))));
}
// Retell: kid explains the book out loud; speech is captured (not scored word-by-word).
function retellBook(book){
  let words = [], listening = false, rec = null;
  const out = el('div',{class:'rb-heard'}, 'Tap the 🎤 and tell what happened in the book: who was in it, what happened, and how it ended.');
  const count = el('div',{class:'muted'});
  const need = TK === 'son' ? 12 : 25;
  const mic = el('button',{class:'mic', onclick:()=>{
    if (useManual()){ return; }
    if (listening){ try { rec.stop(); } catch(e){} return; }
    try { rec = new SR(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true; } catch(e){ return; }
    let finals = [];
    rec.onresult = ev => { let interim = []; for (let i = ev.resultIndex; i < ev.results.length; i++){ const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) finals.push(t); else interim.push(t); }
      const all = finals.concat(interim).join(' '); words = all.split(/\s+/).filter(Boolean); out.textContent = all; count.textContent = `${words.length} words · ${words.length >= need ? '✅ great retell!' : `say about ${need - words.length} more`}`; };
    rec.onend = () => { listening = false; mic.classList.remove('on'); mic.textContent = '🎤'; };
    rec.start(); listening = true; mic.classList.add('on'); mic.textContent = '⏹'; }}, '🎤');
  const finish = (approved) => {
    if (!approved && words.length < need){ say(`Tell me a little more about ${book.title}!`); return; }
    try { if (rec) rec.stop(); } catch(e){}
    realBooks().push({ title:book.title, cover:book.cover, rating:book.rating, date:todayStr(), retell: out.textContent.slice(0, 400) });
    K.stars += 5; save(); addCosmic(2, 'Real book: ' + book.title);
    confetti(90); beep('level'); say(`You added ${book.title} to your shelf! Great reading!`);
    checkBadges().then(screenRealBooks);
  };
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:screenRealBooks},'← Back'), el('h1',{class:'title'}, book.cover + ' ' + book.title), el('div')),
    el('div',{class:'card center'},
      el('h2',{style:'margin-top:0'},'Tell about the book!'),
      el('p',{style:'font-size:19px'},'Who was in it? What happened? How did it end? What was your favorite part?'),
      useManual() ? el('p',{class:'banner'},'Tell a grown-up about the book, then they tap ✓ below.') : mic,
      out, count,
      el('div',{class:'row center', style:'margin-top:14px'},
        useManual() ? null : el('button',{class:'btn big green', onclick:()=>finish(false)},'✅ Done telling'),
        el('button',{class:'btn small gray', onclick:()=>finish(true)},'✓ Grown-up heard it')))));
  say('Tell me about the book! Who was in it, and what happened?');
}

/* ================= HERO, GEAR SETS & QUEST MAP =================
   Each kid has a person hero (their own look) with their buddy as a companion.
   8 gear slots, 9 original tier sets (Traveler starter + one set per level).
   Loot: a great read at a level drops a random common piece of that level's set.
   Beating that level's boss drops the rare pieces (helmet + weapon).
   Beaten bosses can be re-battled on the Quest Map to collect missing pieces.
   ================================================================= */
const GEAR_SLOTS = ['helmet','shoulders','chest','gloves','belt','pants','boots','weapon'];
const SLOT_LABEL = { helmet:'Helmet', shoulders:'Shoulders', chest:'Chest Armor', gloves:'Gloves', belt:'Belt', pants:'Pants', boots:'Boots', weapon:'Weapon' };
const SLOT_ICON  = { helmet:'⛑️', shoulders:'🛡️', chest:'🦺', gloves:'🧤', belt:'🎗️', pants:'👖', boots:'🥾', weapon:'⚔️' };
const BOSS_PIECES = ['helmet','weapon'];
const COMMON_PIECES = GEAR_SLOTS.filter(s => !BOSS_PIECES.includes(s));
// tier = level that drops it. motif changes the shapes; colors: prim (main), sec, trim (metal), gem (glow)
const GEAR_SETS = [
  { id:'traveler', tier:0, name:'Traveler',        title:'Traveler',          motif:'cloth',   prim:'#8b5e3c', sec:'#c9a27a', trim:'#6b4a2e', gem:'#fde68a' },
  { id:'squire',   tier:1, name:'Oakwood Squire',  title:'Oakwood Squire',    motif:'leaf',    prim:'#6b8e3d', sec:'#a3c26a', trim:'#8b5e3c', gem:'#d9f99d' },
  { id:'ember',    tier:2, name:'Ember',           title:'Ember Knight',      motif:'flame',   prim:'#b91c1c', sec:'#f97316', trim:'#facc15', gem:'#fde047' },
  { id:'frost',    tier:3, name:'Frostguard',      title:'Frostguard',        motif:'crystal', prim:'#1e40af', sec:'#93c5fd', trim:'#e0f2fe', gem:'#a5f3fc' },
  { id:'jade',     tier:4, name:'Jade Guardian',   title:'Jade Guardian',     motif:'leaf',    prim:'#065f46', sec:'#34d399', trim:'#fbbf24', gem:'#6ee7b7' },
  { id:'storm',    tier:5, name:'Stormcaller',     title:'Stormcaller',       motif:'storm',   prim:'#4c1d95', sec:'#6366f1', trim:'#facc15', gem:'#fde047' },
  { id:'shadow',   tier:6, name:'Nightshade',      title:'Nightshade Ranger', motif:'shadow',  prim:'#1f1235', sec:'#7e22ce', trim:'#c084fc', gem:'#e879f9' },
  { id:'starforge',tier:7, name:'Starforged',      title:'Starforged Champion',motif:'star',   prim:'#1e3a8a', sec:'#312e81', trim:'#fbbf24', gem:'#fef08a' },
  { id:'celestial',tier:8, name:'Celestial',       title:'Celestial Legend',  motif:'wing',    prim:'#f8fafc', sec:'#fde68a', trim:'#f59e0b', gem:'#f0abfc' }
];
const ARCHMAGE = { id:'archmage', tier:9, name:'Archmage', title:'Archmage Supreme', motif:'wizard', prim:'#3b0764', sec:'#7c3aed', trim:'#fbbf24', gem:'#67e8f9' };
const SET_BY_ID = Object.fromEntries(GEAR_SETS.concat([ARCHMAGE]).map(g => [g.id, g]));
const armorySets = () => isDev() ? GEAR_SETS.concat([ARCHMAGE]) : GEAR_SETS;
const setForLevel = lv => GEAR_SETS.find(g => g.tier === lv);
const SKIN_TONES = ['#fde3c8','#f5c9a0','#e0a878','#c68a5a','#9a6440','#6b4428'];
const HAIR_COLORS = ['#1f1b18','#5b3a21','#a0612f','#e7c46a','#b5462a','#f472b6','#60a5fa','#a78bfa','#f1f5f9'];
const HAIR_STYLES = { short:'Short', spiky:'Spiky', long:'Long', ponytail:'Ponytail', curly:'Curly', buns:'Space Buns' };

function heroState(){
  K.hero = K.hero || null;
  K.gear = Object.assign({ owned:{ traveler: GEAR_SLOTS.slice() }, eq:{} }, K.gear || {});
  GEAR_SLOTS.forEach(s => { if (!K.gear.eq[s]) K.gear.eq[s] = 'traveler'; });
  return K.gear;
}
const hasPiece = (setId, slot) => (heroState().owned[setId] || []).includes(slot);
function givePiece(setId, slot){ const G = heroState(); G.owned[setId] = G.owned[setId] || []; if (!G.owned[setId].includes(slot)) G.owned[setId].push(slot); save(); }
function fullSetOn(){ const G = heroState(); const id = G.eq.helmet; return id && id !== 'traveler' && GEAR_SLOTS.every(s => G.eq[s] === id) ? SET_BY_ID[id] : null; }
function setCount(setId){ return (heroState().owned[setId] || []).length; }

/* ---------- hero drawing ---------- */
function spikes(cx, cy, n, len, spread, base, col, stroke){
  let s = '';
  for (let i = 0; i < n; i++){ const a = (base - spread/2 + spread * (n === 1 ? .5 : i/(n-1))) * Math.PI/180;
    const x2 = cx + Math.cos(a) * len, y2 = cy + Math.sin(a) * len, px = Math.cos(a + Math.PI/2) * 5, py = Math.sin(a + Math.PI/2) * 5;
    s += `<path d="M${cx+px} ${cy+py} L${x2} ${y2} L${cx-px} ${cy-py}Z" fill="${col}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/>`; }
  return s;
}
const flameShape = (x, y, k, c1, c2) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0 C-10 -8 -6 -20 0 -30 C2 -22 8 -20 6 -12 C10 -16 12 -22 10 -28 C18 -18 16 -4 0 0Z" fill="${c1}"/><path d="M2 -2 C-2 -8 0 -14 3 -18 C5 -12 8 -10 6 -4Z" fill="${c2}"/></g>`;
const starShape = (x, y, r, c) => `<path d="M${x} ${y-r} l${r*.3} ${r*.62} l${r*.68} ${r*.1} l-${r*.5} ${r*.48} l${r*.12} ${r*.68} l-${r*.6} -${r*.32} l-${r*.6} ${r*.32} l${r*.12} -${r*.68} l-${r*.5} -${r*.48} l${r*.68} -${r*.1}z" fill="${c}"/>`;
const INK = '#1f2937';

function gearPiece(slot, S, hero){
  const { prim, sec, trim, gem, motif } = S;
  const glow = S.tier >= 2 ? `filter="url(#hglow)"` : '';
  switch (slot){
    case 'pants': return `<rect x="72" y="160" width="27" height="52" rx="6" fill="${prim}" stroke="${INK}" stroke-width="3"/><rect x="101" y="160" width="27" height="52" rx="6" fill="${prim}" stroke="${INK}" stroke-width="3"/>
      ${S.tier ? `<rect x="76" y="176" width="19" height="14" rx="4" fill="${sec}" stroke="${trim}" stroke-width="2"/><rect x="105" y="176" width="19" height="14" rx="4" fill="${sec}" stroke="${trim}" stroke-width="2"/>` : ''}
      ${motif === 'flame' ? flameShape(85, 206, .5, sec, gem) + flameShape(114, 206, .5, sec, gem) : ''}${motif === 'star' ? starShape(85, 198, 5, trim) + starShape(114, 198, 5, trim) : ''}`;
    case 'boots': return `<path d="M70 204 h30 v22 q0 8 -8 8 h-30 q-6 0 -4 -7 l6 -5 z" fill="${S.tier ? sec : '#5b3a21'}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M100 204 h30 v22 q0 8 -8 8 h-18 q-6 0 -4 -7z" fill="${S.tier ? sec : '#5b3a21'}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${S.tier ? `<rect x="70" y="204" width="30" height="7" fill="${trim}" stroke="${INK}" stroke-width="2"/><rect x="100" y="204" width="30" height="7" fill="${trim}" stroke="${INK}" stroke-width="2"/>` : ''}
      ${motif === 'wing' ? `<path d="M70 210 q-14 -6 -16 -16 q10 4 16 6z M130 210 q14 -6 16 -16 q-10 4 -16 6z" fill="#fff" stroke="${trim}" stroke-width="1.5"/>` : ''}
      ${motif === 'crystal' ? spikes(70, 212, 2, 12, 40, 200, '#e0f2fe', '#60a5fa') + spikes(130, 212, 2, 12, 40, 340, '#e0f2fe', '#60a5fa') : ''}${motif === 'flame' ? flameShape(68, 214, .45, '#f97316', '#fde047') + flameShape(132, 214, .45, '#f97316', '#fde047') : ''}`;
    case 'chest': if (motif === 'wizard') return `<path d="M68 104 q32 -10 64 0 l14 112 q-46 10 -92 0z" fill="${prim}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M100 100 v114" stroke="${trim}" stroke-width="4"/><path d="M56 208 q44 10 88 0" stroke="${trim}" stroke-width="4" fill="none"/>
        ${starShape(80, 150, 6, trim)}${starShape(122, 176, 5, gem)}${starShape(76, 192, 4, gem)}${starShape(124, 132, 4, trim)}<path d="M84 130 a6 6 0 1 0 7 -7 a5 5 0 1 1 -7 7z" fill="${trim}"/>
        <circle cx="100" cy="120" r="7" fill="${gem}" stroke="${trim}" stroke-width="2.5" ${glow}/>`;
      return `<path d="M68 104 q32 -10 64 0 l4 56 h-72z" fill="${prim}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${S.tier ? `<path d="M80 108 q20 -6 40 0 l-2 34 q-18 10 -36 0z" fill="${sec}" stroke="${trim}" stroke-width="3"/><path d="M100 108 v42" stroke="${trim}" stroke-width="2"/>` : `<path d="M90 104 l10 14 l10 -14" stroke="${S.sec}" stroke-width="3" fill="none"/>`}
      ${S.tier >= 2 ? `<circle cx="100" cy="126" r="7" fill="${gem}" stroke="${trim}" stroke-width="2.5" ${glow}/>` : ''}
      ${motif === 'flame' ? flameShape(100, 120, .55, '#f97316', gem) : ''}${motif === 'leaf' && S.tier ? `<path d="M100 132 q-10 -10 0 -20 q10 10 0 20z" fill="${trim}"/>` : ''}
      ${motif === 'storm' ? `<path d="M104 112 l-8 14 h7 l-5 12 l12 -16 h-7 l5 -10z" fill="${gem}" stroke="${INK}" stroke-width="1.2"/>` : ''}
      ${motif === 'star' ? starShape(100, 126, 9, trim) : ''}${motif === 'shadow' ? `<path d="M86 112 q14 26 28 0" stroke="${trim}" stroke-width="2.5" fill="none"/>` : ''}
      ${motif === 'wing' ? `<path d="M100 114 q-14 6 -18 18 q10 -4 18 -4 q8 0 18 4 q-4 -12 -18 -18z" fill="${trim}"/>` : ''}
      ${S.tier ? `<path d="M64 160 h72 l-4 16 h-64z" fill="${sec}" stroke="${INK}" stroke-width="2.5"/><path d="M76 160 v16 M88 160 v16 M100 160 v16 M112 160 v16 M124 160 v16" stroke="${trim}" stroke-width="1.5"/>` : ''}`;
    case 'belt': return `<rect x="66" y="152" width="68" height="11" rx="3" fill="${S.tier ? trim : '#5b3a21'}" stroke="${INK}" stroke-width="2.5"/><rect x="93" y="149" width="14" height="17" rx="3" fill="${S.tier ? gem : '#c9a27a'}" stroke="${INK}" stroke-width="2.5"/>`;
    case 'gloves': return [52, 148].map(x => `<circle cx="${x}" cy="160" r="9" fill="${S.tier ? sec : hero.skin}" stroke="${INK}" stroke-width="3"/>${S.tier ? `<rect x="${x-10}" y="146" width="20" height="9" rx="3" fill="${trim}" stroke="${INK}" stroke-width="2"/>` : ''}${motif === 'crystal' ? spikes(x, 148, 1, 10, 0, x < 100 ? 200 : 340, '#e0f2fe', '#60a5fa') : ''}`).join('');
    case 'shoulders': {
      if (!S.tier) return `<circle cx="66" cy="106" r="10" fill="${prim}" stroke="${INK}" stroke-width="3"/><circle cx="134" cy="106" r="10" fill="${prim}" stroke="${INK}" stroke-width="3"/>`;
      const big = 12 + Math.min(S.tier, 6) * 1.5;
      let s = '';
      [[66, -1], [134, 1]].forEach(([x, d]) => {
        const outA = d < 0 ? 200 : 340;
        if (motif === 'flame') s += flameShape(x + d*6, 96, .9, '#f97316', gem) + flameShape(x - d*4, 94, .7, '#ef4444', '#fde047');
        if (motif === 'crystal') s += spikes(x, 100, 3, big + 10, 80, d < 0 ? 230 : 310, '#e0f2fe', '#60a5fa');
        if (motif === 'storm') s += `<path d="M${x} 96 l${d*16} -20 l${-d*4} 12 l${d*14} -6 l${-d*18} 22z" fill="${gem}" stroke="${INK}" stroke-width="1.5"/>`;
        if (motif === 'shadow') s += `<path d="M${x} 98 q${d*24} -8 ${d*20} -34 q${-d*4} 18 ${-d*18} 30z" fill="${sec}" stroke="${INK}" stroke-width="2"/>`;
        if (motif === 'wing') s += `<path d="M${x} 100 q${d*30} -30 ${d*38} -6 q${-d*12} -2 ${-d*16} 6 q${-d*6} -6 ${-d*18} 4z" fill="#fff" stroke="${trim}" stroke-width="2"/>`;
        if (motif === 'leaf') s += `<path d="M${x} 100 q${d*18} -22 ${d*30} -10 q${-d*14} 16 ${-d*30} 10z" fill="${sec}" stroke="${INK}" stroke-width="1.5"/>`;
        s += `<ellipse cx="${x}" cy="106" rx="${big}" ry="${big*.8}" fill="${prim}" stroke="${INK}" stroke-width="3"/><path d="M${x-big*.8} 110 q${big*.8} -${big*.7} ${big*1.6} 0" stroke="${trim}" stroke-width="3" fill="none"/>`;
        if (S.tier >= 3) s += `<circle cx="${x}" cy="104" r="4" fill="${gem}" ${glow}/>`;
        if (motif === 'star') s += starShape(x, 104, 6, trim);
        void outA;
      });
      return s; }
    case 'helmet': {
      if (motif === 'wizard') return `<path d="M50 60 q50 -16 100 0 q-4 10 -50 10 q-46 0 -50 -10z" fill="${prim}" stroke="${INK}" stroke-width="3"/>
        <path d="M66 58 q14 -40 30 -58 q22 -24 46 -20 q-20 6 -26 22 q-8 26 -2 56z" fill="${prim}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M68 52 q26 8 50 0 l1 -9 q-26 8 -49 0z" fill="${trim}" stroke="${INK}" stroke-width="2"/>
        ${starShape(92, 30, 6, trim)}${starShape(110, 14, 4, gem)}<path d="M78 40 a5 5 0 1 0 6 -6 a4 4 0 1 1 -6 6z" fill="${trim}"/><circle cx="142" cy="-20" r="5" fill="${gem}" ${glow}/>`;
      if (!S.tier) return `<path d="M64 52 q36 -30 72 0 l-4 6 q-32 -18 -64 0z" fill="${prim}" stroke="${INK}" stroke-width="2.5"/><path d="M64 52 q36 -30 72 0" stroke="${S.sec}" stroke-width="3" fill="none"/>`;
      let s = '';
      if (motif === 'shadow') return `<path d="M58 70 q-2 -56 42 -58 q44 2 42 58 q-6 18 -10 30 q-2 -36 -32 -38 q-30 2 -32 38 q-6 -12 -10 -30z" fill="${prim}" stroke="${INK}" stroke-width="3"/><path d="M70 44 q30 -22 60 0" stroke="${trim}" stroke-width="2.5" fill="none"/><circle cx="100" cy="30" r="4" fill="${gem}" ${glow}/>`;
      if (motif === 'wing') s += `<path d="M66 50 q-30 -14 -34 -36 q16 4 26 18 q-4 -14 2 -24 q10 14 14 32z" fill="#fff" stroke="${trim}" stroke-width="2"/><path d="M134 50 q30 -14 34 -36 q-16 4 -26 18 q4 -14 -2 -24 q-10 14 -14 32z" fill="#fff" stroke="${trim}" stroke-width="2"/>`;
      if (motif === 'crystal') s += spikes(100, 30, 5, 22, 100, 270, '#e0f2fe', '#60a5fa');
      if (motif === 'flame') s += flameShape(100, 26, 1.1, '#f97316', gem) + flameShape(84, 32, .7, '#ef4444', '#fde047') + flameShape(116, 32, .7, '#ef4444', '#fde047');
      if (motif === 'storm') s += `<path d="M70 40 l-14 -26 l18 14z M130 40 l14 -26 l-18 14z" fill="${gem}" stroke="${INK}" stroke-width="1.5"/>`;
      if (motif === 'leaf') s += `<path d="M78 34 q-14 -22 -4 -30 q8 12 10 26z M122 34 q14 -22 4 -30 q-8 12 -10 26z" fill="${sec}" stroke="${INK}" stroke-width="1.5"/>`;
      if (motif === 'star') s += starShape(100, 18, 14, trim) + starShape(78, 30, 6, trim) + starShape(122, 30, 6, trim);
      s += `<path d="M62 66 q-2 -42 38 -44 q40 2 38 44 l-8 0 q-2 -26 -30 -28 q-28 2 -30 28z" fill="${prim}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M62 66 l-2 24 q6 4 10 0 l2 -24z M138 66 l2 24 q-6 4 -10 0 l-2 -24z" fill="${sec}" stroke="${INK}" stroke-width="2.5"/>
        <path d="M66 50 q34 -20 68 0" stroke="${trim}" stroke-width="3.5" fill="none"/>`;
      if (S.tier >= 2) s += `<path d="M94 38 h12 l-6 10z" fill="${gem}" stroke="${trim}" stroke-width="1.5" ${glow}/>`;
      return s; }
    case 'weapon': {
      if (hero.weapon === 'laser'){
        const c = S.tier ? S.gem : '#38bdf8', len = 100 + S.tier * 4;
        return `<path d="M160 146 L160 ${146-len}" stroke="${c}" stroke-width="22" stroke-linecap="round" opacity=".45"/><path d="M160 146 L160 ${146-len}" stroke="${c}" stroke-width="10" stroke-linecap="round"/><path d="M160 146 L160 ${146-len}" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
          <rect x="153" y="144" width="14" height="32" rx="4" fill="${S.tier ? S.trim : '#94a3b8'}" stroke="${INK}" stroke-width="2.5"/><rect x="153" y="152" width="14" height="4" fill="${INK}"/><rect x="153" y="162" width="14" height="4" fill="${INK}"/><circle cx="160" cy="148" r="2.5" fill="${c}"/>`;
      }
      if (motif === 'wizard' || hero.weapon === 'wizard'){
        return `<path d="M158 238 L160 50" stroke="#5b3a21" stroke-width="8" stroke-linecap="round"/><path d="M158 238 L160 50" stroke="#8b5e3c" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M160 58 q-18 -6 -16 -24 q4 12 16 14 q12 -2 16 -14 q2 18 -16 24z" fill="${trim}" stroke="${INK}" stroke-width="2"/>
          <circle cx="160" cy="30" r="16" fill="${gem}" opacity=".45" ${glow}/>${starShape(160, 30, 13, '#fff')}${starShape(160, 30, 8, gem)}
          <g class="hero-spark">${starShape(140, 14, 4, trim)}</g><g class="hero-spark" style="animation-delay:-.6s">${starShape(182, 40, 3.5, '#fff')}</g>`;
      }
      if ((hero.weapon || 'sword') === 'staff'){
        return `<path d="M158 238 L160 58" stroke="${S.tier ? trim : '#6b4a2e'}" stroke-width="7" stroke-linecap="round"/><path d="M158 238 L160 58" stroke="${S.tier ? sec : '#8b5e3c'}" stroke-width="3" stroke-linecap="round"/>
          ${motif === 'wing' ? `<path d="M160 52 q-26 -6 -30 -24 q14 6 30 14 q16 -8 30 -14 q-4 18 -30 24z" fill="#fff" stroke="${trim}" stroke-width="2"/>` : ''}
          ${motif === 'crystal' ? spikes(160, 46, 3, 18, 70, 270, '#e0f2fe', '#60a5fa') : ''}${motif === 'flame' ? flameShape(160, 44, 1, '#f97316', gem) : ''}
          <circle cx="160" cy="46" r="${S.tier ? 13 : 8}" fill="${S.tier ? gem : '#a3c26a'}" stroke="${INK}" stroke-width="3" ${S.tier >= 2 ? glow : ''}/><circle cx="156" cy="42" r="3.5" fill="#fff" opacity=".8"/>`;
      }
      const blade = S.tier ? (motif === 'shadow' ? '#a855f7' : motif === 'flame' ? '#fdba74' : motif === 'crystal' ? '#bae6fd' : motif === 'storm' ? '#c7d2fe' : motif === 'wing' ? '#fef9c3' : '#e2e8f0') : '#cbd5e1';
      const len = 92 + S.tier * 4;
      let s = '';
      if (S.tier >= 2) s += `<path d="M154 ${150-len} L166 ${150-len} L168 146 L152 146Z" fill="${gem}" opacity=".45"/>`;
      s += `<path d="M160 ${140-len} L168 ${150-len+12} L167 146 L153 146 L152 ${150-len+12}Z" fill="${blade}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M160 ${146-len} V142" stroke="#fff" stroke-width="2" opacity=".7"/>`;
      if (motif === 'flame') s += flameShape(150, 120, .6, '#f97316', gem) + flameShape(170, 96, .5, '#ef4444', gem);
      if (motif === 'storm') s += `<path d="M152 ${150-len*.6} l16 10 l-12 2 l14 12" stroke="${gem}" stroke-width="2.5" fill="none"/>`;
      s += `<rect x="140" y="144" width="40" height="8" rx="4" fill="${S.tier ? trim : '#6b4a2e'}" stroke="${INK}" stroke-width="2.5"/><rect x="155" y="150" width="10" height="22" rx="3" fill="${S.tier ? prim : '#5b3a21'}" stroke="${INK}" stroke-width="2.5"/><circle cx="160" cy="175" r="5" fill="${S.tier ? gem : '#c9a27a'}" stroke="${INK}" stroke-width="2"/>`;
      if (motif === 'wing') s += `<path d="M140 148 q-16 -14 -10 -26 q8 10 14 22z M180 148 q16 -14 10 -26 q-8 10 -14 22z" fill="#fff" stroke="${trim}" stroke-width="1.5"/>`;
      return s; }
  }
  return '';
}
function hairBack(h){
  const c = h.hairColor;
  if (h.hairStyle === 'long') return `<path d="M62 60 q-6 60 6 84 q32 10 64 0 q12 -24 6 -84z" fill="${c}" stroke="${INK}" stroke-width="3"/>`;
  if (h.hairStyle === 'ponytail') return `<path d="M128 44 q34 6 30 46 q-4 26 -16 36 q8 -30 -6 -50z" fill="${c}" stroke="${INK}" stroke-width="3"/>`;
  if (h.hairStyle === 'buns') return `<circle cx="66" cy="34" r="16" fill="${c}" stroke="${INK}" stroke-width="3"/><circle cx="134" cy="34" r="16" fill="${c}" stroke="${INK}" stroke-width="3"/>`;
  if (h.hairStyle === 'curly') return `<g fill="${c}" stroke="${INK}" stroke-width="3">${[[62,64],[60,86],[140,64],[140,86]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="13"/>`).join('')}</g>`;
  return '';
}
function hairFront(h){
  const c = h.hairColor;
  if (h.hairStyle === 'spiky') return `<path d="M64 60 l-2 -20 l12 6 l2 -20 l12 12 l10 -18 l8 18 l12 -14 l2 20 l14 -6 l-4 22 q-30 -20 -66 0z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  if (h.hairStyle === 'curly') return `<g fill="${c}" stroke="${INK}" stroke-width="3">${[[70,44],[86,34],[102,32],[118,36],[132,46],[78,54]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="12"/>`).join('')}</g>`;
  return `<path d="M64 64 q-4 -40 36 -40 q40 0 36 40 q-10 -18 -30 -20 q-2 10 -12 12 q4 -8 2 -12 q-20 4 -32 20z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
}
function heroSVG(size=200, override={}){
  const h = Object.assign({ skin:SKIN_TONES[1], hairColor:HAIR_COLORS[1], hairStyle:'short', weapon:'sword' }, K.hero || {}, override.hero || {});
  const G = heroState(), eq = Object.assign({}, G.eq, override.eq || {});
  const S = slot => SET_BY_ID[eq[slot]] || SET_BY_ID.traveler;
  const full = override.eq ? null : fullSetOn();
  const helmOn = S('helmet').tier > 0;
  let s = `<svg viewBox="0 0 200 250" width="${size}" height="${size*1.25}" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
  <defs><filter id="hglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="haura"><stop offset="0" stop-color="${full ? full.gem : '#fff'}" stop-opacity=".75"/><stop offset="1" stop-color="${full ? full.gem : '#fff'}" stop-opacity="0"/></radialGradient></defs>`;
  if (full) s += `<ellipse class="hero-aura" cx="100" cy="130" rx="96" ry="118" fill="url(#haura)"/>${[[30,60],[170,80],[24,170],[176,190],[60,20],[150,24]].map(([x,y],i) => `<g class="hero-spark" style="animation-delay:-${i*.4}s">${starShape(x, y, 6, full.gem)}</g>`).join('')}`;
  s += `<ellipse cx="100" cy="238" rx="56" ry="8" fill="#000" opacity=".18"/>`;
  if (!helmOn || h.hairStyle === 'long' || h.hairStyle === 'ponytail') s += hairBack(h);
  // arms (skin), then body pieces
  s += `<path d="M68 106 L52 158" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M68 106 L52 158" stroke="${S('chest').tier ? S('chest').sec : S('chest').prim}" stroke-width="10" stroke-linecap="round"/>
        <path d="M132 106 L148 158" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M132 106 L148 158" stroke="${S('chest').tier ? S('chest').sec : S('chest').prim}" stroke-width="10" stroke-linecap="round"/>`;
  s += gearPiece('pants', S('pants'), h) + gearPiece('boots', S('boots'), h) + gearPiece('chest', S('chest'), h) + gearPiece('belt', S('belt'), h);
  s += `<rect x="92" y="90" width="16" height="16" fill="${h.skin}" stroke="${INK}" stroke-width="3"/>`;
  s += gearPiece('shoulders', S('shoulders'), h);
  // head + face
  s += `<circle cx="100" cy="64" r="34" fill="${h.skin}" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="88" cy="68" rx="4.5" ry="6" fill="${INK}"/><ellipse cx="112" cy="68" rx="4.5" ry="6" fill="${INK}"/><circle cx="89.5" cy="66" r="1.7" fill="#fff"/><circle cx="113.5" cy="66" r="1.7" fill="#fff"/>
    <path d="M92 80 q8 7 16 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="80" cy="78" rx="6" ry="3.5" fill="#fb7185" opacity=".45"/><ellipse cx="120" cy="78" rx="6" ry="3.5" fill="#fb7185" opacity=".45"/>`;
  if (h.beard) s += `<path d="M70 70 q4 22 14 34 q8 26 16 34 q8 -8 16 -34 q10 -12 14 -34 q-6 14 -18 16 q-12 -6 -24 0 q-12 -2 -18 -16z" fill="${h.beardColor || '#f1f5f9'}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M90 86 q10 -5 20 0" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  s += helmOn ? gearPiece('helmet', S('helmet'), h) : hairFront(h) + (S('helmet').id === 'traveler' && override.showCap ? gearPiece('helmet', S('helmet'), h) : '');
  s += gearPiece('gloves', S('gloves'), h);
  s += gearPiece('weapon', S('weapon'), h);
  return s + '</svg>';
}
function profileHero(k){ const keep = K; K = DB.kids[k]; try { return heroNode(110); } finally { K = keep; } }
function heroNode(size=170, withBuddy=true){
  const wrap = el('div',{class:'hero-wrap'}, el('div',{class:'hero-main', html: heroSVG(size)}));
  if (withBuddy && K.avatar && K.avatar.base) wrap.append(el('div',{class:'hero-buddy', html: avatarSVG(K.avatar, Math.round(size*.42))}));
  const full = fullSetOn();
  if (full) wrap.append(el('div',{class:'hero-title', style:`--gem:${full.gem}`}, '✨ ' + full.title));
  return wrap;
}

/* ---------- hero creator ---------- */
function screenHeroCreate(after){
  const h = Object.assign({ skin:SKIN_TONES[1], hairColor:HAIR_COLORS[1], hairStyle: TK === 'daughter' ? 'long' : 'spiky', weapon:'sword' }, K.hero || {});
  const prev = el('div',{class:'hero-create-prev'});
  const draw = () => { prev.innerHTML = heroSVG(220, { hero:h }); };
  const row = (label, items, render, key) => el('div',{class:'hc-row'}, el('h3',{}, label),
    el('div',{class:'hc-opts'}, ...items.map(v => { const b = el('button',{class:'hc-opt' + (h[key] === v ? ' on' : ''), onclick:()=>{ h[key] = v; [...b.parentNode.children].forEach(x => x.classList.toggle('on', x === b)); draw(); beep('tap'); }}, render(v)); return b; })));
  draw();
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('div'), el('h1',{class:'title'}, `Make your hero, ${kidName()}!`), el('div')),
    el('div',{class:'hero-create'}, el('div',{class:'card center'}, prev, el('p',{class:'muted'}, 'Your buddy will be your companion on every quest!')),
      el('div',{class:'card grow'},
        row('Skin', SKIN_TONES, v => el('span',{class:'swatch', style:`background:${v}`}), 'skin'),
        row('Hair style', Object.keys(HAIR_STYLES), v => HAIR_STYLES[v], 'hairStyle'),
        row('Hair color', HAIR_COLORS, v => el('span',{class:'swatch', style:`background:${v}`}), 'hairColor'),
        row('Weapon', isDev() ? ['wizard','staff','sword','laser'] : ['sword','staff','laser'], v => ({ sword:'⚔️ Sword', staff:'🪄 Magic Staff', laser:'✨ Laser Sword', wizard:'🌟 Star Staff' })[v], 'weapon'),
        isDev() ? row('Beard', [true,false], v => v ? '🧔 Wizard beard' : '🙂 No beard', 'beard') : null,
        el('button',{class:'btn big', style:'margin-top:16px', onclick:()=>{ K.hero = h; heroState(); save(); confetti(70); beep('level'); say('Your hero is ready for adventure!'); (after || screenHome)(); }},'✅ This is me!')))));
}

/* ---------- loot ---------- */
function lootReveal(setId, slot, fromBoss){
  const S = SET_BY_ID[setId];
  return new Promise(res => {
    const ov = el('div',{class:'epic-overlay loot-overlay', style:`--gem:${S.gem}`}, el('div',{class:'epic-rays'}),
      el('div',{class:'epic-card'},
        el('div',{class:'epic-tier'}, fromBoss ? '🏆 BOSS LOOT 🏆' : '🎁 GEAR DROP 🎁'),
        el('div',{class:'loot-hero', html: heroSVG(190, { eq: Object.assign({}, heroState().eq, { [slot]: setId }) })}),
        el('h2',{class:'epic-title'}, `${S.name} ${SLOT_LABEL[slot]}!`),
        el('p',{class:'epic-sub'}, `${setCount(setId)} of 8 ${S.name} pieces · ${8 - setCount(setId) ? `${8 - setCount(setId)} more for the full set glow!` : 'FULL SET! Wear them all to glow!'}`),
        el('div',{class:'row center'},
          el('button',{class:'btn big', onclick:()=>{ heroState().eq[slot] = setId; save(); ov.remove(); res(); }},'⚔️ Equip it!'),
          el('button',{class:'btn small gray', onclick:()=>{ ov.remove(); res(); }},'Later'))));
    document.body.append(ov); confetti(fromBoss ? 120 : 60); beep('level');
    say(`You got the ${S.name} ${SLOT_LABEL[slot]}!`);
  });
}
// after a great read: a common piece from this level's set (or a lower conquered set once that one is done)
async function maybeGearDrop(){
  if (!K.hero) return;
  const tiers = [K.level].concat((K.bossesBeaten || []).slice().sort((a,b) => b - a));
  for (const lv of tiers){
    const S = setForLevel(lv); if (!S) continue;
    const missing = COMMON_PIECES.filter(p => !hasPiece(S.id, p));
    if (missing.length){ const p = pick(missing); givePiece(S.id, p); await lootReveal(S.id, p, false); return; }
  }
}
async function bossGearDrop(level, replay){
  if (!K.hero) return;
  const S = setForLevel(level); if (!S) return;
  const missing = (replay ? GEAR_SLOTS : BOSS_PIECES).filter(p => !hasPiece(S.id, p));
  const drops = replay ? missing.slice(0, 1) : missing;
  for (const p of drops){ givePiece(S.id, p); await lootReveal(S.id, p, true); }
  if (!drops.length) { K.stars += 5; save(); await modal(el('div',{}, el('div',{class:'big-e'},'💰'), el('h2',{},'Treasure!'), el('p',{}, `You already have the whole ${S.name} set. +5 ⭐`)), [['Yay! ▶','',1]]); }
  if (setCount(S.id) === 8 && !(K.setsDone || []).includes(S.id)){
    K.setsDone = (K.setsDone || []).concat(S.id); save(); addCosmic(3, `Full ${S.name} set!`);
  }
}

/* ---------- armory ---------- */
let armorySlot = 'chest';
function screenArmory(){
  stopAll();
  const G = heroState();
  const prev = el('div',{class:'armory-prev'}, heroNode(230));
  const grid = el('div',{class:'armory-grid'});
  armorySets().forEach(S => {
    const owned = hasPiece(S.id, armorySlot), on = G.eq[armorySlot] === S.id;
    const where = S.tier === 0 ? 'Starter gear' : BOSS_PIECES.includes(armorySlot) ? `Beat the Level ${S.tier} boss` : `Great reads at Level ${S.tier}`;
    grid.append(el('button',{class:'armory-item' + (owned ? '' : ' locked') + (on ? ' on' : ''), style:`--gem:${S.gem};--prim:${S.prim}`, onclick:()=>{
        if (!owned){ say(`${S.name} ${SLOT_LABEL[armorySlot]}. ${where} to get it!`); return; }
        G.eq[armorySlot] = S.id; save(); beep('tap'); screenArmory(); }},
      el('div',{class:'ai-pic', html: owned ? heroSVG(84, { eq: Object.assign({}, G.eq, { [armorySlot]: S.id }) }) : ''}, owned ? null : '🔒'),
      el('div',{class:'ai-name'}, S.name), el('div',{class:'ai-sub'}, owned ? (on ? '✓ Wearing' : 'Tap to wear') : where)));
  });
  const sets = el('div',{class:'set-list'}, ...armorySets().filter(S => S.tier).map(S => {
    const n = setCount(S.id);
    return el('div',{class:'set-row', style:`--gem:${S.gem};--prim:${S.prim}`},
      el('span',{class:'set-dot'}), el('b',{}, S.name), el('span',{class:'muted'}, `Level ${S.tier}`),
      el('div',{class:'set-bar'}, el('div',{style:`width:${n/8*100}%`})), el('span',{}, `${n}/8`),
      n === 8 ? el('button',{class:'btn small', onclick:()=>{ GEAR_SLOTS.forEach(s => G.eq[s] = S.id); save(); burst('SET!'); screenArmory(); }},'Wear set') : null);
  }));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🛡️ Armory'),
      el('button',{class:'btn small blue', onclick:()=>screenHeroCreate(screenArmory)},'✏️ Change look')),
    el('div',{class:'shop-layout'}, prev,
      el('div',{class:'grow'},
        el('div',{class:'tabs shop-tabs'}, ...GEAR_SLOTS.map(sl => el('button',{class:'tab' + (sl === armorySlot ? ' active' : ''), onclick:()=>{ armorySlot = sl; screenArmory(); }}, SLOT_ICON[sl] + ' ' + SLOT_LABEL[sl]))),
        grid,
        el('div',{class:'card', style:'margin-top:16px'}, el('h2',{style:'margin-top:0'},'Gear sets'),
          el('p',{class:'muted'},'Wear all 8 pieces of one set to unlock its glowing set bonus and title!'), sets)))));
}


/* ---------- Hall of Heroes: profile showcase ---------- */
function screenHeroHall(){
  stopAll();
  const other = kid === 'son' ? 'daughter' : 'son', O = DB.kids[other];
  const tile = (icon, n, label, on=true) => el('div',{class:'hh-tile' + (on ? '' : ' off'), title:label}, el('span',{class:'hh-ic'}, icon), n != null ? el('span',{class:'hh-n'}, n) : null);
  const buddies = Object.entries(AVATAR_BASES).filter(([,b]) => (isDev() || b.kid === TK)).map(([id,b]) => tile(b.emoji, null, b.name, K.avatar.owned.includes(id) || K.level >= AVATAR_UNLOCK_LEVEL));
  const bosses = T.levels.map((_, i) => { const B = bossFor(i+1); if (!B) return null; const r = (K.bossLog||{})[i+1]; return tile((K.bossesBeaten||[]).includes(i+1) ? B.e : '❔', r && r.wins ? r.wins : null, B.name, (K.bossesBeaten||[]).includes(i+1)); }).filter(Boolean);
  const sets = GEAR_SETS.filter(g => g.tier).map(g => el('div',{class:'hh-tile set' + (setCount(g.id) ? '' : ' off'), style:`--gem:${g.gem};--prim:${g.prim}`, title:g.name}, el('span',{class:'hh-gem'}), el('span',{class:'hh-n'}, setCount(g.id) + '/8')));
  const stage = el('div',{class:'hh-stage'},
    el('div',{class:'hh-spot main'}, heroNode(200), el('div',{class:'hh-name'}, kidName()), el('div',{class:'hh-sub'}, `${TK==='daughter'?'Rank':'Level'} ${K.level} · ${(fullSetOn() || {}).title || 'Adventurer'}`)));
  if (O && O.hero){ const keep = K; K = O; try { stage.append(el('div',{class:'hh-spot side'}, heroNode(130), el('div',{class:'hh-name small'}, kidName(other)))); } finally { K = keep; } }
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🏛️ Hall of Heroes'), el('button',{class:'btn small', onclick:screenArmory},'🛡️ Armory')),
    el('div',{class:'hh-panel'},
      el('div',{class:'hh-rows'},
        el('div',{class:'hh-box'}, el('h3',{},'Companions'), el('div',{class:'hh-row'}, ...buddies)),
        el('div',{class:'hh-box grow'}, el('h3',{},'Bosses Defeated'), el('div',{class:'hh-row'}, ...bosses)),
        el('div',{class:'hh-box grow'}, el('h3',{},'Gear Sets'), el('div',{class:'hh-row'}, ...sets))),
      stage,
      el('div',{class:'hh-stats'}, ...[['⭐', balance(), 'Stars'],['💫', cosmicBal(), 'Cosmic'],['🔥', K.streak.count||0, 'Day streak'],['📖', normalSessions(K).length, 'Stories'],['📚', (K.realBooks||[]).length, 'Real books'],['🎯', masteredWords(K).length, 'Words mastered'],['🎖️', K.badges.length, 'Badges']]
        .map(([e,n,l]) => el('div',{class:'hh-stat'}, el('b',{}, e + ' ' + n), el('span',{}, l)))))));
}
/* ---------- quest map ---------- */
const MAP_SPOTS = [[9,82],[25,60],[14,34],[34,18],[52,40],[46,72],[68,80],[88,46]];
function screenQuestMap(){
  stopAll();
  const map = el('div',{class:'quest-map'});
  let path = 'M' + MAP_SPOTS.map(([x,y]) => `${x*10} ${y*6}`).join(' L');
  map.innerHTML = `<svg viewBox="0 0 1000 600" preserveAspectRatio="none" class="qm-svg"><path d="${path}" stroke="#7c5a33" stroke-width="12" fill="none" stroke-dasharray="2 22" stroke-linecap="round"/></svg>`;
  for (let lv = 1; lv <= T.levels.length; lv++){
    const B = bossFor(lv), S = setForLevel(lv), [x, y] = MAP_SPOTS[lv-1] || [50,50];
    if (!B) continue;
    const beaten = (K.bossesBeaten || []).includes(lv), current = lv === K.level && !beaten, ready = current && bossReady();
    const state = beaten ? 'beaten' : current ? (ready ? 'ready' : 'current') : lv < K.level ? 'skipped' : 'locked';
    const node = el('button',{class:'qm-node ' + state, style:`left:${x}%;top:${y}%;--boss:${B.color};--gem:${S ? S.gem : '#fff'}`, onclick:()=>{
      if (state === 'locked'){ say(`${B.name} is far ahead. Keep reading to get there!`); return; }
      if (state === 'current'){ const left = Math.max(0, LEVEL_UP_STREAK - (K.passStreak || 0)); say(`${B.name} is sleeping. Read ${left} more great stor${left === 1 ? 'y' : 'ies'} to wake the boss!`); return; }
      bossIntro(lv); }},
      el('div',{class:'qm-face'}, state === 'locked' ? '❔' : B.e),
      el('div',{class:'qm-label'}, el('b',{}, state === 'locked' ? '???' : B.name), el('span',{}, `${S ? S.name : ''} set ${S ? setCount(S.id) : 0}/8`)),
      el('div',{class:'qm-badge'}, state === 'beaten' ? '✅ Re-battle for gear' : state === 'ready' ? '⚔️ BATTLE!' : state === 'current' ? '💤 Read to wake' : state === 'skipped' ? '⚔️ Battle for gear' : '🔒'));
    map.append(node);
  }
  const here = MAP_SPOTS[Math.min(K.level, T.levels.length) - 1];
  if (here) map.append(el('div',{class:'qm-you', style:`left:${here[0]}%;top:${here[1]}%`, html: heroSVG(70)}));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🗺️ Quest Map'),
      el('button',{class:'btn small', onclick:screenArmory},'🛡️ Armory')),
    el('p',{class:'subtitle'}, 'Great reads wake each boss and drop gear. Beat a boss for its helmet and weapon. Beaten bosses can be battled again for missing pieces!'),
    map));
}

/* ================= TOWN SQUARE (shared plaza) =================
   Both heroes live here. Tap the ground to walk, tap a building to go in, tap your brother or sister
   to wave or high-five. With cloud save on (the Claude link), each kid's spot and waves are shared
   live through the docs rq/plaza_son and rq/plaza_daughter. On the GitHub site this works on one iPad
   only, so a wave left for someone not in town waits as a note until they come back. */
const PZ_W = 1600, PZ_H = 1120, PZ_C = { x:800, y:620 };
const PZ_EMOTES = [['👋','Wave'],['✋','High five'],['💃','Dance'],['🎉','Cheer'],['❤️','Hug'],['😂','Silly']];
const PZ_BUILDINGS = [
  { id:'townhall', x:800, y:330, w:320, h:200, wall:'#f6ead3', roof:'#c2410c', trim:'#d9b26a', kind:'dome', icon:'🗺️', name:'Town Hall', sub:'Quest Map', go:() => screenQuestMap() },
  { id:'library',  x:330, y:400, w:230, h:160, wall:'#f3e3c7', roof:'#2f5fc4', trim:'#c9a46a', kind:'gable', icon:'📖', name:'Library', sub:'Read a story', go:() => screenHome() },
  { id:'shop',     x:1270, y:400, w:230, h:160, wall:'#f6e1e8', roof:'#9333ea', trim:'#d6a6c9', kind:'gable', icon:'🛍️', name:'Shop', sub:'Gear & treats', go:() => screenShop() },
  { id:'armory',   x:210, y:770, w:210, h:155, wall:'#e7ddd0', roof:'#7f1d1d', trim:'#a8a29e', kind:'gable', icon:'🛡️', name:'Armory', sub:'Your armor', go:() => screenArmory() },
  { id:'heroes',   x:1390, y:770, w:220, h:165, wall:'#f6ead3', roof:'#b45309', trim:'#d9b26a', kind:'dome', icon:'🏛️', name:'Hall of Heroes', sub:'See both heroes', go:() => screenHeroHall() },
  { id:'trophy',   x:520, y:1040, w:170, h:170, wall:'#efe6d6', roof:'#ca8a04', trim:'#d9b26a', kind:'tower', icon:'🏆', name:'Trophy Tower', sub:'Trophies', go:() => screenTrophies() },
  { id:'roost',    x:1080, y:1040, w:200, h:150, wall:'#e8f0e0', roof:'#15803d', trim:'#a3b18a', kind:'gable', icon:'🐾', name:'Pet Roost', sub:'Your collection', go:() => screenCollection() },
  { id:'portal',   x:800, y:1095, w:150, h:150, kind:'portal', icon:'🏗️', name:'My World', sub:'Build!', go:() => screenWorld() }
];
const PZ_NPCS = [
  { id:'owl',   e:'🦉', name:'Mayor Hoot',    x:1000, y:470 },
  { id:'baker', e:'🐰', name:'Baker Bun',     x:560,  y:560 },
  { id:'well',  e:'⛲', name:'Wishing Fountain', x:PZ_C.x, y:PZ_C.y, hidden:true }
];
const PZ_WORDS = {
  son: ['the','and','look','jump','play','said','come','here','little','where','funny','yellow','down','help','make','away'],
  daughter: ['because','through','friend','enormous','courage','whisper','mystery','discover','treasure','ancient','journey','brilliant','curious','dangerous','imagine','together']
};
const PZ_RIDDLES = {
  son: [['What rhymes with CAT?',['hat','dog','sun']], ['Which word starts like BALL?',['bat','cup','fish']], ['I am yellow and up in the sky. What am I?',['the sun','a fish','a shoe']],
        ['What rhymes with PIG?',['big','pan','top']], ['Which one is an animal?',['frog','rock','cup']], ['Which word has the short A sound, like apple?',['map','me','go']],
        ['What do you read?',['a book','a spoon','a sock']], ['What rhymes with RED?',['bed','cat','run']], ['Which word ends like DOG?',['log','dot','sun']], ['What do bees make?',['honey','milk','bread']]],
  daughter: [['I have keys but open no locks. What am I?',['a piano','a door','a car']], ['What has pages but is not a tree?',['a book','a leaf','a cloud']],
        ['Which word means very big?',['enormous','tiny','quiet']], ['What gets wetter the more it dries?',['a towel','the sun','a rock']],
        ['Which word is an action (a verb)?',['jump','blue','table']], ['What is the opposite of brave?',['scared','strong','happy']],
        ['I have a head and a tail but no body. What am I?',['a coin','a cat','a kite']], ['Which word means the same as quick?',['fast','slow','sleepy']],
        ['What can you catch but not throw?',['a cold','a ball','a fish']], ['Which word is a compound word?',['sunflower','happy','running']]]
};
const PZ = { pos:null, sub:false, beat:null, mine:null, timers:[] };
// everyone else who can show up in town: the other kid, plus the Wizard once he has visited
const pzOthers = () => ['daughter','son','dev'].filter(k => k !== kid && (k !== 'dev' || (DB.plaza && DB.plaza.dev)) && (k !== 'dev' || DB.kids.dev || DB.plaza.dev));
const pzDayIdx = () => Math.floor(Date.now() / 86400000);
function pzRec(k){ DB.plaza = DB.plaza || {}; return DB.plaza[k] || null; }
function pzOnline(r){ return !!(r && r.here && Date.now() - r.ts < 75000); }
function pzPush(extra = {}){
  DB.plaza = DB.plaza || {};
  const prev = DB.plaza[kid] || { sent:[] };
  const rec = Object.assign({}, prev, { x:PZ.pos.x, y:PZ.pos.y, here:true, name:kidName() }, extra, { ts:Date.now() });
  rec.sent = (rec.sent || []).slice(-8);
  DB.plaza[kid] = rec; K.plazaPos = { x:PZ.pos.x, y:PZ.pos.y }; save();
  if (CLOUD.on && CLOUD.db){ try { CLOUD.db.doc('rq/plaza_' + kid).set({ json:JSON.stringify(rec), ts:rec.ts }).catch(()=>{}); } catch(e){} }
}
function pzSubscribe(){
  if (PZ.sub || !CLOUD.on || !CLOUD.db) return;
  PZ.sub = true;
  ['son','daughter','dev'].forEach(k => {
    try {
      CLOUD.db.doc('rq/plaza_' + k).onSnapshot(snap => {
        const d = snap.exists ? snap.data() : null; if (!d || typeof d.json !== 'string') return;
        let r; try { r = JSON.parse(d.json); } catch(e){ return; }
        DB.plaza = DB.plaza || {};
        if (k === kid && document.querySelector('.plaza-world')) return; // I'm the one moving here
        if (!DB.plaza[k] || r.ts >= DB.plaza[k].ts){ DB.plaza[k] = r; if (PZ.onRemote && k !== kid) PZ.onRemote(r, k); }
      }, () => {});
    } catch(e){}
  });
}
function pzToast(text){
  const t = el('div',{class:'pz-toast'}, text); document.body.append(t);
  setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800);
}
function pzHeroFor(k, size){
  const D = DB.kids[k];
  if (D.hero){ const keep = K; K = D; try { return heroNode(size); } finally { K = keep; } }
  return el('div',{class:'hero-wrap', html: D.avatar && D.avatar.base ? avatarSVG(D.avatar, size) : `<div style="font-size:${size*.7}px">${k === 'son' ? '🐲' : '🐰'}</div>`});
}

/* ----- the drawn town ----- */
function pzTree(x, y, s, gold, R){
  const cols = gold ? ['#f2b705','#f5c542','#e09c00','#fcd34d'] : ['#4caf50','#66bb6a','#2e7d32','#81c784'];
  let g = `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="4" rx="34" ry="9" fill="#000" opacity=".12"/><path d="M-6 0 q2 -40 -4 -60 h20 q-6 20 -4 60z" fill="#8b5a2b" stroke="#5b3a1a" stroke-width="2"/>`;
  for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2; g += `<circle cx="${Math.cos(a)*24}" cy="${-82 + Math.sin(a)*20}" r="${22 + R()*8}" fill="${cols[i % 4]}"/>`; }
  return g + `<circle cx="0" cy="-86" r="26" fill="${cols[3]}"/><circle cx="-8" cy="-96" r="9" fill="#fff" opacity=".25"/></g>`;
}
function pzCottage(x, y, roof){
  return `<g><rect x="${x-50}" y="${y-70}" width="100" height="70" fill="#f1e6d2" stroke="#5b4636" stroke-width="3"/><path d="M${x-62} ${y-66} L${x} ${y-120} L${x+62} ${y-66}z" fill="${roof}" stroke="#1e293b" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${x-12}" y="${y-40}" width="24" height="40" rx="10" fill="#7c4a24"/><rect x="${x-40}" y="${y-56}" width="18" height="18" fill="#fde68a" stroke="#5b4636" stroke-width="2"/><rect x="${x+22}" y="${y-56}" width="18" height="18" fill="#fde68a" stroke="#5b4636" stroke-width="2"/>
    <rect x="${x+24}" y="${y-118}" width="12" height="30" fill="#8b6b4a"/></g>`;
}
function pzBuildingSVG(b){
  const ink = '#2a2118', L = b.x - b.w/2, T = b.y - b.h;
  if (b.kind === 'portal') return `<g data-b="${b.id}" class="pz-b"><ellipse cx="${b.x}" cy="${b.y}" rx="90" ry="20" fill="#000" opacity=".15"/>
    <path d="M${b.x-70} ${b.y} v-90 a70 70 0 0 1 140 0 v90" fill="none" stroke="#a78bfa" stroke-width="22"/><path d="M${b.x-70} ${b.y} v-90 a70 70 0 0 1 140 0 v90" fill="none" stroke="#ede9fe" stroke-width="8"/>
    <path d="M${b.x-56} ${b.y} v-86 a56 56 0 0 1 112 0 v86z" fill="url(#pzPortal)" class="pz-portal"/>
    <rect x="${b.x-70}" y="${b.y-200}" width="140" height="32" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/><text x="${b.x}" y="${b.y-178}" text-anchor="middle" class="pz-sign">${b.icon} ${b.name}</text></g>`;
  let roof = '';
  if (b.kind === 'dome') roof = `<rect x="${L-10}" y="${T-14}" width="${b.w+20}" height="16" fill="${b.trim}" stroke="${ink}" stroke-width="3"/>
    <path d="M${b.x-b.w*.32} ${T-14} a${b.w*.32} ${b.w*.3} 0 0 1 ${b.w*.64} 0z" fill="${b.roof}" stroke="${ink}" stroke-width="3"/>
    <path d="M${b.x-b.w*.2} ${T-30} q${b.w*.2} -${b.w*.16} ${b.w*.4} 0" fill="none" stroke="#fcd34d" stroke-width="4" opacity=".7"/>
    <path d="M${b.x} ${T-14-b.w*.3} v-26" stroke="${ink}" stroke-width="4"/><circle cx="${b.x}" cy="${T-14-b.w*.3-30}" r="8" fill="#facc15" stroke="${ink}" stroke-width="2"/>
    ${[L-4, L+b.w-30].map(x => `<rect x="${x}" y="${T-60}" width="34" height="${b.h+60}" fill="${b.wall}" stroke="${ink}" stroke-width="3"/><path d="M${x-6} ${T-58} L${x+17} ${T-100} L${x+40} ${T-58}z" fill="${b.roof}" stroke="${ink}" stroke-width="3"/><rect x="${x+10}" y="${T-30}" width="14" height="24" rx="7" fill="#fde68a" stroke="${ink}" stroke-width="2"/>`).join('')}`;
  else if (b.kind === 'tower') roof = `<path d="M${L-16} ${T+2} L${b.x} ${T-110} L${L+b.w+16} ${T+2}z" fill="${b.roof}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M${b.x} ${T-110} v-24 l20 7 l-20 7" fill="#ef4444" stroke="${ink}" stroke-width="2"/>`;
  else roof = `<path d="M${L-16} ${T+4} L${b.x} ${T-b.h*.5} L${L+b.w+16} ${T+4}z" fill="${b.roof}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M${L-4} ${T-6} L${b.x} ${T-b.h*.5+14}" stroke="#fff" stroke-width="3" opacity=".25"/>`;
  const nWin = Math.max(2, Math.floor(b.w / 64)), gap = b.w / nWin;
  let wins = '';
  for (let i = 0; i < nWin; i++){ const wx = L + gap*i + gap/2 - 12; wins += `<path d="M${wx} ${T+60} v-26 a12 12 0 0 1 24 0 v26z" fill="#fde68a" stroke="${ink}" stroke-width="2.5"/><path d="M${wx+12} ${T+22} v38" stroke="${ink}" stroke-width="1.5" opacity=".5"/>`; }
  return `<g data-b="${b.id}" class="pz-b"><ellipse cx="${b.x}" cy="${b.y+4}" rx="${b.w*.62}" ry="18" fill="#000" opacity=".14"/>
    <rect x="${L}" y="${T}" width="${b.w}" height="${b.h}" rx="4" fill="${b.wall}" stroke="${ink}" stroke-width="3"/>${roof}${wins}
    <rect x="${L-6}" y="${b.y-12}" width="${b.w+12}" height="12" fill="${b.trim}" stroke="${ink}" stroke-width="2.5"/>
    <path d="M${b.x-22} ${b.y-12} v-40 a22 22 0 0 1 44 0 v40z" fill="#7c4a24" stroke="${ink}" stroke-width="3"/><circle cx="${b.x+12}" cy="${b.y-34}" r="3" fill="#facc15"/>
    ${[b.x-36, b.x+36].map(x => `<circle cx="${x}" cy="${b.y-56}" r="12" fill="#fde68a" opacity=".45" class="sc-firefly"/><circle cx="${x}" cy="${b.y-56}" r="5" fill="#fff7c2" stroke="${ink}" stroke-width="1.5"/>`).join('')}
    <rect x="${b.x-90}" y="${T+70}" width="180" height="${b.h > 160 ? 46 : 40}" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/><text x="${b.x}" y="${T+92}" text-anchor="middle" class="pz-sign">${b.icon} ${b.name}</text><text x="${b.x}" y="${T+106}" text-anchor="middle" class="pz-sub">${b.sub}</text></g>`;
}
function pzSceneSVG(){
  const R = seeded(77), C = PZ_C;
  let s = `<svg viewBox="0 0 ${PZ_W} ${PZ_H}" width="${PZ_W}" height="${PZ_H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="pzGrass" cx="50%" cy="55%" r="70%"><stop offset="0" stop-color="#8fd16a"/><stop offset="1" stop-color="#4f9e3c"/></radialGradient>
    <radialGradient id="pzPortal" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#c4b5fd"/><stop offset="1" stop-color="#6d28d9"/></radialGradient>
    <pattern id="pzCobble" width="28" height="22" patternUnits="userSpaceOnUse"><rect width="28" height="22" fill="#efe4cf"/><path d="M0 11 h28 M14 0 v11 M0 0 v0 M7 11 v11 M21 11 v11" stroke="#d6c6a6" stroke-width="2"/></pattern></defs>
    <rect width="${PZ_W}" height="${PZ_H}" fill="url(#pzGrass)"/>`;
  for (let i = 0; i < 260; i++) s += `<path d="M${R()*PZ_W} ${R()*PZ_H} l3 -9 l3 9" stroke="#3f8a33" stroke-width="2" fill="none" opacity=".5"/>`;
  // winding cobblestone paths from the plaza to every door
  PZ_BUILDINGS.forEach((b, i) => {
    const dx = b.x - C.x, dy = (b.y + 10) - C.y, len = Math.hypot(dx, dy) || 1, bend = (i % 2 ? 1 : -1) * Math.min(120, len * .25);
    const mx = C.x + dx/2 - dy/len*bend, my = C.y + dy/2 + dx/len*bend, d = `M${C.x} ${C.y} Q${mx} ${my} ${b.x} ${b.y+14}`;
    s += `<path d="${d}" stroke="#bfa982" stroke-width="80" fill="none" stroke-linecap="round"/><path d="${d}" stroke="url(#pzCobble)" stroke-width="68" fill="none" stroke-linecap="round"/>`;
  });
  // flower beds between the paths
  const beds = [[560,760],[1040,760],[620,440],[980,880],[440,620],[1160,600]];
  beds.forEach(([x, y]) => { s += `<ellipse cx="${x}" cy="${y}" rx="70" ry="34" fill="#5fae45" stroke="#c9b48c" stroke-width="6"/>`;
    for (let i = 0; i < 14; i++) s += `<circle cx="${x - 55 + R()*110}" cy="${y - 22 + R()*44}" r="${4 + R()*3}" fill="${['#f472b6','#facc15','#fb7185','#a78bfa','#fff'][i % 5]}"/>`; });
  // central plaza, garden ring, fountain and statue
  s += `<circle cx="${C.x}" cy="${C.y}" r="190" fill="#bfa982"/><circle cx="${C.x}" cy="${C.y}" r="182" fill="url(#pzCobble)"/>
    <circle cx="${C.x}" cy="${C.y}" r="120" fill="#5fae45" stroke="#d9b26a" stroke-width="8"/>`;
  for (let i = 0; i < 26; i++){ const a = i / 26 * Math.PI * 2; s += `<circle cx="${C.x + Math.cos(a)*102}" cy="${C.y + Math.sin(a)*102}" r="7" fill="${['#f472b6','#fde047','#fff','#c084fc'][i % 4]}"/>`; }
  s += `<g data-b="well" class="pz-b"><circle cx="${C.x}" cy="${C.y}" r="76" fill="#e7dcc8" stroke="#8a7a5c" stroke-width="4"/><circle cx="${C.x}" cy="${C.y}" r="62" fill="#60a5fa"/>
    <circle cx="${C.x}" cy="${C.y}" r="40" fill="none" stroke="#dbeafe" stroke-width="3" class="pz-ripple"/><circle cx="${C.x}" cy="${C.y}" r="52" fill="none" stroke="#dbeafe" stroke-width="2" class="pz-ripple d2"/>
    <rect x="${C.x-16}" y="${C.y-60}" width="32" height="60" fill="#e7dcc8" stroke="#8a7a5c" stroke-width="3"/>
    <path d="M${C.x-40} ${C.y-66} q20 -16 40 0 q20 -16 40 0 v-4 q-20 -14 -40 0 q-20 -14 -40 0z" fill="#facc15" stroke="#a16207" stroke-width="3"/><path d="M${C.x} ${C.y-70} v-4" stroke="#a16207" stroke-width="3"/>
    <path d="M${C.x} ${C.y-112} l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2z" fill="#fde047" stroke="#a16207" stroke-width="2.5" class="pz-star"/></g>`;
  // cottages and lamps around the edges
  [[90,260,'#2f5fc4'],[1510,260,'#2f5fc4'],[110,1090,'#2f5fc4'],[1490,1090,'#2f5fc4'],[300,1110,'#c2410c'],[1300,1110,'#c2410c'],[560,180,'#2f5fc4'],[1040,180,'#2f5fc4']].forEach(([x, y, r]) => s += pzCottage(x, y, r));
  [[640,620],[960,620],[800,430],[800,820],[470,520],[1130,520],[470,860],[1130,860]].forEach(([x, y]) => s += `<path d="M${x} ${y} v-60" stroke="#334155" stroke-width="5"/><rect x="${x-9}" y="${y-76}" width="18" height="20" rx="4" fill="#fde68a" stroke="#334155" stroke-width="3"/><circle cx="${x}" cy="${y-66}" r="18" fill="#fde68a" opacity=".3" class="sc-firefly"/>`);
  // golden and green trees, back to front
  const trees = [[40,120],[200,100],[420,90],[680,70],[930,70],[1180,90],[1400,100],[1560,140],[40,520],[1560,520],[60,900],[1540,900],[380,620],[1220,620],[700,980],[900,980],[300,960],[1300,960],[620,280],[980,280]];
  trees.sort((a, b) => a[1] - b[1]).forEach(([x, y], i) => s += pzTree(x, y, .9 + R()*.35, i % 3 !== 2, R));
  PZ_BUILDINGS.forEach(b => s += pzBuildingSVG(b));
  return s + '</svg>';
}

/* ----- screen ----- */
function screenTownSquare(){
  if (!K.hero) return screenHeroCreate(screenTownSquare);
  pzSubscribe();
  PZ.pos = Object.assign({ x:760, y:760 }, K.plazaPos || {});
  const world = el('div',{class:'plaza-world', html: pzSceneSVG()});
  const view = el('div',{class:'plaza-view'}, world), frame = el('div',{class:'plaza-frame'}, view);
  const actor = (node, name, cls) => el('div',{class:'plaza-actor ' + (cls || '')}, el('div',{class:'pz-tag'}, name), node);
  const me = actor(pzHeroFor(kid, 96), kidName(), 'me' + (isDev() ? ' wizard' : ''));
  world.append(me);
  const put = (n, x, y, w = 96) => { n.style.left = (x - w/2) + 'px'; n.style.top = (y - w*1.25 - 30) + 'px'; n.style.zIndex = Math.round(y); };
  const bubble = (n, text, big) => { n.querySelectorAll('.pz-bubble').forEach(b => b.remove()); const b = el('div',{class:'pz-bubble' + (big ? ' big' : '')}, text); n.append(b); setTimeout(() => b.remove(), 2600); };
  const camera = (x, y, smooth = true) => view.scrollTo({ left: x - view.clientWidth/2, top: y - view.clientHeight/2, behavior: smooth ? 'smooth' : 'auto' });
  K.plazaSeenBy = K.plazaSeenBy || {};

  // everyone else in town: live if they're here now, otherwise napping at their last spot
  const others = pzOthers();
  const homeSpot = { son:{ x:900, y:720 }, daughter:{ x:680, y:720 }, dev:{ x:1000, y:520 } };
  const P = {};
  others.forEach(k => {
    const n = actor(pzHeroFor(k, 96), kidName(k), 'sib' + (k === 'dev' ? ' wizard' : ''));
    P[k] = { k, n, pos: Object.assign({}, homeSpot[k]), seenEmote: 0 };
    world.append(n);
    n.onclick = e => { e.stopPropagation(); beep('tap'); tapOther(P[k]); };
  });
  const forMe = m => !m.to || m.to === 'all' || m.to === kid;
  const draw = (k, r) => {
    const o = P[k]; if (!o) return;
    const live = pzOnline(r), n = o.n, name = kidName(k);
    if (r && typeof r.x === 'number') o.pos = { x:r.x, y:r.y };
    const dur = live && n._x != null ? Math.min(3, Math.hypot(o.pos.x - n._x, o.pos.y - n._y) / 240) : 0;
    n.style.transitionDuration = dur + 's';
    if (n._x != null && live && Math.abs(o.pos.x - n._x) > 4) n.classList.toggle('flip', o.pos.x < n._x);
    if (dur > .05){ n.classList.add('walking'); setTimeout(() => n.classList.remove('walking'), dur*1000); }
    put(n, o.pos.x, o.pos.y); n._x = o.pos.x; n._y = o.pos.y;
    n.classList.toggle('away', !live);
    n.querySelector('.pz-tag').textContent = name + (live ? ' 🟢' : ' 💤');
    if (live && r.emote && r.emoteTs > o.seenEmote && Date.now() - r.emoteTs < 15000 && forMe({ to:r.emoteTo })){
      o.seenEmote = r.emoteTs; bubble(n, r.emote, true);
      if (r.emote === '💃'){ n.classList.add('dance'); setTimeout(() => n.classList.remove('dance'), 2000); }
    }
    const fresh = ((r && r.sent) || []).filter(m => m.ts > (K.plazaSeenBy[k] || 0) && forMe(m));
    if (fresh.length){
      fresh.forEach((m, i) => setTimeout(() => { pzToast(live && Date.now() - m.ts < 20000 ? `${name}: ${m.e} ${m.label}!` : `${name} left you a ${m.e} ${m.label} while you were away!`); beep('ok'); }, i * 900));
      K.plazaSeenBy[k] = Math.max(...fresh.map(m => m.ts)); save();
    }
  };
  PZ.onRemote = (r, k) => { if (document.body.contains(world)) draw(k, r); };

  // walking
  let walkT = null, walkId = 0;
  const walkTo = (x, y, then) => {
    x = Math.max(50, Math.min(PZ_W - 50, x)); y = Math.max(150, Math.min(PZ_H - 20, y));
    const dc = Math.hypot(x - PZ_C.x, y - PZ_C.y); if (dc < 84){ const f = 84 / (dc || 1); x = PZ_C.x + (x - PZ_C.x)*f; y = PZ_C.y + (y - PZ_C.y)*f + (dc ? 0 : 84); }
    const d = Math.hypot(x - PZ.pos.x, y - PZ.pos.y), dur = Math.max(.2, d / 260), id = ++walkId;
    me.style.transitionDuration = dur + 's';
    if (Math.abs(x - PZ.pos.x) > 4) me.classList.toggle('flip', x < PZ.pos.x);
    me.classList.add('walking'); put(me, x, y); camera(x, y);
    frame.querySelectorAll('.pz-pop').forEach(p => p.remove());
    clearTimeout(walkT);
    walkT = setTimeout(() => { if (id !== walkId) return; me.classList.remove('walking'); PZ.pos = { x, y }; pzPush(); then && then(); }, dur * 1000);
  };
  // pop-up cards dock at the bottom of the town view so they're never cut off
  const pop = (...kids) => { frame.querySelectorAll('.pz-pop').forEach(p => p.remove()); const p = el('div',{class:'pz-pop'}, ...kids, el('button',{class:'pz-x', onclick:e => { e.stopPropagation(); p.remove(); }},'✕')); p.onclick = e => e.stopPropagation(); frame.append(p); return p; };
  const closePop = () => frame.querySelectorAll('.pz-pop').forEach(p => p.remove());
  const leave = fn => { pzPush({ here:false }); fn(); };

  // buildings and the fountain
  world.addEventListener('click', e => {
    if (e.target.closest('.plaza-actor, .pz-npc')) return;
    const g = e.target.closest('[data-b]');
    if (g && g.dataset.b === 'well') return walkTo(PZ_C.x, PZ_C.y + 96, wish);
    if (g){ const b = PZ_BUILDINGS.find(x => x.id === g.dataset.b); beep('tap');
      return walkTo(b.x, b.y + 30, () => { say(b.name + '. ' + b.sub); pop(el('div',{class:'pz-pop-e'}, b.icon), el('b',{}, b.name), el('small',{}, b.sub), el('button',{class:'btn small', onclick:() => leave(b.go)}, 'Go in ▶')); }); }
    const r = world.getBoundingClientRect(); walkTo(e.clientX - r.left, e.clientY - r.top + 10);
  });
  function wish(){
    const today = todayStr();
    if (K.pzWish === today && !isDev()){ say('The fountain is resting. Come back tomorrow for another wish!'); return pop(el('div',{class:'pz-pop-e'},'⛲'), el('b',{},'Wishing Fountain'), el('small',{},'One wish a day. Come back tomorrow!')); }
    pop(el('div',{class:'pz-pop-e'},'⛲'), el('b',{},'Wishing Fountain'), el('small',{},'Toss a coin and make a wish!'),
      el('button',{class:'btn small', onclick:() => { K.pzWish = today; const n = 1 + Math.floor(Math.random()*5); K.stars += n; save(); closePop();
        const coin = el('div',{class:'pz-coin', style:`left:${PZ.pos.x}px;top:${PZ.pos.y - 120}px`},'🪙'); world.append(coin); setTimeout(() => coin.remove(), 1200);
        setTimeout(() => { beep('star'); confetti(30); bubble(me, `+${n}⭐`, true); say(`Your wish came true! ${n} stars!`); }, 900); }}, '🪙 Make a wish'));
  }

  // townsfolk
  PZ_NPCS.filter(n => !n.hidden).forEach(n => {
    const node = el('div',{class:'pz-npc', style:`left:${n.x-36}px;top:${n.y-90}px;z-index:${n.y}`}, el('div',{class:'pz-tag'}, n.name), el('div',{class:'pz-npc-e'}, n.e));
    if (n.id === 'baker') node.append(el('div',{class:'pz-stall'},'🥐🧁🍪'));
    node.onclick = e => { e.stopPropagation(); beep('tap'); walkTo(n.x + 70, n.y + 10, () => n.id === 'owl' ? owl() : baker()); };
    world.append(node);
  });
  function owl(){
    const list = PZ_WORDS[TK], w = list[pzDayIdx() % list.length], done = K.pzWord === todayStr() && !isDev();
    say(`Hoot hoot! The word of the day is: ${w}. Can you read it out loud?`);
    pop(el('div',{class:'pz-pop-e'},'🦉'), el('small',{},'Word of the day'), el('div',{class:'pz-word'}, w),
      el('button',{class:'btn small ghost', onclick:() => say(w)}, '🔊 Hear it'),
      done ? el('small',{},'✅ You got today\'s word star!') : el('button',{class:'btn small', onclick:e => { K.pzWord = todayStr(); K.stars += 1; save(); beep('star'); bubble(me,'+1⭐',true); say('Hoot! Great reading!'); e.target.replaceWith(el('small',{},'✅ +1 ⭐')); }}, '🗣️ I read it!'));
  }
  function baker(){
    const list = PZ_RIDDLES[TK], [q, opts] = list[(pzDayIdx() + (isDev() ? Math.floor(Math.random()*list.length) : 0)) % list.length];
    if (K.pzRiddle === todayStr() && !isDev()){ say('You already solved my riddle today! Come back tomorrow for a new one.'); return pop(el('div',{class:'pz-pop-e'},'🐰'), el('b',{},'Baker Bun'), el('small',{},'New riddle tomorrow! 🧁')); }
    say(q);
    const p = pop(el('div',{class:'pz-pop-e'},'🧁'), el('b',{},'Riddle time!'), el('div',{class:'pz-q'}, q));
    shuffle(opts.map((o, i) => [o, i === 0])).forEach(([o, right]) => p.insertBefore(el('button',{class:'btn small blue', onclick:e => {
      if (right){ K.pzRiddle = todayStr(); K.stars += 2; save(); beep('star'); confetti(25); bubble(me,'+2⭐',true); say('Yes! You got it! Here are two stars.'); setTimeout(() => p.remove(), 1200); }
      else { beep('bad'); e.target.disabled = true; say('Not quite. Try again!'); }
    }}, o), p.querySelector('.pz-x')));
  }

  // tap someone else
  function tapOther(o){
    const r = pzRec(o.k), live = pzOnline(r), name = kidName(o.k);
    walkTo(o.pos.x + (PZ.pos.x < o.pos.x ? -90 : 90), o.pos.y, () => {
      pop(el('b',{}, live ? `${name} is here!` : `${name} is away 💤`), el('small',{}, live ? 'Send a wave or a high five!' : 'Leave something. They\'ll see it next time!'),
        el('div',{class:'pz-emotes'}, ...PZ_EMOTES.map(([em, label]) => el('button',{class:'pz-em', onclick:() => { closePop(); emote(em, label, o.k); }}, em))));
    });
  }
  // emotes: to one person, or to everyone in town from the bar
  function emote(em, label, to = 'all'){
    bubble(me, em, true); beep('ok');
    if (em === '💃'){ me.classList.add('dance'); setTimeout(() => me.classList.remove('dance'), 2000); }
    const prev = pzRec(kid) || {}, sent = (prev.sent || []).concat([{ e:em, label, to, ts:Date.now() }]);
    pzPush({ emote:em, emoteTo:to, emoteTs:Date.now(), sent });
    const targets = to === 'all' ? others : [to];
    const liveNear = targets.filter(k => pzOnline(pzRec(k)) && Math.hypot(PZ.pos.x - P[k].pos.x, PZ.pos.y - P[k].pos.y) < 220);
    if (em === '✋' && liveNear.length && K.pzHigh5 !== todayStr()){
      K.pzHigh5 = todayStr(); K.stars += 2; save(); setTimeout(() => { confetti(40); burst('HIGH FIVE!'); bubble(me, '+2⭐', true); say('Team high five! Two stars!'); }, 400);
    } else if (to !== 'all' && !pzOnline(pzRec(to))) pzToast(`${em} sent! ${kidName(to)} will see it next time.`);
  }
  const bar = el('div',{class:'pz-bar'}, el('span',{class:'pz-bar-l'},'Say hi:'), ...PZ_EMOTES.map(([em, label]) => el('button',{class:'pz-em', title:label, onclick:() => emote(em, label)}, em)));

  // a little life: critters wander
  const critters = ['🐈','🐓','🦆','🐿️','🦋'].map((c, i) => { const n = el('div',{class:'pz-critter'}, c); n._x = 300 + i*260; n._y = 560 + (i % 2)*300; n.style.left = n._x + 'px'; n.style.top = n._y + 'px'; world.append(n); return n; });
  const wander = () => { if (!document.body.contains(world)) return; const n = pick(critters); const nx = Math.max(60, Math.min(PZ_W-60, n._x + (Math.random()-.5)*260)), ny = Math.max(200, Math.min(PZ_H-60, n._y + (Math.random()-.5)*160));
    n.classList.toggle('flip', nx > n._x); n._x = nx; n._y = ny; n.style.left = nx + 'px'; n.style.top = ny + 'px'; n.style.zIndex = Math.round(ny); setTimeout(wander, 1400 + Math.random()*1600); };
  setTimeout(wander, 800);

  const kidsNames = others.filter(k => k !== 'dev').map(k => kidName(k)).join(' and ');
  const status = el('div',{class:'pz-status'}, CLOUD.on ? `☁️ Town is live. When ${kidsNames} opens Town Square, you'll see each other here.` : `📱 On this link, ${kidsNames} can only visit from this device. Use the Claude link to play together on different iPads.`);
  show(el('div',{class:'screen plaza-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn small', onclick:() => leave(() => screenHome())}, '← Back'), el('h1',{class:'title'}, '🏰 Storybrook Square'), el('div')),
    frame, bar, status));
  put(me, PZ.pos.x, PZ.pos.y); me.style.transitionDuration = '0s';
  others.forEach(k => draw(k, pzRec(k)));
  requestAnimationFrame(() => camera(PZ.pos.x, PZ.pos.y, false));
  pzPush();
  clearInterval(PZ.beat);
  PZ.beat = setInterval(() => { if (!document.body.contains(world)){ clearInterval(PZ.beat); return; } pzPush(); others.forEach(k => draw(k, pzRec(k))); }, 30000);
  if (!K.pzHello){ K.pzHello = 1; save(); say(`Welcome to Storybrook Square! Tap anywhere to walk. Tap a building to go inside.`); }
}

/* ================= WIZARD MODE (grown-up, this device only) =================
   A hidden third player for testing: everything free and unlocked, either reading track, any level.
   Turned on from Grown-ups › Wizard Mode or by opening the app link with #wizard on the end.
   Kept only on this device (never sent to cloud save), so the kids' iPads never show it. */
function wizardSetup(){
  const W = DB.kids.dev;
  W.placed = true; W.level = W.level || 1;
  if (!W.avatar.base){ W.avatar.base = 'dragon'; }
  if (!W.hero){
    W.hero = { skin:SKIN_TONES[1], hairColor:'#f1f5f9', hairStyle:'short', weapon:'wizard', beard:true, beardColor:'#f1f5f9' };
    W.gear = { owned:{ traveler:GEAR_SLOTS.slice(), archmage:GEAR_SLOTS.slice() }, eq:Object.fromEntries(GEAR_SLOTS.map(s => [s, 'archmage'])) };
    wizardUnlockAll();
  }
  save();
}
function wizardUnlockAll(){
  const W = DB.kids.dev;
  W.gear = W.gear || { owned:{}, eq:{} };
  GEAR_SETS.concat([ARCHMAGE]).forEach(g => W.gear.owned[g.id] = GEAR_SLOTS.slice());
  W.avatar.owned = [...new Set((W.avatar.owned || []).concat(Object.keys(AVATAR_BASES).filter(id => AVATAR_BASES[id].kid), SHOP.map(x => x[1])))];
  W.legendOwned = LEGENDS.map(l => l.id); W.legendSeen = LEGENDS.map(l => l.id);
  W.mythics = MYTHICS.map(m => m.id);
  W.collection = [...new Set(['son','daughter'].flatMap(t => TRACKS[t].rewards.map(r => r[1])))];
  const Wd = (function(){ const keep = K; K = W; try { return worldOf('dev'); } finally { K = keep; } })();
  Wd.themes = Object.keys(WORLD_THEMES);
  save();
}
function screenWizard(){
  stopAll();
  const W = DB.kids.dev, row = (...k) => el('div',{class:'row wiz-row'}, ...k);
  const sec = (title, ...k) => el('div',{class:'card wiz-card'}, el('h3',{}, title), ...k);
  const done = t => { pzToast('🧙 ' + t); beep('star'); };
  const name = el('input',{class:'wiz-input', value: kidName('dev')});
  const levels = T.levels.map((L, i) => el('button',{class:'btn small' + (W.level === i+1 ? '' : ' ghost'), onclick:()=>{ W.level = i+1; W.placed = true; W.passStreak = 0; W.failStreak = 0; W.bossReady = null; awardTrophiesUpTo(i+1); save(); done(`Now at level ${i+1}: ${L.title}`); screenWizard(); }}, String(i+1)));
  const bossBtns = T.levels.map((L, i) => bossFor(i+1) ? el('button',{class:'btn small ghost', onclick:()=>{ W.level = i+1; save(); bossIntro(i+1); }}, `${bossFor(i+1).e} ${i+1}`) : null);
  show(el('div',{class:'screen wizard-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🧙 Wizard Tools'), el('div')),
    el('p',{class:'subtitle'}, 'Only on this device. Stars and 💫 never run out, every shop item, place, pet, legendary and gear set is unlocked. The kids never see this profile on their iPads.'),
    el('div',{class:'wiz-grid'},
      sec('📚 Reading track',
        row(el('button',{class:'btn small' + (TK === 'daughter' ? '' : ' ghost'), onclick:()=>{ DB.devTrack = 'daughter'; save(); setKid('dev'); done(`${kidName('daughter')}'s track`); screenWizard(); }}, `🐉 ${kidName('daughter')}'s track`),
            el('button',{class:'btn small' + (TK === 'son' ? '' : ' ghost'), onclick:()=>{ DB.devTrack = 'son'; save(); setKid('dev'); done(`${kidName('son')}'s track`); screenWizard(); }}, `🐲 ${kidName('son')}'s track`)),
        el('p',{class:'muted'}, 'Stories, phonics, spelling, bosses and the level guide follow this track.')),
      sec('🎚️ Jump to level', row(...levels), el('p',{class:'muted'}, 'Reading progress, level-locked items and the next boss follow your level.')),
      sec('⚔️ Fight a boss now', row(...bossBtns)),
      sec('🧪 Test things',
        row(el('button',{class:'btn small blue', onclick:()=>{ W.placed = false; save(); screenPlacementIntro(); }}, '📏 Placement test'),
            el('button',{class:'btn small blue', onclick:()=>{ ensureSkillStart(); screenPath(); }}, '🧠 Phonics path'),
            el('button',{class:'btn small blue', onclick:()=>{ beep('tap'); TK === 'daughter' ? startSpellCheck() : startSpelling(); }}, '✏️ Spelling'),
            el('button',{class:'btn small blue', onclick:()=>{ lootReveal((setForLevel(W.level) || SET_BY_ID.ember).id, pick(GEAR_SLOTS), false); }}, '🎁 Gear drop'),
            el('button',{class:'btn small blue', onclick:()=>{ W.chestPity = 999; W.mythics = []; maybeStarfallChest().then(() => wizardUnlockAll()); }}, '🌠 Starfall chest')),
        row(el('button',{class:'btn small', onclick:()=>{ ['pzWish','pzRiddle','pzWord','pzHigh5'].forEach(k => delete W[k]); W.today = { date:null, ms:0 }; save(); done('Daily rewards reset'); }}, '🔄 Reset daily stuff'),
            el('button',{class:'btn small', onclick:()=>{ wizardUnlockAll(); done('Everything unlocked'); }}, '🔓 Unlock everything again'))),
      sec('🪄 Your wizard',
        row(name, el('button',{class:'btn small', onclick:()=>{ DB.devName = name.value.trim() || 'The Wizard'; save(); done('Name saved'); }}, 'Save name')),
        el('p',{class:'muted'}, 'This is the name the kids see on you in Town Square.'),
        row(el('button',{class:'btn small blue', onclick:()=>screenHeroCreate(screenWizard)}, '✏️ Change look'), el('button',{class:'btn small blue', onclick:screenArmory}, '🛡️ Armory'),
            el('button',{class:'btn small blue', onclick:()=>screenWorld()}, '🏗️ My World'), el('button',{class:'btn small blue', onclick:screenTownSquare}, '🏰 Town Square'))),
      sec('⚠️ Wizard profile',
        row(el('button',{class:'btn small gray', onclick:async ()=>{ const ok = await modal(el('div',{}, el('h2',{},'Start the Wizard over?'), el('p',{},'Clears the Wizard\'s reading history and world. The kids\' progress is not touched.')), [['Cancel','gray',false],['Start over','',true]]); if (ok){ DB.kids.dev = freshKid(); DB.kids.dev.avatar = { base:null, owned:[], equipped:{} }; save(); enterKid('dev'); } }}, 'Start over'),
            el('button',{class:'btn small gray', onclick:()=>{ DB.devOn = false; save(); screenProfiles(); }}, 'Hide Wizard on this device')),
        el('p',{class:'muted'}, 'To bring the Wizard back: Grown-ups › Wizard Mode, or open the app link with #wizard at the end.')))));
}

/* ================= PARENT AREA ================= */
function screenPin(after){
  stopAll();
  let entered = '';
  const dots = el('div',{class:'pin-dots'},'○○○○');
  const msg = el('p',{class:'muted'},'Enter the grown-up PIN (starts as 1234)');
  const pad = el('div',{class:'pad'});
  const press = d => {
    if (d === '⌫') entered = entered.slice(0,-1); else if (entered.length < 4) entered += d;
    dots.textContent = '●'.repeat(entered.length) + '○'.repeat(4-entered.length);
    if (entered.length === 4){
      if (entered === DB.pin) setTimeout(()=> after ? after() : screenParent(kid && kid !== 'dev' ? kid : 'daughter'), 150);
      else { msg.textContent = 'Not quite. Try again.'; entered = ''; setTimeout(()=>dots.textContent='○○○○', 300); }
    }
  };
  ['1','2','3','4','5','6','7','8','9','','0','⌫'].forEach(d => pad.append(d ? el('button',{onclick:()=>press(d)}, d) : el('div')));
  const back = () => kid && !after ? screenHome() : screenProfiles();
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
  const wizRow = el('div',{class:'card', style:'margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap'}, el('b',{},'🧙 Wizard Mode'),
    el('span',{class:'muted', style:'flex:1'}, 'A secret grown-up player on this device only: everything free, any track or level, for testing.'),
    el('button',{class:'btn small', onclick:()=>{ DB.devOn = true; save(); enterKid('dev'); }}, DB.devOn ? 'Open Wizard' : 'Turn on'));
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
    wizRow,
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
      el('p',{class:'muted'}, `Stars earned ${k.stars} · spent ${k.spent||0} · 💫 Cosmic ${(k.cosmic||0)-(k.cosmicSpent||0)} (earned ${k.cosmic||0}) · trophies ${k.trophies.length}/${track.levels.length} · badges ${k.badges.length}/${BADGES.length} · collection ${k.collection.length}/${track.rewards.length}`),
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
      el('h2',{},'⚔️ Bosses & 📚 Real Books'),
      el('p',{class:'muted'}, 'Boss battles: ' + (Object.entries(k.bossLog||{}).map(([lv, r]) => `${(BOSSES[which][lv]||{}).e || ''} L${lv}: ${r.wins ? '✅ beaten' : '❌ not yet'} (${r.tries} tr${r.tries === 1 ? 'y' : 'ies'})`).join(' · ') || 'none yet') + (k.bossReady ? ` · Boss waiting at level ${k.bossReady}` : '')),
      (k.realBooks||[]).length ? el('table',{}, el('tr',{}, ...['Date','Book','Rating','What they said'].map(h => el('th',{}, h))),
        ...k.realBooks.slice().reverse().map(b => el('tr',{}, el('td',{}, b.date), el('td',{}, b.cover + ' ' + b.title), el('td',{}, '⭐'.repeat(b.rating||0)), el('td',{style:'font-size:14px'}, b.retell || '—'))))
        : el('p',{class:'muted'}, 'No real books logged yet.')),
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
        el('button',{class:'btn small blue', onclick:ev=>{ const v = parseInt(ev.currentTarget.previousSibling.value,10); if (v){ k.stars += v; save(); screenParent(which); } }},'Give stars'),
        el('button',{class:'btn small', onclick:ev=>{ const v = parseInt(ev.currentTarget.previousSibling.previousSibling.value,10); if (v){ k.cosmic = (k.cosmic||0) + v; save(); screenParent(which); } }},'Give 💫 Cosmic')),
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
if (/wizard/i.test(location.hash)) DB.devOn && DB.kids.dev ? enterKid('dev') : screenPin(() => enterKid('dev'));
else if (DB.pinKid && DB.kids[DB.pinKid]) enterKid(DB.pinKid);
else screenProfiles();
cloudStart();
watchForUpdates();

// test hooks
window.__RQ = { graphemes: typeof graphemes !== 'undefined' ? graphemes : null, align, wordMatch, tokenizeHeard, letterMatch, checkBadges, maybeStarfallChest, get run(){ return run; }, get DB(){ return DB; } };
})();


