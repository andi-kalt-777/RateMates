import {useState,useEffect} from "react";
import {db,auth} from "./firebase.js";
import {configFor,customConfig,modesForGroup} from "./categories/index.js";
import {LIGHT,DARK} from "./theme.js";
import {LoginScreen} from "./screens/LoginScreen.jsx";
import {GroupsOverview} from "./screens/GroupsOverview.jsx";
import {GroupSettingsSheet} from "./components/GroupSettingsSheet.jsx";
import {RestaurantApp} from "./apps/RestaurantApp.jsx";
import {WhiskyApp} from "./apps/WhiskyApp.jsx";
import {MediaApp} from "./apps/MediaApp.jsx";
import {HomePage} from "./screens/HomePage.jsx";
import {AllItemsPage} from "./screens/AllItemsPage.jsx";

// TOP-LEVEL APP
export function readInviteFromUrl(){
  try{
    const h=window.location.hash||"";
    const m=h.match(/invite=([^&]+)/);
    return m?decodeURIComponent(m[1]):null;
  }catch{return null;}
}
export function clearInviteHash(){
  try{
    if(window.location.hash.indexOf("invite=")>=0){
      history.replaceState(null,"",window.location.pathname+window.location.search);
    }
  }catch{}
}
export function LoadingScreen({t}){
  return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>🍽️</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
}

export function App(){
  const [user,setUser]=useState(localStorage.getItem("rmg_user")||null);
  const [authReady,setAuthReady]=useState(false);
  const [dark,setDark]=useState(false);
  const [groups,setGroups]=useState([]);
  const [groupsLoaded,setGroupsLoaded]=useState(false);
  const [activeGroupId,setActiveGroupId]=useState(null);
  const [mode,setMode]=useState(null);
  const [showSettings,setShowSettings]=useState(false);
  const [pendingInvite,setPendingInvite]=useState(readInviteFromUrl());
  const [page,setPage]=useState("home");
  const [inviteMsg,setInviteMsg]=useState("");
  const t=dark?DARK:LIGHT;

  // Firebase-Sitzung: ohne gültige Anmeldung zurück zum Login (auch bei altem localStorage-Stand)
  useEffect(()=>auth.onAuthStateChanged(u=>{
    if(!u){localStorage.removeItem("rmg_user");setUser(null);}
    setAuthReady(true);
  }),[]);

  // Gruppen erst laden, wenn die Anmeldung steht — vorher verweigert die Datenbank den Zugriff
  useEffect(()=>{
    if(!user||!authReady){setGroups([]);setGroupsLoaded(false);return;}
    let ref;try{ref=db.ref("groups");ref.on("value",snap=>{const d=snap.val();setGroups(d?Object.values(d):[]);setGroupsLoaded(true);},()=>setGroupsLoaded(true));}catch{setGroupsLoaded(true);}
    const tm=setTimeout(()=>setGroupsLoaded(true),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[user,authReady]);

  // Einladung verarbeiten: sobald ein eingeloggter Nutzer + Token + geladene Gruppen vorliegen
  useEffect(()=>{
    if(!user||!pendingInvite||!groupsLoaded)return;
    const g=groups.find(x=>x.id===pendingInvite);
    if(!g){setInviteMsg("⚠️ Diese Einladung ist ungültig oder die Gruppe existiert nicht mehr.");setPendingInvite(null);clearInviteHash();return;}
    if(g.members&&g.members[user]){
      // schon Mitglied -> einfach öffnen
      setActiveGroupId(g.id);setMode(null);setPage("groups");setPendingInvite(null);clearInviteHash();return;
    }
    (async()=>{
      try{
        await db.ref("groups/"+g.id+"/members/"+user).set("member");
        setActiveGroupId(g.id);setMode(null);setPage("groups");
        setInviteMsg("✅ Du bist der Gruppe „"+g.name+"“ beigetreten!");
        setTimeout(()=>setInviteMsg(""),3500);
      }catch{setInviteMsg("⚠️ Beitritt fehlgeschlagen. Bitte erneut versuchen.");}
      setPendingInvite(null);clearInviteHash();
    })();
  },[user,pendingInvite,groupsLoaded,groups]);

  const activeGroup=groups.find(g=>g.id===activeGroupId)||null;
  // Wenn Gruppe gewählt: passenden Modus setzen
  useEffect(()=>{
    if(activeGroup){
      const modes=modesForGroup(activeGroup);
      if(modes.length&&!modes.find(m=>m[0]===mode))setMode(modes[0][0]);
    }
  },[activeGroupId,groups]);

  if(!authReady)return <LoadingScreen t={t}/>;
  if(!user)return <LoginScreen onLogin={setUser} invitePending={!!pendingInvite}/>;
  if(!groupsLoaded)return <LoadingScreen t={t}/>;

  // Keine Gruppe gewählt: Hauptseite bzw. globale Ansichten
  const doLogout=()=>{auth.signOut().catch(()=>{});localStorage.removeItem("rmg_user");setUser(null);setPage("home");};
  if(!activeGroup){
    if(page==="ratings")return <AllItemsPage type="ratings" user={user} groups={groups} dark={dark} setDark={setDark} t={t} onBack={()=>setPage("home")} onLogout={doLogout}/>;
    if(page==="suggestions")return <AllItemsPage type="suggestions" user={user} groups={groups} dark={dark} setDark={setDark} t={t} onBack={()=>setPage("home")} onLogout={doLogout}/>;
    if(page==="groups"){
      return <GroupsOverview user={user} groups={groups} dark={dark} setDark={setDark} t={t} inviteMsg={inviteMsg}
        onLogout={doLogout} onHome={()=>setPage("home")}
        onOpen={g=>{setActiveGroupId(g.id);setMode(null);}}/>;
    }
    return <HomePage user={user} dark={dark} setDark={setDark} t={t} onNav={setPage} onLogout={doLogout}/>;
  }

  const members=Object.keys(activeGroup.members||{});
  const isAdmin=activeGroup.members?.[user]==="admin";
  const modes=modesForGroup(activeGroup);
  const onBack=()=>{setActiveGroupId(null);setMode(null);};
  const onSettings=()=>setShowSettings(true);
  const shared={user,dark,setDark,mode,setMode,modes,t,group:activeGroup,members,onBack,isAdmin,onSettings,onLogout:doLogout};

  let content;
  if(mode==="restaurant")content=<RestaurantApp {...shared}/>;
  else if(mode==="whisky")content=<WhiskyApp {...shared}/>;
  else if(mode==="film")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="serie")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="coffee")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="beer")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="wine")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="tea")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="matcha")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="gin")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="rum")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="vodka")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="book")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="audiobook")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="cafe")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="bar")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="icecream")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode==="delivery")content=<MediaApp {...shared} config={configFor(mode)}/>;
  else if(mode&&mode.startsWith("c:")){
    const cat=Object.values(activeGroup.custom||{}).find(c=>c.id===mode.slice(2));
    content=cat?<MediaApp {...shared} config={customConfig(cat)}/>:<div style={{padding:40,textAlign:"center",color:t.sub}}>Kategorie nicht gefunden.</div>;
  }else{
    content=<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",color:t.sub}}>Lade Bereich…</div>;
  }

  return(
    <>
      {content}
      {showSettings&&<GroupSettingsSheet group={activeGroup} user={user} onClose={()=>setShowSettings(false)} t={t}/>}
    </>
  );
}

export default App;
