import {useState} from "react";
import {db} from "../firebase.js";
import {setCategory} from "../lib/useFriends.js";
import {wishKey,wishUpdate} from "../lib/wishes.js";
import {CategoryPicker} from "../components/CategoryPicker.jsx";
import {UserMenu} from "../components/UserMenu.jsx";
import {Page,PageHeader} from "../components/PageHeader.jsx";

// KATEGORIEN: eigene Kategorien wählen, neue Kategorie wünschen.
// Wünsche anderer sind in der App nicht sichtbar; Auswertung am PC mit `npm run wishes`.
export function CategoriesPage({user,categories,dark,setDark,t,onLogout}){
  const [catMsg,setCatMsg]=useState("");
  const [name,setName]=useState("");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const send=async()=>{
    const n=name.trim();
    if(!n){setMsg("Bitte gib einen Namen für die Kategorie an.");return;}
    setBusy(true);setMsg("");
    try{
      const key=wishKey(n);
      // Den Namen schreibt nur der erste Wunsch; danach lehnen die Regeln ab, das ist gewollt
      await db.ref("category_requests/"+key+"/name").set(n.slice(0,60)).catch(()=>{});
      await db.ref().update(wishUpdate(user,key,note));
      setMsg("✅ Danke! Dein Wunsch ist angekommen. Wenn sich Wünsche häufen, nehmen wir die Kategorie auf.");
      setName("");setNote("");
    }catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");}
    setBusy(false);
  };
  // Mindestens eine Kategorie bleibt an, sonst gäbe es nichts zu bewerten
  const toggleCat=async(id,on)=>{
    if(!on&&Object.values(categories).filter(Boolean).length<=1){setCatMsg("Mindestens eine Kategorie muss an bleiben.");return;}
    setCatMsg("");
    try{await setCategory(user,id,on);}catch{setCatMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");}
  };
  const lbl={fontSize:12.5,fontWeight:600,color:t.sub};
  const inp={height:46,padding:"0 14px",borderRadius:12,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,color:t.inputColor,fontSize:15,outline:"none",width:"100%"};
  const card={background:t.card,border:`1px solid ${t.cardBorder}`,borderRadius:16,boxShadow:`0 2px 12px ${t.cardShadow}`};
  const h2={margin:"0 0 10px",fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title};
  return(
    <Page t={t}>
      <PageHeader t={t} title="Kategorien" subtitle="Was du bewertest und von Freunden siehst"
        right={<UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>}/>

      <section style={{marginBottom:22}}>
        <h2 style={h2}>Meine Kategorien</h2>
        <div style={{fontSize:13,color:t.sub,margin:"-4px 0 12px",lineHeight:1.45}}>Nur diese Kategorien erscheinen bei dir: zum Bewerten und mit den Wertungen deiner Freunde.</div>
        {catMsg&&<div style={{fontSize:13,color:t.danger,marginBottom:10}}>{catMsg}</div>}
        <CategoryPicker value={categories} onToggle={toggleCat} t={t}/>
      </section>

      <h2 style={h2}>Fehlt dir etwas?</h2>
      <section aria-label="Kategorie wünschen" style={{...card,padding:16,display:"flex",flexDirection:"column",gap:8}}>
        <label htmlFor="kat-name" style={lbl}>Name der Kategorie</label>
        <input id="kat-name" value={name} onChange={e=>{setName(e.target.value);setMsg("");}} placeholder="z. B. Pizzerien" style={inp}/>
        <label htmlFor="kat-note" style={{...lbl,marginTop:6}}>Anmerkung (optional)</label>
        <input id="kat-note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Was soll man dort bewerten?" style={inp}/>
        <button onClick={send} disabled={busy} style={{marginTop:8,minHeight:48,borderRadius:14,border:"none",background:busy?t.sliderTrack:t.accent,color:t.onAccent,fontSize:15,fontWeight:700,cursor:"pointer"}}>{busy?"Sende…":"Wunsch absenden"}</button>
        {msg&&<div style={{fontSize:13,textAlign:"center",color:msg.startsWith("✅")?t.link:t.danger}}>{msg}</div>}
      </section>
    </Page>
  );
}
