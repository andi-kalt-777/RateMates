// Eigene Gruppen zum Sortieren der Freunde ("Montagsrunde", "Familie" …). Nur für
// einen selbst sichtbar, freiwillig; ein Freund kann in mehreren Gruppen stehen.
// Datenbank: users/<Name>/friendGroups/<id> = {name, members: {<Freund>: true}}
// (unter dem eigenen Profil, das nur der Besitzer lesen und schreiben darf).

export const GROUP_NAME_MAX=30;
const byName=(a,b)=>a.localeCompare(b,"de");

export const cleanGroupName=input=>input.trim().replace(/\s+/g," ").slice(0,GROUP_NAME_MAX);

// Fehlertext oder null
export function groupNameError(name,groups,ownId){
  if(!name)return "Bitte gib der Gruppe einen Namen.";
  const taken=Object.entries(groups||{}).some(([id,g])=>id!==ownId&&g?.name?.toLowerCase()===name.toLowerCase());
  return taken?"Eine Gruppe mit diesem Namen gibt es schon.":null;
}

export const newGroupId=(now=Date.now(),rand=Math.random())=>"g"+now.toString(36)+rand.toString(36).slice(2,6);

export const groupRecord=(name,members)=>({name,members:Object.fromEntries(members.map(m=>[m,true]))});

// Gruppen alphabetisch, darin nur aktuelle Freunde; dazu alle Freunde ohne Gruppe
export function sortIntoGroups(groups,friends){
  const isFriend=new Set(friends);
  const list=Object.entries(groups||{})
    .filter(([,g])=>g&&g.name)
    .map(([id,g])=>({id,name:g.name,members:Object.keys(g.members||{}).filter(n=>isFriend.has(n)).sort(byName)}))
    .sort((a,b)=>byName(a.name,b.name));
  const grouped=new Set(list.flatMap(g=>g.members));
  return{groups:list,ungrouped:friends.filter(f=>!grouped.has(f))};
}

// Beim Beenden einer Freundschaft aus allen eigenen Gruppen austragen
export function removeFromGroupsUpdate(me,groups,friend){
  const upd={};
  for(const [id,g] of Object.entries(groups||{})){
    if(g?.members?.[friend])upd["users/"+me+"/friendGroups/"+id+"/members/"+friend]=null;
  }
  return upd;
}
