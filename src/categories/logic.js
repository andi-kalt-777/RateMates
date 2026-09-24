// Rechen- und Speicherlogik für jede Kategorie, gesteuert über ihre Definition.
// Formulare arbeiten mit einheitlichen Namen (name, field1, types, Kriterien, kommentar);
// erst beim Speichern werden daraus die Feldnamen der Datenbank (city, cuisines …).
import {stamped,normalizeRest,dupKey} from "../lib/ratings.js";

const ratingKeys=def=>[def.overall.key,...def.criteria.map(c=>c.key)];

// Freitextfeld eines Eintrags; Film und Serie haben es teils nur unter dem Altnamen
export function field1Of(def,item){
  const f=def.field1;
  return item[f.key]||(f.legacyKey&&item[f.legacyKey])||"";
}
// Auswahl eines Eintrags; sehr alte Restaurants haben eine einzelne "cuisine"
export function typesOf(def,item){
  const v=item[def.types.key];
  if(Array.isArray(v))return v;
  if(def.legacyRestaurant&&item.cuisine)return [item.cuisine];
  return [];
}
export const normalizeItem=(def,item)=>def.legacyRestaurant?normalizeRest(item):item;
export const itemDupKey=(def,item)=>dupKey(item.name,field1Of(def,item));
export const subtitle=(def,item)=>[field1Of(def,item),typesOf(def,item).join(" & ")].filter(Boolean).join(" · ");
// Filter der Übersichten: Beschriftungen und Werte für Feld 1 und Auswahl
export const filterMeta=def=>({
  l1:def.field1.filterLabel||"Alle",l2:def.types.filterLabel||"Alle",
  g1:i=>field1Of(def,i).trim(),g2:i=>typesOf(def,i),
});

// Durchschnitte: eine Nachkommastelle, Preis ganzzahlig; bei score-Liste zusätzlich avg
export function average(def,item){
  const vals=Object.values(item.ratings||{});
  const n=vals.length;
  const out={};
  const mean=(k,round)=>{
    if(!n)return 0;
    const m=vals.reduce((s,x)=>s+x[k],0)/n;
    return round?Math.round(m):+m.toFixed(1);
  };
  out[def.overall.key]=mean(def.overall.key);
  for(const c of def.criteria)out[c.key]=mean(c.key,c.format==="euro");
  if(Array.isArray(def.score))out.avg=n?+(def.score.reduce((s,k)=>s+out[k],0)/def.score.length).toFixed(1):0;
  out.count=n;
  return out;
}
// Hauptwert für Anzeige und Sortierung
export const score=(def,avg)=>Array.isArray(def.score)?avg.avg:avg[def.overall.key];

// Formulare
export function emptyRating(def){
  const r={[def.overall.key]:def.overall.default};
  for(const c of def.criteria)r[c.key]=c.default;
  r.kommentar="";
  return r;
}
export const emptyForm=def=>({name:"",field1:"",types:[],...emptyRating(def)});
export const emptySuggForm=()=>({name:"",field1:"",types:[]});
export function ratingFromForm(def,form){
  const r={};
  for(const k of ratingKeys(def))r[k]=form[k];
  r.kommentar=form.kommentar;
  return r;
}
// Formular zum Bearbeiten: Stammdaten des Eintrags plus eigene Wertung
export function formFromItem(def,item,user){
  const my=item.ratings?.[user]||emptyRating(def);
  const f={name:item.name,field1:field1Of(def,item),types:typesOf(def,item)};
  for(const k of ratingKeys(def))f[k]=my[k];
  f.kommentar=my.kommentar||"";
  return f;
}
// Vorschlag übernehmen: seine Stammdaten, Wertung mit Startwerten
export const formFromSuggestion=(def,s)=>({...emptyForm(def),name:s.name,field1:field1Of(def,s),types:typesOf(def,s)});
// Eigene Wertung für "Wertung abgeben": vorhandene übernehmen, sonst Startwerte
export const ratingFormFor=(def,item,user)=>item.ratings?.[user]||emptyRating(def);

export function validate(def,form){
  const e={};
  if(!form.name.trim())e.name="Bitte Name eingeben";
  if(def.field1.required&&!form.field1.trim())e.field1=def.field1.errorText;
  if(def.types.required&&def.types.options&&!form.types.length)e.types=def.types.errorText;
  return e;
}

// Speichern: Stammdaten in den Feldnamen der Datenbank
function masterData(def,form){
  const f1=form.field1.trim();
  const d={name:form.name};
  if(def.field1.legacyKey)d[def.field1.legacyKey]=f1;
  d[def.field1.key]=f1;
  d[def.types.key]=form.types;
  return d;
}
export const updatePayload=masterData;
export const itemPayload=(def,{id,form,user,withRating})=>({
  id,...masterData(def,form),author:user,
  ...(withRating?{ratings:{[user]:stamped(ratingFromForm(def,form))}}:{}),
});
export const ratingPayload=(def,form)=>stamped(ratingFromForm(def,form));
