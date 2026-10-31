// Roamly — Google place photo proxy (Netlify Function, v2 syntax)
// GET /api/photo?name=places/<placeId>/photos/<photoId>
// Asks Google for a short-lived image URL (no key inside it) and redirects the browser there,
// so the API key never appears in the page.
const env = name => (globalThis.Netlify?.env?.get?.(name)) ?? process.env[name];

export default async (req) => {
  const key = env('GOOGLE_PLACES_API_KEY');
  if(!key) return new Response('Not configured', {status:404});
  const name = new URL(req.url).searchParams.get('name') || '';
  if(!/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return new Response('Bad photo name', {status:400});
  const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=640&skipHttpRedirect=true&key=${encodeURIComponent(key)}`);
  const d = await r.json().catch(() => ({}));
  if(!r.ok || !d.photoUri) return new Response('Photo unavailable', {status:404});
  return new Response(null, {status:302, headers:{
    Location:d.photoUri,
    'Cache-Control':'public, max-age=3600',
    'Netlify-CDN-Cache-Control':'public, durable, s-maxage=86400'
  }});
};

export const config = { path: '/api/photo' };
