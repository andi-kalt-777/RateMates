import {useState} from "react";
import EMBLEM from "../assets/emblem-hell.png";
import EMBLEM_DARK from "../assets/emblem-gold.png";
import {restrictToMembers} from "../lib/ratings.js";
import {useCategoryData} from "../lib/useCategoryData.js";
import {dashboardStats,relativeTime} from "../lib/activity.js";
import {initialsOf,UserMenu} from "../components/UserMenu.jsx";
import {Page} from "../components/PageHeader.jsx";
import {AddFlow,EntrySheet} from "../components/GlobalSheets.jsx";

// START: Bilanz, letzte eigene Bewertung, Neues von Freunden, meistbewertete Kategorien
export function Dashboard({user,friends,categories,dark,setDark,t,onTab,onLogout}){
  const data=useCategoryData({user,friends,categories});
  const {circle,activeDefs}=data;
  const [showAdd,setShowAdd]=useState(false);
  const [detail,setDetail]=useState(null);
  // Nur Wertungen von dir und deinen Freunden
  const ratingEntries=data.items.map(({def,item})=>({def,item:restrictToMembers(item,circle)}));
  const s=dashboardStats({ratingEntries,suggEntries:data.suggestions,user,friends:circle});
  const open=r=>setDetail({cat:r.def,item:r.item});

  const h2={margin:0,fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title};
  const card={background:t.card,border:`1px solid ${t.cardBorder}`,borderRadius:16,boxShadow:`0 2px 12px ${t.cardShadow}`};
  const link={background:"none",border:"none",padding:"6px 0",fontSize:13,fontWeight:600,color:t.link,cursor:"pointer"};
  const tile=(n,label,tab)=>(
    <button onClick={()=>onTab(tab)} style={{background:t.heroTile,border:"none",borderRadius:12,padding:"10px 12px",textAlign:"left",cursor:"pointer"}}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.heroText}}>{n}</div>
      <div style={{fontSize:11.5,color:t.heroSub}}>{label}</div>
    </button>
  );
  const row=(r,i,withWho)=>(
    <button key={r.def.id+r.item.id+r.rater} onClick={()=>open(r)}
      style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 0",background:"none",border:"none",borderTop:i?`1px solid ${t.cardBorder}`:"none",textAlign:"left",cursor:"pointer"}}>
      {withWho
        ?<div style={{width:36,height:36,flexShrink:0,borderRadius:18,background:t.tile,color:t.title,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700}}>{initialsOf(r.rater)}</div>
        :<div style={{width:48,height:48,flexShrink:0,borderRadius:14,background:t.tile,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{r.def.icon}</div>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:withWho?14:15,fontWeight:600,color:t.title,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{withWho?r.def.icon+" ":""}{r.item.name}</div>
        <div style={{fontSize:12,color:t.sub,marginTop:2}}>{[withWho?r.rater:null,r.def.label,relativeTime(r.time)].filter(Boolean).join(" · ")}</div>
      </div>
      <div style={{flexShrink:0}}><span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:withWho?18:22,fontWeight:700,color:t.link}}>{r.rating.stars}</span><span style={{fontSize:11,color:t.sub}}>/10</span></div>
    </button>
  );
  const emptyText=text=><div style={{fontSize:13,color:t.sub,padding:"14px 0",lineHeight:1.5}}>{text}</div>;
  const topMax=s.topCategories[0]?.n||1;
  return(
    <Page t={t}>
      <header style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <img src={dark?EMBLEM_DARK:EMBLEM} alt="RateMates" style={{width:46,height:46,objectFit:"contain"}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:23,fontWeight:700,letterSpacing:"-0.01em",color:t.title}}>Hallo {user}</div>
          <div style={{fontSize:13,color:t.sub,marginTop:2}}>Was hast du Neues probiert?</div>
        </div>
        <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
      </header>

      <section aria-label="Deine Bilanz" style={{background:t.heroBg,border:`1px solid ${t.heroBorder}`,borderRadius:20,padding:20,display:"flex",flexDirection:"column",gap:16,marginBottom:22}}>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:10}}>
          <div>
            <div style={{fontSize:12.5,fontWeight:600,color:t.heroSub}}>Deine Bilanz</div>
            <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:4}}>
              <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:44,fontWeight:700,lineHeight:1,color:t.heroText}}>{data.loaded?s.ownCount:"…"}</span>
              <span style={{fontSize:15,fontWeight:600,color:t.heroText}}>Bewertung{s.ownCount!==1?"en":""}</span>
            </div>
          </div>
          <button onClick={()=>setShowAdd(true)} style={{padding:"11px 16px",borderRadius:22,border:"none",background:t.heroBtn,color:t.heroBtnText,fontSize:13.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>+ Bewerten</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>
          {tile(s.categoryCount,s.categoryCount===1?"Kategorie":"Kategorien","ratings")}
          {tile(friends.length,friends.length===1?"Freund":"Freunde","friends")}
          {tile(s.openSuggestions,s.openSuggestions===1?"Vorschlag":"Vorschläge","sugg")}
        </div>
      </section>

      <section style={{marginBottom:22}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:6}}>
          <h2 style={h2}>Deine letzte Bewertung</h2>
          <button style={link} onClick={()=>onTab("ratings")}>Alle</button>
        </div>
        <div style={{...card,padding:"2px 16px"}}>
          {!data.loaded?emptyText("Lade…"):s.lastOwn?row(s.lastOwn,0,false)
            :emptyText(s.ownCount?"Deine bisherigen Wertungen haben noch kein Datum. Ab deiner nächsten erscheint sie hier.":"Du hast noch nichts bewertet. Leg los mit „+ Bewerten“.")}
        </div>
      </section>

      <section style={{marginBottom:22}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:6}}>
          <h2 style={h2}>Neu von deinen Freunden</h2>
          <button style={link} onClick={()=>onTab("ratings")}>Alle</button>
        </div>
        <div style={{...card,padding:"2px 16px"}}>
          {!data.loaded?emptyText("Lade…"):s.friendsLatest.length?s.friendsLatest.map((r,i)=>row(r,i,true))
            :friends.length?emptyText("Sobald deine Freunde etwas bewerten, siehst du es hier.")
            :<div style={{fontSize:13,color:t.sub,padding:"14px 0",lineHeight:1.5}}>Noch keine Freunde. <button style={{...link,padding:0}} onClick={()=>onTab("friends")}>Lade jemanden ein</button> und bewertet gemeinsam.</div>}
        </div>
      </section>

      {s.topCategories.length>0&&(
        <section>
          <h2 style={{...h2,marginBottom:10}}>Am meisten bewertet</h2>
          <div style={{...card,padding:"14px 16px",display:"flex",flexDirection:"column",gap:12}}>
            {s.topCategories.map(c=>(
              <div key={c.def.id} style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{width:24,fontSize:18,textAlign:"center"}}>{c.def.icon}</span>
                <span style={{width:100,fontSize:13,fontWeight:500,color:t.title}}>{c.def.label}</span>
                <div style={{flex:1,height:8,borderRadius:4,background:t.tile,overflow:"hidden"}}>
                  <div style={{width:Math.round(c.n/topMax*100)+"%",height:8,borderRadius:4,background:t.accent}}/>
                </div>
                <span style={{width:28,textAlign:"right",fontFamily:"'Space Grotesk',sans-serif",fontSize:14,fontWeight:700,color:t.title}}>{c.n}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {showAdd&&<AddFlow defs={activeDefs} user={user} isRatings dark={dark} t={t} onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);data.reload();}}/>}
      {detail&&<EntrySheet key={detail.cat.id+detail.item.id} entry={detail} isRatings user={user} dark={dark} t={t} onClose={()=>setDetail(null)} onChanged={data.reload}/>}
    </Page>
  );
}
