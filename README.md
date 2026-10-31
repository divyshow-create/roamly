# Roamly — Discover Nearby

Roamly is a location-based app for discovering places and things to do. It finds real places near you (food, nightlife, beaches, activities, sights, coffee), ranks them by your interests, and can plan a whole day for you.

It's plain HTML, CSS and JavaScript, with no framework and no build step. It's ready to deploy from GitHub to Netlify.

---

## Where the data comes from

| Source | Status | What it gives |
|---|---|---|
| **OpenStreetMap** (Overpass API) | Always on, free, no key | Real names, locations, categories and cuisine, plus opening hours, website and phone where listed |
| **Google Places** (via a Netlify Function) | Optional: needs `GOOGLE_PLACES_API_KEY` on Netlify | Adds **ratings, review counts, price levels and photos**. Results are merged with OpenStreetMap and duplicates removed. |
| **Nominatim** | Always on, free | City and area search, plus finding the area name and timezone for a location |
| **Demo mode** | Off by default | Clearly fake sample venues, **only** when switched on in *You → Places data*. Never mixed with real places. |

The app never invents data:

- Missing ratings, prices, photos or opening hours stay empty and are shown as "not listed".
- Opening hours use the venue's local time.
- If the hours can't be parsed, they show as *unknown* (never as *closed*), and the place gets no "Open now" badge.
- If every live source fails, the app shows the last saved **real** results for that area, or an error with a **Retry** button. It never falls back to sample data.

---

## Project structure

```
index.html                    page markup
assets/css/app.css            styles
assets/js/
  core.js                     helpers, storage, Nominatim search, categories
  providers/osm.js            OpenStreetMap / Overpass provider
  providers/google.js         Google provider (calls /api/places, never Google directly)
  providers/demo.js           demo mode only
  data.js                     loader: providers → merge → cache → error state
  state.js                    state, distances, opening hours, venue-local time
  recommend.js                scoring, "why you'll like it", filters
  planner.js                  Plan-my-day presets
  ui.js                       all screens and sheets
  app.js                      actions, navigation, start-up
netlify/functions/places.mjs  /api/places: Google Places proxy (key stays on the server)
netlify/functions/photo.mjs   /api/photo: Google photo proxy (key stays on the server)
netlify.toml                  Netlify settings
.env.example                  environment variables you can set
```

---

## Run it on your computer

**Quick, OpenStreetMap only.** In this folder run:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use a local server rather than double-clicking the file, because GPS only works on `localhost` or `https`.

**With Google Places, using the Netlify CLI:**

```bash
npm install -g netlify-cli
cp .env.example .env          # paste your key after GOOGLE_PLACES_API_KEY=
netlify dev                   # opens http://localhost:8888 with the functions running
```

`.env` is in `.gitignore`, so it is never committed.

---

## Deploy: GitHub → Netlify

1. **Create a GitHub repository** (it can be private) and upload all the files in this folder.

   ```bash
   git init
   git add .
   git commit -m "Roamly"
   git branch -M main
   git remote add origin https://github.com/<you>/roamly.git
   git push -u origin main
   ```

2. **Netlify → Add new site → Import an existing project → GitHub →** pick the repository.

   Netlify reads `netlify.toml`: there's no build command, the publish directory is `.`, and the functions are in `netlify/functions`. Click **Deploy**.

3. The site works straight away with OpenStreetMap at `https://<your-site>.netlify.app`.

### Turn on Google Places (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and add billing.
2. Enable **Places API (New)**.
3. Create an **API key**. Under *API restrictions*, allow only **Places API (New)**. Don't add website restrictions: the key is used by the Netlify server, not by the browser.
4. Set a **budget alert** and a **daily quota** in Google Cloud, so a traffic spike can't surprise you.
5. In Netlify, go to **Site configuration → Environment variables → Add** and set `GOOGLE_PLACES_API_KEY` to your key.
6. Trigger a redeploy with **Deploys → Trigger deploy**.

In the app, *You → Places data* should now show **Google Places: Connected**.

If you use a custom domain, add it to `ALLOWED_ORIGINS` (for example `https://roamly.app`).

### Costs and limits

- Each **new area** costs about **6 Google "Nearby Search" requests**. Each photo shown costs one photo request.
- Netlify's CDN caches each area's results for one hour (and photos for a day). Repeat visits to the same area don't call Google again.
- Google gives a free monthly allowance per API product; beyond it, requests are billed. Check current pricing in the Google Maps Platform console.
- `/api/places` only accepts requests from your own site, and limits each visitor to 40 requests per 10 minutes. This is a basic protection, not a guarantee.
- The public OpenStreetMap servers (Overpass, Nominatim) are free but rate-limited, and their usage policies require attribution, which the app shows. That's fine for a personal app or a launch. For heavy traffic, move to a hosted Overpass or geocoding provider, or proxy and cache them through a Netlify Function.

---

## Testing checklist

| Scenario | Expected |
|---|---|
| No Google key | OpenStreetMap places; You shows "Not enabled on this site" |
| Valid Google key | Ratings, prices and photos; source "Google + OpenStreetMap" |
| Invalid Google key | OpenStreetMap places; You shows Google **Error** with the reason |
| Both sources down | Saved real results with a ⚠️ notice and Retry, or an error screen with Retry |
| GPS denied | Setup moves on; choose an area by search or a popular place |
| Demo mode on/off | Yellow DEMO MODE banner; only sample places; switching back reloads real places |
| Favourites | Saved on the device; survive reloads and switching providers |

---

## Known limitations

- **Not connected yet:** booking availability, tickets, events, offers and weather. The app says so ("Availability not verified") and links to the venue's website or Google Maps.
- **Travel times are estimates.**
- **OpenStreetMap coverage varies:** some small venues are missing or have no opening hours. Google Places fills most gaps.
- **Opening-hours parser:** it handles the common formats (weekdays, split hours, overnight, `24/7`, `off`). Public holidays, seasonal rules and sunrise/sunset times show as *unknown*.
