import {useState} from "react";
import {defaultCategories} from "../categories/index.js";
import {setCategories} from "../lib/useFriends.js";
import {CategoryPicker} from "../components/CategoryPicker.jsx";
import {Page} from "../components/PageHeader.jsx";

// Erster Start: eigene Kategorien wählen. Später änderbar im Reiter Kategorien.
export function WelcomeCategories({user,t}){
  const [cats,setCats]=useState(()=>Object.fromEntries(Object.entries(defaultCategories()).filter(([,v])=>v)));
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const count=Object.keys(cats).length;
  const toggle=(id,on)=>{setMsg("");setCats(p=>{const n={...p};if(on)n[id]=true;else delete n[id];return n;});};
  const save=async()=>{
    if(!count){setMsg("Bitte wähle mindestens eine Kategorie.");return;}
    setBusy(true);
    try{await setCategories(user,cats);}
    catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");setBusy(false);}
  };
  return(
    <Page t={t}>
      <h1 style={{margin:"8px 0 6px",fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,letterSpacing:"-0.01em",color:t.title}}>Willkommen, {user}!</h1>
      <div style={{fontSize:14,color:t.sub,lineHeight:1.5,marginBottom:20}}>Was möchtest du bewerten? Du siehst nur diese Kategorien, mit deinen Wertungen und denen deiner Freunde. Ändern kannst du das jederzeit im Reiter Kategorien.</div>
      <CategoryPicker value={cats} onToggle={toggle} t={t}/>
      {msg&&<div style={{fontSize:13,color:t.danger,marginBottom:10}}>{msg}</div>}
      <button onClick={save} disabled={busy} style={{position:"sticky",bottom:"calc(16px + env(safe-area-inset-bottom))",width:"100%",minHeight:52,borderRadius:14,border:"none",background:t.accent,color:t.onAccent,fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:`0 6px 20px ${t.cardShadow}`}}>
        {busy?"Speichere…":count?"Los geht's ("+count+(count===1?" Kategorie)":" Kategorien)"):"Kategorie wählen"}
      </button>
    </Page>
  );
}
