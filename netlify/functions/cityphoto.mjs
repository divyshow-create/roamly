// Roamly — hero photo of the current city (Netlify Function, v2 syntax)
// GET /api/cityphoto?q=Dubai&lat=25.2&lng=55.3        → {by, place}   (photographer credit, JSON)
// GET /api/cityphoto?q=Dubai&lat=25.2&lng=55.3&img=1  → 302 redirect to the image itself
// Uses Places API (New) Text Search for the city's most-reviewed tourist attractions (Burj Khalifa, Dubai Fountain…)
// and takes their main cover photo: wide shots only, never images uploaded by the business itself (those are often adverts).
// The API key stays on the server (GOOGLE_PLACES_API_KEY). Results are cached by Netlify's CDN for a week.
const env = name => (globalThis.Netlify?.env?.get?.(name)) ?? process.env[name];
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json; charset=utf-8', ...extra}});
const WEEK = {'Cache-Control':'public, max-age=3600', 'Netlify-CDN-Cache-Control':'public, durable, s-maxage=604800'};

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
  const body = {textQuery, includedType:'tourist_attraction', maxResultCount:10, languageCode:'en'};
  if(Number.isFinite(lat) && Number.isFinite(lng)) body.locationBias = {circle:{center:{latitude:lat, longitude:lng}, radius:50000}};
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method:'POST',
    headers:{'Content-Type':'application/json', 'X-Goog-Api-Key':key, 'X-Goog-FieldMask':'places.displayName,places.photos,places.userRatingCount'},
    body:JSON.stringify(body)
  });
  const d = await r.json().catch(() => ({}));
  if(!r.ok){ const e = new Error(d.error?.message || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return d.places || [];
}
// Best photo = cover photo of the most famous attraction: wide, large, and not posted by the business itself.
function pick(places){
  const top = [...places].filter(p => (p.photos || []).length).sort((a,b) => (b.userRatingCount || 0) - (a.userRatingCount || 0)).slice(0, 4);
  const ok = (ph, name) => ph.widthPx >= 1200 && ph.widthPx >= ph.heightPx * 1.3 &&
    !(ph.authorAttributions || []).some(a => (a.displayName || '').toLowerCase() === (name || '').toLowerCase());
  for(const p of top){
    const name = p.displayName?.text || '';
    const ph = (p.photos || []).slice(0, 5).find(x => ok(x, name));
    if(ph) return {ph, place:name};
  }
  const p = top[0];
  return p ? {ph:p.photos[0], place:p.displayName?.text || null} : null;
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
    for(const query of [`top tourist attractions in ${q}`, `${q} landmarks`]){ found = pick(await search(key, query, lat, lng)); if(found) break; }
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
