// Auswertungen für das Dashboard: wer hat wann was bewertet.
// Eingabe sind Einträge je Kategorie ({def, item}), item bereits normalisiert.

// Zeitpunkt einer Wertung: ratedAt (seit 24.09.2026). Ältere Wertungen haben keins;
// stammt die Wertung vom Autor, gilt die Anlagezeit des Eintrags (id = Date.now()).
export function idTime(id){
  const n=parseInt(String(id),10);
  return n>=1e12&&n<1e14?n:null;
}
export function ratingTime(item,rater,rating){
  if(typeof rating?.ratedAt==="number")return rating.ratedAt;
  if(item.author===rater)return idTime(item.id);
  return null;
}

// Alle einzelnen Wertungen als flache Liste
export function flattenRatings(entries){
  const out=[];
  for(const {def,item} of entries){
    for(const [rater,rating] of Object.entries(item.ratings||{})){
      out.push({def,item,rater,rating,time:ratingTime(item,rater,rating)});
    }
  }
  return out;
}
const newestFirst=(a,b)=>b.time-a.time;

export function dashboardStats({ratingEntries,suggEntries,user,friends}){
  const all=flattenRatings(ratingEntries);
  const own=all.filter(r=>r.rater===user);
  const byCat={};
  for(const r of own){
    byCat[r.def.id]=byCat[r.def.id]||{def:r.def,n:0};
    byCat[r.def.id].n++;
  }
  const topCategories=Object.values(byCat).sort((a,b)=>b.n-a.n||a.def.label.localeCompare(b.def.label)).slice(0,3);
  const friendSet=new Set(friends);
  return{
    ownCount:own.length,
    categoryCount:Object.keys(byCat).length,
    openSuggestions:suggEntries.filter(({item})=>item.author===user||friendSet.has(item.author)).length,
    lastOwn:own.filter(r=>r.time).sort(newestFirst)[0]||null,
    friendsLatest:all.filter(r=>r.rater!==user&&friendSet.has(r.rater)&&r.time).sort(newestFirst).slice(0,3),
    topCategories,
  };
}

// "heute", "gestern", "vor 3 Tagen", "vor 2 Wochen", sonst Datum
export function relativeTime(ts,now=Date.now()){
  const day=86400000;
  const startOf=x=>{const d=new Date(x);d.setHours(0,0,0,0);return d.getTime();};
  const days=Math.round((startOf(now)-startOf(ts))/day);
  if(days<=0)return "heute";
  if(days===1)return "gestern";
  if(days<7)return "vor "+days+" Tagen";
  if(days<14)return "letzte Woche";
  if(days<35)return "vor "+Math.floor(days/7)+" Wochen";
  return "am "+new Date(ts).toLocaleDateString("de-DE");
}
