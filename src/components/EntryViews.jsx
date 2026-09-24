import {PRICE_LABELS} from "../categories/index.js";
import {field1Of,typesOf,average} from "../categories/logic.js";
import {Slider,Stars,SwipeableSheet} from "./ui.jsx";

// Detailblätter und Bewertungsregler, Aufbau und Texte kommen aus der Definition
const euro=n=>"€".repeat(n||0);
const lineOf=(def,x)=>{
  const f1=field1Of(def,x),types=typesOf(def,x);
  return def.field1.prefix+f1+(types.length?" · "+types.join(" & "):"");
};

// Bewerteter Eintrag: Durchschnitte, alle Wertungen, eigene Aktionen
export function ItemModal({def,item,user,onClose,onDelete,onEdit,onRate,t,mc}){
  if(!item)return null;
  const avg=average(def,item);
  const ratings=Object.entries(item.ratings||{});
  const isAuthor=user===item.author;const hasRated=!!item.ratings?.[user];
  const overallTile=def.score==="stars";
  const tiles=def.criteria.filter(c=>c.format!=="euro");
  const priceCrit=def.criteria.find(c=>c.format==="euro");
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title,letterSpacing:"-0.01em"}}>{def.icon} {item.name}</div>
      <div style={{color:t.sub,fontSize:13,marginTop:4}}>{[def.label,lineOf(def,item)].filter(Boolean).join(" · ")}</div>
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
// Vorschlag: übernehmen oder (als Autor) löschen
export function SuggModal({def,s,user,onClose,onDelete,onConvert,t,mc}){
  if(!s)return null;
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title}}>{def.icon} {s.name}</div>
        <span style={{background:t.suggBadgeBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:mc.suggAccent,fontWeight:600}}>💡 Vorschlag</span>
      </div>
      <div style={{color:t.sub,fontSize:13}}>{[def.label,lineOf(def,s)].filter(Boolean).join(" · ")}</div>
      <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14}}>
        <div style={{fontSize:13,color:t.sub}}>{def.texts.notYet}</div>
        <div style={{fontSize:12,color:t.tick,marginTop:4,fontStyle:"italic"}}>Vorgeschlagen von {s.author||"einem gelöschten Konto"}{!isNaN(+s.id)?" am "+new Date(+s.id).toLocaleDateString("de-DE"):""}</div>
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
