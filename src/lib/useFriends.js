import {useState,useEffect} from "react";
import {firebase,db} from "../firebase.js";
import {readOnce,nameKey,loginError} from "./auth.js";
import {
  newInviteCode,inviteStatus,namesOf,sendRequestUpdate,cancelRequestUpdate,declineRequestUpdate,
  acceptRequestUpdate,acceptInviteUpdate,removeFriendUpdate,
} from "./friends.js";

const TS=()=>firebase.database.ServerValue.TIMESTAMP;

// Freunde, offene Anfragen und eigene Kategorien des angemeldeten Nutzers, live
export function useFriends(user){
  const [state,setState]=useState({loaded:false});
  useEffect(()=>{
    if(!user){setState({loaded:false});return;}
    const paths={friends:"friends/"+user,incoming:"friend_requests/"+user,sent:"friend_requests_sent/"+user,categories:"users/"+user+"/categories"};
    const got={};
    const refs=Object.entries(paths).map(([key,p])=>{
      const ref=db.ref(p);
      const done=v=>{got[key]=v;setState(s=>({...s,[key]:v,loaded:Object.keys(paths).every(k=>k in got)}));};
      ref.on("value",s=>done(s.val()),()=>done(null));
      return ref;
    });
    const tm=setTimeout(()=>setState(s=>({...s,loaded:true})),6000);
    return()=>{refs.forEach(r=>r.off());clearTimeout(tm);};
  },[user]);
  return{
    loaded:state.loaded,
    friends:namesOf(state.friends),
    friendSince:state.friends||{},
    incoming:namesOf(state.incoming),
    sent:namesOf(state.sent),
    categories:state.categories||{},
    hasCategories:Object.values(state.categories||{}).some(Boolean),
  };
}

// Anfrage per Benutzername. Hat der andere uns schon angefragt, wird daraus direkt eine Freundschaft.
export async function sendFriendRequest(me,input,{friends,incoming,sent}){
  const n=input.trim();
  if(!n)throw loginError("Bitte einen Benutzernamen eingeben.");
  const name=await readOnce("names/"+nameKey(n));
  if(!name)throw loginError("„"+n+"“ gibt es nicht. Schick ihm stattdessen einen Einladungslink.");
  if(name===me)throw loginError("Das bist du selbst.");
  if(friends.includes(name))throw loginError("Ihr seid schon befreundet.");
  if(incoming.includes(name)){await acceptFriendRequest(me,name);return {name,accepted:true};}
  if(sent.includes(name))throw loginError("Anfrage an "+name+" ist schon unterwegs.");
  await db.ref().update(sendRequestUpdate(me,name,TS()));
  return {name,accepted:false};
}
export const acceptFriendRequest=(me,from)=>db.ref().update(acceptRequestUpdate(me,from,TS()));
export const declineFriendRequest=(me,from)=>db.ref().update(declineRequestUpdate(me,from));
export const cancelFriendRequest=(me,to)=>db.ref().update(cancelRequestUpdate(me,to));
export const removeFriend=(me,other)=>db.ref().update(removeFriendUpdate(me,other));

// Einladungslink: 14 Tage gültig, einmal verwendbar
export async function createInviteLink(me){
  const code=newInviteCode();
  await db.ref("invites/"+code).set({from:me,createdAt:TS()});
  return window.location.origin+window.location.pathname+"#friend="+code;
}
// Geöffneten Link einlösen; liefert den Namen des Einladenden
export async function acceptInvite(me,code,friends){
  const inv=await readOnce("invites/"+code).catch(()=>null);
  const status=inviteStatus(inv,me,friends);
  if(status==="own")throw loginError("Das ist dein eigener Einladungslink. Schick ihn an einen Freund.");
  if(status==="already")return {name:inv.from,already:true};
  if(status!=="ok")throw loginError("Dieser Einladungslink ist abgelaufen oder wurde schon benutzt. Bitte um einen neuen.");
  await db.ref().update(acceptInviteUpdate(me,code,inv.from,TS()));
  return {name:inv.from,already:false};
}

// Eigene Kategorien: einzeln umschalten oder beim ersten Start alle auf einmal
export const setCategory=(me,id,on)=>db.ref("users/"+me+"/categories/"+id).set(on?true:null);
export const setCategories=(me,cats)=>db.ref("users/"+me+"/categories").set(cats);
