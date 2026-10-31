// Roamly · Data loader: live providers → merge/dedupe → area cache → error state. Demo only when chosen in "You"
'use strict';

// Real results for an area are remembered (fresh for 6 h; older copies are only used if live data fails).
const areaKey = c => `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
function cacheGet(c){ try{ const all = JSON.parse(localStorage.getItem('roamly.cache') || '{}'); return all[areaKey(c)] || null; }catch(e){ return null; } }
function cachePut(c, entry){
  try{
    const all = JSON.parse(localStorage.getItem('roamly.cache') || '{}'); all[areaKey(c)] = entry;
    const keys = Object.keys(all).sort((a,b) => all[b].t - all[a].t); keys.slice(3).forEach(k => delete all[k]);   // keep last 3 areas
    localStorage.setItem('roamly.cache', JSON.stringify(all));
  }catch(e){ /* storage full or blocked — fine, caching is optional */ }
}
let loadCtl = null;
async function loadPlaces(force){
  if(loadCtl) loadCtl.abort();                                     // cancel the outdated request
  const ctl = loadCtl = new AbortController(), center = {...state.center}, mode = prefs.dataMode || 'live';
  state.loadErr = null; state.cachedAt = null;
  if(mode === 'demo'){
    state.places = generatePlaces(center); state.source = 'demo'; state.fetchR = 99; state.loading = false;
    renderAll(); if(state.tab === 'profile') renderProfile(); return;
  }
  const km = Math.max(state.f.dist, 5), cached = cacheGet(center);
  if(!force && cached && cached.km >= km && Date.now() - cached.t < 6*3600e3){
    state.places = cached.list; state.source = cached.src; state.fetchR = cached.km; state.loading = false;
    renderAll(); if(state.tab === 'profile') renderProfile(); return;
  }
  state.loading = true; if(state.source === 'demo') state.places = []; renderAll();
  const errors = [];
  const gP = fetchGoogle(center, Math.min(km, 50), ctl.signal).catch(e => { if(e.message !== 'not configured') errors.push('Google Places: ' + e.message); return null; });
  const oP = fetchOSM(center, Math.min(km, 25), ctl.signal).catch(e => { errors.push(e.message); return null; });
  // Show Google results as soon as they arrive, then merge OpenStreetMap when it finishes.
  gP.then(g => { if(ctl === loadCtl && g && g.length){ state.places = g; state.source = 'google'; state.fetchR = Math.min(km, 50); renderAll(); } });
  const [g, o] = await Promise.all([gP, oP]);
  if(ctl !== loadCtl || ctl.signal.aborted) return;
  let list = null, src = null;
  if(g && g.length && o){ list = mergeProviders(g, o); src = 'google+osm'; }
  else if(g && g.length){ list = g; src = 'google'; }
  else if(o){ list = o; src = 'osm'; }
  state.loading = false;
  if(list){
    state.places = list; state.source = src; state.fetchR = src === 'osm' ? Math.min(km, 25) : Math.min(km, 50);
    cachePut(center, {t:Date.now(), km:state.fetchR, src, list});
  } else if(cached){
    state.places = cached.list; state.source = cached.src; state.fetchR = cached.km; state.cachedAt = cached.t;
    state.loadErr = errors.join(' · ') || 'Live data unavailable';
  } else {
    state.places = []; state.source = 'none'; state.loadErr = errors.join(' · ') || 'Live data unavailable';
  }
  renderAll(); if(state.tab === 'profile') renderProfile();
}
const srcPill = p => p.src === 'google' ? '<span class="pill live">Google</span>' : p.src === 'osm' ? '<span class="pill live">OpenStreetMap</span>' : '<span class="pill demo">Demo data</span>';
function sourceLine(){
  if(state.loading) return state.places.length ? '📡 Adding more places…' : '📡 Finding real places near you…';
  const when = state.cachedAt ? `⚠️ Live data unavailable — showing saved results from ${new Date(state.cachedAt).toLocaleString('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit'})}. ` : '';
  if(state.source === 'google+osm') return when + '📡 Live places from Google Places (Powered by Google) and OpenStreetMap (© OpenStreetMap contributors)';
  if(state.source === 'google') return when + '📡 Live places, ratings & photos from Google Places · Powered by Google';
  if(state.source === 'osm') return when + '📡 Real places from OpenStreetMap (© OpenStreetMap contributors). Ratings, prices and photos appear when Google Places is enabled on the server.';
  if(state.source === 'demo') return '🧪 DEMO MODE — sample places, not real businesses. Switch to real places in “You”.';
  return '';
}
