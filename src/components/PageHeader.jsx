// Seitenkopf der Hauptbereiche: Titel, Unterzeile, rechts Aktionen
export function PageHeader({title,subtitle,right,t}){
  return(
    <header style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
      <div style={{flex:1,minWidth:0}}>
        <h1 style={{margin:0,fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,letterSpacing:"-0.01em",color:t.title}}>{title}</h1>
        {subtitle&&<div style={{fontSize:13,color:t.sub,marginTop:2}}>{subtitle}</div>}
      </div>
      {right&&<div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>{right}</div>}
    </header>
  );
}
// Runder Plus-Knopf in Akzentfarbe
export function PlusButton({onClick,label,t}){
  return(
    <button onClick={onClick} aria-label={label} title={label}
      style={{width:44,height:44,borderRadius:22,border:"none",background:t.accent,color:t.onAccent,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
    </button>
  );
}
// Auswahl-Chips (Kategorien, Filter), waagerecht scrollbar
export function Chips({items,value,onChange,t}){
  return(
    <div className="hscroll" style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:12}}>
      {items.map(([id,label])=>{
        const on=id===value;
        return(
          <button key={id} onClick={()=>onChange(id)}
            style={{flexShrink:0,padding:"8px 14px",borderRadius:20,border:`1.5px solid ${on?t.accent:t.cardBorder}`,background:on?t.accent:t.card,color:on?t.onAccent:t.title,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{label}</button>
        );
      })}
    </div>
  );
}
// Seitenrahmen der Hauptbereiche: Hintergrund, Breite, Platz für die Leiste unten
export function Page({t,children}){
  return(
    <div style={{minHeight:"100vh",background:t.bg,transition:"background 0.3s"}}>
      <main style={{maxWidth:440,margin:"0 auto",padding:"22px 18px calc(100px + env(safe-area-inset-bottom))"}}>{children}</main>
    </div>
  );
}
