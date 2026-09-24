import {useState} from "react";
import {db} from "../firebase.js";
import {CATEGORY_DEFS,CATEGORY_GROUPS} from "../categories.js";
import {UserMenu} from "../components/UserMenu.jsx";

// Gruppenübersicht
export function GroupsOverview({user,groups,onOpen,onLogout,dark,setDark,t,inviteMsg,onHome}){
  const [view,setView]=useState("list");
  const [topicF,setTopicF]=useState("");
  const [sortBy,setSortBy]=useState("name");
  const [form,setForm]=useState({name:"",topic:"",categories:{restaurant:true,whisky:false,film:false,serie:false,coffee:false,beer:false,wine:false,tea:false,matcha:false,gin:false,rum:false,vodka:false,book:false,audiobook:false,cafe:false,bar:false,icecream:false,delivery:false}});
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const my=groups.filter(g=>g.members&&g.members[user]);
  const topics=[...new Set(my.map(g=>(g.topic||"").trim()).filter(Boolean))].sort();
  const shown=my.filter(g=>!topicF||g.topic===topicF).sort((a,b)=>{
    if(sortBy==="topic"){const c=(a.topic||"").localeCompare(b.topic||"");if(c!==0)return c;}
    return a.name.localeCompare(b.name);
  });
  const createGroup=async()=>{
    if(!form.name.trim()){setError("Bitte einen Gruppennamen eingeben.");return;}
    if(!Object.values(form.categories).some(Boolean)){setError("Bitte mindestens eine Kategorie auswählen.");return;}
    setSaving(true);setError("");
    try{
      const id=Date.now().toString();
      const categories=Object.fromEntries(Object.entries(form.categories).filter(([,v])=>v));
      await db.ref("groups/"+id).set({id,name:form.name.trim(),topic:form.topic.trim(),categories,members:{[user]:"admin"},createdBy:user,createdAt:Date.now()});
      setForm({name:"",topic:"",categories:{restaurant:true,whisky:false,film:false,serie:false,coffee:false,beer:false,wine:false,tea:false,matcha:false,gin:false,rum:false,vodka:false,book:false,audiobook:false,cafe:false,bar:false,icecream:false,delivery:false}});
      setView("list");
    }catch{setError("Fehler beim Erstellen.");}
    setSaving(false);
  };
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",transition:"background 0.3s"}}>
      <div style={{background:t.restHeaderBg,padding:"20px 20px 16px",color:"white",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          {onHome&&<button onClick={onHome} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:"24px"}}>←</button>}
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,letterSpacing:"-0.01em"}}>Meine Gruppen</div>
            <div style={{fontSize:12,color:t.restHeaderSub,marginTop:4}}>{my.length} Gruppe{my.length!==1?"n":""}</div>
          </div>
        </div>
        <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
      </div>
      {view==="list"&&(
        <div style={{padding:"20px 16px 40px"}}>
          {inviteMsg&&<div style={{background:inviteMsg.startsWith("✅")?"#e7f5ee":"#fdecea",border:`1px solid ${inviteMsg.startsWith("✅")?"#bfe3cf":"#f5c6c2"}`,borderRadius:12,padding:"11px 14px",marginBottom:16,fontSize:13,color:inviteMsg.startsWith("✅")?"#1f7a4d":"#b0322a"}}>{inviteMsg}</div>}
          {topics.length>0&&(
            <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
              <select value={topicF} onChange={e=>setTopicF(e.target.value)}
                style={{padding:"7px 10px",borderRadius:20,border:`1px solid ${topicF?t.restFilterOn:t.filterBorder}`,background:topicF?t.restFilterOn:t.filterBg,color:topicF?t.restFilterOnColor:t.filterColor,fontSize:12,cursor:"pointer",outline:"none",flexShrink:0}}>
                <option value="">Alle Oberbegriffe</option>
                {topics.map(o=><option key={o}>{o}</option>)}
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                style={{padding:"7px 10px",borderRadius:20,border:`1px solid ${t.filterBorder}`,background:t.filterBg,color:t.filterColor,fontSize:12,cursor:"pointer",outline:"none",flexShrink:0}}>
                <option value="name">Sortierung: Name</option>
                <option value="topic">Sortierung: Oberbegriff</option>
              </select>
            </div>
          )}
          {shown.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}>
              <div style={{fontSize:48}}>👥</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{my.length===0?"Noch keine Gruppen":"Keine Treffer"}</div>
              <div style={{fontSize:13,marginTop:8}}>{my.length===0?"Erstelle deine erste Gruppe oder lass dich von einem Admin hinzufügen.":"Versuche einen anderen Filter."}</div>
            </div>
          ):shown.map(g=>{
            const cats=Object.keys(g.categories||{});
            const customCats=Object.values(g.custom||{});
            const isAdmin=g.members[user]==="admin";
            return(
              <div key={g.id} onClick={()=>onOpen(g)}
                style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,minWidth:0,paddingRight:8}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{g.name}</div>
                    {g.topic&&<div style={{fontSize:12,color:t.sub,marginTop:2}}>{g.topic}</div>}
                  </div>
                  <span style={{background:isAdmin?t.adminBadge:t.memberBadge,color:isAdmin?t.adminBadgeColor:t.memberBadgeColor,borderRadius:10,padding:"3px 10px",fontSize:11,fontWeight:600,flexShrink:0}}>{isAdmin?"Admin":"Mitglied"}</span>
                </div>
                <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:18,letterSpacing:2}}>{cats.map(c=>CATEGORY_DEFS[c]?.icon||"").join("")}{customCats.map(c=>c.icon||"⭐").join("")}</span>
                  <span style={{marginLeft:"auto",fontSize:12,color:t.sub}}>👥 {Object.keys(g.members||{}).length} Mitglied{Object.keys(g.members||{}).length!==1?"er":""}</span>
                </div>
              </div>
            );
          })}
          <button onClick={()=>setView("create")}
            style={{width:"100%",padding:16,borderRadius:14,background:t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",marginTop:8}}>
            + Neue Gruppe erstellen
          </button>
        </div>
      )}
      {view==="create"&&(
        <div style={{padding:"20px 16px 40px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <button onClick={()=>{setView("list");setError("");}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title,letterSpacing:"-0.01em"}}>Neue Gruppe</div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Gruppenname</label>
            <input value={form.name} onChange={e=>{setForm(p=>({...p,name:e.target.value}));setError("");}} placeholder="z.B. Montagabend"
              style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Oberbegriff <span style={{fontWeight:400,color:t.tick}}>(optional, zum Sortieren)</span></label>
            <input value={form.topic} onChange={e=>setForm(p=>({...p,topic:e.target.value}))} placeholder="z.B. Genuss, Freizeit, Familie"
              style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>
          </div>
          <label style={{display:"block",fontSize:12,color:t.label,marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>Was soll in dieser Gruppe bewertet werden?</label>
          <div style={{marginBottom:20}}>
            {CATEGORY_GROUPS.filter(g=>g.cats.length>0).map(grp=>(
              <div key={grp.id} style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:t.sub,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>{grp.icon} {grp.label}</div>
                {grp.cats.map(id=>{
                  const def=CATEGORY_DEFS[id];
                  const on=form.categories[id];
                  return(
                    <button key={id} onClick={()=>{setForm(p=>({...p,categories:{...p.categories,[id]:!p.categories[id]}}));setError("");}}
                      style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 16px",marginBottom:8,background:on?`${t.restNavActive}12`:t.card,borderRadius:12,border:`1.5px solid ${on?t.restNavActive:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                      <span style={{fontSize:22}}>{def.icon}</span>
                      <span style={{fontSize:14,fontWeight:on?600:400,color:t.title,flex:1}}>{def.label}</span>
                      <span style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?t.restNavActive:t.inputBorder}`,background:on?t.restNavActive:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:t.bg,fontSize:13,fontWeight:700}}>{on?"✓":""}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {error&&<div style={{color:t.danger,fontSize:12,marginBottom:12}}>{error}</div>}
          <button onClick={createGroup} disabled={saving}
            style={{width:"100%",padding:16,borderRadius:14,background:saving?"#999":t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:saving?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
            {saving?"Wird erstellt…":"Gruppe erstellen"}
          </button>
          <div style={{fontSize:12,color:t.sub,marginTop:12,textAlign:"center"}}>Du wirst automatisch Admin dieser Gruppe.</div>
        </div>
      )}
    </div>
  );
}
