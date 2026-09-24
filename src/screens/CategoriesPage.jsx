import {useState,useEffect} from "react";
import {db} from "../firebase.js";
import {setCategory} from "../lib/useFriends.js";
import {CategoryPicker} from "../components/CategoryPicker.jsx";
import {UserMenu} from "../components/UserMenu.jsx";
import {Page,PageHeader} from "../components/PageHeader.jsx";

// Schlüssel eines Kategorie-Wunsches unter category_requests/
export function catReqKey(name){
  const k=name.toLowerCase().trim().replace(/[.#$/[\]]/g,"").replace(/\s+/g,"_");
  return k||"unbenannt";
}

// KATEGORIEN: eigene Kategorien wählen, neue vorschlagen, Wünsche anderer unterstützen
export function CategoriesPage({user,categories,dark,setDark,t,onLogout}){
  const [catMsg,setCatMsg]=useState("");
  const [name,setName]=useState("");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [requests,setRequests]=useState(null);
  useEffect(()=>{
    let ref;try{ref=db.ref("category_requests");ref.on("value",s=>setRequests(s.val()||{}),()=>setRequests({}));}catch{setRequests({});}
    return()=>ref&&ref.off();
  },[]);
  const send=async()=>{
    const n=name.trim();
    if(!n){setMsg("Bitte gib einen Namen für die Kategorie an.");return;}
    setBusy(true);setMsg("");
    try{
      const key=catReqKey(n);
      if(!requests?.[key])await db.ref("category_requests/"+key+"/name").set(n);
      await db.ref("category_requests/"+key+"/users/"+user).set(note.trim()||true);
      setMsg("✅ Danke! Dein Vorschlag wurde übermittelt.");
      setName("");setNote("");
    }catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");}
    setBusy(false);
  };
  const toggle=async(key,mine)=>{
    try{
      if(mine)await db.ref("category_requests/"+key+"/users/"+user).remove();
      else await db.ref("category_requests/"+key+"/users/"+user).set(true);
    }catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");}
  };
  const wishes=Object.entries(requests||{})
    .map(([key,r])=>({key,name:r.name||key,votes:Object.keys(r.users||{}).length,mine:!!r.users?.[user]}))
    .filter(w=>w.votes>0)
    .sort((a,b)=>b.votes-a.votes||a.name.localeCompare(b.name));
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
      <section aria-label="Kategorie vorschlagen" style={{...card,padding:16,display:"flex",flexDirection:"column",gap:8,marginBottom:22}}>
        <label htmlFor="kat-name" style={lbl}>Name der Kategorie</label>
        <input id="kat-name" value={name} onChange={e=>{setName(e.target.value);setMsg("");}} placeholder="z. B. Pizzerien" style={inp}/>
        <label htmlFor="kat-note" style={{...lbl,marginTop:6}}>Anmerkung (optional)</label>
        <input id="kat-note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Was soll man dort bewerten?" style={inp}/>
        <button onClick={send} disabled={busy} style={{marginTop:8,minHeight:48,borderRadius:14,border:"none",background:busy?t.sliderTrack:t.accent,color:t.onAccent,fontSize:15,fontWeight:700,cursor:"pointer"}}>{busy?"Sende…":"Vorschlag absenden"}</button>
        {msg&&<div style={{fontSize:13,textAlign:"center",color:msg.startsWith("✅")?t.link:t.danger}}>{msg}</div>}
      </section>

      <section>
        <h2 style={h2}>Schon gewünscht</h2>
        <div style={{...card,padding:"2px 16px"}}>
          {requests===null&&<div style={{fontSize:13,color:t.sub,padding:"14px 0"}}>Lade…</div>}
          {requests!==null&&wishes.length===0&&<div style={{fontSize:13,color:t.sub,padding:"14px 0"}}>Noch keine Wünsche. Deiner wäre der erste.</div>}
          {wishes.map((w,i)=>(
            <div key={w.key} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderTop:i?`1px solid ${t.cardBorder}`:"none"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14.5,fontWeight:600,color:t.title}}>{w.name}</div>
                <div style={{fontSize:12,color:t.sub,marginTop:2}}>{w.votes} {w.votes===1?"Stimme":"Stimmen"}{w.mine?" · auch von dir":""}</div>
              </div>
              <button onClick={()=>toggle(w.key,w.mine)} aria-pressed={w.mine}
                style={{flexShrink:0,minHeight:36,padding:"0 12px",borderRadius:18,border:`1.5px solid ${t.accent}`,background:w.mine?t.accent:"transparent",color:w.mine?t.onAccent:t.link,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{w.mine?"Dabei ✓":"Ich auch"}</button>
            </div>
          ))}
        </div>
      </section>
    </Page>
  );
}
