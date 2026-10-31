// Roamly · Google Places provider — calls our Netlify Function (/api/places); the API key never reaches the browser
'use strict';

// ---- Google Places — through our own Netlify Function (/api/places). The API key stays on the server. ----
const GMAP = {italian_restaurant:'italian', pizza_restaurant:'italian', japanese_restaurant:'japanese', ramen_restaurant:'japanese', sushi_restaurant:'sushi', indian_restaurant:'indian',
  mediterranean_restaurant:'mediterranean', lebanese_restaurant:'mediterranean', greek_restaurant:'mediterranean', turkish_restaurant:'mediterranean', middle_eastern_restaurant:'mediterranean', spanish_restaurant:'mediterranean',
  steak_house:'steakhouse', seafood_restaurant:'seafood', fine_dining_restaurant:'finedining', brunch_restaurant:'brunch', breakfast_restaurant:'breakfast', buffet_restaurant:'buffet',
  vegan_restaurant:'healthy', vegetarian_restaurant:'healthy', hamburger_restaurant:'casual', american_restaurant:'casual', fast_food_restaurant:'streetfood', food_court:'streetfood',
  ice_cream_shop:'dessert', dessert_shop:'dessert', cafe:'coffee', coffee_shop:'coffee', bakery:'bakery', bar:'cocktail', wine_bar:'wine', pub:'pubs', night_club:'nightclub', karaoke:'karaoke',
  movie_theater:'cinema', bowling_alley:'bowling', amusement_park:'adventurepark', amusement_center:'indoor', water_park:'watersports', comedy_club:'comedy', concert_hall:'concerts', performing_arts_theater:'cultural',
  museum:'museums', art_gallery:'galleries', historical_landmark:'historical', park:'parks', botanical_garden:'gardens', garden:'gardens', shopping_mall:'malls', market:'markets', beach:'beach',
  observation_deck:'viewpoints', zoo:'tourist', aquarium:'tourist', cultural_center:'cultural', tourist_attraction:'tourist', spa:'spa', wellness_center:'wellness', gym:'fitness', fitness_center:'fitness',
  resort_hotel:'luxhotel', restaurant:'international'};
function gPeriods(oh){
  if(!oh || !oh.length) return null;
  const P = Array.from({length:7}, () => []);
  for(const pr of oh){
    const o = pr.open, c = pr.close;
    if(!o) continue;
    if(!c) return Array.from({length:7}, () => [[0,24]]);            // open 24/7
    const a = o.hour + (o.minute||0)/60; let b = c.hour + (c.minute||0)/60 + ((c.day - o.day + 7) % 7) * 24;
    if(b <= a) b += 24;
    P[o.day].push([a, b]);
  }
  return P;
}
// g = compact place returned by /api/places (see netlify/functions/places.mjs)
function fromGoogle(g, now){
  let cat = null; for(const t of [g.primaryType, ...(g.types || [])]){ if(t && GMAP[t]){ cat = GMAP[t]; break; } }
  if(!cat || !g.name) return null;
  const n = g.name.toLowerCase();
  if(/beach club/.test(n)) cat = 'beachclub';
  else if(/rooftop|sky ?bar/.test(n) && (cat === 'cocktail' || cat === 'international')) cat = 'rooftop';
  else if(cat === 'cocktail' && /shisha|hookah/.test(n)) cat = 'shisha';
  else if(cat === 'cocktail' && /lounge/.test(n)) cat = 'lounge';
  else if(cat === 'cocktail' && /beach/.test(n)) cat = 'beachbar';
  const c = CAT[cat];
  return {
    id:'g_' + g.id, srcId:g.id, gid:g.id, src:'google', updated:now, name:g.name, cat, label:c.label, group:c.group, emoji:c.emoji, hue:c.hue, lat:g.lat, lng:g.lng,
    level:g.price ?? Math.round((c.price[0] + c.price[1]) / 2), minEur:0, maxEur:0, priceKnown:g.price != null,
    rating:g.rating ?? null, reviews:g.reviews ?? null,
    popularity:g.reviews ? clamp(Math.log10(g.reviews)/4, 0, 1) : .3,
    touristy:(g.types || []).includes('tourist_attraction') ? .7 : .3, chain:false, notable:(g.reviews || 0) > 5000,
    periods:gPeriods(g.periods), ohRaw:null, utcOffset:g.utcOffset ?? null,
    atmos:c.atmos, setting:c.setting, entry:c.entry, smoking:cat === 'shisha',
    blurb:g.summary || '', website:g.website || null, phone:g.phone || null, address:g.address || '', gmaps:g.gmaps || null,
    photo:g.photo ? '/api/photo?name=' + encodeURIComponent(g.photo) : null, photoBy:g.photoBy || null
  };
}
const googleState = {available:null};   // null = unknown, false = no function / not configured on this host
async function fetchGoogle(center, km, signal){
  if(googleState.available === false) throw new Error('not configured');
  const r = await fetch(`/api/places?lat=${center.lat.toFixed(3)}&lng=${center.lng.toFixed(3)}&radius=${Math.round(Math.min(km, 50))}`, {signal});
  if(r.status === 404 || r.status === 501){ googleState.available = false; throw new Error('not configured'); }
  const data = await r.json().catch(() => ({}));
  if(!r.ok){ googleState.available = 'error'; googleState.msg = data.message || 'Google Places error ' + r.status; throw new Error(googleState.msg); }
  googleState.available = true;
  const now = new Date().toISOString();
  return (data.places || []).map(g => fromGoogle(g, now)).filter(Boolean);
}
// Same venue from two providers → keep Google's (ratings/photos) and borrow OSM's missing contact details.
const normName = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(the|restaurant|cafe|café|bar|lounge|dubai)\b/g, '').replace(/[^a-z0-9]/g, '');
function mergeProviders(google, osm){
  const out = [...google];
  for(const o of osm){
    const nn = normName(o.name);
    const dup = google.find(g => hav(g, o) < .15 && nn && (normName(g.name).includes(nn) || nn.includes(normName(g.name))));
    if(dup){ dup.website = dup.website || o.website; dup.phone = dup.phone || o.phone; dup.osmUrl = o.osmUrl; if(!dup.periods && o.periods) dup.periods = o.periods; }
    else out.push(o);
  }
  return out;
}

// ---- Loader: Google (if key) → OpenStreetMap → demo ----
