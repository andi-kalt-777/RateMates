import {useState,useEffect} from "react";
import {db} from "../firebase.js";
import {stamped,dupKey,restrictToMembers,getAvgWhisky} from "../lib/ratings.js";
import {WHISKY_TYPES,EMPTY_WHISKY,EMPTY_W_RATING,EMPTY_W_SUGG} from "../categories/index.js";
import {Slider,Stars,Badge,Toast,TypeChips,FilterBar,SwipeableSheet} from "../components/ui.jsx";
import {AppHeader} from "../components/AppHeader.jsx";

// WHISKY FÜHRER
export function WhiskyCard({w,onClick,t}){
  const avg=getAvgWhisky(w);
  const types=Array.isArray(w.types)?w.types:[];
  const raters=Object.keys(w.ratings||{});
  return(
    <div onClick={onClick} style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0,paddingRight:8}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{w.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>🥃 {w.distillery}{types.length?" · "+types.join(" & "):""}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.whiskyAccent}}>{avg.stars}</div>
          <div style={{fontSize:10,color:t.tick}}>Ø · {avg.count} Wertung{avg.count!==1?"en":""}</div>
        </div>
      </div>
      <div style={{marginTop:10}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <Badge value={avg.rauchigkeit} color="#505868"/><span style={{fontSize:11,color:t.sub}}>💨 Rauchigkeit</span>
        <Badge value={avg.fruchtigkeit} color="#c0306a"/><span style={{fontSize:11,color:t.sub}}>🍒 Fruchtigkeit</span>
      </div>
      {raters.length>0&&<div style={{textAlign:"right",marginTop:6}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>bewertet von {raters.join(", ")}</span></div>}
    </div>
  );
}
export function WhiskySuggCard({s,onClick,t}){
  const types=Array.isArray(s.types)?s.types:[];
  return(
    <div onClick={onClick} style={{background:t.suggCard,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.suggBorder}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title}}>{s.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>🥃 {s.distillery}{types.length?" · "+types.join(" & "):""}</div>
        </div>
        <span style={{background:t.suggBadgeBg,borderRadius:10,padding:"4px 10px",fontSize:11,color:t.whiskySuggAccent,fontWeight:600,flexShrink:0,marginLeft:8}}>💡 Vorschlag</span>
      </div>
      <div style={{textAlign:"right",marginTop:8}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>vorgeschlagen von {s.author}</span></div>
    </div>
  );
}
export function WhiskyModal({w,user,onClose,onDelete,onEdit,onRate,t}){
  if(!w)return null;
  const avg=getAvgWhisky(w);
  const types=Array.isArray(w.types)?w.types:[];
  const ratings=Object.entries(w.ratings||{});
  const isAuthor=user===w.author;const hasRated=!!w.ratings?.[user];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title,letterSpacing:"-0.01em"}}>{w.name}</div>
      <div style={{color:t.sub,fontSize:13,marginTop:4}}>🥃 {w.distillery}{types.length?" · "+types.join(" & "):""}</div>
      <div style={{marginTop:14}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:12,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
        <div style={{fontSize:11,color:t.sub}}>⭐ Gesamtgeschmack</div>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color:t.whiskyAccent}}>{avg.stars}/10</div>
        <div style={{fontSize:10,color:t.tick}}>Durchschnitt aus {avg.count} Wertung{avg.count!==1?"en":""}</div>
      </div>
      <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:t.sub}}>💨 Rauchigkeit</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#505868"}}>{avg.rauchigkeit}/10</div>
        </div>
        <div style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:t.sub}}>🍒 Fruchtigkeit</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#c0306a"}}>{avg.fruchtigkeit}/10</div>
        </div>
      </div>
      <div style={{marginTop:20}}>
        <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:8,fontWeight:700}}>Alle Bewertungen ({avg.count})</div>
        {ratings.map(([author,rating])=>(
          <div key={author} style={{background:t.ratingRow,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${t.ratingBorder}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:700,fontSize:13,color:t.title}}>{author}</span><span style={{fontSize:12,color:t.whiskyAccent}}>★ {rating.stars}/10</span></div>
            <div style={{display:"flex",gap:12,fontSize:12,color:t.sub}}><span>💨 {rating.rauchigkeit}/10</span><span>🍒 {rating.fruchtigkeit}/10</span></div>
            {rating.kommentar&&<div style={{marginTop:8,fontSize:12,color:t.sub,fontStyle:"italic",background:t.innerCard,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>"{rating.kommentar}"</div>}
          </div>
        ))}
      </div>
      {isAuthor&&<div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>onEdit(w)} style={{padding:"12px",borderRadius:12,background:t.innerCard,color:t.title,border:`1px solid ${t.cardBorder}`,fontSize:14,cursor:"pointer",fontWeight:600}}>✏️ Bearbeiten</button>
        <button onClick={()=>onDelete(w.id)} style={{padding:"12px",borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Löschen</button>
      </div>}
      {!isAuthor&&!hasRated&&<button onClick={()=>onRate(w)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.whiskyBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>🥃 Eigene Wertung abgeben</button>}
      {!isAuthor&&hasRated&&<button onClick={()=>onRate(w)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>✏️ Meine Wertung bearbeiten</button>}
    </SwipeableSheet>
  );
}
export function WhiskySuggModal({s,user,onClose,onDelete,onConvert,t}){
  if(!s)return null;
  const types=Array.isArray(s.types)?s.types:[];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title}}>{s.name}</div>
        <span style={{background:t.suggBadgeBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:t.whiskySuggAccent,fontWeight:600}}>💡 Vorschlag</span>
      </div>
      <div style={{color:t.sub,fontSize:13}}>🥃 {s.distillery}{types.length?" · "+types.join(" & "):""}</div>
      <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14}}>
        <div style={{fontSize:13,color:t.sub}}>Noch nicht probiert.</div>
        <div style={{fontSize:12,color:t.tick,marginTop:4,fontStyle:"italic"}}>Vorgeschlagen von {s.author}</div>
      </div>
      <button onClick={()=>onConvert(s)} style={{marginTop:16,width:"100%",padding:15,borderRadius:12,background:t.whiskyBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>🥃 Jetzt bewerten & übernehmen</button>
      {user===s.author&&<button onClick={()=>onDelete(s.id)} style={{marginTop:10,width:"100%",padding:13,borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Vorschlag löschen</button>}
    </SwipeableSheet>
  );
}
export function WhiskyRatingFields({form,setF,t}){
  return(
    <>
      <Slider label="⭐ Gesamtgeschmack" value={form.stars} min={0} max={10} onChange={v=>setF("stars",v)} color={t.whiskyAccent} t={t}/>
      <Slider label="💨 Rauchigkeit" value={form.rauchigkeit} min={0} max={10} onChange={v=>setF("rauchigkeit",v)} color="#505868" t={t}/>
      <Slider label="🍒 Fruchtigkeit" value={form.fruchtigkeit} min={0} max={10} onChange={v=>setF("fruchtigkeit",v)} color="#c0306a" t={t}/>
      <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
        <textarea value={form.kommentar||""} onChange={e=>setF("kommentar",e.target.value)} placeholder="Geschmacksnotizen, Aromen, erster Eindruck…" style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
    </>
  );
}
export function WhiskyApp({user,dark,setDark,mode,setMode,modes,t,group,members,onBack,isAdmin,onSettings,onLogout}){
  const [view,setView]=useState("list");
  const [activeSection,setSection]=useState("list");
  const [whiskies,setWhiskies]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({...EMPTY_WHISKY});
  const [ratingForm,setRatingForm]=useState({...EMPTY_W_RATING});
  const [ratingTarget,setRatingTarget]=useState(null);
  const [suggForm,setSuggForm]=useState({...EMPTY_W_SUGG});
  const [suggToConvert,setSuggToConvert]=useState(null);
  const [wFilter,setWFilter]=useState({search:"",k1:"",k2:"",author:""});
  const [sFilter,setSFilter]=useState({search:"",k1:"",k2:""});
  const [selected,setSelected]=useState(null);
  const [suggSelected,setSuggSelected]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [errors,setErrors]=useState({});
  const [suggErrors,setSuggErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  useEffect(()=>{
    let ref;try{ref=db.ref("whiskies");ref.on("value",snap=>{const d=snap.val();setWhiskies(d?Object.values(d):[]);setLoading(false);},()=>setLoading(false));}catch{setLoading(false);}
    const tm=setTimeout(()=>setLoading(false),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[]);
  useEffect(()=>{
    let ref;try{ref=db.ref("whisky_suggestions");ref.on("value",snap=>{const d=snap.val();setSuggestions(d?Object.values(d):[]);});}catch{}
    return()=>ref&&ref.off();
  },[]);
  const visible=whiskies.map(w=>restrictToMembers(w,members)).filter(w=>Object.keys(w.ratings).length>0||members.includes(w.author));
  const visibleSugg=suggestions.filter(s=>members.includes(s.author));
  const distilleries=[...new Set(visible.map(w=>(w.distillery||"").trim()).filter(Boolean))].sort();
  const allTypes=[...new Set(visible.flatMap(w=>Array.isArray(w.types)?w.types:[]))].sort();
  const allRaters=[...new Set(visible.flatMap(w=>Object.keys(w.ratings||{})))].sort();
  const filteredW=visible.filter(w=>(!wFilter.k1||w.distillery===wFilter.k1)&&(!wFilter.k2||(Array.isArray(w.types)&&w.types.includes(wFilter.k2)))&&(!wFilter.author||Object.keys(w.ratings||{}).includes(wFilter.author))&&(!wFilter.search||w.name.toLowerCase().includes(wFilter.search.toLowerCase()))).sort((a,b)=>getAvgWhisky(b).stars-getAvgWhisky(a).stars);
  const suggDist=[...new Set(visibleSugg.map(s=>(s.distillery||"").trim()).filter(Boolean))].sort();
  const suggTypes=[...new Set(visibleSugg.flatMap(s=>Array.isArray(s.types)?s.types:[]))].sort();
  const filteredS=visibleSugg.filter(s=>(!sFilter.k1||s.distillery===sFilter.k1)&&(!sFilter.k2||(Array.isArray(s.types)&&s.types.includes(sFilter.k2)))&&(!sFilter.search||s.name.toLowerCase().includes(sFilter.search.toLowerCase())));
  const valW=()=>{const e={};if(!form.name.trim())e.name="Bitte Name eingeben";if(!form.distillery.trim())e.distillery="Bitte Destillerie eingeben";if(!form.types.length)e.types="Bitte Typ auswählen";return e;};
  const valS=()=>{const e={};if(!suggForm.name.trim())e.name="Bitte Name eingeben";if(!suggForm.distillery.trim())e.distillery="Bitte Destillerie eingeben";if(!suggForm.types.length)e.types="Bitte Typ auswählen";return e;};
  const handleAdd=async()=>{const e=valW();if(Object.keys(e).length){setErrors(e);return;}
    const _key=dupKey(form.name,form.distillery);
    const _dup=whiskies.find(w=>dupKey(w.name,w.distillery)===_key);
    if(_dup){
      if(!window.confirm("„"+_dup.name+"“ gibt es hier bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?"))return;
      setSaving(true);
      try{
        await db.ref("whiskies/"+_dup.id+"/ratings/"+user).set(stamped({stars:form.stars,rauchigkeit:form.rauchigkeit,fruchtigkeit:form.fruchtigkeit,kommentar:form.kommentar}));
        if(suggToConvert){await db.ref("whisky_suggestions/"+suggToConvert.id).remove();setSuggToConvert(null);}
        setForm({...EMPTY_WHISKY});setErrors({});setView("list");setSection("list");showToast("✅ Wertung hinzugefügt!");
      }catch{showToast("⚠️ Fehler");}
      setSaving(false);return;
    }
    const _dupS=!suggToConvert&&suggestions.find(s=>dupKey(s.name,s.distillery)===_key);
    if(_dupS){
      if(!window.confirm("„"+_dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?"))return;
      try{await db.ref("whisky_suggestions/"+_dupS.id).remove();}catch{}
    }
    setSaving(true);try{const id=Date.now().toString();await db.ref("whiskies/"+id).set({id,name:form.name,distillery:form.distillery.trim(),types:form.types,author:user,ratings:{[user]:stamped({stars:form.stars,rauchigkeit:form.rauchigkeit,fruchtigkeit:form.fruchtigkeit,kommentar:form.kommentar})}});if(suggToConvert){await db.ref("whisky_suggestions/"+suggToConvert.id).remove();setSuggToConvert(null);}setForm({...EMPTY_WHISKY});setErrors({});setView("list");setSection("list");showToast("✅ Whisky gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleEdit=w=>{const my=w.ratings?.[user]||EMPTY_W_RATING;setForm({name:w.name,distillery:w.distillery,types:Array.isArray(w.types)?w.types:[],stars:my.stars,rauchigkeit:my.rauchigkeit,fruchtigkeit:my.fruchtigkeit,kommentar:my.kommentar||""});setEditingId(w.id);setSelected(null);setSuggToConvert(null);setErrors({});setView("add");setSection("list");};
  const handleUpdate=async()=>{const e=valW();if(Object.keys(e).length){setErrors(e);return;}setSaving(true);try{await db.ref("whiskies/"+editingId).update({name:form.name,distillery:form.distillery.trim(),types:form.types});await db.ref("whiskies/"+editingId+"/ratings/"+user).set(stamped({stars:form.stars,rauchigkeit:form.rauchigkeit,fruchtigkeit:form.fruchtigkeit,kommentar:form.kommentar}));setForm({...EMPTY_WHISKY});setEditingId(null);setErrors({});setView("list");setSection("list");showToast("✅ Aktualisiert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDelete=async id=>{if(!window.confirm("Diesen Eintrag wirklich löschen? Alle Bewertungen dazu gehen verloren."))return;try{await db.ref("whiskies/"+id).remove();setSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const startRate=w=>{setRatingForm(w.ratings?.[user]||{...EMPTY_W_RATING});setRatingTarget(w);setSelected(null);setView("rate");};
  const handleSaveRating=async()=>{setSaving(true);try{await db.ref("whiskies/"+ratingTarget.id+"/ratings/"+user).set(stamped(ratingForm));setView("list");setSection("list");setRatingTarget(null);showToast("✅ Wertung gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleAddSugg=async()=>{const e=valS();if(Object.keys(e).length){setSuggErrors(e);return;}
    const _key=dupKey(suggForm.name,suggForm.distillery);
    const _dupS=suggestions.find(s=>dupKey(s.name,s.distillery)===_key);
    if(_dupS){showToast("💡 Bereits vorgeschlagen von "+_dupS.author+"!");return;}
    const _dupW=whiskies.find(w=>dupKey(w.name,w.distillery)===_key);
    if(_dupW){showToast("⭐ Gibt es schon in den Bewertungen!");return;}
    setSaving(true);try{const id=Date.now().toString();await db.ref("whisky_suggestions/"+id).set({id,name:suggForm.name,distillery:suggForm.distillery.trim(),types:suggForm.types,author:user});setSuggForm({...EMPTY_W_SUGG});setSuggErrors({});setView("suggestions");setSection("suggestions");showToast("✅ Vorschlag gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDeleteSugg=async id=>{if(!window.confirm("Diesen Vorschlag wirklich löschen?"))return;try{await db.ref("whisky_suggestions/"+id).remove();setSuggSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const handleConvertSugg=s=>{setForm({name:s.name,distillery:s.distillery,types:Array.isArray(s.types)?s.types:[],stars:7,rauchigkeit:5,fruchtigkeit:5,kommentar:""});setSuggToConvert(s);setEditingId(null);setErrors({});setSuggSelected(null);setView("add");setSection("list");};
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const rf=(k,v)=>setRatingForm(p=>({...p,[k]:v}));
  const sf=(k,v)=>setSuggForm(p=>({...p,[k]:v}));
  const navTo=s=>{setSection(s);setView(s);setSelected(null);setSuggSelected(null);};
  const navAdd=()=>{if(activeSection==="list"){setForm({...EMPTY_WHISKY});setEditingId(null);setErrors({});setSuggToConvert(null);setView("add");}else{setSuggForm({...EMPTY_W_SUGG});setSuggErrors({});setView("add-suggestion");}};
  const navActive=view==="list"||view==="rate";
  const suggActive=view==="suggestions";
  const addActive=view==="add"||view==="add-suggestion";
  const navColor=t.whiskyNavActive;
  const btn={width:"100%",padding:16,borderRadius:14,background:saving?"#ccc":t.whiskyBtn,color:t.btnColor,fontSize:16,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",fontFamily:"'Space Grotesk',sans-serif",opacity:saving?0.7:1};
  if(loading)return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>🥃</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",position:"relative",paddingBottom:92,transition:"background 0.3s"}}>
      <AppHeader user={user} dark={dark} setDark={setDark} mode={mode} setMode={setMode} modes={modes} t={t} onLogout={onLogout}
        title={"🥃 Whiskys · "+group.name}
        subtitle={visible.length+" bewertet · "+visibleSugg.length+" Vorschlag"+(visibleSugg.length!==1?"e":"")}
        headerBg={t.whiskyHeaderBg} headerSub={t.whiskyHeaderSub} onBack={onBack} isAdmin={isAdmin} onSettings={onSettings}/>
      {view==="list"&&(
        <div style={{padding:"20px 16px"}}>
          <FilterBar filter={wFilter} setFilter={setWFilter} col1={distilleries} col2={allTypes} col1Label="Alle Destillerien" col2Label="Alle Typen" extra={[["author","Alle Bewerter",allRaters]]} filterOn={t.whiskyFilterOn} filterOnColor={t.whiskyFilterOnColor} t={t}/>
          {filteredW.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>🥃</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visible.length===0?"Noch keine Whiskys":"Keine Treffer"}</div></div>):filteredW.map(w=><WhiskyCard key={w.id} w={w} onClick={()=>setSelected(w)} t={t}/>)}
        </div>
      )}
      {view==="suggestions"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:4}}>💡 Whisky Vorschläge</div>
          <div style={{fontSize:13,color:t.sub,marginBottom:16}}>Whiskys die ihr noch probieren möchtet</div>
          <FilterBar filter={sFilter} setFilter={setSFilter} col1={suggDist} col2={suggTypes} col1Label="Alle Destillerien" col2Label="Alle Typen" filterOn={t.whiskyFilterOn} filterOnColor={t.whiskyFilterOnColor} t={t}/>
          {filteredS.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>💡</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visibleSugg.length===0?"Noch keine Vorschläge":"Keine Treffer"}</div></div>):filteredS.map(s=><WhiskySuggCard key={s.id} s={s} onClick={()=>setSuggSelected(s)} t={t}/>)}
        </div>
      )}
      {view==="add"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
            <button onClick={()=>{setView(editingId?"list":activeSection);setForm({...EMPTY_WHISKY});setEditingId(null);setSuggToConvert(null);setErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub,paddingTop:2}}>←</button>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>{editingId?"Bearbeiten":suggToConvert?"Jetzt bewerten":"Whisky hinzufügen"}</div>{suggToConvert&&<div style={{fontSize:12,color:t.whiskySuggAccent,marginTop:3}}>💡 Aus Vorschlägen übernommen</div>}</div>
          </div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Whisky Name</label><input value={form.name} onChange={e=>{f("name",e.target.value);setErrors(p=>({...p,name:""}))}} placeholder="z.B. Laphroaig 10 Jahre" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{errors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Destillerie / Herkunft</label><input value={form.distillery} onChange={e=>{f("distillery",e.target.value);setErrors(p=>({...p,distillery:""}))}} placeholder="z.B. Laphroaig, Islay" list="w-dist" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.distillery?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="w-dist">{distilleries.map(d=><option key={d} value={d}/>)}</datalist>{errors.distillery&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.distillery}</div>}</div>
          <div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Whisky Typ <span style={{fontWeight:400,color:form.types.length===3?t.danger:t.tick}}>({form.types.length}/3)</span></label><TypeChips value={form.types} onChange={v=>{f("types",v);setErrors(p=>({...p,types:""}));}} options={WHISKY_TYPES} chipOn={t.whiskyChipOn} chipOnColor={t.whiskyChipOnColor} t={t}/>{errors.types&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.types}</div>}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,fontWeight:700}}>Deine Bewertung</div>
            <WhiskyRatingFields form={form} setF={f} t={t}/>
          </div>
          <button onClick={editingId?handleUpdate:handleAdd} disabled={saving} style={btn}>{saving?"Speichert…":editingId?"Änderungen speichern":suggToConvert?"Bewertung speichern":"Whisky speichern"}</button>
        </div>
      )}
      {view==="add-suggestion"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><button onClick={()=>{setView("suggestions");setSuggForm({...EMPTY_W_SUGG});setSuggErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>Whisky Vorschlag</div></div>
          <div style={{background:t.suggBadgeBg,borderRadius:12,padding:"10px 14px",marginBottom:20,border:`1px solid ${t.suggBorder}`}}><div style={{fontSize:12,color:t.whiskySuggAccent}}>💡 Noch nicht probiert — als Idee für den nächsten Abend.</div></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Whisky Name</label><input value={suggForm.name} onChange={e=>{sf("name",e.target.value);setSuggErrors(p=>({...p,name:""}))}} placeholder="z.B. Laphroaig 10 Jahre" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{suggErrors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Destillerie / Herkunft</label><input value={suggForm.distillery} onChange={e=>{sf("distillery",e.target.value);setSuggErrors(p=>({...p,distillery:""}))}} placeholder="z.B. Laphroaig, Islay" list="ws-dist" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.distillery?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="ws-dist">{[...new Set([...distilleries,...suggDist])].map(d=><option key={d} value={d}/>)}</datalist>{suggErrors.distillery&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.distillery}</div>}</div>
          <div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Whisky Typ <span style={{fontWeight:400,color:suggForm.types.length===3?t.danger:t.tick}}>({suggForm.types.length}/3)</span></label><TypeChips value={suggForm.types} onChange={v=>{sf("types",v);setSuggErrors(p=>({...p,types:""}));}} options={WHISKY_TYPES} chipOn={t.whiskyChipOn} chipOnColor={t.whiskyChipOnColor} t={t}/>{suggErrors.types&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.types}</div>}</div>
          <button onClick={handleAddSugg} disabled={saving} style={btn}>{saving?"Speichert…":"Vorschlag speichern"}</button>
        </div>
      )}
      {view==="rate"&&ratingTarget&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><button onClick={()=>{setView("list");setSection("list");setRatingTarget(null);}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title}}>Wertung abgeben</div></div>
          <div style={{fontSize:13,color:t.sub,marginBottom:20,paddingLeft:36}}>{ratingTarget.name} · {ratingTarget.distillery}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}><WhiskyRatingFields form={ratingForm} setF={rf} t={t}/></div>
          <button onClick={handleSaveRating} disabled={saving} style={btn}>{saving?"Speichert…":"Wertung speichern"}</button>
        </div>
      )}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:t.navBg,borderTop:`1px solid ${t.navBorder}`,display:"flex",boxShadow:`0 -4px 20px ${t.navShadow}`,transition:"background 0.3s"}}>
        {[["list",navActive,()=>navTo("list"),"🥃","Whisky\nÜbersicht"],["sugg",suggActive,()=>navTo("suggestions"),"💡","Whisky\nVorschläge"],["add-btn",addActive,navAdd,"➕","Hinzufügen"]].map(([key,active,onClick,icon,label])=>(
          <button key={key} onClick={onClick} style={{flex:1,padding:"11px 4px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:9,color:active?navColor:t.navInactive,fontWeight:active?700:400,textAlign:"center",lineHeight:1.25,whiteSpace:"pre-line"}}>{label}</span>
            {active&&<div style={{width:20,height:2,background:navColor,borderRadius:1,marginTop:1}}/>}
          </button>
        ))}
      </div>
      <WhiskyModal w={selected} user={user} onClose={()=>setSelected(null)} onDelete={handleDelete} onEdit={handleEdit} onRate={startRate} t={t}/>
      <WhiskySuggModal s={suggSelected} user={user} onClose={()=>setSuggSelected(null)} onDelete={handleDeleteSugg} onConvert={handleConvertSugg} t={t}/>
      <Toast msg={toast} color={t.whiskyToast} textColor={t.toastColor}/>
    </div>
  );
}
