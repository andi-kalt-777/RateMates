import {CATEGORY_DEFS,CATEGORY_GROUPS} from "../categories/index.js";

// Kategorien zum An- und Abhaken, nach Obergruppen; value = {id: true}
export function CategoryPicker({value,onToggle,t}){
  return(
    <div>
      {CATEGORY_GROUPS.filter(g=>g.cats.length>0).map(grp=>(
        <div key={grp.id} style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:t.sub,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>{grp.icon} {grp.label}</div>
          {grp.cats.map(id=>{
            const def=CATEGORY_DEFS[id];
            const on=!!value[id];
            return(
              <button key={id} onClick={()=>onToggle(id,!on)} aria-pressed={on}
                style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 16px",marginBottom:8,background:on?`${t.accent}14`:t.card,borderRadius:12,border:`1.5px solid ${on?t.accent:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:22}}>{def.icon}</span>
                <span style={{fontSize:14,fontWeight:on?600:400,color:t.title,flex:1}}>{def.label}</span>
                <span style={{width:22,height:22,borderRadius:6,border:`2px solid ${on?t.accent:t.inputBorder}`,background:on?t.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:t.onAccent,fontSize:13,fontWeight:700}}>{on?"✓":""}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
