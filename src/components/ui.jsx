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
