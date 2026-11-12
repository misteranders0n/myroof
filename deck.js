"use strict";
/* =========================================================
   MyRoof – Pitch deck (Rodney Webb 10 steps)
   Settings format: "cpe-myroof-settings-1" (saved on the device).
   Per-job deck data lives in job.deck.
   ========================================================= */

// ---------- defaults ----------
const PLATINUM = {
  title: 'Owens Corning® Platinum Protection Roofing System Limited Warranty',
  bullets: [
    'Our highest level of coverage, for the whole Owens Corning® roofing system — not just the shingles',
    'First 50 years: TRU PROtection® coverage for material defects',
    'Workmanship: limited lifetime coverage, reduced after the first 25 years based on the age of the roof',
    'First 15 years: blow-off coverage',
    'First 25 years: StreakGuard® algae resistance (qualifying products)',
    'Installed by an Owens Corning® Platinum Preferred Contractor',
  ],
  foot: 'See the Owens Corning® Platinum Protection Roofing System Limited Warranty for complete terms and limitations.'
};
const DEFAULT_PRODUCTS = [
  {k:'duration', name:'TruDefinition® Duration®', tag:'Architectural shingle', img:null, bullets:[
    'Patented SureNail® Technology — a triple layer of reinforcement in the nailing zone for outstanding grip',
    '130-MPH wind resistance limited warranty',
    'Limited lifetime shingle warranty, for as long as you own your home',
    'StreakGuard® algae resistance',
  ]},
  {k:'flex', name:'TruDefinition® Duration FLEX®', tag:'Class 4 impact-resistant shingle', img:null, bullets:[
    'UL 2218 Class 4 — the highest rating for impact resistance',
    'Flexible shingle withstands expansion and contraction and helps resist cracking and tearing',
    'Patented SureNail® Technology with a 130-MPH wind resistance limited warranty',
    'Limited lifetime shingle warranty',
    'Some insurance companies offer discounts for Class 4 roofs — check with your insurer',
  ]},
  {k:'storm', name:'TruDefinition® Duration STORM®', tag:'Class 4 impact-resistant shingle', img:null, bullets:[
    'UL 2218 Class 4 impact resistance with patented WeatherGuard® Technology',
    'Patented SureNail® Technology with a 130-MPH wind resistance limited warranty',
    'Limited lifetime shingle warranty',
    'StreakGuard® protection with a 25-year algae resistance limited warranty',
    'Matching Class 4 hip & ridge shingles complete the impact-resistant roof system',
    'Some insurance companies offer discounts for Class 4 roofs — check with your insurer',
  ]},
];
const DEFAULT_PLANS = [
  {id:'p12',  term:12,  rate:0,    factor:1/12, plan:'2012', label:'No interest / no payments', show:true},
  {id:'p18',  term:18,  rate:0,    factor:1/18, plan:'1018', label:'No interest / with payments', show:false},
  {id:'p60',  term:60,  rate:9.99, factor:0.0212, plan:'4212', label:'', show:true},
  {id:'p120', term:120, rate:8.99, factor:0.0126, plan:'4126', label:'', show:false},
  {id:'p144', term:144, rate:9.99, factor:0.0119, plan:'4119', label:'', show:true},
  {id:'p180', term:180, rate:9.99, factor:0.0107, plan:'4107', label:'', show:false},
];
const DEFAULT_NEXT = [
  'Sign the contract so we can get your project on the schedule',
  'We order your materials and confirm colors with you',
  'Your project manager calls to set the install date',
  'Installation, cleanup and magnetic sweep',
  'Final walk-through and warranty registration',
];
function defaultSettings(){
  return {format:'cpe-myroof-settings-1', rep:{name:'',phone:'',email:''},
    story:[], products:JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)), warranty:JSON.parse(JSON.stringify(PLATINUM)),
    plans:JSON.parse(JSON.stringify(DEFAULT_PLANS)), nextSteps:[...DEFAULT_NEXT], ccToken:''};
}
let settings = null;
async function loadSettings(){
  settings = await store.getSettings();
  if(!settings){ settings = defaultSettings(); await store.putSettings(settings); }
  return settings;
}
function saveSettings(){ return store.putSettings(settings); }
const money = n => (n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const money0 = n => (n<0?'-':'')+'$'+Math.round(Math.abs(n)).toLocaleString('en-US');
const num = v => { const n=parseFloat(String(v).replace(/[$,\s]/g,'')); return isFinite(n)?n:0; };

// ---------- image helpers ----------
function fileToJpeg(file, max=1600, q=0.82){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file); const img=new Image();
    img.onload=()=>{ let w=img.naturalWidth,h=img.naturalHeight; const r=Math.min(1,max/Math.max(w,h)); w=Math.round(w*r); h=Math.round(h*r);
      const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',q)); };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src=url;
  });
}
function blobToJpeg(blob,max,q){ return fileToJpeg(blob,max,q); }
let pdfjsReady=null;
function loadPdfJs(){
  if(pdfjsReady) return pdfjsReady;
  pdfjsReady = new Promise((res,rej)=>{
    if(window.pdfjsLib) return res(window.pdfjsLib);
    const s=document.createElement('script'); s.src='vendor/pdf.min.js';
    s.onload=()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror=()=>rej(new Error('pdf.js failed to load')); document.head.appendChild(s);
  });
  return pdfjsReady;
}
async function pdfToSlides(file, onProgress){
  const lib=await loadPdfJs(); const doc=await lib.getDocument({data:await file.arrayBuffer()}).promise; const out=[];
  for(let i=1;i<=doc.numPages;i++){
    const page=await doc.getPage(i); const vp0=page.getViewport({scale:1}); const scale=1600/Math.max(vp0.width,vp0.height);
    const vp=page.getViewport({scale}); const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
    await page.render({canvasContext:c.getContext('2d'), viewport:vp}).promise;
    out.push({img:c.toDataURL('image/jpeg',0.85)}); onProgress && onProgress(i,doc.numPages);
  }
  return out;
}

// =========================================================
// SETTINGS SCREEN
// =========================================================
async function openSettings(){ await loadSettings(); renderSettings(); show('sSettings'); }
function renderSettings(){
  const S=settings; const b=$('settingsBody');
  b.innerHTML = `
  <div class="card"><h2>You</h2><p class="mute">Shown on the deck cover.</p>
    <div class="row"><div><label>Name</label><input id="stRepName" value="${esc(S.rep.name)}"></div>
    <div><label>Phone</label><input id="stRepPhone" value="${esc(S.rep.phone)}" inputmode="tel"></div>
    <div><label>Email</label><input id="stRepEmail" value="${esc(S.rep.email)}" inputmode="email"></div></div></div>

  <div class="card"><h2>Company Story (Step 4)</h2>
    <p class="mute">In PowerPoint, export Company Story as a PDF (File → Export → PDF), then load it here. Load it again any time you update the PowerPoint.</p>
    <div class="row"><button class="primary" id="stStory">Load Company Story PDF</button>${S.story.length?`<button id="stStoryClear">Remove</button>`:''}</div>
    <input type="file" id="stStoryFile" accept="application/pdf,image/*" multiple hidden>
    <p class="note" id="stStoryInfo">${S.story.length? S.story.length+' slides loaded.' : 'No slides loaded yet.'}</p>
    <div style="display:flex;gap:6px;overflow-x:auto">${S.story.map(s=>`<img src="${s.img}" style="height:70px;border:1px solid var(--line);border-radius:6px">`).join('')}</div></div>

  <div class="card"><h2>Shingle lines (Step 6)</h2><p class="mute">Duration is the base option. Each job picks FLEX or STORM as the Class 4 upgrade. Add a product photo if you have one.</p>
    ${S.products.map((p,i)=>`<div style="border-top:1px solid var(--line);padding-top:10px;margin-top:10px">
      <div class="row"><div><label>Name</label><input data-pn="${i}" value="${esc(p.name)}"></div><div><label>Tagline</label><input data-pt="${i}" value="${esc(p.tag)}"></div></div>
      <label>Features (one per line)</label><textarea data-pb="${i}" rows="5" style="width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:9px">${esc(p.bullets.join('\n'))}</textarea>
      <div class="row" style="align-items:center;margin-top:6px">${p.img?`<img src="${p.img}" style="max-height:60px;flex:0 0 auto;border-radius:6px">`:''}
      <button data-pimg="${i}">${p.img?'Change photo':'Add product photo'}</button>${p.img?`<button data-pimgx="${i}">Remove photo</button>`:''}</div></div>`).join('')}
    <input type="file" id="stProdFile" accept="image/*" hidden></div>

  <div class="card"><h2>Warranty slide</h2>
    <label>Title</label><input id="stWTitle" value="${esc(S.warranty.title)}">
    <label>Coverage (one per line)</label><textarea id="stWBul" rows="6" style="width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:9px">${esc(S.warranty.bullets.join('\n'))}</textarea>
    <label>Fine print</label><input id="stWFoot" value="${esc(S.warranty.foot)}"></div>

  <div class="card"><h2>Loan plans (Step 8)</h2>
    <p class="mute">Monthly payment = amount financed × factor. Check the plans to show on the close slide and the worksheet.</p>
    <table><tr><th>Show</th><th>Months</th><th>Rate %</th><th>Factor</th><th>Plan #</th><th>Note</th><th></th></tr>
    ${S.plans.map((p,i)=>`<tr><td><input type="checkbox" data-ls="${i}" ${p.show?'checked':''} style="width:22px;min-height:22px"></td>
      <td><input data-lt="${i}" value="${p.term}" inputmode="numeric" style="min-width:60px"></td>
      <td><input data-lr="${i}" value="${p.rate}" inputmode="decimal" style="min-width:60px"></td>
      <td><input data-lf="${i}" value="${+p.factor.toFixed(6)}" inputmode="decimal" style="min-width:80px"></td>
      <td><input data-lp="${i}" value="${esc(p.plan)}" style="min-width:60px"></td>
      <td><input data-ll="${i}" value="${esc(p.label)}" style="min-width:140px"></td>
      <td><button data-lx="${i}" title="Remove">✕</button></td></tr>`).join('')}</table>
    <button id="stPlanAdd" style="margin-top:8px">+ Add plan</button>
    <p class="note">For the no-interest plans, the factor is 1 ÷ months (12 months = 0.083333). The slide shows that as the monthly amount to pay it off in that time.</p></div>

  <div class="card"><h2>Next steps (Step 9)</h2><label>One per line</label>
    <textarea id="stNext" rows="5" style="width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:9px">${esc(S.nextSteps.join('\n'))}</textarea></div>

  <div class="card"><h2>CompanyCam</h2>
    <p class="mute">Lets the deck pull home photos from a job's CompanyCam project. Get a token on a computer: CompanyCam web → your user icon → Access Tokens → New Token → copy. It's saved on this device only.</p>
    <label>Access token</label><input id="stCC" type="password" value="${esc(S.ccToken)}" autocomplete="off">
    <button id="stCCTest" style="margin-top:8px">Test connection</button> <span class="mute" id="stCCMsg"></span></div>

  <div class="card"><h2>Share settings</h2><p class="mute">Saves everything above except your CompanyCam token, so another rep can load it.</p>
    <div class="row"><button id="stExport">Save settings file</button><button id="stImport">Load settings file…</button><button id="stReset">Reset products &amp; plans to defaults</button></div>
    <input type="file" id="stImportFile" accept=".json,application/json" hidden></div>
  <div class="row" style="margin-bottom:30px"><button class="primary" id="stSave">Save settings</button></div>`;

  // wiring
  $('stStory').onclick=()=>$('stStoryFile').click();
  $('stStoryFile').onchange=async e=>{
    const files=[...e.target.files]; e.target.value=''; if(!files.length) return;
    collectSettings();   // keep anything typed on this screen
    const info=$('stStoryInfo');
    try{
      let slides=[];
      for(const f of files){
        if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)) slides=slides.concat(await pdfToSlides(f,(i,n)=>info.textContent=`Reading slide ${i} of ${n}…`));
        else slides.push({img:await fileToJpeg(f,1600,0.85)});
      }
      settings.story=slides; await saveSettings(); toast(slides.length+' Company Story slides loaded'); renderSettings();
    }catch(err){ info.textContent='Could not read that file. Export the PowerPoint as a PDF and try again.'; }
  };
  if($('stStoryClear')) $('stStoryClear').onclick=async()=>{ collectSettings(); settings.story=[]; await saveSettings(); renderSettings(); };
  let prodIdx=0;
  b.querySelectorAll('[data-pimg]').forEach(x=>x.onclick=()=>{ collectSettings(); prodIdx=+x.dataset.pimg; $('stProdFile').click(); });
  b.querySelectorAll('[data-pimgx]').forEach(x=>x.onclick=async()=>{ collectSettings(); settings.products[+x.dataset.pimgx].img=null; await saveSettings(); renderSettings(); });
  $('stProdFile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    settings.products[prodIdx].img=await fileToJpeg(f,1200,0.85); await saveSettings(); renderSettings(); };
  b.querySelectorAll('[data-lx]').forEach(x=>x.onclick=()=>{ collectSettings(); settings.plans.splice(+x.dataset.lx,1); renderSettings(); });
  $('stPlanAdd').onclick=()=>{ collectSettings(); settings.plans.push({id:uid(),term:60,rate:0,factor:0,plan:'',label:'',show:false}); renderSettings(); };
  $('stCCTest').onclick=async()=>{ collectSettings(); const m=$('stCCMsg'); m.textContent='Checking…';
    try{ const r=await ccFetch('/projects?per_page=1'); m.textContent= r.ok? '✓ Connected' : `✕ CompanyCam said ${r.status}. Check the token.`; }
    catch(err){ m.textContent='✕ '+ccBlockedMsg(); } };
  $('stExport').onclick=()=>{ collectSettings(); const copy=Object.assign({},settings,{ccToken:''}); saveFile('MyRoof-settings.json', JSON.stringify(copy), 'application/json'); };
  $('stImport').onclick=()=>$('stImportFile').click();
  $('stImportFile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    try{ const s=JSON.parse(await f.text()); if(s.format!=='cpe-myroof-settings-1') throw 0; s.ccToken=settings.ccToken; settings=Object.assign(defaultSettings(),s); await saveSettings(); renderSettings(); toast('Settings loaded'); }
    catch(_){ toast('That is not a MyRoof settings file'); } };
  $('stReset').onclick=async()=>{ const r=await modal('<h3>Reset to defaults?</h3><p>Shingle lines, warranty text, loan plans and next steps go back to the starting values. Company Story slides and your token stay.</p>',[{t:'Cancel'},{t:'Reset',cls:'primary',v:1}]);
    if(!r.v) return; const d=defaultSettings(); Object.assign(settings,{products:d.products,warranty:d.warranty,plans:d.plans,nextSteps:d.nextSteps}); await saveSettings(); renderSettings(); };
  $('stSave').onclick=async()=>{ collectSettings(); await saveSettings(); toast('Settings saved'); };
}
function collectSettings(){
  const b=$('settingsBody'); const S=settings; if(!$('stRepName')) return;
  S.rep={name:$('stRepName').value.trim(), phone:$('stRepPhone').value.trim(), email:$('stRepEmail').value.trim()};
  S.products.forEach((p,i)=>{ p.name=b.querySelector(`[data-pn="${i}"]`).value; p.tag=b.querySelector(`[data-pt="${i}"]`).value;
    p.bullets=b.querySelector(`[data-pb="${i}"]`).value.split('\n').map(x=>x.trim()).filter(Boolean); });
  S.warranty={title:$('stWTitle').value, bullets:$('stWBul').value.split('\n').map(x=>x.trim()).filter(Boolean), foot:$('stWFoot').value};
  S.plans.forEach((p,i)=>{ p.show=b.querySelector(`[data-ls="${i}"]`).checked; p.term=parseInt(b.querySelector(`[data-lt="${i}"]`).value)||0;
    p.rate=num(b.querySelector(`[data-lr="${i}"]`).value); p.factor=num(b.querySelector(`[data-lf="${i}"]`).value);
    p.plan=b.querySelector(`[data-lp="${i}"]`).value.trim(); p.label=b.querySelector(`[data-ll="${i}"]`).value.trim(); });
  S.nextSteps=$('stNext').value.split('\n').map(x=>x.trim()).filter(Boolean);
  S.ccToken=$('stCC').value.trim();
}

// =========================================================
// COMPANYCAM
// =========================================================
function ccFetch(path){
  return fetch('https://api.companycam.com/v2'+path,{headers:{Authorization:'Bearer '+settings.ccToken, Accept:'application/json'}});
}
function ccBlockedMsg(){ return 'Could not reach CompanyCam from this app (no signal, or CompanyCam blocked it). You can save photos to the iPad from CompanyCam and use “Add from iPad”.'; }
async function ccPicker(){
  if(!settings.ccToken){ toast('Add your CompanyCam token in Settings first'); return; }
  const q = [job.address, job.name].filter(Boolean)[0] || '';
  const r1 = await modal(`<h3>Find the CompanyCam project</h3><label>Search by address or name</label><input data-f="q" value="${esc(q)}">`,[{t:'Cancel'},{t:'Search',cls:'primary',v:1}]);
  if(!r1.v) return;
  let projects;
  try{ const r=await ccFetch('/projects?per_page=25&query='+encodeURIComponent(r1.vals.q)); if(!r.ok) throw new Error(r.status); projects=await r.json(); }
  catch(err){ toast(String(err.message).match(/^\d+$/)?'CompanyCam said '+err.message+' — check the token':ccBlockedMsg()); return; }
  if(!projects.length){ toast('No CompanyCam projects matched'); return; }
  const pick = await new Promise(res=>{
    const box=$('mbox'); $('modal').classList.add('on');
    box.innerHTML='<h3>Pick the project</h3>'+projects.map((p,i)=>`<button data-i="${i}" style="display:block;width:100%;text-align:left;margin:6px 0">${esc(p.name||'Project')}<br><span class="mute">${esc([p.address&&p.address.street_address_1,p.address&&p.address.city].filter(Boolean).join(', '))}</span></button>`).join('')+'<div class="acts"><button data-x>Cancel</button></div>';
    box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{ $('modal').classList.remove('on'); res(projects[+b.dataset.i]); });
    box.querySelector('[data-x]').onclick=()=>{ $('modal').classList.remove('on'); res(null); };
  });
  if(!pick) return;
  let photos;
  try{ const r=await ccFetch(`/projects/${pick.id}/photos?per_page=100`); if(!r.ok) throw new Error(r.status); photos=await r.json(); }
  catch(err){ toast(ccBlockedMsg()); return; }
  if(!photos.length){ toast('That project has no photos'); return; }
  const uri=(p,t)=>{ const u=(p.uris||[]).find(x=>x.type===t); return u&&(u.uri||u.url); };
  const chosen = await new Promise(res=>{
    const sel=new Set(); const box=$('mbox'); $('modal').classList.add('on');
    box.innerHTML='<h3>Tap photos to add</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px">'+
      photos.map((p,i)=>`<img data-i="${i}" src="${esc(uri(p,'thumbnail')||uri(p,'web'))}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:3px solid transparent">`).join('')+
      '</div><div class="acts"><button data-x>Cancel</button><button class="primary" data-ok>Add selected</button></div>';
    box.querySelectorAll('img[data-i]').forEach(im=>im.onclick=()=>{ const i=+im.dataset.i; if(sel.has(i)){sel.delete(i);im.style.borderColor='transparent';} else {sel.add(i);im.style.borderColor='#e8762b';} });
    box.querySelector('[data-x]').onclick=()=>{ $('modal').classList.remove('on'); res([]); };
    box.querySelector('[data-ok]').onclick=()=>{ $('modal').classList.remove('on'); res([...sel].map(i=>photos[i])); };
  });
  if(!chosen.length) return;
  let added=0, failed=0;
  for(const p of chosen){
    try{ const r=await fetch(uri(p,'web')||uri(p,'original')); const img=await blobToJpeg(await r.blob(),1600,0.82);
      deckData().photos.push({id:uid(), img, caption:p.description||''}); added++; toast(`Downloading ${added}/${chosen.length}…`); }
    catch(_){ failed++; }
  }
  save(); renderDeck();
  toast(failed? `${added} added, ${failed} couldn't download` : `${added} photo${added>1?'s':''} added`);
}

// =========================================================
// DECK PREP (per job)
// =========================================================
function deckData(){
  if(!job.deck) job.deck = {email:'', warm:{personality:'',decision:'',budget:'',timeline:'',today:'',notes:''},
    photos:[], upgrade:'flex', prices:{base:'',upgrade:''}, addons:[], down:'', referral:'', selected:'base', colors:'', presented:null};
  return job.deck;
}
async function openDeck(){ await loadSettings(); deckData(); $('dTitle').innerHTML='Deck<small>'+esc(job.name)+'</small>'; renderDeck(); show('sDeck'); }
function renderDeck(){
  const D=deckData(); const S=settings; const b=$('deckBody'); const M=measure(job);
  const up=S.products.find(p=>p.k===D.upgrade)||S.products[1];
  const checks=[];
  if(!S.story.length) checks.push('Company Story slides aren\'t loaded (Settings).');
  if(!M.k||!M.planes.length) checks.push('Roof isn\'t measured yet — the measurements slide will be skipped.');
  if(!num(D.prices.base)) checks.push('Enter the Duration total from AccuLynx.');
  if(!num(D.prices.upgrade)) checks.push('Enter the Class 4 total from AccuLynx.');
  if(!D.photos.length) checks.push('No home photos yet.');
  const W=D.warm;
  b.innerHTML = `
  ${checks.length?`<div class="warnbox"><b>Before you present:</b><ul style="margin:6px 0 0 18px;padding:0">${checks.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div>`:'<div class="okbox">Ready to present.</div>'}
  <div class="card"><h2>Warm-up notes (Steps 1–2)</h2><p class="mute">For you only — these show up in your presenter notes at the pre-close.</p>
    <div class="row"><div><label>Personality type</label><input data-w="personality" value="${esc(W.personality)}"></div>
    <div><label>Decision makers / all here?</label><input data-w="decision" value="${esc(W.decision)}"></div></div>
    <div class="row"><div><label>Budget</label><input data-w="budget" value="${esc(W.budget)}"></div>
    <div><label>Timeline</label><input data-w="timeline" value="${esc(W.timeline)}"></div>
    <div><label>Yes or no today?</label><input data-w="today" value="${esc(W.today)}"></div></div>
    <label>Why now / what they care about</label><input data-w="notes" value="${esc(W.notes)}">
    <label>Client email (for the financing worksheet)</label><input id="dEmail" value="${esc(D.email)}" inputmode="email"></div>

  <div class="card"><h2>Home photos (Step 6)</h2>
    <div class="row"><button id="dAddPh">Add from iPad</button><button id="dCC" ${S.ccToken?'':'disabled'}>From CompanyCam</button></div>
    ${S.ccToken?'':'<p class="note">Add a CompanyCam token in Settings to pull photos from CompanyCam.</p>'}
    <input type="file" id="dPhFile" accept="image/*" multiple hidden>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px">
    ${D.photos.map((p,i)=>`<div><img src="${p.img}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px">
      <input data-cap="${i}" value="${esc(p.caption)}" placeholder="Caption (optional)" style="margin-top:4px">
      <div class="row" style="gap:4px;margin-top:4px"><button data-up="${i}" ${i?'':'disabled'}>◀</button><button data-dn="${i}" ${i<D.photos.length-1?'':'disabled'}>▶</button><button data-rm="${i}">✕</button></div></div>`).join('')}
    </div><p class="note">Show only what's actually on the roof.</p></div>

  <div class="card"><h2>Options (Step 8)</h2><p class="mute">Totals from the AccuLynx estimate.</p>
    <div class="row"><div><label>${esc(S.products[0].name)} total</label><input id="dBase" value="${esc(D.prices.base)}" inputmode="decimal" placeholder="$"></div>
      <div><label>Class 4 upgrade</label><select id="dUp">${S.products.slice(1).map(p=>`<option value="${p.k}" ${p.k===D.upgrade?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div><label>${esc(up.name)} total</label><input id="dUpP" value="${esc(D.prices.upgrade)}" inputmode="decimal" placeholder="$"></div></div>
    <h3 style="margin:14px 0 4px;font-size:15px">Add-on scopes</h3><p class="mute">Shed roof, gutters, etc. The homeowner can check these in or out on the close slide.</p>
    ${D.addons.map((a,i)=>`<div class="row" style="align-items:end"><div><label>Scope</label><input data-an="${i}" value="${esc(a.name)}"></div>
      <div style="max-width:150px"><label>Price</label><input data-ap="${i}" value="${esc(a.price)}" inputmode="decimal"></div>
      <div style="max-width:120px"><label>Start checked</label><select data-ao="${i}"><option value="1" ${a.on?'selected':''}>Yes</option><option value="0" ${a.on?'':'selected'}>No</option></select></div>
      <div style="max-width:60px"><button data-ax="${i}">✕</button></div></div>`).join('')}
    <button id="dAddOn" style="margin-top:8px">+ Add scope</button>
    <div class="row" style="margin-top:10px"><div><label>Down payment</label><input id="dDown" value="${esc(D.down)}" inputmode="decimal" placeholder="$0"></div>
      <div><label>Referral discount</label><input id="dRef" value="${esc(D.referral)}" inputmode="decimal" placeholder="$0"></div></div></div>

  <div class="card"><h2>Selections (Step 9)</h2><label>Colors and other selections</label><input id="dColors" value="${esc(D.colors)}" placeholder="e.g. Shingle: Onyx Black · Drip edge: Black"></div>
  <div class="row" style="margin-bottom:30px"><button class="primary" id="dSave">Save</button><button class="primary" id="dPresent2" style="background:#ffde40;border-color:#ffde40;color:#111">▶ Present</button></div>`;

  const sync=()=>{ collectDeck(); save(); };
  b.querySelectorAll('input,select').forEach(el=>el.addEventListener('change',sync));
  $('dAddPh').onclick=()=>$('dPhFile').click();
  $('dPhFile').onchange=async e=>{ const files=[...e.target.files]; e.target.value=''; collectDeck();
    for(const f of files){ try{ D.photos.push({id:uid(), img:await fileToJpeg(f), caption:''}); }catch(_){ } }
    save(); renderDeck(); };
  $('dCC').onclick=()=>{ collectDeck(); ccPicker(); };
  b.querySelectorAll('[data-rm]').forEach(x=>x.onclick=()=>{ collectDeck(); D.photos.splice(+x.dataset.rm,1); save(); renderDeck(); });
  b.querySelectorAll('[data-up]').forEach(x=>x.onclick=()=>{ collectDeck(); const i=+x.dataset.up; [D.photos[i-1],D.photos[i]]=[D.photos[i],D.photos[i-1]]; save(); renderDeck(); });
  b.querySelectorAll('[data-dn]').forEach(x=>x.onclick=()=>{ collectDeck(); const i=+x.dataset.dn; [D.photos[i+1],D.photos[i]]=[D.photos[i],D.photos[i+1]]; save(); renderDeck(); });
  b.querySelectorAll('[data-ax]').forEach(x=>x.onclick=()=>{ collectDeck(); D.addons.splice(+x.dataset.ax,1); save(); renderDeck(); });
  $('dAddOn').onclick=()=>{ collectDeck(); D.addons.push({id:uid(),name:'',price:'',on:false}); save(); renderDeck(); };
  $('dUp').onchange=()=>{ collectDeck(); save(); renderDeck(); };
  $('dSave').onclick=()=>{ collectDeck(); save(); toast('Saved'); renderDeck(); };
  $('dPresent2').onclick=()=>{ collectDeck(); save(); startPresent(); };
}
function collectDeck(){
  const D=deckData(); const b=$('deckBody'); if(!$('dBase')) return;
  b.querySelectorAll('[data-w]').forEach(el=>D.warm[el.dataset.w]=el.value);
  D.email=$('dEmail').value.trim();
  b.querySelectorAll('[data-cap]').forEach(el=>{ const p=D.photos[+el.dataset.cap]; if(p) p.caption=el.value; });
  D.prices.base=$('dBase').value; D.prices.upgrade=$('dUpP').value; D.upgrade=$('dUp').value;
  D.addons.forEach((a,i)=>{ a.name=b.querySelector(`[data-an="${i}"]`).value; a.price=b.querySelector(`[data-ap="${i}"]`).value; a.on=b.querySelector(`[data-ao="${i}"]`).value==='1'; });
  D.down=$('dDown').value; D.referral=$('dRef').value; D.colors=$('dColors').value;
}

// =========================================================
// MONEY MATH (Step 8)
// =========================================================
function closeMath(D, which, addonState){
  const optPrice = num(which==='upgrade'?D.prices.upgrade:D.prices.base);
  const addons = D.addons.filter(a=>a.name||num(a.price)).map(a=>({...a, on: addonState? !!addonState[a.id] : !!a.on}));
  const addTotal = addons.filter(a=>a.on).reduce((s,a)=>s+num(a.price),0);
  const total = optPrice + addTotal;
  const referral = num(D.referral), down = num(D.down);
  const financed = Math.max(0, total - referral - down);
  const plans = settings.plans.filter(p=>p.show && p.factor>0).sort((a,b)=>a.term-b.term)
    .map(p=>({...p, payment: Math.round(financed*p.factor*100)/100}));
  return {optPrice, addons, addTotal, total, referral, down, financed, plans};
}
function planLabel(p){   // short, fits one line on the worksheet
  return p.rate ? `${p.term} months - ${(+p.rate).toFixed(2)}%` : `${p.term} mo - ${(p.label||'no interest').replace(/\s*\/\s*/g,'/')}`;
}

// =========================================================
// PRESENTER
// =========================================================
let pres = null;   // {slides, i, notes, addonState, sel}
function buildSlides(){
  const D=deckData(), S=settings, M=measure(job), W=D.warm;
  const up=S.products.find(p=>p.k===D.upgrade)||S.products[1]; const base=S.products[0];
  const warmNote = `Warm-up answers — Personality: ${W.personality||'—'} · Decision makers: ${W.decision||'—'} · Budget: ${W.budget||'—'} · Timeline: ${W.timeline||'—'} · Yes/no today: ${W.today||'—'}${W.notes?' · Why now: '+W.notes:''}`;
  const sl=[];
  sl.push({step:'', kind:'cover', notes:'Re-bond before you start — every time you break contact, warm up again.'});
  S.story.forEach((s,i)=>sl.push({step:'Step 4 · Our Company', kind:'image', img:s.img,
    notes: i===0 ? 'Company Story: tell them, show them, back it up. It\'s about the company, not you. Never show price or talk product here.' : 'Tell them · Show them · Back it up.'}));
  if(!S.story.length) sl.push({step:'Step 4 · Our Company', kind:'title', title:'About CoMo Premium Exteriors', sub:'(Load Company Story slides in Settings)', notes:'Company Story — tell them, show them, back it up.'});
  sl.push({step:'Step 5 · Installation', kind:'title', title:'How We\'ll Install Your Roof', sub:'From contract to final walk-through',
    notes:'ROOF IN A BAG: pull each part out as you explain it, tear-off to final inspection. Help them understand everything that will happen. Eliminates "we need to think about it" and justifies the price.'});
  if(D.photos.length){
    for(let i=0;i<D.photos.length;i+=4) sl.push({step:'Step 6 · Your Home', kind:'photos', photos:D.photos.slice(i,i+4),
      notes:'Show them their home. Remind them how long they\'ve been thinking about this. Use the laser pointer. Show only what\'s actually there.'});
  }
  if(M.k && M.planes.length) sl.push({step:'Step 6 · Your Roof', kind:'measure', notes:'Walk the drawing: total squares, pitch, where the valleys and penetrations are. These are measured numbers — don\'t round up.'});
  sl.push({step:'Step 6 · Product', kind:'product', p:base, label:'Option 1', notes:'Engage at least 4 senses — put the shingle in their hands. Build the dream.'});
  sl.push({step:'Step 6 · Product', kind:'product', p:up, label:'Option 2', notes:'Class 4 upgrade. Price condition using the contract. Don\'t promise insurance discounts — "check with your insurer."'});
  sl.push({step:'Step 6 · Warranty', kind:'warranty', notes:'The client should be able to say why our cost may be higher.'});
  sl.push({step:'Step 7', kind:'preclose', notes:`PRE-CLOSE: "Other than price or payment, is there any reason we can't get your project started today?"\n• Red light (talk to someone / another quote / not now): softening statement — "Thanks for sharing that with me" — then review Step 1 and Step 6.\n• Yellow light ("not ready", "wait", "different direction"): "Oh really, what makes you say that?"\n• Green light (price, payment, time only): move to Step 8.\n${warmNote}`});
  sl.push({step:'Step 8 · Your Investment', kind:'close', notes:'Show price AND payment together — gives them control and lowers pressure. "Our next step is to sign the contract so we can get your job scheduled." Check in on the dream as you go. Be comfortable with a take-away.'});
  sl.push({step:'Step 9 · Next Steps', kind:'recap', notes:'Review selections, colors and the contract. "Do you have any remaining questions that I haven\'t covered?" Give a commitment, ask for a commitment.'});
  sl.push({step:'', kind:'thanks', notes:'POST-CLOSE: make sure they know what they bought and are happy. Ask: "What made you decide to buy from me today?"'});
  return sl;
}
function startPresent(){
  const D=deckData();
  const addonState={}; D.addons.forEach(a=>addonState[a.id]=!!a.on);
  pres={slides:buildSlides(), i:0, notes:false, addonState, sel:D.selected||'base'};
  const el=$('present'); el.hidden=false; document.body.style.overflow='hidden';
  try{ if(el.requestFullscreen) el.requestFullscreen().catch(()=>{}); }catch(_){}
  renderPresent();
}
function endPresent(){
  const el=$('present'); el.hidden=true; el.innerHTML=''; document.body.style.overflow='';
  try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(_){}
  const D=deckData(); D.selected=pres.sel; D.addons.forEach(a=>a.on=!!pres.addonState[a.id]); save(); pres=null; renderDeck();
}
function slideHTML(s){
  const D=deckData(), S=settings;
  const head = s.step? `<div class="ps-step">${esc(s.step)}</div>` : '';
  if(s.kind==='cover'){
    const addr=[job.address,job.city,job.state].filter(Boolean).join(', ');
    return `<div class="ps ps-cover"><img src="logo.png" class="ps-logo-big"><div class="ps-cover-for">Prepared for</div><div class="ps-cover-name">${esc(job.name)}</div><div class="ps-cover-addr">${esc(addr)}</div>
      <div class="ps-cover-rep">${esc([S.rep.name,S.rep.phone].filter(Boolean).join(' · '))}<br>${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div></div>`;
  }
  if(s.kind==='image') return `<div class="ps ps-img">${head}<img src="${s.img}"></div>`;
  if(s.kind==='title') return `<div class="ps ps-title">${head}<img src="logo.png" class="ps-logo"><h1>${esc(s.title)}</h1><p>${esc(s.sub||'')}</p></div>`;
  if(s.kind==='photos') return `<div class="ps ps-photos">${head}<h2>Your Home</h2><div class="ps-grid n${s.photos.length}">${s.photos.map(p=>`<figure><img src="${p.img}">${p.caption?`<figcaption>${esc(p.caption)}</figcaption>`:''}</figure>`).join('')}</div></div>`;
  if(s.kind==='measure'){
    const M=measure(job), T=M.byType;
    const pitches=Object.entries(M.byPitch).filter(([p])=>p!=='none').sort((a,b)=>b[1]-a[1]).map(([p])=>p+'/12').join(', ');
    const items=PEN_TYPES.filter(t=>M.pens[t.k]).map(t=>`${M.pens[t.k]} ${t.n.toLowerCase()}${M.pens[t.k]>1&&!/s$/.test(t.n)?'s':''}`).join(' · ');
    return `<div class="ps ps-measure">${head}<h2>Your Roof</h2><div class="ps-mgrid"><div class="ps-draw">${diagramSVG(M,{client:true})}</div>
      <div class="ps-facts"><div><b>${fmt2(M.area/100)}</b><span>squares (${fmt0(M.area)} sq ft)</span></div>
      <div><b>${M.planes.length}</b><span>roof planes · ${esc(pitches||'—')}</span></div>
      <div><b>${fmt0(T.ridge.len+T.hip.len)} LF</b><span>ridge &amp; hip</span></div>
      <div><b>${fmt0(T.valley.len)} LF</b><span>valleys</span></div>
      <div><b>${fmt0(T.eave.len+T.rake.len)} LF</b><span>eaves &amp; rakes</span></div>
      ${items?`<div class="ps-items">${esc(items)}</div>`:''}</div></div></div>`;
  }
  if(s.kind==='product'){
    const p=s.p;
    return `<div class="ps ps-product">${head}<div class="ps-opt">${esc(s.label)}</div><h2>${esc(p.name)}</h2><div class="ps-tag">${esc(p.tag)}</div>
      <div class="ps-pgrid">${p.img?`<img src="${p.img}">`:''}<ul>${p.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
  }
  if(s.kind==='warranty'){ const w=S.warranty;
    return `<div class="ps ps-warranty">${head}<h2>${esc(w.title)}</h2><ul>${w.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="ps-fine">${esc(w.foot)}</div></div>`; }
  if(s.kind==='preclose'){
    const up=S.products.find(p=>p.k===D.upgrade)||S.products[1];
    const scopes=D.addons.filter(a=>a.name).map(a=>a.name);
    return `<div class="ps ps-title">${head}<img src="logo.png" class="ps-logo"><h1>Your Project</h1>
      <p>Complete Owens Corning® roof system<br>${esc(S.products[0].name)} or ${esc(up.name)}${scopes.length?'<br>Also available: '+esc(scopes.join(', ')):''}</p></div>`;
  }
  if(s.kind==='close') return closeSlideHTML(head);
  if(s.kind==='recap'){
    const m=closeMath(D,pres.sel,pres.addonState); const prod=pres.sel==='upgrade'?(S.products.find(p=>p.k===D.upgrade)||S.products[1]):S.products[0];
    return `<div class="ps ps-recap">${head}<h2>Your Selections</h2><div class="ps-rgrid"><div>
      <div class="ps-rrow"><span>Roof</span><b>${esc(prod.name)}</b></div>
      ${m.addons.filter(a=>a.on).map(a=>`<div class="ps-rrow"><span>Added</span><b>${esc(a.name)}</b></div>`).join('')}
      ${D.colors?`<div class="ps-rrow"><span>Selections</span><b>${esc(D.colors)}</b></div>`:''}
      <div class="ps-rrow"><span>Warranty</span><b>Platinum Protection</b></div></div>
      <div><h3>What happens next</h3><ol>${S.nextSteps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div></div></div>`;
  }
  if(s.kind==='thanks') return `<div class="ps ps-cover"><img src="logo.png" class="ps-logo-big"><div class="ps-cover-name">Thank you!</div><div class="ps-cover-addr">Done Right. Backed For Life.</div></div>`;
  return '<div class="ps"></div>';
}
function closeSlideHTML(head){
  const D=deckData(), S=settings;
  const up=S.products.find(p=>p.k===D.upgrade)||S.products[1];
  const cols=[{k:'base',p:S.products[0],m:closeMath(D,'base',pres.addonState)},{k:'upgrade',p:up,m:closeMath(D,'upgrade',pres.addonState)}];
  const addons=cols[0].m.addons;
  return `<div class="ps ps-close">${head}<h2>Your Investment</h2>
    <div class="ps-cgrid">${cols.map(c=>`<button class="ps-col ${pres.sel===c.k?'on':''}" data-sel="${c.k}">
      <div class="ps-opt">${c.k==='base'?'Option 1':'Option 2'}</div><div class="ps-cname">${esc(c.p.name)}</div>
      <div class="ps-ctotal">${money0(c.m.total)}</div>
      ${c.m.referral?`<div class="ps-cline">Referral discount −${money0(c.m.referral)}</div>`:''}
      ${c.m.down?`<div class="ps-cline">Down payment −${money0(c.m.down)}</div>`:''}
      <div class="ps-cline">Amount financed <b>${money0(c.m.financed)}</b></div>
      <div class="ps-pays">${c.m.plans.map(p=>`<div><span>${p.rate?p.term+' mo · '+(+p.rate).toFixed(2)+'%':p.term+' mo · no interest'}</span><b>${money0(p.payment)}/mo</b></div>`).join('')}</div>
    </button>`).join('')}</div>
    ${addons.length?`<div class="ps-addons">${addons.map(a=>`<button class="ps-add ${a.on?'on':''}" data-add="${a.id}"><span>${a.on?'☑':'☐'}</span> ${esc(a.name)} <b>+${money0(num(a.price))}</b></button>`).join('')}</div>`:''}
    <div class="ps-fine">Payments are estimates, subject to lender approval.${S.plans.some(p=>p.show&&!p.rate)?' No-interest amounts show the monthly amount to pay the balance off within the promotional period.':''}</div>
    <div class="ps-wsrow"><button class="ps-ws" data-ws>✉ Email financing worksheet</button></div></div>`;
}
function renderPresent(){
  const el=$('present'); const s=pres.slides[pres.i];
  el.innerHTML = `<div class="ps-stage"><div class="ps-frame" id="psFrame">${slideHTML(s)}</div></div>
    <button class="ps-nav ps-prev" ${pres.i?'':'disabled'} aria-label="Back">‹</button>
    <button class="ps-nav ps-next" ${pres.i<pres.slides.length-1?'':'disabled'} aria-label="Next">›</button>
    <button class="ps-x" aria-label="Exit">✕</button>
    <button class="ps-nbtn" aria-label="Notes">✎</button>
    <div class="ps-count">${pres.i+1} / ${pres.slides.length}</div>
    ${pres.notes?`<div class="ps-notes">${esc(s.notes||'').replace(/\n/g,'<br>')}</div>`:''}`;
  fitFrame();
  el.querySelector('.ps-prev').onclick=()=>go(-1);
  el.querySelector('.ps-next').onclick=()=>go(1);
  el.querySelector('.ps-x').onclick=endPresent;
  el.querySelector('.ps-nbtn').onclick=()=>{ pres.notes=!pres.notes; renderPresent(); };
  el.querySelectorAll('[data-sel]').forEach(b=>b.onclick=()=>{ pres.sel=b.dataset.sel; renderPresent(); });
  el.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ const id=b.dataset.add; pres.addonState[id]=!pres.addonState[id]; renderPresent(); });
  const ws=el.querySelector('[data-ws]'); if(ws) ws.onclick=()=>sendWorksheet();
  // swipe
  const st=el.querySelector('.ps-stage'); let x0=null;
  st.addEventListener('touchstart',e=>{ x0=e.touches[0].clientX; },{passive:true});
  st.addEventListener('touchend',e=>{ if(x0==null) return; const dx=e.changedTouches[0].clientX-x0; if(Math.abs(dx)>60) go(dx<0?1:-1); x0=null; });
}
function go(d){ const n=pres.i+d; if(n<0||n>=pres.slides.length) return; pres.i=n; renderPresent(); }
function fitFrame(){
  const f=$('psFrame'); if(!f) return; const W=window.innerWidth, H=window.innerHeight;
  const s=Math.min(W/1280, H/720); f.style.transform=`translate(-50%,-50%) scale(${s})`;
}
window.addEventListener('resize',()=>{ if(pres) fitFrame(); });
document.addEventListener('keydown',e=>{ if(!pres) return; if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown') go(1); else if(e.key==='ArrowLeft'||e.key==='PageUp') go(-1); else if(e.key==='Escape') endPresent(); else if(e.key==='n') { pres.notes=!pres.notes; renderPresent(); } });

// =========================================================
// FINANCING WORKSHEET (PDF)
// =========================================================
let logoData=null;
async function getLogo(){ if(logoData) return logoData; const r=await fetch('logo.png'); const b=await r.blob();
  logoData=await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(b); }); return logoData; }
async function buildWorksheet(){
  const D=deckData(), S=settings; const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'pt',format:'letter'}); const W=612, L=48, R=W-48; let y=48;
  try{ doc.addImage(await getLogo(),'PNG',L,y,120,75.6); }catch(_){}
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text('Financing Worksheet',R,y+22,{align:'right'});
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),R,y+38,{align:'right'});
  y+=100;
  doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text(job.name||'',L,y); doc.setFont('helvetica','normal');
  doc.text([job.address,job.city,job.state,job.zip].filter(Boolean).join(', '),L,y+15);
  if(S.rep.name) doc.text(`Prepared by ${S.rep.name}${S.rep.phone?'  |  '+S.rep.phone:''}${S.rep.email?'  |  '+S.rep.email:''}`,L,y+30);
  y+=52;
  const up=S.products.find(p=>p.k===D.upgrade)||S.products[1];
  const cols=[{k:'base',p:S.products[0],m:closeMath(D,'base',pres&&pres.addonState)},{k:'upgrade',p:up,m:closeMath(D,'upgrade',pres&&pres.addonState)}];
  const sel=pres?pres.sel:(D.selected||'base');
  const cw=(R-L-16)/2;
  cols.forEach((c,ci)=>{
    const x=L+ci*(cw+16); let yy=y;
    doc.setDrawColor(ci===(sel==='base'?0:1)?20:200); doc.setLineWidth(c.k===sel?2:0.8);
    const boxH = 150 + c.m.addons.length*14 + c.m.plans.length*16;
    doc.roundedRect(x,yy,cw,boxH,6,6);
    yy+=20; doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text((ci?'OPTION 2':'OPTION 1')+(c.k===sel?'  -  SELECTED':''),x+12,yy);
    yy+=16; doc.setFontSize(12); doc.text(doc.splitTextToSize(c.p.name,cw-24),x+12,yy);
    yy+=22; doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const line=(a,b,bold)=>{ doc.setFont('helvetica',bold?'bold':'normal'); doc.text(a,x+12,yy); doc.text(b,x+cw-12,yy,{align:'right'}); yy+=14; };
    line('Roof',money(c.m.optPrice));
    c.m.addons.forEach(a=>line((a.on?'+ ':'  (not included) ')+a.name, a.on?money(num(a.price)):'—'));
    line('Project total',money(c.m.total),true);
    if(c.m.referral) line('Referral discount','-'+money(c.m.referral));
    line('Down payment', c.m.down?'-'+money(c.m.down):money(0));
    line('Amount financed',money(c.m.financed),true);
    yy+=6; doc.setFont('helvetica','bold'); doc.text('Monthly payment options',x+12,yy); yy+=14; doc.setFont('helvetica','normal');
    c.m.plans.forEach(p=>{ doc.setFontSize(9); doc.text(doc.splitTextToSize(planLabel(p),cw-118)[0],x+12,yy); doc.setFontSize(10); doc.text(money(p.payment)+'/mo',x+cw-12,yy,{align:'right'}); yy+=16; });
  });
  y += 170 + cols[0].m.addons.length*14 + cols[0].m.plans.length*16;
  doc.setFontSize(9); doc.setTextColor(90);
  const fine=['Payments are estimates, subject to lender approval.'];
  if(S.plans.some(p=>p.show&&!p.rate)) fine.push('No-interest amounts show the monthly amount needed to pay the balance off within the promotional period.');
  doc.text(doc.splitTextToSize(fine.join(' '),R-L),L,y);
  doc.setTextColor(0); doc.setFontSize(9); doc.text('CoMo Premium Exteriors  |  Done Right. Backed For Life.',W/2,760,{align:'center'});
  return doc.output('blob');
}
async function sendWorksheet(){
  if(!window.jspdf){ toast('Worksheet maker is still loading — try again in a moment'); return; }
  const D=deckData(); const blob=await buildWorksheet();
  const name=`CPE-Financing-Worksheet-${(job.name||'job').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-')}.pdf`;
  const file=new File([blob],name,{type:'application/pdf'});
  if(D.email){ try{ await navigator.clipboard.writeText(D.email); }catch(_){ } }
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file], title:'Financing worksheet', text:'Here is the financing worksheet we went over today.'});
      if(D.email) toast('Pick Mail, then paste the client\'s email (it\'s copied)'); }
    catch(e){ if(e && e.name!=='AbortError') toast('Could not open the share sheet'); }
  } else {
    await saveFile(name, blob, 'application/pdf');
    toast('Worksheet saved — attach it to an email'+(D.email?' to '+D.email:''));
  }
}

// =========================================================
// STYLES + WIRING
// =========================================================
(function css(){
  const st=document.createElement('style'); st.textContent=`
#present{position:fixed;inset:0;background:#000;z-index:40;overflow:hidden;touch-action:pan-y}
.ps-stage{position:absolute;inset:0}
.ps-frame{position:absolute;left:50%;top:50%;width:1280px;height:720px;transform-origin:center center;background:#fff;overflow:hidden}
.ps{position:absolute;inset:0;padding:56px 70px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111}
.ps h1{font-size:60px;margin:10px 0 14px}.ps h2{font-size:44px;margin:4px 0 18px}.ps p{font-size:26px;color:#333}
.ps-step{position:absolute;top:20px;left:70px;font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#111;background:#ffde40;padding:4px 10px;border-radius:4px}
.ps-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#111;color:#fff}
.ps-logo-big{width:420px;margin-bottom:26px}.ps-cover-for{font-size:22px;color:#ffde40;text-transform:uppercase;letter-spacing:.12em}
.ps-cover-name{font-size:58px;font-weight:800;margin:6px 0}.ps-cover-addr{font-size:26px;color:#ddd}.ps-cover-rep{margin-top:30px;font-size:20px;color:#aaa}
.ps-img{padding:0;background:#000}.ps-img img{width:100%;height:100%;object-fit:contain}.ps-img .ps-step{z-index:2}
.ps-title{display:flex;flex-direction:column;justify-content:center;background:linear-gradient(135deg,#fff 60%,#fff6c8)}
.ps-logo{width:200px;position:absolute;right:60px;top:40px}
.ps-grid{display:grid;gap:14px;height:540px}.ps-grid.n1{grid-template-columns:1fr}.ps-grid.n2{grid-template-columns:1fr 1fr}
.ps-grid.n3,.ps-grid.n4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.ps-grid figure{margin:0;position:relative;overflow:hidden;border-radius:10px;background:#eee}.ps-grid img{width:100%;height:100%;object-fit:cover}
.ps-grid figcaption{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);color:#fff;font-size:20px;padding:8px 12px}
.ps-photos h2{margin-bottom:12px}
.ps-mgrid{display:grid;grid-template-columns:1.5fr 1fr;gap:26px;height:540px}.ps-draw svg{width:100%;height:100%;border:1px solid #ddd;border-radius:10px}
.ps-facts{display:flex;flex-direction:column;gap:12px}.ps-facts div{background:#f5f5f5;border-left:6px solid #ffde40;padding:10px 16px;border-radius:6px}
.ps-facts b{display:block;font-size:32px}.ps-facts span{font-size:18px;color:#555}.ps-facts .ps-items{font-size:18px;color:#333;border-left-color:#111}
.ps-opt{display:inline-block;background:#111;color:#ffde40;font-weight:700;font-size:18px;padding:4px 12px;border-radius:4px;margin-top:12px}
.ps-tag{font-size:24px;color:#555;margin:-10px 0 18px}
.ps-pgrid{display:flex;gap:30px;align-items:flex-start}.ps-pgrid img{width:420px;max-height:440px;object-fit:contain;border-radius:10px}
.ps-product ul,.ps-warranty ul{font-size:27px;line-height:1.35;margin:0;padding-left:30px}.ps-product li,.ps-warranty li{margin-bottom:12px}
.ps-warranty h2{font-size:38px;margin-top:30px}.ps-fine{font-size:16px;color:#666;margin-top:14px}
.ps-close h2{margin-bottom:12px;margin-top:20px}
.ps-cgrid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.ps-col{all:unset;cursor:pointer;display:block;border:3px solid #ddd;border-radius:14px;padding:16px 22px;background:#fafafa}
.ps-col.on{border-color:#111;background:#fff8d6;box-shadow:0 0 0 4px #ffde40}
.ps-cname{font-size:26px;font-weight:700;margin:8px 0 4px}.ps-ctotal{font-size:46px;font-weight:800}
.ps-cline{font-size:19px;color:#333;margin-top:2px}.ps-pays{margin-top:10px;border-top:1px solid #ccc;padding-top:8px}
.ps-pays div{display:flex;justify-content:space-between;font-size:22px;padding:3px 0}.ps-pays b{font-size:26px}
.ps-addons{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.ps-add{all:unset;cursor:pointer;border:2px solid #ccc;border-radius:30px;padding:8px 16px;font-size:20px;background:#fff}.ps-add.on{border-color:#111;background:#ffde40}
.ps-wsrow{position:absolute;right:70px;bottom:26px}.ps-ws{all:unset;cursor:pointer;background:#111;color:#fff;font-size:18px;padding:10px 18px;border-radius:10px}
.ps-close .ps-fine{position:absolute;left:70px;bottom:34px;max-width:780px}
.ps-rgrid{display:grid;grid-template-columns:1fr 1fr;gap:40px}.ps-rrow{display:flex;flex-direction:column;border-left:6px solid #ffde40;background:#f5f5f5;padding:10px 16px;margin-bottom:12px;border-radius:6px}
.ps-rrow span{font-size:16px;color:#666;text-transform:uppercase;letter-spacing:.06em}.ps-rrow b{font-size:26px}
.ps-recap h3{font-size:26px;margin:0 0 10px}.ps-recap ol{font-size:24px;line-height:1.4;padding-left:28px}
.ps-nav{position:fixed;top:50%;transform:translateY(-50%);width:54px;height:90px;border:0;border-radius:12px;background:rgba(0,0,0,.18);color:#fff;font-size:44px;z-index:41;min-height:0;padding:0}
.ps-nav:disabled{opacity:0}.ps-prev{left:6px}.ps-next{right:6px}
.ps-x{position:fixed;top:max(8px,env(safe-area-inset-top));right:8px;z-index:41;background:rgba(0,0,0,.35);color:#fff;border:0;border-radius:20px;min-height:36px;width:36px;padding:0}
.ps-nbtn{position:fixed;bottom:max(8px,env(safe-area-inset-bottom));left:8px;z-index:41;background:rgba(0,0,0,.25);color:#fff;border:0;border-radius:20px;min-height:36px;width:36px;padding:0;opacity:.55}
.ps-count{position:fixed;bottom:max(12px,env(safe-area-inset-bottom));right:14px;z-index:41;color:rgba(255,255,255,.5);font-size:12px}
.ps-notes{position:fixed;left:52px;right:52px;bottom:max(8px,env(safe-area-inset-bottom));z-index:42;background:rgba(20,20,20,.94);color:#fff;font-size:15px;line-height:1.4;padding:12px 16px;border-radius:12px;max-height:45vh;overflow:auto}
`; document.head.appendChild(st);
})();
$('btnSettings').onclick=openSettings;
$('btnSBack').onclick=async()=>{ collectSettings(); await saveSettings(); show('sJobs'); renderJobs(); };
$('btnDeck').onclick=()=>{ store.put(job); openDeck(); };
$('btnDBack').onclick=()=>{ collectDeck(); save(); show('sEdit'); render(); };
$('btnPresent').onclick=()=>{ collectDeck(); save(); startPresent(); };
loadSettings();
