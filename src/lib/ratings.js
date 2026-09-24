import {firebase} from "../firebase.js";

// Daten-Helpers
// Jede eigene Wertung bekommt beim Speichern die Serverzeit (für "letzte Bewertung" im künftigen Dashboard)
export const stamped=r=>({...r,ratedAt:firebase.database.ServerValue.TIMESTAMP});
export function normalizeRest(r){
  if(r.ratings){
    if(r.author&&r.food!==undefined&&!r.ratings[r.author]){
      return{...r,ratings:{[r.author]:{food:r.food??5,service:r.service??5,price:r.price??3,stars:r.stars??7},...r.ratings}};
    }
    return r;
  }
  return{...r,ratings:r.author?{[r.author]:{food:r.food??5,service:r.service??5,price:r.price??3,stars:r.stars??7}}:{}};
}
export function dupKey(name,f1){return (name||"").trim().toLowerCase()+"|"+(f1||"").trim().toLowerCase();}
export function restrictToMembers(item,members){
  return{...item,ratings:Object.fromEntries(Object.entries(item.ratings||{}).filter(([k])=>members.includes(k)))};
}
// Durchschnitte je Kategorie: categories/logic.js (average)
