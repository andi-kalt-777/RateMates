import {useState,useEffect} from "react";
import {db} from "../firebase.js";
import {restrictToMembers,dupKey} from "../lib/ratings.js";
import {PRICE_LABELS} from "../categories/index.js";
import {
  field1Of,typesOf,normalizeItem,itemDupKey,average,score,emptyForm,emptySuggForm,
  formFromItem,formFromSuggestion,ratingFormFor,validate,itemPayload,updatePayload,ratingPayload,
} from "../categories/logic.js";
import {GLASS_MODE,GOLD_MODE} from "../theme.js";
import {Slider,Stars,Badge,Toast,TypeChips,FilterBar,SwipeableSheet} from "../components/ui.jsx";
import {AppHeader} from "../components/AppHeader.jsx";

// EINE ANSICHT FÜR ALLE KATEGORIEN — Aufbau, Felder und Texte kommen aus der Definition
const euro=n=>"€".repeat(n||0);
const lineOf=(def,x)=>{
  const f1=field1Of(def,x),types=typesOf(def,x);
  return def.field1.prefix+f1+(types.length?" · "+types.join(" & "):"");
};

export function ItemCard({def,item,onClick,t,mc}){
  const avg=average(def,item);
  const raters=Object.keys(item.ratings||{});
  return(
    <div onClick={onClick} style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0,paddingRight:8}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{item.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>{lineOf(def,item)}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:mc.accent}}>{score(def,avg)}</div>
          <div style={{fontSize:10,color:t.tick}}>Ø · {avg.count} Wertung{avg.count!==1?"en":""}</div>
        </div>
      </div>
      <div style={{marginTop:10}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {def.criteria.map(c=>c.format==="euro"
          ?<span key={c.key} style={{marginLeft:"auto",fontSize:13,color:t.sub}}>{euro(avg[c.key])}</span>
          :<span key={c.key} style={{display:"contents"}}><Badge value={avg[c.key]} color={c.color}/><span style={{fontSize:11,color:t.sub}}>{c.short}</span></span>)}
      </div>
      {raters.length>0&&<div style={{textAlign:"right",marginTop:6}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>bewertet von {raters.join(", ")}</span></div>}
    </div>
  );
}
export function SuggCard({def,s,onClick,t,mc}){
  return(
    <div onClick={onClick} style={{background:t.suggCard,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.suggBorder}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title}}>{s.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>{lineOf(def,s)}</div>
        </div>
        <span style={{background:t.suggBadgeBg,borderRadius:10,padding:"4px 10px",fontSize:11,color:mc.suggAccent,fontWeight:600,flexShrink:0,marginLeft:8}}>💡 Vorschlag</span>
      </div>
      <div style={{textAlign:"right",marginTop:8}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>vorgeschlagen von {s.author}</span></div>
    </div>
  );
}
export function ItemModal({def,item,user,onClose,onDelete,onEdit,onRate,t,mc}){
  if(!item)return null;
  const avg=average(def,item);
  const ratings=Object.entries(item.ratings||{});
  const isAuthor=user===item.author;const hasRated=!!item.ratings?.[user];
  const overallTile=def.score==="stars";
  const tiles=def.criteria.filter(c=>c.format!=="euro");
  const priceCrit=def.criteria.find(c=>c.format==="euro");
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title,letterSpacing:"-0.01em"}}>{item.name}</div>
      <div style={{color:t.sub,fontSize:13,marginTop:4}}>{lineOf(def,item)}</div>
      <div style={{marginTop:14}}><Stars value={avg.stars} t={t}/></div>
      {overallTile&&<div style={{marginTop:12,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
        <div style={{fontSize:11,color:t.sub}}>{def.overall.label}</div>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color:mc.accent}}>{avg.stars}/10</div>
        <div style={{fontSize:10,color:t.tick}}>Durchschnitt aus {avg.count} Wertung{avg.count!==1?"en":""}</div>
      </div>}
      <div style={{marginTop:overallTile?10:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {tiles.map(c=>(
          <div key={c.key} style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:11,color:t.sub}}>{c.label}</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:c.color}}>{avg[c.key]}/10</div>
            {!overallTile&&<div style={{fontSize:10,color:t.tick}}>Durchschnitt</div>}
          </div>
        ))}
      </div>
      {priceCrit&&<div style={{marginTop:10,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
        <span style={{fontSize:12,color:t.sub}}>Preis: </span>
        <span style={{fontWeight:700,color:mc.accent}}>{euro(avg[priceCrit.key])} · {PRICE_LABELS[avg[priceCrit.key]]}</span>
      </div>}
      <div style={{marginTop:20}}>
        <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:8,fontWeight:700}}>Alle Bewertungen ({avg.count})</div>
        {ratings.map(([author,rating])=>(
          <div key={author} style={{background:t.ratingRow,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${t.ratingBorder}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:700,fontSize:13,color:t.title}}>{author}</span><span style={{fontSize:12,color:mc.accent}}>★ {rating.stars}/10</span></div>
            <div style={{display:"flex",gap:12,fontSize:12,color:t.sub,flexWrap:"wrap"}}>
              {def.criteria.map(c=><span key={c.key}>{c.format==="euro"?euro(rating[c.key]):c.short+" "+rating[c.key]+"/10"}</span>)}
            </div>
            {rating.kommentar&&<div style={{marginTop:8,fontSize:12,color:t.sub,fontStyle:"italic",background:t.innerCard,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>"{rating.kommentar}"</div>}
          </div>
        ))}
      </div>
      {isAuthor&&<div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>onEdit(item)} style={{padding:"12px",borderRadius:12,background:t.innerCard,color:t.title,border:`1px solid ${t.cardBorder}`,fontSize:14,cursor:"pointer",fontWeight:600}}>✏️ Bearbeiten</button>
        <button onClick={()=>onDelete(item.id)} style={{padding:"12px",borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Löschen</button>
      </div>}
      {!isAuthor&&!hasRated&&<button onClick={()=>onRate(item)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:mc.btn,color:mc.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>{def.texts.rateIcon} Eigene Wertung abgeben</button>}
      {!isAuthor&&hasRated&&<button onClick={()=>onRate(item)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>✏️ Meine Wertung bearbeiten</button>}
    </SwipeableSheet>
  );
}
export function SuggModal({def,s,user,onClose,onDelete,onConvert,t,mc}){
  if(!s)return null;
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title}}>{s.name}</div>
        <span style={{background:t.suggBadgeBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:mc.suggAccent,fontWeight:600}}>💡 Vorschlag</span>
      </div>
      <div style={{color:t.sub,fontSize:13}}>{lineOf(def,s)}</div>
      <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14}}>
        <div style={{fontSize:13,color:t.sub}}>{def.texts.notYet}</div>
        <div style={{fontSize:12,color:t.tick,marginTop:4,fontStyle:"italic"}}>Vorgeschlagen von {s.author}</div>
      </div>
      <button onClick={()=>onConvert(s)} style={{marginTop:16,width:"100%",padding:15,borderRadius:12,background:mc.btn,color:mc.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>{def.texts.rateIcon} Jetzt bewerten & übernehmen</button>
      {user===s.author&&<button onClick={()=>onDelete(s.id)} style={{marginTop:10,width:"100%",padding:13,borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Vorschlag löschen</button>}
    </SwipeableSheet>
  );
}
// Regler für Gesamtwertung und Kriterien plus Kommentar
export function RatingFields({def,form,setF,accent,t}){
  const o=def.overall;
  const overall=<Slider key={o.key} label={o.label} value={form[o.key]} min={0} max={10} onChange={v=>setF(o.key,v)} color={o.color||accent} t={t}/>;
  const crits=def.criteria.map(c=>(
    <Slider key={c.key} label={c.label} value={form[c.key]} min={c.min} max={c.max} onChange={v=>setF(c.key,v)}
      color={c.format==="euro"?accent:c.color} display={c.format==="euro"?euro(form[c.key])+" "+PRICE_LABELS[form[c.key]]:undefined} t={t}/>
  ));
  return(
    <>
      {o.position==="last"?[...crits,overall]:[overall,...crits]}
      <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
        <textarea value={form.kommentar||""} onChange={e=>setF("kommentar",e.target.value)} placeholder={def.texts.kommentarPlaceholder} style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
    </>
  );
}
// Name, Feld 1 und Auswahl — für neue Einträge und Vorschläge
function MasterFields({def,form,set,errors,setErrors,listId,field1Options,mc,t}){
  const lbl={display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"};
  const inp=err=>({width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${err?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor});
  const err=msg=>msg&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{msg}</div>;
  const clear=k=>setErrors(p=>({...p,[k]:""}));
  return(
    <>
      <div style={{marginBottom:16}}><label style={lbl}>{def.texts.nameLabel}</label><input value={form.name} onChange={e=>{set("name",e.target.value);clear("name");}} placeholder={def.texts.namePlaceholder} style={inp(errors.name)}/>{err(errors.name)}</div>
      <div style={{marginBottom:16}}><label style={lbl}>{def.field1.label}</label><input value={form.field1} onChange={e=>{set("field1",e.target.value);clear("field1");}} placeholder={def.field1.placeholder} list={listId} style={inp(errors.field1)}/><datalist id={listId}>{field1Options.map(d=><option key={d} value={d}/>)}</datalist>{err(errors.field1)}</div>
      {def.types.options&&<div style={{marginBottom:20}}><label style={{...lbl,marginBottom:4}}>{def.types.label} <span style={{fontWeight:400,color:form.types.length===3?t.danger:t.tick}}>({form.types.length}/3)</span></label><TypeChips value={form.types} onChange={v=>{set("types",v);clear("types");}} options={def.types.options} chipOn={mc.chipOn} chipOnColor={mc.chipOnColor} t={t}/>{err(errors.types)}</div>}
    </>
  );
}

export function CategoryApp({def,user,dark,setDark,mode,setMode,modes,t,group,members,onBack,isAdmin,onSettings,onLogout}){
  const mc=dark?GOLD_MODE:GLASS_MODE;
  const [view,setView]=useState("list");
  const [activeSection,setSection]=useState("list");
  const [items,setItems]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState(()=>emptyForm(def));
  const [ratingForm,setRatingForm]=useState({});
  const [ratingTarget,setRatingTarget]=useState(null);
  const [suggForm,setSuggForm]=useState(emptySuggForm);
  const [suggToConvert,setSuggToConvert]=useState(null);
  const [iFilter,setIFilter]=useState({search:"",k1:"",k2:"",author:""});
  const [sFilter,setSFilter]=useState({search:"",k1:"",k2:""});
  const [selected,setSelected]=useState(null);
  const [suggSelected,setSuggSelected]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [errors,setErrors]=useState({});
  const [suggErrors,setSuggErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  const P=def.paths;
  useEffect(()=>{
    let ref;try{ref=db.ref(P.items);ref.on("value",snap=>{const d=snap.val();setItems(d?Object.values(d):[]);setLoading(false);},()=>setLoading(false));}catch{setLoading(false);}
    const tm=setTimeout(()=>setLoading(false),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[P.items]);
  useEffect(()=>{
    let ref;try{ref=db.ref(P.suggestions);ref.on("value",snap=>{const d=snap.val();setSuggestions(d?Object.values(d):[]);});}catch{}
    return()=>ref&&ref.off();
  },[P.suggestions]);

  const f1=x=>field1Of(def,x);
  const sortedUnique=arr=>[...new Set(arr)].sort();
  const visible=items.map(x=>restrictToMembers(normalizeItem(def,x),members)).filter(x=>Object.keys(x.ratings).length>0||members.includes(x.author));
  const visibleSugg=suggestions.filter(s=>members.includes(s.author));
  const field1Vals=sortedUnique(visible.map(x=>f1(x).trim()).filter(Boolean));
  const allTypes=sortedUnique(visible.flatMap(x=>typesOf(def,x)));
  const allRaters=sortedUnique(visible.flatMap(x=>Object.keys(x.ratings||{})));
  const matches=(x,flt)=>(!flt.k1||f1(x)===flt.k1)&&(!flt.k2||typesOf(def,x).includes(flt.k2))&&(!flt.search||x.name.toLowerCase().includes(flt.search.toLowerCase()));
  const filteredI=visible.filter(x=>matches(x,iFilter)&&(!iFilter.author||Object.keys(x.ratings||{}).includes(iFilter.author)))
    .sort((a,b)=>score(def,average(def,b))-score(def,average(def,a)));
  const suggField1=sortedUnique(visibleSugg.map(s=>f1(s).trim()).filter(Boolean));
  const suggTypes=sortedUnique(visibleSugg.flatMap(s=>typesOf(def,s)));
  const filteredS=visibleSugg.filter(s=>matches(s,sFilter));
  const hasTypes=!!def.types.options;

  const done=(msg)=>{setForm(emptyForm(def));setErrors({});setView("list");setSection("list");showToast(msg);};
  const handleAdd=async()=>{const e=validate(def,form);if(Object.keys(e).length){setErrors(e);return;}
    const key=dupKey(form.name,form.field1);
    const dup=items.find(i=>itemDupKey(def,i)===key);
    if(dup){
      if(!window.confirm("„"+dup.name+"“ gibt es hier bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?"))return;
      setSaving(true);
      try{
        await db.ref(P.items+"/"+dup.id+"/ratings/"+user).set(ratingPayload(def,form));
        if(suggToConvert){await db.ref(P.suggestions+"/"+suggToConvert.id).remove();setSuggToConvert(null);}
        done("✅ Wertung hinzugefügt!");
      }catch{showToast("⚠️ Fehler");}
      setSaving(false);return;
    }
    const dupS=!suggToConvert&&suggestions.find(s=>itemDupKey(def,s)===key);
    if(dupS){
      if(!window.confirm("„"+dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?"))return;
      try{await db.ref(P.suggestions+"/"+dupS.id).remove();}catch{}
    }
    setSaving(true);
    try{
      const id=Date.now().toString();
      await db.ref(P.items+"/"+id).set(itemPayload(def,{id,form,user,withRating:true}));
      if(suggToConvert){await db.ref(P.suggestions+"/"+suggToConvert.id).remove();setSuggToConvert(null);}
      done(def.texts.saveToast);
    }catch{showToast("⚠️ Fehler");}
    setSaving(false);
  };
  const handleEdit=x=>{setForm(formFromItem(def,x,user));setEditingId(x.id);setSelected(null);setSuggToConvert(null);setErrors({});setView("add");setSection("list");};
  const handleUpdate=async()=>{const e=validate(def,form);if(Object.keys(e).length){setErrors(e);return;}
    setSaving(true);
    try{
      await db.ref(P.items+"/"+editingId).update(updatePayload(def,form));
      await db.ref(P.items+"/"+editingId+"/ratings/"+user).set(ratingPayload(def,form));
      setEditingId(null);done("✅ Aktualisiert!");
    }catch{showToast("⚠️ Fehler");}
    setSaving(false);
  };
  const handleDelete=async id=>{if(!window.confirm("Diesen Eintrag wirklich löschen? Alle Bewertungen dazu gehen verloren."))return;try{await db.ref(P.items+"/"+id).remove();setSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const startRate=x=>{setRatingForm(ratingFormFor(def,x,user));setRatingTarget(x);setSelected(null);setView("rate");};
  // Nur die eigene Wertung schreiben: fremde ratings/<Name> verbieten die Regeln. Die Wertung des
  // Autors bei Restaurants im alten Format ergänzt normalizeRest() beim Lesen.
  const handleSaveRating=async()=>{setSaving(true);try{await db.ref(P.items+"/"+ratingTarget.id+"/ratings/"+user).set(ratingPayload(def,ratingForm));setView("list");setSection("list");setRatingTarget(null);showToast("✅ Wertung gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleAddSugg=async()=>{const e=validate(def,suggForm);if(Object.keys(e).length){setSuggErrors(e);return;}
    const key=dupKey(suggForm.name,suggForm.field1);
    const dupS=suggestions.find(s=>itemDupKey(def,s)===key);
    if(dupS){showToast("💡 Bereits vorgeschlagen von "+dupS.author+"!");return;}
    const dupI=items.find(i=>itemDupKey(def,i)===key);
    if(dupI){showToast("⭐ Gibt es schon in den Bewertungen!");return;}
    setSaving(true);
    try{
      const id=Date.now().toString();
      await db.ref(P.suggestions+"/"+id).set(itemPayload(def,{id,form:suggForm,user,withRating:false}));
      setSuggForm(emptySuggForm());setSuggErrors({});setView("suggestions");setSection("suggestions");showToast("✅ Vorschlag gespeichert!");
    }catch{showToast("⚠️ Fehler");}
    setSaving(false);
  };
  const handleDeleteSugg=async id=>{if(!window.confirm("Diesen Vorschlag wirklich löschen?"))return;try{await db.ref(P.suggestions+"/"+id).remove();setSuggSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const handleConvertSugg=s=>{setForm(formFromSuggestion(def,s));setSuggToConvert(s);setEditingId(null);setErrors({});setSuggSelected(null);setView("add");setSection("list");};
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const rf=(k,v)=>setRatingForm(p=>({...p,[k]:v}));
  const sf=(k,v)=>setSuggForm(p=>({...p,[k]:v}));
  const navTo=s=>{setSection(s);setView(s);setSelected(null);setSuggSelected(null);};
  const navAdd=()=>{if(activeSection==="list"){setForm(emptyForm(def));setEditingId(null);setErrors({});setSuggToConvert(null);setView("add");}else{setSuggForm(emptySuggForm());setSuggErrors({});setView("add-suggestion");}};
  const navActive=view==="list"||view==="rate";
  const suggActive=view==="suggestions";
  const addActive=view==="add"||view==="add-suggestion";
  const btn={width:"100%",padding:16,borderRadius:14,background:saving?"#ccc":mc.btn,color:mc.btnColor,fontSize:16,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",fontFamily:"'Space Grotesk',sans-serif",opacity:saving?0.7:1};
  const back={background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub};
  const h2={fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title};
  const empty=(icon,text)=>(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>{icon}</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{text}</div></div>);
  if(loading)return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>{def.icon}</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",position:"relative",paddingBottom:92,transition:"background 0.3s"}}>
      <AppHeader user={user} dark={dark} setDark={setDark} mode={mode} setMode={setMode} modes={modes} t={t} onLogout={onLogout}
        title={def.icon+" "+def.title+" · "+group.name}
        subtitle={visible.length+" bewertet · "+visibleSugg.length+" Vorschlag"+(visibleSugg.length!==1?"e":"")}
        headerBg={mc.headerBg} headerSub={mc.headerSub} onBack={onBack} isAdmin={isAdmin} onSettings={onSettings}/>
      {view==="list"&&(
        <div style={{padding:"20px 16px"}}>
          <FilterBar filter={iFilter} setFilter={setIFilter} col1={field1Vals} col2={hasTypes?allTypes:[]} col1Label={def.field1.filterLabel} col2Label={def.types.filterLabel} extra={[["author","Alle Bewerter",allRaters]]} filterOn={mc.filterOn} filterOnColor={mc.filterOnColor} t={t}/>
          {filteredI.length===0?empty(def.icon,visible.length===0?def.texts.emptyText:"Keine Treffer"):filteredI.map(x=><ItemCard key={x.id} def={def} item={x} onClick={()=>setSelected(x)} t={t} mc={mc}/>)}
        </div>
      )}
      {view==="suggestions"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:4}}>💡 {def.texts.suggListTitle}</div>
          <div style={{fontSize:13,color:t.sub,marginBottom:16}}>{def.texts.suggListSub}</div>
          <FilterBar filter={sFilter} setFilter={setSFilter} col1={suggField1} col2={hasTypes?suggTypes:[]} col1Label={def.field1.filterLabel} col2Label={def.types.filterLabel} filterOn={mc.filterOn} filterOnColor={mc.filterOnColor} t={t}/>
          {filteredS.length===0?empty("💡",visibleSugg.length===0?def.texts.emptySuggText:"Keine Treffer"):filteredS.map(s=><SuggCard key={s.id} def={def} s={s} onClick={()=>setSuggSelected(s)} t={t} mc={mc}/>)}
        </div>
      )}
      {view==="add"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
            <button onClick={()=>{setView(editingId?"list":activeSection);setForm(emptyForm(def));setEditingId(null);setSuggToConvert(null);setErrors({});}} style={{...back,paddingTop:2}}>←</button>
            <div><div style={h2}>{editingId?"Bearbeiten":suggToConvert?"Jetzt bewerten":def.texts.addTitle}</div>{suggToConvert&&<div style={{fontSize:12,color:mc.suggAccent,marginTop:3}}>💡 Aus Vorschlägen übernommen</div>}</div>
          </div>
          <MasterFields def={def} form={form} set={f} errors={errors} setErrors={setErrors} listId="c-field1" field1Options={field1Vals} mc={mc} t={t}/>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,fontWeight:700}}>Deine Bewertung</div>
            <RatingFields def={def} form={form} setF={f} accent={mc.accent} t={t}/>
          </div>
          <button onClick={editingId?handleUpdate:handleAdd} disabled={saving} style={btn}>{saving?"Speichert…":editingId?"Änderungen speichern":suggToConvert?"Bewertung speichern":def.texts.saveButton}</button>
        </div>
      )}
      {view==="add-suggestion"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><button onClick={()=>{setView("suggestions");setSuggForm(emptySuggForm());setSuggErrors({});}} style={back}>←</button><div style={h2}>{def.texts.addSuggTitle}</div></div>
          <div style={{background:t.suggBadgeBg,borderRadius:12,padding:"10px 14px",marginBottom:20,border:`1px solid ${t.suggBorder}`}}><div style={{fontSize:12,color:mc.suggAccent}}>{def.texts.suggHint}</div></div>
          <MasterFields def={def} form={suggForm} set={sf} errors={suggErrors} setErrors={setSuggErrors} listId="cs-field1" field1Options={sortedUnique([...field1Vals,...suggField1])} mc={mc} t={t}/>
          <button onClick={handleAddSugg} disabled={saving} style={btn}>{saving?"Speichert…":"Vorschlag speichern"}</button>
        </div>
      )}
      {view==="rate"&&ratingTarget&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><button onClick={()=>{setView("list");setSection("list");setRatingTarget(null);}} style={back}>←</button><div style={{...h2,fontSize:18}}>Wertung abgeben</div></div>
          <div style={{fontSize:13,color:t.sub,marginBottom:20,paddingLeft:36}}>{ratingTarget.name}{f1(ratingTarget)?" · "+f1(ratingTarget):""}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}><RatingFields def={def} form={ratingForm} setF={rf} accent={mc.accent} t={t}/></div>
          <button onClick={handleSaveRating} disabled={saving} style={btn}>{saving?"Speichert…":"Wertung speichern"}</button>
        </div>
      )}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:t.navBg,borderTop:`1px solid ${t.navBorder}`,display:"flex",boxShadow:`0 -4px 20px ${t.navShadow}`,transition:"background 0.3s"}}>
        {[["list",navActive,()=>navTo("list"),def.icon,def.texts.listLabel+"\nÜbersicht"],["sugg",suggActive,()=>navTo("suggestions"),"💡",def.texts.listLabel+"\nVorschläge"],["add-btn",addActive,navAdd,"➕","Hinzufügen"]].map(([key,active,onClick,icon,label])=>(
          <button key={key} onClick={onClick} style={{flex:1,padding:"11px 4px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:9,color:active?mc.navActive:t.navInactive,fontWeight:active?700:400,textAlign:"center",lineHeight:1.25,whiteSpace:"pre-line"}}>{label}</span>
            {active&&<div style={{width:20,height:2,background:mc.navActive,borderRadius:1,marginTop:1}}/>}
          </button>
        ))}
      </div>
      <ItemModal def={def} item={selected} user={user} onClose={()=>setSelected(null)} onDelete={handleDelete} onEdit={handleEdit} onRate={startRate} t={t} mc={mc}/>
      <SuggModal def={def} s={suggSelected} user={user} onClose={()=>setSuggSelected(null)} onDelete={handleDeleteSugg} onConvert={handleConvertSugg} t={t} mc={mc}/>
      <Toast msg={toast} color={mc.toast} textColor={mc.toastColor}/>
    </div>
  );
}
