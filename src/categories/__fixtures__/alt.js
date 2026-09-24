// Nachbau der Funktionen vor dem Umbau auf Definitionen (Stand 24.09.2026), nur für Tests:
// Die neue Logik in logic.js muss dieselben Ergebnisse liefern.
import fs from "node:fs";

export const before = JSON.parse(fs.readFileSync(new URL("./vor-umbau.json", import.meta.url), "utf8"));
const oldCat = (id) => before.ALL_CATS.find((c) => c.id === id);
export const kindOf = (id) => oldCat(id).kind;
export const oldConfig = (id) => before.configs[oldCat(id).cfgName];

function getAvgRest(r){
  const vals=Object.values(r.ratings||{});
  if(!vals.length)return{food:0,service:0,price:0,stars:0,avg:0,count:0};
  const n=vals.length;
  const food=+(vals.reduce((s,x)=>s+x.food,0)/n).toFixed(1);
  const service=+(vals.reduce((s,x)=>s+x.service,0)/n).toFixed(1);
  const price=Math.round(vals.reduce((s,x)=>s+x.price,0)/n);
  const stars=+(vals.reduce((s,x)=>s+x.stars,0)/n).toFixed(1);
  return{food,service,price,stars,avg:+((food+service)/2).toFixed(1),count:n};
}
function getAvgWhisky(w){
  const vals=Object.values(w.ratings||{});
  if(!vals.length)return{stars:0,rauchigkeit:0,fruchtigkeit:0,count:0};
  const n=vals.length;
  return{stars:+(vals.reduce((s,x)=>s+x.stars,0)/n).toFixed(1),rauchigkeit:+(vals.reduce((s,x)=>s+x.rauchigkeit,0)/n).toFixed(1),fruchtigkeit:+(vals.reduce((s,x)=>s+x.fruchtigkeit,0)/n).toFixed(1),count:n};
}
function getAvgMedia(x){
  const vals=Object.values(x.ratings||{});
  if(!vals.length)return{stars:0,handlung:0,spannung:0,count:0};
  const n=vals.length;
  return{stars:+(vals.reduce((s,v)=>s+v.stars,0)/n).toFixed(1),handlung:+(vals.reduce((s,v)=>s+v.handlung,0)/n).toFixed(1),spannung:+(vals.reduce((s,v)=>s+v.spannung,0)/n).toFixed(1),count:n};
}
export function avgOfCat(id,item){
  const k=kindOf(id);
  if(k==="rest")return getAvgRest(item);
  if(k==="whisky")return getAvgWhisky(item);
  return getAvgMedia(item);
}
export function subtitleOfCat(id,item){
  const k=kindOf(id);
  if(k==="rest")return [item.city,(Array.isArray(item.cuisines)?item.cuisines:[]).join(" & ")].filter(Boolean).join(" · ");
  if(k==="whisky")return [item.distillery,(Array.isArray(item.types)?item.types:[]).join(" & ")].filter(Boolean).join(" · ");
  return [item.field1||item.director||"",(Array.isArray(item.genres)?item.genres:[]).join(" & ")].filter(Boolean).join(" · ");
}
export function catFilterMeta(id){
  const k=kindOf(id),cfg=k==="media"?oldConfig(id):null;
  if(k==="rest")return{l1:"Alle Städte",l2:"Alle Küchen",g1:i=>(i.city||"").trim(),g2:i=>Array.isArray(i.cuisines)?i.cuisines:[]};
  if(k==="whisky")return{l1:"Alle Destillerien",l2:"Alle Sorten",g1:i=>(i.distillery||"").trim(),g2:i=>Array.isArray(i.types)?i.types:[]};
  return{l1:(cfg&&cfg.field1FilterLabel)||"Alle",l2:(cfg&&cfg.typeFilterLabel)||"Alle",g1:i=>(i.field1||"").trim(),g2:i=>Array.isArray(i.genres)?i.genres:[]};
}
// Konfigurationsobjekt, wie MediaApp es erwartete — aus einer Definition gebildet
export function asOldConfig(d){
  const [c1,c2]=d.criteria;
  return{
    fbBase:d.paths.items,fbSugg:d.paths.suggestions,icon:d.icon,label:d.custom?d.title:d.title+" Führer",
    field1Label:d.field1.label,field1Placeholder:d.field1.placeholder,field1Key:d.field1.legacyKey||d.field1.key,
    field1FilterLabel:d.field1.filterLabel,typeFilterLabel:d.types.filterLabel,genreOptions:d.types.options,
    starsLabel:d.overall.label,
    crit1Label:c1.label,crit2Label:c2.label,crit1Short:c1.short,crit2Short:c2.short,
    namePlaceholder:d.texts.namePlaceholder,saveToast:d.texts.saveToast,
    emptyIcon:d.icon,emptyText:d.texts.emptyText,emptySuggText:d.texts.emptySuggText,
    addTitle:d.texts.addTitle,addSuggTitle:d.texts.addSuggTitle,suggListTitle:d.texts.suggListTitle,
    listLabel:d.texts.listLabel,suggHint:d.texts.suggHint,
  };
}
