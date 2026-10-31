// Roamly — Google Places proxy (Netlify Function, v2 syntax)
// GET /api/places?lat=25.197&lng=55.274&radius=10   (radius in km, 1–50)
//
// The Google key lives ONLY in the Netlify environment variable GOOGLE_PLACES_API_KEY.
// The browser never sees it. Without the variable this returns 501 and the app simply
// uses OpenStreetMap on its own.

// Place types per discovery group. If Google rejects a list (400), the short fallback list is used.
const GROUPS = [
  [['restaurant','italian_restaurant','japanese_restaurant','sushi_restaurant','indian_restaurant','mediterranean_restaurant','lebanese_restaurant','greek_restaurant',
    'turkish_restaurant','middle_eastern_restaurant','steak_house','seafood_restaurant','brunch_restaurant','breakfast_restaurant','buffet_restaurant','vegan_restaurant',
    'vegetarian_restaurant','hamburger_restaurant','american_restaurant','fast_food_restaurant','pizza_restaurant','ramen_restaurant','chinese_restaurant','thai_restaurant',
    'french_restaurant','spanish_restaurant'], ['restaurant']],
  [['cafe','coffee_shop','bakery','ice_cream_shop'], ['cafe','bakery']],
  [['bar','pub','wine_bar','night_club','karaoke'], ['bar','night_club']],
  [['movie_theater','bowling_alley','amusement_park','amusement_center','water_park','comedy_club','concert_hall','performing_arts_theater'], ['movie_theater','bowling_alley','amusement_park']],
  [['tourist_attraction','museum','art_gallery','historical_landmark','park','botanical_garden','shopping_mall','market','beach','observation_deck','zoo','aquarium','cultural_center'],
   ['tourist_attraction','museum','park','shopping_mall']],
  [['spa','wellness_center','gym','fitness_center','resort_hotel'], ['spa','gym']]
];
// Only the fields the app actually shows (fewer fields = cheaper requests).
const FIELDS = ['id','displayName','location','rating','userRatingCount','priceLevel','primaryType','types','regularOpeningHours.periods',
  'utcOffsetMinutes','photos','websiteUri','nationalPhoneNumber','formattedAddress','googleMapsUri'].map(f => 'places.' + f).join(',');
const PRICE = {PRICE_LEVEL_FREE:0, PRICE_LEVEL_INEXPENSIVE:1, PRICE_LEVEL_MODERATE:2, PRICE_LEVEL_EXPENSIVE:3, PRICE_LEVEL_VERY_EXPENSIVE:4};

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json; charset=utf-8', ...extra}});
const env = name => (globalThis.Netlify?.env?.get?.(name)) ?? process.env[name];

// Best-effort abuse protection (per function instance): 40 requests / 10 min / IP.
const hits = new Map();
function limited(ip){
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 600000);
  list.push(now); hits.set(ip, list);
  return list.length > 40;
}
function sameSite(req){
  const ref = req.headers.get('origin') || req.headers.get('referer');
  if(!ref) return true;                                  // some browsers strip it; the rate limit still applies
  try{
    const host = new URL(ref).host, own = new URL(req.url).host;
    const extra = (env('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean).map(u => { try{ return new URL(u).host; }catch(e){ return u; } });
    return host === own || extra.includes(host);
  }catch(e){ return false; }
}

async function nearby(key, types, lat, lng, radiusKm){
  const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method:'POST',
    headers:{'Content-Type':'application/json', 'X-Goog-Api-Key':key, 'X-Goog-FieldMask':FIELDS},
    body:JSON.stringify({includedTypes:types, maxResultCount:20, rankPreference:'POPULARITY',
      locationRestriction:{circle:{center:{latitude:lat, longitude:lng}, radius:radiusKm * 1000}}})
  });
  const d = await r.json().catch(() => ({}));
  if(!r.ok){ const e = new Error(d.error?.message || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return d.places || [];
}
const compact = p => ({
  id:p.id, name:p.displayName?.text || null, lat:p.location?.latitude, lng:p.location?.longitude,
  rating:p.rating ?? null, reviews:p.userRatingCount ?? null, price:p.priceLevel in PRICE ? PRICE[p.priceLevel] : null,
  primaryType:p.primaryType || null, types:p.types || [], periods:p.regularOpeningHours?.periods || null, utcOffset:p.utcOffsetMinutes ?? null,
  photo:p.photos?.[0]?.name || null, photoBy:p.photos?.[0]?.authorAttributions?.[0]?.displayName || null,
  website:p.websiteUri || null, phone:p.nationalPhoneNumber || null, address:p.formattedAddress || '', gmaps:p.googleMapsUri || null
});

export default async (req, context) => {
  const key = env('GOOGLE_PLACES_API_KEY');
  if(!key) return json({error:'not_configured', message:'Google Places is not enabled on this site'}, 501);
  if(req.method !== 'GET') return json({error:'method_not_allowed'}, 405);
  if(!sameSite(req)) return json({error:'forbidden', message:'Requests are only accepted from this site'}, 403);
  if(limited(context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown')) return json({error:'rate_limited', message:'Too many requests, try again in a few minutes'}, 429);

  const u = new URL(req.url);
  const lat = Number(u.searchParams.get('lat')), lng = Number(u.searchParams.get('lng'));
  const radius = Math.min(50, Math.max(1, Number(u.searchParams.get('radius')) || 10));
  if(!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json({error:'bad_request', message:'lat and lng are required'}, 400);

  try{
    const results = await Promise.all(GROUPS.map(async ([types, fallback]) => {
      try{ return await nearby(key, types, lat, lng, radius); }
      catch(e){ if(e.status === 400) return nearby(key, fallback, lat, lng, radius).catch(() => []); throw e; }
    }));
    const seen = new Set(), places = [];
    for(const list of results) for(const p of list){ if(p.id && !seen.has(p.id)){ seen.add(p.id); places.push(compact(p)); } }
    return json({places, fetchedAt:new Date().toISOString()}, 200, {
      'Cache-Control':'public, max-age=600',
      // Netlify's CDN shares one result per area for an hour → far fewer paid Google calls
      'Netlify-CDN-Cache-Control':'public, durable, s-maxage=3600, stale-while-revalidate=600'
    });
  }catch(e){
    const bad = e.status === 401 || e.status === 403;
    return json({error:bad ? 'google_key_rejected' : 'google_error', message:bad ? 'Google rejected the API key (check the key, its restrictions and that Places API (New) is enabled)' : e.message}, 502);
  }
};

export const config = { path: '/api/places' };
