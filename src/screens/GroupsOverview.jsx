import {useState} from "react";
import {db} from "../firebase.js";
import {CATEGORY_DEFS,CATEGORY_GROUPS,defaultCategories} from "../categories/index.js";
import {UserMenu} from "../components/UserMenu.jsx";
import {Page,PageHeader,PlusButton} from "../components/PageHeader.jsx";

// GRUPPEN: eigene Gruppen öffnen, neue Gruppe erstellen
export function GroupsOverview({user,groups,onOpen,onLogout,dark,setDark,t,inviteMsg}){
  const [view,setView]=useState("list");
  const [topicF,setTopicF]=useState("");
  const [sortBy,setSortBy]=useState("name");
  const [form,setForm]=useState({name:"",topic:"",categories:defaultCategories()});
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
      setForm({name:"",topic:"",categories:defaultCategories()});
      setView("list");
    }catch{setError("Fehler beim Erstellen.");}
    setSaving(false);
  };
  const sel={padding:"8px 12px",borderRadius:20,border:`1px solid ${t.filterBorder}`,background:t.filterBg,color:t.filterColor,fontSize:12.5,cursor:"pointer",outline:"none",flexShrink:0};
  return(
    <Page t={t}>
      {view==="list"&&(
        <>
          <PageHeader t={t} title="Gruppen" subtitle={my.length+" Gruppe"+(my.length!==1?"n":"")+" · wer bewertet mit wem"}
            right={<>
              <PlusButton t={t} label="Neue Gruppe erstellen" onClick={()=>setView("create")}/>
              <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
            </>}/>
          {inviteMsg&&<div style={{background:inviteMsg.startsWith("✅")?"#e7f5ee":"#fdecea",border:`1px solid ${inviteMsg.startsWith("✅")?"#bfe3cf":"#f5c6c2"}`,borderRadius:12,padding:"11px 14px",marginBottom:16,fontSize:13,color:inviteMsg.startsWith("✅")?"#1f7a4d":"#b0322a"}}>{inviteMsg}</div>}
          {topics.length>0&&(
            <div className="hscroll" style={{display:"flex",gap:8,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
              <select value={topicF} onChange={e=>setTopicF(e.target.value)} aria-label="Oberbegriff" style={{...sel,...(topicF?{background:t.restFilterOn,color:t.restFilterOnColor,border:`1px solid ${t.restFilterOn}`}:{})}}>
                <option value="">Alle Oberbegriffe</option>
                {topics.map(o=><option key={o}>{o}</option>)}
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} aria-label="Sortierung" style={sel}>
                <option value="name">Sortierung: Name</option>
                <option value="topic">Sortierung: Oberbegriff</option>
              </select>
            </div>
          )}
          {shown.length===0?(
            <div style={{textAlign:"center",padding:"50px 20px",color:t.empty}}>
              <div style={{fontSize:48}}>👥</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{my.length===0?"Noch keine Gruppen":"Keine Treffer"}</div>
              <div style={{fontSize:13,marginTop:8,color:t.sub}}>{my.length===0?"Erstelle deine erste Gruppe mit + oder lass dich von einem Admin einladen.":"Versuche einen anderen Filter."}</div>
            </div>
          ):shown.map(g=>{
            const cats=Object.keys(g.categories||{});
            const customCats=Object.values(g.custom||{});
            const isAdmin=g.members[user]==="admin";
            const n=Object.keys(g.members||{}).length;
            return(
              <button key={g.id} onClick={()=>onOpen(g)}
                style={{display:"flex",flexDirection:"column",gap:12,width:"100%",textAlign:"left",background:t.card,borderRadius:18,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,width:"100%"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:18,color:t.title}}>{g.name}</div>
                    {g.topic&&<div style={{fontSize:12.5,color:t.sub,marginTop:2}}>{g.topic}</div>}
                  </div>
                  <span style={{background:isAdmin?t.adminBadge:t.memberBadge,color:isAdmin?t.adminBadgeColor:t.memberBadgeColor,borderRadius:10,padding:"4px 10px",fontSize:11.5,fontWeight:700,flexShrink:0}}>{isAdmin?"Admin":"Mitglied"}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,width:"100%"}}>
                  <span style={{flex:1,minWidth:0,fontSize:18,letterSpacing:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cats.map(c=>CATEGORY_DEFS[c]?.icon||"").join("")}{customCats.map(c=>c.icon||"⭐").join("")}</span>
                  <span style={{fontSize:12.5,color:t.sub,flexShrink:0}}>{n} Mitglied{n!==1?"er":""}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.sub} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
                </div>
              </button>
            );
          })}
          <div style={{display:"flex",alignItems:"center",gap:12,border:`1.5px dashed ${t.cardBorder}`,borderRadius:16,padding:"14px 16px",marginTop:4}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.link} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>
            <div style={{fontSize:13,color:t.sub,lineHeight:1.4}}>Einladungslink bekommen? Einfach öffnen, dann bist du automatisch in der Gruppe.</div>
          </div>
        </>
      )}
      {view==="create"&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <button onClick={()=>{setView("list");setError("");}} aria-label="Zurück zu den Gruppen" style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub,minWidth:44,minHeight:44}}>←</button>
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
                      style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 16px",marginBottom:8,background:on?`${t.accent}14`:t.card,borderRadius:12,border:`1.5px solid ${on?t.accent:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                      <span style={{fontSize:22}}>{def.icon}</span>
                      <span style={{fontSize:14,fontWeight:on?600:400,color:t.title,flex:1}}>{def.label}</span>
                      <span style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?t.accent:t.inputBorder}`,background:on?t.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:t.onAccent,fontSize:13,fontWeight:700}}>{on?"✓":""}</span>
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
    </Page>
  );
}
