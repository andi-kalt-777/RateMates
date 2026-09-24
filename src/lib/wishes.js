// Kategorie-Wünsche: jeder schreibt nur seinen eigenen, lesen kann sie in der App niemand.
// Ausgewertet wird am PC mit `npm run wishes` (scripts/wishes.mjs).
//
// Datenbank:
//   category_requests/<Schlüssel>/name          = erster eingegebener Name
//   category_requests/<Schlüssel>/users/<Name>  = Anmerkung oder true
//   users/<Name>/wishes/<Schlüssel>             = true   (damit "Konto löschen" die eigenen findet)

// Schlüssel: gleiche Wünsche in anderer Schreibweise landen am selben Ort
export function wishKey(name){
  const k=name.toLowerCase().trim().replace(/[.#$/[\]]/g,"").replace(/\s+/g,"_").slice(0,60);
  return k||"unbenannt";
}

// Eigener Eintrag plus Verweis im Profil, als ein Mehrpfad-Update
export const wishUpdate=(user,key,note)=>({
  ["category_requests/"+key+"/users/"+user]:note.trim().slice(0,300)||true,
  ["users/"+user+"/wishes/"+key]:true,
});
export const removeWishesUpdate=(user,keys)=>Object.fromEntries(keys.flatMap(k=>[
  ["category_requests/"+k+"/users/"+user,null],
  ["users/"+user+"/wishes/"+k,null],
]));

// Rangliste für die Auswertung: meiste Stimmen zuerst, dann alphabetisch
export function rankWishes(data){
  return Object.entries(data||{})
    .map(([key,r])=>{
      const users=Object.entries(r?.users||{});
      return{
        key,name:r?.name||key,count:users.length,
        people:users.map(([u])=>u).sort((a,b)=>a.localeCompare(b,"de")),
        notes:users.filter(([,v])=>typeof v==="string"&&v).map(([u,v])=>u+": "+v),
      };
    })
    .filter(w=>w.count>0)
    .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"de"));
}
