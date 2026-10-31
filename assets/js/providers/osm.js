// Roamly · OpenStreetMap provider (Overpass API): query, tag → category mapping, normalised place objects
'use strict';

// ---- OpenStreetMap / Overpass ----
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
function overpassQuery(c, km){
  const R = Math.round(km * 1000), a = `(around:${R},${c.lat.toFixed(5)},${c.lng.toFixed(5)})`, far = `(around:50000,${c.lat.toFixed(5)},${c.lng.toFixed(5)})`;
  return `[out:json][timeout:60];
(nwr["amenity"~"^(restaurant|fast_food|ice_cream|food_court)$"]["name"]${a};)->.food; .food out tags center 500;
(nwr["amenity"="cafe"]["name"]${a}; nwr["shop"~"^(bakery|pastry)$"]["name"]${a};)->.cafe; .cafe out tags center 220;
(nwr["amenity"~"^(bar|pub|nightclub|biergarten|hookah_lounge|karaoke_box)$"]["name"]${a};)->.night; .night out tags center 320;
(nwr["leisure"~"^(bowling_alley|escape_game|amusement_arcade|water_park|trampoline_park|miniature_golf|ice_rink)$"]["name"]${a};
 nwr["amenity"~"^(cinema|theatre|arts_centre|concert_hall)$"]["name"]${a};
 nwr["sport"~"^(karting|paintball|shooting|surfing|kitesurfing|scuba_diving|climbing)$"]["name"]${a};
 nwr["tourism"="theme_park"]["name"]${a};)->.act; .act out tags center 260;
(nwr["tourism"~"^(museum|gallery|attraction|viewpoint|zoo|aquarium)$"]["name"]${a};
 nwr["historic"~"^(castle|fort|monument|archaeological_site|ruins|city_gate|building)$"]["name"]${a};
 nwr["leisure"~"^(park|garden)$"]["name"]${a}; nwr["shop"="mall"]["name"]${a};
 nwr["amenity"="marketplace"]["name"]${a}; nwr["natural"="beach"]["name"]${a};)->.sight; .sight out tags center 320;
(nwr["leisure"~"^(beach_resort|fitness_centre|spa|sauna)$"]["name"]${a}; nwr["amenity"~"^(spa|coworking_space)$"]["name"]${a};
 nwr["shop"="massage"]["name"]${a}; nwr["tourism"="hotel"]["stars"~"^5"]["name"]${a};)->.relax; .relax out tags center 220;
(nwr["tourism"~"^(attraction|museum|theme_park|viewpoint|zoo|aquarium)$"]["wikidata"]["name"]${far};
 nwr["leisure"="beach_resort"]["name"]${far};)->.far; .far out tags center 160;`;
}
async function overpass(q, signal){
  for(const ep of OVERPASS){
    if(signal && signal.aborted) throw new DOMException('aborted', 'AbortError');
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 60000);
    const stop = () => ctl.abort(); if(signal) signal.addEventListener('abort', stop);
    try{
      const r = await fetch(ep, {method:'POST', body:'data=' + encodeURIComponent(q), headers:{'Content-Type':'application/x-www-form-urlencoded'}, signal:ctl.signal});
      if(r.ok) return await r.json();
    }catch(e){ if(signal && signal.aborted) throw e; }
    finally{ clearTimeout(to); if(signal) signal.removeEventListener('abort', stop); }
  }
  throw new Error('OpenStreetMap servers are busy or unreachable');
}
function osmCat(t){
  const a = t.amenity, l = t.leisure, tr = t.tourism, sh = t.shop, sp = t.sport || '', n = (t['name:en'] || t.name || '').toLowerCase(), cu = (t.cuisine || '').toLowerCase();
  const c = (...w) => w.some(x => cu.includes(x));
  if(a === 'restaurant'){
    if(/rooftop|sky ?bar/.test(n)) return 'rooftop';
    if(c('sushi')) return 'sushi';
    if(c('japanese','ramen')) return 'japanese';
    if(c('italian','pizza')) return 'italian';
    if(c('indian','pakistani','nepal','sri_lankan')) return 'indian';
    if(c('steak')) return 'steakhouse';
    if(c('seafood','fish')) return 'seafood';
    if(c('lebanese','greek','turkish','mediterranean','arab','middle_eastern','persian','syrian','moroccan','emirati','spanish','tapas')) return 'mediterranean';
    if(c('breakfast')) return 'breakfast';
    if(c('brunch')) return 'brunch';
    if(c('vegan','vegetarian','salad','healthy','poke','juice')) return 'healthy';
    if(c('burger','american','diner','chicken','sandwich')) return 'casual';
    if(c('buffet') || /buffet/.test(n)) return 'buffet';
    return 'international';
  }
  if(a === 'fast_food' || a === 'food_court') return 'streetfood';
  if(a === 'ice_cream') return 'dessert';
  if(a === 'cafe'){ if(/roast|specialty|brew/.test(n) || c('specialty')) return 'specialty'; if(c('dessert','cake','ice_cream','chocolate')) return 'dessert'; if(/cowork/.test(n)) return 'cowork'; return 'coffee'; }
  if(sh === 'bakery' || sh === 'pastry') return 'bakery';
  if(a === 'bar'){ if(t.rooftop === 'yes' || /rooftop|sky ?bar|skyview|terrace/.test(n)) return 'rooftop'; if(/beach/.test(n)) return 'beachbar'; if(/wine|enoteca/.test(n)) return 'wine'; if(/jazz/.test(n)) return 'jazz'; if(/sport/.test(n) || t.sport) return 'sportsbar'; if(/lounge/.test(n)) return 'lounge'; if(t.live_music === 'yes') return 'livemusic'; return 'cocktail'; }
  if(a === 'pub') return /sport/.test(n) || t.sport ? 'sportsbar' : 'pubs';
  if(a === 'biergarten') return 'terrace';
  if(a === 'nightclub') return 'nightclub';
  if(a === 'hookah_lounge') return 'shisha';
  if(a === 'karaoke_box') return 'karaoke';
  if(a === 'cinema') return 'cinema';
  if(a === 'theatre') return /comedy|laugh/.test(n) ? 'comedy' : 'cultural';
  if(a === 'arts_centre') return 'cultural';
  if(a === 'concert_hall') return 'concerts';
  if(l === 'bowling_alley') return 'bowling';
  if(l === 'escape_game') return 'escape';
  if(l === 'amusement_arcade') return /vr|virtual/.test(n) ? 'vr' : 'gaming';
  if(l === 'water_park') return 'watersports';
  if(['trampoline_park','miniature_golf','ice_rink'].includes(l)) return 'indoor';
  if(/karting/.test(sp)) return 'karting';
  if(/paintball/.test(sp)) return 'paintball';
  if(/shooting/.test(sp)) return 'shooting';
  if(/surf|kite|diving/.test(sp)) return 'watersports';
  if(/climbing/.test(sp)) return 'adventurepark';
  if(tr === 'theme_park') return 'adventurepark';
  if(tr === 'museum') return 'museums';
  if(tr === 'gallery') return 'galleries';
  if(tr === 'viewpoint') return 'viewpoints';
  if(tr === 'zoo' || tr === 'aquarium') return 'tourist';
  if(t.historic) return 'historical';
  if(tr === 'attraction') return /tower|bridge|frame|building|mosque|khalifa|opera/.test(n) ? 'architecture' : 'tourist';
  if(l === 'park') return 'parks';
  if(l === 'garden') return 'gardens';
  if(sh === 'mall') return 'malls';
  if(a === 'marketplace') return 'markets';
  if(t.natural === 'beach') return 'beach';
  if(l === 'beach_resort') return 'beachclub';
  if(l === 'fitness_centre') return 'fitness';
  if(l === 'spa' || a === 'spa' || sh === 'massage' || l === 'sauna') return 'spa';
  if(tr === 'hotel') return 'luxhotel';
  if(a === 'coworking_space') return 'cowork';
  return null;
}
function fromOSM(e){
  const t = e.tags || {}, cat = osmCat(t), lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
  if(!cat || !t.name || lat == null) return null;
  const c = CAT[cat], lvl = Math.round((c.price[0] + c.price[1]) / 2), notable = !!(t.wikidata || t.wikipedia);
  const address = [[t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '), t['addr:suburb'] || t['addr:district'] || t['addr:neighbourhood'], t['addr:city']].filter(Boolean).join(', ');
  return {
    id:'osm_' + e.type[0] + e.id, src:'osm', name:t['name:en'] || t.name, cat, label:c.label, group:c.group, emoji:c.emoji, hue:c.hue, lat, lng,
    level:lvl, minEur:PRICE[lvl][0], maxEur:PRICE[lvl][1], priceKnown:false, rating:null, reviews:null,
    popularity:clamp(.3 + (notable ? .35 : 0) + Math.min(Object.keys(t).length, 30)/100, 0, 1),
    touristy:tr0(t, cat), chain:!!(t.brand || t['brand:wikidata']), notable,
    periods:parseOH(t.opening_hours), ohRaw:t.opening_hours || null,
    atmos:c.atmos, setting:t.outdoor_seating === 'yes' ? 'both' : c.setting, entry:c.entry, smoking:t.smoking === 'yes' || cat === 'shisha',
    blurb:t['description:en'] || t.description || '', website:t.website || t['contact:website'] || t.url || null,
    phone:t.phone || t['contact:phone'] || null, address, cuisine:t.cuisine ? t.cuisine.replace(/_/g,' ').replace(/;/g,', ') : null,
    osmUrl:`https://www.openstreetmap.org/${e.type}/${e.id}`
  };
}
const tr0 = (t, cat) => cat === 'tourist' || t.tourism === 'attraction' ? .7 : (t.brand ? .5 : .3);
async function fetchOSM(center, km, signal){
  const data = await overpass(overpassQuery(center, km), signal), seen = new Set(), list = [], now = new Date().toISOString();
  for(const e of data.elements || []){ const k = e.type + e.id; if(seen.has(k)) continue; seen.add(k); const p = fromOSM(e); if(p){ p.srcId = e.type + '/' + e.id; p.updated = now; list.push(p); } }
  return list;
}
