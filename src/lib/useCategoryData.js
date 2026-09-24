import {useState,useEffect,useCallback} from "react";
import {db} from "../firebase.js";
import {DEFINITIONS} from "../categories/index.js";
import {normalizeItem} from "../categories/logic.js";

// Lädt Bewertungen und/oder Vorschläge aller Standard-Kategorien, die in den eigenen
// Gruppen aktiv sind. Einträge kommen als {def, item}, Bewertungen normalisiert
// (Altformat der Restaurants), aber noch nicht auf Freunde eingeschränkt.
export function useCategoryData({groups,user,items=true,suggestions=true}){
  const my=groups.filter(g=>g.members&&g.members[user]);
  const friends=[...new Set(my.flatMap(g=>Object.keys(g.members||{})))];
  const activeDefs=DEFINITIONS.filter(d=>my.some(g=>g.categories?.[d.id]));
  const activeKey=activeDefs.map(d=>d.id).join(",");
  const [state,setState]=useState({loaded:false,items:[],suggestions:[]});
  const [reloadKey,setReloadKey]=useState(0);
  const reload=useCallback(()=>setReloadKey(k=>k+1),[]);
  useEffect(()=>{
    let cancelled=false;
    const get=p=>db.ref(p).get().then(s=>s.val()||{}).catch(()=>({}));
    const load=async(key,norm)=>{
      const res=await Promise.all(activeDefs.map(def=>get(def.paths[key]).then(data=>
        Object.values(data).filter(it=>it&&it.name).map(it=>({def,item:norm?normalizeItem(def,it):it})))));
      return res.flat();
    };
    Promise.all([items?load("items",true):[],suggestions?load("suggestions",false):[]])
      .then(([i,s])=>{if(!cancelled)setState({loaded:true,items:i,suggestions:s});})
      .catch(()=>{if(!cancelled)setState(p=>({...p,loaded:true}));});
    const tm=setTimeout(()=>{if(!cancelled)setState(p=>({...p,loaded:true}));},8000);
    return()=>{cancelled=true;clearTimeout(tm);};
  },[activeKey,reloadKey,items,suggestions]); // activeDefs ändert sich nur mit activeKey
  return{...state,reload,friends,activeDefs,myGroups:my};
}
