import {useState} from "react";
import LOGO_SRC from "../assets/logo-hell.png";
import LOGO_SRC_DARK from "../assets/logo-gold.png";
import {UserMenu} from "../components/UserMenu.jsx";
import {CategoryRequestSheet} from "../components/CategoryRequestSheet.jsx";

// HAUPTSEITE
export function HomePage({user,dark,setDark,t,onNav,onLogout}){
  const [showCatRequest,setShowCatRequest]=useState(false);
  const tiles=[
    {id:"ratings",icon:"⭐",title:"Bewertungen",text:"Alle Wertungen von dir und deinen Freunden aus allen Gruppen"},
    {id:"suggestions",icon:"💡",title:"Vorschläge",text:"Alle Ideen für das nächste Mal — gruppenübergreifend"},
    {id:"groups",icon:"👥",title:"Gruppen",text:"Deine Gruppen öffnen, verwalten und Freunde einladen"},
    {id:"catRequest",icon:"💭",title:"Kategorie vorschlagen",text:"Dir fehlt eine Kategorie? Reich deinen Wunsch ein"},
  ];
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",transition:"background 0.3s",display:"flex",flexDirection:"column",padding:"32px 20px 28px"}}>
      <div style={{display:"flex",justifyContent:"flex-end",gap:6}}>
        <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
      </div>
      <img src={dark?LOGO_SRC_DARK:LOGO_SRC} alt="RateMates" style={{width:150,height:150,objectFit:"contain",margin:"4px auto 2px",display:"block"}}/>
      <div style={{textAlign:"center",fontSize:13,color:t.sub,marginBottom:26}}>Hi <strong style={{color:t.title}}>{user}</strong>, was möchtest du tun?</div>
      {tiles.map(x=>(
        <button key={x.id} onClick={()=>x.id==="catRequest"?setShowCatRequest(true):onNav(x.id)}
          style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"18px 18px",marginBottom:12,background:t.card,borderRadius:16,border:`1.5px solid ${t.cardBorder}`,cursor:"pointer",textAlign:"left",boxShadow:`0 2px 10px ${t.cardShadow}`}}>
          <span style={{fontSize:30}}>{x.icon}</span>
          <span style={{flex:1}}>
            <span style={{display:"block",fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title}}>{x.title}</span>
            <span style={{display:"block",fontSize:12,color:t.sub,marginTop:3}}>{x.text}</span>
          </span>
          <span style={{fontSize:18,color:t.tick}}>›</span>
        </button>
      ))}
      <div style={{flex:1}}/>
      {showCatRequest&&<CategoryRequestSheet user={user} t={t} onClose={()=>setShowCatRequest(false)}/>}
    </div>
  );
}
