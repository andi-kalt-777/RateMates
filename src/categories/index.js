import {getAvgRest,getAvgWhisky,getAvgMedia} from "../lib/ratings.js";
import {DEFINITIONS,GROUPS,customDefinition} from "./definitions.js";

export * from "./options.js";
export {DEFINITIONS,GROUPS,customDefinition};

export const DEFINITION_BY_ID=Object.fromEntries(DEFINITIONS.map(d=>[d.id,d]));

// Abgeleitete Registries (Form wie vor dem Umbau, damit die Ansichten unverändert laufen)
export const CATEGORY_DEFS=Object.fromEntries(DEFINITIONS.map(d=>[d.id,{icon:d.icon,label:d.label}]));
export const CATEGORY_GROUPS=GROUPS.map(g=>({...g,cats:DEFINITIONS.filter(d=>d.group===g.id).map(d=>d.id)}));

const kindOf=d=>d.id==="restaurant"?"rest":d.id==="whisky"?"whisky":"media";

// Übergang: Konfigurationsobjekt in der Form, die MediaApp erwartet. Entfällt, sobald
// alle Ansichten direkt mit den Definitionen arbeiten.
export function legacyConfig(d){
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
const CONFIG_BY_ID=Object.fromEntries(DEFINITIONS.filter(d=>kindOf(d)==="media").map(d=>[d.id,legacyConfig(d)]));
export const configFor=id=>CONFIG_BY_ID[id];
export const customConfig=cat=>legacyConfig(customDefinition(cat));

// Registry aller Standard-Kategorien für die globalen Übersichten
export const ALL_CATS=DEFINITIONS.map(d=>({
  id:d.id,icon:d.icon,label:d.label,base:d.paths.items,sugg:d.paths.suggestions,kind:kindOf(d),
  ...(kindOf(d)==="media"?{cfg:CONFIG_BY_ID[d.id]}:{}),
}));

// Startauswahl im Formular "Neue Gruppe": nur Restaurants
export const defaultCategories=()=>Object.fromEntries(DEFINITIONS.map(d=>[d.id,d.id==="restaurant"]));

export function avgOfCat(cat,item){
  if(cat.kind==="rest")return getAvgRest(item);
  if(cat.kind==="whisky")return getAvgWhisky(item);
  return getAvgMedia(item);
}
export function subtitleOfCat(cat,item){
  if(cat.kind==="rest")return [item.city,(Array.isArray(item.cuisines)?item.cuisines:[]).join(" & ")].filter(Boolean).join(" · ");
  if(cat.kind==="whisky")return [item.distillery,(Array.isArray(item.types)?item.types:[]).join(" & ")].filter(Boolean).join(" · ");
  return [item.field1||item.director||"",(Array.isArray(item.genres)?item.genres:[]).join(" & ")].filter(Boolean).join(" · ");
}
export function catFilterMeta(cat){
  if(cat.kind==="rest")return{l1:"Alle Städte",l2:"Alle Küchen",g1:i=>(i.city||"").trim(),g2:i=>Array.isArray(i.cuisines)?i.cuisines:[]};
  if(cat.kind==="whisky")return{l1:"Alle Destillerien",l2:"Alle Sorten",g1:i=>(i.distillery||"").trim(),g2:i=>Array.isArray(i.types)?i.types:[]};
  return{l1:(cat.cfg&&cat.cfg.field1FilterLabel)||"Alle",l2:(cat.cfg&&cat.cfg.typeFilterLabel)||"Alle",g1:i=>(i.field1||"").trim(),g2:i=>Array.isArray(i.genres)?i.genres:[]};
}
// Bereiche einer Gruppe: Standard-Kategorien in Obergruppen-Reihenfolge, dann eigene
export function modesForGroup(group){
  const order=CATEGORY_GROUPS.flatMap(g=>g.cats);
  const modes=order.filter(c=>group.categories?.[c]).map(c=>[c,CATEGORY_DEFS[c].icon,CATEGORY_DEFS[c].label]);
  Object.values(group.custom||{}).forEach(c=>modes.push(["c:"+c.id,c.icon||"⭐",c.name]));
  return modes;
}
