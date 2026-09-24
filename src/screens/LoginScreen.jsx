import {useState} from "react";
import {db,auth} from "../firebase.js";
import LOGO_SRC_DARK from "../assets/logo-gold.png";
import {hashPw,validUsername,authEmail,nameKey,validEmail,readOnce,loginError,NO_ACCOUNT_CODES,authErrorMsg,completeLogin} from "../lib/auth.js";

// Login & Registrierung
export function LoginScreen({onLogin,invitePending}){
  const [tab,setTab]=useState(invitePending?"register":"login");
  const [name,setName]=useState("");
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  const [forgot,setForgot]=useState(false);
  const [busy,setBusy]=useState(false);
  const inputStyle=err=>({width:"100%",padding:"13px 16px",borderRadius:12,fontSize:15,border:`1.5px solid ${err?"#c03028":"#dfdcd6"}`,outline:"none",color:"#1b1713",marginBottom:12,textAlign:"center"});
  const linkBtn={background:"none",border:"none",color:"#5d574f",fontSize:13,cursor:"pointer",marginTop:14,textDecoration:"underline",padding:4};
  // Anmeldung mit hinterlegter E-Mail-Adresse: Benutzername kommt aus uids/<uid>
  const doMailLogin=async mail=>{
    try{await auth.signInWithEmailAndPassword(mail,pw);}
    catch(e){if(NO_ACCOUNT_CODES.includes(e.code)||e.code==="auth/invalid-email")throw loginError("E-Mail-Adresse oder Passwort falsch.");throw e;}
    const n=await readOnce("uids/"+auth.currentUser.uid);
    if(!n)throw loginError("Zu dieser E-Mail-Adresse gehört kein RateMates-Konto.");
    await completeLogin(n,pw);
    return n;
  };
  const sendReset=async()=>{
    const m=name.trim();
    if(!validEmail(m)){setError("Bitte die E-Mail-Adresse eingeben, die du in deinem Konto hinterlegt hast.");return;}
    setBusy(true);setError("");setInfo("");
    const sent="✅ Falls zu dieser Adresse ein Konto gehört, ist jetzt eine E-Mail mit einem Link unterwegs. Schau auch im Spam-Ordner nach.";
    try{await auth.sendPasswordResetEmail(m);setInfo(sent);}
    catch(e){if(e.code==="auth/user-not-found")setInfo(sent);else setError(authErrorMsg(e,"Senden fehlgeschlagen. Bitte erneut versuchen."));}
    setBusy(false);
  };
  const doLogin=async()=>{
    const n0=name.trim();
    if(!n0||!pw){setError("Bitte Name oder E-Mail und Passwort eingeben.");return;}
    setBusy(true);setError("");setInfo("");
    if(n0.includes("@")){
      try{const n=await doMailLogin(n0);localStorage.setItem("rmg_user",n);onLogin(n);}
      catch(e){if(auth.currentUser)await auth.signOut().catch(()=>{});setError(e.msg||authErrorMsg(e,"Anmeldung fehlgeschlagen. Bitte erneut versuchen."));}
      setBusy(false);return;
    }
    const n=n0;
    let fresh=false;
    try{
      const email=authEmail(n);
      try{
        await auth.signInWithEmailAndPassword(email,pw);
      }catch(e){
        if(!NO_ACCOUNT_CODES.includes(e.code))throw e;
        // Kein Firebase-Konto mit diesem Passwort: entweder ein altes Konto, das jetzt
        // umgezogen wird, oder ein falsches Passwort. Solange der alte Hash noch lesbar
        // ist (Übergangsphase), wird er vorab geprüft; sonst entscheidet die Datenbankregel.
        const stored=await readOnce("users/"+n+"/pwHash").catch(()=>undefined);
        if(stored===null){
          const created=await readOnce("users/"+n+"/createdAt").catch(()=>null);
          throw loginError(created?"Falsches Passwort.":"Benutzer nicht gefunden.");
        }
        if(stored!==undefined&&stored!==await hashPw(n,pw))throw loginError("Falsches Passwort.");
        try{await auth.createUserWithEmailAndPassword(email,pw);fresh=true;}
        catch(e2){
          if(e2.code==="auth/email-already-in-use")throw loginError("Falsches Passwort.");
          throw e2;
        }
      }
      await completeLogin(n,pw);
      localStorage.setItem("rmg_user",n);
      onLogin(n);
    }catch(e){
      if(fresh)await auth.currentUser?.delete().catch(()=>{});
      else if(auth.currentUser)await auth.signOut().catch(()=>{});
      setError(e.msg||authErrorMsg(e,"Anmeldung fehlgeschlagen. Bitte erneut versuchen."));
    }
    setBusy(false);
  };
  const doRegister=async()=>{
    const n=name.trim();
    if(!validUsername(n)){setError("Name: 2–20 Zeichen, nur Buchstaben, Zahlen, Leerzeichen, - und _.");return;}
    if(pw.length<6){setError("Passwort: mindestens 6 Zeichen.");return;}
    if(pw!==pw2){setError("Passwörter stimmen nicht überein.");return;}
    setBusy(true);setError("");
    let fresh=false;
    try{
      try{await auth.createUserWithEmailAndPassword(authEmail(n),pw);fresh=true;}
      catch(e){if(e.code==="auth/email-already-in-use")throw loginError("Dieser Name ist bereits vergeben.");throw e;}
      const uid=auth.currentUser.uid;
      const taken=await readOnce("names/"+nameKey(n)).catch(()=>null);
      const exists=await readOnce("users/"+n+"/createdAt").catch(()=>null);
      if(taken||exists)throw loginError("Dieser Name ist bereits vergeben.");
      try{
        await db.ref("names/"+nameKey(n)).set(n);
        await db.ref("users/"+n).set({uid,createdAt:Date.now()});
        await db.ref("uids/"+uid).set(n);
        await auth.currentUser.updateProfile({displayName:n}).catch(()=>{});
      }catch{
        await db.ref("names/"+nameKey(n)).remove().catch(()=>{});
        throw loginError("Dieser Name ist bereits vergeben.");
      }
      localStorage.setItem("rmg_user",n);
      onLogin(n);
    }catch(e){
      if(fresh)await auth.currentUser?.delete().catch(()=>{});
      setError(e.msg||authErrorMsg(e,"Fehler bei der Registrierung."));
    }
    setBusy(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"#0b0b0a",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"white",borderRadius:24,padding:"36px 28px",width:"100%",maxWidth:360,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <img src={LOGO_SRC_DARK} alt="RateMates" style={{width:160,height:160,objectFit:"contain",margin:"0 auto 4px",display:"block"}}/>
        <div style={{fontSize:12,color:"#8a847c",marginBottom:invitePending?14:24}}>Gemeinsam bewerten mit Freunden</div>
        {invitePending&&<div style={{background:"#efe9fb",border:"1px solid #d9ccf5",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#5b3fa0"}}>🎉 Du wurdest von einem Freund eingeladen! Registriere dich oder melde dich an, danach seid ihr direkt befreundet.</div>}
        <div style={{display:"flex",gap:6,background:"#efedea",borderRadius:12,padding:4,marginBottom:20}}>
          {[["login","Anmelden"],["register","Registrieren"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>{setTab(id);setError("");setInfo("");setForgot(false);}}
              style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:tab===id?"#fab600":"transparent",color:tab===id?"#141414":"#5d574f"}}>
              {lbl}
            </button>
          ))}
        </div>
        {tab==="login"&&forgot?(
          <>
            <div style={{fontSize:13,color:"#5d574f",marginBottom:14,lineHeight:1.45}}>Gib die E-Mail-Adresse ein, die du in deinem Konto hinterlegt hast. Wir schicken dir einen Link, mit dem du ein neues Passwort setzen kannst.</div>
            <input type="email" value={name} onChange={e=>{setName(e.target.value);setError("");setInfo("");}}
              onKeyDown={e=>e.key==="Enter"&&sendReset()} placeholder="E-Mail-Adresse" style={inputStyle()}/>
            {error&&<div style={{color:"#c03028",fontSize:12,marginBottom:12}}>{error}</div>}
            {info&&<div style={{color:"#2e7d52",fontSize:12,marginBottom:12}}>{info}</div>}
            <button onClick={sendReset} disabled={busy}
              style={{width:"100%",padding:14,borderRadius:12,background:busy?"#999":"#fab600",color:"#141414",fontSize:15,fontWeight:700,border:"none",cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
              {busy?"Bitte warten…":"Link senden"}
            </button>
            <div style={{fontSize:11.5,color:"#8a847c",marginTop:14,lineHeight:1.45}}>Keine E-Mail-Adresse hinterlegt? Dann kann dir der RateMates-Admin ein neues Passwort geben.</div>
            <button onClick={()=>{setForgot(false);setError("");setInfo("");}} style={linkBtn}>Zurück zur Anmeldung</button>
          </>
        ):(
          <>
            <input value={name} onChange={e=>{setName(e.target.value);setError("");}} placeholder={tab==="login"?"Benutzername oder E-Mail":"Benutzername"} style={inputStyle()}/>
            <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&tab==="login"&&doLogin()} placeholder="Passwort" style={inputStyle()}/>
            {tab==="register"&&(
              <input type="password" value={pw2} onChange={e=>{setPw2(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&doRegister()} placeholder="Passwort wiederholen" style={inputStyle()}/>
            )}
            {error&&<div style={{color:"#c03028",fontSize:12,marginBottom:12}}>{error}</div>}
            <button onClick={tab==="login"?doLogin:doRegister} disabled={busy}
              style={{width:"100%",padding:14,borderRadius:12,background:busy?"#999":"#fab600",color:"#141414",fontSize:15,fontWeight:700,border:"none",cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
              {busy?"Bitte warten…":tab==="login"?"Anmelden":"Konto erstellen"}
            </button>
            {tab==="login"&&<button onClick={()=>{setForgot(true);setError("");setInfo("");if(!name.includes("@"))setName("");}} style={linkBtn}>Passwort vergessen?</button>}
          </>
        )}
      </div>
    </div>
  );
}
