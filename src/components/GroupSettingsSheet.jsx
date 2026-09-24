import {useState} from "react";
import {db} from "../firebase.js";
import {readOnce} from "../lib/auth.js";
import {CATEGORY_DEFS,CATEGORY_GROUPS} from "../categories.js";
import {SwipeableSheet} from "./ui.jsx";

// Gruppen-Einstellungen (Admin)
export function GroupSettingsSheet({group,user,onClose,t}){
  const [newMember,setNewMember]=useState("");
  const [msg,setMsg]=useState("");
  const isAdmin=group.members?.[user]==="admin";
  const members=Object.entries(group.members||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  const addMember=async()=>{
    const n=newMember.trim();
    if(!n){setMsg("Bitte Benutzernamen eingeben.");return;}
    if(group.members?.[n]){setMsg("Ist bereits Mitglied.");return;}
    try{
      const created=await readOnce("users/"+n+"/createdAt");
      if(!created){setMsg("Benutzer \""+n+"\" existiert nicht. Er muss sich zuerst registrieren.");return;}
      await db.ref("groups/"+group.id+"/members/"+n).set("member");
      setNewMember("");setMsg("✅ "+n+" hinzugefügt.");
    }catch{setMsg("Fehler beim Hinzufügen.");}
  };
  const setRole=async(name,role)=>{
    const admins=members.filter(([,r])=>r==="admin");
    if(role==="member"&&admins.length===1&&admins[0][0]===name){setMsg("Die Gruppe braucht mindestens einen Admin.");return;}
    try{await db.ref("groups/"+group.id+"/members/"+name).set(role);setMsg("");}
    catch{setMsg("Fehler.");}
  };
  const enableCategory=async(catId)=>{
    try{await db.ref("groups/"+group.id+"/categories/"+catId).set(true);}catch{setMsg("Fehler.");}
  };
  const inviteLink=window.location.origin+window.location.pathname+"#invite="+group.id;
  const copyInvite=async()=>{
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        await navigator.clipboard.writeText(inviteLink);
        setMsg("✅ Einladungslink kopiert! Schick ihn deinem Freund.");
      }else{
        // Fallback: alten Weg über ein temporäres Textfeld
        const ta=document.createElement("textarea");ta.value=inviteLink;document.body.appendChild(ta);ta.select();
        document.execCommand("copy");document.body.removeChild(ta);
        setMsg("✅ Einladungslink kopiert! Schick ihn deinem Freund.");
      }
    }catch{setMsg("Konnte nicht kopieren. Link: "+inviteLink);}
  };
  const inactiveStandard=Object.keys(CATEGORY_DEFS).filter(c=>!group.categories?.[c]);
  const inp={width:"100%",padding:"11px 13px",borderRadius:10,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,marginBottom:8};
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,color:t.title,letterSpacing:"-0.01em"}}>⚙️ {group.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2,marginBottom:20}}>{group.topic||"Gruppeneinstellungen"}</div>
        </div>
        <button onClick={onClose} title="Schließen" style={{background:t.secondaryBtn,color:t.secondaryBtnColor,border:"none",borderRadius:18,width:32,height:32,fontSize:18,cursor:"pointer",flexShrink:0,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,marginBottom:8}}>Mitglieder ({members.length})</div>
      {members.map(([name,role])=>(
        <div key={name} style={{display:"flex",alignItems:"center",gap:10,background:t.ratingRow,borderRadius:10,padding:"10px 14px",marginBottom:6,border:`1px solid ${t.ratingBorder}`}}>
          <span style={{fontWeight:600,fontSize:13,color:t.title,flex:1}}>{name}{name===user?" (du)":""}</span>
          <span style={{background:role==="admin"?t.adminBadge:t.memberBadge,color:role==="admin"?t.adminBadgeColor:t.memberBadgeColor,borderRadius:8,padding:"2px 8px",fontSize:11,fontWeight:600}}>{role==="admin"?"Admin":"Mitglied"}</span>
          {isAdmin&&role==="member"&&(<button onClick={()=>setRole(name,"admin")} style={{fontSize:11,color:t.restAccent,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Zum Admin machen</button>)}
          {isAdmin&&role==="admin"&&name!==user&&(<button onClick={()=>setRole(name,"member")} style={{fontSize:11,color:t.sub,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Admin entziehen</button>)}
        </div>
      ))}
      {isAdmin&&(
        <>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input value={newMember} onChange={e=>{setNewMember(e.target.value);setMsg("");}}
              onKeyDown={e=>e.key==="Enter"&&addMember()} placeholder="Benutzername hinzufügen…"
              style={{...inp,marginBottom:0,flex:1}}/>
            <button onClick={addMember} style={{padding:"0 18px",borderRadius:10,background:t.restBtn,color:t.btnColor,border:"none",cursor:"pointer",fontSize:14,fontWeight:600}}>+</button>
          </div>
          <div style={{fontSize:11,color:t.tick,marginTop:6}}>Die Person muss bereits ein Konto haben (Registrierung im Login-Bildschirm).</div>
          <button onClick={copyInvite} style={{width:"100%",marginTop:12,padding:13,borderRadius:10,background:t.secondaryBtn,color:t.secondaryBtnColor,border:"none",cursor:"pointer",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>🔗 Einladungslink kopieren</button>
          <div style={{fontSize:11,color:t.tick,marginTop:6}}>Über diesen Link kann sich ein Freund anmelden bzw. registrieren und kommt danach automatisch in diese Gruppe.</div>
          <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,marginTop:24,marginBottom:8}}>Bewertungskategorien</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
            {Object.keys(group.categories||{}).map(c=>(
              <span key={c} style={{padding:"6px 12px",borderRadius:16,background:t.innerCard,border:`1px solid ${t.cardBorder}`,fontSize:12,color:t.title}}>{CATEGORY_DEFS[c]?.icon} {CATEGORY_DEFS[c]?.label}</span>
            ))}
            {Object.values(group.custom||{}).map(c=>(
              <span key={c.id} style={{padding:"6px 12px",borderRadius:16,background:t.innerCard,border:`1px solid ${t.cardBorder}`,fontSize:12,color:t.title}}>{c.icon||"⭐"} {c.name}</span>
            ))}
          </div>
          {inactiveStandard.length>0&&(
            <>
              <div style={{fontSize:11,color:t.sub,marginBottom:6}}>Standard-Kategorie aktivieren:</div>
              {CATEGORY_GROUPS.map(grp=>{
                const items=grp.cats.filter(c=>inactiveStandard.includes(c));
                if(!items.length)return null;
                return(
                  <div key={grp.id} style={{marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:t.tick,marginBottom:4}}>{grp.icon} {grp.label}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {items.map(c=>(
                        <button key={c} onClick={()=>enableCategory(c)}
                          style={{padding:"6px 12px",borderRadius:16,background:"transparent",border:`1.5px dashed ${t.inputBorder}`,fontSize:12,color:t.sub,cursor:"pointer"}}>
                          + {CATEGORY_DEFS[c].icon} {CATEGORY_DEFS[c].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
      {msg&&<div style={{fontSize:12,color:msg.startsWith("✅")?"#2e7d52":t.danger,marginTop:12}}>{msg}</div>}
    </SwipeableSheet>
  );
}
