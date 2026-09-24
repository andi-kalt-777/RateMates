import {useState,useEffect} from "react";
import {db} from "../firebase.js";
import {stamped,dupKey,restrictToMembers,getAvgMedia} from "../lib/ratings.js";
import {EMPTY_MEDIA,EMPTY_MEDIA_RATING,EMPTY_MEDIA_SUGG} from "../categories.js";
import {GLASS_MODE,GOLD_MODE} from "../theme.js";
import {Slider,Stars,Badge,Toast,TypeChips,FilterBar,SwipeableSheet} from "../components/ui.jsx";
import {AppHeader} from "../components/AppHeader.jsx";

// MEDIA (FILME / SERIEN / EIGENE KATEGORIEN)
export function MediaCard({item,onClick,t,mc,config}){
  const avg=getAvgMedia(item);
  const genres=Array.isArray(item.genres)?item.genres:[];
  const raters=Object.keys(item.ratings||{});
  return(
    <div onClick={onClick} style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0,paddingRight:8}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{item.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>{item[config.field1Key]||item.field1||""}{genres.length?" · "+genres.join(" & "):""}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:mc.accent}}>{avg.stars}</div>
          <div style={{fontSize:10,color:t.tick}}>Ø · {avg.count} Wertung{avg.count!==1?"en":""}</div>
        </div>
      </div>
      <div style={{marginTop:10}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <Badge value={avg.handlung} color="#2e7d52"/><span style={{fontSize:11,color:t.sub}}>{config.crit1Short}</span>
        <Badge value={avg.spannung} color="#7b3f9e"/><span style={{fontSize:11,color:t.sub}}>{config.crit2Short}</span>
      </div>
      {raters.length>0&&<div style={{textAlign:"right",marginTop:6}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>bewertet von {raters.join(", ")}</span></div>}
    </div>
  );
}
export function MediaSuggCard({s,onClick,t,mc,config}){
  const genres=Array.isArray(s.genres)?s.genres:[];
  return(
    <div onClick={onClick} style={{background:t.suggCard,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.suggBorder}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title}}>{s.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>{s[config.field1Key]||s.field1||""}{genres.length?" · "+genres.join(" & "):""}</div>
        </div>
        <span style={{background:t.suggBadgeBg,borderRadius:10,padding:"4px 10px",fontSize:11,color:mc.suggAccent,fontWeight:600,flexShrink:0,marginLeft:8}}>💡 Vorschlag</span>
      </div>
      <div style={{textAlign:"right",marginTop:8}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>vorgeschlagen von {s.author}</span></div>
    </div>
  );
}
export function MediaModal({item,user,onClose,onDelete,onEdit,onRate,t,mc,config}){
  if(!item)return null;
  const avg=getAvgMedia(item);
  const genres=Array.isArray(item.genres)?item.genres:[];
  const ratings=Object.entries(item.ratings||{});
  const isAuthor=user===item.author;const hasRated=!!item.ratings?.[user];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title,letterSpacing:"-0.01em"}}>{item.name}</div>
      <div style={{color:t.sub,fontSize:13,marginTop:4}}>{item[config.field1Key]||item.field1||""}{genres.length?" · "+genres.join(" & "):""}</div>
      <div style={{marginTop:14}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:12,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
        <div style={{fontSize:11,color:t.sub}}>{config.starsLabel||"⭐ Gesamtwertung"}</div>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color:mc.accent}}>{avg.stars}/10</div>
        <div style={{fontSize:10,color:t.tick}}>Durchschnitt aus {avg.count} Wertung{avg.count!==1?"en":""}</div>
      </div>
      <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:t.sub}}>{config.crit1Label}</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#2e7d52"}}>{avg.handlung}/10</div>
        </div>
        <div style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:t.sub}}>{config.crit2Label}</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#7b3f9e"}}>{avg.spannung}/10</div>
        </div>
      </div>
      <div style={{marginTop:20}}>
        <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:8,fontWeight:700}}>Alle Bewertungen ({avg.count})</div>
        {ratings.map(([author,rating])=>(
          <div key={author} style={{background:t.ratingRow,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${t.ratingBorder}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:700,fontSize:13,color:t.title}}>{author}</span><span style={{fontSize:12,color:mc.accent}}>★ {rating.stars}/10</span></div>
            <div style={{display:"flex",gap:12,fontSize:12,color:t.sub}}><span>{config.crit1Short} {rating.handlung}/10</span><span>{config.crit2Short} {rating.spannung}/10</span></div>
            {rating.kommentar&&<div style={{marginTop:8,fontSize:12,color:t.sub,fontStyle:"italic",background:t.innerCard,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>"{rating.kommentar}"</div>}
          </div>
        ))}
      </div>
      {isAuthor&&<div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>onEdit(item)} style={{padding:"12px",borderRadius:12,background:t.innerCard,color:t.title,border:`1px solid ${t.cardBorder}`,fontSize:14,cursor:"pointer",fontWeight:600}}>✏️ Bearbeiten</button>
        <button onClick={()=>onDelete(item.id)} style={{padding:"12px",borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Löschen</button>
      </div>}
      {!isAuthor&&!hasRated&&<button onClick={()=>onRate(item)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:mc.btn,color:mc.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>⭐ Eigene Wertung abgeben</button>}
      {!isAuthor&&hasRated&&<button onClick={()=>onRate(item)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>✏️ Meine Wertung bearbeiten</button>}
    </SwipeableSheet>
  );
}
export function MediaSuggModal({s,user,onClose,onDelete,onConvert,t,mc,config}){
  if(!s)return null;
  const genres=Array.isArray(s.genres)?s.genres:[];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title}}>{s.name}</div>
        <span style={{background:t.suggBadgeBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:mc.suggAccent,fontWeight:600}}>💡 Vorschlag</span>
      </div>
      <div style={{color:t.sub,fontSize:13}}>{s[config.field1Key]||s.field1||""}{genres.length?" · "+genres.join(" & "):""}</div>
      <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14}}>
        <div style={{fontSize:13,color:t.sub}}>Noch nicht gesehen.</div>
        <div style={{fontSize:12,color:t.tick,marginTop:4,fontStyle:"italic"}}>Vorgeschlagen von {s.author}</div>
      </div>
      <button onClick={()=>onConvert(s)} style={{marginTop:16,width:"100%",padding:15,borderRadius:12,background:mc.btn,color:mc.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>⭐ Jetzt bewerten & übernehmen</button>
      {user===s.author&&<button onClick={()=>onDelete(s.id)} style={{marginTop:10,width:"100%",padding:13,borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Vorschlag löschen</button>}
    </SwipeableSheet>
  );
}
export function MediaRatingFields({form,setF,accent,config,t}){
  return(
    <>
      <Slider label={config.starsLabel||"⭐ Gesamtwertung"} value={form.stars} min={0} max={10} onChange={v=>setF("stars",v)} color={accent} t={t}/>
      <Slider label={config.crit1Label} value={form.handlung} min={0} max={10} onChange={v=>setF("handlung",v)} color="#2e7d52" t={t}/>
      <Slider label={config.crit2Label} value={form.spannung} min={0} max={10} onChange={v=>setF("spannung",v)} color="#7b3f9e" t={t}/>
      <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
        <textarea value={form.kommentar||""} onChange={e=>setF("kommentar",e.target.value)} placeholder="Meinung, Highlights, Empfehlung…" style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
    </>
  );
}
export function MediaApp({user,dark,setDark,mode,setMode,modes,t,group,members,onBack,isAdmin,onSettings,config,onLogout}){
  const mc=dark?GOLD_MODE:GLASS_MODE;
  const [view,setView]=useState("list");
  const [activeSection,setSection]=useState("list");
  const [items,setItems]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({...EMPTY_MEDIA});
  const [ratingForm,setRatingForm]=useState({...EMPTY_MEDIA_RATING});
  const [ratingTarget,setRatingTarget]=useState(null);
  const [suggForm,setSuggForm]=useState({...EMPTY_MEDIA_SUGG});
  const [suggToConvert,setSuggToConvert]=useState(null);
  const [mFilter,setMFilter]=useState({search:"",k1:"",k2:"",author:""});
  const [sFilter,setSFilter]=useState({search:"",k1:"",k2:""});
  const [selected,setSelected]=useState(null);
  const [suggSelected,setSuggSelected]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [errors,setErrors]=useState({});
  const [suggErrors,setSuggErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  const fk=config.field1Key;
  useEffect(()=>{
    let ref;try{ref=db.ref(config.fbBase);ref.on("value",snap=>{const d=snap.val();setItems(d?Object.values(d):[]);setLoading(false);},()=>setLoading(false));}catch{setLoading(false);}
    const tm=setTimeout(()=>setLoading(false),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[config.fbBase]);
  useEffect(()=>{
    let ref;try{ref=db.ref(config.fbSugg);ref.on("value",snap=>{const d=snap.val();setSuggestions(d?Object.values(d):[]);});}catch{}
    return()=>ref&&ref.off();
  },[config.fbSugg]);
  const getField1=x=>x[fk]||x.field1||"";
  const visible=items.map(x=>restrictToMembers(x,members)).filter(x=>Object.keys(x.ratings).length>0||members.includes(x.author));
  const visibleSugg=suggestions.filter(s=>members.includes(s.author));
  const field1Vals=[...new Set(visible.map(x=>getField1(x).trim()).filter(Boolean))].sort();
  const allGenres=[...new Set(visible.flatMap(x=>Array.isArray(x.genres)?x.genres:[]))].sort();
  const allRaters=[...new Set(visible.flatMap(x=>Object.keys(x.ratings||{})))].sort();
  const filteredM=visible.filter(x=>(!mFilter.k1||getField1(x)===mFilter.k1)&&(!mFilter.k2||(Array.isArray(x.genres)&&x.genres.includes(mFilter.k2)))&&(!mFilter.author||Object.keys(x.ratings||{}).includes(mFilter.author))&&(!mFilter.search||x.name.toLowerCase().includes(mFilter.search.toLowerCase()))).sort((a,b)=>getAvgMedia(b).stars-getAvgMedia(a).stars);
  const suggField1=[...new Set(visibleSugg.map(s=>getField1(s).trim()).filter(Boolean))].sort();
  const suggGenres=[...new Set(visibleSugg.flatMap(s=>Array.isArray(s.genres)?s.genres:[]))].sort();
  const filteredS=visibleSugg.filter(s=>(!sFilter.k1||getField1(s)===sFilter.k1)&&(!sFilter.k2||(Array.isArray(s.genres)&&s.genres.includes(sFilter.k2)))&&(!sFilter.search||s.name.toLowerCase().includes(sFilter.search.toLowerCase())));
  const hasGenres=!!config.genreOptions;
  const valM=()=>{const e={};if(!form.name.trim())e.name="Bitte Name eingeben";if(hasGenres&&!form.genres.length)e.genres="Bitte Genre auswählen";return e;};
  const valS=()=>{const e={};if(!suggForm.name.trim())e.name="Bitte Name eingeben";if(hasGenres&&!suggForm.genres.length)e.genres="Bitte Genre auswählen";return e;};
  const handleAdd=async()=>{const e=valM();if(Object.keys(e).length){setErrors(e);return;}
    const _f1=i=>i.field1!==undefined&&i.field1!==null?i.field1:(i[fk]||"");
    const _key=dupKey(form.name,form.field1);
    const _dup=items.find(i=>dupKey(i.name,_f1(i))===_key);
    if(_dup){
      if(!window.confirm("„"+_dup.name+"“ gibt es hier bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?"))return;
      setSaving(true);
      try{
        await db.ref(config.fbBase+"/"+_dup.id+"/ratings/"+user).set(stamped({stars:form.stars,handlung:form.handlung,spannung:form.spannung,kommentar:form.kommentar}));
        if(suggToConvert){await db.ref(config.fbSugg+"/"+suggToConvert.id).remove();setSuggToConvert(null);}
        setForm({...EMPTY_MEDIA});setErrors({});setView("list");setSection("list");showToast("✅ Wertung hinzugefügt!");
      }catch{showToast("⚠️ Fehler");}
      setSaving(false);return;
    }
    const _dupS=!suggToConvert&&suggestions.find(s=>dupKey(s.name,_f1(s))===_key);
    if(_dupS){
      if(!window.confirm("„"+_dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?"))return;
      try{await db.ref(config.fbSugg+"/"+_dupS.id).remove();}catch{}
    }
    setSaving(true);try{const id=Date.now().toString();await db.ref(config.fbBase+"/"+id).set({id,name:form.name,[fk]:form.field1.trim(),field1:form.field1.trim(),genres:form.genres,author:user,ratings:{[user]:stamped({stars:form.stars,handlung:form.handlung,spannung:form.spannung,kommentar:form.kommentar})}});if(suggToConvert){await db.ref(config.fbSugg+"/"+suggToConvert.id).remove();setSuggToConvert(null);}setForm({...EMPTY_MEDIA});setErrors({});setView("list");setSection("list");showToast(config.saveToast);}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleEdit=x=>{const my=x.ratings?.[user]||EMPTY_MEDIA_RATING;setForm({name:x.name,field1:getField1(x),genres:Array.isArray(x.genres)?x.genres:[],stars:my.stars,handlung:my.handlung,spannung:my.spannung,kommentar:my.kommentar||""});setEditingId(x.id);setSelected(null);setSuggToConvert(null);setErrors({});setView("add");setSection("list");};
  const handleUpdate=async()=>{const e=valM();if(Object.keys(e).length){setErrors(e);return;}setSaving(true);try{await db.ref(config.fbBase+"/"+editingId).update({name:form.name,[fk]:form.field1.trim(),field1:form.field1.trim(),genres:form.genres});await db.ref(config.fbBase+"/"+editingId+"/ratings/"+user).set(stamped({stars:form.stars,handlung:form.handlung,spannung:form.spannung,kommentar:form.kommentar}));setForm({...EMPTY_MEDIA});setEditingId(null);setErrors({});setView("list");setSection("list");showToast("✅ Aktualisiert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDelete=async id=>{if(!window.confirm("Diesen Eintrag wirklich löschen? Alle Bewertungen dazu gehen verloren."))return;try{await db.ref(config.fbBase+"/"+id).remove();setSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const startRate=x=>{setRatingForm(x.ratings?.[user]||{...EMPTY_MEDIA_RATING});setRatingTarget(x);setSelected(null);setView("rate");};
  const handleSaveRating=async()=>{setSaving(true);try{await db.ref(config.fbBase+"/"+ratingTarget.id+"/ratings/"+user).set(stamped(ratingForm));setView("list");setSection("list");setRatingTarget(null);showToast("✅ Wertung gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleAddSugg=async()=>{const e=valS();if(Object.keys(e).length){setSuggErrors(e);return;}
    const _f1=i=>i.field1!==undefined&&i.field1!==null?i.field1:(i[fk]||"");
    const _key=dupKey(suggForm.name,suggForm.field1);
    const _dupS=suggestions.find(s=>dupKey(s.name,_f1(s))===_key);
    if(_dupS){showToast("💡 Bereits vorgeschlagen von "+_dupS.author+"!");return;}
    const _dupI=items.find(i=>dupKey(i.name,_f1(i))===_key);
    if(_dupI){showToast("⭐ Gibt es schon in den Bewertungen!");return;}
    setSaving(true);try{const id=Date.now().toString();await db.ref(config.fbSugg+"/"+id).set({id,name:suggForm.name,[fk]:suggForm.field1.trim(),field1:suggForm.field1.trim(),genres:suggForm.genres,author:user});setSuggForm({...EMPTY_MEDIA_SUGG});setSuggErrors({});setView("suggestions");setSection("suggestions");showToast("✅ Vorschlag gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDeleteSugg=async id=>{if(!window.confirm("Diesen Vorschlag wirklich löschen?"))return;try{await db.ref(config.fbSugg+"/"+id).remove();setSuggSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const handleConvertSugg=s=>{setForm({name:s.name,field1:getField1(s),genres:Array.isArray(s.genres)?s.genres:[],stars:7,handlung:5,spannung:5,kommentar:""});setSuggToConvert(s);setEditingId(null);setErrors({});setSuggSelected(null);setView("add");setSection("list");};
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const rf=(k,v)=>setRatingForm(p=>({...p,[k]:v}));
  const sf=(k,v)=>setSuggForm(p=>({...p,[k]:v}));
  const navTo=s=>{setSection(s);setView(s);setSelected(null);setSuggSelected(null);};
  const navAdd=()=>{if(activeSection==="list"){setForm({...EMPTY_MEDIA});setEditingId(null);setErrors({});setSuggToConvert(null);setView("add");}else{setSuggForm({...EMPTY_MEDIA_SUGG});setSuggErrors({});setView("add-suggestion");}};
  const navActive=view==="list"||view==="rate";
  const suggActive=view==="suggestions";
  const addActive=view==="add"||view==="add-suggestion";
  const btn={width:"100%",padding:16,borderRadius:14,background:saving?"#ccc":mc.btn,color:mc.btnColor,fontSize:16,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",fontFamily:"'Space Grotesk',sans-serif",opacity:saving?0.7:1};
  if(loading)return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>{config.icon}</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",position:"relative",paddingBottom:92,transition:"background 0.3s"}}>
      <AppHeader user={user} dark={dark} setDark={setDark} mode={mode} setMode={setMode} modes={modes} t={t} onLogout={onLogout}
        title={config.icon+" "+config.label.replace(" Führer","")+" · "+group.name}
        subtitle={visible.length+" bewertet · "+visibleSugg.length+" Vorschlag"+(visibleSugg.length!==1?"e":"")}
        headerBg={mc.headerBg} headerSub={mc.headerSub} onBack={onBack} isAdmin={isAdmin} onSettings={onSettings}/>
      {view==="list"&&(
        <div style={{padding:"20px 16px"}}>
          <FilterBar filter={mFilter} setFilter={setMFilter} col1={field1Vals} col2={hasGenres?allGenres:[]} col1Label={config.field1FilterLabel} col2Label={config.typeFilterLabel} extra={[["author","Alle Bewerter",allRaters]]} filterOn={mc.filterOn} filterOnColor={mc.filterOnColor} t={t}/>
          {filteredM.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>{config.emptyIcon}</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visible.length===0?config.emptyText:"Keine Treffer"}</div></div>):filteredM.map(x=><MediaCard key={x.id} item={x} onClick={()=>setSelected(x)} t={t} mc={mc} config={config}/>)}
        </div>
      )}
      {view==="suggestions"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:4}}>💡 {config.suggListTitle}</div>
          <div style={{fontSize:13,color:t.sub,marginBottom:16}}>{config.suggHint}</div>
          <FilterBar filter={sFilter} setFilter={setSFilter} col1={suggField1} col2={hasGenres?suggGenres:[]} col1Label={config.field1FilterLabel} col2Label={config.typeFilterLabel} filterOn={mc.filterOn} filterOnColor={mc.filterOnColor} t={t}/>
          {filteredS.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>💡</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visibleSugg.length===0?config.emptySuggText:"Keine Treffer"}</div></div>):filteredS.map(s=><MediaSuggCard key={s.id} s={s} onClick={()=>setSuggSelected(s)} t={t} mc={mc} config={config}/>)}
        </div>
      )}
      {view==="add"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
            <button onClick={()=>{setView(editingId?"list":activeSection);setForm({...EMPTY_MEDIA});setEditingId(null);setSuggToConvert(null);setErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub,paddingTop:2}}>←</button>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>{editingId?"Bearbeiten":suggToConvert?"Jetzt bewerten":config.addTitle}</div>{suggToConvert&&<div style={{fontSize:12,color:mc.suggAccent,marginTop:3}}>💡 Aus Vorschlägen übernommen</div>}</div>
          </div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Name</label><input value={form.name} onChange={e=>{f("name",e.target.value);setErrors(p=>({...p,name:""}))}} placeholder={config.namePlaceholder} style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{errors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>{config.field1Label}</label><input value={form.field1} onChange={e=>f("field1",e.target.value)} placeholder={config.field1Placeholder} list="m-field1" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="m-field1">{field1Vals.map(d=><option key={d} value={d}/>)}</datalist></div>
          {hasGenres&&<div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Genre <span style={{fontWeight:400,color:form.genres.length===3?t.danger:t.tick}}>({form.genres.length}/3)</span></label><TypeChips value={form.genres} onChange={v=>{f("genres",v);setErrors(p=>({...p,genres:""}));}} options={config.genreOptions} chipOn={mc.chipOn} chipOnColor={mc.chipOnColor} t={t}/>{errors.genres&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.genres}</div>}</div>}
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,fontWeight:700}}>Deine Bewertung</div>
            <MediaRatingFields form={form} setF={f} accent={mc.accent} config={config} t={t}/>
          </div>
          <button onClick={editingId?handleUpdate:handleAdd} disabled={saving} style={btn}>{saving?"Speichert…":editingId?"Änderungen speichern":suggToConvert?"Bewertung speichern":"Speichern"}</button>
        </div>
      )}
      {view==="add-suggestion"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><button onClick={()=>{setView("suggestions");setSuggForm({...EMPTY_MEDIA_SUGG});setSuggErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>{config.addSuggTitle}</div></div>
          <div style={{background:t.suggBadgeBg,borderRadius:12,padding:"10px 14px",marginBottom:20,border:`1px solid ${t.suggBorder}`}}><div style={{fontSize:12,color:mc.suggAccent}}>{config.suggHint}</div></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Name</label><input value={suggForm.name} onChange={e=>{sf("name",e.target.value);setSuggErrors(p=>({...p,name:""}))}} placeholder={config.namePlaceholder} style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{suggErrors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>{config.field1Label}</label><input value={suggForm.field1} onChange={e=>sf("field1",e.target.value)} placeholder={config.field1Placeholder} list="ms-field1" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="ms-field1">{[...new Set([...field1Vals,...suggField1])].map(d=><option key={d} value={d}/>)}</datalist></div>
          {hasGenres&&<div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Genre <span style={{fontWeight:400,color:suggForm.genres.length===3?t.danger:t.tick}}>({suggForm.genres.length}/3)</span></label><TypeChips value={suggForm.genres} onChange={v=>{sf("genres",v);setSuggErrors(p=>({...p,genres:""}));}} options={config.genreOptions} chipOn={mc.chipOn} chipOnColor={mc.chipOnColor} t={t}/>{suggErrors.genres&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.genres}</div>}</div>}
          <button onClick={handleAddSugg} disabled={saving} style={btn}>{saving?"Speichert…":"Vorschlag speichern"}</button>
        </div>
      )}
      {view==="rate"&&ratingTarget&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><button onClick={()=>{setView("list");setSection("list");setRatingTarget(null);}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title}}>Wertung abgeben</div></div>
          <div style={{fontSize:13,color:t.sub,marginBottom:20,paddingLeft:36}}>{ratingTarget.name}{getField1(ratingTarget)?" · "+getField1(ratingTarget):""}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}><MediaRatingFields form={ratingForm} setF={rf} accent={mc.accent} config={config} t={t}/></div>
          <button onClick={handleSaveRating} disabled={saving} style={btn}>{saving?"Speichert…":"Wertung speichern"}</button>
        </div>
      )}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:t.navBg,borderTop:`1px solid ${t.navBorder}`,display:"flex",boxShadow:`0 -4px 20px ${t.navShadow}`,transition:"background 0.3s"}}>
        {[["list",navActive,()=>navTo("list"),config.icon,config.listLabel+"\nÜbersicht"],["sugg",suggActive,()=>navTo("suggestions"),"💡",config.listLabel+"\nVorschläge"],["add-btn",addActive,navAdd,"➕","Hinzufügen"]].map(([key,active,onClick,icon,label])=>(
          <button key={key} onClick={onClick} style={{flex:1,padding:"11px 4px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:9,color:active?mc.navActive:t.navInactive,fontWeight:active?700:400,textAlign:"center",lineHeight:1.25,whiteSpace:"pre-line"}}>{label}</span>
            {active&&<div style={{width:20,height:2,background:mc.navActive,borderRadius:1,marginTop:1}}/>}
          </button>
        ))}
      </div>
      <MediaModal item={selected} user={user} onClose={()=>setSelected(null)} onDelete={handleDelete} onEdit={handleEdit} onRate={startRate} t={t} mc={mc} config={config}/>
      <MediaSuggModal s={suggSelected} user={user} onClose={()=>setSuggSelected(null)} onDelete={handleDeleteSugg} onConvert={handleConvertSugg} t={t} mc={mc} config={config}/>
      <Toast msg={toast} color={mc.toast} textColor={mc.toastColor}/>
    </div>
  );
}
