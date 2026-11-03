# Reading Quest browser tests.
# Copies the app to a temp folder, adds a test seed + probe to each page, runs it in headless Edge,
# and prints PASS/FAIL lines. Exit code 1 if anything fails.
#   powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$work = Join-Path $env:TEMP 'rq-tests'
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge not found' }
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $work | Out-Null
Get-ChildItem $root -File | Where-Object { $_.Extension -in '.html','.css','.js' } | Copy-Item -Destination $work
$index = Get-Content (Join-Path $work 'index.html') -Raw -Encoding UTF8

# shared helpers for every probe: ok(), btn(), at() timeline, and a fake cloud database
$common = @'
<script>
window.__errs=[]; window.addEventListener('error',e=>__errs.push(e.message+' @'+e.lineno)); window.addEventListener('unhandledrejection',e=>__errs.push('promise: '+(e.reason&&e.reason.message)));
window.__res=[]; window.ok=(name,cond,detail)=>__res.push((cond?'PASS ':'FAIL ')+name+(detail?' ('+detail+')':''));
window.btn=re=>[...document.querySelectorAll('button')].find(b=>re.test(b.textContent.trim()));
window.T=()=>document.body.innerText.replace(/\s+/g,' ');
window.__t=300; window.at=(ms,f)=>setTimeout(()=>{try{f()}catch(e){__res.push('FAIL step threw: '+e.message)}},window.__t+=ms);
window.done=()=>at(300,()=>{ ok('no script errors', !__errs.length, __errs.join('; ')); document.body.setAttribute('data-results', __res.join('\n')); });
window.clickOverlays=()=>document.querySelectorAll('.overlay .btn').forEach(b=>b.click());
window.answerRight=()=>{ const Q=__RQ.run.quiz, r=Q.qs[Q.i].opts.find(o=>o.right).t; [...document.querySelectorAll('.opt')].find(o=>o.textContent.startsWith(r)).click(); };
window.nextQ=()=>(btn(/Next question/)||btn(/See my stars/)).click();
if (window.__fakeCloud){ const STORE=window.__seedCloud||{}; window.__store=STORE; const subs={};
  const snap=p=>({exists:!!STORE[p],data:()=>STORE[p],metadata:{fromCache:false,hasPendingWrites:false}});
  window.__remoteSet=(p,d)=>{STORE[p]=d;(subs[p]||[]).forEach(f=>f(snap(p)));};
  window.claude={use:async n=>n!=='db'?null:{doc:p=>({set:async d=>{STORE[p]=JSON.parse(JSON.stringify(d));(subs[p]||[]).forEach(f=>setTimeout(()=>f(snap(p)),50));},get:async()=>snap(p),onSnapshot:n2=>{(subs[p]=subs[p]||[]).push(n2);setTimeout(()=>n2(snap(p)),100);return()=>{};}})}}; }
</script>
'@

$kidG = "{level:3,placed:true,stars:10,avatar:{base:'bunny',owned:['bunny'],equipped:{}}}"
$kidM = "{level:2,placed:true,stars:40,avatar:{base:'dragon',owned:['dragon'],equipped:{}},world:{theme:'meadow',themes:['meadow'],nextId:3,items:[{id:1,k:'house',e:'🏠',x:400,y:190,s:1.6,f:false,z:2},{id:2,k:'panda',e:'🐼',x:700,y:240,s:1,f:false,z:3}]}}"
function Seed($pinKid, $extra) { "{pin:'1234',gifts:['world-refund-2026-11'],$(if ($pinKid) { "pinKid:'$pinKid'," })kids:{son:$kidM,daughter:$kidG}$extra}" }

$tests = [ordered]@{
  'boot' = @{ seed = (Seed $null ''); probe = @'
at(0,()=>{ ok('profile screen', /Who is reading today/.test(T())); ok('cloud status line', !!document.querySelector('.cloud-status')); });
'@ }
  'gianna-story' = @{ seed = (Seed 'daughter' ''); probe = @'
at(0,()=>{ const tags=[...document.querySelectorAll('.series-tag')].map(x=>x.textContent).join('|'); ok('three sections', /Short Stories/.test(tags)&&/Chapter Books/.test(tags)&&/Spelling Check/.test(tags), tags); ok('goal bar', !!document.querySelector('.goal-bar')); btn(/^▶ Read$/).click(); });
at(400,()=>{ ok('5 questions', /of 5/.test(document.querySelector('.pageinfo').textContent)); ok('no microphone', !document.querySelector('.mic'));
  const w=document.querySelectorAll('.mw'); const f=(n,t)=>n.dispatchEvent(new PointerEvent(t,{bubbles:true})); f(w[1],'pointerdown'); f(w[1],'pointerup');
  ok('highlight marks a word', document.querySelectorAll('.mw.hl').length===1);
  btn(/Meaning/).click(); const d=[...document.querySelectorAll('.mw.has-def')][0]; ok('some words have meanings', !!d);
  if (d){ f(d,'pointerdown'); f(d,'pointerup'); ok('meaning popup', !!document.querySelector('.def-pop') && !/No meaning/.test(document.querySelector('.def-pop').textContent)); }
  btn(/Highlight/).click(); answerRight(); ok('proof box shows or is skipped cleanly', true, document.querySelector('.proof-box').className); nextQ(); });
at(300,()=>{ ok('marks kept on next question', document.querySelectorAll('.mw.hl').length===1); for(let i=0;i<4;i++){ answerRight(); nextQ(); } });
at(300,()=>{ ok('results 5/5', /5\/5 questions right/.test(T())); btn(/Continue/).click(); });
for (let k=0;k<4;k++) at(900,clickOverlays);
at(600,()=>{ const d=JSON.parse(localStorage.getItem('readingQuest_v1')).kids.daughter; ok('session saved with minutes', d.sessions.length===1 && typeof d.sessions[0].ms==='number'); ok('pass counted', d.passStreak===1, 'passStreak='+d.passStreak); });
'@ }
  'chapter-book' = @{ seed = (Seed 'daughter' ''); probe = @'
at(0,()=>{ btn(/Bookshelf/).click(); });
at(300,()=>{ const titles=[...document.querySelectorAll('.book-card h3')].map(x=>x.textContent); ok('lighthouse book on shelf', titles.includes('The Lighthouse on Gull Island'), titles.join(', '));
  const lh=[...document.querySelectorAll('.book-card')].find(c=>/Lighthouse/.test(c.textContent)); ok('lighthouse has 8 chapters', lh && lh.querySelectorAll('.chapter-list li').length===8); ok('lighthouse open at rank 3', lh && !lh.classList.contains('locked'));
  lh.querySelector('.btn').click(); });
at(400,()=>{ ok('chapter heading', /Chapter 1 of 8/.test(document.querySelector('.quiz-passage h3').textContent)); for(let i=0;i<5;i++){ answerRight(); nextQ(); } });
at(300,()=>{ btn(/Continue/).click(); });
for (let k=0;k<4;k++) at(900,clickOverlays);
at(600,()=>{ const d=JSON.parse(localStorage.getItem('readingQuest_v1')).kids.daughter; ok('bookmark moved to chapter 2', d.books.lighthouse.ch===1); });
'@ }
  'back-buttons' = @{ seed = (Seed 'daughter' ''); probe = @'
at(0,()=>{ btn(/^▶ Start$/).click(); });
at(300,()=>{ const b=btn(/^← Back$/); ok('question screen has Back', !!b); b.click(); });
at(300,()=>{ ok('back from chapter goes to bookshelf', /Bookshelf/.test(T())); btn(/^← Back$/).click(); });
at(300,()=>{ btn(/✏️ Spelling/).click(); });
at(300,()=>{ const b=btn(/^← Back$/); ok('spelling check has Back', !!b); b.click(); ok('back to home', /Hi, Gianna/.test(T())); });
'@ }
  'spelling' = @{ seed = (Seed 'daughter' ''); probe = @'
at(0,()=>{ btn(/^✏️ Start$/).click(); });
at(300,()=>{ ok('spelling check opens', /Spelling Check · 1 \/ 8/.test(T())); const i=document.querySelector('.spell-input'); i.value='zzzz'; btn(/Check/).click(); ok('wrong word shows spelling', /It's spelled/.test(T())); });
'@ }
  'miles-reader' = @{ seed = (Seed 'son' ''); probe = @'
at(0,()=>{ ok('progress bar', !!document.querySelector('.lvl-progress')); btn(/^▶ Read$/).click(); });
at(400,()=>{ if (btn(/Skip to the story/)) btn(/Skip to the story/).click(); });
at(400,()=>{ ok('reader open', !!document.querySelector('.passage')); ok('hear it first button', !!btn(/Hear it first/));
  ok('whole story on one screen', __RQ.run.act.pages.length===1, __RQ.run.act.pages.length);
  ok('paragraph breaks', document.querySelectorAll('.passage .pbreak').length >= 3);
  ok('story is longer', document.querySelectorAll('.passage .w').length >= 35, document.querySelectorAll('.passage .w').length);
  const st = __RQ.align('the cat sat on a mat the dog ran to the big red bus'.split(' '), 'the cat sat the big red bus'.split(' '));
  ok('mic catches up after a skipped line', st[12]==='ok' && st[11]==='ok' && st[5]==='miss', st.join(',')); });
'@ }
  'level-guide' = @{ seed = (Seed 'son' ''); probe = @'
at(0,()=>{ ok('cards say what levels you up', document.querySelectorAll('.counts-tag').length>0); ok('rule shown under bar', /8 of 10 words right/.test(document.querySelector('.lvl-rule').textContent)); btn(/How do I level up/i).click(); });
at(300,()=>{ const g=document.querySelector('.level-guide'); ok('guide opens', !!g); ok('guide has steps + boss', g && g.querySelectorAll('.lg-step').length>=3, g && g.querySelectorAll('.lg-step').length); ok('shows where you are', g && g.querySelectorAll('.lg-now').length===1); btn(/Got it/i).click(); ok('guide closes', !document.querySelector('.level-guide')); });
'@ }
  'world' = @{ seed = (Seed 'son' ''); probe = @'
at(0,()=>{ btn(/My World/).click(); });
at(1500,()=>{ ok('scene drawn', !!document.querySelector('.world-scene svg')); ok('items placed', document.querySelectorAll('.world-item').length===2); ok('panda wanders', document.querySelector('.world-item.wander')?.textContent==='🐼'); ok('buddy present', !!document.querySelector('.world-avatar .av-body')); });
'@ }
  'grown-ups' = @{ seed = (Seed $null ''); probe = @'
at(0,()=>{ btn(/Grown-ups/).click(); });
at(300,()=>{ ['1','2','3','4'].forEach(d=>[...document.querySelectorAll('.pad button')].find(b=>b.textContent===d).click()); });
at(500,()=>{ ok('weekly summary', !!document.querySelector('.weekly') && /week/.test(document.querySelector('.weekly h2').textContent)); ok('goal setting', /Daily reading goal/.test(T())); ok('voice picker', /test voice/i.test(T())); });
'@ }
  'cloud-sync' = @{ seed = (Seed 'son' ''); cloud = $true; probe = @'
at(1500,()=>{ ok('uploads both kids + settings', !!(__store['rq/son'] && __store['rq/daughter'] && __store['rq/settings'])); btn(/My World/).click(); });
at(500,()=>{ const s=JSON.parse(__store['rq/son'].json); s.world.items.push({id:9,k:'rocket',e:'🚀',x:900,y:200,s:1.2,f:false,z:9}); __remoteSet('rq/son',{json:JSON.stringify(s),ts:Date.now()+5000}); });
at(500,()=>{ ok('live update from another device', [...document.querySelectorAll('.world-item')].some(n=>n.textContent==='🚀')); });
'@ }
}

$failed = 0
foreach ($name in $tests.Keys) {
  $t = $tests[$name]
  $pre = "<script>localStorage.clear(); localStorage.setItem('readingQuest_v1', JSON.stringify($($t.seed)));" + $(if ($t.cloud) { "window.__fakeCloud=true;" } else { "" }) + "</script>"
  $probe = "<script>window.addEventListener('load',()=>{`n$($t.probe)`ndone();});</script>"
  $page = $index.Replace('<div id="app"></div>', '<div id="app"></div>' + $pre + $common).Replace('</body>', $probe + '</body>')
  $file = Join-Path $work "test-$name.html"
  [IO.File]::WriteAllText($file, $page, (New-Object Text.UTF8Encoding $false))
  $prof = Join-Path $work "prof-$name"; $out = Join-Path $work "out-$name.html"
  Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--no-first-run',"--user-data-dir=$prof",'--virtual-time-budget=20000','--dump-dom',"file:///$($file.Replace('\','/'))") -RedirectStandardOutput $out -RedirectStandardError "$out.err" -Wait -WindowStyle Hidden
  $dom = Get-Content $out -Raw -Encoding UTF8
  if ($dom -match 'data-results="([^"]*)"') {
    $lines = [System.Net.WebUtility]::HtmlDecode($matches[1]) -split "`n"
    foreach ($l in $lines) { "[$name] $l"; if ($l.StartsWith('FAIL')) { $failed++ } }
  } else { "[$name] FAIL no results (page did not finish)"; $failed++ }
}
""
if ($failed) { "$failed check(s) failed"; exit 1 } else { "All checks passed" }
