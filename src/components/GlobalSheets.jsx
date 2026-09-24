import {useState} from "react";
import {db} from "../firebase.js";
import {dupKey} from "../lib/ratings.js";
import {CATEGORY_GROUPS} from "../categories/index.js";
import {itemDupKey,subtitle,emptyForm,formFromSuggestion,validate,itemPayload,ratingPayload} from "../categories/logic.js";
import {GLASS_MODE,GOLD_MODE} from "../theme.js";
import {SwipeableSheet,TypeChips} from "./ui.jsx";
import {RatingFields} from "../apps/CategoryApp.jsx";

// NEU BEWERTEN / NEUER VORSCHLAG über alle Gruppen hinweg.
// fromSuggestion: Vorschlag, der bewertet und damit in die Bewertungen übernommen wird.
export function GlobalAddSheet({def,user,isRatings,fromSuggestion,dark,t,onClose,onSaved}){
  const mc=dark?GOLD_MODE:GLASS_MODE;
  const [form,setForm]=useState(()=>fromSuggestion?formFromSuggestion(def,fromSuggestion):emptyForm(def));
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const set=(k,v)=>{setForm(p=>({...p,[k]:v}));setMsg("");};
  const inp={width:"100%",padding:"13px 16px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,outline:"none",background:t.inputBg,color:t.inputColor,marginBottom:12};
  const save=async()=>{
    const f={...form,name:form.name.trim()};
    const errs=Object.values(validate(def,f));
    if(errs.length){setMsg(errs[0]);return;}
    setBusy(true);setMsg("");
    try{
      // Duplikatprüfung: gleicher Name + gleiches Feld 1 (Stadt, Destillerie …) in dieser Kategorie
      const P=def.paths;
      const [baseSnap,suggSnap]=await Promise.all([db.ref(P.items).get().catch(()=>null),db.ref(P.suggestions).get().catch(()=>null)]);
      const baseArr=baseSnap&&baseSnap.val()?Object.values(baseSnap.val()):[];
      const suggArr=suggSnap&&suggSnap.val()?Object.values(suggSnap.val()):[];
      const key=dupKey(f.name,f.field1);
      const dupB=baseArr.find(i=>i&&itemDupKey(def,i)===key);
      const dupS=suggArr.find(i=>i&&itemDupKey(def,i)===key&&i.id!==fromSuggestion?.id);
      const removeConverted=async()=>{if(fromSuggestion)await db.ref(P.suggestions+"/"+fromSuggestion.id).remove().catch(()=>{});};
      if(isRatings){
        if(dupB){
          if(!window.confirm("„"+dupB.name+"“ gibt es bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?")){setBusy(false);return;}
          await db.ref(P.items+"/"+dupB.id+"/ratings/"+user).set(ratingPayload(def,f));
          await removeConverted();
          onSaved();return;
        }
        if(dupS){
          if(!window.confirm("„"+dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?")){setBusy(false);return;}
          await db.ref(P.suggestions+"/"+dupS.id).remove().catch(()=>{});
        }
      }else{
        if(dupS){setMsg("💡 Diesen Vorschlag gibt es bereits (von "+dupS.author+").");setBusy(false);return;}
        if(dupB){setMsg("⭐ Das ist bereits in den Bewertungen vorhanden.");setBusy(false);return;}
      }
      const id=Date.now().toString();
      await db.ref((isRatings?P.items:P.suggestions)+"/"+id).set(itemPayload(def,{id,form:f,user,withRating:isRatings}));
      if(isRatings)await removeConverted();
      onSaved();
    }catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");setBusy(false);}
  };
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:fromSuggestion?4:16,textAlign:"center"}}>{def.icon} {fromSuggestion?"Jetzt bewerten":isRatings?def.texts.addTitle:def.texts.addSuggTitle}</div>
      {fromSuggestion&&<div style={{fontSize:12,color:mc.suggAccent,textAlign:"center",marginBottom:14}}>💡 Aus Vorschlägen übernommen</div>}
      <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder={def.texts.nameLabel+" — "+def.texts.namePlaceholder} style={inp}/>
      <input value={form.field1} onChange={e=>set("field1",e.target.value)} placeholder={def.field1.label+" — "+def.field1.placeholder} style={inp}/>
      {def.types.options&&<div style={{marginBottom:16}}>
        <div style={{fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>{def.types.label}</div>
        <TypeChips value={form.types} onChange={v=>set("types",v)} options={def.types.options} chipOn={mc.chipOn} chipOnColor={mc.chipOnColor} t={t}/>
      </div>}
      {isRatings&&<RatingFields def={def} form={form} setF={set} accent={mc.accent} t={t}/>}
      <button onClick={save} disabled={busy}
        style={{width:"100%",marginTop:12,padding:14,borderRadius:12,background:busy?t.sliderTrack:mc.btn,color:mc.btnColor,border:"none",cursor:"pointer",fontSize:15,fontWeight:700}}>
        {busy?"Speichere…":(isRatings?"Speichern":"Vorschlag speichern")}
      </button>
      {msg&&<div style={{marginTop:12,fontSize:13,textAlign:"center",color:msg.startsWith("💡")||msg.startsWith("⭐")?t.sub:t.danger}}>{msg}</div>}
    </SwipeableSheet>
  );
}

// Kategorie wählen, dann GlobalAddSheet — für "+ Bewerten" und "+ Vorschlag"
export function AddFlow({defs,user,isRatings,dark,t,onClose,onSaved}){
  const [def,setDef]=useState(null);
  if(def)return <GlobalAddSheet def={def} user={user} isRatings={isRatings} dark={dark} t={t} onClose={onClose} onSaved={onSaved}/>;
  const sections=CATEGORY_GROUPS.map(g=>({...g,items:g.cats.map(id=>defs.find(d=>d.id===id)).filter(Boolean)})).filter(g=>g.items.length>0);
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title,marginBottom:6,textAlign:"center"}}>{isRatings?"Was möchtest du bewerten?":"Wofür ist dein Vorschlag?"}</div>
      <div style={{fontSize:12,color:t.sub,textAlign:"center",marginBottom:16}}>{sections.length?"Wähle die Kategorie":"Deine Gruppen haben noch keine Kategorien."}</div>
      {sections.map(sec=>(
        <div key={sec.id} style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:t.sub,margin:"4px 2px 6px",fontFamily:"'Space Grotesk',sans-serif"}}>{sec.icon} {sec.label}</div>
          {sec.items.map(c=>(
            <button key={c.id} onClick={()=>setDef(c)}
              style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:8,background:t.innerCard,borderRadius:12,border:`1.5px solid ${t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:24}}>{c.icon}</span>
              <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,color:t.title,flex:1}}>{c.label}</span>
              <span style={{fontSize:16,color:t.tick}}>›</span>
            </button>
          ))}
        </div>
      ))}
    </SwipeableSheet>
  );
}

// GLOBALE DETAIL-ANSICHT
export function GlobalDetailSheet({entry,isRatings,t,onClose}){
  const {cat,item,avg}=entry;
  const sub=subtitle(cat,item);
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{textAlign:"center",marginBottom:6}}><span style={{fontSize:40}}>{cat.icon}</span></div>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title,textAlign:"center"}}>{item.name}</div>
      <div style={{fontSize:12.5,color:t.sub,textAlign:"center",marginTop:4}}>{[cat.label,sub].filter(Boolean).join(" · ")}</div>
      {isRatings?(
        <>
          <div style={{marginTop:14,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:11,color:t.sub}}>⭐ Durchschnitt</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color:t.restAccent}}>{avg.stars}/10</div>
            <div style={{fontSize:10,color:t.tick}}>aus {avg.count} Wertung{avg.count!==1?"en":""}</div>
          </div>
          <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,margin:"16px 0 8px"}}>Einzelne Wertungen</div>
          {Object.entries(item.ratings||{}).map(([u,r])=>(
            <div key={u} style={{background:t.ratingRow,border:`1px solid ${t.ratingBorder}`,borderRadius:12,padding:"11px 14px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13.5,fontWeight:700,color:t.title,flex:1}}>{u}</span>
                <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.restAccent}}>{r.stars}<span style={{fontSize:10,color:t.tick}}>/10</span></span>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:11.5,color:t.sub,marginTop:6}}>
                {cat.criteria.map(c=>(
                  <span key={c.key} style={{background:t.innerCard,borderRadius:8,padding:"4px 9px"}}>{c.short}: {c.format==="euro"?"€".repeat(r[c.key]||0):(r[c.key]??"–")}</span>
                ))}
              </div>
              {r.kommentar&&<div style={{fontSize:12,color:t.sub,marginTop:6,fontStyle:"italic"}}>„{r.kommentar}"</div>}
            </div>
          ))}
        </>
      ):(
        <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14,textAlign:"center"}}>
          <div style={{fontSize:13,color:t.sub}}>💡 Vorgeschlagen von <strong style={{color:t.title}}>{item.author}</strong></div>
          {!isNaN(+item.id)&&<div style={{fontSize:11,color:t.tick,marginTop:5}}>am {new Date(+item.id).toLocaleDateString("de-DE")}</div>}
        </div>
      )}
    </SwipeableSheet>
  );
}
