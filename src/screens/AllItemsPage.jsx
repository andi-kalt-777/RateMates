import {useState,useEffect} from "react";
import {db} from "../firebase.js";
import {stamped,normalizeRest,dupKey,restrictToMembers} from "../lib/ratings.js";
import {CUISINES,WHISKY_TYPES,CATEGORY_GROUPS,ALL_CATS,avgOfCat,subtitleOfCat,catFilterMeta} from "../categories/index.js";
import {Slider,SwipeableSheet} from "../components/ui.jsx";
import {UserMenu} from "../components/UserMenu.jsx";

// FORMULAR-METADATEN je Kategorie (für globales Anlegen)
export function catFormMeta(cat){
  if(cat.kind==="rest")return{f1Label:"Stadt",f1Ph:"z.B. Köln",options:CUISINES,optLabel:"Küche"};
  if(cat.kind==="whisky")return{f1Label:"Destillerie",f1Ph:"z.B. Laphroaig",options:WHISKY_TYPES,optLabel:"Sorte"};
  return{f1Label:(cat.cfg&&cat.cfg.field1Label)||"Details",f1Ph:(cat.cfg&&cat.cfg.field1Placeholder)||"",options:(cat.cfg&&cat.cfg.genreOptions)||[],optLabel:"Sorte / Genre"};
}
// GLOBALES ANLEGEN: neuer Eintrag mit eigener Wertung bzw. neuer Vorschlag
export function GlobalAddSheet({cat,user,isRatings,t,onClose,onSaved}){
  const meta=catFormMeta(cat);
  const [name,setName]=useState("");
  const [f1,setF1]=useState("");
  const [sel,setSel]=useState([]);
  const [vals,setVals]=useState(cat.kind==="rest"?{food:5,service:5,price:3,stars:7}:cat.kind==="whisky"?{stars:7,rauchigkeit:5,fruchtigkeit:5}:{stars:7,handlung:5,spannung:5});
  const [kommentar,setKommentar]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const setV=(k,v)=>setVals(p=>({...p,[k]:v}));
  const toggle=o=>setSel(p=>p.includes(o)?p.filter(x=>x!==o):[...p,o]);
  const accent=t.restAccent;
  const inp={width:"100%",padding:"13px 16px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,outline:"none",background:t.inputBg,color:t.inputColor,marginBottom:12};
  const save=async()=>{
    const n=name.trim();
    if(!n){setMsg("Bitte gib einen Namen an.");return;}
    if(cat.kind==="rest"&&!f1.trim()){setMsg("Bitte gib die Stadt an.");return;}
    setBusy(true);setMsg("");
    try{
      // Duplikatprüfung: gleicher Name + gleiche Stadt/gleiches Medium in dieser Kategorie
      const fkG=(cat.cfg&&cat.cfg.field1Key)||"field1";
      const f1Of=i=>cat.kind==="rest"?i.city:cat.kind==="whisky"?i.distillery:(i.field1!==undefined&&i.field1!==null?i.field1:(i[fkG]||""));
      const [baseSnap,suggSnap]=await Promise.all([db.ref(cat.base).get().catch(()=>null),db.ref(cat.sugg).get().catch(()=>null)]);
      const baseArr=baseSnap&&baseSnap.val()?Object.values(baseSnap.val()):[];
      const suggArr=suggSnap&&suggSnap.val()?Object.values(suggSnap.val()):[];
      const key=dupKey(n,f1);
      const dupB=baseArr.find(i=>i&&dupKey(i.name,f1Of(i))===key);
      const dupS=suggArr.find(i=>i&&dupKey(i.name,f1Of(i))===key);
      const myRating=cat.kind==="rest"?{food:vals.food,service:vals.service,price:vals.price,stars:vals.stars,kommentar}
        :cat.kind==="whisky"?{stars:vals.stars,rauchigkeit:vals.rauchigkeit,fruchtigkeit:vals.fruchtigkeit,kommentar}
        :{stars:vals.stars,handlung:vals.handlung,spannung:vals.spannung,kommentar};
      if(isRatings){
        if(dupB){
          if(!window.confirm("„"+dupB.name+"“ gibt es bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?")){setBusy(false);return;}
          await db.ref(cat.base+"/"+dupB.id+"/ratings/"+user).set(stamped(myRating));
          onSaved();return;
        }
        if(dupS){
          if(!window.confirm("„"+dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?")){setBusy(false);return;}
          await db.ref(cat.sugg+"/"+dupS.id).remove().catch(()=>{});
        }
      }else{
        if(dupS){setMsg("💡 Diesen Vorschlag gibt es bereits (von "+dupS.author+").");setBusy(false);return;}
        if(dupB){setMsg("⭐ Das ist bereits in den Bewertungen vorhanden.");setBusy(false);return;}
      }
      const id=Date.now().toString();
      let data;
      if(cat.kind==="rest"){
        data={id,name:n,city:f1.trim(),cuisines:sel,author:user};
        if(isRatings)data.ratings={[user]:stamped({food:vals.food,service:vals.service,price:vals.price,stars:vals.stars,kommentar})};
      }else if(cat.kind==="whisky"){
        data={id,name:n,distillery:f1.trim(),types:sel,author:user};
        if(isRatings)data.ratings={[user]:stamped({stars:vals.stars,rauchigkeit:vals.rauchigkeit,fruchtigkeit:vals.fruchtigkeit,kommentar})};
      }else{
        const fk=(cat.cfg&&cat.cfg.field1Key)||"field1";
        data={id,name:n,[fk]:f1.trim(),field1:f1.trim(),genres:sel,author:user};
        if(isRatings)data.ratings={[user]:stamped({stars:vals.stars,handlung:vals.handlung,spannung:vals.spannung,kommentar})};
      }
      await db.ref((isRatings?cat.base:cat.sugg)+"/"+id).set(data);
      onSaved();
    }catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");setBusy(false);}
  };
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:16,textAlign:"center"}}>{cat.icon} {isRatings?((cat.cfg&&cat.cfg.addTitle)||cat.label.replace(/s$/,"")+" hinzufügen"):"Vorschlag: "+cat.label}</div>
      <input value={name} onChange={e=>{setName(e.target.value);setMsg("");}} placeholder="Name" style={inp}/>
      <input value={f1} onChange={e=>{setF1(e.target.value);setMsg("");}} placeholder={meta.f1Label+(meta.f1Ph?" — "+meta.f1Ph:"")} style={inp}/>
      {meta.options.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {meta.options.map(o=>(
            <button key={o} onClick={()=>toggle(o)}
              style={{padding:"6px 12px",borderRadius:16,border:`1.5px solid ${sel.includes(o)?t.restChipOn:t.chipBorder}`,background:sel.includes(o)?t.restChipOn:t.chipBg,color:sel.includes(o)?t.restChipOnColor:t.chipColor,fontSize:12,cursor:"pointer"}}>{o}</button>
          ))}
        </div>
      )}
      {isRatings&&cat.kind==="rest"&&(<>
        <Slider label="⭐ Gesamtwertung" value={vals.stars} min={0} max={10} onChange={v=>setV("stars",v)} color={accent} t={t}/>
        <Slider label="🍜 Essen" value={vals.food} min={0} max={10} onChange={v=>setV("food",v)} color="#2e7d52" t={t}/>
        <Slider label="💁 Service" value={vals.service} min={0} max={10} onChange={v=>setV("service",v)} color="#3a5a9e" t={t}/>
        <Slider label="💰 Preis" value={vals.price} min={1} max={5} onChange={v=>setV("price",v)} color="#8a5a2c" display={v=>"€".repeat(v)} t={t}/>
      </>)}
      {isRatings&&cat.kind==="whisky"&&(<>
        <Slider label="⭐ Gesamtgeschmack" value={vals.stars} min={0} max={10} onChange={v=>setV("stars",v)} color={accent} t={t}/>
        <Slider label="🌫️ Rauchigkeit" value={vals.rauchigkeit} min={0} max={10} onChange={v=>setV("rauchigkeit",v)} color="#5a6472" t={t}/>
        <Slider label="🍒 Fruchtigkeit" value={vals.fruchtigkeit} min={0} max={10} onChange={v=>setV("fruchtigkeit",v)} color="#a8364e" t={t}/>
      </>)}
      {isRatings&&cat.kind==="media"&&(<>
        <Slider label={(cat.cfg&&cat.cfg.starsLabel)||"⭐ Gesamtwertung"} value={vals.stars} min={0} max={10} onChange={v=>setV("stars",v)} color={accent} t={t}/>
        <Slider label={(cat.cfg&&cat.cfg.crit1Label)||"Kriterium 1"} value={vals.handlung} min={0} max={10} onChange={v=>setV("handlung",v)} color="#2e7d52" t={t}/>
        <Slider label={(cat.cfg&&cat.cfg.crit2Label)||"Kriterium 2"} value={vals.spannung} min={0} max={10} onChange={v=>setV("spannung",v)} color="#3a5a9e" t={t}/>
      </>)}
      {isRatings&&<textarea value={kommentar} onChange={e=>setKommentar(e.target.value)} placeholder="Kommentar (optional)" rows={2} style={{...inp,resize:"none",fontFamily:"inherit"}}/>}
      <button onClick={save} disabled={busy}
        style={{width:"100%",padding:14,borderRadius:12,background:busy?t.sliderTrack:t.restBtn,color:t.btnColor,border:"none",cursor:"pointer",fontSize:15,fontWeight:700}}>
        {busy?"Speichere…":(isRatings?"Speichern":"Vorschlag speichern")}
      </button>
      {msg&&<div style={{marginTop:12,fontSize:13,textAlign:"center",color:msg.startsWith("⚠️")?t.danger:t.sub}}>{msg}</div>}
    </SwipeableSheet>
  );
}
// GLOBALE DETAIL-ANSICHT
export function GlobalDetailSheet({entry,isRatings,t,onClose}){
  const {cat,item,avg}=entry;
  const sub=subtitleOfCat(cat,item);
  const critLabels=cat.kind==="rest"
    ?[["food","🍜 Essen"],["service","💁 Service"],["price","💰 Preis"]]
    :cat.kind==="whisky"
    ?[["rauchigkeit","🌫️ Rauchigkeit"],["fruchtigkeit","🍒 Fruchtigkeit"]]
    :[["handlung",(cat.cfg&&cat.cfg.crit1Short)||"Kriterium 1"],["spannung",(cat.cfg&&cat.cfg.crit2Short)||"Kriterium 2"]];
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
                {critLabels.map(([k,l])=>(
                  <span key={k} style={{background:t.innerCard,borderRadius:8,padding:"4px 9px"}}>{l}: {k==="price"?"€".repeat(r[k]||0):(r[k]??"–")}</span>
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
// GLOBALE ÜBERSICHT: alle Bewertungen bzw. Vorschläge aus allen Gruppen
export function AllItemsPage({type,user,groups,dark,setDark,t,onBack,onLogout}){
  const isRatings=type==="ratings";
  const my=groups.filter(g=>g.members&&g.members[user]);
  const friends=[...new Set(my.flatMap(g=>Object.keys(g.members||{})))];
  const activeCats=ALL_CATS.filter(c=>my.some(g=>g.categories?.[c.id]));
  const [loaded,setLoaded]=useState(false);
  const [raw,setRaw]=useState([]);
  const [catF,setCatF]=useState("");
  const [showCatMenu,setShowCatMenu]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [addCat,setAddCat]=useState(null);
  const [detail,setDetail]=useState(null);
  const [reloadKey,setReloadKey]=useState(0);
  const [k1F,setK1F]=useState("");
  const [k2F,setK2F]=useState("");
  const [sortBy,setSortBy]=useState(isRatings?"cat":"new");
  const [search,setSearch]=useState("");
  useEffect(()=>{
    let cancelled=false;
    const get=p=>db.ref(p).get().then(s=>s.val()||{}).catch(()=>({}));
    Promise.all(activeCats.map(c=>get(isRatings?c.base:c.sugg).then(d=>({cat:c,data:d}))))
      .then(res=>{if(!cancelled){setRaw(res);setLoaded(true);}})
      .catch(()=>{if(!cancelled)setLoaded(true);});
    const tm=setTimeout(()=>setLoaded(true),8000);
    return()=>{cancelled=true;clearTimeout(tm);};
  },[reloadKey]);
  const chooseCat=id=>{setCatF(id);setK1F("");setK2F("");setShowCatMenu(false);};
  let items=[];
  raw.forEach(({cat,data})=>{
    Object.values(data||{}).forEach(it=>{
      if(!it||!it.name)return;
      if(isRatings){
        const norm=cat.kind==="rest"?normalizeRest(it):it;
        const vis=restrictToMembers(norm,friends);
        const avg=avgOfCat(cat,vis);
        if(avg.count>0)items.push({cat,item:vis,avg});
      }else{
        if(it.author&&friends.includes(it.author))items.push({cat,item:it});
      }
    });
  });
  const selCat=activeCats.find(c=>c.id===catF)||null;
  const meta=selCat?catFilterMeta(selCat):null;
  const catItems=selCat?items.filter(x=>x.cat.id===selCat.id):[];
  const opts1=selCat?[...new Set(catItems.map(x=>meta.g1(x.item)).filter(Boolean))].sort():[];
  const opts2=selCat?[...new Set(catItems.flatMap(x=>meta.g2(x.item)))].sort():[];
  const q=search.trim().toLowerCase();
  items=items.filter(x=>(!catF||x.cat.id===catF)
    &&(!q||x.item.name.toLowerCase().includes(q))
    &&(!selCat||!k1F||meta.g1(x.item)===k1F)
    &&(!selCat||!k2F||meta.g2(x.item).includes(k2F)));
  const ci=x=>ALL_CATS.findIndex(c=>c.id===x.cat.id);
  items.sort((a,b)=>{
    if(sortBy==="cat"){const c=ci(a)-ci(b);if(c!==0)return c;return isRatings?(b.avg.stars-a.avg.stars):a.item.name.localeCompare(b.item.name);}
    if(sortBy==="best")return b.avg.stars-a.avg.stars;
    if(sortBy==="count")return b.avg.count-a.avg.count;
    if(sortBy==="new")return String(b.item.id).localeCompare(String(a.item.id));
    return a.item.name.localeCompare(b.item.name);
  });
  const selStyle={padding:"7px 10px",borderRadius:20,border:`1px solid ${t.filterBorder}`,background:t.filterBg,color:t.filterColor,fontSize:12,cursor:"pointer",outline:"none",flexShrink:0};
  const selOn={background:t.restFilterOn,color:t.restFilterOnColor,border:`1px solid ${t.restFilterOn}`};
  const currentIcon=selCat?selCat.icon:"⭐";
  const catSections=CATEGORY_GROUPS.map(g=>({...g,items:g.cats.filter(c=>activeCats.some(a=>a.id===c)).map(c=>activeCats.find(a=>a.id===c))})).filter(g=>g.items.length>0);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",transition:"background 0.3s"}}>
      <div style={{background:t.restHeaderBg,padding:"20px 20px 16px",color:"white",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,flex:1,minWidth:0}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:"24px",flexShrink:0}}>←</button>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,letterSpacing:"-0.01em"}}>{isRatings?"Alle Bewertungen":"Alle Vorschläge"}</div>
            <div style={{fontSize:12,color:t.restHeaderSub,marginTop:4}}>{selCat?selCat.icon+" "+selCat.label:"Von dir und deinen Freunden · alle Gruppen"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:12}}>
          <button onClick={()=>setShowAdd(true)} title={isRatings?"Neu bewerten":"Neuer Vorschlag"} style={{background:t.modeSwitchBg,border:`1px solid ${t.modeSwitchBorder}`,borderRadius:18,padding:"5px 13px",cursor:"pointer",fontSize:16,fontWeight:700,color:"white"}}>+</button>
          <button onClick={()=>setShowCatMenu(true)} title="Kategorie wählen" style={{background:t.modeSwitchBg,border:`1px solid ${t.modeSwitchBorder}`,borderRadius:18,padding:"5px 11px",cursor:"pointer",fontSize:15}}>{currentIcon}</button>
          <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
        </div>
      </div>
      {showCatMenu&&(
        <SwipeableSheet onClose={()=>setShowCatMenu(false)} t={t} zIndex={300}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title,marginBottom:16,textAlign:"center"}}>Kategorie wählen</div>
            <button onClick={()=>chooseCat("")}
              style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:10,background:!catF?`${t.restNavActive}18`:t.innerCard,borderRadius:12,border:`1.5px solid ${!catF?t.restNavActive:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:24}}>⭐</span>
              <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:!catF?700:400,color:t.title,flex:1}}>Alle Kategorien</span>
              {!catF&&<span style={{color:t.restNavActive,fontSize:18}}>✓</span>}
            </button>
            {catSections.map(sec=>(
              <div key={sec.id} style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:t.sub,margin:"4px 2px 6px",fontFamily:"'Space Grotesk',sans-serif"}}>{sec.icon} {sec.label}</div>
                {sec.items.map(c=>(
                  <button key={c.id} onClick={()=>chooseCat(c.id)}
                    style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:8,background:catF===c.id?`${t.restNavActive}18`:t.innerCard,borderRadius:12,border:`1.5px solid ${catF===c.id?t.restNavActive:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                    <span style={{fontSize:24}}>{c.icon}</span>
                    <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:catF===c.id?700:400,color:t.title,flex:1}}>{c.label}</span>
                    {catF===c.id&&<span style={{color:t.restNavActive,fontSize:18}}>✓</span>}
                  </button>
                ))}
              </div>
            ))}
        </SwipeableSheet>
      )}
      {showAdd&&!addCat&&(
        <SwipeableSheet onClose={()=>setShowAdd(false)} t={t} zIndex={350}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title,marginBottom:6,textAlign:"center"}}>{isRatings?"Was möchtest du bewerten?":"Wofür ist dein Vorschlag?"}</div>
          <div style={{fontSize:12,color:t.sub,textAlign:"center",marginBottom:16}}>Wähle die Kategorie</div>
          {CATEGORY_GROUPS.map(g=>({...g,items:g.cats.filter(c=>activeCats.some(a=>a.id===c)).map(c=>activeCats.find(a=>a.id===c))})).filter(g=>g.items.length>0).map(sec=>(
            <div key={sec.id} style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:t.sub,margin:"4px 2px 6px",fontFamily:"'Space Grotesk',sans-serif"}}>{sec.icon} {sec.label}</div>
              {sec.items.map(c=>(
                <button key={c.id} onClick={()=>setAddCat(c)}
                  style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:8,background:t.innerCard,borderRadius:12,border:`1.5px solid ${t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:24}}>{c.icon}</span>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,color:t.title,flex:1}}>{c.label}</span>
                  <span style={{fontSize:16,color:t.tick}}>›</span>
                </button>
              ))}
            </div>
          ))}
        </SwipeableSheet>
      )}
      {showAdd&&addCat&&(
        <GlobalAddSheet cat={addCat} user={user} isRatings={isRatings} t={t}
          onClose={()=>{setAddCat(null);setShowAdd(false);}}
          onSaved={()=>{setAddCat(null);setShowAdd(false);setLoaded(false);setReloadKey(k=>k+1);}}/>
      )}
      {detail&&<GlobalDetailSheet entry={detail} isRatings={isRatings} t={t} onClose={()=>setDetail(null)}/>}
      <div style={{padding:"16px 16px 40px"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Suchen…"
          style={{width:"100%",padding:"11px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,outline:"none",background:t.inputBg,color:t.inputColor,marginBottom:10}}/>
        <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
          {selCat&&(
            <select value={k1F} onChange={e=>setK1F(e.target.value)} style={{...selStyle,...(k1F?selOn:{})}}>
              <option value="">{meta.l1}</option>
              {opts1.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          )}
          {selCat&&opts2.length>0&&(
            <select value={k2F} onChange={e=>setK2F(e.target.value)} style={{...selStyle,...(k2F?selOn:{})}}>
              <option value="">{meta.l2}</option>
              {opts2.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={selStyle}>
            {isRatings?(
              <>
                <option value="cat">Nach Kategorie</option>
                <option value="best">Beste zuerst</option>
                <option value="count">Meiste Wertungen</option>
                <option value="name">Name A–Z</option>
              </>
            ):(
              <>
                <option value="new">Neueste zuerst</option>
                <option value="cat">Nach Kategorie</option>
                <option value="name">Name A–Z</option>
              </>
            )}
          </select>
        </div>
        {!loaded&&<div style={{textAlign:"center",color:t.sub,fontSize:13,padding:"40px 0"}}>Lade…</div>}
        {loaded&&items.length===0&&(
          <div style={{textAlign:"center",padding:"48px 0",color:t.empty}}>
            <div style={{fontSize:44,marginBottom:10}}>{isRatings?"⭐":"💡"}</div>
            <div style={{fontSize:14}}>{isRatings?"Keine Bewertungen gefunden":"Keine Vorschläge gefunden"}</div>
          </div>
        )}
        {loaded&&items.map(x=>(
          <div key={x.cat.id+"_"+x.item.id} onClick={()=>setDetail(x)} style={{display:"flex",alignItems:"center",gap:12,background:t.card,borderRadius:14,border:`1px solid ${t.cardBorder}`,padding:"13px 14px",marginBottom:9,boxShadow:`0 1px 6px ${t.cardShadow}`,cursor:"pointer"}}>
            <span style={{fontSize:24}}>{x.cat.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14.5,fontWeight:600,color:t.title,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.item.name}</div>
              <div style={{fontSize:11.5,color:t.sub,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{[x.cat.label,subtitleOfCat(x.cat,x.item)].filter(Boolean).join(" · ")}</div>
              {!isRatings&&<div style={{fontSize:11,color:t.tick,marginTop:2}}>von {x.item.author}</div>}
            </div>
            {isRatings&&(
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.restAccent}}>{x.avg.stars}<span style={{fontSize:11,color:t.tick}}>/10</span></div>
                <div style={{fontSize:10,color:t.tick}}>{x.avg.count} Wertung{x.avg.count!==1?"en":""}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
