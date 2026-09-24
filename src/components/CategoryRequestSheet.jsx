import {useState} from "react";
import {db} from "../firebase.js";
import {SwipeableSheet} from "./ui.jsx";

// KATEGORIE-VORSCHLAG
export function catReqKey(name){
  const k=name.toLowerCase().trim().replace(/[.#$/[\]]/g,"").replace(/\s+/g,"_");
  return k||"unbenannt";
}
export function CategoryRequestSheet({user,t,onClose}){
  const [name,setName]=useState("");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const send=async()=>{
    const n=name.trim();
    if(!n){setMsg("Bitte gib einen Namen für die Kategorie an.");return;}
    setBusy(true);setMsg("");
    try{
      const key=catReqKey(n);
      await db.ref("category_requests/"+key+"/name").set(n);
      await db.ref("category_requests/"+key+"/users/"+user).set(note.trim()||true);
      setMsg("✅ Danke! Dein Vorschlag wurde übermittelt.");
      setName("");setNote("");
      setTimeout(onClose,1400);
    }catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");}
    setBusy(false);
  };
  const inp={width:"100%",padding:"13px 16px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,outline:"none",background:t.inputBg,color:t.inputColor,marginBottom:12};
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={400}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:6,textAlign:"center"}}>💭 Kategorie vorschlagen</div>
      <div style={{fontSize:13,color:t.sub,textAlign:"center",marginBottom:18}}>Welche Kategorie fehlt dir in RateMates?</div>
      <input value={name} onChange={e=>{setName(e.target.value);setMsg("");}} placeholder="Name der Kategorie, z.B. Pizzerien" style={inp}/>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Anmerkung (optional)" style={inp}/>
      <button onClick={send} disabled={busy}
        style={{width:"100%",padding:14,borderRadius:12,background:busy?t.sliderTrack:t.restBtn,color:t.btnColor,border:"none",cursor:"pointer",fontSize:15,fontWeight:700}}>
        {busy?"Sende…":"Vorschlag absenden"}
      </button>
      {msg&&<div style={{marginTop:12,fontSize:13,textAlign:"center",color:msg.startsWith("✅")?t.restAccent:t.danger}}>{msg}</div>}
    </SwipeableSheet>
  );
}
