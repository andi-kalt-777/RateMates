import {useState,useEffect} from "react";
import {auth} from "./firebase.js";
import {LIGHT,DARK} from "./theme.js";
import {isInviteCode} from "./lib/friends.js";
import {useFriends,acceptInvite} from "./lib/useFriends.js";
import {LoginScreen} from "./screens/LoginScreen.jsx";
import {Dashboard} from "./screens/Dashboard.jsx";
import {AllItemsPage} from "./screens/AllItemsPage.jsx";
import {FriendsPage} from "./screens/FriendsPage.jsx";
import {CategoriesPage} from "./screens/CategoriesPage.jsx";
import {WelcomeCategories} from "./screens/WelcomeCategories.jsx";
import {TabBar} from "./components/TabBar.jsx";

// TOP-LEVEL APP
// Einladungslink: #friend=<Code>. Alte Gruppen-Links (#invite=<Gruppe>) gibt es nicht mehr.
export function readInviteFromUrl(){
  try{
    const h=window.location.hash||"";
    const m=h.match(/friend=([^&]+)/);
    if(m)return decodeURIComponent(m[1]);
    return /invite=/.test(h)?"legacy":null;
  }catch{return null;}
}
export function clearInviteHash(){
  try{
    if(/(friend|invite)=/.test(window.location.hash)){
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
  const [pendingInvite,setPendingInvite]=useState(readInviteFromUrl());
  const [tab,setTab]=useState("start");
  const [notice,setNotice]=useState("");
  const t=dark?DARK:LIGHT;
  // Freunde, Anfragen und eigene Kategorien erst nach der Anmeldung — vorher verweigert die Datenbank
  const social=useFriends(authReady?user:null);

  // Firebase-Sitzung: ohne gültige Anmeldung zurück zum Login (auch bei altem localStorage-Stand)
  useEffect(()=>auth.onAuthStateChanged(u=>{
    if(!u){localStorage.removeItem("rmg_user");setUser(null);}
    setAuthReady(true);
  }),[]);

  // Einladungslink einlösen, sobald Anmeldung und Freundesliste stehen
  useEffect(()=>{
    if(!user||!pendingInvite||!social.loaded)return;
    const code=pendingInvite;
    setPendingInvite(null);clearInviteHash();setTab("friends");
    if(code==="legacy"||!isInviteCode(code)){
      setNotice("⚠️ Dieser Einladungslink ist veraltet. Gruppen gibt es nicht mehr, bitte deinen Freund um einen neuen Link.");
      return;
    }
    acceptInvite(user,code,social.friends)
      .then(r=>setNotice(r.already?"✅ Du bist schon mit "+r.name+" befreundet.":"✅ Du bist jetzt mit "+r.name+" befreundet!"))
      .catch(e=>setNotice("⚠️ "+(e?.msg||"Einladung konnte nicht angenommen werden. Bitte erneut versuchen.")));
  },[user,pendingInvite,social.loaded]); // social.friends wird nur beim Einlösen gebraucht

  if(!authReady)return <LoadingScreen t={t}/>;
  if(!user)return <LoginScreen onLogin={setUser} invitePending={!!pendingInvite&&pendingInvite!=="legacy"}/>;
  if(!social.loaded)return <LoadingScreen t={t}/>;
  if(!social.hasCategories)return <WelcomeCategories user={user} t={t}/>;

  const doLogout=()=>{auth.signOut().catch(()=>{});localStorage.removeItem("rmg_user");setUser(null);setTab("start");setNotice("");};
  const goTab=x=>{setTab(x);if(x!=="friends")setNotice("");window.scrollTo(0,0);};
  const common={user,dark,setDark,t,onLogout:doLogout};
  const data={friends:social.friends,categories:social.categories};
  let content;
  if(tab==="ratings")content=<AllItemsPage key="ratings" type="ratings" {...common} {...data}/>;
  else if(tab==="sugg")content=<AllItemsPage key="sugg" type="suggestions" {...common} {...data}/>;
  else if(tab==="friends")content=<FriendsPage {...common} social={social} notice={notice}/>;
  else if(tab==="cats")content=<CategoriesPage {...common} categories={social.categories}/>;
  else content=<Dashboard {...common} {...data} onTab={goTab}/>;

  return(
    <>
      {content}
      <TabBar tab={tab} onTab={goTab} badges={{friends:social.incoming.length}} t={t}/>
    </>
  );
}

export default App;
