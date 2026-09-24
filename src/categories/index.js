import {DEFINITIONS,GROUPS,customDefinition} from "./definitions.js";

export * from "./options.js";
export {DEFINITIONS,GROUPS,customDefinition};

export const DEFINITION_BY_ID=Object.fromEntries(DEFINITIONS.map(d=>[d.id,d]));

// Abgeleitete Kurzformen für Auswahllisten, Gruppenkarten und Menüs
export const CATEGORY_DEFS=Object.fromEntries(DEFINITIONS.map(d=>[d.id,{icon:d.icon,label:d.label}]));
export const CATEGORY_GROUPS=GROUPS.map(g=>({...g,cats:DEFINITIONS.filter(d=>d.group===g.id).map(d=>d.id)}));

// Startauswahl im Formular "Neue Gruppe": nur Restaurants
export const defaultCategories=()=>Object.fromEntries(DEFINITIONS.map(d=>[d.id,d.id==="restaurant"]));

// Bereiche einer Gruppe: Standard-Kategorien in Obergruppen-Reihenfolge, dann eigene
export function modesForGroup(group){
  const order=CATEGORY_GROUPS.flatMap(g=>g.cats);
  const modes=order.filter(c=>group.categories?.[c]).map(c=>[c,CATEGORY_DEFS[c].icon,CATEGORY_DEFS[c].label]);
  Object.values(group.custom||{}).forEach(c=>modes.push(["c:"+c.id,c.icon||"⭐",c.name]));
  return modes;
}
