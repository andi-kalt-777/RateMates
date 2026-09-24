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
export function getAvgRest(r){
  const vals=Object.values(r.ratings||{});
  if(!vals.length)return{food:0,service:0,price:0,stars:0,avg:0,count:0};
  const n=vals.length;
  const food=+(vals.reduce((s,x)=>s+x.food,0)/n).toFixed(1);
  const service=+(vals.reduce((s,x)=>s+x.service,0)/n).toFixed(1);
  const price=Math.round(vals.reduce((s,x)=>s+x.price,0)/n);
  const stars=+(vals.reduce((s,x)=>s+x.stars,0)/n).toFixed(1);
  return{food,service,price,stars,avg:+((food+service)/2).toFixed(1),count:n};
}
export function getAvgWhisky(w){
  const vals=Object.values(w.ratings||{});
  if(!vals.length)return{stars:0,rauchigkeit:0,fruchtigkeit:0,count:0};
  const n=vals.length;
  return{stars:+(vals.reduce((s,x)=>s+x.stars,0)/n).toFixed(1),rauchigkeit:+(vals.reduce((s,x)=>s+x.rauchigkeit,0)/n).toFixed(1),fruchtigkeit:+(vals.reduce((s,x)=>s+x.fruchtigkeit,0)/n).toFixed(1),count:n};
}
export function getAvgMedia(x){
  const vals=Object.values(x.ratings||{});
  if(!vals.length)return{stars:0,handlung:0,spannung:0,count:0};
  const n=vals.length;
  return{stars:+(vals.reduce((s,v)=>s+v.stars,0)/n).toFixed(1),handlung:+(vals.reduce((s,v)=>s+v.handlung,0)/n).toFixed(1),spannung:+(vals.reduce((s,v)=>s+v.spannung,0)/n).toFixed(1),count:n};
}
