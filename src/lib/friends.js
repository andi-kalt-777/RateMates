// Freundschaften: immer gegenseitig. Sie entstehen durch eine angenommene Anfrage
// oder einen Einladungslink. Reine Logik ohne Firebase, damit Tests und das
// Umzugsskript sie nutzen können.
//
// Datenbank:
//   friends/<Name>/<Freund>          = {since, via}   via: "request", "groups" oder Einladungscode
//   friend_requests/<An>/<Von>       = Zeitpunkt      offene Anfrage
//   friend_requests_sent/<Von>/<An>  = Zeitpunkt      Spiegel für "Gesendet"
//   invites/<Code>                   = {from, createdAt}
//   users/<Name>/categories/<id>     = true           eigene Kategorien
import {DEFINITIONS} from "../categories/definitions.js";

export const INVITE_DAYS=14;
export const INVITE_MS=INVITE_DAYS*86400000;

// Einladungscode: 20 Zeichen ohne verwechselbare Zeichen (0/o, 1/l)
const ALPHABET="abcdefghijkmnpqrstuvwxyz23456789";
export const INVITE_CODE_LENGTH=20;
export function newInviteCode(bytes=globalThis.crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH))){
  return Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join("");
}
export const isInviteCode=c=>typeof c==="string"&&c.length===INVITE_CODE_LENGTH&&[...c].every(x=>ALPHABET.includes(x));

// Was mit einem geöffneten Einladungslink passiert
export function inviteStatus(invite,user,friends,now=Date.now()){
  if(!invite||!invite.from)return "invalid";
  if(invite.from===user)return "own";
  if(friends.includes(invite.from))return "already";
  if(typeof invite.createdAt!=="number"||now-invite.createdAt>INVITE_MS)return "expired";
  return "ok";
}

// Mehrpfad-Updates; since ist beim Schreiben die Serverzeit
export const friendshipUpdate=(a,b,via,since)=>({
  ["friends/"+a+"/"+b]:{since,via},
  ["friends/"+b+"/"+a]:{since,via},
});
export const sendRequestUpdate=(me,to,at)=>({
  ["friend_requests/"+to+"/"+me]:at,
  ["friend_requests_sent/"+me+"/"+to]:at,
});
export const cancelRequestUpdate=(me,to)=>({
  ["friend_requests/"+to+"/"+me]:null,
  ["friend_requests_sent/"+me+"/"+to]:null,
});
export const declineRequestUpdate=(me,from)=>cancelRequestUpdate(from,me);
export const acceptRequestUpdate=(me,from,since)=>({
  ...friendshipUpdate(me,from,"request",since),
  ...declineRequestUpdate(me,from),
});
export const acceptInviteUpdate=(me,code,from,since)=>({
  ...friendshipUpdate(me,from,code,since),
  ["invites/"+code]:null,
});
export const removeFriendUpdate=(me,other)=>({
  ["friends/"+me+"/"+other]:null,
  ["friends/"+other+"/"+me]:null,
});

// Namen aus friends/<Name>, friend_requests/<Name> usw., alphabetisch
export const namesOf=obj=>Object.keys(obj||{}).sort((a,b)=>a.localeCompare(b,"de"));

// Eigene Kategorien in der Reihenfolge der Definitionen
export const activeDefinitions=categories=>DEFINITIONS.filter(d=>categories?.[d.id]);

// Einmaliger Umzug von Gruppen zu Freundschaften: wer mit jemandem in einer Gruppe ist,
// wird dessen Freund; eigene Kategorien sind alle Kategorien der eigenen Gruppen.
// names: bestehende Konten (Werte aus names/), gelöschte Mitglieder fallen weg.
export function migrationFromGroups(groups,names,since){
  const exists=new Set(names);
  const known=new Set(DEFINITIONS.map(d=>d.id));
  const upd={};
  for(const g of Object.values(groups||{})){
    const members=Object.keys(g.members||{}).filter(n=>exists.has(n));
    for(const a of members){
      for(const b of members)if(a!==b)upd["friends/"+a+"/"+b]={since,via:"groups"};
      for(const [c,on] of Object.entries(g.categories||{}))if(on&&known.has(c))upd["users/"+a+"/categories/"+c]=true;
    }
  }
  return upd;
}
