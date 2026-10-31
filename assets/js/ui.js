// Roamly · Rendering: cards, Explore, Map, Saved, You, details sheet, filters, planner, onboarding
'use strict';

/* =====================================================================
   9. RENDERING — components
   ===================================================================== */
const isFav = id => favs.some(f => f.id === id);
const isGem = p => hasR(p) && p.touristy < .35 && p.rating >= 4.5 && p.reviews < 900;
function cardBadge(p){
  if(p.match >= 92) return '<span class="badge b-match top">🏆 Top pick for you</span>';
  if(isGem(p)) return '<span class="badge b-match b-gem">💎 Hidden gem</span>';
  if(hasR(p) && p.rating >= 4.7) return '<span class="badge b-match">★ Exceptional</span>';
  if(p.notable) return p.src === 'google' ? '<span class="badge b-match">🔥 Very popular</span>' : '<span class="badge b-match">⭐ Landmark</span>';
  return '';
}
// Simple card: photo + key facts. The whole card opens the place; the heart is the only extra button.
function card(p){
  const fav = isFav(p.id), m = prefs.transport, r = reasons(p)[0];
  return `<article class="card" data-id="${p.id}" tabindex="0" aria-label="${esc(p.name)}">
    <div class="ph ${p.photo?'has-photo':''}" style="--h:${p.hue}${p.photo?`;background-image:url('${p.photo}')`:''}">${p.photo?'':`<span class="em">${p.emoji}</span>`}${cardBadge(p)}
      <button class="fav ${fav?'on':''}" data-act="fav" data-id="${p.id}" aria-label="Save to favourites">${fav?'♥':'♡'}</button>
      ${p.offer ? `<span class="badge b-tag">🏷️ ${esc(offerTitle(p.offer))}</span>` : ''}</div>
    <div class="cb">
      <div class="r1"><h3>${esc(p.name)}</h3><span class="stars">${starTxt(p)}</span></div>
      <div class="meta">${jn(p.cuisine && p.group==='food' ? cap(p.cuisine) : p.label, p.reviews ? p.reviews.toLocaleString() + ' reviews' : '')}</div>
      <div class="meta">${jn('📍 ' + fmtKm(p.d), MODE_ICON[m] + ' ' + fmtMin(p.tt[m]), priceText(p))}</div>
      ${r ? `<div class="why2">✨ ${r}</div>` : ''}
      <div class="status">${openNowHtml(p)}</div>
    </div></article>`;
}
function dealCard(p){
  const o = p.offer;
  return `<article class="deal" data-id="${p.id}">
    <div class="tr"><span class="bub" style="--h:${p.hue}">${p.emoji}</span><div style="min-width:0"><h4>${esc(p.name)}</h4><div class="meta">${jn(p.label, starTxt(p), fmtKm(p.d))}</div></div></div>
    <div class="ot">${offerTitle(o)}</div>
    <div class="pr">${o.o>o.d?`<s>${money(o.o)}</s>`:''}<b>${o.d===0?'Free':money(o.d)}</b></div>
    <div class="meta">${o.cond}</div><div class="meta">⏳ ${o.valid}</div>
    <div class="src">⚠ ${o.source}</div>
    <button class="btn primary sm" data-act="book" data-id="${p.id}">Redeem / book ↗</button></article>`;
}
function rowHtml(p, time, label){
  return `<div class="row" data-id="${p.id}">${time?`<span class="time">${time}</span>`:''}<span class="bub" style="--h:${p.hue}">${p.emoji}</span>
    <div class="t">${label?`<div class="lbl" style="font-size:10px">${esc(label)}</div>`:''}<h4>${esc(p.name)}</h4>
    <div class="meta">${jn(p.label, starTxt(p), fmtKm(p.d), priceText(p))}</div></div><span class="meta">›</span></div>`;
}
const emptyBox = msg => `<div class="empty">${msg || (state.f.openNow ? 'Nothing open right now matches — turn off “Open now” or widen the distance.' : 'No matches — try a wider distance, a lower minimum rating or a higher budget.')}</div>`;

/* ---------- Explore ---------- */
function whenLabel(){
  if(state.f.openNow) return 'Open now';
  const d = fmtDate();
  return state.f.when === 'tonight' ? 'Tonight' : state.f.when === 'weekend' ? 'This weekend' : d + ' · ' + state.f.time;
}
function activeFilterCount(){ return (prefs.minRating !== 4.3) + (state.f.vibe.length > 0) + state.f.traps + state.f.offers + state.f.openNow + (state.f.date !== todayISO()); }
function renderFilterBar(){
  const n = activeFilterCount();
  [$('#fCount'), ...$$('.fCountM')].forEach(el => { if(el){ el.hidden = !n; el.textContent = n; } });
  if($('#fSum')) $('#fSum').textContent = `📅 ${whenLabel()} · 📏 ${distLabel(state.f.dist)} · 👥 ${state.f.people}`;
}
function renderCats(){
  $('#cats').innerHTML = Object.entries(QCATS).map(([k,c]) => `<button class="cat ${state.f.qcat===k?'on':''}" data-act="qcat" data-v="${k}" aria-pressed="${state.f.qcat===k}"><b>${c.emoji}</b>${c.label}</button>`).join('');
}
// Four meaningful sections instead of ten.
function buildSections(base){
  const A = wall(null), h = A.h, evening = h >= 17 || h < 4;
  const wide = filtered({ignoreDist:true, ignoreQuery:true});
  const nowList = evening
    ? base.filter(p => (p.group==='night' || p.group==='food' || ['viewpoints','sunset'].includes(p.cat)) && openAt(p, A.day, Math.max(h, 20.5)))
    : base.filter(p => openState(p, wall(p).day, wall(p).h) === true);
  return [
    {id:'rec', title:'Recommended for you', sub:prefs.cats.length ? 'Based on your interests, budget and distance' : (state.places.some(hasR) ? 'Top-rated near you' : 'Popular places near you') + ' · add interests in “You” to personalise', items:base},
    {id:'now', title:evening ? 'Tonight near you' : 'Open now near you', sub:evening ? 'Dinner, drinks and late spots open tonight' : 'Ready when you are', items:[...nowList].sort((a,b) => a.d - b.d || b.match - a.match)},
    {id:'todo', title:'Things to do ' + (state.f.date === todayISO() ? 'today' : fmtDate().toLowerCase()), sub:'Activities, sights and experiences', items:base.filter(p => (p.group==='activity' || p.group==='attraction') && !closedOn(p, selDay()))},
    {id:'drive', title:'Worth the drive', sub:`Exceptional places a bit further than ${distLabel(state.f.dist)}`, items:wide.filter(p => p.d > state.f.dist && p.d <= 50 && (hasR(p) ? p.rating >= 4.7 : p.notable)).sort((a,b) => (b.rating||0) - (a.rating||0) || a.d - b.d)}
  ];
}
function renderSection(s){
  state.secs[s.id] = s;
  if(!s.items.length) return '';
  return `<section class="sec"><div class="sec-h"><div><h2>${s.title}</h2><p>${s.sub}</p></div>${s.items.length>3?`<button class="link" data-act="seeall" data-sec="${s.id}">See all</button>`:''}</div>
    <div class="carousel">${s.items.slice(0, 12).map(card).join('')}</div></section>`;
}
function greeting(){ const h = wall(null).hh; return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
/* ---------- Welcome hero: time-of-day sky + generated skyline (no external photos) ---------- */
function dayPhase(){ const h = wall(null).h; return h < 5.5 || h >= 19.5 ? 'night' : h < 9.5 ? 'morning' : h < 17 ? 'day' : 'sunset'; }
const PHASE = {
  morning:{sky:['#4f8fe0','#9cc8f5','#ffd9b0'], sun:[660,300,'#fff4c9'], back:'#4a5d82', front:'#26324d', lit:.06, label:'🌤️'},
  day:    {sky:['#1f6fe5','#5ea8f7','#bfe3ff'], sun:[680,140,'#fffbe6'], back:'#3f5b8c', front:'#1c2a47', lit:0,   label:'☀️'},
  sunset: {sky:['#3a1c6e','#c8507a','#ffa45c'], sun:[640,400,'#ffcf73'], back:'#5a2d5e', front:'#2a1434', lit:.25, label:'🌇'},
  night:  {sky:['#060a1f','#121a46','#2d2f72'], sun:[670,130,'#f4f1d8'], back:'#1a2050', front:'#070a18', lit:.38, label:'🌙'}
};
let skyKey = '';
function skylineSVG(seedStr, phase){
  const P = PHASE[phase], R = mulberry(hashStr(seedStr)), W = 1200, H = 640, out = [];
  out.push(`<defs><linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset=".55" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="${P.sun[2]}" stop-opacity=".9"/><stop offset=".25" stop-color="${P.sun[2]}" stop-opacity=".35"/><stop offset="1" stop-color="${P.sun[2]}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#skyG)"/>`);
  if(phase === 'night') for(let i = 0; i < 90; i++) out.push(`<circle cx="${(R()*W).toFixed(0)}" cy="${(R()*H*.55).toFixed(0)}" r="${(R()*1.4+.3).toFixed(1)}" fill="#fff" opacity="${(R()*.7+.2).toFixed(2)}"/>`);
  const [sx, sy] = P.sun;
  out.push(`<circle cx="${sx}" cy="${sy}" r="190" fill="url(#glow)"/><circle cx="${sx}" cy="${sy}" r="${phase==='night'?26:40}" fill="${P.sun[2]}"/>`);
  if(phase === 'night') out.push(`<circle cx="${sx+11}" cy="${sy-7}" r="23" fill="${P.sky[1]}"/>`);
  if(phase !== 'night') for(let i = 0; i < 4; i++){ const cx = R()*W, cy = 60 + R()*180, s = .6 + R()*.8;
    out.push(`<g opacity="${phase==='sunset'?.35:.55}" fill="#fff"><ellipse cx="${cx}" cy="${cy}" rx="${70*s}" ry="${16*s}"/><ellipse cx="${cx+30*s}" cy="${cy-10*s}" rx="${40*s}" ry="${16*s}"/></g>`); }
  const layer = (hMin, hMax, color, lit, op) => {
    let x = -30;
    while(x < W + 30){
      const tower = R() < .12, w = tower ? 26 + R()*22 : 36 + R()*66, h = tower ? hMax*(1 + R()*.2) : hMin + R()*(hMax - hMin), y = H - h;
      out.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${color}" opacity="${op}"/>`);
      if(tower){ out.push(`<polygon points="${x},${y} ${x+w/2},${y-40-R()*50} ${x+w},${y}" fill="${color}" opacity="${op}"/>`); }
      else if(R() < .25) out.push(`<rect x="${(x+w*.35).toFixed(0)}" y="${(y-18).toFixed(0)}" width="${(w*.3).toFixed(0)}" height="18" fill="${color}" opacity="${op}"/>`);
      if(lit) for(let wy = y + 12; wy < H - 10; wy += 16) for(let wx = x + 7; wx < x + w - 8; wx += 12)
        if(R() < lit) out.push(`<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="5" height="7" fill="#ffd98a" opacity="${(.55 + R()*.45).toFixed(2)}"/>`);
      x += w + (R() < .3 ? R()*14 : 0);
    }
  };
  layer(130, 250, P.back, 0, .85);
  layer(60, 190, P.front, P.lit, 1);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
}
function renderWelcome(){
  const phase = dayPhase(), key = cityName() + '|' + phase, now = new Date();
  if(key !== skyKey){ $('#sky').innerHTML = skylineSVG(cityName(), phase); skyKey = key; }
  const A = wall(null);
  $('#wPill').textContent = `${PHASE[phase].label} ${greeting()} · ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][A.day]} ${fmtH(A.h)}`;
  $('#wCity').textContent = cityName();
  const area = state.center.label && state.center.label !== cityName() ? state.center.label + ' · ' : '';
  const n = filtered({ignoreGroup:true, ignoreQuery:true, ignoreOpenNow:true, ignoreExtras:true}).length;
  $('#wSub').textContent = state.loading ? `📍 ${area}Finding places near you…` : !state.places.length && state.loadErr ? `📍 ${area}Live data unavailable right now` : `📍 ${area}${n} places within ${distLabel(state.f.dist)}`;
}
function renderExplore(){
  renderWelcome(); renderCats(); renderFilterBar();
  $('#srcLine').innerHTML = esc(sourceLine()) + (state.cachedAt ? ' <button class="link" data-act="retry">Retry</button>' : '');
  $('#srcLine').classList.toggle('demo-on', state.source === 'demo');
  const base = filtered().sort((a,b) => b.match - a.match);
  const el = $('#explore');
  if(!state.loading && !state.places.length && state.loadErr){
    el.innerHTML = `<div class="panel" style="margin-top:22px;text-align:center"><div style="font-size:40px">📡</div><h3 style="margin:6px 0">Couldn’t load places right now</h3>
      <p class="meta" style="margin:0 0 14px">${esc(state.loadErr)}. Check your connection and try again.</p>
      <div class="dacts" style="justify-content:center"><button class="btn primary" data-act="retry">↻ Try again</button><button class="btn line" data-tab="profile">Settings</button></div></div>`;
    return;
  }
  if(state.loading && !state.places.length){
    el.innerHTML = `<section class="sec"><div class="sec-h"><div><h2>Finding real places near you…</h2><p>Loading live data — this can take a few seconds</p></div></div>
      <div class="carousel">${[0,1,2].map(() => '<div class="card skel"><div class="ph" style="--h:220;filter:grayscale(1);opacity:.35"></div><div class="cb"><div class="skl" style="width:70%"></div><div class="skl"></div><div class="skl" style="width:50%"></div></div></div>').join('')}</div></section>`;
    return;
  }
  if(state.f.q || state.f.qcat){
    const what = state.f.q ? `“${esc(state.f.q)}”` : QCATS[state.f.qcat].emoji + ' ' + QCATS[state.f.qcat].label;
    const further = base.length ? [] : filtered({ignoreDist:true}).filter(p => p.d <= 50).sort((a,b) => a.d - b.d).slice(0, 12);
    el.innerHTML = `<section class="sec"><div class="sec-h"><div><h2>${what}</h2><p>${base.length} place${base.length===1?'':'s'} · best matches first</p></div>
      <div style="display:flex;gap:14px"><button class="link" data-act="showmap">Map</button><button class="link" data-act="clearq">✕ Clear</button></div></div>
      ${base.length ? `<div class="grid">${base.map(card).join('')}</div>` : further.length ? `<p class="sub">Nothing within ${distLabel(state.f.dist)}. Here are the nearest further out.</p><div class="grid">${further.map(card).join('')}</div>` : emptyBox()}</section>`;
    return;
  }
  const html = buildSections(base).map(renderSection).join('');
  el.innerHTML = html || emptyBox();
}

/* ---------- Map ---------- */
const MapView = {
  m:null, layer:null, markers:{},
  ensure(){
    if(this.m) return true;
    if(!window.L){ $('#map').innerHTML = emptyBox('The map library could not load (offline?). Use List view.'); return false; }
    this.m = L.map('map', {zoomControl:false}).setView([state.center.lat, state.center.lng], 13);
    L.control.zoom({position:'bottomright'}).addTo(this.m);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}).addTo(this.m);
    this.layer = L.layerGroup().addTo(this.m);
    this.m.on('popupopen', e => { const b = e.popup.getElement()?.querySelector('[data-pid]'); if(b) b.onclick = () => openDetails(b.dataset.pid); });
    return true;
  },
  render(list, focusId){
    if(!this.ensure()) return;
    const c = state.center; this.layer.clearLayers(); this.markers = {};
    const circle = L.circle([c.lat, c.lng], {radius:state.f.dist*1000, color:'#e4572e', weight:1.5, fillColor:'#e4572e', fillOpacity:.05}).addTo(this.layer);
    L.circleMarker([c.lat, c.lng], {radius:9, color:'#fff', weight:3, fillColor:'#2f6fed', fillOpacity:1}).addTo(this.layer).bindPopup('<b>You are here</b><br>' + esc(c.label));
    list.forEach(p => {
      this.markers[p.id] = L.marker([p.lat, p.lng], {title:p.name, icon:L.divIcon({className:'pin', html:`<div class="pin-in ${p.match>=93?'hot':''}" style="--h:${p.hue}"><span>${p.emoji}</span></div>`, iconSize:[36,36], iconAnchor:[18,36], popupAnchor:[0,-32]})})
        .addTo(this.layer).bindPopup(`<div class="pop"><h4>${esc(p.name)}</h4><p>${jn(p.label, starTxt(p), fmtKm(p.d), priceText(p))}</p><button class="btn primary sm" data-pid="${p.id}">View details</button></div>`);
    });
    setTimeout(() => {
      this.m.invalidateSize();
      const mk = focusId && this.markers[focusId];
      if(mk){ this.m.setView(mk.getLatLng(), 15); mk.openPopup(); } else this.m.fitBounds(circle.getBounds(), {padding:[10,10]});
    }, 80);
  }
};
function renderMap(focusId){
  let list = filtered().sort((a,b) => b.match - a.match);
  if(focusId && !list.some(p => p.id === focusId)){ const p = findPlace(focusId); if(p) list = list.concat(enrich(p)); }
  $('#mapCount').textContent = `${list.length} places · ${distLabel(state.f.dist)}`; renderFilterBar();
  $$('#mapSeg button').forEach(b => b.classList.toggle('on', b.dataset.mm === state.mapMode));
  const isMap = state.mapMode === 'map';
  $('#map').style.display = isMap ? '' : 'none'; $('#mapList').hidden = isMap;
  if(isMap) MapView.render(list, focusId);
  else $('#mapList').innerHTML = list.length ? list.map(card).join('') : emptyBox();
}

/* ---------- Saved ---------- */
function renderSaved(){
  $$('#savedSeg button').forEach(b => b.classList.toggle('on', b.dataset.sv === state.savedTab));
  const el = $('#savedList');
  if(state.savedTab === 'fav'){
    el.innerHTML = favs.length ? `<div class="grid">${favs.map(f => card(enrich(f))).join('')}</div>` : emptyBox('No favourites yet. Tap ♡ on any place to save it.');
  } else {
    el.innerHTML = visited.length ? `<div class="stack">${[...visited].sort((a,b) => b.ts - a.ts).map(v => rowHtml(enrich(v), '', 'Visited ' + new Date(v.ts).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}))).join('')}</div>` : emptyBox('No visited places yet. Open a place and tap “Mark visited”.');
  }
}

/* ---------- Profile ---------- */
const INTEGRATIONS = [
  ['Browser geolocation','live','GPS position, with your permission'],
  ['OpenStreetMap + Leaflet','live','Map tiles and markers'],
  ['Nominatim place search','live','City / neighbourhood search and reverse lookup'],
  ['Directions','live','Opens Google Maps with your route; in-app routing needs a Mapbox/Google key'],
  ['Real places (OpenStreetMap)','live','Names, locations, hours, websites, phones — free, no key'],
  ['Ratings, prices & photos','off','Google Places via the site’s Netlify Function (GOOGLE_PLACES_API_KEY)'],
  ['Restaurant reservations','off','TheFork / OpenTable partner API'],
  ['Tickets & activity sessions','off','Fever, GetYourGuide, Tiqets'],
  ['Events','off','Ticketmaster, Eventbrite, PredictHQ'],
  ['Offers & promotions','demo','Needs a verified deals feed or venue partnerships'],
  ['Weather','off','Open-Meteo or OpenWeather'],
  ['AI ranking','off','LLM re-ranking via your backend — rules-based scoring used now']
];
const opts = (map, sel) => Object.entries(map).map(([k,v]) => `<option value="${k}" ${String(k)===String(sel)?'selected':''}>${v}</option>`).join('');
const budgetOptions = () => [1,2,3,4].map(l => `<option value="${l}" ${prefs.budget===l?'selected':''}>${l===4?'Any budget':'Up to '+money(PRICE[l][1])+' pp'}</option>`).join('');
const segBtns = (key, map) => Object.entries(map).map(([k,v]) => `<button class="${prefs[key]===k?'on':''}" data-act="pref-seg" data-k="${key}" data-v="${k}">${v}</button>`).join('');
const theme = () => document.documentElement.dataset.theme;
function renderProfile(){
  const nI = Object.keys(INTERESTS).filter(interestOn).length;
  $('#profile').innerHTML = `
  <div class="panel"><h3>What do you enjoy? <span class="meta" style="display:inline">· ${nI} selected</span></h3>
    <div class="igrid">${Object.entries(INTERESTS).map(([k,v]) => `<button class="itile ${interestOn(k)?'on':''}" data-act="interest" data-v="${k}"><b>${v.emoji}</b>${v.label}</button>`).join('')}</div>
    <details class="more"><summary>Fine-tune exact categories (${prefs.cats.length} on)</summary>
      ${Object.entries(GROUPS).map(([g,G]) => `<div class="field"><span class="lbl">${G.emoji} ${G.label}</span><div class="wrapchips">${CAT_LIST.filter(c => c.group===g).map(c => `<button class="chip ${prefs.cats.includes(c.id)?'on':''}" data-act="pref-cat" data-v="${c.id}">${c.emoji} ${c.label}</button>`).join('')}</div></div>`).join('')}
    </details>
  </div>
  <div class="panel" style="margin-top:16px"><h3>Basics</h3>
    <div class="field" style="margin-top:0"><span class="lbl">Budget per person</span><div class="segw">${[1,2,3,4].map(l => `<button class="${prefs.budget===l?'on':''}" data-act="budget" data-v="${l}">${BUDGETS[l].sym}</button>`).join('')}</div><span class="meta" id="budgetDesc">${budgetDesc(prefs.budget)}</span></div>
    <div class="field"><span class="lbl">Usual distance</span>${distSlider('pref', prefs.maxDist, '📏 Up to')}</div>
    <div class="cols" style="gap:0 14px">
      <div class="field"><label for="pTransport">Getting around</label><select class="inp" id="pTransport">${opts({car:'🚗 Car / taxi', walk:'🚶 Walking', transit:'🚇 Public transport'}, prefs.transport)}</select></div>
      <div class="field"><label for="pCurrency">Currency</label><select class="inp" id="pCurrency">${opts(Object.fromEntries(Object.keys(CUR).map(k => [k,k])), prefs.currency)}</select></div>
    </div>
    <div class="toggle"><b>Dark mode</b><button class="sw ${theme()==='dark'?'on':''}" data-act="theme" aria-label="Dark mode"></button></div>
  </div>
  <details class="more"><summary>More preferences</summary>
    <div class="field"><span class="lbl">Preferred atmosphere</span><div class="wrapchips">${ATMOS.map(a => `<button class="chip ${prefs.atmos.includes(a)?'on':''}" data-act="pref-atmos" data-v="${a}">${cap(a)}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Usually going</span><div class="seg">${segBtns('company', {solo:'Solo', couple:'Couple', group:'Group'})}</div></div>
    <div class="field"><span class="lbl">Indoor or outdoor</span><div class="seg">${segBtns('setting', {any:'Either', in:'Indoor', out:'Outdoor'})}</div></div>
    <div class="field"><label for="pSmoking">Smoking</label><select class="inp" id="pSmoking">${opts({any:'No preference', nosmoke:'Smoke-free places only', smoke:'Prefer smoking areas'}, prefs.smoking)}</select></div>
    <div class="field"><span class="lbl">Preferred days</span><div class="wrapchips">${DAYS.map((d,i) => `<button class="chip ${prefs.days.includes(i)?'on':''}" data-act="pref-day" data-v="${i}">${d}</button>`).join('')}</div></div>
  </details>
  <div class="panel" style="margin-top:16px"><h3>Places data</h3>
    <div class="segw"><button class="${(prefs.dataMode||'live')==='live'?'on':''}" data-act="dmode" data-v="live">📡 Real places</button><button class="${prefs.dataMode==='demo'?'on':''}" data-act="dmode" data-v="demo">🧪 Demo mode</button></div>
    <div class="stack" style="gap:6px;margin-top:12px;font-size:13.5px">
      <div class="bar" style="justify-content:space-between"><span>OpenStreetMap</span><span class="pill live">Always on · free</span></div>
      <div class="bar" style="justify-content:space-between"><span>Google Places <span class="meta">(ratings, prices, photos)</span></span>${googleState.available === true ? '<span class="pill live">Connected</span>' : googleState.available === false ? '<span class="pill off">Not enabled on this site</span>' : googleState.available === 'error' ? '<span class="pill off" style="color:#d0402b">Error</span>' : '<span class="pill off">Checking…</span>'}</div>
      <div class="meta">Showing: <b>${{'google+osm':'Google + OpenStreetMap', google:'Google Places', osm:'OpenStreetMap', demo:'demo data', none:'nothing (offline)'}[state.source] || '…'}</b> · ${state.places.length} places${state.cachedAt ? ' · saved copy' : ''}${state.places[0] && state.places[0].updated ? ' · updated ' + new Date(state.places[0].updated).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : ''}</div>
      ${state.loadErr ? `<div class="meta" style="color:#d0402b">${esc(state.loadErr)}</div>` : ''}
    </div>
    <div class="dacts"><button class="btn line sm" data-act="retry">↻ Refresh places</button></div>
    <p class="meta" style="margin:8px 0 0">Google Places is switched on by the site owner (see README) — no key is ever stored in your browser.</p>
  </div>
  <details class="more"><summary>Data sources & integrations</summary>
    <table class="api">${INTEGRATIONS.map(([n,s,d]) => `<tr><td><b>${n}</b><div class="meta">${d}</div></td><td style="text-align:right"><span class="pill ${s}">${{live:'Live',off:'Not connected',demo:'Demo data'}[s]}</span></td></tr>`).join('')}</table>
  </details>
  <div class="dacts" style="margin:16px 0 24px"><button class="btn line" data-act="onboard">↺ Redo quick setup</button><button class="btn line" data-act="reset">Reset everything</button></div>`;
  const bind = (id, fn) => { $(id).onchange = e => { fn(e.target.value); savePrefs(); enrichAll(); toast('Saved'); }; };
  bind('#pTransport', v => prefs.transport = v);
  bind('#pCurrency', v => { prefs.currency = v; renderProfile(); });
  bind('#pSmoking', v => prefs.smoking = v);
}

/* =====================================================================
   10. SHEETS: details, filters, location, plans
   ===================================================================== */
function openSheet(title, html, kind){
  state.sheetKind = kind || null;
  $('#sheet').innerHTML = title ? `<div class="sheet-h"><h3>${title}</h3><button class="x" data-act="close" aria-label="Close">✕</button></div><div class="sheet-b">${html}</div>` : html;
  $('#backdrop').classList.add('on'); $('#sheet').scrollTop = 0; document.body.style.overflow = 'hidden';
}
function closeSheet(){ $('#backdrop').classList.remove('on'); document.body.style.overflow = ''; state.sheetKind = null; }
function findPlace(id){ return state.places.find(p => p.id === id) || favs.find(p => p.id === id) || visited.find(p => p.id === id); }
const bookLabel = p => !p.level ? 'Find similar places' : p.group==='food' ? 'Find a table' : p.group==='activity' ? 'Find tickets' : p.entry ? 'Entry & tables' : 'Book / enquire';
const provider = p => p.group==='food' ? 'reservation (TheFork / OpenTable)' : p.group==='night' ? 'table-booking' : p.group==='activity' ? 'ticketing' : 'booking';
// Fictional demo venues can't be booked, so we send the user to real listings of the same category near the venue.
// INTEGRATION: replace with the provider's deep link (e.g. TheFork restaurant page) once places are real.
const bookUrl = p => `https://www.google.com/maps/search/${encodeURIComponent(p.label)}/@${p.lat.toFixed(5)},${p.lng.toFixed(5)},14z`;
const gmapsUrl = p => p.gmaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + (p.address || cityName()))}`;
const dirUrl = p => `https://www.google.com/maps/dir/?api=1&origin=${state.center.lat},${state.center.lng}&destination=${p.lat},${p.lng}&travelmode=${{car:'driving',walk:'walking',transit:'transit'}[prefs.transport]}${p.gid ? '&destination_place_id=' + p.gid : ''}`;

function openDetails(id, extraTop = ''){
  const p = findPlace(id); if(!p) return; enrich(p);
  const day = selDay(), openSel = openAt(p, day, selHour()), fav = isFav(p.id), vis = visited.some(v => v.id === p.id), o = p.offer;
  openSheet(null, `
  <div class="ph dhero ${p.photo?'has-photo':''}" style="--h:${p.hue}${p.photo?`;background-image:url('${p.photo}')`:''}">${p.photo?'':`<span class="em">${p.emoji}</span>`}
    ${cardBadge(p)}
    ${p.photo ? '' : `<span class="badge b-demo">${p.src === 'demo' ? 'PHOTO PLACEHOLDER' : 'NO PHOTO YET'}</span>`}<button class="x" data-act="close" aria-label="Close">✕</button></div>
  <div class="sheet-b">
    ${extraTop}
    <div class="meta">${p.label} · ${GROUPS[p.group].label}</div>
    <h2 style="margin:4px 0 8px;font-size:26px;letter-spacing:-.02em;line-height:1.15">${esc(p.name)}</h2>
    <div class="bar">${hasR(p) ? `<span class="stars">★ ${p.rating.toFixed(1)} <small>(${(p.reviews||0).toLocaleString()} reviews)</small></span>` : ''}<span class="meta">${jn(fmtKm(p.d), priceText(p))}</span>${srcPill(p)}</div>
    ${p.photoBy ? `<div class="meta" style="font-size:11px">Photo: ${esc(p.photoBy)}</div>` : ''}
    <div class="topacts">
      <button class="btn primary" data-act="dir" data-id="${p.id}">🧭 Directions</button>
      <button class="btn dark" data-act="book" data-id="${p.id}">${p.src === 'demo' ? bookLabel(p) : p.website ? '🌐 Website' : 'Google Maps'} ↗</button>
      <button class="ibtn ${fav?'on':''}" data-act="fav" data-id="${p.id}" aria-label="Save">${fav?'♥':'♡'}</button>
      <button class="ibtn" data-act="share" data-id="${p.id}" aria-label="Share">↗</button>
    </div>
    <div class="h4">Why you'll like it</div><ul class="reasons">${reasons(p).filter(r => r !== 'Above your budget').map(r => `<li>${r}</li>`).join('')}</ul>
    ${p.blurb ? `<p style="margin:14px 0 4px">${esc(p.blurb)}</p>` : ''}
    <div class="facts">
      <div class="fact"><small>Distance</small><b>${fmtKm(p.d)}</b></div>
      <div class="fact"><small>🚗 Car · est.</small><b>${fmtMin(p.tt.car)}</b></div>
      <div class="fact"><small>🚶 Walk · est.</small><b>${p.d < 8 ? fmtMin(p.tt.walk) : 'Too far'}</b></div>
      <div class="fact"><small>🚇 Transit · est.</small><b>${fmtMin(p.tt.transit)}</b></div>
      <div class="fact"><small>Price</small><b>${priceText(p) || 'Not listed'}</b></div>
      <div class="fact"><small>Hours</small><b>${hoursText(p)}</b></div>
      ${p.src === 'demo' ? `<div class="fact"><small>Setting</small><b>${{in:'Indoor', out:'Outdoor', both:'Indoor & outdoor'}[p.setting]}</b></div>
      <div class="fact"><small>Vibe</small><b>${p.atmos.map(cap).join(', ')}</b></div>` : `<div class="fact"><small>Type</small><b>${p.label}</b></div><div class="fact"><small>${p.cuisine && p.cuisine.toLowerCase() !== p.label.toLowerCase() ? 'Cuisine' : 'Area'}</small><b>${esc(p.cuisine && p.cuisine.toLowerCase() !== p.label.toLowerCase() ? cap(p.cuisine) : (p.address.split(',').slice(-2).join(',').trim() || state.center.label))}</b></div>`}
    </div>
    <div class="meta">${openNowHtml(p)}${p.smoking ? ' · 🚬 Smoking area' : ''}</div>
    ${p.periods && !is247(p) ? `<div class="h4">Opening hours</div><div class="panel" style="box-shadow:none;padding:10px 14px">${[1,2,3,4,5,6,0].map(d => `<div class="bar" style="justify-content:space-between;font-size:13.5px;${d===new Date().getDay()?'font-weight:800':''}"><span>${DAYS[d]}</span><span>${spanTxt(p.periods[d])}</span></div>`).join('')}</div>` : (!p.periods && p.ohRaw ? `<div class="meta">Listed hours: ${esc(p.ohRaw)}</div>` : '')}
    ${p.src !== 'demo' ? `<div class="h4">Contact</div><div class="stack" style="gap:6px;font-size:14px">
      ${p.address ? `<div>📍 ${esc(p.address)}</div>` : ''}
      ${p.phone ? `<div>📞 <a href="tel:${esc(p.phone.replace(/[^\d+]/g,''))}">${esc(p.phone)}</a></div>` : ''}
      ${p.website ? `<div>🌐 <a href="${esc(p.website)}" target="_blank" rel="noopener">${esc(p.website.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))}</a></div>` : ''}
      ${!p.address && !p.phone && !p.website ? '<div class="meta">No contact details listed yet.</div>' : ''}</div>` : ''}
    ${o ? `<div class="h4">Current offer</div><div class="deal" style="cursor:default"><div class="ot">🏷️ ${offerTitle(o)}</div><div class="pr">${o.o>o.d?`<s>${money(o.o)}</s>`:''}<b>${o.d===0?'Free':money(o.d)}</b></div><div class="meta">${o.cond} · ${o.valid}</div><div class="src">Source: ${o.source}</div></div>` : ''}
    <div class="h4">Availability & booking</div>
    <div class="panel" style="box-shadow:none">
      <div class="meta">Your request</div><b>${fmtDate()} · ${state.f.time} · ${state.f.people} ${state.f.people>1?'people':'person'}</b>
      <div style="margin:8px 0">${openState(p, day, selHour()) === null ? '<span class="nv">● Opening hours not listed</span> <span class="meta" style="display:inline">— check with the venue</span>' : openSel ? '<span class="open">● Open at your selected time</span> <span class="meta" style="display:inline">(per listed hours)</span>' : `<span class="closed">● Closed at your selected time</span> <span class="meta" style="display:inline">— ${closedOn(p, day) ? 'closed on ' + DAYS[day] + 's' : 'hours ' + spanTxt(p.periods[day])}</span>`}</div>
      ${p.entry ? `<div class="meta" style="margin-bottom:8px">${priceText(p)} · table reservations & packages: ask the venue</div>` : ''}
      <div class="warn"><b>Availability not verified.</b> No ${provider(p)} API is connected, so live ${p.group==='food'?'tables':'slots'} can't be shown. ${p.src === 'demo' ? `This venue is demo data, so the button opens real ${p.label.toLowerCase()} listings nearby instead.` : p.website ? 'Book through the venue’s website or call them.' : 'Call the venue or check Google Maps.'}</div>
    </div>
    <div class="h4">What people say ${p.src === 'demo' ? '<span class="pill demo">Sample reviews</span>' : ''}</div>
    ${p.src === 'demo' ? (p.reviewsDemo || []).map(r => `<div class="review">${esc(r)}</div>`).join('') : `<a class="btn line" href="${gmapsUrl(p)}" target="_blank" rel="noopener">Read reviews on Google Maps ↗</a>`}
    <div class="h4">Location</div>
    <div class="meta">${p.src === 'demo' ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} · demo position near ${esc(state.center.label)}` : jn(esc(p.address || ''), `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`)}${p.osmUrl ? ` · <a href="${p.osmUrl}" target="_blank" rel="noopener">View on OpenStreetMap</a>` : ''}</div>
    <div class="dacts">
      <button class="btn line" data-act="focusmap" data-id="${p.id}">🗺️ Show on map</button>
      <button class="btn line" data-act="visited" data-id="${p.id}">${vis ? '✓ Visited' : 'I’ve been here'}</button>
    </div>
  </div>`, 'details');
}

function setWhen(w){
  const n = new Date(); state.f.when = w; state.f.openNow = w === 'now';
  if(w === 'now'){ state.f.date = todayISO(); const A = wall(null), m = Math.ceil((A.hh*60 + A.mm)/15)*15; state.f.time = String(Math.floor(m/60)%24).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'); }
  if(w === 'tonight'){ state.f.date = todayISO(); state.f.time = '21:00'; }
  if(w === 'tomorrow'){ state.f.date = addDaysISO(1); state.f.time = '13:00'; }
  if(w === 'weekend'){ state.f.date = isoLocal(nextDow(6)); state.f.time = '13:00'; }
}
function openFilters(){
  const t = todayISO(), seg = (act, items, cur) => `<div class="segw">${items.map(([v,l]) => `<button class="${String(cur)===String(v)?'on':''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
  openSheet('Filters', `<div id="fBody"></div>`, 'filters');
  const body = () => `
    <div class="step-l" style="margin-top:0">When</div>
    ${seg('when', [['now','Now'],['today','Today'],['tonight','Tonight'],['tomorrow','Tomorrow'],['weekend','Weekend']], state.f.when)}
    <div class="cols" style="gap:0 10px;grid-template-columns:1fr 1fr;margin-top:8px">
      <input class="inp" type="date" id="fDate" min="${t}" value="${state.f.date}" aria-label="Date">
      <input class="inp" type="time" id="fTime" step="900" value="${state.f.time}" aria-label="Time">
    </div>
    <div class="bar" style="margin-top:8px"><span class="meta">People</span><button class="btn ghost sm" data-act="people" data-v="-1" aria-label="Fewer">−</button><b style="min-width:24px;text-align:center">${state.f.people}</b><button class="btn ghost sm" data-act="people" data-v="1" aria-label="More">+</button></div>
    <div class="step-l">Distance</div>${distSlider('filter', state.f.dist)}
    <div class="step-l">Budget per person</div>${seg('fbudget', [1,2,3,4].map(l => [l, BUDGETS[l].sym]), prefs.budget)}<div class="meta" style="margin-top:4px">${budgetDesc(prefs.budget)}${state.places.some(p => p.priceKnown === false) ? ' · places without a listed price stay visible' : ''}</div>
    ${state.places.some(hasR) ? `<div class="step-l">Minimum rating</div>${seg('frating', [[4,'4.0+'],[4.3,'4.3+'],[4.5,'4.5+'],[4.8,'4.8+']], prefs.minRating)}${state.places.some(p => !hasR(p)) ? '<div class="meta" style="margin-top:4px">Places without ratings stay visible.</div>' : ''}` : ''}
    <div class="step-l">Vibe</div><div class="wrapchips">${ATMOS.map(a => `<button class="chip ${state.f.vibe.includes(a)?'on':''}" data-act="fvibe" data-v="${a}">${cap(a)}</button>`).join('')}</div>
    ${state.places.some(p => p.offer) ? `<div class="toggle"><div><b>Only places with offers</b><div class="meta">Deals & promotions (sample data)</div></div><button class="sw ${state.f.offers?'on':''}" data-act="foffers" aria-label="Only offers"></button></div>` : ''}
    <div class="toggle"><div><b>Avoid tourist traps</b><div class="meta">Authentic, well reviewed, good value</div></div><button class="sw ${state.f.traps?'on':''}" data-act="traps" aria-label="Avoid tourist traps"></button></div>`;
  state.filterBody = body;
  $('#sheet').insertAdjacentHTML('beforeend', `<div class="sheet-foot"><button class="btn line" data-act="freset">Reset</button><button class="btn primary" data-act="close" style="flex:1" id="fShow"></button></div>`);
  drawFilters();
}
function drawFilters(){
  const b = $('#fBody'); if(!b || !state.filterBody) return;
  const y = $('#sheet').scrollTop; b.innerHTML = state.filterBody(); $('#sheet').scrollTop = y;
  $('#fDate').onchange = e => { state.f.date = e.target.value || todayISO(); state.f.when = 'custom'; state.f.openNow = false; refresh(); };
  $('#fTime').onchange = e => { state.f.time = e.target.value || '20:00'; state.f.when = 'custom'; state.f.openNow = false; refresh(); };
  syncControls();
}
function syncControls(){
  $$('[data-dist="filter"]').forEach(r => { if(!(r === distTouch.el && Date.now() - distTouch.t < 1500)){ const p = toPos(state.f.dist); r.value = p; r.style.setProperty('--p', p + '%'); r.closest('.dist').querySelector('.dv').textContent = distLabel(state.f.dist); } });
  if($('#fShow')) $('#fShow').textContent = `Show ${filtered().length} places`;
  renderFilterBar();
}
function refresh(){ renderAll(); syncControls(); }

function openLocation(){
  openSheet('Change location', `
    <button class="btn primary" data-act="gps" style="width:100%">📍 Use my current location</button>
    <form id="geoForm" class="search" style="margin-top:14px"><span>🔎</span><input id="geoQ" placeholder="City, neighbourhood or destination" autocomplete="off" aria-label="Search location"><button class="btn dark" type="submit">Find</button></form>
    <div id="geoRes" class="stack" style="margin-top:10px"></div>
    <div class="field"><span class="lbl">Near my destination · quick picks</span><div class="wrapchips">${PRESETS.map((p,i) => `<button class="chip" data-act="preset" data-i="${i}">${p.label}</button>`).join('')}</div></div>
    <p class="meta">Current: ${esc(state.center.label)} (${{gps:'GPS', default:'default', manual:'chosen manually'}[state.center.source] || 'manual'})</p>`, 'loc');
  $('#geoForm').onsubmit = async e => {
    e.preventDefault(); const q = $('#geoQ').value.trim(); if(!q) return;
    const box = $('#geoRes'); box.innerHTML = '<div class="meta">Searching OpenStreetMap…</div>';
    try{
      state.geo = await API.geocode(q);
      box.innerHTML = state.geo.length ? state.geo.map((x,i) => `<button class="row" data-act="geo-pick" data-i="${i}"><span class="bub" style="--h:20">📍</span><div class="t"><h4>${esc(x.name.split(',')[0])}</h4><div class="meta">${esc(x.name)}</div></div></button>`).join('') : emptyBox('No places found.');
    }catch(err){ box.innerHTML = emptyBox('Place search is unavailable right now (offline or rate-limited). Try a quick pick.'); }
  };
}

/* ---------- Plan builder: kind of day + editable stops ---------- */
const newStep = (time, kind) => ({time, kind, pin:null, skip:[], shuffle:false});
// Turn "what I'm in the mood for today" into a sensibly ordered day.
function stepsFromCats(cats){
  let meal = 0;
  const out = cats.slice(0, 8).map(id => {
    const c = CAT[id]; let t;
    if(['breakfast','bakery','coffee','specialty'].includes(id)) t = 9;
    else if(id === 'brunch') t = 11;
    else if(id === 'dessert') t = 16;
    else if(c.group === 'food') t = [13, 20, 15.5][meal++ % 3];
    else if(c.group === 'night') t = id === 'nightclub' ? 23.5 : Math.max(c.hours[0] + 1, ['rooftop','terrace','beachbar'].includes(id) ? 18 : 21);
    else if(['viewpoints','sunset'].includes(id)) t = 18;
    else t = clamp(c.hours[0] + 1, 10, 17);
    return {t, kind:'c:' + id};
  }).sort((a,b) => a.t - b.t);
  for(let i = 1; i < out.length; i++) if(out[i].t < out[i-1].t + 1.25) out[i].t = out[i-1].t + 1.5;
  return out.map(o => newStep(fmtT(o.t), o.kind));
}
const WINDOWS = {morning:{label:'🌅 Morning', a:6, b:13}, afternoon:{label:'☀️ Afternoon', a:12, b:18.6}, evening:{label:'🌙 Evening', a:17, b:30}, full:{label:'🗓️ Full day', a:0, b:30}};
const winBtn = w => w.label.replace(' ', '<br><span style="font-size:12px">') + '</span>';
function setPlanType(type){
  let steps = type === 'mood' ? stepsFromCats(state.todayCats) : DAY_TYPES[type].steps.map(([t,k]) => newStep(t, k));
  const W = WINDOWS[state.pu.win], inWin = steps.filter(s => { const v = parseT(s.time); return v >= W.a && v < W.b; });
  if(inWin.length) steps = inWin; else if(state.pu.win !== 'full') toast('This mood is mostly at other times, so here is the full day');
  state.plan = {type, steps};
  state.moodOpen = type === 'mood' && !state.todayCats.length;
  buildPlan();
}
// Picks one place per stop: best personal match, open at that time, close to the previous stop.
// Chosen places are pinned so swapping one stop doesn't reshuffle the rest.
function buildPlan(){
  const P = state.plan, day = selDay(), used = new Set(); let from = state.center;
  const base = filtered({ignoreGroup:true, ignoreQuery:true, ignoreOpenNow:true, ignoreExtras:true, ignoreBudget:true}).filter(p => p.priceKnown === false || p.level <= state.pu.budget);
  P.steps.sort((a,b) => parseT(a.time) - parseT(b.time));
  P.result = P.steps.map(s => {
    const k = kindInfo(s.kind), h = parseT(s.time) + .25;
    const ok = p => !used.has(p.id) && !s.skip.includes(p.id) && k.test(p) && openAt(p, day, h);
    let p = s.pin && base.find(x => x.id === s.pin && ok(x));
    if(!p){
      const best = base.filter(ok).map(x => ({x, v:x.match - hav(from, x)*1.5 + (s.shuffle ? Math.random()*10 : 0)})).sort((a,b) => b.v - a.v)[0];
      p = best && best.x; s.shuffle = false;
    }
    const leg = p ? hav(from, p) : 0;
    if(p){ used.add(p.id); s.pin = p.id; from = p; } else s.pin = null;
    return {s, p, leg, k};
  });
}
function kindOptions(sel){
  return `<optgroup label="Type of stop">${Object.entries(SLOTS).map(([k,v]) => `<option value="${k}" ${k===sel?'selected':''}>${v.emoji} ${v.label}</option>`).join('')}</optgroup>`
    + Object.entries(GROUPS).map(([g,G]) => `<optgroup label="${G.label}">${CAT_LIST.filter(c => c.group===g).map(c => `<option value="c:${c.id}" ${'c:'+c.id===sel?'selected':''}>${c.emoji} ${c.label}</option>`).join('')}</optgroup>`).join('');
}
function timeOptions(sel){
  const vals = []; for(let v = 6; v <= 27.5; v += .5) vals.push(fmtT(v));
  if(!vals.includes(sel)) vals.push(sel);
  return vals.sort((x,y) => parseT(x) - parseT(y)).map(t => `<option ${t===sel?'selected':''}>${t}</option>`).join('');
}
// Step 1: mood · Step 2: when & budget · Step 3: generated day (tap a stop to change it)
function openPlanner(type){
  state.pu = state.pu || {step:'setup', mood:'relax', win:'full', budget:prefs.budget, open:-1};
  if(type && DAY_TYPES[type]){ state.pu.mood = type; state.pu.step = 'setup'; }
  if(state.pu.step === 'result' && !state.plan) state.pu.step = 'setup';
  openSheet('Plan my day', '<div id="planBody"></div>', 'plan');
  renderPlanner();
}
function renderPlanner(){
  const box = $('#planBody'); if(!box) return;
  const U = state.pu;
  if(U.step === 'setup'){
    const extra = Object.keys(DAY_TYPES).filter(k => !MAIN_DAYS.includes(k));
    const tile = k => { const t = DAY_TYPES[k]; return `<button class="dtile ${k==='mood'?'mood':''} ${U.mood===k?'sel':''}" style="--h:${t.hue}" data-act="pmoodpick" data-v="${k}"><span class="de">${t.emoji}</span><strong>${t.label}</strong><small>${t.desc}</small></button>`; };
    const moodNames = state.todayCats.map(id => CAT[id].emoji + ' ' + CAT[id].label).join(', ');
    const canGo = U.mood !== 'mood' || state.todayCats.length;
    box.innerHTML = `
      <div class="step-l" style="margin-top:0">1 · What kind of day?</div>
      <div class="dgrid sm">${MAIN_DAYS.map(tile).join('')}${state.moreIdeas ? extra.map(tile).join('') : ''}</div>
      <button class="btn ghost sm more" data-act="moreideas">${state.moreIdeas ? 'Fewer ideas ▴' : `More ideas · ${extra.length} ▾`}</button>
      ${U.mood === 'mood' ? `<div class="mood" style="margin-top:12px"><b>Today I'm in the mood for:</b> <span style="color:var(--brand)">${moodNames || 'pick a few below'}</span>
        ${Object.entries(GROUPS).map(([g,G]) => `<div class="lbl" style="margin:12px 0 6px">${G.emoji} ${G.label}</div><div class="wrapchips">${CAT_LIST.filter(c => c.group===g).map(c => `<button class="chip ${state.todayCats.includes(c.id)?'on':''}" data-act="pmood" data-v="${c.id}">${c.emoji} ${c.label}</button>`).join('')}</div>`).join('')}</div>` : ''}
      <div class="step-l">2 · When and how much?</div>
      <div class="segw">${Object.entries(WINDOWS).map(([k,w]) => `<button class="${U.win===k?'on':''}" data-act="pwin" data-v="${k}">${winBtn(w)}</button>`).join('')}</div>
      <div class="segw" style="margin-top:8px">${[1,2,3,4].map(l => `<button class="${U.budget===l?'on':''}" data-act="pbudget" data-v="${l}">${BUDGETS[l].sym}</button>`).join('')}</div>
      <div class="bar" style="margin-top:8px"><span class="meta">${budgetDesc(U.budget)} · on</span><input type="date" class="tinp" style="width:auto" id="planDate" min="${todayISO()}" value="${state.f.date}" aria-label="Plan date"></div>
      <div style="height:70px"></div>
      <div class="sheet-foot" style="margin:0 -16px -16px"><button class="btn primary" style="flex:1;padding:15px;font-size:16px" data-act="pgo" ${canGo?'':'disabled'}>✨ Create my day</button></div>`;
    return;
  }
  const P = state.plan, R = P.result, T = DAY_TYPES[P.type], km = R.reduce((a,r) => a + r.leg, 0);
  box.innerHTML = `
    <div class="bar" style="justify-content:space-between">
      <div><div style="font-size:20px;font-weight:800">${T.emoji} ${T.label}</div><div class="meta">${fmtDate()} · ${WINDOWS[U.win].label.slice(3)} · ${BUDGETS[U.budget].sym} · ${R.filter(r => r.p).length} stops · ${fmtKm(km)}</div></div>
      <button class="btn ghost sm" data-act="pedit">✎ Change</button></div>
    <p class="meta" style="margin:10px 0 12px">Tap a stop to swap, retime or remove it.</p>
    ${R.map((r,i) => `<div class="step"><div class="ln"><span class="dot"></span>${i<R.length-1?'<span class="vl"></span>':''}</div><div style="flex:1;min-width:0;padding-bottom:10px">
      ${r.p && i>0 && r.leg ? `<div class="leg">↳ ${fmtKm(r.leg)} · ~${fmtMin(travel(r.leg)[prefs.transport])} by ${MODE_NAME[prefs.transport]}</div>` : ''}
      <button class="pstop ${U.open===i?'open':''}" data-act="popen" data-i="${i}"><span class="time">${r.s.time}</span>${r.p ? `<span class="bub" style="--h:${r.p.hue}">${r.p.emoji}</span>` : '<span class="bub" style="--h:0;filter:grayscale(1)">…</span>'}
        <span class="t"><span class="lbl" style="font-size:10px">${r.k.emoji} ${r.k.label}</span><h4>${r.p ? esc(r.p.name) : 'Nothing open nearby'}</h4><span class="meta">${r.p ? jn(starTxt(r.p), fmtKm(r.p.d), priceText(r.p)) : 'Tap to change the time or type'}</span></span><span class="meta">${U.open===i?'▴':'▾'}</span></button>
      ${U.open===i ? `<div class="pedit">
        <select class="tinp" data-pt="${i}" aria-label="Time">${timeOptions(r.s.time)}</select>
        <select class="ksel" data-pk="${i}" aria-label="Type of stop">${kindOptions(r.s.kind)}</select>
        <button class="btn line sm" data-act="pswap" data-i="${i}">↻ Another option</button>
        ${r.p ? `<button class="btn line sm" data-act="details" data-id="${r.p.id}">View place</button>` : r.s.skip.length ? `<button class="btn line sm" data-act="preset-skip" data-i="${i}">Show skipped again</button>` : ''}
        <button class="btn line sm" data-act="pdel" data-i="${i}">✕ Remove</button></div>` : ''}
    </div></div>`).join('') || emptyBox('No stops yet.')}
    <button class="btn ghost" data-act="padd" style="width:100%">+ Add a stop</button>
    <div class="warn" style="margin-top:12px;font-size:12px">Built from sample data, your preferences, distance and listed opening hours. Availability isn't verified.</div>
    <div style="height:70px"></div>
    <div class="sheet-foot" style="margin:0 -16px -16px"><button class="btn line" data-act="pshuffle">↻ Shuffle</button><button class="btn primary" style="flex:1" data-act="shareplan">↗ Share my day</button></div>`;
}
function planAct(act, el){
  const U = state.pu, P = state.plan, i = +el.dataset.i;
  switch(act){
    case 'pmoodpick': U.mood = el.dataset.v; return renderPlanner();
    case 'pmood': {
      const v = el.dataset.v;
      if(state.todayCats.includes(v)) state.todayCats = state.todayCats.filter(x => x !== v);
      else if(state.todayCats.length >= 8) return toast('Up to 8 choices for one day');
      else state.todayCats = [...state.todayCats, v];
      store.set('today', {date:todayISO(), cats:state.todayCats});
      const y = $('#sheet').scrollTop; renderPlanner(); $('#sheet').scrollTop = y; return;
    }
    case 'pwin': U.win = el.dataset.v; return renderPlanner();
    case 'pbudget': U.budget = +el.dataset.v; return renderPlanner();
    case 'pgo': setPlanType(U.mood); U.step = 'result'; U.open = -1; renderPlanner(); $('#sheet').scrollTop = 0; return;
    case 'pedit': U.step = 'setup'; return renderPlanner();
    case 'popen': U.open = U.open === i ? -1 : i; return renderPlanner();
  }
  if(act === 'pswap'){ const s = P.steps[i]; if(s.pin) s.skip.push(s.pin); s.pin = null; }
  if(act === 'preset-skip'){ P.steps[i].skip = []; }
  if(act === 'pdel'){ P.steps.splice(i, 1); U.open = -1; }
  if(act === 'padd'){ const last = P.steps.length ? parseT(P.steps[P.steps.length-1].time) : 9.5; P.steps.push(newStep(fmtT(Math.min(last + 1.5, 28)), prefs.cats.length ? 'interests' : 'activity')); U.open = P.steps.length - 1; }
  if(act === 'pshuffle'){ P.steps.forEach(s => { s.pin = null; s.skip = []; s.shuffle = true; }); U.open = -1; }
  buildPlan(); renderPlanner();
}
document.addEventListener('change', e => {
  const t = e.target; if(state.sheetKind !== 'plan') return;
  if(t.id === 'planDate'){ state.f.date = t.value || todayISO(); state.f.when = 'custom'; renderAll(); return; }
  if(!state.plan) return;
  if(t.dataset.pk !== undefined){ const s = state.plan.steps[+t.dataset.pk]; s.kind = t.value; s.pin = null; s.skip = []; }
  else if(t.dataset.pt !== undefined){ if(!t.value) return; state.plan.steps[+t.dataset.pt].time = t.value; }
  else return;
  buildPlan();
  state.pu.open = state.plan.result.findIndex(r => r.s === (t.dataset.pk !== undefined ? state.plan.steps[+t.dataset.pk] : state.plan.steps.find(s => s.time === t.value)));
  renderPlanner();
});

/* ---------- First-time setup: location → interests → budget ---------- */
const onb = {step:0, budget:null};
function openOnboarding(){ onb.step = 0; onb.budget = prefs.budget; $('#onb').classList.add('on'); document.body.style.overflow = 'hidden'; renderOnb(); }
function closeOnboarding(){ $('#onb').classList.remove('on'); document.body.style.overflow = ''; store.set('onboarded', true); showTab('explore'); }
function renderOnb(){
  const dots = `<div class="dots">${[0,1,2].map(i => `<i class="${i<=onb.step?'on':''}"></i>`).join('')}</div>`;
  const head = `<div class="bar" style="justify-content:space-between"><div class="logo"><i>◎</i><span>Roamly</span></div><button class="link" data-act="onb-skip">Skip setup</button></div>${dots}`;
  let body = '', foot = '';
  if(onb.step === 0){
    body = `<h1>Find great places around you.</h1><p class="sub">Roamly shows the best food, nightlife and things to do near where you are.</p>
      <button class="bigopt" data-act="onb-gps"><b>📍</b><span><strong>Use my current location</strong><br><span class="meta">Your browser will ask for permission</span></span></button>
      <form class="search" id="onbGeo" style="box-shadow:none"><span>🔎</span><input id="onbQ" placeholder="Or type a city or area" autocomplete="off" aria-label="City or area"><button class="btn dark" type="submit">Find</button></form>
      <div id="onbRes" class="stack" style="margin-top:10px"></div>
      <div class="lbl" style="margin:16px 0 8px">Popular</div><div class="wrapchips">${PRESETS.map((p,i) => `<button class="chip" data-act="onb-preset" data-i="${i}">${p.label}</button>`).join('')}</div>`;
  } else if(onb.step === 1){
    const n = Object.keys(INTERESTS).filter(interestOn).length;
    body = `<h1>What do you enjoy?</h1><p class="sub">Pick at least 3. You can change them any time in “You”.</p>
      <div class="igrid">${Object.entries(INTERESTS).map(([k,v]) => `<button class="itile ${interestOn(k)?'on':''}" data-act="onb-int" data-v="${k}"><b>${v.emoji}</b>${v.label}</button>`).join('')}</div>`;
    foot = `<button class="btn primary" data-act="onb-next" ${n<3?'disabled':''}>${n<3 ? `Pick ${3-n} more` : 'Continue'}</button>`;
  } else {
    body = `<h1>What's your usual budget?</h1><p class="sub">Per person. Optional: you can skip this.</p>
      ${[1,2,3,4].map(l => `<button class="bigopt ${onb.budget===l?'on':''}" data-act="onb-budget" data-v="${l}"><b>${l===4?'€€€€':BUDGETS[l].sym}</b><span><strong>${BUDGETS[l].name}</strong><br><span class="meta">${budgetDesc(l)}</span></span></button>`).join('')}`;
    foot = `<button class="btn line" data-act="onb-done" style="flex:0 0 auto">Skip</button><button class="btn primary" data-act="onb-done">Show me places →</button>`;
  }
  $('#onb').innerHTML = `<div class="onb-in">${head}${body}</div>${foot ? `<div class="onb-foot"><div class="wrapx">${foot}</div></div>` : ''}`;
  const f = $('#onbGeo');
  if(f) f.onsubmit = async e => {
    e.preventDefault(); const q = $('#onbQ').value.trim(); if(!q) return;
    const box = $('#onbRes'); box.innerHTML = '<div class="meta">Searching…</div>';
    try{ state.geo = await API.geocode(q);
      box.innerHTML = state.geo.length ? state.geo.map((x,i) => `<button class="row" data-act="onb-geo" data-i="${i}"><span class="bub" style="--h:20">📍</span><div class="t"><h4>${esc(x.name.split(',')[0])}</h4><div class="meta">${esc(x.name)}</div></div></button>`).join('') : emptyBox('No places found.');
    }catch(err){ box.innerHTML = emptyBox('Search is unavailable right now. Pick a popular place below.'); }
  };
}
function onbAct(act, el){
  const next = () => { onb.step++; renderOnb(); $('#onb').scrollTop = 0; };
  switch(act){
    case 'onb-skip': return closeOnboarding();
    case 'onb-gps': return requestGPS(true, next);
    case 'onb-preset': setCenter({...PRESETS[+el.dataset.i], source:'manual'}); return next();
    case 'onb-geo': { const g = state.geo[+el.dataset.i]; setCenter({lat:g.lat, lng:g.lng, label:g.name.split(',')[0], source:'manual'}); return next(); }
    case 'onb-int': toggleInterest(el.dataset.v); return renderOnb();
    case 'onb-next': return next();
    case 'onb-budget': onb.budget = +el.dataset.v; return renderOnb();
    case 'onb-done': if(onb.budget){ prefs.budget = onb.budget; savePrefs(); enrichAll(); } return closeOnboarding();
  }
}

function surprise(){
  const pool = filtered({ignoreGroup:true, ignoreQuery:true}).filter(p => hasR(p) ? p.rating >= 4.5 : true).sort((a,b) => b.match - a.match).slice(0, 25);
  if(!pool.length){ toast('Nothing matches — try widening your filters'); return; }
  openDetails(pool[Math.floor(Math.random()*pool.length)].id, `<div class="bar" style="justify-content:space-between;margin-bottom:12px"><span class="pill live">🎲 Surprise pick for you</span><button class="btn ghost sm" data-act="surprise">Spin again</button></div>`);
}
