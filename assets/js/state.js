// Roamly · App state, distances, opening hours (OSM parser) and venue-local time
'use strict';

/* =====================================================================
   5. STATE
   ===================================================================== */
const DEFAULT_PREFS = {cats:[],atmos:[],budget:4,maxDist:10,transport:'car',setting:'any',company:'couple',days:[5,6],smoking:'any',minRating:4.3,currency:'AED',theme:null};
let prefs = {...DEFAULT_PREFS, ...store.get('prefs', {})};
let favs = store.get('favs', []);
let visited = store.get('visited', []);
const savePrefs = () => store.set('prefs', prefs);
const DEFAULT_LOC = {lat:25.1972, lng:55.2744, label:'Downtown Dubai', city:'Dubai', tz:'Asia/Dubai', source:'default'};
function defaultTime(){ const h = new Date().getHours(); return h < 10 ? '10:00' : h < 12 ? '13:00' : h < 18 ? '20:00' : h < 22 ? String(h+1).padStart(2,'0')+':00' : '23:00'; }
const state = {
  center: store.get('center', null) || DEFAULT_LOC,
  places: [], loading:false, source:null, fetchR:0, tab:'explore', mapMode:'map', savedTab:'fav', actCat:'all', sheetKind:null, secs:{}, geo:[], plan:null, moodOpen:false,
  todayCats: (store.get('today', {}).date === todayISO() ? store.get('today', {}).cats : []) || [],
  f: { dist:prefs.maxDist, q:'', group:'all', date:todayISO(), time:defaultTime(), people:2, traps:false, openNow:false, qcat:null, offers:false, vibe:[], when:'today' }
};

/* =====================================================================
   6. GEO, TIME & FORMATTING
   ===================================================================== */
function hav(a, b){ const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
// Travel times are estimates (straight-line distance × 1.3). Real times would need a directions API via a Netlify Function.
function travel(km){ const r = km*1.3; return { walk:Math.round(r/4.8*60), car:Math.max(2, Math.round(r/30*60 + 3)), transit:Math.round(r/18*60 + 8) }; }
const fmtKm = d => d < 1 ? Math.round(d*1000/10)*10 + ' m' : d.toFixed(d < 10 ? 1 : 0) + ' km';
const fmtMin = m => m < 60 ? m + ' min' : Math.floor(m/60) + ' h' + (m%60 ? ' ' + (m%60) + ' min' : '');
const hh = h => String(Math.floor(h) % 24).padStart(2,'0') + ':00';
const selDate = () => new Date(state.f.date + 'T12:00:00');
const selDay = () => selDate().getDay();
const selHour = () => { const [h,m] = state.f.time.split(':').map(Number); return h + (m||0)/60; };
function fmtDate(){ if(state.f.date === todayISO()) return 'Today'; if(state.f.date === addDaysISO(1)) return 'Tomorrow';
  return selDate().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); }
// Opening hours: p.periods[day] = [[startHour, endHour], ...] (end may exceed 24 for after-midnight).
// openState → true / false / null (unknown — many real places don't list hours).
function openState(p, day, h){
  const P = p.periods; if(!P) return null;
  if((P[day] || []).some(([a,b]) => h >= a && h < b)) return true;
  if((P[(day+6)%7] || []).some(([a,b]) => b > 24 && h + 24 < b)) return true;
  return false;
}
const closedOn = (p, day) => !!(p.periods && p.periods[day] && !p.periods[day].length && !(p.periods[(day+6)%7] || []).some(([a,b]) => b > 24));
// ---- Venue-local time: opening hours are judged in the place's own timezone, not the phone's ----
const COUNTRY_TZ = {ae:'Asia/Dubai', es:'Europe/Madrid', it:'Europe/Rome', gb:'Europe/London', ie:'Europe/Dublin', fr:'Europe/Paris', de:'Europe/Berlin', nl:'Europe/Amsterdam',
  be:'Europe/Brussels', ch:'Europe/Zurich', at:'Europe/Vienna', pt:'Europe/Lisbon', gr:'Europe/Athens', tr:'Europe/Istanbul', pl:'Europe/Warsaw', cz:'Europe/Prague', hu:'Europe/Budapest',
  dk:'Europe/Copenhagen', se:'Europe/Stockholm', no:'Europe/Oslo', fi:'Europe/Helsinki', hr:'Europe/Zagreb', mt:'Europe/Malta', cy:'Asia/Nicosia', in:'Asia/Kolkata', pk:'Asia/Karachi',
  lk:'Asia/Colombo', np:'Asia/Kathmandu', th:'Asia/Bangkok', vn:'Asia/Ho_Chi_Minh', sg:'Asia/Singapore', my:'Asia/Kuala_Lumpur', ph:'Asia/Manila', hk:'Asia/Hong_Kong', jp:'Asia/Tokyo',
  kr:'Asia/Seoul', cn:'Asia/Shanghai', sa:'Asia/Riyadh', qa:'Asia/Qatar', om:'Asia/Muscat', bh:'Asia/Bahrain', kw:'Asia/Kuwait', jo:'Asia/Amman', lb:'Asia/Beirut', il:'Asia/Jerusalem',
  eg:'Africa/Cairo', ma:'Africa/Casablanca', za:'Africa/Johannesburg', ke:'Africa/Nairobi', mv:'Indian/Maldives', mu:'Indian/Mauritius', nz:'Pacific/Auckland', ar:'America/Argentina/Buenos_Aires'};
const tzCache = {};
function tzOffset(tz){                       // minutes east of UTC, DST-aware, via the browser's Intl data
  const k = tz + '|' + new Date().getUTCHours();
  if(k in tzCache) return tzCache[k];
  let off = null;
  try{
    const part = new Intl.DateTimeFormat('en-US', {timeZone:tz, timeZoneName:'longOffset'}).formatToParts(new Date()).find(x => x.type === 'timeZoneName').value;
    const m = part.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/); off = m ? (m[1] === '-' ? -1 : 1) * (+m[2]*60 + +(m[3] || 0)) : 0;
  }catch(e){}
  return tzCache[k] = off;
}
function areaOffset(){
  const c = state.center;
  if(c.tz){ const o = tzOffset(c.tz); if(o != null) return o; }
  if(c.source === 'gps' || c.source === 'default' && !c.tz) return -new Date().getTimezoneOffset();
  return Math.round(c.lng / 15) * 60;         // rough fallback for countries with several timezones
}
// Wall-clock time at a place (or in the current area when p is null)
function wall(p){
  const off = p && p.utcOffset != null ? p.utcOffset : areaOffset();
  const d = new Date(Date.now() + off * 60000);
  return {day:d.getUTCDay(), h:d.getUTCHours() + d.getUTCMinutes()/60, hh:d.getUTCHours(), mm:d.getUTCMinutes()};
}
const openAt = (p, day, h) => openState(p, day, h) !== false;   // unknown hours are not excluded
const is247 = p => p.periods && p.periods.every(d => d.some(([a,b]) => a <= 0 && b >= 24));
const fmtH = v => { const h = Math.floor(v) % 24, m = Math.round((v % 1) * 60); return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0'); };
const spanTxt = d => d.length ? d.map(([a,b]) => fmtH(a) + '–' + fmtH(b)).join(', ') : 'Closed';
function hoursText(p){
  if(!p.periods) return p.ohRaw ? p.ohRaw : 'Hours not listed';
  if(is247(p)) return 'Open 24h';
  return 'Today ' + spanTxt(p.periods[new Date().getDay()]);
}
function openNowHtml(p){
  const w = wall(p), d = w.day, h = w.h, st = openState(p, d, h);
  if(st === null) return '<span class="nv">Hours not listed</span>';
  if(is247(p)) return '<span class="open">Open 24h</span>';
  if(st){
    const cur = (p.periods[d] || []).find(([a,b]) => h >= a && h < b) || (p.periods[(d+6)%7] || []).map(([a,b]) => [a-24, b-24]).find(([a,b]) => h < b);
    return '<span class="open">Open now</span>' + (cur ? ' · until ' + fmtH(cur[1]) : '');
  }
  const next = (p.periods[d] || []).find(([a]) => a > h);
  return '<span class="closed">Closed now</span>' + (next ? ' · opens ' + fmtH(next[0]) : '');
}
// Small parser for OpenStreetMap opening_hours (covers the common formats; anything exotic → unknown)
const OSM_DAYS = {Su:0, Mo:1, Tu:2, We:3, Th:4, Fr:5, Sa:6};
function parseOH(str){
  if(!str) return null;
  const s0 = str.trim();
  if(/^24\/7$/.test(s0)) return Array.from({length:7}, () => [[0,24]]);
  const P = Array(7).fill(null);
  for(let r of s0.split(/\s*;\s*/).filter(Boolean)){
    r = r.replace(/\s*\|\|.*$/, '').replace(/"[^"]*"/g, '').trim();
    if(/^PH\b/.test(r)) continue;
    const m = r.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?\s*,?\s*)+)?(.*)$/);
    if(!m) return null;
    const dp = (m[1] || '').trim(), tp = m[2].trim();
    let days = [];
    if(!dp) days = [0,1,2,3,4,5,6];
    else for(const seg of dp.split(/\s*,\s*/).filter(Boolean)){
      if(seg === 'PH') continue;
      const [a, b] = seg.split(/\s*-\s*/);
      if(b === undefined) days.push(OSM_DAYS[a]);
      else { let k = OSM_DAYS[a]; for(let g = 0; g < 7; g++){ days.push(k); if(k === OSM_DAYS[b]) break; k = (k+1) % 7; } }
    }
    if(!days.length) continue;
    let spans = [];
    if(/^(off|closed)$/i.test(tp)) spans = [];
    else if(!tp || tp === '24/7') spans = [[0,24]];
    else for(const t of tp.split(/\s*,\s*/)){
      const a = t.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\+?$/), o = t.match(/^(\d{1,2}):(\d{2})\+$/);
      if(a){ const x = +a[1] + a[2]/60; let y = +a[3] + a[4]/60; if(y <= x) y += 24; spans.push([x, y]); }
      else if(o){ const x = +o[1] + o[2]/60; spans.push([x, x + 4]); }
      else return null;
    }
    days.forEach(d => P[d] = spans);
  }
  return P.every(x => x === null) ? null : P.map(x => x || []);
}
function num(eur){ const v = eur * CUR[prefs.currency].rate; const r = v >= 100 ? Math.round(v/10)*10 : v >= 20 ? Math.round(v/5)*5 : Math.round(v); return r.toLocaleString('en-GB'); }
const money = eur => CUR[prefs.currency].sym + num(eur);
function priceText(p){ if(p.priceKnown === false) return ''; if(p.src === 'google') return p.level ? '$'.repeat(p.level) : 'Free'; if(!p.level) return 'Free'; if(p.entry) return 'Entry from ' + money(p.minEur);
  if(p.group==='activity' || p.group==='attraction') return 'Tickets from ' + money(p.minEur);
  return CUR[prefs.currency].sym + num(p.minEur) + '–' + num(p.maxEur) + ' pp'; }
const hasR = p => p.rating != null;
const starTxt = p => hasR(p) ? `★ ${p.rating.toFixed(1)}` : '';
const jn = (...a) => a.filter(Boolean).join(' · ');
const offerTitle = o => o.t.replace('{d}', money(o.d));
