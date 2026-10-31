// Roamly · Actions, navigation and start-up
'use strict';

/* =====================================================================
   11. ACTIONS
   ===================================================================== */
const snapshot = p => { const {d, tt, match, ...rest} = p; return JSON.parse(JSON.stringify(rest)); };
function toggleFav(id){
  const p = findPlace(id); if(!p) return;
  if(isFav(id)){ favs = favs.filter(f => f.id !== id); toast('Removed from favourites'); }
  else { favs.push(snapshot(p)); toast('♥ Saved to favourites'); }
  store.set('favs', favs);
  $$(`[data-act="fav"][data-id="${id}"]`).forEach(b => { const on = isFav(id); if(b.classList.contains('fav')){ b.classList.toggle('on', on); b.textContent = on ? '♥' : '♡'; } else b.textContent = on ? '♥ Saved' : '♡ Save'; });
  if(state.tab === 'saved') renderSaved();
}
function toggleVisited(id, btn){
  const p = findPlace(id); if(!p) return;
  if(visited.some(v => v.id === id)){ visited = visited.filter(v => v.id !== id); btn.textContent = 'Mark visited'; }
  else { visited.push({...snapshot(p), ts:Date.now()}); btn.textContent = '✓ Visited'; toast('Added to visited places'); }
  store.set('visited', visited);
  if(state.tab === 'saved') renderSaved();
}
async function shareText(title, text, url){
  if(navigator.share){ try{ await navigator.share({title, text, url}); return; }catch(e){ if(e.name === 'AbortError') return; } }
  try{ await navigator.clipboard.writeText(text + (url ? '\n' + url : '')); toast('Copied to clipboard'); }catch(e){ toast('Sharing not available here'); }
}
function applyTheme(t){ document.documentElement.dataset.theme = t; $('#themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#0e0e12' : '#f7f5f0';
  $$('.sw[data-act="theme"]').forEach(b => b.classList.toggle('on', t === 'dark')); }
function updateLoc(){ $('#locLabel').textContent = state.center.label; }
function setCenter(c){
  state.center = {lat:+c.lat, lng:+c.lng, label:c.label, city:c.city || null, tz:c.tz || null, source:c.source || 'manual'};
  store.set('center', state.center);
  loadPlaces(); toast('📍 ' + c.label);
  if(!c.city || !c.tz) lookupNames(c.source === 'gps' || c.label === 'Selected area');
}
// Fills in the neighbourhood (optional) and the main city via OpenStreetMap reverse lookup.
function lookupNames(setLabel){
  const c = state.center;
  API.reverse(c.lat, c.lng).then(n => {
    if(!n || state.center !== c) return;
    if(setLabel && n.area) c.label = n.area;
    if(n.city) c.city = n.city;
    if(n.cc){ c.cc = n.cc; c.tz = COUNTRY_TZ[n.cc] || null; }
    store.set('center', c); updateLoc(); if(state.tab === 'explore') renderExplore();
  }).catch(() => {});
}
const cityName = () => state.center.city || state.center.label;
function requestGPS(explicit, done){
  if(!navigator.geolocation){ toast('Geolocation not supported — choose a location manually'); return; }
  if(explicit) toast('Requesting your location…');
  navigator.geolocation.getCurrentPosition(pos => {
    if(state.sheetKind === 'loc') closeSheet();
    setCenter({lat:pos.coords.latitude, lng:pos.coords.longitude, label:'Your location', source:'gps'});
    if(done) done();
  }, err => {
    if(done) done();
    if(explicit || state.center.source === 'default') toast(err.code === 1 ? `Location permission denied — showing ${state.center.label}. Tap 📍 to change.` : `Couldn't get your location — showing ${state.center.label}`);
  }, {enableHighAccuracy:true, timeout:10000, maximumAge:120000});
}
function handleAct(act, el){
  const id = el.dataset.id, v = el.dataset.v;
  switch(act){
    case 'fav': return toggleFav(id);
    case 'details': return openDetails(id);
    case 'dir': { const p = findPlace(id); if(p) window.open(dirUrl(p), '_blank', 'noopener'); return; }
    case 'book': { const p = findPlace(id); if(!p) return;
      if(p.src === 'demo'){ toast(`Demo venue — opening real ${p.label.toLowerCase()} listings nearby`); window.open(bookUrl(p), '_blank', 'noopener'); }
      else window.open(p.website || gmapsUrl(p), '_blank', 'noopener');
      return; }
    case 'share': { const p = findPlace(id); if(p) shareText(p.name, jn(p.name, p.label, starTxt(p), p.src === 'demo' ? 'Roamly demo' : p.address), p.gmaps || dirUrl(p)); return; }
    case 'shareplan': { const P = state.plan; if(!P) return; const title = DAY_TYPES[P.type].emoji + ' ' + DAY_TYPES[P.type].label + ' · ' + fmtDate();
      shareText(title, title + '\n' + P.result.filter(r => r.p).map(r => `${r.s.time} ${r.k.label}: ${r.p.name}`).join('\n')); return; }
    case 'pmoodpick': case 'pmood': case 'pwin': case 'pbudget': case 'pgo': case 'pedit': case 'popen':
    case 'pswap': case 'preset-skip': case 'pdel': case 'padd': case 'pshuffle': return planAct(act, el);
    case 'qcat': state.f.qcat = state.f.qcat === v ? null : v; renderExplore(); if(state.f.qcat) $('#explore').scrollIntoView({behavior:'smooth', block:'start'}); return;
    case 'interest': toggleInterest(v); el.classList.toggle('on', interestOn(v)); return;
    case 'budget': prefs.budget = +v; savePrefs(); enrichAll(); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); $('#budgetDesc').textContent = budgetDesc(prefs.budget); return;
    case 'when': setWhen(v); refresh(); return drawFilters();
    case 'fbudget': prefs.budget = +v; savePrefs(); refresh(); return drawFilters();
    case 'frating': prefs.minRating = +v; savePrefs(); refresh(); return drawFilters();
    case 'fvibe': state.f.vibe = state.f.vibe.includes(v) ? state.f.vibe.filter(x => x !== v) : [...state.f.vibe, v]; refresh(); return drawFilters();
    case 'foffers': state.f.offers = !state.f.offers; refresh(); return drawFilters();
    case 'freset': Object.assign(state.f, {openNow:false, traps:false, offers:false, vibe:[], date:todayISO(), time:defaultTime(), when:'today', dist:prefs.maxDist}); prefs.budget = 4; prefs.minRating = 4.3; savePrefs(); refresh(); return drawFilters();
    case 'onboard': return openOnboarding();
    case 'retry': return loadPlaces(true);
    case 'dmode': prefs.dataMode = v; savePrefs(); state.places = []; loadPlaces(true); return renderProfile();

    case 'onb-skip': case 'onb-gps': case 'onb-preset': case 'onb-geo': case 'onb-int': case 'onb-next': case 'onb-budget': case 'onb-done': return onbAct(act, el);
    case 'opennow': state.f.openNow = !state.f.openNow; toast(state.f.openNow ? 'Showing places open right now' : 'Showing all opening hours'); return refresh();
    case 'visited': return toggleVisited(id, el);
    case 'focusmap': closeSheet(); state.mapMode = 'map'; showTab('map', id); return;
    case 'showmap': state.mapMode = 'map'; return showTab('map');
    case 'loc': return openLocation();
    case 'gps': return requestGPS(true);
    case 'preset': closeSheet(); return setCenter({...PRESETS[+el.dataset.i], source:'manual'});
    case 'geo-pick': { const g = state.geo[+el.dataset.i]; closeSheet(); return setCenter({lat:g.lat, lng:g.lng, label:g.name.split(',')[0], source:'manual'}); }
    case 'area': { if(!MapView.m) return; const c = MapView.m.getCenter(); setCenter({lat:c.lat, lng:c.lng, label:'Selected area', source:'manual'}); return; }
    case 'theme': { const t = theme() === 'dark' ? 'light' : 'dark'; prefs.theme = t; savePrefs(); return applyTheme(t); }
    case 'surprise': return surprise();
    case 'moreideas': state.moreIdeas = !state.moreIdeas; return renderPlanner();
    case 'plan': return openPlanner(el.dataset.plan);
    case 'filters': return openFilters();
    case 'close': return closeSheet();
    case 'traps': state.f.traps = !state.f.traps; refresh(); return drawFilters();
    case 'dist': state.f.dist = +v; return refresh();
    case 'date-pick': state.f.date = v; return refresh();
    case 'people': state.f.people = clamp(state.f.people + +v, 1, 20); refresh(); return drawFilters();
    case 'clearq': state.f.q = ''; state.f.qcat = null; $('#q').value = ''; return renderExplore();
    case 'seeall': { const s = state.secs[el.dataset.sec]; if(s) openSheet(s.title, `<p class="sub">${s.sub}</p><div class="grid">${s.items.map(card).join('')}</div>`, 'list'); return; }
    case 'pref-cat': case 'pref-atmos': case 'pref-day': {
      const key = {['pref-cat']:'cats', ['pref-atmos']:'atmos', ['pref-day']:'days'}[act], val = act === 'pref-day' ? +v : v;
      prefs[key] = prefs[key].includes(val) ? prefs[key].filter(x => x !== val) : [...prefs[key], val];
      el.classList.toggle('on'); savePrefs(); enrichAll();
      if($('#catCount')) $('#catCount').textContent = '· ' + prefs.cats.length + ' selected';
      return;
    }
    case 'pref-seg': prefs[el.dataset.k] = v; savePrefs(); enrichAll(); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); return;
    case 'reset':
      if(confirm('Reset all preferences, favourites and visited places?')){ try{ Object.keys(localStorage).filter(k => k.startsWith('roamly.')).forEach(k => localStorage.removeItem(k)); }catch(e){} location.reload(); }
      return;
  }
}

/* =====================================================================
   12. NAVIGATION & BOOT
   ===================================================================== */
function showTab(t, focusId){
  state.tab = t; enrichAll();
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + t));
  $$('.topnav [data-tab], .bnav [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  window.scrollTo(0, 0);
  ({explore:renderExplore, map:() => renderMap(focusId), saved:renderSaved, profile:renderProfile})[t]();
  syncControls();
}
function renderAll(){
  enrichAll(); updateLoc();
  ({explore:renderExplore, map:() => renderMap(), saved:renderSaved, profile:() => {}})[state.tab]();
  syncControls();
}
document.addEventListener('click', e => {
  if(e.target.id === 'backdrop') return closeSheet();
  const a = e.target.closest('[data-act]'); if(a) return handleAct(a.dataset.act, a);
  const t = e.target.closest('[data-tab]'); if(t){ closeSheet(); return showTab(t.dataset.tab); }
  const mm = e.target.closest('[data-mm]'); if(mm){ state.mapMode = mm.dataset.mm; return renderMap(); }
  const sv = e.target.closest('[data-sv]'); if(sv){ state.savedTab = sv.dataset.sv; return renderSaved(); }
  const c = e.target.closest('[data-id]'); if(c) openDetails(c.dataset.id);
});
document.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.classList && e.target.classList.contains('card')) openDetails(e.target.dataset.id); });
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeSheet(); });

function init(){
  applyTheme(prefs.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  updateLoc();
  loadPlaces();
  $('#searchForm').onsubmit = e => { e.preventDefault(); state.f.q = $('#q').value.trim(); $('#q').blur(); renderExplore(); $('#cats').scrollIntoView({behavior:'smooth'}); };
  $('#q').addEventListener('input', debounce(() => { state.f.q = $('#q').value.trim(); renderExplore(); }, 250));
  showTab('explore');
  if(!state.center.city || !state.center.tz) lookupNames(false);
  if(!store.get('onboarded', false)) openOnboarding();          // first visit: location → interests → budget
  else if(state.center.source !== 'manual') requestGPS(false);  // returning users: refresh GPS position silently
}
init();
