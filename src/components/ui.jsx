import React from "react";

// Shared UI
export function Slider({label,value,min,max,onChange,color,display,t}){
  const pct=((value-min)/(max-min))*100;
  return(
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label}}>{label}</span>
        <span style={{fontSize:22,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color}}>{display??value}</span>
      </div>
      <div style={{position:"relative",height:6,borderRadius:3,background:t.sliderTrack}}>
        <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:3,background:color,width:`${pct}%`,transition:"width 0.1s"}}/>
        <input type="range" min={min} max={max} value={value} onChange={e=>onChange(+e.target.value)}
          style={{position:"absolute",top:-8,left:0,width:"100%",height:22,opacity:0,cursor:"pointer",zIndex:2,margin:0}}/>
        <div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",left:`calc(${pct}% - 10px)`,width:20,height:20,borderRadius:"50%",background:color,boxShadow:`0 2px 8px ${color}55`,border:`3px solid ${t.thumb}`,transition:"left 0.1s",pointerEvents:"none"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
        <span style={{fontSize:10,color:t.tick}}>{min}</span>
        <span style={{fontSize:10,color:t.tick}}>{max}</span>
      </div>
    </div>
  );
}
export function Stars({value,t}){
  return(<div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{[...Array(10)].map((_,i)=><span key={i} style={{fontSize:14,color:i<Math.round(value)?"#e8a020":t.starEmpty}}>★</span>)}</div>);
}
export function Badge({value,max=10,color}){
  const d=typeof value==="number"&&!Number.isInteger(value)?value.toFixed(1):value;
  return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:12,background:`${color}22`,color,fontWeight:700,fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}}>{d}/{max}</span>;
}
export function Toast({msg,color,textColor}){
  if(!msg)return null;
  return <div style={{position:"fixed",bottom:96,left:"50%",transform:"translateX(-50%)",background:color,color:textColor,padding:"10px 20px",borderRadius:20,fontSize:13,fontWeight:600,zIndex:400,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>{msg}</div>;
}
export function TypeChips({value,onChange,options,chipOn,chipOnColor,t}){
  return(
    <>
      <div style={{fontSize:11,color:t.tick,marginBottom:8}}>Bis zu 3 auswählbar</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {options.map(c=>{
          const sel=value.includes(c);const disabled=!sel&&value.length>=3;
          return(<button key={c} onClick={()=>{if(disabled)return;onChange(sel?value.filter(x=>x!==c):[...value,c]);}}
            style={{padding:"7px 14px",borderRadius:20,fontSize:13,cursor:disabled?"not-allowed":"pointer",border:`1.5px solid ${sel?chipOn:t.chipBorder}`,background:sel?chipOn:t.chipBg,color:sel?chipOnColor:disabled?"#ccc":t.chipColor,opacity:disabled?0.4:1,transition:"all 0.15s"}}>{c}</button>);
        })}
      </div>
    </>
  );
}
export function FilterBar({filter,setFilter,col1,col2,col1Label,col2Label,extra=[],filterOn,filterOnColor,t}){
  const hasActive=Object.values(filter).some(Boolean);
  const dropdowns=[["k1",col1Label||"Filter 1",col1]];
  if(col2&&col2.length>0)dropdowns.push(["k2",col2Label||"Filter 2",col2]);
  dropdowns.push(...extra);
  return(
    <>
      <div style={{position:"relative",marginBottom:12}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>🔍</span>
        <input value={filter.search} onChange={e=>setFilter(p=>({...p,search:e.target.value}))} placeholder="Suchen…"
          style={{width:"100%",padding:"11px 14px 11px 40px",borderRadius:12,fontSize:14,border:`1.5px solid ${filter.search?filterOn:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>
        {filter.search&&<button onClick={()=>setFilter(p=>({...p,search:""}))} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:16,cursor:"pointer",color:t.sub}}>×</button>}
      </div>
      {dropdowns.some(([,,opts])=>opts.length>0)&&(
        <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
          {dropdowns.map(([key,ph,opts])=>(
            <select key={key} value={filter[key]||""} onChange={e=>setFilter(p=>({...p,[key]:e.target.value}))}
              style={{padding:"7px 10px",borderRadius:20,border:`1px solid ${filter[key]?filterOn:t.filterBorder}`,background:filter[key]?filterOn:t.filterBg,color:filter[key]?filterOnColor:t.filterColor,fontSize:12,cursor:"pointer",outline:"none",flexShrink:0}}>
              <option value="">{ph}</option>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          ))}
        </div>
      )}
      {hasActive&&<div style={{marginBottom:12}}><button onClick={()=>setFilter(Object.fromEntries(Object.keys(filter).map(k=>[k,""])))} style={{fontSize:11,color:t.restAccent,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Filter zurücksetzen</button></div>}
    </>
  );
}
export function SwipeableSheet({onClose,t,children,zIndex}){
  const {useState:uS,useRef:uR}=React;
  const [dragY,setDragY]=uS(0);
  const startY=uR(null);
  const sheetRef=uR(null);
  const canDrag=uR(false);
  const onTouchStart=e=>{
    const rect=sheetRef.current.getBoundingClientRect();
    const inGrip=e.touches[0].clientY-rect.top<=60;
    // Entscheidung einmal am Gestenbeginn: Ziehen nur, wenn oben gescrollt oder am Griff
    canDrag.current=inGrip||sheetRef.current.scrollTop<=0;
    startY.current=e.touches[0].clientY;
  };
  const onTouchMove=e=>{
    if(startY.current===null||!canDrag.current)return;
    const delta=e.touches[0].clientY-startY.current;
    if(delta>0){
      setDragY(delta);
      if(e.cancelable)e.preventDefault();
    }else if(dragY!==0){
      setDragY(0);
    }
  };
  const onTouchEnd=()=>{
    if(dragY>110)onClose();
    setDragY(0);startY.current=null;canDrag.current=false;
  };
  return(
    <div style={{position:"fixed",inset:0,background:`rgba(0,0,0,${Math.max(0,0.65-(dragY/300)*0.65)})`,zIndex:zIndex||100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div ref={sheetRef} onClick={e=>e.stopPropagation()}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{background:t.modal,borderRadius:"24px 24px 0 0",padding:"28px 24px 40px",width:"100%",maxWidth:440,maxHeight:"85dvh",overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",transform:`translateY(${dragY}px)`,transition:dragY===0?"transform 0.3s":"none",willChange:"transform"}}>
        <div style={{width:40,height:4,background:t.handle,borderRadius:2,margin:"0 auto 20px",cursor:"grab"}}/>
        {children}
      </div>
    </div>
  );
}
