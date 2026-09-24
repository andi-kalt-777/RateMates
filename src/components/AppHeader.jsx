import {useState} from "react";
import {CATEGORY_GROUPS} from "../categories/index.js";
import {SwipeableSheet} from "./ui.jsx";
import {UserMenu} from "./UserMenu.jsx";

// ModeMenu & Header
export function ModeMenu({mode,setMode,modes,onClose,t}){
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={300}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title,marginBottom:16,textAlign:"center"}}>Bereich wechseln</div>
        {(()=>{
          const byId=Object.fromEntries(modes.map(m=>[m[0],m]));
          const sections=CATEGORY_GROUPS.map(g=>({...g,items:g.cats.filter(c=>byId[c]).map(c=>byId[c])})).filter(g=>g.items.length>0);
          const customItems=modes.filter(m=>m[0].startsWith("c:"));
          if(customItems.length)sections.push({id:"custom",icon:"⭐",label:"Weitere",items:customItems});
          return sections.map(sec=>(
            <div key={sec.id} style={{marginBottom:10}}>
              {sections.length>1&&<div style={{fontSize:11,fontWeight:700,color:t.sub,margin:"4px 2px 6px",fontFamily:"'Space Grotesk',sans-serif"}}>{sec.icon} {sec.label}</div>}
              {sec.items.map(([id,icon,label])=>(
                <button key={id} onClick={()=>{setMode(id);onClose();}}
                  style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:8,background:mode===id?`${t.restNavActive}18`:t.innerCard,borderRadius:12,border:`1.5px solid ${mode===id?t.restNavActive:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:24}}>{icon}</span>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:mode===id?700:400,color:t.title,flex:1}}>{label}</span>
                  {mode===id&&<span style={{color:t.restNavActive,fontSize:18}}>✓</span>}
                </button>
              ))}
            </div>
          ));
        })()}
    </SwipeableSheet>
  );
}
export function AppHeader({user,dark,setDark,mode,setMode,modes,t,title,subtitle,headerBg,headerSub,onBack,isAdmin,onSettings,onLogout}){
  const [showMenu,setShowMenu]=useState(false);
  const currentIcon=(modes.find(m=>m[0]===mode)||["","⭐"])[1];
  return(
    <>
      <div style={{background:headerBg,padding:"20px 20px 16px",color:"white",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",gap:10,flex:1,minWidth:0}}>
          <button onClick={onBack} title="Zur Gruppenübersicht" style={{background:"none",border:"none",color:"rgba(255,255,255,0.8)",fontSize:20,cursor:"pointer",paddingTop:1,flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,lineHeight:1.3,letterSpacing:"-0.01em"}}>{title}</div>
            <div style={{fontSize:12,color:headerSub,marginTop:5}}>{subtitle}</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0,marginLeft:12}}>
          <div style={{display:"flex",gap:6}}>
            <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout} extraItems={isAdmin?[{icon:"⚙️",label:"Gruppen-Einstellungen",onClick:onSettings}]:[]}/>
          </div>
          {modes.length>1&&<button onClick={()=>setShowMenu(true)} title="Bereich wechseln" style={{background:t.modeSwitchBg,border:`1px solid ${t.modeSwitchBorder}`,borderRadius:18,padding:"5px 11px",cursor:"pointer",fontSize:15}}>{currentIcon}</button>}
        </div>
      </div>
      {showMenu&&<ModeMenu mode={mode} setMode={setMode} modes={modes} onClose={()=>setShowMenu(false)} t={t}/>}
    </>
  );
}
