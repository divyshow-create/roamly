// Roamly · Plan-my-day presets and stop types
'use strict';

/* =====================================================================
   8. ITINERARIES (Date Night, After Work, Plan My Day, Weekend)
   ===================================================================== */
const has = (...ids) => p => ids.includes(p.cat);
const notMorning = p => !['breakfast','brunch','bakery'].includes(p.cat);
// Stop types the user can pick for any step of a plan (plus every single category, see kindInfo()).
const SLOTS = {
  breakfast:{label:'Breakfast', emoji:'🍳', test:has('breakfast','brunch','bakery','specialty','coffee')},
  brunch:{label:'Brunch', emoji:'🥞', test:has('brunch','breakfast','bakery')},
  coffee:{label:'Coffee break', emoji:'☕', test:has('coffee','specialty','bakery','dessert','cowork','petcafe')},
  lunch:{label:'Lunch', emoji:'🥗', test:p => p.group==='food' && !['breakfast','finedining','dessert'].includes(p.cat)},
  streetfood:{label:'Casual / street food', emoji:'🌮', test:has('streetfood','casual','healthy','international','indian','italian')},
  dinner:{label:'Dinner', emoji:'🍽️', test:p => p.group==='food' && p.level >= 2 && notMorning(p) && p.cat!=='dessert'},
  romantic:{label:'Romantic dinner', emoji:'🕯️', test:p => p.group==='food' && notMorning(p) && p.cat!=='dessert' && (p.atmos.includes('romantic') || p.level >= 3)},
  finedining:{label:'Fine dining', emoji:'🥂', test:has('finedining','steakhouse','seafood','sushi')},
  dessert:{label:'Dessert', emoji:'🍨', test:has('dessert','bakery')},
  sight:{label:'Sightseeing', emoji:'📸', test:p => p.group==='attraction' && p.cat!=='malls'},
  culture:{label:'Museum / culture', emoji:'🏛️', test:has('museums','galleries','historical','cultural','architecture')},
  shopping:{label:'Shopping', emoji:'🛍️', test:has('malls','markets')},
  park:{label:'Park / garden', emoji:'🌳', test:has('parks','gardens')},
  activity:{label:'Any activity', emoji:'🎯', test:p => p.group==='activity'},
  adventure:{label:'Adventure', emoji:'🏎️', test:has('karting','adventurepark','paintball','watersports','outdoor','shooting')},
  indoorfun:{label:'Indoor fun', emoji:'🎳', test:has('bowling','escape','vr','indoor','gaming','cinema','cooking')},
  beach:{label:'Beach / pool', emoji:'🏖️', test:has('beachclub','beachbar','pools','beach')},
  spa:{label:'Spa & wellness', emoji:'💆', test:has('spa','wellness','dayuse')},
  fitness:{label:'Workout', emoji:'🏋️', test:has('fitness','wellness','outdoor')},
  sunset:{label:'Sunset / viewpoint', emoji:'🌅', test:has('viewpoints','sunset','rooftop','terrace','beachbar')},
  bar:{label:'Drinks / bar', emoji:'🍸', test:has('cocktail','wine','pubs','terrace','rooftop','lounge','sportsbar','beachbar')},
  rooftop:{label:'Rooftop bar', emoji:'🌆', test:has('rooftop','terrace')},
  show:{label:'Show / live music', emoji:'🎭', test:has('comedy','concerts','livemusic','jazz','cinema','events')},
  nightlife:{label:'Night out', emoji:'🪩', test:has('nightclub','livemusic','jazz','lounge','karaoke','shisha')},
  interests:{label:'Any of my interests', emoji:'✨', test:p => prefs.cats.includes(p.cat)},
  free:{label:'Free spot', emoji:'🆓', test:p => p.level === 0},
  cheapeat:{label:'Cheap eats', emoji:'💸', test:p => p.group==='food' && p.level <= 1},
  healthy:{label:'Healthy food', emoji:'🥗', test:has('healthy','mediterranean','sushi','japanese')},
  indoorculture:{label:'Museum / gallery', emoji:'🖼️', test:has('museums','galleries','cultural')},
  luxury:{label:'Luxury experience', emoji:'💎', test:p => p.level >= 4 || p.atmos.includes('luxury')}
};
// Ready-made kinds of day. Every step stays editable in the planner.
const DAY_TYPES = {
  mood:{label:'My mood today', emoji:'✨', desc:'Pick what you feel like', hue:0},   // built from the categories picked for today
  relax:{label:'Relaxing', emoji:'🧘', desc:'Brunch, spa, pool & sunset', hue:150, steps:[['10:00','brunch'],['12:00','spa'],['15:00','beach'],['17:30','park'],['18:30','sunset'],['20:00','dinner']]},
  fitness:{label:'Fitness', emoji:'🏋️', desc:'Workout, healthy food, outdoors', hue:95, steps:[['07:00','c:fitness'],['08:30','healthy'],['10:30','c:outdoor'],['13:00','healthy'],['15:30','spa'],['18:00','park']]},
  activities:{label:'Activities', emoji:'🎯', desc:'Fun things to do all day', hue:200, steps:[['09:30','breakfast'],['11:00','indoorfun'],['13:30','lunch'],['15:00','adventure'],['18:00','sunset'],['20:00','dinner'],['21:30','show']]},
  attractions:{label:'Attractions', emoji:'📸', desc:'Top sights & viewpoints', hue:35, steps:[['09:00','coffee'],['10:00','sight'],['12:00','culture'],['13:30','lunch'],['15:30','sight'],['17:30','sunset'],['20:00','dinner']]},
  foodie:{label:'Foodie', emoji:'😋', desc:'Eat your way around', hue:12, steps:[['09:00','breakfast'],['11:30','coffee'],['13:00','streetfood'],['16:00','dessert'],['18:30','bar'],['20:30','finedining']]},
  beach:{label:'Beach day', emoji:'🏖️', desc:'Sun, sea & beach clubs', hue:185, steps:[['09:30','breakfast'],['11:00','beach'],['14:00','lunch'],['15:30','beach'],['18:00','sunset'],['20:00','dinner']]},
  adventure:{label:'Adventure', emoji:'🧗', desc:'Karting, water sports, thrills', hue:225, steps:[['08:30','breakfast'],['10:00','adventure'],['13:00','lunch'],['15:00','indoorfun'],['17:30','beach'],['20:00','dinner']]},
  culture:{label:'Culture', emoji:'🏛️', desc:'Museums, galleries, heritage', hue:265, steps:[['09:00','coffee'],['10:00','culture'],['13:00','lunch'],['15:00','culture'],['17:00','shopping'],['20:00','dinner']]},
  shopping:{label:'Shopping', emoji:'🛍️', desc:'Malls, markets & coffee', hue:320, steps:[['10:00','brunch'],['11:30','c:malls'],['14:00','lunch'],['15:30','c:markets'],['17:30','coffee'],['20:00','dinner']]},
  indoor:{label:'Beat the heat', emoji:'❄️', desc:'A great day, all indoors', hue:195, steps:[['09:30','breakfast'],['10:30','indoorculture'],['13:00','lunch'],['14:30','indoorfun'],['17:00','c:malls'],['19:30','dinner'],['21:30','c:cinema']]},
  luxury:{label:'Luxury', emoji:'💎', desc:'Treat yourself today', hue:45, steps:[['10:00','brunch'],['11:30','c:dayuse'],['15:00','spa'],['18:00','rooftop'],['20:30','finedining'],['23:00','c:lounge']]},
  budget:{label:'Budget-friendly', emoji:'💸', desc:'Great day, little spend', hue:130, steps:[['09:00','c:bakery'],['10:30','free'],['13:00','cheapeat'],['15:00','free'],['17:30','free'],['19:30','cheapeat']]},
  workchill:{label:'Work & chill', emoji:'💻', desc:'Laptop cafés, then unwind', hue:240, steps:[['08:30','c:specialty'],['09:30','c:cowork'],['13:00','lunch'],['14:30','coffee'],['17:30','park'],['19:30','dinner']]},
  romantic:{label:'Romantic day', emoji:'🌹', desc:'A full day for two', hue:340, steps:[['10:00','brunch'],['12:00','c:gardens'],['14:30','spa'],['17:30','sunset'],['19:30','romantic'],['22:00','c:jazz']]},
  nightout:{label:'Big night out', emoji:'🪩', desc:'Ease in, then party', hue:285, steps:[['11:00','brunch'],['14:00','beach'],['18:00','rooftop'],['20:30','dinner'],['22:30','show'],['00:00','nightlife']]},
  balanced:{label:'A bit of everything', emoji:'🗺️', desc:'Food, sights & fun', hue:20, steps:[['09:00','breakfast'],['10:30','sight'],['13:00','lunch'],['15:00','activity'],['17:30','sunset'],['20:00','dinner']]},
  date:{label:'Date night', emoji:'💞', desc:'Dinner, drinks & a finale', hue:330, steps:[['19:30','romantic'],['21:30','bar'],['23:00','show']]},
  after:{label:'After work', emoji:'🥂', desc:'Unwind, eat, one more', hue:170, steps:[['18:00','bar'],['19:30','streetfood'],['21:00','nightlife']]}
};
const MAIN_DAYS = ['mood','relax','fitness','activities','attractions','foodie','beach','adventure'];
// The 6 big categories on Explore
const inCats = (...ids) => p => ids.includes(p.cat);
const QCATS = {
  food:{label:'Food', emoji:'🍽️', test:p => p.group==='food' && !['breakfast','brunch','dessert'].includes(p.cat)},
  night:{label:'Nightlife', emoji:'🍸', test:p => p.group==='night' && p.cat!=='beachbar'},
  beach:{label:'Beach', emoji:'🏖️', test:inCats('beachclub','beachbar','pools','watersports','beach')},
  activity:{label:'Activities', emoji:'🎯', test:p => p.group==='activity'},
  coffee:{label:'Coffee', emoji:'☕', test:inCats('coffee','specialty','bakery','brunch','breakfast','dessert','cowork','petcafe')},
  culture:{label:'Sights', emoji:'🏛️', test:p => p.group==='attraction'}
};
// Big, human interest groups (onboarding + You). Each maps to detailed categories.
const INTERESTS = {
  restaurants:{label:'Restaurants', emoji:'🍽️', cats:['italian','japanese','sushi','indian','mediterranean','steakhouse','seafood','international','casual']},
  finedining:{label:'Fine dining', emoji:'🥂', cats:['finedining','seafood','steakhouse']},
  coffee:{label:'Coffee & brunch', emoji:'☕', cats:['coffee','specialty','bakery','brunch','breakfast']},
  nightlife:{label:'Bars & clubs', emoji:'🍸', cats:['cocktail','pubs','lounge','nightclub','wine','sportsbar']},
  rooftops:{label:'Rooftops', emoji:'🌆', cats:['rooftop','terrace']},
  beach:{label:'Beaches & clubs', emoji:'🏖️', cats:['beachclub','beachbar','pools','beach']},
  live:{label:'Live music & shows', emoji:'🎵', cats:['livemusic','jazz','concerts','comedy','events','festivals']},
  activities:{label:'Fun activities', emoji:'🎳', cats:['bowling','escape','vr','indoor','gaming','cinema','karaoke']},
  adventure:{label:'Adventure', emoji:'🏎️', cats:['karting','watersports','adventurepark','paintball','outdoor','shooting']},
  culture:{label:'Culture', emoji:'🏛️', cats:['museums','galleries','historical','architecture','cultural']},
  sights:{label:'Sights & views', emoji:'📸', cats:['tourist','viewpoints','sunset','parks','gardens']},
  shopping:{label:'Shopping', emoji:'🛍️', cats:['malls','markets']},
  wellness:{label:'Spa & wellness', emoji:'💆', cats:['spa','wellness','dayuse','luxhotel']},
  fitness:{label:'Fitness', emoji:'🏋️', cats:['fitness','healthy']},
  shisha:{label:'Shisha', emoji:'💨', cats:['shisha']}
};
const interestOn = k => INTERESTS[k].cats.some(c => prefs.cats.includes(c));
function toggleInterest(k){
  const cs = INTERESTS[k].cats;
  prefs.cats = interestOn(k) ? prefs.cats.filter(c => !cs.includes(c)) : [...new Set([...prefs.cats, ...cs])];
  savePrefs(); enrichAll();
}
const BUDGETS = {1:{sym:'€', name:'Budget-friendly'}, 2:{sym:'€€', name:'Moderate'}, 3:{sym:'€€€', name:'Premium'}, 4:{sym:'Any', name:'Luxury / no limit'}};
const budgetDesc = l => l === 4 ? 'No limit' : 'Up to ' + money(PRICE[l][1]) + ' pp';
const parseT = s => { const [h,m] = String(s).split(':').map(Number); const v = (h||0) + (m||0)/60; return v < 5 ? v + 24 : v; };  // 00:00–04:59 = late night
const fmtT = v => { const h = Math.floor(v) % 24, m = Math.round((v % 1) * 60); return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0'); };
function kindInfo(kind){
  if(kind.startsWith('c:')){ const c = CAT[kind.slice(2)]; return {label:c.label, emoji:c.emoji, test:p => p.cat === c.id}; }
  return SLOTS[kind] || SLOTS.activity;
}
const WEEKEND = {
  sat:[{time:'10:30',label:'Brunch',test:has('brunch','breakfast','specialty','bakery')},
       {time:'13:00',label:'Adventure',test:p=>p.group==='activity'||['beachclub','pools'].includes(p.cat)},
       {time:'20:00',label:'Dinner',test:p=>p.group==='food'&&p.level>=2&&!['breakfast','brunch'].includes(p.cat)},
       {time:'22:30',label:'Night out',test:p=>p.group==='night'}],
  sun:[{time:'10:00',label:'Slow morning',test:has('coffee','specialty','bakery','breakfast')},
       {time:'12:00',label:'Explore',test:p=>p.group==='attraction'},
       {time:'15:00',label:'Recharge',test:has('spa','wellness','beachclub','pools','parks','gardens','dayuse')},
       {time:'18:00',label:'Sunset',test:has('viewpoints','sunset','rooftop','terrace','beachbar')}]
};
function buildItinerary(steps, day, shuffle){
  const base = filtered({ignoreGroup:true, ignoreQuery:true, ignoreOpenNow:true}); const used = new Set(); let from = state.center; const out = [];
  for(const s of steps){
    const h = parseInt(s.time, 10) + .5;
    const best = base.filter(p => !used.has(p.id) && s.test(p) && openAt(p, day, h))
      .map(p => ({p, v:p.match - hav(from, p)*1.5 + (shuffle ? Math.random()*10 : 0)})).sort((a,b) => b.v - a.v)[0];
    if(best){ used.add(best.p.id); out.push({...s, p:best.p, leg:hav(from, best.p)}); from = best.p; }
    else out.push({...s, p:null});
  }
  return out;
}
