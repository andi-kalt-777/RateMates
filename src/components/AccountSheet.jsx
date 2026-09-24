import {useState,useEffect} from "react";
import {firebase,db,auth} from "../firebase.js";
import {authEmail,nameKey,hasRealEmail,validEmail,readOnce,loginError,NO_ACCOUNT_CODES,authErrorMsg} from "../lib/auth.js";
import {ALL_CATS} from "../categories.js";
import {SwipeableSheet} from "./ui.jsx";

// Passwort ändern und Konto löschen (für alle Benutzer)
export function AccountSheet({user,onClose,t}){
  const [oldPw,setOldPw]=useState("");
  const [newPw,setNewPw]=useState("");
  const [newPw2,setNewPw2]=useState("");
  const [msg,setMsg]=useState("");
  const [delPw,setDelPw]=useState("");
  const [delMsg,setDelMsg]=useState("");
  const [mailNew,setMailNew]=useState("");
  const [mailPw,setMailPw]=useState("");
  const [mailMsg,setMailMsg]=useState("");
  const [curMail,setCurMail]=useState(auth.currentUser?.email||"");
  const [busy,setBusy]=useState(false);
  const inp={width:"100%",padding:"12px 14px",borderRadius:10,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,marginBottom:10};
  // Aktuelle Adresse vom Server holen: nach Bestätigung einer neuen E-Mail ist sie geändert
  useEffect(()=>{const cu=auth.currentUser;if(cu)cu.reload().then(()=>setCurMail(auth.currentUser?.email||"")).catch(()=>{});},[]);
  const hasMail=hasRealEmail({email:curMail});
  // Erneute Anmeldung vor sensiblen Aktionen — mit der tatsächlich hinterlegten Adresse
  const reauth=async(pw,wrongMsg)=>{
    const cu=auth.currentUser;
    if(!cu)throw loginError("Sitzung abgelaufen. Bitte neu anmelden.");
    await cu.reload().catch(()=>{});
    const cred=firebase.auth.EmailAuthProvider.credential(auth.currentUser.email||authEmail(user),pw);
    try{await cu.reauthenticateWithCredential(cred);}
    catch(e){if(NO_ACCOUNT_CODES.includes(e.code))throw loginError(wrongMsg);throw e;}
    return cu;
  };
  const saveMail=async()=>{
    const m=mailNew.trim();
    if(!validEmail(m)){setMailMsg("Bitte eine gültige E-Mail-Adresse eingeben.");return;}
    if(!mailPw){setMailMsg("Bitte dein Passwort zur Bestätigung eingeben.");return;}
    setBusy(true);setMailMsg("");
    try{
      const cu=await reauth(mailPw,"Passwort ist falsch.");
      await cu.verifyBeforeUpdateEmail(m);
      setMailNew("");setMailPw("");
      setMailMsg("✅ Wir haben eine Bestätigungs-Mail an "+m+" geschickt. Sobald du auf den Link klickst, ist die Adresse hinterlegt. Ab dann meldest du dich mit ihr an.");
    }catch(e){setMailMsg(e.msg||authErrorMsg(e,"Speichern fehlgeschlagen. Bitte erneut versuchen."));}
    setBusy(false);
  };
  const change=async()=>{
    if(!oldPw||!newPw){setMsg("Bitte alle Felder ausfüllen.");return;}
    if(newPw.length<6){setMsg("Neues Passwort: mindestens 6 Zeichen.");return;}
    if(newPw!==newPw2){setMsg("Neue Passwörter stimmen nicht überein.");return;}
    setBusy(true);setMsg("");
    try{
      const cu=await reauth(oldPw,"Aktuelles Passwort ist falsch.");
      await cu.updatePassword(newPw);
      await db.ref("users/"+user+"/pwHash").remove().catch(()=>{});
      await db.ref("users/"+user+"/seeded").remove().catch(()=>{});
      setOldPw("");setNewPw("");setNewPw2("");setMsg("✅ Passwort geändert.");
    }catch(e){setMsg(e.msg||authErrorMsg(e,"Fehler beim Ändern."));}
    setBusy(false);
  };
  // Konto löschen (Pflicht für den App Store): Bewertungen weg, Vorschläge ohne Namen,
  // Gruppen verlassen, Profil + Verknüpfungen + Firebase-Konto löschen.
  // Reihenfolge ist wichtig: Die Regeln prüfen bis zuletzt users/<Name>/uid und uids/<uid>.
  const deleteAccount=async()=>{
    if(!delPw){setDelMsg("Bitte dein Passwort eingeben.");return;}
    if(!window.confirm("Konto „"+user+"“ wirklich löschen?\n\nDeine Bewertungen werden gelöscht, deine Vorschläge bleiben ohne Namen erhalten. Das lässt sich nicht rückgängig machen."))return;
    setBusy(true);setDelMsg("");
    try{
      const cu=await reauth(delPw,"Passwort ist falsch.");
      const groups=Object.values((await readOnce("groups"))||{});
      const mine=groups.filter(g=>g.members&&g.members[user]);
      const blocked=mine.filter(g=>{const m=g.members;const admins=Object.keys(m).filter(k=>m[k]==="admin");return m[user]==="admin"&&admins.length===1&&Object.keys(m).length>1;});
      if(blocked.length)throw loginError("Du bist alleiniger Admin in: "+blocked.map(g=>g.name).join(", ")+". Ernenne dort zuerst einen anderen Admin.");
      const bases=ALL_CATS.map(c=>[c.base,c.sugg]);
      groups.forEach(g=>Object.values(g.custom||{}).forEach(c=>bases.push(["custom_"+c.id,"custom_"+c.id+"_sugg"])));
      for(const [base,sugg] of bases){
        const items=(await readOnce(base))||{};
        for(const [id,it] of Object.entries(items)){
          if(it.ratings&&it.ratings[user])await db.ref(base+"/"+id+"/ratings/"+user).remove();
          if(it.author===user)await db.ref(base+"/"+id+"/author").remove().catch(()=>{});
        }
        const suggs=(await readOnce(sugg))||{};
        for(const [id,s] of Object.entries(suggs)){if(s.author===user)await db.ref(sugg+"/"+id+"/author").remove().catch(()=>{});}
      }
      const reqs=(await readOnce("category_requests"))||{};
      for(const [k,r] of Object.entries(reqs)){if(r.users&&r.users[user])await db.ref("category_requests/"+k+"/users/"+user).remove().catch(()=>{});}
      for(const g of mine){
        if(Object.keys(g.members).length===1)await db.ref("groups/"+g.id).remove();
        else await db.ref("groups/"+g.id+"/members/"+user).remove();
      }
      await db.ref("users/"+user).remove();
      await db.ref("names/"+nameKey(user)).remove().catch(()=>{});
      await db.ref("uids/"+cu.uid).remove().catch(()=>{});
      localStorage.removeItem("rmg_user");
      await cu.delete(); // löst onAuthStateChanged aus -> zurück zum Login
    }catch(e){setDelMsg(e.msg||authErrorMsg(e,"Löschen fehlgeschlagen. Bitte erneut versuchen."));}
    setBusy(false);
  };
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,color:t.title,letterSpacing:"-0.01em"}}>🔑 Passwort ändern</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2,marginBottom:20}}>Angemeldet als {user}</div>
        </div>
        <button onClick={onClose} title="Schließen" style={{background:t.secondaryBtn,color:t.secondaryBtnColor,border:"none",borderRadius:18,width:32,height:32,fontSize:18,cursor:"pointer",flexShrink:0,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <input type="password" value={oldPw} onChange={e=>{setOldPw(e.target.value);setMsg("");}} placeholder="Aktuelles Passwort" style={inp}/>
      <input type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setMsg("");}} placeholder="Neues Passwort (min. 6 Zeichen)" style={inp}/>
      <input type="password" value={newPw2} onChange={e=>{setNewPw2(e.target.value);setMsg("");}}
        onKeyDown={e=>e.key==="Enter"&&change()} placeholder="Neues Passwort wiederholen" style={inp}/>
      {msg&&<div style={{fontSize:12,color:msg.startsWith("✅")?"#2e7d52":t.danger,marginBottom:10}}>{msg}</div>}
      <button onClick={change} disabled={busy}
        style={{width:"100%",padding:14,borderRadius:12,background:busy?"#999":t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
        {busy?"Wird geändert…":"Passwort ändern"}
      </button>
      <div style={{borderTop:`1px solid ${t.inputBorder}`,marginTop:26,paddingTop:18}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:t.title}}>✉️ E-Mail für Passwort-Reset</div>
        <div style={{fontSize:12,color:t.sub,marginTop:2,marginBottom:12,lineHeight:1.45}}>
          {hasMail
            ?<>Hinterlegt: <b style={{color:t.title}}>{curMail}</b>. Du meldest dich mit dieser Adresse an und kannst ein vergessenes Passwort per Mail zurücksetzen. Hier kannst du sie ändern.</>
            :<>Freiwillig. Mit einer hinterlegten Adresse kannst du ein vergessenes Passwort selbst per Mail zurücksetzen. Du meldest dich dann mit der E-Mail-Adresse statt mit dem Benutzernamen an.</>}
        </div>
        <input type="email" value={mailNew} onChange={e=>{setMailNew(e.target.value);setMailMsg("");}} placeholder={hasMail?"Neue E-Mail-Adresse":"E-Mail-Adresse"} style={inp}/>
        <input type="password" value={mailPw} onChange={e=>{setMailPw(e.target.value);setMailMsg("");}}
          onKeyDown={e=>e.key==="Enter"&&saveMail()} placeholder="Passwort zur Bestätigung" style={inp}/>
        {mailMsg&&<div style={{fontSize:12,color:mailMsg.startsWith("✅")?"#2e7d52":t.danger,marginBottom:10,lineHeight:1.45}}>{mailMsg}</div>}
        <button onClick={saveMail} disabled={busy}
          style={{width:"100%",padding:13,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:14,fontWeight:700,border:"none",cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
          {busy?"Bitte warten…":hasMail?"Adresse ändern":"Adresse hinterlegen"}
        </button>
      </div>
      <div style={{borderTop:`1px solid ${t.inputBorder}`,marginTop:26,paddingTop:18}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:t.title}}>🗑️ Konto löschen</div>
        <div style={{fontSize:12,color:t.sub,marginTop:2,marginBottom:12}}>Löscht dein Konto, deine Bewertungen und deine Gruppenmitgliedschaften endgültig. Deine Vorschläge bleiben ohne Namen erhalten.</div>
        <input type="password" value={delPw} onChange={e=>{setDelPw(e.target.value);setDelMsg("");}} placeholder="Passwort zur Bestätigung" style={inp}/>
        {delMsg&&<div style={{fontSize:12,color:t.danger,marginBottom:10}}>{delMsg}</div>}
        <button onClick={deleteAccount} disabled={busy}
          style={{width:"100%",padding:13,borderRadius:12,background:"transparent",color:t.danger,fontSize:14,fontWeight:700,border:`1.5px solid ${t.danger}`,cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
          {busy?"Bitte warten…":"Konto endgültig löschen"}
        </button>
      </div>
    </SwipeableSheet>
  );
}
