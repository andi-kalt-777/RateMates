import {useState} from "react";
import {INVITE_DAYS} from "../lib/friends.js";
import {
  sendFriendRequest,acceptFriendRequest,declineFriendRequest,cancelFriendRequest,removeFriend,createInviteLink,
} from "../lib/useFriends.js";
import {initialsOf,UserMenu} from "../components/UserMenu.jsx";
import {Page,PageHeader} from "../components/PageHeader.jsx";

// FREUNDE: einladen, Anfragen annehmen, Freundesliste
export function FriendsPage({user,social,notice,dark,setDark,t,onLogout}){
  const {friends,friendSince,incoming,sent}=social;
  const [name,setName]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const ok=m=>setMsg("✅ "+m);
  const fail=(e,fallback)=>setMsg("⚠️ "+(e?.msg||fallback));
  const run=async(fn,fallback)=>{
    setBusy(true);setMsg("");
    try{await fn();}catch(e){fail(e,fallback);}
    setBusy(false);
  };
  const invite=()=>run(async()=>{
    const link=await createInviteLink(user);
    const text="Bewerte mit mir auf RateMates, von Freunden für Freunde:";
    if(navigator.share){
      try{await navigator.share({title:"RateMates",text,url:link});ok("Einladung geteilt. Sobald dein Freund den Link öffnet, seid ihr befreundet.");return;}
      catch(e){if(e?.name==="AbortError")return;}
    }
    try{await navigator.clipboard.writeText(link);}
    catch{ok("Dein Einladungslink: "+link);return;}
    ok("Einladungslink kopiert. Schick ihn deinem Freund, zum Beispiel per WhatsApp.");
  },"Link konnte nicht erstellt werden. Bitte erneut versuchen.");
  const request=()=>run(async()=>{
    const r=await sendFriendRequest(user,name,social);
    setName("");
    ok(r.accepted?"Ihr seid jetzt befreundet: "+r.name+" hatte dich schon angefragt.":"Anfrage an "+r.name+" gesendet.");
  },"Anfrage konnte nicht gesendet werden.");
  const unfriend=f=>{
    if(!window.confirm("Freundschaft mit "+f+" beenden?\n\nIhr seht dann gegenseitig keine Bewertungen mehr."))return;
    run(()=>removeFriend(user,f),"Konnte nicht entfernt werden.");
  };

  const card={background:t.card,border:`1px solid ${t.cardBorder}`,borderRadius:16,boxShadow:`0 2px 12px ${t.cardShadow}`};
  const h2={margin:"0 0 10px",fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title};
  const pill=(on)=>({flexShrink:0,minHeight:36,padding:"0 12px",borderRadius:18,border:`1.5px solid ${t.accent}`,background:on?t.accent:"transparent",color:on?t.onAccent:t.link,fontSize:12.5,fontWeight:700,cursor:"pointer"});
  const quiet={flexShrink:0,minHeight:36,padding:"0 10px",borderRadius:18,border:"none",background:"transparent",color:t.sub,fontSize:12.5,fontWeight:600,cursor:"pointer"};
  const avatar=n=><div style={{width:38,height:38,flexShrink:0,borderRadius:19,background:t.tile,color:t.title,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700}}>{initialsOf(n)}</div>;
  const row=(n,i,sub,actions)=>(
    <div key={n} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderTop:i?`1px solid ${t.cardBorder}`:"none"}}>
      {avatar(n)}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14.5,fontWeight:600,color:t.title,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n}</div>
        {sub&&<div style={{fontSize:12,color:t.sub,marginTop:2}}>{sub}</div>}
      </div>
      {actions}
    </div>
  );
  const since=f=>{const s=friendSince[f]?.since;return typeof s==="number"?"befreundet seit "+new Date(s).toLocaleDateString("de-DE"):null;};
  const banner=m=>m&&<div role="status" style={{fontSize:13,lineHeight:1.45,padding:"11px 14px",borderRadius:12,marginBottom:16,background:m.startsWith("✅")?`${t.accent}1f`:`${t.danger}14`,color:m.startsWith("✅")?t.title:t.danger}}>{m}</div>;

  return(
    <Page t={t}>
      <PageHeader t={t} title="Freunde" subtitle={friends.length+(friends.length===1?" Freund":" Freunde")+" · von Freunden für Freunde"}
        right={<UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>}/>
      {banner(notice)}
      {banner(msg)}

      {incoming.length>0&&(
        <section style={{marginBottom:22}}>
          <h2 style={h2}>Anfragen</h2>
          <div style={{...card,padding:"2px 16px"}}>
            {incoming.map((n,i)=>row(n,i,"möchte mit dir befreundet sein",<>
              <button style={quiet} disabled={busy} onClick={()=>run(()=>declineFriendRequest(user,n),"Konnte nicht ablehnen.")}>Ablehnen</button>
              <button style={pill(true)} disabled={busy} onClick={()=>run(async()=>{await acceptFriendRequest(user,n);ok("Du bist jetzt mit "+n+" befreundet.");},"Konnte nicht annehmen.")}>Annehmen</button>
            </>))}
          </div>
        </section>
      )}

      <section style={{...card,padding:16,marginBottom:22}}>
        <button onClick={invite} disabled={busy} style={{width:"100%",minHeight:48,borderRadius:14,border:"none",background:t.accent,color:t.onAccent,fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>
          Freund einladen
        </button>
        <div style={{fontSize:12,color:t.sub,marginTop:8,lineHeight:1.45}}>Wer den Link öffnet, ist direkt mit dir befreundet, auch ohne Konto: Die Registrierung geht dann gleich mit. Jeder Link gilt {INVITE_DAYS} Tage und nur einmal.</div>
        <label htmlFor="friend-name" style={{display:"block",fontSize:12.5,fontWeight:600,color:t.sub,marginTop:16,marginBottom:6}}>Schon bei RateMates? Anfrage per Benutzername</label>
        <div style={{display:"flex",gap:8}}>
          <input id="friend-name" value={name} onChange={e=>{setName(e.target.value);setMsg("");}} onKeyDown={e=>e.key==="Enter"&&!busy&&request()}
            placeholder="Benutzername" autoCapitalize="none" autoCorrect="off"
            style={{flex:1,minWidth:0,height:46,padding:"0 14px",borderRadius:12,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,color:t.inputColor,fontSize:15,outline:"none"}}/>
          <button onClick={request} disabled={busy} style={{...pill(false),minHeight:46,padding:"0 16px"}}>Anfragen</button>
        </div>
      </section>

      <section style={{marginBottom:22}}>
        <h2 style={h2}>Deine Freunde</h2>
        <div style={{...card,padding:"2px 16px"}}>
          {friends.length===0&&<div style={{fontSize:13,color:t.sub,padding:"14px 0",lineHeight:1.5}}>Noch niemand. Lade deine Freunde ein, dann seht ihr gegenseitig eure Bewertungen.</div>}
          {friends.map((f,i)=>row(f,i,since(f),<button style={quiet} disabled={busy} onClick={()=>unfriend(f)} aria-label={"Freundschaft mit "+f+" beenden"}>Entfernen</button>))}
        </div>
      </section>

      {sent.length>0&&(
        <section>
          <h2 style={h2}>Gesendete Anfragen</h2>
          <div style={{...card,padding:"2px 16px"}}>
            {sent.map((n,i)=>row(n,i,"wartet auf Bestätigung",
              <button style={quiet} disabled={busy} onClick={()=>run(()=>cancelFriendRequest(user,n),"Konnte nicht zurückziehen.")}>Zurückziehen</button>))}
          </div>
        </section>
      )}
    </Page>
  );
}
