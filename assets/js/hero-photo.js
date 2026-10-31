// Roamly · real photo of the current city behind "Welcome to …" (Google, via /api/cityphoto).
// Falls back to the illustrated skyline when Google isn't enabled or no photo is found.
'use strict';

// ---- Real photo of the city behind "Welcome to …" (Google, via /api/cityphoto). Falls back to the illustration. ----
let cityPhoto = {key:null, url:null, by:null};
function loadCityPhoto(){
  const c = state.center, city = cityName(), key = city + '|' + c.lat.toFixed(1) + ',' + c.lng.toFixed(1);
  if(cityPhoto.key !== key){
    cityPhoto = {key, url:null, by:null};
    const qs = `q=${encodeURIComponent(city)}&lat=${c.lat.toFixed(1)}&lng=${c.lng.toFixed(1)}`;
    fetch('/api/cityphoto?' + qs).then(r => r.ok ? r.json() : null).then(d => {
      if(!d || cityPhoto.key !== key) return;
      const img = new Image();
      img.onload = () => { if(cityPhoto.key !== key) return; cityPhoto.url = img.src; cityPhoto.by = d.by; applyCityPhoto(); };
      img.src = '/api/cityphoto?' + qs + '&img=1';
    }).catch(() => {});
  }
  applyCityPhoto();
}
function applyCityPhoto(){
  const w = $('#welcome'), sky = $('#sky'); if(!w) return;
  let cr = $('#wCredit');
  if(!cityPhoto.url){ w.style.backgroundImage = ''; sky.style.display = ''; if(cr) cr.remove(); return; }
  // time-of-day tint keeps the text readable and the mood changing through the day
  const tint = {morning:'rgba(255,170,90,.18)', day:'rgba(15,30,70,.12)', sunset:'rgba(255,110,60,.30)', night:'rgba(8,12,40,.58)'}[dayPhase()];
  w.style.backgroundImage = `linear-gradient(${tint},${tint}), url("${cityPhoto.url}")`;
  w.style.backgroundSize = 'cover'; w.style.backgroundPosition = 'center';
  sky.style.display = 'none';
  if(!cr){ cr = document.createElement('div'); cr.id = 'wCredit'; cr.style.cssText = 'position:absolute;right:14px;bottom:8px;font-size:10.5px;color:#fff;opacity:.85;text-shadow:0 1px 4px rgba(0,0,0,.6);pointer-events:none'; w.appendChild(cr); }
  cr.textContent = (cityPhoto.by ? '📷 ' + cityPhoto.by + ' · ' : '📷 ') + 'Google';
}
// Hook into the welcome header: every time it renders, make sure the right city photo is shown.
const renderWelcomeBase = renderWelcome;
renderWelcome = function(){ renderWelcomeBase(); loadCityPhoto(); };
