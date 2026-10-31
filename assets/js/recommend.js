// Roamly · Recommendation scoring, reasons ("why you'll like it") and filtering
'use strict';

/* =====================================================================
   7. RECOMMENDATION ENGINE (rules-based; an AI re-ranker could later run in a Netlify Function)
   Weights: interests 30 · rating 18 · review volume 8 · distance 13 · price 8
            popularity 6 · offers 4 · availability on chosen date 5 · atmosphere 5
            company fit 2 · smoking preference 1
   ===================================================================== */
function score(p){
  const cats = prefs.cats, groupsSel = new Set(cats.map(c => CAT[c].group));
  const interest = cats.length ? (cats.includes(p.cat) ? 1 : groupsSel.has(p.group) ? .35 : 0) : .55;
  // Real OpenStreetMap places have no ratings: use notability (Wikipedia/Wikidata) and data completeness instead.
  const rating = hasR(p) ? clamp((p.rating - 3.8)/1.1, 0, 1) : (p.notable ? .8 : .5);
  const rev = p.reviews ? clamp(Math.log10(p.reviews)/Math.log10(5000), 0, 1) : (p.popularity || .4) * .8;
  const dist = 1 - clamp(p.d / Math.max(prefs.maxDist, state.f.dist), 0, 1);
  const price = p.priceKnown === false || p.level <= prefs.budget ? 1 : Math.max(0, 1 - (p.level - prefs.budget)*.5);
  const avail = openAt(p, selDay(), selHour()) ? 1 : .2;
  const atm = prefs.atmos.length ? (p.atmos.some(a => prefs.atmos.includes(a)) ? 1 : 0) : .5;
  const comp = {solo:['relaxed','trendy'], couple:['romantic','relaxed','luxury'], group:['social','lively','adventurous']}[prefs.company] || [];
  const compFit = p.atmos.some(a => comp.includes(a)) ? 1 : .4;
  const smoke = prefs.smoking === 'smoke' ? (p.smoking ? 1 : .2) : 1;
  const raw = .30*interest + .18*rating + .08*rev + .13*dist + .08*price + .06*(p.popularity ?? .4) + .04*(p.offer?1:0) + .05*avail + .05*atm + .02*compFit + .01*smoke;
  return Math.min(99, Math.round(52 + raw*48));
}
const matchLabel = m => m >= 95 ? 'Perfect for your preferences' : m >= 90 ? 'Excellent option nearby' : m >= 85 ? 'Worth discovering' : 'A good alternative';
function enrich(p){ p.d = hav(state.center, p); p.tt = travel(p.d); p.match = score(p); return p; }
const enrichAll = () => state.places.forEach(enrich);
function reasons(p){
  const r = [];
  if(prefs.cats.includes(p.cat)) r.push('Matches your interest in ' + p.label);
  else if(prefs.cats.some(c => CAT[c].group === p.group)) r.push('Close to your ' + GROUPS[p.group].label.split(' &')[0].toLowerCase() + ' picks');
  if(hasR(p)) r.push(p.rating >= 4.7 ? 'Exceptional ' + p.rating.toFixed(1) + '★' : p.rating.toFixed(1) + '★ from ' + (p.reviews || 0).toLocaleString() + ' reviews');
  else if(p.notable) r.push('Well-known local landmark');
  if(p.src === 'google' && p.notable) r.push('Very popular with visitors');
  if(p.cuisine && p.group === 'food') r.push('Cuisine: ' + p.cuisine);
  if(p.d < 2) r.push('Only ' + fmtKm(p.d) + ' away');
  const am = p.atmos.filter(a => prefs.atmos.includes(a)); if(am.length) r.push(cap(am[0]) + ' vibe');
  if(p.offer) r.push('Has an offer');
  if(p.priceKnown !== false && p.level > prefs.budget) r.push('Above your budget');
  return r;
}
const STOP = new Set('best near me the a an in good top around nearby places place find with for tonight today where can i what are which have of to any some open now show'.split(' '));
const SYN = {eat:'food', dinner:'food', lunch:'food', drink:'drinks', party:'nightlife', club:'club', dance:'nightclub', romantic:'romantic', chill:'relaxed', fancy:'luxury', cheap:''};
function tokens(q){ return q.toLowerCase().split(/[^a-z0-9à-ÿ]+/).filter(t => t.length > 1 && !STOP.has(t)).map(t => SYN[t] ?? t).filter(Boolean); }
function filtered(opt = {}){
  const toks = opt.ignoreQuery ? [] : tokens(state.f.q), now = new Date();
  return state.places.filter(p => {
    if(!opt.ignoreDist && p.d > state.f.dist) return false;
    if(hasR(p) && p.rating < prefs.minRating) return false;              // quality filter (default 4.3); unrated real places are kept
    if(!opt.ignoreBudget && p.priceKnown !== false && p.level > prefs.budget) return false;
    if(!opt.ignoreGroup && state.f.qcat && !QCATS[state.f.qcat].test(p)) return false;
    if(!opt.ignoreExtras && state.f.offers && !p.offer) return false;
    if(!opt.ignoreExtras && state.f.vibe.length && !p.atmos.some(a => state.f.vibe.includes(a))) return false;
    if(prefs.setting !== 'any' && p.setting !== 'both' && p.setting !== prefs.setting) return false;
    if(prefs.smoking === 'nosmoke' && p.smoking) return false;
    if(state.f.traps && (p.touristy > .55 || p.chain || (hasR(p) && (p.rating < 4.4 || p.reviews < 80)))) return false;
    if(state.f.openNow && !opt.ignoreOpenNow && (w => openState(p, w.day, w.h))(wall(p)) !== true) return false;
    if(toks.length){
      const hay = (p.name+' '+p.label+' '+GROUPS[p.group].label+' '+p.atmos.join(' ')+' '+p.cat).toLowerCase();
      if(!toks.every(t => hay.includes(t) || hay.includes(t.replace(/(es|s)$/,'')))) return false;
    }
    return true;
  });
}
function shuffleSeeded(arr){ const R = mulberry(hashStr(state.f.date + state.center.lat.toFixed(2))); const a = [...arr];
  for(let i = a.length-1; i > 0; i--){ const j = Math.floor(R()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
