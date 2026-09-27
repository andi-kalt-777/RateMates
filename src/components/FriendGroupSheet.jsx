import {useState} from "react";
import {cleanGroupName,groupNameError,newGroupId} from "../lib/friendGroups.js";
import {saveFriendGroup,deleteFriendGroup} from "../lib/useFriends.js";
import {initialsOf} from "./UserMenu.jsx";
import {SwipeableSheet} from "./ui.jsx";

// Eigene Freundes-Gruppe anlegen oder bearbeiten: Name und wer dazugehört.
// group = {id, name, members} beim Bearbeiten, null für eine neue Gruppe.
export function FriendGroupSheet({user,group,groups,friends,t,onClose}){
  const [name,setName]=useState(group?.name||"");
  const [members,setMembers]=useState(()=>new Set(group?.members||[]));
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const toggle=f=>setMembers(p=>{const n=new Set(p);if(n.has(f))n.delete(f);else n.add(f);return n;});
  const save=async()=>{
    const n=cleanGroupName(name);
    const err=groupNameError(n,groups,group?.id);
    if(err){setMsg(err);return;}
    setBusy(true);setMsg("");
    try{await saveFriendGroup(user,group?.id||newGroupId(),n,friends.filter(f=>members.has(f)));onClose();}
    catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");setBusy(false);}
  };
  const remove=async()=>{
    if(!window.confirm("Gruppe „"+group.name+"“ löschen?\n\nDeine Freunde bleiben deine Freunde, nur die Gruppe verschwindet."))return;
    setBusy(true);
    try{await deleteFriendGroup(user,group.id);onClose();}
    catch{setMsg("⚠️ Konnte nicht löschen. Bitte erneut versuchen.");setBusy(false);}
  };
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,textAlign:"center"}}>{group?"Gruppe bearbeiten":"Neue Gruppe"}</div>
      <div style={{fontSize:12.5,color:t.sub,textAlign:"center",margin:"4px 0 16px"}}>Nur du siehst deine Gruppen. Sie dienen nur zum Sortieren.</div>
      <label htmlFor="group-name" style={{display:"block",fontSize:12.5,fontWeight:600,color:t.sub,marginBottom:6}}>Name</label>
      <input id="group-name" value={name} onChange={e=>{setName(e.target.value);setMsg("");}} placeholder="z. B. Montagsrunde" maxLength={40}
        style={{width:"100%",height:46,padding:"0 14px",borderRadius:12,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,color:t.inputColor,fontSize:15,outline:"none",marginBottom:16}}/>
      <div style={{fontSize:12.5,fontWeight:600,color:t.sub,marginBottom:8}}>Wer gehört dazu? ({members.size})</div>
      {friends.map(f=>{
        const on=members.has(f);
        return(
          <button key={f} onClick={()=>toggle(f)} aria-pressed={on}
            style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 14px",marginBottom:8,background:on?`${t.accent}14`:t.card,borderRadius:12,border:`1.5px solid ${on?t.accent:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
            <span style={{width:34,height:34,flexShrink:0,borderRadius:17,background:t.tile,color:t.title,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:700}}>{initialsOf(f)}</span>
            <span style={{flex:1,fontSize:14.5,fontWeight:on?600:500,color:t.title}}>{f}</span>
            <span style={{width:22,height:22,borderRadius:6,border:`2px solid ${on?t.accent:t.inputBorder}`,background:on?t.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:t.onAccent,fontSize:13,fontWeight:700}}>{on?"✓":""}</span>
          </button>
        );
      })}
      {msg&&<div style={{fontSize:13,color:t.danger,margin:"4px 0 8px"}}>{msg}</div>}
      <button onClick={save} disabled={busy} style={{width:"100%",marginTop:8,minHeight:48,borderRadius:14,border:"none",background:busy?t.sliderTrack:t.accent,color:t.onAccent,fontSize:15,fontWeight:700,cursor:"pointer"}}>{busy?"Speichere…":"Speichern"}</button>
      {group&&<button onClick={remove} disabled={busy} style={{width:"100%",marginTop:10,minHeight:44,borderRadius:14,border:`1.5px solid ${t.danger}`,background:"transparent",color:t.danger,fontSize:14,fontWeight:700,cursor:"pointer"}}>Gruppe löschen</button>}
    </SwipeableSheet>
  );
}
