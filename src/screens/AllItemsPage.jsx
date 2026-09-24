import {useState} from "react";
import {restrictToMembers} from "../lib/ratings.js";
import {DEFINITIONS} from "../categories/index.js";
import {average,subtitle,filterMeta,cityOf,cityKey,cityOptions} from "../categories/logic.js";
import {useCategoryData} from "../lib/useCategoryData.js";
import {UserMenu} from "../components/UserMenu.jsx";
import {Page,PageHeader,PlusButton,Chips} from "../components/PageHeader.jsx";
import {AddFlow,GlobalAddSheet,GlobalDetailSheet} from "../components/GlobalSheets.jsx";

// Gewählte Stadt gilt für Bewertungen und Vorschläge und bleibt auf diesem Gerät gespeichert
const CITY_KEY="rm_city";
const loadCity=()=>{try{return localStorage.getItem(CITY_KEY)||"";}catch{return "";}};
const saveCity=c=>{try{if(c)localStorage.setItem(CITY_KEY,c);else localStorage.removeItem(CITY_KEY);}catch{}};

// BEWERTUNGEN bzw. VORSCHLÄGE: alles aus allen eigenen Gruppen
export function AllItemsPage({type,user,groups,dark,setDark,t,onLogout}){
  const isRatings=type==="ratings";
  const data=useCategoryData({groups,user,items:isRatings,suggestions:!isRatings});
  const {friends,activeDefs}=data;
  const [catF,setCatF]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [convert,setConvert]=useState(null);
  const [detail,setDetail]=useState(null);
  const [k1F,setK1F]=useState("");
  const [k2F,setK2F]=useState("");
  const [sortBy,setSortBy]=useState(isRatings?"best":"new");
  const [search,setSearch]=useState("");
  const [city,setCityState]=useState(loadCity);
  // Bei gewählter Stadt passen nur Orts-Kategorien; eine andere gewählte Kategorie wird aufgehoben
  const setCity=c=>{
    setCityState(c);saveCity(c);setK1F("");
    if(c&&catF&&!activeDefs.find(d=>d.id===catF)?.field1.place)setCatF("");
  };
  const chooseCat=id=>{setCatF(id);setK1F("");setK2F("");};

  let items=[];
  if(isRatings){
    for(const {def,item} of data.items){
      const vis=restrictToMembers(item,friends);
      const avg=average(def,vis);
      if(avg.count>0)items.push({cat:def,item:vis,avg});
    }
  }else{
    for(const {def,item} of data.suggestions)if(item.author&&friends.includes(item.author))items.push({cat:def,item});
  }
  // Städte aus allen Orts-Kategorien; eine gespeicherte Stadt ohne Einträge bleibt wählbar
  const cities=cityOptions(items);
  if(city&&!cities.some(c=>cityKey(c)===cityKey(city)))cities.unshift(city);
  const chipDefs=city?activeDefs.filter(d=>d.field1.place):activeDefs;
  const selCat=activeDefs.find(c=>c.id===catF)||null;
  const meta=selCat?filterMeta(selCat):null;
  const catItems=selCat?items.filter(x=>x.cat.id===selCat.id):[];
  const opts1=selCat?[...new Set(catItems.map(x=>meta.g1(x.item)).filter(Boolean))].sort():[];
  const opts2=selCat?[...new Set(catItems.flatMap(x=>meta.g2(x.item)))].sort():[];
  const q=search.trim().toLowerCase();
  items=items.filter(x=>(!catF||x.cat.id===catF)
    &&(!city||cityKey(cityOf(x.cat,x.item))===cityKey(city))
    &&(!q||x.item.name.toLowerCase().includes(q))
    &&(!selCat||!k1F||meta.g1(x.item)===k1F)
    &&(!selCat||!k2F||meta.g2(x.item).includes(k2F)));
  const ci=x=>DEFINITIONS.findIndex(c=>c.id===x.cat.id);
  items.sort((a,b)=>{
    if(sortBy==="cat"){const c=ci(a)-ci(b);if(c!==0)return c;return isRatings?(b.avg.stars-a.avg.stars):a.item.name.localeCompare(b.item.name);}
    if(sortBy==="best")return b.avg.stars-a.avg.stars;
    if(sortBy==="count")return b.avg.count-a.avg.count;
    if(sortBy==="city"){
      // Einträge ohne Stadt (Filme, Whisky …) ans Ende
      const ca=cityOf(a.cat,a.item),cb=cityOf(b.cat,b.item);
      if(!ca!==!cb)return ca?-1:1;
      const c=(ca||"").localeCompare(cb||"","de");
      return c!==0?c:a.item.name.localeCompare(b.item.name);
    }
    if(sortBy==="new")return String(b.item.id).localeCompare(String(a.item.id));
    return a.item.name.localeCompare(b.item.name);
  });

  const selStyle={padding:"8px 12px",borderRadius:20,border:`1px solid ${t.filterBorder}`,background:t.filterBg,color:t.filterColor,fontSize:12.5,cursor:"pointer",outline:"none",flexShrink:0};
  const selOn={background:t.restFilterOn,color:t.restFilterOnColor,border:`1px solid ${t.restFilterOn}`};
  const saved=()=>{setShowAdd(false);setConvert(null);data.reload();};
  return(
    <Page t={t}>
      <PageHeader t={t} title={isRatings?"Bewertungen":"Vorschläge"}
        subtitle={isRatings?"Von dir und deinen Freunden · alle Gruppen":"Ideen für das nächste Mal"}
        right={<>
          <PlusButton t={t} label={isRatings?"Neu bewerten":"Neuer Vorschlag"} onClick={()=>setShowAdd(true)}/>
          <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
        </>}/>
      <div style={{display:"flex",alignItems:"center",gap:10,background:t.card,border:`1.5px solid ${t.inputBorder}`,borderRadius:14,padding:"0 14px",height:46,marginBottom:12}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.sub} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suchen…" aria-label={isRatings?"Bewertungen durchsuchen":"Vorschläge durchsuchen"}
          style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:15,color:t.inputColor}}/>
      </div>
      <Chips t={t} value={catF} onChange={chooseCat} items={[["","Alle"],...chipDefs.map(d=>[d.id,d.icon+" "+d.label])]}/>
      <div className="hscroll" style={{display:"flex",gap:8,marginBottom:14,overflowX:"auto",paddingBottom:2,alignItems:"center"}}>
        {cities.length>0&&(
          <select value={city} onChange={e=>setCity(e.target.value)} aria-label="Stadt" style={{...selStyle,fontWeight:600,...(city?selOn:{})}}>
            <option value="">📍 Alle Städte</option>
            {cities.map(c=><option key={c} value={c}>📍 {c}</option>)}
          </select>
        )}
        {selCat&&!selCat.field1.place&&opts1.length>0&&(
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
        <span style={{flex:1,fontSize:12.5,color:t.sub,whiteSpace:"nowrap"}}>{data.loaded?items.length+(isRatings?" Einträge":" Vorschläge"):""}</span>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} aria-label="Sortierung" style={selStyle}>
          {isRatings?(<>
            <option value="best">Beste zuerst</option>
            <option value="cat">Nach Kategorie</option>
            <option value="city">Nach Stadt</option>
            <option value="count">Meiste Wertungen</option>
            <option value="name">Name A–Z</option>
          </>):(<>
            <option value="new">Neueste zuerst</option>
            <option value="cat">Nach Kategorie</option>
            <option value="city">Nach Stadt</option>
            <option value="name">Name A–Z</option>
          </>)}
        </select>
      </div>
      {!data.loaded&&<div style={{textAlign:"center",color:t.sub,fontSize:13,padding:"40px 0"}}>Lade…</div>}
      {data.loaded&&items.length===0&&(
        <div style={{textAlign:"center",padding:"48px 0",color:t.empty}}>
          <div style={{fontSize:44,marginBottom:10}}>{isRatings?"⭐":"💡"}</div>
          <div style={{fontSize:14}}>{isRatings?"Keine Bewertungen gefunden":"Keine Vorschläge gefunden"}</div>
        </div>
      )}
      {data.loaded&&items.map(x=>(
        <div key={x.cat.id+"_"+x.item.id} onClick={()=>setDetail(x)}
          style={{display:"flex",alignItems:"center",gap:14,background:t.card,borderRadius:16,border:`1px solid ${t.cardBorder}`,padding:"12px 14px 12px 12px",marginBottom:10,boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer"}}>
          <div style={{width:44,height:44,flexShrink:0,borderRadius:13,background:t.tile,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{x.cat.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:600,color:t.title,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.item.name}</div>
            <div style={{fontSize:12,color:t.sub,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{[x.cat.label,subtitle(x.cat,x.item)].filter(Boolean).join(" · ")}</div>
            {!isRatings&&<div style={{fontSize:11.5,color:t.sub,marginTop:2}}>von {x.item.author===user?"dir":x.item.author}</div>}
          </div>
          {isRatings?(
            <div style={{textAlign:"right",flexShrink:0}}>
              <div><span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.link}}>{x.avg.stars}</span><span style={{fontSize:11,color:t.sub}}>/10</span></div>
              <div style={{fontSize:11,color:t.sub}}>{x.avg.count} Wertung{x.avg.count!==1?"en":""}</div>
            </div>
          ):(
            <button onClick={e=>{e.stopPropagation();setConvert(x);}}
              style={{flexShrink:0,minHeight:36,padding:"0 12px",borderRadius:18,border:`1.5px solid ${t.accent}`,background:"transparent",color:t.link,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Bewerten</button>
          )}
        </div>
      ))}
      {showAdd&&<AddFlow defs={activeDefs} user={user} isRatings={isRatings} dark={dark} t={t} onClose={()=>setShowAdd(false)} onSaved={saved}/>}
      {convert&&<GlobalAddSheet def={convert.cat} fromSuggestion={convert.item} user={user} isRatings dark={dark} t={t} onClose={()=>setConvert(null)} onSaved={saved}/>}
      {detail&&<GlobalDetailSheet entry={detail} isRatings={isRatings} t={t} onClose={()=>setDetail(null)}/>}
    </Page>
  );
}
