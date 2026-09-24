// Leiste unten mit den fünf Hauptbereichen; bleibt auf allen Seiten stehen
const ICONS={
  start:<path d="M3.5 10.5 12 3.5l8.5 7V19.5a1 1 0 0 1-1 1h-4.8v-6h-5.4v6H4.5a1 1 0 0 1-1-1z"/>,
  ratings:<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>,
  sugg:<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.1h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>,
  groups:<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/></>,
  cats:<><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><path d="M17 13.5v7M13.5 17h7"/></>,
};
export const TABS=[
  ["start","Start"],["ratings","Bewertungen"],["sugg","Vorschläge"],["groups","Gruppen"],["cats","Kategorien"],
];
export function TabBar({tab,onTab,t}){
  return(
    <nav aria-label="Hauptmenü" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,zIndex:100,
      background:t.tabBg,borderTop:`1px solid ${t.navBorder}`,boxShadow:`0 -4px 20px ${t.navShadow}`,display:"flex",
      padding:"6px 4px calc(8px + env(safe-area-inset-bottom))",transition:"background 0.3s"}}>
      {TABS.map(([id,label])=>{
        const on=id===tab;
        return(
          <button key={id} onClick={()=>onTab(id)} aria-current={on?"page":undefined}
            style={{flex:1,minHeight:50,border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,color:on?t.tabActive:t.tabInactive}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[id]}</svg>
            <span style={{fontSize:10.5,fontWeight:on?700:500}}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
