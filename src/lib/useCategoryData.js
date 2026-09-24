import {useState,useEffect,useCallback} from "react";
import {db} from "../firebase.js";
import {normalizeItem} from "../categories/logic.js";
import {activeDefinitions} from "./friends.js";

// Lädt Bewertungen und/oder Vorschläge aller eigenen Kategorien. Einträge kommen als
// {def, item}, Bewertungen normalisiert (Altformat der Restaurants), aber noch nicht
// eingeschränkt. circle = du und deine Freunde; damit filtern die Ansichten.
export function useCategoryData({user,friends,categories,items=true,suggestions=true}){
  const circle=[user,...friends];
  const activeDefs=activeDefinitions(categories);
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
  return{...state,reload,circle,activeDefs};
}
