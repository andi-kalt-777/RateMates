import {useState,useEffect} from "react";
import {db} from "../firebase.js";
import {stamped,normalizeRest,dupKey,restrictToMembers,getAvgRest} from "../lib/ratings.js";
import {CUISINES,PRICE_LABELS,EMPTY_REST,EMPTY_RATING,EMPTY_SUGG} from "../categories.js";
import {Slider,Stars,Badge,Toast,TypeChips,FilterBar,SwipeableSheet} from "../components/ui.jsx";
import {AppHeader} from "../components/AppHeader.jsx";

// RESTAURANT FÜHRER
export function RestCard({r,onClick,t}){
  const avg=getAvgRest(r);
  const cuisines=Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[]);
  const raters=Object.keys(r.ratings||{});
  return(
    <div onClick={onClick} style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0,paddingRight:8}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{r.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>📍 {r.city} · {cuisines.join(" & ")}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.restAccent}}>{avg.avg}</div>
          <div style={{fontSize:10,color:t.tick}}>Ø · {avg.count} Wertung{avg.count!==1?"en":""}</div>
        </div>
      </div>
      <div style={{marginTop:10}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <Badge value={avg.food} color="#2e7d52"/><span style={{fontSize:11,color:t.sub}}>Essen</span>
        <Badge value={avg.service} color="#1a5f8c"/><span style={{fontSize:11,color:t.sub}}>Service</span>
        <span style={{marginLeft:"auto",fontSize:13,color:t.sub}}>{"€".repeat(avg.price)}</span>
      </div>
      {raters.length>0&&<div style={{textAlign:"right",marginTop:6}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>bewertet von {raters.join(", ")}</span></div>}
    </div>
  );
}
export function RestSuggCard({s,onClick,t}){
  const cuisines=Array.isArray(s.cuisines)?s.cuisines:[];
  return(
    <div onClick={onClick} style={{background:t.suggCard,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.suggBorder}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title}}>{s.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>📍 {s.city}{cuisines.length?" · "+cuisines.join(" & "):""}</div>
        </div>
        <span style={{background:t.suggBadgeBg,borderRadius:10,padding:"4px 10px",fontSize:11,color:t.restSuggAccent,fontWeight:600,flexShrink:0,marginLeft:8}}>💡 Vorschlag</span>
      </div>
      <div style={{textAlign:"right",marginTop:8}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>vorgeschlagen von {s.author}</span></div>
    </div>
  );
}
export function RestModal({r,user,onClose,onDelete,onEdit,onRate,t}){
  if(!r)return null;
  const avg=getAvgRest(r);
  const cuisines=Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[]);
  const ratings=Object.entries(r.ratings||{});
  const isAuthor=user===r.author;const hasRated=!!r.ratings?.[user];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title,letterSpacing:"-0.01em"}}>{r.name}</div>
      <div style={{color:t.sub,fontSize:13,marginTop:4}}>📍 {r.city} · {cuisines.join(" & ")}</div>
      <div style={{marginTop:14}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[["🍽️ Essen",avg.food,"#2e7d52"],["🤝 Service",avg.service,"#1a5f8c"]].map(([lbl,val,col])=>(
          <div key={lbl} style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:11,color:t.sub}}>{lbl}</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:col}}>{val}/10</div>
            <div style={{fontSize:10,color:t.tick}}>Durchschnitt</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
        <span style={{fontSize:12,color:t.sub}}>Preis: </span>
        <span style={{fontWeight:700,color:t.restAccent}}>{"€".repeat(avg.price)} · {PRICE_LABELS[avg.price]}</span>
      </div>
      <div style={{marginTop:20}}>
        <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:8,fontWeight:700}}>Alle Bewertungen ({avg.count})</div>
        {ratings.map(([author,rating])=>(
          <div key={author} style={{background:t.ratingRow,borderRadius:10,padding:"10px 14px",marginBottom:6,border:`1px solid ${t.ratingBorder}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:13,color:t.title}}>{author}</span><span style={{fontSize:12,color:t.sub}}>★ {rating.stars}/10</span></div>
            <div style={{display:"flex",gap:12,marginTop:4,fontSize:12,color:t.sub}}><span>🍽️ {rating.food}/10</span><span>🤝 {rating.service}/10</span><span>{"€".repeat(rating.price)}</span></div>
            {rating.kommentar&&<div style={{marginTop:8,fontSize:12,color:t.sub,fontStyle:"italic",background:t.innerCard,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>"{rating.kommentar}"</div>}
          </div>
        ))}
      </div>
      {isAuthor&&<div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>onEdit(r)} style={{padding:"12px",borderRadius:12,background:t.innerCard,color:t.title,border:`1px solid ${t.cardBorder}`,fontSize:14,cursor:"pointer",fontWeight:600}}>✏️ Bearbeiten</button>
        <button onClick={()=>onDelete(r.id)} style={{padding:"12px",borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Löschen</button>
      </div>}
      {!isAuthor&&!hasRated&&<button onClick={()=>onRate(r)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>⭐ Eigene Wertung abgeben</button>}
      {!isAuthor&&hasRated&&<button onClick={()=>onRate(r)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>✏️ Meine Wertung bearbeiten</button>}
    </SwipeableSheet>
  );
}
export function RestSuggModal({s,user,onClose,onDelete,onConvert,t}){
  if(!s)return null;
  const cuisines=Array.isArray(s.cuisines)?s.cuisines:[];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title}}>{s.name}</div>
        <span style={{background:t.suggBadgeBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:t.restSuggAccent,fontWeight:600}}>💡 Vorschlag</span>
      </div>
      <div style={{color:t.sub,fontSize:13}}>📍 {s.city}{cuisines.length?" · "+cuisines.join(" & "):""}</div>
      <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14}}>
        <div style={{fontSize:13,color:t.sub}}>Noch nicht besucht.</div>
        <div style={{fontSize:12,color:t.tick,marginTop:4,fontStyle:"italic"}}>Vorgeschlagen von {s.author}</div>
      </div>
      <button onClick={()=>onConvert(s)} style={{marginTop:16,width:"100%",padding:15,borderRadius:12,background:t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>⭐ Jetzt bewerten & übernehmen</button>
      {user===s.author&&<button onClick={()=>onDelete(s.id)} style={{marginTop:10,width:"100%",padding:13,borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Vorschlag löschen</button>}
    </SwipeableSheet>
  );
}
export function RestaurantApp({user,dark,setDark,mode,setMode,modes,t,group,members,onBack,isAdmin,onSettings,onLogout}){
  const [view,setView]=useState("list");
  const [activeSection,setSection]=useState("list");
  const [restaurants,setRestaurants]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({...EMPTY_REST});
  const [ratingForm,setRatingForm]=useState({...EMPTY_RATING});
  const [ratingTarget,setRatingTarget]=useState(null);
  const [suggForm,setSuggForm]=useState({...EMPTY_SUGG});
  const [suggToConvert,setSuggToConvert]=useState(null);
  const [restFilter,setRestFilter]=useState({search:"",k1:"",k2:"",author:""});
  const [suggFilter,setSuggFilter]=useState({search:"",k1:"",k2:""});
  const [selected,setSelected]=useState(null);
  const [suggSelected,setSuggSelected]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [errors,setErrors]=useState({});
  const [suggErrors,setSuggErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  useEffect(()=>{
    let ref;try{ref=db.ref("restaurants");ref.on("value",snap=>{const d=snap.val();setRestaurants(d?Object.values(d):[]);setLoading(false);},()=>setLoading(false));}catch{setLoading(false);}
    const tm=setTimeout(()=>setLoading(false),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[]);
  useEffect(()=>{
    let ref;try{ref=db.ref("suggestions");ref.on("value",snap=>{const d=snap.val();setSuggestions(d?Object.values(d):[]);});}catch{}
    return()=>ref&&ref.off();
  },[]);
  const visible=restaurants.map(r=>restrictToMembers(normalizeRest(r),members)).filter(r=>Object.keys(r.ratings).length>0||members.includes(r.author));
  const visibleSugg=suggestions.filter(s=>members.includes(s.author));
  const cities=[...new Set(visible.map(r=>r.city?.trim()).filter(Boolean))].sort();
  const cuisines=[...new Set(visible.flatMap(r=>Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[])))].sort();
  const allRaters=[...new Set(visible.flatMap(r=>Object.keys(r.ratings||{})))].sort();
  const filteredRest=visible.filter(r=>{
    const rc=Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[]);
    return(!restFilter.k1||r.city===restFilter.k1)&&(!restFilter.k2||rc.includes(restFilter.k2))&&(!restFilter.author||Object.keys(r.ratings||{}).includes(restFilter.author))&&(!restFilter.search||r.name.toLowerCase().includes(restFilter.search.toLowerCase()));
  }).sort((a,b)=>getAvgRest(b).avg-getAvgRest(a).avg);
  const suggCities=[...new Set(visibleSugg.map(s=>s.city?.trim()).filter(Boolean))].sort();
  const suggCuisines=[...new Set(visibleSugg.flatMap(s=>Array.isArray(s.cuisines)?s.cuisines:[]))].sort();
  const filteredSugg=visibleSugg.filter(s=>{
    const c=Array.isArray(s.cuisines)?s.cuisines:[];
    return(!suggFilter.k1||s.city===suggFilter.k1)&&(!suggFilter.k2||c.includes(suggFilter.k2))&&(!suggFilter.search||s.name.toLowerCase().includes(suggFilter.search.toLowerCase()));
  });
  const valRest=()=>{const e={};if(!form.name.trim())e.name="Bitte Name eingeben";if(!form.city.trim())e.city="Bitte Stadt eingeben";if(!form.cuisines.length)e.cuisines="Bitte Küche auswählen";return e;};
  const valSugg=()=>{const e={};if(!suggForm.name.trim())e.name="Bitte Name eingeben";if(!suggForm.city.trim())e.city="Bitte Stadt eingeben";if(!suggForm.cuisines.length)e.cuisines="Bitte Küche auswählen";return e;};
  const handleAdd=async()=>{const e=valRest();if(Object.keys(e).length){setErrors(e);return;}
    const _key=dupKey(form.name,form.city);
    const _dup=restaurants.find(r=>dupKey(r.name,r.city)===_key);
    if(_dup){
      if(!window.confirm("„"+_dup.name+"“ gibt es hier bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?"))return;
      setSaving(true);
      try{
        await db.ref("restaurants/"+_dup.id+"/ratings/"+user).set(stamped({food:form.food,service:form.service,price:form.price,stars:form.stars,kommentar:form.kommentar}));
        if(suggToConvert){await db.ref("suggestions/"+suggToConvert.id).remove();setSuggToConvert(null);}
        setForm({...EMPTY_REST});setErrors({});setView("list");setSection("list");showToast("✅ Wertung hinzugefügt!");
      }catch{showToast("⚠️ Fehler");}
      setSaving(false);return;
    }
    const _dupS=!suggToConvert&&suggestions.find(s=>dupKey(s.name,s.city)===_key);
    if(_dupS){
      if(!window.confirm("„"+_dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?"))return;
      try{await db.ref("suggestions/"+_dupS.id).remove();}catch{}
    }
    setSaving(true);try{const id=Date.now().toString();await db.ref("restaurants/"+id).set({id,name:form.name,city:form.city.trim(),cuisines:form.cuisines,author:user,ratings:{[user]:stamped({food:form.food,service:form.service,price:form.price,stars:form.stars,kommentar:form.kommentar})}});if(suggToConvert){await db.ref("suggestions/"+suggToConvert.id).remove();setSuggToConvert(null);}setForm({...EMPTY_REST});setErrors({});setView("list");setSection("list");showToast("✅ Gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleEdit=r=>{const my=r.ratings?.[user]||EMPTY_RATING;setForm({name:r.name,city:r.city,cuisines:Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[]),food:my.food,service:my.service,price:my.price,stars:my.stars,kommentar:my.kommentar||""});setEditingId(r.id);setSelected(null);setSuggToConvert(null);setErrors({});setView("add");setSection("list");};
  const handleUpdate=async()=>{const e=valRest();if(Object.keys(e).length){setErrors(e);return;}setSaving(true);try{await db.ref("restaurants/"+editingId).update({name:form.name,city:form.city.trim(),cuisines:form.cuisines});await db.ref("restaurants/"+editingId+"/ratings/"+user).set(stamped({food:form.food,service:form.service,price:form.price,stars:form.stars,kommentar:form.kommentar}));setForm({...EMPTY_REST});setEditingId(null);setErrors({});setView("list");setSection("list");showToast("✅ Aktualisiert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDelete=async id=>{if(!window.confirm("Diesen Eintrag wirklich löschen? Alle Bewertungen dazu gehen verloren."))return;try{await db.ref("restaurants/"+id).remove();setSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const startRate=r=>{setRatingForm(r.ratings?.[user]||{...EMPTY_RATING});setRatingTarget(r);setSelected(null);setView("rate");};
  const handleSaveRating=async()=>{setSaving(true);try{
    // Nur die eigene Wertung schreiben: fremde ratings/<Name> verbieten die Regeln. Die Wertung des
    // Autors bei Einträgen im alten Format ergänzt normalizeRest() beim Lesen.
    await db.ref("restaurants/"+ratingTarget.id+"/ratings/"+user).set(stamped(ratingForm));
    setView("list");setSection("list");setRatingTarget(null);showToast("✅ Wertung gespeichert!");
  }catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleAddSugg=async()=>{const e=valSugg();if(Object.keys(e).length){setSuggErrors(e);return;}
    const _key=dupKey(suggForm.name,suggForm.city);
    const _dupS=suggestions.find(s=>dupKey(s.name,s.city)===_key);
    if(_dupS){showToast("💡 Bereits vorgeschlagen von "+_dupS.author+"!");return;}
    const _dupR=restaurants.find(r=>dupKey(r.name,r.city)===_key);
    if(_dupR){showToast("⭐ Gibt es schon in den Bewertungen!");return;}
    setSaving(true);try{const id=Date.now().toString();await db.ref("suggestions/"+id).set({id,name:suggForm.name,city:suggForm.city.trim(),cuisines:suggForm.cuisines,author:user});setSuggForm({...EMPTY_SUGG});setSuggErrors({});setView("suggestions");setSection("suggestions");showToast("✅ Vorschlag gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDeleteSugg=async id=>{if(!window.confirm("Diesen Vorschlag wirklich löschen?"))return;try{await db.ref("suggestions/"+id).remove();setSuggSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const handleConvertSugg=s=>{setForm({name:s.name,city:s.city,cuisines:Array.isArray(s.cuisines)?s.cuisines:[],food:5,service:5,price:3,stars:7,kommentar:""});setSuggToConvert(s);setEditingId(null);setErrors({});setSuggSelected(null);setView("add");setSection("list");};
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const rf=(k,v)=>setRatingForm(p=>({...p,[k]:v}));
  const sf=(k,v)=>setSuggForm(p=>({...p,[k]:v}));
  const navTo=s=>{setSection(s);setView(s);setSelected(null);setSuggSelected(null);};
  const navAdd=()=>{if(activeSection==="list"){setForm({...EMPTY_REST});setEditingId(null);setErrors({});setSuggToConvert(null);setView("add");}else{setSuggForm({...EMPTY_SUGG});setSuggErrors({});setView("add-suggestion");}};
  const navActive=view==="list"||view==="rate";
  const suggActive=view==="suggestions";
  const addActive=view==="add"||view==="add-suggestion";
  const navColor=t.restNavActive;
  const btn={width:"100%",padding:16,borderRadius:14,background:saving?"#ccc":t.restBtn,color:t.btnColor,fontSize:16,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",fontFamily:"'Space Grotesk',sans-serif",opacity:saving?0.7:1};
  if(loading)return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>🍽️</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",position:"relative",paddingBottom:92,transition:"background 0.3s"}}>
      <AppHeader user={user} dark={dark} setDark={setDark} mode={mode} setMode={setMode} modes={modes} t={t} onLogout={onLogout}
        title={"🍽️ Restaurants · "+group.name}
        subtitle={visible.length+" bewertet · "+visibleSugg.length+" Vorschlag"+(visibleSugg.length!==1?"e":"")}
        headerBg={t.restHeaderBg} headerSub={t.restHeaderSub} onBack={onBack} isAdmin={isAdmin} onSettings={onSettings}/>
      {view==="list"&&(
        <div style={{padding:"20px 16px"}}>
          <FilterBar filter={restFilter} setFilter={setRestFilter} col1={cities} col2={cuisines} col1Label="Alle Städte" col2Label="Alle Küchen" extra={[["author","Alle Bewerter",allRaters]]} filterOn={t.restFilterOn} filterOnColor={t.restFilterOnColor} t={t}/>
          {filteredRest.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>🍽️</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visible.length===0?"Noch keine Restaurants":"Keine Treffer"}</div></div>):filteredRest.map(r=><RestCard key={r.id} r={r} onClick={()=>setSelected(r)} t={t}/>)}
        </div>
      )}
      {view==="suggestions"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:4}}>💡 Restaurant Vorschläge</div>
          <div style={{fontSize:13,color:t.sub,marginBottom:16}}>Restaurants die ihr noch besuchen möchtet</div>
          <FilterBar filter={suggFilter} setFilter={setSuggFilter} col1={suggCities} col2={suggCuisines} col1Label="Alle Städte" col2Label="Alle Küchen" filterOn={t.restFilterOn} filterOnColor={t.restFilterOnColor} t={t}/>
          {filteredSugg.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>💡</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visibleSugg.length===0?"Noch keine Vorschläge":"Keine Treffer"}</div></div>):filteredSugg.map(s=><RestSuggCard key={s.id} s={s} onClick={()=>setSuggSelected(s)} t={t}/>)}
        </div>
      )}
      {view==="add"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
            <button onClick={()=>{setView(editingId?"list":activeSection);setForm({...EMPTY_REST});setEditingId(null);setSuggToConvert(null);setErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub,paddingTop:2}}>←</button>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>{editingId?"Bearbeiten":suggToConvert?"Jetzt bewerten":"Restaurant hinzufügen"}</div>{suggToConvert&&<div style={{fontSize:12,color:t.restSuggAccent,marginTop:3}}>💡 Aus Vorschlägen übernommen</div>}</div>
          </div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Name</label><input value={form.name} onChange={e=>{f("name",e.target.value);setErrors(p=>({...p,name:""}))}} placeholder="z.B. Trattoria da Marco" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{errors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Stadt</label><input value={form.city} onChange={e=>{f("city",e.target.value);setErrors(p=>({...p,city:""}))}} placeholder="z.B. München" list="r-cities" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.city?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="r-cities">{cities.map(c=><option key={c} value={c}/>)}</datalist>{errors.city&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.city}</div>}</div>
          <div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Art der Küche <span style={{fontWeight:400,color:form.cuisines.length===3?t.danger:t.tick}}>({form.cuisines.length}/3)</span></label><TypeChips value={form.cuisines} onChange={v=>{f("cuisines",v);setErrors(p=>({...p,cuisines:""}));}} options={CUISINES} chipOn={t.restChipOn} chipOnColor={t.restChipOnColor} t={t}/>{errors.cuisines&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.cuisines}</div>}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,fontWeight:700}}>Deine Bewertung</div>
            <Slider label="🍽️ Essen" value={form.food} min={0} max={10} onChange={v=>f("food",v)} color="#2e7d52" t={t}/>
            <Slider label="🤝 Service" value={form.service} min={0} max={10} onChange={v=>f("service",v)} color="#1a5f8c" t={t}/>
            <Slider label="💶 Preis" value={form.price} min={1} max={5} onChange={v=>f("price",v)} color={t.restAccent} display={"€".repeat(form.price)+" "+PRICE_LABELS[form.price]} t={t}/>
            <Slider label="⭐ Sterne" value={form.stars} min={0} max={10} onChange={v=>f("stars",v)} color="#e8a020" t={t}/>
            <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
              <textarea value={form.kommentar} onChange={e=>f("kommentar",e.target.value)} placeholder="Notizen, Empfehlungen, besondere Gerichte…" style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
          </div>
          <button onClick={editingId?handleUpdate:handleAdd} disabled={saving} style={btn}>{saving?"Speichert…":editingId?"Änderungen speichern":suggToConvert?"Bewertung speichern":"Restaurant speichern"}</button>
        </div>
      )}
      {view==="add-suggestion"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><button onClick={()=>{setView("suggestions");setSuggForm({...EMPTY_SUGG});setSuggErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>Vorschlag hinzufügen</div></div>
          <div style={{background:t.suggBadgeBg,borderRadius:12,padding:"10px 14px",marginBottom:20,border:`1px solid ${t.suggBorder}`}}><div style={{fontSize:12,color:t.restSuggAccent}}>💡 Noch nicht besucht — als Idee für den nächsten Abend.</div></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Name</label><input value={suggForm.name} onChange={e=>{sf("name",e.target.value);setSuggErrors(p=>({...p,name:""}))}} placeholder="z.B. Trattoria da Marco" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{suggErrors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Stadt</label><input value={suggForm.city} onChange={e=>{sf("city",e.target.value);setSuggErrors(p=>({...p,city:""}))}} placeholder="z.B. München" list="rs-cities" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.city?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="rs-cities">{[...new Set([...cities,...suggCities])].map(c=><option key={c} value={c}/>)}</datalist>{suggErrors.city&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.city}</div>}</div>
          <div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Art der Küche <span style={{fontWeight:400,color:suggForm.cuisines.length===3?t.danger:t.tick}}>({suggForm.cuisines.length}/3)</span></label><TypeChips value={suggForm.cuisines} onChange={v=>{sf("cuisines",v);setSuggErrors(p=>({...p,cuisines:""}));}} options={CUISINES} chipOn={t.restChipOn} chipOnColor={t.restChipOnColor} t={t}/>{suggErrors.cuisines&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.cuisines}</div>}</div>
          <button onClick={handleAddSugg} disabled={saving} style={btn}>{saving?"Speichert…":"Vorschlag speichern"}</button>
        </div>
      )}
      {view==="rate"&&ratingTarget&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><button onClick={()=>{setView("list");setSection("list");setRatingTarget(null);}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title}}>Wertung abgeben</div></div>
          <div style={{fontSize:13,color:t.sub,marginBottom:20,paddingLeft:36}}>{ratingTarget.name} · {ratingTarget.city}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <Slider label="🍽️ Essen" value={ratingForm.food} min={0} max={10} onChange={v=>rf("food",v)} color="#2e7d52" t={t}/>
            <Slider label="🤝 Service" value={ratingForm.service} min={0} max={10} onChange={v=>rf("service",v)} color="#1a5f8c" t={t}/>
            <Slider label="💶 Preis" value={ratingForm.price} min={1} max={5} onChange={v=>rf("price",v)} color={t.restAccent} display={"€".repeat(ratingForm.price)+" "+PRICE_LABELS[ratingForm.price]} t={t}/>
            <Slider label="⭐ Sterne" value={ratingForm.stars} min={0} max={10} onChange={v=>rf("stars",v)} color="#e8a020" t={t}/>
            <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
              <textarea value={ratingForm.kommentar||""} onChange={e=>rf("kommentar",e.target.value)} placeholder="Notizen, Empfehlungen, besondere Gerichte…" style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
          </div>
          <button onClick={handleSaveRating} disabled={saving} style={btn}>{saving?"Speichert…":"Wertung speichern"}</button>
        </div>
      )}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:t.navBg,borderTop:`1px solid ${t.navBorder}`,display:"flex",boxShadow:`0 -4px 20px ${t.navShadow}`,transition:"background 0.3s"}}>
        {[["list",navActive,()=>navTo("list"),"🍽️","Restaurant\nÜbersicht"],["sugg",suggActive,()=>navTo("suggestions"),"💡","Restaurant\nVorschläge"],["add-btn",addActive,navAdd,"➕","Hinzufügen"]].map(([key,active,onClick,icon,label])=>(
          <button key={key} onClick={onClick} style={{flex:1,padding:"11px 4px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:9,color:active?navColor:t.navInactive,fontWeight:active?700:400,textAlign:"center",lineHeight:1.25,whiteSpace:"pre-line"}}>{label}</span>
            {active&&<div style={{width:20,height:2,background:navColor,borderRadius:1,marginTop:1}}/>}
          </button>
        ))}
      </div>
      <RestModal r={selected} user={user} onClose={()=>setSelected(null)} onDelete={handleDelete} onEdit={handleEdit} onRate={startRate} t={t}/>
      <RestSuggModal s={suggSelected} user={user} onClose={()=>setSuggSelected(null)} onDelete={handleDeleteSugg} onConvert={handleConvertSugg} t={t}/>
      <Toast msg={toast} color={t.restToast} textColor={t.toastColor}/>
    </div>
  );
}
