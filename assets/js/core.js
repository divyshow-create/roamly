// Roamly · helpers, storage, location search (Nominatim) and the category taxonomy
'use strict';

/* =====================================================================
   1. LOCATION SEARCH — OpenStreetMap Nominatim (free; max ~1 request/second, attribution required)
   Future integrations (bookings, tickets, events, weather, AI ranking) belong in Netlify Functions
   like netlify/functions/places.mjs, so no secret key is ever shipped to the browser.
   ===================================================================== */
const API = {
  // LIVE: OpenStreetMap Nominatim geocoding (free, ~1 req/sec fair-use).
  async geocode(q){
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' + encodeURIComponent(q), {headers:{'Accept-Language':'en'}});
    if(!r.ok) throw new Error('geocode');
    return (await r.json()).map(x => ({ name:x.display_name, lat:+x.lat, lng:+x.lon }));
  },
  async reverse(lat, lng){
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&lat=${lat}&lon=${lng}`, {headers:{'Accept-Language':'en'}});
    if(!r.ok) throw new Error('reverse');
    const a = (await r.json()).address || {};
    return { area: a.suburb || a.neighbourhood || a.quarter || a.city_district || a.town || a.city || a.village || null,
             city: a.city || a.town || a.village || a.municipality || a.county || a.state || null, cc: a.country_code || null };
  }
};

/* =====================================================================
   2. HELPERS & STORAGE
   ===================================================================== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const store = {
  get(k, d){ try{ const v = localStorage.getItem('roamly.'+k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('roamly.'+k, JSON.stringify(v)); }catch(e){} }
};
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function hashStr(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function debounce(fn, ms){ let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function isoLocal(d){ const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,10); }
const todayISO = () => isoLocal(new Date());
function addDaysISO(n){ const d = new Date(); d.setDate(d.getDate()+n); return isoLocal(d); }
function nextDow(dow){ const d = new Date(); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7)); return d; }
let toastT;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800); }

/* =====================================================================
   3. TAXONOMY — groups & categories
   ===================================================================== */
const GROUPS = {
  food:      {label:'Food & Restaurants',  emoji:'🍽️', hue:14,  price:[1,3], hours:[12,23], atmos:['relaxed','social','romantic'], setting:'in'},
  night:     {label:'Nightlife & Drinks',  emoji:'🍸', hue:275, price:[2,3], hours:[17,26], atmos:['lively','social','trendy'],   setting:'in', smoke:true},
  activity:  {label:'Activities',          emoji:'🎯', hue:200, price:[2,3], hours:[10,22], atmos:['adventurous','social','lively'], setting:'in'},
  attraction:{label:'Places & Attractions',emoji:'🏛️', hue:38,  price:[0,2], hours:[9,19],  atmos:['relaxed','romantic'],        setting:'both'},
  relax:     {label:'Relax & Lifestyle',   emoji:'🌿', hue:150, price:[1,3], hours:[8,20],  atmos:['relaxed','luxury'],          setting:'in'}
};
// [id, label, group, emoji, name words, overrides]
const CATS = [
  ['italian','Italian','food','🍝',['Trattoria','Osteria','Cucina']],
  ['japanese','Japanese','food','🍱',['Izakaya','Japanese Kitchen']],
  ['sushi','Sushi','food','🍣',['Sushi Bar','Omakase']],
  ['indian','Indian','food','🍛',['Tandoor','Masala House']],
  ['mediterranean','Mediterranean','food','🫒',['Taverna','Mezze Kitchen']],
  ['steakhouse','Steakhouse','food','🥩',['Grill','Steakhouse'],{price:[3,4]}],
  ['seafood','Seafood','food','🦞',['Fish House','Oyster Bar'],{price:[2,4]}],
  ['finedining','Fine dining','food','🥂',['Maison','Table'],{price:[4,4],atmos:['romantic','luxury'],hours:[19,24]}],
  ['casual','Casual dining','food','🍔',['Diner','Eatery'],{price:[1,2],atmos:['relaxed','social']}],
  ['brunch','Brunch','food','🥞',['Brunch Club','Café'],{hours:[9,16],atmos:['social','trendy']}],
  ['breakfast','Breakfast','food','🍳',['Breakfast Co.','Morning Room'],{hours:[7,13],price:[1,2]}],
  ['buffet','Buffets','food','🍤',['Buffet','Feast Hall'],{price:[2,3],atmos:['social']}],
  ['streetfood','Street food','food','🌮',['Street Kitchen','Food Yard'],{price:[1,1],setting:'out',atmos:['lively','social']}],
  ['healthy','Healthy food','food','🥗',['Greens','Bowl Bar'],{price:[1,2],hours:[8,21]}],
  ['international','International','food','🌍',['Brasserie','Bistro']],
  ['dessert','Dessert & gelato','food','🍨',['Gelateria','Dessert Lab'],{price:[1,1],hours:[11,24]}],
  ['pubs','Pubs','night','🍺',['Arms','Tap House'],{price:[1,2],hours:[12,25]}],
  ['sportsbar','Sports bars','night','📺',['Sports Bar','Score Lounge'],{price:[1,2],hours:[12,26]}],
  ['rooftop','Rooftop bars','night','🌆',['Rooftop','Sky Bar'],{setting:'out',atmos:['romantic','trendy','luxury'],price:[3,4]}],
  ['terrace','Terrace bars','night','🌇',['Terrace','Garden Bar'],{setting:'out',atmos:['relaxed','social']}],
  ['cocktail','Cocktail bars','night','🍸',['Cocktail Club','Speakeasy'],{atmos:['romantic','trendy']}],
  ['beachbar','Beach bars','night','🏝️',['Beach Bar','Beach Shack'],{setting:'out',hours:[11,24],atmos:['relaxed','social']}],
  ['nightclub','Nightclubs','night','🪩',['Club','Nightclub'],{price:[3,4],hours:[23,29],atmos:['lively','trendy'],entry:true}],
  ['lounge','Lounges','night','🛋️',['Lounge','Social'],{atmos:['luxury','relaxed']}],
  ['livemusic','Live music','night','🎸',['Music Hall','Live Room'],{hours:[19,26],atmos:['lively','social'],entry:true}],
  ['jazz','Jazz bars','night','🎷',['Jazz Club','Jazz Room'],{hours:[19,26],atmos:['romantic','relaxed']}],
  ['shisha','Shisha lounges','night','💨',['Shisha Lounge','Majlis'],{atmos:['relaxed','social'],setting:'both'}],
  ['wine','Wine bars','night','🍷',['Wine Bar','Enoteca'],{atmos:['romantic','relaxed']}],
  ['karaoke','Karaoke','night','🎤',['Karaoke','Sing Box'],{atmos:['lively','social']}],
  ['cinema','Cinema','activity','🎬',['Cinema','Picture House'],{price:[1,2],atmos:['relaxed','romantic'],hours:[11,25]}],
  ['bowling','Bowling','activity','🎳',['Bowl','Lanes']],
  ['karting','Go-karting','activity','🏎️',['Karting','Speedway'],{atmos:['adventurous','lively']}],
  ['escape','Escape rooms','activity','🔐',['Escape','Puzzle Rooms']],
  ['vr','VR experiences','activity','🥽',['VR Arena','Virtual Lab']],
  ['watersports','Water sports','activity','🏄',['Watersports','Surf Club'],{setting:'out',hours:[8,18],atmos:['adventurous']}],
  ['adventurepark','Adventure parks','activity','🧗',['Adventure Park','Rope Park'],{setting:'out',hours:[9,18]}],
  ['indoor','Indoor activities','activity','🏓',['Play Hall','Fun Factory']],
  ['outdoor','Outdoor activities','activity','🚴',['Outdoor Co.','Trail Hub'],{setting:'out',hours:[7,19]}],
  ['paintball','Paintball','activity','🎨',['Paintball','Tactical Park'],{setting:'out',hours:[9,18]}],
  ['shooting','Shooting ranges','activity','🎖️',['Shooting Club','Range'],{hours:[10,21]}],
  ['gaming','Gaming lounges','activity','🎮',['Gaming Lounge','Arcade'],{price:[1,2],hours:[12,26]}],
  ['comedy','Comedy clubs','activity','😂',['Comedy Club','Laugh House'],{hours:[19,25],atmos:['lively','social'],entry:true}],
  ['concerts','Concerts','activity','🎵',['Arena','Concert Hall'],{hours:[19,24],entry:true,atmos:['lively']}],
  ['festivals','Festivals','activity','🎪',['Festival Grounds','Fest'],{setting:'out',hours:[14,24],entry:true}],
  ['events','Events today','activity','📅',['Event Space','Pop-up'],{hours:[17,23],entry:true}],
  ['cooking','Cooking classes','activity','👩‍🍳',['Cooking School','Kitchen Studio'],{hours:[10,21]}],
  ['museums','Museums','attraction','🏛️',['Museum','Museum of Art'],{price:[1,2],hours:[10,18]}],
  ['galleries','Art galleries','attraction','🖼️',['Gallery','Art Space'],{price:[0,1],hours:[10,19]}],
  ['historical','Historical sites','attraction','🏰',['Fort','Heritage Quarter'],{price:[0,1]}],
  ['architecture','Architecture','attraction','🏙️',['Tower','Pavilion'],{price:[0,2]}],
  ['tourist','Tourist attractions','attraction','📸',['Observation Deck','Landmark'],{price:[2,3],tourist:true}],
  ['parks','Parks','attraction','🌳',['Park','Green'],{price:[0,0],setting:'out',hours:[6,23]}],
  ['gardens','Gardens','attraction','🌺',['Gardens','Botanic Garden'],{price:[0,1],setting:'out',hours:[8,20]}],
  ['malls','Shopping malls','attraction','🛍️',['Mall','Galleria'],{price:[0,0],hours:[10,24],setting:'in'}],
  ['markets','Markets','attraction','🧺',['Souk','Market'],{price:[0,1],hours:[9,22]}],
  ['viewpoints','Scenic viewpoints','attraction','🌄',['Viewpoint','Lookout'],{price:[0,0],setting:'out',hours:[0,24],atmos:['romantic','relaxed']}],
  ['cultural','Cultural experiences','attraction','🎭',['Cultural Centre','Heritage House'],{price:[1,2]}],
  ['sunset','Sunset spots','attraction','🌅',['Sunset Point','Pier'],{price:[0,0],setting:'out',hours:[0,24],atmos:['romantic']}],
  ['beachclub','Beach clubs','relax','🏖️',['Beach Club','Beach House'],{price:[3,4],setting:'out',hours:[10,24],atmos:['luxury','trendy','lively'],entry:true}],
  ['pools','Swimming pools','relax','🏊',['Pool Club','Lido'],{setting:'out',price:[2,3],hours:[8,20]}],
  ['beach','Beaches','relax','🏝️',['Beach','Bay'],{price:[0,0],setting:'out',hours:[6,20],atmos:['relaxed','romantic']}],
  ['spa','Spas','relax','💆',['Spa','Hammam'],{price:[3,4],atmos:['relaxed','luxury','romantic'],hours:[9,22]}],
  ['wellness','Wellness centres','relax','🧘',['Wellness','Studio'],{price:[2,3],hours:[7,21]}],
  ['fitness','Fitness clubs','relax','🏋️',['Fitness','Athletic Club'],{price:[1,2],hours:[6,23]}],
  ['coffee','Coffee shops','relax','☕',['Coffee','Café'],{price:[1,1],hours:[7,22],atmos:['relaxed','social']}],
  ['specialty','Specialty coffee','relax','🫘',['Roasters','Coffee Lab'],{price:[1,1],hours:[7,19],atmos:['relaxed','trendy']}],
  ['bakery','Bakeries','relax','🥐',['Bakery','Boulangerie'],{price:[1,1],hours:[7,19]}],
  ['luxhotel','Luxury hotels','relax','🏨',['Grand Hotel','Resort'],{price:[4,4],hours:[0,24],atmos:['luxury','romantic']}],
  ['dayuse','Day-use hotels','relax','🛎️',['Day Pass','Hotel Day Club'],{price:[3,4],hours:[9,19],atmos:['luxury','relaxed']}],
  ['petcafe','Pet-friendly cafés','relax','🐾',['Paws Café','Dog Café'],{price:[1,1],hours:[8,20]}],
  ['cowork','Co-working cafés','relax','💻',['Work Café','Hub'],{price:[1,1],hours:[7,22]}]
];
const CAT = {};
const CAT_LIST = CATS.map(([id,label,group,emoji,words,o={}], i) => {
  const g = GROUPS[group];
  return CAT[id] = { id, label, group, emoji, words,
    price:o.price||g.price, hours:o.hours||g.hours, atmos:o.atmos||g.atmos,
    setting:o.setting||g.setting, smoke:o.smoke ?? g.smoke ?? false,
    entry:!!o.entry, tourist:!!o.tourist, hue:(g.hue + (i % 9) * 8) % 360 };
});
const ATMOS = ['relaxed','romantic','lively','luxury','social','adventurous','trendy'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DISTS = [1,3,5,10,20,30,50];
const DMIN = 1, DMAX = 50;
// Slider is non-linear (more precision for short distances): position 0–100 ↔ 1–50 km.
const toPos = km => Math.round(Math.sqrt((km - DMIN)/(DMAX - DMIN))*100);
const toKm = pos => { const km = DMIN + Math.pow(pos/100, 2)*(DMAX - DMIN); return km < 10 ? Math.round(km*2)/2 : Math.round(km); };
const distLabel = km => (km % 1 ? km.toFixed(1) : km) + ' km';
// One reusable distance "line": data-dist="filter" changes the current search, "pref" changes the saved max distance.
function distSlider(target, value, label = '📏 Within'){
  const pos = toPos(value);
  return `<div class="dist"><span class="dl">${label}</span><div class="track">
    <input type="range" class="rng" min="0" max="100" step="1" value="${pos}" style="--p:${pos}%" data-dist="${target}" aria-label="Maximum distance in km">
    <div class="ticks">${[1,5,10,20,50].map(k => `<span style="left:${toPos(k)}%">${k}</span>`).join('')}</div></div>
    <span class="dv">${distLabel(value)}</span></div>`;
}
const distTouch = {el:null, t:0};   // the slider being dragged is never reset mid-drag
const applyDistDebounced = debounce(() => { state.secs = {}; refresh(); if(state.source !== 'demo' && !state.loading && state.f.dist > state.fetchR + .5) refetchDebounced(); }, 220);
const refetchDebounced = debounce(() => loadPlaces(), 900);
document.addEventListener('input', e => {
  const t = e.target; if(!t.dataset || !t.dataset.dist) return;
  distTouch.el = t; distTouch.t = Date.now();
  const km = toKm(+t.value); t.style.setProperty('--p', t.value + '%');
  t.closest('.dist').querySelector('.dv').textContent = distLabel(km);
  if(t.dataset.dist === 'pref'){ prefs.maxDist = km; state.f.dist = km; savePrefs(); enrichAll(); }
  else { state.f.dist = km; applyDistDebounced(); }
});
document.addEventListener('change', e => { const t = e.target; if(t.dataset && t.dataset.dist === 'pref') toast('Preferences saved'); });
const MODE_ICON = {car:'🚗', walk:'🚶', transit:'🚇'};
const MODE_NAME = {car:'car', walk:'walking', transit:'public transport'};
const PRICE = [[0,0],[6,15],[15,35],[35,70],[80,160]];   // € per person by price level
const CUR = { AED:{sym:'AED ',rate:4}, EUR:{sym:'€',rate:1}, GBP:{sym:'£',rate:.86}, USD:{sym:'$',rate:1.08}, INR:{sym:'₹',rate:90} };
const PRESETS = [
  {label:'Dubai Marina',tz:'Asia/Dubai',city:'Dubai',lat:25.0805,lng:55.1403},{label:'Downtown Dubai',tz:'Asia/Dubai',city:'Dubai',lat:25.1972,lng:55.2744},
  {label:'Palm Jumeirah',tz:'Asia/Dubai',city:'Dubai',lat:25.1124,lng:55.139},{label:'Málaga Centro',tz:'Europe/Madrid',city:'Málaga',lat:36.7213,lng:-4.4214},
  {label:'Benalmádena',tz:'Europe/Madrid',city:'Benalmádena',lat:36.5988,lng:-4.5166},{label:'Milano',tz:'Europe/Rome',city:'Milano',lat:45.4642,lng:9.19},{label:'London',tz:'Europe/London',city:'London',lat:51.5072,lng:-0.1276}
];
