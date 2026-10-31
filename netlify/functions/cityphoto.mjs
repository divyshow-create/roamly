// Roamly — hero photo of the current city (Netlify Function, v2 syntax)
// GET /api/cityphoto?q=Dubai&lat=25.2&lng=55.3        → {by, place}   (photographer credit, JSON)
// GET /api/cityphoto?q=Dubai&lat=25.2&lng=55.3&img=1  → 302 redirect to the image itself
// Uses Places API (New) Text Search ("<city> skyline", then "<city>") and picks a wide landscape photo.
// The API key stays on the server (GOOGLE_PLACES_API_KEY). Results are cached by Netlify's CDN for a week.
const env = name => (globalThis.Netlify?.env?.get?.(name)) ?? process.env[name];
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json; charset=utf-8', ...extra}});
const WEEK = {'Cache-Control':'public, max-age=86400', 'Netlify-CDN-Cache-Control':'public, durable, s-maxage=604800'};

function sameSite(req){
  const ref = req.headers.get('origin') || req.headers.get('referer');
  if(!ref) return true;
  try{
    const host = new URL(ref).host, own = new URL(req.url).host;
    const extra = (env('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean).map(u => { try{ return new URL(u).host; }catch(e){ return u; } });
    return host === own || extra.includes(host);
  }catch(e){ return false; }
}
async function search(key, textQuery, lat, lng){
  const body = {textQuery, maxResultCount:5, languageCode:'en'};
  if(Number.isFinite(lat) && Number.isFinite(lng)) body.locationBias = {circle:{center:{latitude:lat, longitude:lng}, radius:50000}};
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method:'POST',
    headers:{'Content-Type':'application/json', 'X-Goog-Api-Key':key, 'X-Goog-FieldMask':'places.displayName,places.photos'},
    body:JSON.stringify(body)
  });
  const d = await r.json().catch(() => ({}));
  if(!r.ok){ const e = new Error(d.error?.message || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return d.places || [];
}
// Prefer big landscape photos (they look best behind "Welcome to …")
function pick(places){
  const all = [];
  for(const p of places) for(const ph of (p.photos || []).slice(0, 6)) all.push({ph, place:p.displayName?.text || null});
  return all.find(x => x.ph.widthPx >= 1200 && x.ph.widthPx > x.ph.heightPx * 1.25)
      || all.find(x => x.ph.widthPx > x.ph.heightPx) || all[0] || null;
}

export default async (req) => {
  const key = env('GOOGLE_PLACES_API_KEY');
  if(!key) return json({error:'not_configured'}, 404);
  if(!sameSite(req)) return json({error:'forbidden'}, 403);
  const u = new URL(req.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 80);
  const lat = Number(u.searchParams.get('lat')), lng = Number(u.searchParams.get('lng'));
  if(!q) return json({error:'bad_request', message:'q is required'}, 400);

  let found = null;
  try{
    for(const query of [q + ' skyline', q]){ found = pick(await search(key, query, lat, lng)); if(found) break; }
  }catch(e){ return json({error:'google_error', message:e.message}, 502); }
  if(!found) return json({error:'no_photo'}, 404, {'Cache-Control':'public, max-age=3600'});

  if(u.searchParams.get('img')){
    const r = await fetch(`https://places.googleapis.com/v1/${found.ph.name}/media?maxWidthPx=1600&skipHttpRedirect=true&key=${encodeURIComponent(key)}`);
    const d = await r.json().catch(() => ({}));
    if(!r.ok || !d.photoUri) return new Response('Photo unavailable', {status:404});
    return new Response(null, {status:302, headers:{Location:d.photoUri, 'Cache-Control':'public, max-age=3600', 'Netlify-CDN-Cache-Control':'public, durable, s-maxage=86400'}});
  }
  const a = found.ph.authorAttributions?.[0] || {};
  return json({by:a.displayName || null, byUri:a.uri || null, place:found.place}, 200, WEEK);
};

export const config = { path: '/api/cityphoto' };
