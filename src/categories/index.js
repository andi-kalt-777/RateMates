import {DEFINITIONS,GROUPS} from "./definitions.js";

export * from "./options.js";
export {DEFINITIONS,GROUPS};

export const DEFINITION_BY_ID=Object.fromEntries(DEFINITIONS.map(d=>[d.id,d]));

// Abgeleitete Kurzformen für Auswahllisten und Menüs
export const CATEGORY_DEFS=Object.fromEntries(DEFINITIONS.map(d=>[d.id,{icon:d.icon,label:d.label}]));
export const CATEGORY_GROUPS=GROUPS.map(g=>({...g,cats:DEFINITIONS.filter(d=>d.group===g.id).map(d=>d.id)}));

// Startauswahl beim ersten Start: nur Restaurants
export const defaultCategories=()=>Object.fromEntries(DEFINITIONS.map(d=>[d.id,d.id==="restaurant"]));
