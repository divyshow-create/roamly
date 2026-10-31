// Roamly · DEMO MODE ONLY — generates clearly fake sample venues; never mixed with live data
'use strict';

/* =====================================================================
   4. DEMO DATA GENERATOR
   Used ONLY in demo mode (switched on in "You"). Never mixed with real places.
   Seeded by location so the same area always shows the same demo venues.
   ===================================================================== */
const NAMES = ['Azure','Saffron','Marlowe','Coral','Juniper','Lantern','Cedar','Atlas','Ember','Halcyon','Velvet','Mirage','Nomad','Solstice','Driftwood','Copper','Palm','Indigo','Luna','Oasis','Amber','Sable','Willow','Monsoon','Zephyr','Harbour','Pearl','Falcon','Olive','Sienna','Orchid','Dune','Tide','Fig','Ivory','Kestrel','Maple','Nova','Opal','Quill','Riviera','Sol','Terra','Umbra','Vela','Wren'];
const BLURBS = {
  food:['Consistently praised for its {l} — fresh ingredients and generous portions.','A local favourite for {l}, with warm service and a lovely room.','Great-value {l} that regulars keep coming back to.'],
  night:['Buzzing atmosphere, a great crowd and a strong drinks list.','Signature cocktails and a vibe that peaks after 22:00.','Relaxed early, lively late — a reliable night out.'],
  activity:['Well run, easy to book and great fun with friends.','A high-energy experience that suits groups and first-timers.','Friendly staff and consistently top-rated sessions.'],
  attraction:['A rewarding stop that visitors consistently recommend.','Perfect for an unhurried hour or two.','Beautiful setting and well worth the visit.'],
  relax:['A calm escape with attentive service.','Polished, relaxing and great for recharging.','Reliable quality in a beautiful, peaceful setting.']
};
const REVIEWS = {
  food:['Food was outstanding and the staff were lovely.','Best meal we had all week — book ahead.','Great value for the quality.'],
  night:['Amazing vibe, music on point.','Cocktails were creative and well balanced.','Gets busy after 10pm — worth it.'],
  activity:['So much fun, we will be back!','Well organised, great staff.','Perfect for our group.'],
  attraction:['Stunning — allow at least an hour.','Well maintained and quiet early in the day.','A must-see.'],
  relax:['Felt completely recharged.','Spotless and peaceful.','Lovely staff, great atmosphere.']
};
const OFFERS = {
  food:[p=>({t:'Set lunch menu {d}',o:p.minEur*1.35,d:p.minEur,cond:'Mon–Fri 12:00–15:00, dine-in'}),
        p=>({t:'20% off à la carte',o:p.maxEur,d:p.maxEur*.8,cond:'Sun–Thu before 19:00'})],
  night:[p=>({t:'Happy Hour 17:00–20:00',o:p.maxEur,d:p.maxEur*.6,cond:'Selected drinks, daily'}),
         p=>({t:'2-for-1 cocktails',o:p.maxEur,d:p.maxEur/2,cond:'Tue–Thu 19:00–21:00'}),
         p=>({t:'Free entry before 23:00',o:p.minEur,d:0,cond:'Guest-list sign-up required'})],
  activity:[p=>({t:'15% off off-peak sessions',o:p.minEur,d:p.minEur*.85,cond:'Weekdays before 17:00'}),
            p=>({t:'Group deal: 4 for the price of 3',o:p.minEur*4,d:p.minEur*3,cond:'Groups of 4, online booking'})],
  attraction:[p=>({t:'Combo ticket saves 20%',o:p.maxEur,d:p.maxEur*.8,cond:'With partner venue'}),
              p=>({t:'Late entry {d}',o:p.minEur,d:p.minEur*.7,cond:'After 17:00'})],
  relax:[p=>({t:'Weekday day pass {d}',o:p.maxEur,d:p.maxEur*.75,cond:'Mon–Thu, subject to capacity'}),
         p=>({t:'Second treatment 50% off',o:p.maxEur*2,d:p.maxEur*1.5,cond:'Same visit, pre-booked'})]
};

function generatePlaces(center){
  const seed = (Math.round(center.lat*50)*7919 + Math.round(center.lng*50)*104729) >>> 0;
  const R = mulberry(seed), pick = a => a[Math.floor(R()*a.length)], rnd = (a,b) => a + R()*(b-a), ri = (a,b) => Math.floor(rnd(a, b+1));
  const used = new Set(), out = []; let n = 0;
  for(const c of CAT_LIST){
    const count = 3 + (R() < .6 ? 1 : 0);
    for(let i = 0; i <= count; i++){
      const far = i === count;                          // one "worth the drive" candidate per category
      const km = far ? rnd(18,48) : Math.pow(R(), .85)*15 + .25;
      const ang = R()*Math.PI*2;
      const lat = center.lat + (km*Math.sin(ang))/111.32;
      const lng = center.lng + (km*Math.cos(ang))/(111.32*Math.cos(center.lat*Math.PI/180));
      let name, tries = 0; do { name = pick(NAMES) + ' ' + pick(c.words); tries++; } while(used.has(name) && tries < 25); used.add(name);
      const level = ri(c.price[0], c.price[1]);
      const [pMin, pMax] = PRICE[level];
      const minEur = level ? Math.round(rnd(pMin, (pMin+pMax)/2)) : 0;
      const maxEur = level ? Math.round(rnd(Math.max(minEur+5, (pMin+pMax)/2), pMax+5)) : 0;
      const is24 = c.hours[0] === 0 && c.hours[1] >= 24;
      const open = is24 ? 0 : clamp(c.hours[0] + ri(-1,1), 0, 23);
      const close = is24 ? 24 : c.hours[1] + ri(-1,0);
      const closed = c.id === 'nightclub' ? [1,2,3] : ((c.group==='food'||c.group==='attraction') && R() < .22 ? [1] : []);
      let atmos = c.atmos.filter(() => R() < .8); if(!atmos.length) atmos = [c.atmos[0]];
      if(level >= 4 && !atmos.includes('luxury')) atmos.push('luxury');
      const rv = [...REVIEWS[c.group]].sort(() => R() - .5);
      const p = {
        id:'p'+seed.toString(36)+'_'+(n++), name, cat:c.id, label:c.label, group:c.group, emoji:c.emoji, hue:c.hue,
        lat, lng, level, minEur, maxEur,
        rating: Math.min(4.9, Math.round((3.7 + Math.pow(R(), .55)*1.25)*10)/10),
        reviews: Math.round(Math.exp(rnd(Math.log(18), Math.log(6500)))),
        popularity: R(), touristy: c.tourist ? rnd(.6,1) : rnd(0,.75),
        open, close, closed, periods:Array.from({length:7}, (_, d) => closed.includes(d) ? [] : [[open, close]]), src:'demo', priceKnown:true,
        atmos, setting:c.setting, entry:c.entry,
        smoking: c.smoke ? R() < .6 : (c.group==='food' ? R() < .1 : false),
        blurb: pick(BLURBS[c.group]).replace('{l}', c.label.toLowerCase()),
        reviewsDemo: rv.slice(0,2), demo:true
      };
      if(level > 0 && R() < .3){
        const o = pick(OFFERS[c.group])(p), v = new Date(); v.setDate(v.getDate() + 7 + Math.floor(R()*30));
        p.offer = { ...o, valid:'Until ' + v.toLocaleDateString('en-GB',{day:'numeric',month:'short'}), source:'Demo data — not a real promotion' };
      }
      out.push(p);
    }
  }
  return out;
}
