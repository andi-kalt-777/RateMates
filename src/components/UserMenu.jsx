import {useState} from "react";
import {SwipeableSheet} from "./ui.jsx";
import {AccountSheet} from "./AccountSheet.jsx";

// BENUTZER-MENÜ (Avatar mit Initialen)
export function initialsOf(name){
  const parts=(name||"").trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return "?";
  if(parts.length===1)return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[1][0]).toUpperCase();
}
export function UserMenu({user,dark,setDark,t,onLogout,extraItems}){
  const [open,setOpen]=useState(false);
  const [showAccount,setShowAccount]=useState(false);
  const accent=dark?"#fab600":"#6c7bff";
  const accentText=dark?"#141414":"#ffffff";
  const row={display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px 16px",marginBottom:8,background:t.innerCard,borderRadius:12,border:`1px solid ${t.cardBorder}`,cursor:"pointer",textAlign:"left",fontSize:14,color:t.title};
  return(
    <>
      <button onClick={()=>setOpen(true)} title={user}
        style={{width:36,height:36,borderRadius:"50%",background:accent,color:accentText,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{initialsOf(user)}</button>
      {open&&(
        <SwipeableSheet onClose={()=>setOpen(false)} t={t} zIndex={400}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:accent,color:accentText,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif"}}>{initialsOf(user)}</div>
              <div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:700,color:t.title}}>{user}</div>
                <div style={{fontSize:12,color:t.sub}}>Angemeldet</div>
              </div>
            </div>
            <button onClick={()=>setDark(d=>!d)} style={row}>
              <span style={{fontSize:18}}>{dark?"☀️":"🌙"}</span><span style={{flex:1}}>{dark?"Heller Modus":"Dunkler Modus"}</span>
            </button>
            <button onClick={()=>{setOpen(false);setShowAccount(true);}} style={row}>
              <span style={{fontSize:18}}>🔑</span><span style={{flex:1}}>Passwort ändern</span>
            </button>
            {(extraItems||[]).map((x,i)=>(
              <button key={i} onClick={()=>{setOpen(false);x.onClick();}} style={row}>
                <span style={{fontSize:18}}>{x.icon}</span><span style={{flex:1}}>{x.label}</span>
              </button>
            ))}
            <button onClick={()=>{setOpen(false);onLogout();}} style={{...row,color:t.danger,marginTop:10,marginBottom:0}}>
              <span style={{fontSize:18}}>🚪</span><span style={{flex:1}}>Abmelden</span>
            </button>
        </SwipeableSheet>
      )}
      {showAccount&&<AccountSheet user={user} onClose={()=>setShowAccount(false)} t={t}/>}
    </>
  );
}
