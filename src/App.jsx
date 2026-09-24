import {useState,useEffect} from "react";
import {db,auth} from "./firebase.js";
import {DEFINITION_BY_ID,customDefinition,modesForGroup} from "./categories/index.js";
import {LIGHT,DARK} from "./theme.js";
import {LoginScreen} from "./screens/LoginScreen.jsx";
import {GroupsOverview} from "./screens/GroupsOverview.jsx";
import {GroupSettingsSheet} from "./components/GroupSettingsSheet.jsx";
import {CategoryApp} from "./apps/CategoryApp.jsx";
import {Dashboard} from "./screens/Dashboard.jsx";
import {CategoriesPage} from "./screens/CategoriesPage.jsx";
import {TabBar} from "./components/TabBar.jsx";
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
  const [tab,setTab]=useState("start");
  const [groupSection,setGroupSection]=useState("list");
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
      setActiveGroupId(g.id);setMode(null);setGroupSection("list");setTab("groups");setPendingInvite(null);clearInviteHash();return;
    }
    (async()=>{
      try{
        await db.ref("groups/"+g.id+"/members/"+user).set("member");
        setActiveGroupId(g.id);setMode(null);setGroupSection("list");setTab("groups");
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

  const doLogout=()=>{auth.signOut().catch(()=>{});localStorage.removeItem("rmg_user");setUser(null);setTab("start");setActiveGroupId(null);};
  // Hauptbereiche über die Leiste unten; ein erneuter Tipp auf "Gruppen" schließt die offene Gruppe
  const goTab=x=>{
    if(x==="groups"&&tab==="groups"){setActiveGroupId(null);setMode(null);}
    setTab(x);window.scrollTo(0,0);
  };
  const common={user,dark,setDark,t,onLogout:doLogout};
  let content;
  if(tab==="start")content=<Dashboard {...common} groups={groups} onTab={goTab}/>;
  else if(tab==="ratings")content=<AllItemsPage key="ratings" type="ratings" {...common} groups={groups}/>;
  else if(tab==="sugg")content=<AllItemsPage key="sugg" type="suggestions" {...common} groups={groups}/>;
  else if(tab==="cats")content=<CategoriesPage {...common}/>;
  else if(!activeGroup){
    content=<GroupsOverview {...common} groups={groups} inviteMsg={inviteMsg}
      onOpen={g=>{setActiveGroupId(g.id);setMode(null);setGroupSection("list");window.scrollTo(0,0);}}/>;
  }else{
    const members=Object.keys(activeGroup.members||{});
    const isAdmin=activeGroup.members?.[user]==="admin";
    const modes=modesForGroup(activeGroup);
    const onBack=()=>{setActiveGroupId(null);setMode(null);};
    // Bereich der Gruppe: Standard-Kategorie oder gruppeneigene (c:<id>)
    const customCat=mode&&mode.startsWith("c:")?Object.values(activeGroup.custom||{}).find(c=>c.id===mode.slice(2)):null;
    const def=customCat?customDefinition(customCat):DEFINITION_BY_ID[mode];
    if(def)content=<CategoryApp key={def.id} {...common} def={def} mode={mode} setMode={setMode} modes={modes} group={activeGroup} members={members}
      onBack={onBack} isAdmin={isAdmin} onSettings={()=>setShowSettings(true)} section={groupSection} onSection={setGroupSection}/>;
    else if(mode&&mode.startsWith("c:"))content=<div style={{padding:40,textAlign:"center",color:t.sub}}>Kategorie nicht gefunden.</div>;
    else content=<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",color:t.sub}}>{modes.length?"Lade Bereich…":"Diese Gruppe hat noch keine Kategorien."}</div>;
  }

  return(
    <>
      {content}
      {showSettings&&activeGroup&&<GroupSettingsSheet group={activeGroup} user={user} onClose={()=>setShowSettings(false)} t={t}/>}
      <TabBar tab={tab} onTab={goTab} t={t}/>
    </>
  );
}

export default App;
