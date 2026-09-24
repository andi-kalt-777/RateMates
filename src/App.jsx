import React,{useState,useEffect} from "react";
import {firebase,db,auth} from "./firebase.js";
import LOGO_SRC from "./assets/logo-hell.png";
import LOGO_SRC_DARK from "./assets/logo-gold.png";


// Auth Helpers
async function sha256(str){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str));
  return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
const hashPw=(user,pw)=>sha256(user.toLowerCase()+":"+pw);
const validUsername=n=>/^[A-Za-z0-9 _-]{2,20}$/.test(n);

// Firebase Authentication: Benutzernamen werden auf technische E-Mail-Adressen abgebildet
// (z. B. "Gabi kalthoefer" -> gabi.kalthoefer@ratemates.invalid). Die Adressen existieren
// nicht, Firebase braucht sie nur als Kennung. Der Benutzername bleibt überall der Schlüssel.
// Datenbank: users/<Name>/uid, uids/<uid> = Name, names/<name klein> = Name (Eindeutigkeit).
const authEmail=n=>n.trim().toLowerCase().replace(/ /g,".")+"@ratemates.invalid";
const nameKey=n=>n.trim().toLowerCase();
// Echte E-Mail hinterlegt? Dann meldet sich das Konto mit dieser Adresse an und kann
// ein vergessenes Passwort per Mail zurücksetzen. Die Adresse liegt nur in Firebase Auth.
const hasRealEmail=u=>!!(u&&u.email&&!u.email.endsWith("@ratemates.invalid"));
const validEmail=m=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m);
const readOnce=path=>new Promise((res,rej)=>db.ref(path).once("value",s=>res(s.val()),rej));
const loginError=msg=>Object.assign(new Error(msg),{msg});
const NO_ACCOUNT_CODES=["auth/user-not-found","auth/invalid-credential","auth/invalid-login-credentials","auth/wrong-password"];
const authErrorMsg=(e,fallback)=>{
  const c=(e&&e.code)||"";
  if(c==="auth/network-request-failed")return "Verbindungsfehler. Bitte erneut versuchen.";
  if(c==="auth/too-many-requests")return "Zu viele Versuche. Bitte kurz warten.";
  if(c==="auth/operation-not-allowed"||c==="auth/configuration-not-found")return "Anmeldung per Passwort ist in Firebase nicht freigeschaltet.";
  if(c==="auth/weak-password")return "Passwort zu kurz (mindestens 6 Zeichen).";
  if(c==="auth/invalid-email")return "Das ist keine gültige E-Mail-Adresse.";
  if(c==="auth/email-already-in-use")return "Diese E-Mail-Adresse gehört schon zu einem anderen Konto.";
  if(c==="auth/requires-recent-login")return "Bitte melde dich einmal ab und wieder an.";
  return fallback;
};
// Nach erfolgreicher Firebase-Anmeldung: Verknüpfung uid <-> Benutzername sicherstellen.
// Ein altes Konto (nur pwHash, noch keine uid) wird dabei umgezogen. Die Datenbankregel
// lässt das nur zu, wenn der mitgeschickte Hash zum gespeicherten passt.
async function completeLogin(n,pw){
  const uid=auth.currentUser.uid;
  const linked=await readOnce("users/"+n+"/uid");
  if(linked===null){
    const created=await readOnce("users/"+n+"/createdAt");
    if(created===null)throw loginError("Benutzer nicht gefunden.");
    const h=await hashPw(n,pw);
    try{await db.ref("users/"+n).update({uid,pwHash:h});}
    catch{throw loginError("Falsches Passwort.");}
  }else if(linked!==uid){
    throw loginError("Falsches Passwort. Hast du eine E-Mail-Adresse hinterlegt? Dann melde dich damit an.");
  }
  await db.ref("uids/"+uid).set(n).catch(()=>{});
  await db.ref("names/"+nameKey(n)).set(n).catch(()=>{});
  // Anzeigename für die Anrede in Firebase-Mails (%DISPLAY_NAME%)
  if(auth.currentUser.displayName!==n)await auth.currentUser.updateProfile({displayName:n}).catch(()=>{});
  await db.ref("users/"+n+"/pwHash").remove().catch(()=>{});
  await db.ref("users/"+n+"/seeded").remove().catch(()=>{});
}

// Daten-Helpers
// Jede eigene Wertung bekommt beim Speichern die Serverzeit (für "letzte Bewertung" im künftigen Dashboard)
const stamped=r=>({...r,ratedAt:firebase.database.ServerValue.TIMESTAMP});
function normalizeRest(r){
  if(r.ratings){
    if(r.author&&r.food!==undefined&&!r.ratings[r.author]){
      return{...r,ratings:{[r.author]:{food:r.food??5,service:r.service??5,price:r.price??3,stars:r.stars??7},...r.ratings}};
    }
    return r;
  }
  return{...r,ratings:r.author?{[r.author]:{food:r.food??5,service:r.service??5,price:r.price??3,stars:r.stars??7}}:{}};
}
function dupKey(name,f1){return (name||"").trim().toLowerCase()+"|"+(f1||"").trim().toLowerCase();}
function restrictToMembers(item,members){
  return{...item,ratings:Object.fromEntries(Object.entries(item.ratings||{}).filter(([k])=>members.includes(k)))};
}
function getAvgRest(r){
  const vals=Object.values(r.ratings||{});
  if(!vals.length)return{food:0,service:0,price:0,stars:0,avg:0,count:0};
  const n=vals.length;
  const food=+(vals.reduce((s,x)=>s+x.food,0)/n).toFixed(1);
  const service=+(vals.reduce((s,x)=>s+x.service,0)/n).toFixed(1);
  const price=Math.round(vals.reduce((s,x)=>s+x.price,0)/n);
  const stars=+(vals.reduce((s,x)=>s+x.stars,0)/n).toFixed(1);
  return{food,service,price,stars,avg:+((food+service)/2).toFixed(1),count:n};
}
function getAvgWhisky(w){
  const vals=Object.values(w.ratings||{});
  if(!vals.length)return{stars:0,rauchigkeit:0,fruchtigkeit:0,count:0};
  const n=vals.length;
  return{stars:+(vals.reduce((s,x)=>s+x.stars,0)/n).toFixed(1),rauchigkeit:+(vals.reduce((s,x)=>s+x.rauchigkeit,0)/n).toFixed(1),fruchtigkeit:+(vals.reduce((s,x)=>s+x.fruchtigkeit,0)/n).toFixed(1),count:n};
}
function getAvgMedia(x){
  const vals=Object.values(x.ratings||{});
  if(!vals.length)return{stars:0,handlung:0,spannung:0,count:0};
  const n=vals.length;
  return{stars:+(vals.reduce((s,v)=>s+v.stars,0)/n).toFixed(1),handlung:+(vals.reduce((s,v)=>s+v.handlung,0)/n).toFixed(1),spannung:+(vals.reduce((s,v)=>s+v.spannung,0)/n).toFixed(1),count:n};
}

// Konstanten
const CUISINES=["Italienisch","Japanisch","Chinesisch","Indisch","Mexikanisch","Französisch","Griechisch","Türkisch","Deutsch","Amerikanisch","Thai","Vietnamesisch","Spanisch","Libanesisch","Koreanisch","Polnisch","Sushi","Burger","Fusion","Frühstück","Brunch","Andere"];
const WHISKY_TYPES=["Single Malt","Blended Malt","Blended Scotch","Bourbon","Rye Whiskey","Irish Whiskey","Japanese Whisky","Highlands","Speyside","Islay","Islands","Lowlands","Campbeltown","Amerikanisch","Kanadisch","Andere"];
const MEDIA_GENRES=["Action","Abenteuer","Animation","Biografie","Dokumentation","Drama","Fantasy","Horror","Komödie","Krimi","Musical","Romance","Science-Fiction","Thriller","Western","Andere"];
const BOOK_GENRES=["Roman","Krimi","Thriller","Fantasy","Science-Fiction","Historisch","Biografie","Sachbuch","Ratgeber","Klassiker","Abenteuer","Horror","Romance","Kinder / Jugend","Andere"];
const CAFE_TYPES=["Café","Rösterei-Café","Bäckerei / Konditorei","Frühstück / Brunch","Eiscafé","Teehaus","Andere"];
const BAR_TYPES=["Cocktailbar","Pub / Kneipe","Weinbar","Biergarten","Rooftop-Bar","Sportsbar","Shisha-Bar","Club","Andere"];
const ICE_TYPES=["Eisdiele","Eiscafé","Frozen Yogurt","Softeis","Veganes Eis","Andere"];
const DELIVERY_TYPES=["Pizza","Burger","Sushi","Asiatisch","Italienisch","Döner / Türkisch","Indisch","Vietnamesisch","Amerikanisch","Vegetarisch / Vegan","Andere"];
const BEER_TYPES=["Pils","Helles","Weizen","Kölsch","Alt","Lager","IPA","Pale Ale","Stout / Porter","Bock","Radler","Alkoholfrei","Andere"];
const WINE_TYPES=["Rotwein","Weißwein","Rosé","Sekt / Schaumwein","Champagner","Riesling","Spätburgunder","Merlot","Chardonnay","Sauvignon Blanc","Trocken","Halbtrocken","Lieblich","Andere"];
const TEA_TYPES=["Schwarzer Tee","Grüner Tee","Kräutertee","Früchtetee","Weißer Tee","Oolong","Chai","Rooibos","Eistee","Andere"];
const MATCHA_TYPES=["Ceremonial Grade","Premium Grade","Culinary Grade","Matcha Latte","Eis-Matcha","Bio","Japan","Andere"];
const COFFEE_TYPES=["Kaffeebohne","Espressobohne","Filterkaffee","Instant","Mokka","Cold Brew","Entkoffeiniert","Arabica","Robusta","Liberica","Excelsa","Andere"];
const GIN_TYPES=["London Dry","Dry Gin","Old Tom","Plymouth","Sloe Gin","Navy Strength","New Western / Contemporary","Barrel Aged","Pink Gin","Genever","Andere"];
const RUM_TYPES=["White / Silver","Gold","Dark","Aged / Añejo","Spiced","Overproof","Rhum Agricole","Navy","Cachaça","Andere"];
const VODKA_TYPES=["Getreide","Weizen","Roggen","Kartoffel","Trauben","Mais","Bio","Aromatisiert","Premium","Andere"];
const PRICE_LABELS=["","Sehr günstig","Günstig","Mittel","Teuer","Sehr teuer"];
const EMPTY_REST={city:"",name:"",cuisines:[],service:5,food:5,price:3,stars:7,kommentar:""};
const EMPTY_RATING={service:5,food:5,price:3,stars:7,kommentar:""};
const EMPTY_SUGG={city:"",name:"",cuisines:[]};
const EMPTY_WHISKY={name:"",distillery:"",types:[],stars:7,rauchigkeit:5,fruchtigkeit:5,kommentar:""};
const EMPTY_W_RATING={stars:7,rauchigkeit:5,fruchtigkeit:5,kommentar:""};
const EMPTY_W_SUGG={name:"",distillery:"",types:[]};
const EMPTY_MEDIA={name:"",field1:"",genres:[],stars:7,handlung:5,spannung:5,kommentar:""};
const EMPTY_MEDIA_RATING={stars:7,handlung:5,spannung:5,kommentar:""};
const EMPTY_MEDIA_SUGG={name:"",field1:"",genres:[]};

const CATEGORY_DEFS={
  restaurant:{icon:"🍽️",label:"Restaurants"},
  whisky:{icon:"🥃",label:"Whiskys"},
  film:{icon:"🎬",label:"Filme"},
  serie:{icon:"📺",label:"Serien"},
  coffee:{icon:"☕",label:"Kaffee"},
  beer:{icon:"🍺",label:"Bier"},
  wine:{icon:"🍷",label:"Wein"},
  tea:{icon:"🫖",label:"Tee"},
  matcha:{icon:"🍵",label:"Matcha"},
  gin:{icon:"🍸",label:"Gin"},
  rum:{icon:"🥂",label:"Rum"},
  vodka:{icon:"🧊",label:"Vodka"},
  book:{icon:"📚",label:"Bücher"},
  audiobook:{icon:"🎧",label:"Hörbücher"},
  cafe:{icon:"🍰",label:"Cafés"},
  bar:{icon:"🍹",label:"Bars"},
  icecream:{icon:"🍦",label:"Eisdielen"},
  delivery:{icon:"🛵",label:"Lieferservices"},
};
const CATEGORY_GROUPS=[
  {id:"lokal",icon:"📍",label:"Lokalitäten",cats:["restaurant","cafe","bar","icecream","delivery"]},
  {id:"unterhaltung",icon:"🎭",label:"Unterhaltung",cats:["film","serie","book","audiobook"]},
  {id:"spirituosen",icon:"🥃",label:"Spirituosen",cats:["whisky","gin","rum","vodka"]},
  {id:"genuss",icon:"😋",label:"Genuss",cats:["coffee","beer","wine","tea","matcha"]},
  {id:"freizeit",icon:"🌿",label:"Freizeit",cats:[]},
];

const FILM_CONFIG={
  fbBase:"movies",fbSugg:"movie_suggestions",icon:"🎬",label:"Film Führer",
  field1Label:"Plattform / Sender",field1Placeholder:"z.B. Netflix, Kino, Prime",field1Key:"director",
  field1FilterLabel:"Alle Plattformen",typeFilterLabel:"Alle Genres",genreOptions:MEDIA_GENRES,
  crit1Label:"📖 Handlung",crit2Label:"🎭 Spannung",crit1Short:"Handlung",crit2Short:"Spannung",
  namePlaceholder:"z.B. Inception",saveToast:"✅ Film gespeichert!",
  emptyIcon:"🎬",emptyText:"Noch keine Filme",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Film hinzufügen",addSuggTitle:"Film Vorschlag",suggListTitle:"Film Vorschläge",listLabel:"Film",
  suggHint:"💡 Noch nicht gesehen — als Idee für den nächsten Filmabend.",
  light:{headerBg:"#1a0e12",headerSub:"#b08490",accent:"#a8364e",navActive:"#7e2a3c",btn:"#7e2a3c",btnColor:"#ffffff",chipOn:"#7e2a3c",chipOnColor:"#ffffff",filterOn:"#7e2a3c",filterOnColor:"#ffffff",toast:"#7e2a3c",toastColor:"#ffffff",suggAccent:"#7e2a3c"},
  dark:{headerBg:"#120a0c",headerSub:"#8f6470",accent:"#d96a82",navActive:"#d96a82",btn:"#d96a82",btnColor:"#111110",chipOn:"#d96a82",chipOnColor:"#111110",filterOn:"#d96a82",filterOnColor:"#111110",toast:"#d96a82",toastColor:"#111110",suggAccent:"#d96a82"},
};
const SERIE_CONFIG={
  fbBase:"series",fbSugg:"serie_suggestions",icon:"📺",label:"Serien Führer",
  field1Label:"Plattform / Sender",field1Placeholder:"z.B. Netflix, HBO, ARD",field1Key:"platform",
  field1FilterLabel:"Alle Plattformen",typeFilterLabel:"Alle Genres",genreOptions:MEDIA_GENRES,
  crit1Label:"📖 Handlung",crit2Label:"🎭 Spannung",crit1Short:"Handlung",crit2Short:"Spannung",
  namePlaceholder:"z.B. Breaking Bad",saveToast:"✅ Serie gespeichert!",
  emptyIcon:"📺",emptyText:"Noch keine Serien",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Serie hinzufügen",addSuggTitle:"Serien Vorschlag",suggListTitle:"Serien Vorschläge",listLabel:"Serien",
  suggHint:"💡 Noch nicht gesehen — als Idee für den nächsten Serienabend.",
  light:{headerBg:"#0d1320",headerSub:"#8094b8",accent:"#3a5a9e",navActive:"#2c4880",btn:"#2c4880",btnColor:"#ffffff",chipOn:"#2c4880",chipOnColor:"#ffffff",filterOn:"#2c4880",filterOnColor:"#ffffff",toast:"#2c4880",toastColor:"#ffffff",suggAccent:"#2c4880"},
  dark:{headerBg:"#0a0e16",headerSub:"#5c7094",accent:"#7296d4",navActive:"#7296d4",btn:"#7296d4",btnColor:"#111110",chipOn:"#7296d4",chipOnColor:"#111110",filterOn:"#7296d4",filterOnColor:"#111110",toast:"#7296d4",toastColor:"#111110",suggAccent:"#7296d4"},
};
const KAFFEE_CONFIG={
  fbBase:"coffees",fbSugg:"coffee_suggestions",icon:"☕",label:"Kaffee Führer",
  field1Label:"Rösterei / Herkunft",field1Placeholder:"z.B. Dallmayr, Äthiopien",field1Key:"field1",
  field1FilterLabel:"Alle Röstereien",typeFilterLabel:"Alle Sorten",genreOptions:COFFEE_TYPES,
  starsLabel:"😋 Geschmack",
  crit1Label:"💪 Stärke",crit2Label:"🍋 Säure",crit1Short:"💪 Stärke",crit2Short:"🍋 Säure",
  namePlaceholder:"z.B. Espresso Roma",saveToast:"✅ Kaffee gespeichert!",
  emptyIcon:"☕",emptyText:"Noch keine Kaffees",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Kaffee hinzufügen",addSuggTitle:"Kaffee Vorschlag",suggListTitle:"Kaffee Vorschläge",listLabel:"Kaffee",
  suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",
  light:{headerBg:"#1c1206",headerSub:"#b08a5e",accent:"#8a5a2c",navActive:"#6e4520",btn:"#6e4520",btnColor:"#ffffff",chipOn:"#6e4520",chipOnColor:"#ffffff",filterOn:"#6e4520",filterOnColor:"#ffffff",toast:"#6e4520",toastColor:"#ffffff",suggAccent:"#6e4520"},
  dark:{headerBg:"#150d05",headerSub:"#8f6a44",accent:"#c89056",navActive:"#c89056",btn:"#c89056",btnColor:"#111110",chipOn:"#c89056",chipOnColor:"#111110",filterOn:"#c89056",filterOnColor:"#111110",toast:"#c89056",toastColor:"#111110",suggAccent:"#c89056"},
};
const GIN_CONFIG={
  fbBase:"gins",fbSugg:"gin_suggestions",icon:"🍸",label:"Gin Führer",
  field1Label:"Marke / Destillerie",field1Placeholder:"z.B. Monkey 47, Bombay",field1Key:"field1",
  field1FilterLabel:"Alle Marken",typeFilterLabel:"Alle Sorten",genreOptions:GIN_TYPES,
  starsLabel:"😋 Geschmack",
  crit1Label:"🌲 Wacholder",crit2Label:"🌿 Intensität der Botanicals",crit1Short:"🌲 Wacholder",crit2Short:"🌿 Botanicals",
  namePlaceholder:"z.B. Monkey 47 Dry Gin",saveToast:"✅ Gin gespeichert!",
  emptyIcon:"🍸",emptyText:"Noch keine Gins",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Gin hinzufügen",addSuggTitle:"Gin Vorschlag",suggListTitle:"Gin Vorschläge",listLabel:"Gin",
  suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",
  light:{headerBg:"#0c1a10",headerSub:"#6e9a7c",accent:"#2e7d52",navActive:"#236340",btn:"#236340",btnColor:"#ffffff",chipOn:"#236340",chipOnColor:"#ffffff",filterOn:"#236340",filterOnColor:"#ffffff",toast:"#236340",toastColor:"#ffffff",suggAccent:"#236340"},
  dark:{headerBg:"#08120b",headerSub:"#527a60",accent:"#5cb185",navActive:"#5cb185",btn:"#5cb185",btnColor:"#111110",chipOn:"#5cb185",chipOnColor:"#111110",filterOn:"#5cb185",filterOnColor:"#111110",toast:"#5cb185",toastColor:"#111110",suggAccent:"#5cb185"},
};
const RUM_CONFIG={
  fbBase:"rums",fbSugg:"rum_suggestions",icon:"🥂",label:"Rum Führer",
  field1Label:"Marke / Herkunft",field1Placeholder:"z.B. Diplomático, Jamaika",field1Key:"field1",
  field1FilterLabel:"Alle Marken",typeFilterLabel:"Alle Sorten",genreOptions:RUM_TYPES,
  starsLabel:"😋 Geschmack",
  crit1Label:"🍯 Süße",crit2Label:"🌶️ Würze / Komplexität",crit1Short:"🍯 Süße",crit2Short:"🌶️ Würze",
  namePlaceholder:"z.B. Diplomático Reserva",saveToast:"✅ Rum gespeichert!",
  emptyIcon:"🥂",emptyText:"Noch keine Rums",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Rum hinzufügen",addSuggTitle:"Rum Vorschlag",suggListTitle:"Rum Vorschläge",listLabel:"Rum",
  suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",
  light:{headerBg:"#1e1206",headerSub:"#b0885a",accent:"#a55e22",navActive:"#8a4d1a",btn:"#8a4d1a",btnColor:"#ffffff",chipOn:"#8a4d1a",chipOnColor:"#ffffff",filterOn:"#8a4d1a",filterOnColor:"#ffffff",toast:"#8a4d1a",toastColor:"#ffffff",suggAccent:"#8a4d1a"},
  dark:{headerBg:"#160d05",headerSub:"#8f6840",accent:"#d68a3e",navActive:"#d68a3e",btn:"#d68a3e",btnColor:"#111110",chipOn:"#d68a3e",chipOnColor:"#111110",filterOn:"#d68a3e",filterOnColor:"#111110",toast:"#d68a3e",toastColor:"#111110",suggAccent:"#d68a3e"},
};
const VODKA_CONFIG={
  fbBase:"vodkas",fbSugg:"vodka_suggestions",icon:"🧊",label:"Vodka Führer",
  field1Label:"Marke / Herkunft",field1Placeholder:"z.B. Belvedere, Polen",field1Key:"field1",
  field1FilterLabel:"Alle Marken",typeFilterLabel:"Alle Sorten",genreOptions:VODKA_TYPES,
  starsLabel:"😋 Geschmack",
  crit1Label:"💧 Reinheit / Weichheit",crit2Label:"✨ Charakter",crit1Short:"💧 Reinheit",crit2Short:"✨ Charakter",
  namePlaceholder:"z.B. Belvedere Pure",saveToast:"✅ Vodka gespeichert!",
  emptyIcon:"🧊",emptyText:"Noch keine Vodkas",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Vodka hinzufügen",addSuggTitle:"Vodka Vorschlag",suggListTitle:"Vodka Vorschläge",listLabel:"Vodka",
  suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",
  light:{headerBg:"#0c1620",headerSub:"#6e8ca0",accent:"#3a7a9e",navActive:"#2c6380",btn:"#2c6380",btnColor:"#ffffff",chipOn:"#2c6380",chipOnColor:"#ffffff",filterOn:"#2c6380",filterOnColor:"#ffffff",toast:"#2c6380",toastColor:"#ffffff",suggAccent:"#2c6380"},
  dark:{headerBg:"#080f16",headerSub:"#527084",accent:"#5ca8d1",navActive:"#5ca8d1",btn:"#5ca8d1",btnColor:"#111110",chipOn:"#5ca8d1",chipOnColor:"#111110",filterOn:"#5ca8d1",filterOnColor:"#111110",toast:"#5ca8d1",toastColor:"#111110",suggAccent:"#5ca8d1"},
};
const BOOK_CONFIG={
  fbBase:"books",fbSugg:"book_suggestions",icon:"📚",label:"Bücher Führer",
  field1Label:"Autor",field1Placeholder:"z.B. Stephen King",field1Key:"field1",
  field1FilterLabel:"Alle Autoren",typeFilterLabel:"Alle Genres",genreOptions:BOOK_GENRES,
  starsLabel:"⭐ Gesamtwertung",
  crit1Label:"📖 Handlung",crit2Label:"✍️ Schreibstil",crit1Short:"📖 Handlung",crit2Short:"✍️ Schreibstil",
  namePlaceholder:"z.B. Der Schwarm",saveToast:"✅ Buch gespeichert!",
  emptyIcon:"📚",emptyText:"Noch keine Bücher",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Buch hinzufügen",addSuggTitle:"Buch Vorschlag",suggListTitle:"Buch Vorschläge",listLabel:"Buch",
  suggHint:"💡 Noch nicht gelesen — als Idee für die nächste Lektüre.",
  light:{headerBg:"#1c1109",headerSub:"#a8825e",accent:"#8a5230",navActive:"#6e4022",btn:"#6e4022",btnColor:"#ffffff",chipOn:"#6e4022",chipOnColor:"#ffffff",filterOn:"#6e4022",filterOnColor:"#ffffff",toast:"#6e4022",toastColor:"#ffffff",suggAccent:"#6e4022"},
  dark:{headerBg:"#150c06",headerSub:"#8a6444",accent:"#c88a5a",navActive:"#c88a5a",btn:"#c88a5a",btnColor:"#111110",chipOn:"#c88a5a",chipOnColor:"#111110",filterOn:"#c88a5a",filterOnColor:"#111110",toast:"#c88a5a",toastColor:"#111110",suggAccent:"#c88a5a"},
};
const AUDIOBOOK_CONFIG={
  fbBase:"audiobooks",fbSugg:"audiobook_suggestions",icon:"🎧",label:"Hörbücher Führer",
  field1Label:"Autor / Sprecher",field1Placeholder:"z.B. gelesen von …",field1Key:"field1",
  field1FilterLabel:"Alle",typeFilterLabel:"Alle Genres",genreOptions:BOOK_GENRES,
  starsLabel:"⭐ Gesamtwertung",
  crit1Label:"📖 Handlung",crit2Label:"🎙️ Sprecher / Vertonung",crit1Short:"📖 Handlung",crit2Short:"🎙️ Sprecher",
  namePlaceholder:"z.B. Die Känguru-Chroniken",saveToast:"✅ Hörbuch gespeichert!",
  emptyIcon:"🎧",emptyText:"Noch keine Hörbücher",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Hörbuch hinzufügen",addSuggTitle:"Hörbuch Vorschlag",suggListTitle:"Hörbuch Vorschläge",listLabel:"Hörbuch",
  suggHint:"💡 Noch nicht gehört — als Idee zum Reinhören.",
  light:{headerBg:"#140c1c",headerSub:"#9078a8",accent:"#6a4290",navActive:"#553275",btn:"#553275",btnColor:"#ffffff",chipOn:"#553275",chipOnColor:"#ffffff",filterOn:"#553275",filterOnColor:"#ffffff",toast:"#553275",toastColor:"#ffffff",suggAccent:"#553275"},
  dark:{headerBg:"#0e0716",headerSub:"#70588a",accent:"#a882d4",navActive:"#a882d4",btn:"#a882d4",btnColor:"#111110",chipOn:"#a882d4",chipOnColor:"#111110",filterOn:"#a882d4",filterOnColor:"#111110",toast:"#a882d4",toastColor:"#111110",suggAccent:"#a882d4"},
};
const CAFE_CONFIG={
  fbBase:"cafes",fbSugg:"cafe_suggestions",icon:"🍰",label:"Café Führer",
  field1Label:"Stadt / Ort",field1Placeholder:"z.B. Köln, Altstadt",field1Key:"field1",
  field1FilterLabel:"Alle Orte",typeFilterLabel:"Alle Arten",genreOptions:CAFE_TYPES,
  starsLabel:"⭐ Gesamtwertung",
  crit1Label:"☕ Kaffee & Kuchen",crit2Label:"🛋️ Ambiente",crit1Short:"☕ Qualität",crit2Short:"🛋️ Ambiente",
  namePlaceholder:"z.B. Café Central",saveToast:"✅ Café gespeichert!",
  emptyIcon:"🍰",emptyText:"Noch keine Cafés",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Café hinzufügen",addSuggTitle:"Café Vorschlag",suggListTitle:"Café Vorschläge",listLabel:"Café",
  suggHint:"💡 Noch nicht besucht — als Idee für das nächste Mal.",
  light:{headerBg:"#1a0f14",headerSub:"#a87890",accent:"#a04a6e",navActive:"#843a58",btn:"#843a58",btnColor:"#ffffff",chipOn:"#843a58",chipOnColor:"#ffffff",filterOn:"#843a58",filterOnColor:"#ffffff",toast:"#843a58",toastColor:"#ffffff",suggAccent:"#843a58"},
  dark:{headerBg:"#140a0f",headerSub:"#8a5870",accent:"#d47ea4",navActive:"#d47ea4",btn:"#d47ea4",btnColor:"#111110",chipOn:"#d47ea4",chipOnColor:"#111110",filterOn:"#d47ea4",filterOnColor:"#111110",toast:"#d47ea4",toastColor:"#111110",suggAccent:"#d47ea4"},
};
const BAR_CONFIG={
  fbBase:"bars",fbSugg:"bar_suggestions",icon:"🍹",label:"Bar Führer",
  field1Label:"Stadt / Ort",field1Placeholder:"z.B. Köln, Friesenviertel",field1Key:"field1",
  field1FilterLabel:"Alle Orte",typeFilterLabel:"Alle Arten",genreOptions:BAR_TYPES,
  starsLabel:"⭐ Gesamtwertung",
  crit1Label:"🍹 Getränke",crit2Label:"🎶 Atmosphäre",crit1Short:"🍹 Getränke",crit2Short:"🎶 Atmosphäre",
  namePlaceholder:"z.B. Little Link",saveToast:"✅ Bar gespeichert!",
  emptyIcon:"🍹",emptyText:"Noch keine Bars",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Bar hinzufügen",addSuggTitle:"Bar Vorschlag",suggListTitle:"Bar Vorschläge",listLabel:"Bar",
  suggHint:"💡 Noch nicht besucht — als Idee für das nächste Mal.",
  light:{headerBg:"#120c1c",headerSub:"#8878a8",accent:"#5a4290",navActive:"#473275",btn:"#473275",btnColor:"#ffffff",chipOn:"#473275",chipOnColor:"#ffffff",filterOn:"#473275",filterOnColor:"#ffffff",toast:"#473275",toastColor:"#ffffff",suggAccent:"#473275"},
  dark:{headerBg:"#0c0716",headerSub:"#60548a",accent:"#9a82d4",navActive:"#9a82d4",btn:"#9a82d4",btnColor:"#111110",chipOn:"#9a82d4",chipOnColor:"#111110",filterOn:"#9a82d4",filterOnColor:"#111110",toast:"#9a82d4",toastColor:"#111110",suggAccent:"#9a82d4"},
};
const ICE_CONFIG={
  fbBase:"icecreams",fbSugg:"icecream_suggestions",icon:"🍦",label:"Eisdielen Führer",
  field1Label:"Stadt / Ort",field1Placeholder:"z.B. Köln, Südstadt",field1Key:"field1",
  field1FilterLabel:"Alle Orte",typeFilterLabel:"Alle Arten",genreOptions:ICE_TYPES,
  starsLabel:"⭐ Gesamtwertung",
  crit1Label:"🍦 Eisqualität",crit2Label:"🍨 Auswahl",crit1Short:"🍦 Qualität",crit2Short:"🍨 Auswahl",
  namePlaceholder:"z.B. Eiscafé Venezia",saveToast:"✅ Eisdiele gespeichert!",
  emptyIcon:"🍦",emptyText:"Noch keine Eisdielen",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Eisdiele hinzufügen",addSuggTitle:"Eisdielen Vorschlag",suggListTitle:"Eisdielen Vorschläge",listLabel:"Eisdiele",
  suggHint:"💡 Noch nicht besucht — als Idee für den nächsten Sommer.",
  light:{headerBg:"#0c161c",headerSub:"#6e94a8",accent:"#2c7a9e",navActive:"#226180",btn:"#226180",btnColor:"#ffffff",chipOn:"#226180",chipOnColor:"#ffffff",filterOn:"#226180",filterOnColor:"#ffffff",toast:"#226180",toastColor:"#ffffff",suggAccent:"#226180"},
  dark:{headerBg:"#071018",headerSub:"#4e7488",accent:"#62b0d8",navActive:"#62b0d8",btn:"#62b0d8",btnColor:"#111110",chipOn:"#62b0d8",chipOnColor:"#111110",filterOn:"#62b0d8",filterOnColor:"#111110",toast:"#62b0d8",toastColor:"#111110",suggAccent:"#62b0d8"},
};
const DELIVERY_CONFIG={
  fbBase:"deliveries",fbSugg:"delivery_suggestions",icon:"🛵",label:"Lieferservice Führer",
  field1Label:"Stadt / Ort",field1Placeholder:"z.B. Köln",field1Key:"field1",
  field1FilterLabel:"Alle Orte",typeFilterLabel:"Alle Küchen",genreOptions:DELIVERY_TYPES,
  starsLabel:"⭐ Gesamtwertung",
  crit1Label:"🍜 Essensqualität",crit2Label:"🚀 Lieferzeit / Zuverlässigkeit",crit1Short:"🍜 Essen",crit2Short:"🚀 Lieferzeit",
  namePlaceholder:"z.B. Pizza Roma Lieferdienst",saveToast:"✅ Lieferservice gespeichert!",
  emptyIcon:"🛵",emptyText:"Noch keine Lieferservices",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Lieferservice hinzufügen",addSuggTitle:"Lieferservice Vorschlag",suggListTitle:"Lieferservice Vorschläge",listLabel:"Lieferservice",
  suggHint:"💡 Noch nicht bestellt — als Idee für den nächsten Abend.",
};
const BEER_CONFIG={
  fbBase:"beers",fbSugg:"beer_suggestions",icon:"🍺",label:"Bier Führer",
  field1Label:"Brauerei / Herkunft",field1Placeholder:"z.B. Gaffel, Köln",field1Key:"field1",
  field1FilterLabel:"Alle Brauereien",typeFilterLabel:"Alle Sorten",genreOptions:BEER_TYPES,
  starsLabel:"😋 Geschmack",
  crit1Label:"🍃 Herbe / Bitterkeit",crit2Label:"🍺 Süffigkeit",crit1Short:"🍃 Herbe",crit2Short:"🍺 Süffigkeit",
  namePlaceholder:"z.B. Gaffel Kölsch",saveToast:"✅ Bier gespeichert!",
  emptyIcon:"🍺",emptyText:"Noch keine Biere",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Bier hinzufügen",addSuggTitle:"Bier Vorschlag",suggListTitle:"Bier Vorschläge",listLabel:"Bier",
  suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",
};
const WINE_CONFIG={
  fbBase:"wines",fbSugg:"wine_suggestions",icon:"🍷",label:"Wein Führer",
  field1Label:"Weingut / Herkunft",field1Placeholder:"z.B. Rioja, Spanien",field1Key:"field1",
  field1FilterLabel:"Alle Weingüter",typeFilterLabel:"Alle Sorten",genreOptions:WINE_TYPES,
  starsLabel:"😋 Geschmack",
  crit1Label:"🍇 Fruchtigkeit",crit2Label:"🍂 Körper / Tannine",crit1Short:"🍇 Frucht",crit2Short:"🍂 Körper",
  namePlaceholder:"z.B. Marqués de Riscal",saveToast:"✅ Wein gespeichert!",
  emptyIcon:"🍷",emptyText:"Noch keine Weine",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Wein hinzufügen",addSuggTitle:"Wein Vorschlag",suggListTitle:"Wein Vorschläge",listLabel:"Wein",
  suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",
};
const TEA_CONFIG={
  fbBase:"teas",fbSugg:"tea_suggestions",icon:"🫖",label:"Tee Führer",
  field1Label:"Marke / Herkunft",field1Placeholder:"z.B. Meßmer, Darjeeling",field1Key:"field1",
  field1FilterLabel:"Alle Marken",typeFilterLabel:"Alle Sorten",genreOptions:TEA_TYPES,
  starsLabel:"😋 Geschmack",
  crit1Label:"🌿 Aroma",crit2Label:"💪 Stärke",crit1Short:"🌿 Aroma",crit2Short:"💪 Stärke",
  namePlaceholder:"z.B. Earl Grey",saveToast:"✅ Tee gespeichert!",
  emptyIcon:"🫖",emptyText:"Noch keine Tees",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Tee hinzufügen",addSuggTitle:"Tee Vorschlag",suggListTitle:"Tee Vorschläge",listLabel:"Tee",
  suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",
};
const MATCHA_CONFIG={
  fbBase:"matchas",fbSugg:"matcha_suggestions",icon:"🍵",label:"Matcha Führer",
  field1Label:"Marke / Herkunft",field1Placeholder:"z.B. Uji, Japan",field1Key:"field1",
  field1FilterLabel:"Alle Marken",typeFilterLabel:"Alle Sorten",genreOptions:MATCHA_TYPES,
  starsLabel:"😋 Geschmack",
  crit1Label:"🌱 Umami",crit2Label:"🫧 Cremigkeit",crit1Short:"🌱 Umami",crit2Short:"🫧 Cremigkeit",
  namePlaceholder:"z.B. Matcha Miyako",saveToast:"✅ Matcha gespeichert!",
  emptyIcon:"🍵",emptyText:"Noch keine Matchas",emptySuggText:"Noch keine Vorschläge",
  addTitle:"Matcha hinzufügen",addSuggTitle:"Matcha Vorschlag",suggListTitle:"Matcha Vorschläge",listLabel:"Matcha",
  suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",
};
// Registry aller Standard-Kategorien für die globalen Übersichten
const ALL_CATS=[
  {id:"restaurant",icon:"🍽️",label:"Restaurants",base:"restaurants",sugg:"suggestions",kind:"rest"},
  {id:"cafe",icon:"🍰",label:"Cafés",base:"cafes",sugg:"cafe_suggestions",kind:"media",cfg:CAFE_CONFIG},
  {id:"bar",icon:"🍹",label:"Bars",base:"bars",sugg:"bar_suggestions",kind:"media",cfg:BAR_CONFIG},
  {id:"icecream",icon:"🍦",label:"Eisdielen",base:"icecreams",sugg:"icecream_suggestions",kind:"media",cfg:ICE_CONFIG},
  {id:"delivery",icon:"🛵",label:"Lieferservices",base:"deliveries",sugg:"delivery_suggestions",kind:"media",cfg:DELIVERY_CONFIG},
  {id:"film",icon:"🎬",label:"Filme",base:"movies",sugg:"movie_suggestions",kind:"media",cfg:FILM_CONFIG},
  {id:"serie",icon:"📺",label:"Serien",base:"series",sugg:"serie_suggestions",kind:"media",cfg:SERIE_CONFIG},
  {id:"book",icon:"📚",label:"Bücher",base:"books",sugg:"book_suggestions",kind:"media",cfg:BOOK_CONFIG},
  {id:"audiobook",icon:"🎧",label:"Hörbücher",base:"audiobooks",sugg:"audiobook_suggestions",kind:"media",cfg:AUDIOBOOK_CONFIG},
  {id:"whisky",icon:"🥃",label:"Whiskys",base:"whiskies",sugg:"whisky_suggestions",kind:"whisky"},
  {id:"gin",icon:"🍸",label:"Gin",base:"gins",sugg:"gin_suggestions",kind:"media",cfg:GIN_CONFIG},
  {id:"rum",icon:"🥂",label:"Rum",base:"rums",sugg:"rum_suggestions",kind:"media",cfg:RUM_CONFIG},
  {id:"vodka",icon:"🧊",label:"Vodka",base:"vodkas",sugg:"vodka_suggestions",kind:"media",cfg:VODKA_CONFIG},
  {id:"coffee",icon:"☕",label:"Kaffee",base:"coffees",sugg:"coffee_suggestions",kind:"media",cfg:KAFFEE_CONFIG},
  {id:"beer",icon:"🍺",label:"Bier",base:"beers",sugg:"beer_suggestions",kind:"media",cfg:BEER_CONFIG},
  {id:"wine",icon:"🍷",label:"Wein",base:"wines",sugg:"wine_suggestions",kind:"media",cfg:WINE_CONFIG},
  {id:"tea",icon:"🫖",label:"Tee",base:"teas",sugg:"tea_suggestions",kind:"media",cfg:TEA_CONFIG},
  {id:"matcha",icon:"🍵",label:"Matcha",base:"matchas",sugg:"matcha_suggestions",kind:"media",cfg:MATCHA_CONFIG},
];
function avgOfCat(cat,item){
  if(cat.kind==="rest")return getAvgRest(item);
  if(cat.kind==="whisky")return getAvgWhisky(item);
  return getAvgMedia(item);
}
function subtitleOfCat(cat,item){
  if(cat.kind==="rest")return [item.city,(Array.isArray(item.cuisines)?item.cuisines:[]).join(" & ")].filter(Boolean).join(" · ");
  if(cat.kind==="whisky")return [item.distillery,(Array.isArray(item.types)?item.types:[]).join(" & ")].filter(Boolean).join(" · ");
  return [item.field1||item.director||"",(Array.isArray(item.genres)?item.genres:[]).join(" & ")].filter(Boolean).join(" · ");
}
function catFilterMeta(cat){
  if(cat.kind==="rest")return{l1:"Alle Städte",l2:"Alle Küchen",g1:i=>(i.city||"").trim(),g2:i=>Array.isArray(i.cuisines)?i.cuisines:[]};
  if(cat.kind==="whisky")return{l1:"Alle Destillerien",l2:"Alle Sorten",g1:i=>(i.distillery||"").trim(),g2:i=>Array.isArray(i.types)?i.types:[]};
  return{l1:(cat.cfg&&cat.cfg.field1FilterLabel)||"Alle",l2:(cat.cfg&&cat.cfg.typeFilterLabel)||"Alle",g1:i=>(i.field1||"").trim(),g2:i=>Array.isArray(i.genres)?i.genres:[]};
}
function customConfig(cat){
  return{
    fbBase:"custom_"+cat.id,fbSugg:"custom_"+cat.id+"_sugg",icon:cat.icon||"⭐",label:cat.name,
    field1Label:cat.field1Label||"Herkunft / Marke",field1Placeholder:"z.B. "+(cat.field1Label||"Marke"),field1Key:"field1",
    field1FilterLabel:"Alle",typeFilterLabel:"",genreOptions:null,
    crit1Label:"◆ "+(cat.crit1Label||"Qualität"),crit2Label:"◆ "+(cat.crit2Label||"Preis-Leistung"),
    crit1Short:cat.crit1Label||"Qualität",crit2Short:cat.crit2Label||"Preis-Leistung",
    namePlaceholder:"Name",saveToast:"✅ Gespeichert!",
    emptyIcon:cat.icon||"⭐",emptyText:"Noch keine Einträge",emptySuggText:"Noch keine Vorschläge",
    addTitle:cat.name+" hinzufügen",addSuggTitle:cat.name+" Vorschlag",suggListTitle:cat.name+" Vorschläge",listLabel:cat.name,
    suggHint:"💡 Noch nicht probiert — als Idee für den nächsten Abend.",
    light:{headerBg:"#16161a",headerSub:"#9a96a8",accent:"#5c5878",navActive:"#46425e",btn:"#46425e",btnColor:"#ffffff",chipOn:"#46425e",chipOnColor:"#ffffff",filterOn:"#46425e",filterOnColor:"#ffffff",toast:"#46425e",toastColor:"#ffffff",suggAccent:"#46425e"},
    dark:{headerBg:"#0e0e12",headerSub:"#6c6880",accent:"#9a94c0",navActive:"#9a94c0",btn:"#9a94c0",btnColor:"#111110",chipOn:"#9a94c0",chipOnColor:"#111110",filterOn:"#9a94c0",filterOnColor:"#111110",toast:"#9a94c0",toastColor:"#111110",suggAccent:"#9a94c0"},
  };
}

// Themes
const LIGHT={
  bg:"#f1f4fb",card:"#ffffff",cardBorder:"#e2e6f5",cardShadow:"rgba(35,38,58,0.08)",
  restHeaderBg:"#6c7bff",restHeaderSub:"#e3e6ff",
  whiskyHeaderBg:"#6c7bff",whiskyHeaderSub:"#e3e6ff",
  title:"#23263a",sub:"#6a6f88",label:"#4a4f68",sliderTrack:"#e4e8f5",
  tick:"#9ba1bc",inputBg:"#ffffff",inputBorder:"#d6dcf0",inputColor:"#23263a",
  innerCard:"#f6f8fe",navBg:"#ffffff",navBorder:"#e2e6f5",navShadow:"rgba(35,38,58,0.08)",
  restNavActive:"#6c7bff",whiskyNavActive:"#6c7bff",navInactive:"#b0b5cc",
  restAccent:"#6c7bff",whiskyAccent:"#6c7bff",
  chipBg:"#ffffff",chipBorder:"#d6dcf0",chipColor:"#4a4f68",
  restChipOn:"#6c7bff",restChipOnColor:"#ffffff",
  whiskyChipOn:"#6c7bff",whiskyChipOnColor:"#ffffff",
  filterBg:"#ffffff",filterColor:"#4a4f68",filterBorder:"#d6dcf0",
  restFilterOn:"#6c7bff",restFilterOnColor:"#ffffff",
  whiskyFilterOn:"#6c7bff",whiskyFilterOnColor:"#ffffff",
  restBtn:"#6c7bff",whiskyBtn:"#6c7bff",btnColor:"#ffffff",
  thumb:"#ffffff",starEmpty:"#dfe3f2",modal:"#ffffff",handle:"#d6dcf0",empty:"#b0b5cc",
  restToast:"#6c7bff",whiskyToast:"#6c7bff",toastColor:"#ffffff",
  ratingRow:"#f6f8fe",ratingBorder:"#e8ebf7",
  secondaryBtn:"#eceffb",secondaryBtnColor:"#3a3f5c",
  suggCard:"#fbfcff",suggBorder:"#dfe4f6",restSuggAccent:"#5b68d8",whiskySuggAccent:"#5b68d8",suggBadgeBg:"#edf0fc",
  modeSwitchBg:"rgba(255,255,255,0.14)",modeSwitchBorder:"rgba(255,255,255,0.26)",
  danger:"#d0453c",adminBadge:"#6c7bff",adminBadgeColor:"#ffffff",memberBadge:"#eceffb",memberBadgeColor:"#4a4f68",
};
const DARK={
  bg:"#0b0b0a",card:"#181613",cardBorder:"#2a2721",cardShadow:"rgba(0,0,0,0.5)",
  restHeaderBg:"#0c0b09",restHeaderSub:"#c9a24a",
  whiskyHeaderBg:"#0c0b09",whiskyHeaderSub:"#c9a24a",
  title:"#f2efe8",sub:"#8f897c",label:"#a89f8f",sliderTrack:"#2a2721",
  tick:"#5d574b",inputBg:"#14120f",inputBorder:"#2a2721",inputColor:"#f2efe8",
  innerCard:"#14120f",navBg:"#0b0b0a",navBorder:"#2a2721",navShadow:"rgba(0,0,0,0.55)",
  restNavActive:"#fab600",whiskyNavActive:"#fab600",navInactive:"#4a463e",
  restAccent:"#fab600",whiskyAccent:"#fab600",
  chipBg:"#181613",chipBorder:"#2a2721",chipColor:"#a89f8f",
  restChipOn:"#fab600",restChipOnColor:"#141414",
  whiskyChipOn:"#fab600",whiskyChipOnColor:"#141414",
  filterBg:"#181613",filterColor:"#a89f8f",filterBorder:"#2a2721",
  restFilterOn:"#fab600",restFilterOnColor:"#141414",
  whiskyFilterOn:"#fab600",whiskyFilterOnColor:"#141414",
  restBtn:"#fab600",whiskyBtn:"#fab600",btnColor:"#141414",
  thumb:"#0b0b0a",starEmpty:"#2e2a22",modal:"#181613",handle:"#34302a",empty:"#4a463e",
  restToast:"#fab600",whiskyToast:"#fab600",toastColor:"#141414",
  ratingRow:"#14120f",ratingBorder:"#2a2721",
  secondaryBtn:"#2a2721",secondaryBtnColor:"#e8dfc8",
  suggCard:"#151310",suggBorder:"#2c261c",restSuggAccent:"#d8b04a",whiskySuggAccent:"#d8b04a",suggBadgeBg:"#201d16",
  modeSwitchBg:"rgba(255,255,255,0.07)",modeSwitchBorder:"rgba(255,255,255,0.14)",
  danger:"#e05048",adminBadge:"#fab600",adminBadgeColor:"#141414",memberBadge:"#2a2721",memberBadgeColor:"#a89f8f",
};
// Einheitliche Kategorie-Farbwelten: hell = Soft Glass (Flieder), dunkel = Black & Gold
const GLASS_MODE={headerBg:"#6c7bff",headerSub:"#e3e6ff",accent:"#6c7bff",navActive:"#6c7bff",btn:"#6c7bff",btnColor:"#ffffff",chipOn:"#6c7bff",chipOnColor:"#ffffff",filterOn:"#6c7bff",filterOnColor:"#ffffff",toast:"#6c7bff",toastColor:"#ffffff",suggAccent:"#5b68d8"};
const GOLD_MODE={headerBg:"#0c0b09",headerSub:"#c9a24a",accent:"#fab600",navActive:"#fab600",btn:"#fab600",btnColor:"#141414",chipOn:"#fab600",chipOnColor:"#141414",filterOn:"#fab600",filterOnColor:"#141414",toast:"#fab600",toastColor:"#141414",suggAccent:"#d8b04a"};

// Shared UI
function Slider({label,value,min,max,onChange,color,display,t}){
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
function Stars({value,t}){
  return(<div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{[...Array(10)].map((_,i)=><span key={i} style={{fontSize:14,color:i<Math.round(value)?"#e8a020":t.starEmpty}}>★</span>)}</div>);
}
function Badge({value,max=10,color}){
  const d=typeof value==="number"&&!Number.isInteger(value)?value.toFixed(1):value;
  return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:12,background:`${color}22`,color,fontWeight:700,fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}}>{d}/{max}</span>;
}
function Toast({msg,color,textColor}){
  if(!msg)return null;
  return <div style={{position:"fixed",bottom:96,left:"50%",transform:"translateX(-50%)",background:color,color:textColor,padding:"10px 20px",borderRadius:20,fontSize:13,fontWeight:600,zIndex:400,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>{msg}</div>;
}
function TypeChips({value,onChange,options,chipOn,chipOnColor,t}){
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
function FilterBar({filter,setFilter,col1,col2,col1Label,col2Label,extra=[],filterOn,filterOnColor,t}){
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
function SwipeableSheet({onClose,t,children,zIndex}){
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

// Login & Registrierung
function LoginScreen({onLogin,invitePending}){
  const [tab,setTab]=useState(invitePending?"register":"login");
  const [name,setName]=useState("");
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  const [forgot,setForgot]=useState(false);
  const [busy,setBusy]=useState(false);
  const inputStyle=err=>({width:"100%",padding:"13px 16px",borderRadius:12,fontSize:15,border:`1.5px solid ${err?"#c03028":"#dfdcd6"}`,outline:"none",color:"#1b1713",marginBottom:12,textAlign:"center"});
  const linkBtn={background:"none",border:"none",color:"#5d574f",fontSize:13,cursor:"pointer",marginTop:14,textDecoration:"underline",padding:4};
  // Anmeldung mit hinterlegter E-Mail-Adresse: Benutzername kommt aus uids/<uid>
  const doMailLogin=async mail=>{
    try{await auth.signInWithEmailAndPassword(mail,pw);}
    catch(e){if(NO_ACCOUNT_CODES.includes(e.code)||e.code==="auth/invalid-email")throw loginError("E-Mail-Adresse oder Passwort falsch.");throw e;}
    const n=await readOnce("uids/"+auth.currentUser.uid);
    if(!n)throw loginError("Zu dieser E-Mail-Adresse gehört kein RateMates-Konto.");
    await completeLogin(n,pw);
    return n;
  };
  const sendReset=async()=>{
    const m=name.trim();
    if(!validEmail(m)){setError("Bitte die E-Mail-Adresse eingeben, die du in deinem Konto hinterlegt hast.");return;}
    setBusy(true);setError("");setInfo("");
    const sent="✅ Falls zu dieser Adresse ein Konto gehört, ist jetzt eine E-Mail mit einem Link unterwegs. Schau auch im Spam-Ordner nach.";
    try{await auth.sendPasswordResetEmail(m);setInfo(sent);}
    catch(e){if(e.code==="auth/user-not-found")setInfo(sent);else setError(authErrorMsg(e,"Senden fehlgeschlagen. Bitte erneut versuchen."));}
    setBusy(false);
  };
  const doLogin=async()=>{
    const n0=name.trim();
    if(!n0||!pw){setError("Bitte Name oder E-Mail und Passwort eingeben.");return;}
    setBusy(true);setError("");setInfo("");
    if(n0.includes("@")){
      try{const n=await doMailLogin(n0);localStorage.setItem("rmg_user",n);onLogin(n);}
      catch(e){if(auth.currentUser)await auth.signOut().catch(()=>{});setError(e.msg||authErrorMsg(e,"Anmeldung fehlgeschlagen. Bitte erneut versuchen."));}
      setBusy(false);return;
    }
    const n=n0;
    let fresh=false;
    try{
      const email=authEmail(n);
      try{
        await auth.signInWithEmailAndPassword(email,pw);
      }catch(e){
        if(!NO_ACCOUNT_CODES.includes(e.code))throw e;
        // Kein Firebase-Konto mit diesem Passwort: entweder ein altes Konto, das jetzt
        // umgezogen wird, oder ein falsches Passwort. Solange der alte Hash noch lesbar
        // ist (Übergangsphase), wird er vorab geprüft; sonst entscheidet die Datenbankregel.
        const stored=await readOnce("users/"+n+"/pwHash").catch(()=>undefined);
        if(stored===null){
          const created=await readOnce("users/"+n+"/createdAt").catch(()=>null);
          throw loginError(created?"Falsches Passwort.":"Benutzer nicht gefunden.");
        }
        if(stored!==undefined&&stored!==await hashPw(n,pw))throw loginError("Falsches Passwort.");
        try{await auth.createUserWithEmailAndPassword(email,pw);fresh=true;}
        catch(e2){
          if(e2.code==="auth/email-already-in-use")throw loginError("Falsches Passwort.");
          throw e2;
        }
      }
      await completeLogin(n,pw);
      localStorage.setItem("rmg_user",n);
      onLogin(n);
    }catch(e){
      if(fresh)await auth.currentUser?.delete().catch(()=>{});
      else if(auth.currentUser)await auth.signOut().catch(()=>{});
      setError(e.msg||authErrorMsg(e,"Anmeldung fehlgeschlagen. Bitte erneut versuchen."));
    }
    setBusy(false);
  };
  const doRegister=async()=>{
    const n=name.trim();
    if(!validUsername(n)){setError("Name: 2–20 Zeichen, nur Buchstaben, Zahlen, Leerzeichen, - und _.");return;}
    if(pw.length<6){setError("Passwort: mindestens 6 Zeichen.");return;}
    if(pw!==pw2){setError("Passwörter stimmen nicht überein.");return;}
    setBusy(true);setError("");
    let fresh=false;
    try{
      try{await auth.createUserWithEmailAndPassword(authEmail(n),pw);fresh=true;}
      catch(e){if(e.code==="auth/email-already-in-use")throw loginError("Dieser Name ist bereits vergeben.");throw e;}
      const uid=auth.currentUser.uid;
      const taken=await readOnce("names/"+nameKey(n)).catch(()=>null);
      const exists=await readOnce("users/"+n+"/createdAt").catch(()=>null);
      if(taken||exists)throw loginError("Dieser Name ist bereits vergeben.");
      try{
        await db.ref("names/"+nameKey(n)).set(n);
        await db.ref("users/"+n).set({uid,createdAt:Date.now()});
        await db.ref("uids/"+uid).set(n);
        await auth.currentUser.updateProfile({displayName:n}).catch(()=>{});
      }catch{
        await db.ref("names/"+nameKey(n)).remove().catch(()=>{});
        throw loginError("Dieser Name ist bereits vergeben.");
      }
      localStorage.setItem("rmg_user",n);
      onLogin(n);
    }catch(e){
      if(fresh)await auth.currentUser?.delete().catch(()=>{});
      setError(e.msg||authErrorMsg(e,"Fehler bei der Registrierung."));
    }
    setBusy(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"#0b0b0a",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"white",borderRadius:24,padding:"36px 28px",width:"100%",maxWidth:360,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <img src={LOGO_SRC_DARK} alt="RateMates" style={{width:160,height:160,objectFit:"contain",margin:"0 auto 4px",display:"block"}}/>
        <div style={{fontSize:12,color:"#8a847c",marginBottom:invitePending?14:24}}>Gemeinsam bewerten in Gruppen</div>
        {invitePending&&<div style={{background:"#efe9fb",border:"1px solid #d9ccf5",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#5b3fa0"}}>🎉 Du wurdest in eine Gruppe eingeladen! Melde dich an oder registriere dich — danach kommst du automatisch hinein.</div>}
        <div style={{display:"flex",gap:6,background:"#efedea",borderRadius:12,padding:4,marginBottom:20}}>
          {[["login","Anmelden"],["register","Registrieren"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>{setTab(id);setError("");setInfo("");setForgot(false);}}
              style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:tab===id?"#fab600":"transparent",color:tab===id?"#141414":"#5d574f"}}>
              {lbl}
            </button>
          ))}
        </div>
        {tab==="login"&&forgot?(
          <>
            <div style={{fontSize:13,color:"#5d574f",marginBottom:14,lineHeight:1.45}}>Gib die E-Mail-Adresse ein, die du in deinem Konto hinterlegt hast. Wir schicken dir einen Link, mit dem du ein neues Passwort setzen kannst.</div>
            <input type="email" value={name} onChange={e=>{setName(e.target.value);setError("");setInfo("");}}
              onKeyDown={e=>e.key==="Enter"&&sendReset()} placeholder="E-Mail-Adresse" style={inputStyle()}/>
            {error&&<div style={{color:"#c03028",fontSize:12,marginBottom:12}}>{error}</div>}
            {info&&<div style={{color:"#2e7d52",fontSize:12,marginBottom:12}}>{info}</div>}
            <button onClick={sendReset} disabled={busy}
              style={{width:"100%",padding:14,borderRadius:12,background:busy?"#999":"#fab600",color:"#141414",fontSize:15,fontWeight:700,border:"none",cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
              {busy?"Bitte warten…":"Link senden"}
            </button>
            <div style={{fontSize:11.5,color:"#8a847c",marginTop:14,lineHeight:1.45}}>Keine E-Mail-Adresse hinterlegt? Dann kann dir der Admin deiner Gruppe ein neues Passwort geben.</div>
            <button onClick={()=>{setForgot(false);setError("");setInfo("");}} style={linkBtn}>Zurück zur Anmeldung</button>
          </>
        ):(
          <>
            <input value={name} onChange={e=>{setName(e.target.value);setError("");}} placeholder={tab==="login"?"Benutzername oder E-Mail":"Benutzername"} style={inputStyle()}/>
            <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&tab==="login"&&doLogin()} placeholder="Passwort" style={inputStyle()}/>
            {tab==="register"&&(
              <input type="password" value={pw2} onChange={e=>{setPw2(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&doRegister()} placeholder="Passwort wiederholen" style={inputStyle()}/>
            )}
            {error&&<div style={{color:"#c03028",fontSize:12,marginBottom:12}}>{error}</div>}
            <button onClick={tab==="login"?doLogin:doRegister} disabled={busy}
              style={{width:"100%",padding:14,borderRadius:12,background:busy?"#999":"#fab600",color:"#141414",fontSize:15,fontWeight:700,border:"none",cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
              {busy?"Bitte warten…":tab==="login"?"Anmelden":"Konto erstellen"}
            </button>
            {tab==="login"&&<button onClick={()=>{setForgot(true);setError("");setInfo("");if(!name.includes("@"))setName("");}} style={linkBtn}>Passwort vergessen?</button>}
          </>
        )}
      </div>
    </div>
  );
}

// Gruppenübersicht
function GroupsOverview({user,groups,onOpen,onLogout,dark,setDark,t,inviteMsg,onHome}){
  const [view,setView]=useState("list");
  const [topicF,setTopicF]=useState("");
  const [sortBy,setSortBy]=useState("name");
  const [form,setForm]=useState({name:"",topic:"",categories:{restaurant:true,whisky:false,film:false,serie:false,coffee:false,beer:false,wine:false,tea:false,matcha:false,gin:false,rum:false,vodka:false,book:false,audiobook:false,cafe:false,bar:false,icecream:false,delivery:false}});
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const my=groups.filter(g=>g.members&&g.members[user]);
  const topics=[...new Set(my.map(g=>(g.topic||"").trim()).filter(Boolean))].sort();
  const shown=my.filter(g=>!topicF||g.topic===topicF).sort((a,b)=>{
    if(sortBy==="topic"){const c=(a.topic||"").localeCompare(b.topic||"");if(c!==0)return c;}
    return a.name.localeCompare(b.name);
  });
  const createGroup=async()=>{
    if(!form.name.trim()){setError("Bitte einen Gruppennamen eingeben.");return;}
    if(!Object.values(form.categories).some(Boolean)){setError("Bitte mindestens eine Kategorie auswählen.");return;}
    setSaving(true);setError("");
    try{
      const id=Date.now().toString();
      const categories=Object.fromEntries(Object.entries(form.categories).filter(([,v])=>v));
      await db.ref("groups/"+id).set({id,name:form.name.trim(),topic:form.topic.trim(),categories,members:{[user]:"admin"},createdBy:user,createdAt:Date.now()});
      setForm({name:"",topic:"",categories:{restaurant:true,whisky:false,film:false,serie:false,coffee:false,beer:false,wine:false,tea:false,matcha:false,gin:false,rum:false,vodka:false,book:false,audiobook:false,cafe:false,bar:false,icecream:false,delivery:false}});
      setView("list");
    }catch{setError("Fehler beim Erstellen.");}
    setSaving(false);
  };
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",transition:"background 0.3s"}}>
      <div style={{background:t.restHeaderBg,padding:"20px 20px 16px",color:"white",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          {onHome&&<button onClick={onHome} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:"24px"}}>←</button>}
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,letterSpacing:"-0.01em"}}>Meine Gruppen</div>
            <div style={{fontSize:12,color:t.restHeaderSub,marginTop:4}}>{my.length} Gruppe{my.length!==1?"n":""}</div>
          </div>
        </div>
        <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
      </div>
      {view==="list"&&(
        <div style={{padding:"20px 16px 40px"}}>
          {inviteMsg&&<div style={{background:inviteMsg.startsWith("✅")?"#e7f5ee":"#fdecea",border:`1px solid ${inviteMsg.startsWith("✅")?"#bfe3cf":"#f5c6c2"}`,borderRadius:12,padding:"11px 14px",marginBottom:16,fontSize:13,color:inviteMsg.startsWith("✅")?"#1f7a4d":"#b0322a"}}>{inviteMsg}</div>}
          {topics.length>0&&(
            <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
              <select value={topicF} onChange={e=>setTopicF(e.target.value)}
                style={{padding:"7px 10px",borderRadius:20,border:`1px solid ${topicF?t.restFilterOn:t.filterBorder}`,background:topicF?t.restFilterOn:t.filterBg,color:topicF?t.restFilterOnColor:t.filterColor,fontSize:12,cursor:"pointer",outline:"none",flexShrink:0}}>
                <option value="">Alle Oberbegriffe</option>
                {topics.map(o=><option key={o}>{o}</option>)}
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                style={{padding:"7px 10px",borderRadius:20,border:`1px solid ${t.filterBorder}`,background:t.filterBg,color:t.filterColor,fontSize:12,cursor:"pointer",outline:"none",flexShrink:0}}>
                <option value="name">Sortierung: Name</option>
                <option value="topic">Sortierung: Oberbegriff</option>
              </select>
            </div>
          )}
          {shown.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}>
              <div style={{fontSize:48}}>👥</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{my.length===0?"Noch keine Gruppen":"Keine Treffer"}</div>
              <div style={{fontSize:13,marginTop:8}}>{my.length===0?"Erstelle deine erste Gruppe oder lass dich von einem Admin hinzufügen.":"Versuche einen anderen Filter."}</div>
            </div>
          ):shown.map(g=>{
            const cats=Object.keys(g.categories||{});
            const customCats=Object.values(g.custom||{});
            const isAdmin=g.members[user]==="admin";
            return(
              <div key={g.id} onClick={()=>onOpen(g)}
                style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,minWidth:0,paddingRight:8}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{g.name}</div>
                    {g.topic&&<div style={{fontSize:12,color:t.sub,marginTop:2}}>{g.topic}</div>}
                  </div>
                  <span style={{background:isAdmin?t.adminBadge:t.memberBadge,color:isAdmin?t.adminBadgeColor:t.memberBadgeColor,borderRadius:10,padding:"3px 10px",fontSize:11,fontWeight:600,flexShrink:0}}>{isAdmin?"Admin":"Mitglied"}</span>
                </div>
                <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:18,letterSpacing:2}}>{cats.map(c=>CATEGORY_DEFS[c]?.icon||"").join("")}{customCats.map(c=>c.icon||"⭐").join("")}</span>
                  <span style={{marginLeft:"auto",fontSize:12,color:t.sub}}>👥 {Object.keys(g.members||{}).length} Mitglied{Object.keys(g.members||{}).length!==1?"er":""}</span>
                </div>
              </div>
            );
          })}
          <button onClick={()=>setView("create")}
            style={{width:"100%",padding:16,borderRadius:14,background:t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",marginTop:8}}>
            + Neue Gruppe erstellen
          </button>
        </div>
      )}
      {view==="create"&&(
        <div style={{padding:"20px 16px 40px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <button onClick={()=>{setView("list");setError("");}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title,letterSpacing:"-0.01em"}}>Neue Gruppe</div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Gruppenname</label>
            <input value={form.name} onChange={e=>{setForm(p=>({...p,name:e.target.value}));setError("");}} placeholder="z.B. Montagabend"
              style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Oberbegriff <span style={{fontWeight:400,color:t.tick}}>(optional, zum Sortieren)</span></label>
            <input value={form.topic} onChange={e=>setForm(p=>({...p,topic:e.target.value}))} placeholder="z.B. Genuss, Freizeit, Familie"
              style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>
          </div>
          <label style={{display:"block",fontSize:12,color:t.label,marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>Was soll in dieser Gruppe bewertet werden?</label>
          <div style={{marginBottom:20}}>
            {CATEGORY_GROUPS.filter(g=>g.cats.length>0).map(grp=>(
              <div key={grp.id} style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:t.sub,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>{grp.icon} {grp.label}</div>
                {grp.cats.map(id=>{
                  const def=CATEGORY_DEFS[id];
                  const on=form.categories[id];
                  return(
                    <button key={id} onClick={()=>{setForm(p=>({...p,categories:{...p.categories,[id]:!p.categories[id]}}));setError("");}}
                      style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 16px",marginBottom:8,background:on?`${t.restNavActive}12`:t.card,borderRadius:12,border:`1.5px solid ${on?t.restNavActive:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                      <span style={{fontSize:22}}>{def.icon}</span>
                      <span style={{fontSize:14,fontWeight:on?600:400,color:t.title,flex:1}}>{def.label}</span>
                      <span style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?t.restNavActive:t.inputBorder}`,background:on?t.restNavActive:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:t.bg,fontSize:13,fontWeight:700}}>{on?"✓":""}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {error&&<div style={{color:t.danger,fontSize:12,marginBottom:12}}>{error}</div>}
          <button onClick={createGroup} disabled={saving}
            style={{width:"100%",padding:16,borderRadius:14,background:saving?"#999":t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:saving?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
            {saving?"Wird erstellt…":"Gruppe erstellen"}
          </button>
          <div style={{fontSize:12,color:t.sub,marginTop:12,textAlign:"center"}}>Du wirst automatisch Admin dieser Gruppe.</div>
        </div>
      )}
    </div>
  );
}

// Gruppen-Einstellungen (Admin)
function GroupSettingsSheet({group,user,onClose,t}){
  const [newMember,setNewMember]=useState("");
  const [msg,setMsg]=useState("");
  const isAdmin=group.members?.[user]==="admin";
  const members=Object.entries(group.members||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  const addMember=async()=>{
    const n=newMember.trim();
    if(!n){setMsg("Bitte Benutzernamen eingeben.");return;}
    if(group.members?.[n]){setMsg("Ist bereits Mitglied.");return;}
    try{
      const created=await readOnce("users/"+n+"/createdAt");
      if(!created){setMsg("Benutzer \""+n+"\" existiert nicht. Er muss sich zuerst registrieren.");return;}
      await db.ref("groups/"+group.id+"/members/"+n).set("member");
      setNewMember("");setMsg("✅ "+n+" hinzugefügt.");
    }catch{setMsg("Fehler beim Hinzufügen.");}
  };
  const setRole=async(name,role)=>{
    const admins=members.filter(([,r])=>r==="admin");
    if(role==="member"&&admins.length===1&&admins[0][0]===name){setMsg("Die Gruppe braucht mindestens einen Admin.");return;}
    try{await db.ref("groups/"+group.id+"/members/"+name).set(role);setMsg("");}
    catch{setMsg("Fehler.");}
  };
  const enableCategory=async(catId)=>{
    try{await db.ref("groups/"+group.id+"/categories/"+catId).set(true);}catch{setMsg("Fehler.");}
  };
  const inviteLink=window.location.origin+window.location.pathname+"#invite="+group.id;
  const copyInvite=async()=>{
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        await navigator.clipboard.writeText(inviteLink);
        setMsg("✅ Einladungslink kopiert! Schick ihn deinem Freund.");
      }else{
        // Fallback: alten Weg über ein temporäres Textfeld
        const ta=document.createElement("textarea");ta.value=inviteLink;document.body.appendChild(ta);ta.select();
        document.execCommand("copy");document.body.removeChild(ta);
        setMsg("✅ Einladungslink kopiert! Schick ihn deinem Freund.");
      }
    }catch{setMsg("Konnte nicht kopieren. Link: "+inviteLink);}
  };
  const inactiveStandard=Object.keys(CATEGORY_DEFS).filter(c=>!group.categories?.[c]);
  const inp={width:"100%",padding:"11px 13px",borderRadius:10,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,marginBottom:8};
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,color:t.title,letterSpacing:"-0.01em"}}>⚙️ {group.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2,marginBottom:20}}>{group.topic||"Gruppeneinstellungen"}</div>
        </div>
        <button onClick={onClose} title="Schließen" style={{background:t.secondaryBtn,color:t.secondaryBtnColor,border:"none",borderRadius:18,width:32,height:32,fontSize:18,cursor:"pointer",flexShrink:0,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,marginBottom:8}}>Mitglieder ({members.length})</div>
      {members.map(([name,role])=>(
        <div key={name} style={{display:"flex",alignItems:"center",gap:10,background:t.ratingRow,borderRadius:10,padding:"10px 14px",marginBottom:6,border:`1px solid ${t.ratingBorder}`}}>
          <span style={{fontWeight:600,fontSize:13,color:t.title,flex:1}}>{name}{name===user?" (du)":""}</span>
          <span style={{background:role==="admin"?t.adminBadge:t.memberBadge,color:role==="admin"?t.adminBadgeColor:t.memberBadgeColor,borderRadius:8,padding:"2px 8px",fontSize:11,fontWeight:600}}>{role==="admin"?"Admin":"Mitglied"}</span>
          {isAdmin&&role==="member"&&(<button onClick={()=>setRole(name,"admin")} style={{fontSize:11,color:t.restAccent,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Zum Admin machen</button>)}
          {isAdmin&&role==="admin"&&name!==user&&(<button onClick={()=>setRole(name,"member")} style={{fontSize:11,color:t.sub,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Admin entziehen</button>)}
        </div>
      ))}
      {isAdmin&&(
        <>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input value={newMember} onChange={e=>{setNewMember(e.target.value);setMsg("");}}
              onKeyDown={e=>e.key==="Enter"&&addMember()} placeholder="Benutzername hinzufügen…"
              style={{...inp,marginBottom:0,flex:1}}/>
            <button onClick={addMember} style={{padding:"0 18px",borderRadius:10,background:t.restBtn,color:t.btnColor,border:"none",cursor:"pointer",fontSize:14,fontWeight:600}}>+</button>
          </div>
          <div style={{fontSize:11,color:t.tick,marginTop:6}}>Die Person muss bereits ein Konto haben (Registrierung im Login-Bildschirm).</div>
          <button onClick={copyInvite} style={{width:"100%",marginTop:12,padding:13,borderRadius:10,background:t.secondaryBtn,color:t.secondaryBtnColor,border:"none",cursor:"pointer",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>🔗 Einladungslink kopieren</button>
          <div style={{fontSize:11,color:t.tick,marginTop:6}}>Über diesen Link kann sich ein Freund anmelden bzw. registrieren und kommt danach automatisch in diese Gruppe.</div>
          <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,marginTop:24,marginBottom:8}}>Bewertungskategorien</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
            {Object.keys(group.categories||{}).map(c=>(
              <span key={c} style={{padding:"6px 12px",borderRadius:16,background:t.innerCard,border:`1px solid ${t.cardBorder}`,fontSize:12,color:t.title}}>{CATEGORY_DEFS[c]?.icon} {CATEGORY_DEFS[c]?.label}</span>
            ))}
            {Object.values(group.custom||{}).map(c=>(
              <span key={c.id} style={{padding:"6px 12px",borderRadius:16,background:t.innerCard,border:`1px solid ${t.cardBorder}`,fontSize:12,color:t.title}}>{c.icon||"⭐"} {c.name}</span>
            ))}
          </div>
          {inactiveStandard.length>0&&(
            <>
              <div style={{fontSize:11,color:t.sub,marginBottom:6}}>Standard-Kategorie aktivieren:</div>
              {CATEGORY_GROUPS.map(grp=>{
                const items=grp.cats.filter(c=>inactiveStandard.includes(c));
                if(!items.length)return null;
                return(
                  <div key={grp.id} style={{marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:t.tick,marginBottom:4}}>{grp.icon} {grp.label}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {items.map(c=>(
                        <button key={c} onClick={()=>enableCategory(c)}
                          style={{padding:"6px 12px",borderRadius:16,background:"transparent",border:`1.5px dashed ${t.inputBorder}`,fontSize:12,color:t.sub,cursor:"pointer"}}>
                          + {CATEGORY_DEFS[c].icon} {CATEGORY_DEFS[c].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
      {msg&&<div style={{fontSize:12,color:msg.startsWith("✅")?"#2e7d52":t.danger,marginTop:12}}>{msg}</div>}
    </SwipeableSheet>
  );
}

// ModeMenu & Header
function modesForGroup(group){
  const order=CATEGORY_GROUPS.flatMap(g=>g.cats);
  const modes=order.filter(c=>group.categories?.[c]).map(c=>[c,CATEGORY_DEFS[c].icon,CATEGORY_DEFS[c].label]);
  Object.values(group.custom||{}).forEach(c=>modes.push(["c:"+c.id,c.icon||"⭐",c.name]));
  return modes;
}
function ModeMenu({mode,setMode,modes,onClose,t}){
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={300}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title,marginBottom:16,textAlign:"center"}}>Bereich wechseln</div>
        {(()=>{
          const byId=Object.fromEntries(modes.map(m=>[m[0],m]));
          const sections=CATEGORY_GROUPS.map(g=>({...g,items:g.cats.filter(c=>byId[c]).map(c=>byId[c])})).filter(g=>g.items.length>0);
          const customItems=modes.filter(m=>m[0].startsWith("c:"));
          if(customItems.length)sections.push({id:"custom",icon:"⭐",label:"Weitere",items:customItems});
          return sections.map(sec=>(
            <div key={sec.id} style={{marginBottom:10}}>
              {sections.length>1&&<div style={{fontSize:11,fontWeight:700,color:t.sub,margin:"4px 2px 6px",fontFamily:"'Space Grotesk',sans-serif"}}>{sec.icon} {sec.label}</div>}
              {sec.items.map(([id,icon,label])=>(
                <button key={id} onClick={()=>{setMode(id);onClose();}}
                  style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:8,background:mode===id?`${t.restNavActive}18`:t.innerCard,borderRadius:12,border:`1.5px solid ${mode===id?t.restNavActive:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:24}}>{icon}</span>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:mode===id?700:400,color:t.title,flex:1}}>{label}</span>
                  {mode===id&&<span style={{color:t.restNavActive,fontSize:18}}>✓</span>}
                </button>
              ))}
            </div>
          ));
        })()}
    </SwipeableSheet>
  );
}
function AppHeader({user,dark,setDark,mode,setMode,modes,t,title,subtitle,headerBg,headerSub,onBack,isAdmin,onSettings,onLogout}){
  const [showMenu,setShowMenu]=useState(false);
  const currentIcon=(modes.find(m=>m[0]===mode)||["","⭐"])[1];
  return(
    <>
      <div style={{background:headerBg,padding:"20px 20px 16px",color:"white",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",gap:10,flex:1,minWidth:0}}>
          <button onClick={onBack} title="Zur Gruppenübersicht" style={{background:"none",border:"none",color:"rgba(255,255,255,0.8)",fontSize:20,cursor:"pointer",paddingTop:1,flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,lineHeight:1.3,letterSpacing:"-0.01em"}}>{title}</div>
            <div style={{fontSize:12,color:headerSub,marginTop:5}}>{subtitle}</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0,marginLeft:12}}>
          <div style={{display:"flex",gap:6}}>
            <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout} extraItems={isAdmin?[{icon:"⚙️",label:"Gruppen-Einstellungen",onClick:onSettings}]:[]}/>
          </div>
          {modes.length>1&&<button onClick={()=>setShowMenu(true)} title="Bereich wechseln" style={{background:t.modeSwitchBg,border:`1px solid ${t.modeSwitchBorder}`,borderRadius:18,padding:"5px 11px",cursor:"pointer",fontSize:15}}>{currentIcon}</button>}
        </div>
      </div>
      {showMenu&&<ModeMenu mode={mode} setMode={setMode} modes={modes} onClose={()=>setShowMenu(false)} t={t}/>}
    </>
  );
}

// RESTAURANT FÜHRER
function RestCard({r,onClick,t}){
  const avg=getAvgRest(r);
  const cuisines=Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[]);
  const raters=Object.keys(r.ratings||{});
  return(
    <div onClick={onClick} style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0,paddingRight:8}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{r.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>📍 {r.city} · {cuisines.join(" & ")}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.restAccent}}>{avg.avg}</div>
          <div style={{fontSize:10,color:t.tick}}>Ø · {avg.count} Wertung{avg.count!==1?"en":""}</div>
        </div>
      </div>
      <div style={{marginTop:10}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <Badge value={avg.food} color="#2e7d52"/><span style={{fontSize:11,color:t.sub}}>Essen</span>
        <Badge value={avg.service} color="#1a5f8c"/><span style={{fontSize:11,color:t.sub}}>Service</span>
        <span style={{marginLeft:"auto",fontSize:13,color:t.sub}}>{"€".repeat(avg.price)}</span>
      </div>
      {raters.length>0&&<div style={{textAlign:"right",marginTop:6}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>bewertet von {raters.join(", ")}</span></div>}
    </div>
  );
}
function RestSuggCard({s,onClick,t}){
  const cuisines=Array.isArray(s.cuisines)?s.cuisines:[];
  return(
    <div onClick={onClick} style={{background:t.suggCard,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.suggBorder}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title}}>{s.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>📍 {s.city}{cuisines.length?" · "+cuisines.join(" & "):""}</div>
        </div>
        <span style={{background:t.suggBadgeBg,borderRadius:10,padding:"4px 10px",fontSize:11,color:t.restSuggAccent,fontWeight:600,flexShrink:0,marginLeft:8}}>💡 Vorschlag</span>
      </div>
      <div style={{textAlign:"right",marginTop:8}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>vorgeschlagen von {s.author}</span></div>
    </div>
  );
}
function RestModal({r,user,onClose,onDelete,onEdit,onRate,t}){
  if(!r)return null;
  const avg=getAvgRest(r);
  const cuisines=Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[]);
  const ratings=Object.entries(r.ratings||{});
  const isAuthor=user===r.author;const hasRated=!!r.ratings?.[user];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title,letterSpacing:"-0.01em"}}>{r.name}</div>
      <div style={{color:t.sub,fontSize:13,marginTop:4}}>📍 {r.city} · {cuisines.join(" & ")}</div>
      <div style={{marginTop:14}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[["🍽️ Essen",avg.food,"#2e7d52"],["🤝 Service",avg.service,"#1a5f8c"]].map(([lbl,val,col])=>(
          <div key={lbl} style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:11,color:t.sub}}>{lbl}</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:col}}>{val}/10</div>
            <div style={{fontSize:10,color:t.tick}}>Durchschnitt</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
        <span style={{fontSize:12,color:t.sub}}>Preis: </span>
        <span style={{fontWeight:700,color:t.restAccent}}>{"€".repeat(avg.price)} · {PRICE_LABELS[avg.price]}</span>
      </div>
      <div style={{marginTop:20}}>
        <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:8,fontWeight:700}}>Alle Bewertungen ({avg.count})</div>
        {ratings.map(([author,rating])=>(
          <div key={author} style={{background:t.ratingRow,borderRadius:10,padding:"10px 14px",marginBottom:6,border:`1px solid ${t.ratingBorder}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:13,color:t.title}}>{author}</span><span style={{fontSize:12,color:t.sub}}>★ {rating.stars}/10</span></div>
            <div style={{display:"flex",gap:12,marginTop:4,fontSize:12,color:t.sub}}><span>🍽️ {rating.food}/10</span><span>🤝 {rating.service}/10</span><span>{"€".repeat(rating.price)}</span></div>
            {rating.kommentar&&<div style={{marginTop:8,fontSize:12,color:t.sub,fontStyle:"italic",background:t.innerCard,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>"{rating.kommentar}"</div>}
          </div>
        ))}
      </div>
      {isAuthor&&<div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>onEdit(r)} style={{padding:"12px",borderRadius:12,background:t.innerCard,color:t.title,border:`1px solid ${t.cardBorder}`,fontSize:14,cursor:"pointer",fontWeight:600}}>✏️ Bearbeiten</button>
        <button onClick={()=>onDelete(r.id)} style={{padding:"12px",borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Löschen</button>
      </div>}
      {!isAuthor&&!hasRated&&<button onClick={()=>onRate(r)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>⭐ Eigene Wertung abgeben</button>}
      {!isAuthor&&hasRated&&<button onClick={()=>onRate(r)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>✏️ Meine Wertung bearbeiten</button>}
    </SwipeableSheet>
  );
}
function RestSuggModal({s,user,onClose,onDelete,onConvert,t}){
  if(!s)return null;
  const cuisines=Array.isArray(s.cuisines)?s.cuisines:[];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title}}>{s.name}</div>
        <span style={{background:t.suggBadgeBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:t.restSuggAccent,fontWeight:600}}>💡 Vorschlag</span>
      </div>
      <div style={{color:t.sub,fontSize:13}}>📍 {s.city}{cuisines.length?" · "+cuisines.join(" & "):""}</div>
      <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14}}>
        <div style={{fontSize:13,color:t.sub}}>Noch nicht besucht.</div>
        <div style={{fontSize:12,color:t.tick,marginTop:4,fontStyle:"italic"}}>Vorgeschlagen von {s.author}</div>
      </div>
      <button onClick={()=>onConvert(s)} style={{marginTop:16,width:"100%",padding:15,borderRadius:12,background:t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>⭐ Jetzt bewerten & übernehmen</button>
      {user===s.author&&<button onClick={()=>onDelete(s.id)} style={{marginTop:10,width:"100%",padding:13,borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Vorschlag löschen</button>}
    </SwipeableSheet>
  );
}
function RestaurantApp({user,dark,setDark,mode,setMode,modes,t,group,members,onBack,isAdmin,onSettings,onLogout}){
  const [view,setView]=useState("list");
  const [activeSection,setSection]=useState("list");
  const [restaurants,setRestaurants]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({...EMPTY_REST});
  const [ratingForm,setRatingForm]=useState({...EMPTY_RATING});
  const [ratingTarget,setRatingTarget]=useState(null);
  const [suggForm,setSuggForm]=useState({...EMPTY_SUGG});
  const [suggToConvert,setSuggToConvert]=useState(null);
  const [restFilter,setRestFilter]=useState({search:"",k1:"",k2:"",author:""});
  const [suggFilter,setSuggFilter]=useState({search:"",k1:"",k2:""});
  const [selected,setSelected]=useState(null);
  const [suggSelected,setSuggSelected]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [errors,setErrors]=useState({});
  const [suggErrors,setSuggErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  useEffect(()=>{
    let ref;try{ref=db.ref("restaurants");ref.on("value",snap=>{const d=snap.val();setRestaurants(d?Object.values(d):[]);setLoading(false);},()=>setLoading(false));}catch{setLoading(false);}
    const tm=setTimeout(()=>setLoading(false),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[]);
  useEffect(()=>{
    let ref;try{ref=db.ref("suggestions");ref.on("value",snap=>{const d=snap.val();setSuggestions(d?Object.values(d):[]);});}catch{}
    return()=>ref&&ref.off();
  },[]);
  const visible=restaurants.map(r=>restrictToMembers(normalizeRest(r),members)).filter(r=>Object.keys(r.ratings).length>0||members.includes(r.author));
  const visibleSugg=suggestions.filter(s=>members.includes(s.author));
  const cities=[...new Set(visible.map(r=>r.city?.trim()).filter(Boolean))].sort();
  const cuisines=[...new Set(visible.flatMap(r=>Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[])))].sort();
  const allRaters=[...new Set(visible.flatMap(r=>Object.keys(r.ratings||{})))].sort();
  const filteredRest=visible.filter(r=>{
    const rc=Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[]);
    return(!restFilter.k1||r.city===restFilter.k1)&&(!restFilter.k2||rc.includes(restFilter.k2))&&(!restFilter.author||Object.keys(r.ratings||{}).includes(restFilter.author))&&(!restFilter.search||r.name.toLowerCase().includes(restFilter.search.toLowerCase()));
  }).sort((a,b)=>getAvgRest(b).avg-getAvgRest(a).avg);
  const suggCities=[...new Set(visibleSugg.map(s=>s.city?.trim()).filter(Boolean))].sort();
  const suggCuisines=[...new Set(visibleSugg.flatMap(s=>Array.isArray(s.cuisines)?s.cuisines:[]))].sort();
  const filteredSugg=visibleSugg.filter(s=>{
    const c=Array.isArray(s.cuisines)?s.cuisines:[];
    return(!suggFilter.k1||s.city===suggFilter.k1)&&(!suggFilter.k2||c.includes(suggFilter.k2))&&(!suggFilter.search||s.name.toLowerCase().includes(suggFilter.search.toLowerCase()));
  });
  const valRest=()=>{const e={};if(!form.name.trim())e.name="Bitte Name eingeben";if(!form.city.trim())e.city="Bitte Stadt eingeben";if(!form.cuisines.length)e.cuisines="Bitte Küche auswählen";return e;};
  const valSugg=()=>{const e={};if(!suggForm.name.trim())e.name="Bitte Name eingeben";if(!suggForm.city.trim())e.city="Bitte Stadt eingeben";if(!suggForm.cuisines.length)e.cuisines="Bitte Küche auswählen";return e;};
  const handleAdd=async()=>{const e=valRest();if(Object.keys(e).length){setErrors(e);return;}
    const _key=dupKey(form.name,form.city);
    const _dup=restaurants.find(r=>dupKey(r.name,r.city)===_key);
    if(_dup){
      if(!window.confirm("„"+_dup.name+"“ gibt es hier bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?"))return;
      setSaving(true);
      try{
        await db.ref("restaurants/"+_dup.id+"/ratings/"+user).set(stamped({food:form.food,service:form.service,price:form.price,stars:form.stars,kommentar:form.kommentar}));
        if(suggToConvert){await db.ref("suggestions/"+suggToConvert.id).remove();setSuggToConvert(null);}
        setForm({...EMPTY_REST});setErrors({});setView("list");setSection("list");showToast("✅ Wertung hinzugefügt!");
      }catch{showToast("⚠️ Fehler");}
      setSaving(false);return;
    }
    const _dupS=!suggToConvert&&suggestions.find(s=>dupKey(s.name,s.city)===_key);
    if(_dupS){
      if(!window.confirm("„"+_dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?"))return;
      try{await db.ref("suggestions/"+_dupS.id).remove();}catch{}
    }
    setSaving(true);try{const id=Date.now().toString();await db.ref("restaurants/"+id).set({id,name:form.name,city:form.city.trim(),cuisines:form.cuisines,author:user,ratings:{[user]:stamped({food:form.food,service:form.service,price:form.price,stars:form.stars,kommentar:form.kommentar})}});if(suggToConvert){await db.ref("suggestions/"+suggToConvert.id).remove();setSuggToConvert(null);}setForm({...EMPTY_REST});setErrors({});setView("list");setSection("list");showToast("✅ Gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleEdit=r=>{const my=r.ratings?.[user]||EMPTY_RATING;setForm({name:r.name,city:r.city,cuisines:Array.isArray(r.cuisines)?r.cuisines:(r.cuisine?[r.cuisine]:[]),food:my.food,service:my.service,price:my.price,stars:my.stars,kommentar:my.kommentar||""});setEditingId(r.id);setSelected(null);setSuggToConvert(null);setErrors({});setView("add");setSection("list");};
  const handleUpdate=async()=>{const e=valRest();if(Object.keys(e).length){setErrors(e);return;}setSaving(true);try{await db.ref("restaurants/"+editingId).update({name:form.name,city:form.city.trim(),cuisines:form.cuisines});await db.ref("restaurants/"+editingId+"/ratings/"+user).set(stamped({food:form.food,service:form.service,price:form.price,stars:form.stars,kommentar:form.kommentar}));setForm({...EMPTY_REST});setEditingId(null);setErrors({});setView("list");setSection("list");showToast("✅ Aktualisiert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDelete=async id=>{if(!window.confirm("Diesen Eintrag wirklich löschen? Alle Bewertungen dazu gehen verloren."))return;try{await db.ref("restaurants/"+id).remove();setSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const startRate=r=>{setRatingForm(r.ratings?.[user]||{...EMPTY_RATING});setRatingTarget(r);setSelected(null);setView("rate");};
  const handleSaveRating=async()=>{setSaving(true);try{
    // Nur die eigene Wertung schreiben: fremde ratings/<Name> verbieten die Regeln. Die Wertung des
    // Autors bei Einträgen im alten Format ergänzt normalizeRest() beim Lesen.
    await db.ref("restaurants/"+ratingTarget.id+"/ratings/"+user).set(stamped(ratingForm));
    setView("list");setSection("list");setRatingTarget(null);showToast("✅ Wertung gespeichert!");
  }catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleAddSugg=async()=>{const e=valSugg();if(Object.keys(e).length){setSuggErrors(e);return;}
    const _key=dupKey(suggForm.name,suggForm.city);
    const _dupS=suggestions.find(s=>dupKey(s.name,s.city)===_key);
    if(_dupS){showToast("💡 Bereits vorgeschlagen von "+_dupS.author+"!");return;}
    const _dupR=restaurants.find(r=>dupKey(r.name,r.city)===_key);
    if(_dupR){showToast("⭐ Gibt es schon in den Bewertungen!");return;}
    setSaving(true);try{const id=Date.now().toString();await db.ref("suggestions/"+id).set({id,name:suggForm.name,city:suggForm.city.trim(),cuisines:suggForm.cuisines,author:user});setSuggForm({...EMPTY_SUGG});setSuggErrors({});setView("suggestions");setSection("suggestions");showToast("✅ Vorschlag gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDeleteSugg=async id=>{if(!window.confirm("Diesen Vorschlag wirklich löschen?"))return;try{await db.ref("suggestions/"+id).remove();setSuggSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const handleConvertSugg=s=>{setForm({name:s.name,city:s.city,cuisines:Array.isArray(s.cuisines)?s.cuisines:[],food:5,service:5,price:3,stars:7,kommentar:""});setSuggToConvert(s);setEditingId(null);setErrors({});setSuggSelected(null);setView("add");setSection("list");};
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const rf=(k,v)=>setRatingForm(p=>({...p,[k]:v}));
  const sf=(k,v)=>setSuggForm(p=>({...p,[k]:v}));
  const navTo=s=>{setSection(s);setView(s);setSelected(null);setSuggSelected(null);};
  const navAdd=()=>{if(activeSection==="list"){setForm({...EMPTY_REST});setEditingId(null);setErrors({});setSuggToConvert(null);setView("add");}else{setSuggForm({...EMPTY_SUGG});setSuggErrors({});setView("add-suggestion");}};
  const navActive=view==="list"||view==="rate";
  const suggActive=view==="suggestions";
  const addActive=view==="add"||view==="add-suggestion";
  const navColor=t.restNavActive;
  const btn={width:"100%",padding:16,borderRadius:14,background:saving?"#ccc":t.restBtn,color:t.btnColor,fontSize:16,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",fontFamily:"'Space Grotesk',sans-serif",opacity:saving?0.7:1};
  if(loading)return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>🍽️</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",position:"relative",paddingBottom:92,transition:"background 0.3s"}}>
      <AppHeader user={user} dark={dark} setDark={setDark} mode={mode} setMode={setMode} modes={modes} t={t} onLogout={onLogout}
        title={"🍽️ Restaurants · "+group.name}
        subtitle={visible.length+" bewertet · "+visibleSugg.length+" Vorschlag"+(visibleSugg.length!==1?"e":"")}
        headerBg={t.restHeaderBg} headerSub={t.restHeaderSub} onBack={onBack} isAdmin={isAdmin} onSettings={onSettings}/>
      {view==="list"&&(
        <div style={{padding:"20px 16px"}}>
          <FilterBar filter={restFilter} setFilter={setRestFilter} col1={cities} col2={cuisines} col1Label="Alle Städte" col2Label="Alle Küchen" extra={[["author","Alle Bewerter",allRaters]]} filterOn={t.restFilterOn} filterOnColor={t.restFilterOnColor} t={t}/>
          {filteredRest.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>🍽️</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visible.length===0?"Noch keine Restaurants":"Keine Treffer"}</div></div>):filteredRest.map(r=><RestCard key={r.id} r={r} onClick={()=>setSelected(r)} t={t}/>)}
        </div>
      )}
      {view==="suggestions"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:4}}>💡 Restaurant Vorschläge</div>
          <div style={{fontSize:13,color:t.sub,marginBottom:16}}>Restaurants die ihr noch besuchen möchtet</div>
          <FilterBar filter={suggFilter} setFilter={setSuggFilter} col1={suggCities} col2={suggCuisines} col1Label="Alle Städte" col2Label="Alle Küchen" filterOn={t.restFilterOn} filterOnColor={t.restFilterOnColor} t={t}/>
          {filteredSugg.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>💡</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visibleSugg.length===0?"Noch keine Vorschläge":"Keine Treffer"}</div></div>):filteredSugg.map(s=><RestSuggCard key={s.id} s={s} onClick={()=>setSuggSelected(s)} t={t}/>)}
        </div>
      )}
      {view==="add"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
            <button onClick={()=>{setView(editingId?"list":activeSection);setForm({...EMPTY_REST});setEditingId(null);setSuggToConvert(null);setErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub,paddingTop:2}}>←</button>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>{editingId?"Bearbeiten":suggToConvert?"Jetzt bewerten":"Restaurant hinzufügen"}</div>{suggToConvert&&<div style={{fontSize:12,color:t.restSuggAccent,marginTop:3}}>💡 Aus Vorschlägen übernommen</div>}</div>
          </div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Name</label><input value={form.name} onChange={e=>{f("name",e.target.value);setErrors(p=>({...p,name:""}))}} placeholder="z.B. Trattoria da Marco" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{errors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Stadt</label><input value={form.city} onChange={e=>{f("city",e.target.value);setErrors(p=>({...p,city:""}))}} placeholder="z.B. München" list="r-cities" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.city?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="r-cities">{cities.map(c=><option key={c} value={c}/>)}</datalist>{errors.city&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.city}</div>}</div>
          <div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Art der Küche <span style={{fontWeight:400,color:form.cuisines.length===3?t.danger:t.tick}}>({form.cuisines.length}/3)</span></label><TypeChips value={form.cuisines} onChange={v=>{f("cuisines",v);setErrors(p=>({...p,cuisines:""}));}} options={CUISINES} chipOn={t.restChipOn} chipOnColor={t.restChipOnColor} t={t}/>{errors.cuisines&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.cuisines}</div>}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,fontWeight:700}}>Deine Bewertung</div>
            <Slider label="🍽️ Essen" value={form.food} min={0} max={10} onChange={v=>f("food",v)} color="#2e7d52" t={t}/>
            <Slider label="🤝 Service" value={form.service} min={0} max={10} onChange={v=>f("service",v)} color="#1a5f8c" t={t}/>
            <Slider label="💶 Preis" value={form.price} min={1} max={5} onChange={v=>f("price",v)} color={t.restAccent} display={"€".repeat(form.price)+" "+PRICE_LABELS[form.price]} t={t}/>
            <Slider label="⭐ Sterne" value={form.stars} min={0} max={10} onChange={v=>f("stars",v)} color="#e8a020" t={t}/>
            <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
              <textarea value={form.kommentar} onChange={e=>f("kommentar",e.target.value)} placeholder="Notizen, Empfehlungen, besondere Gerichte…" style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
          </div>
          <button onClick={editingId?handleUpdate:handleAdd} disabled={saving} style={btn}>{saving?"Speichert…":editingId?"Änderungen speichern":suggToConvert?"Bewertung speichern":"Restaurant speichern"}</button>
        </div>
      )}
      {view==="add-suggestion"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><button onClick={()=>{setView("suggestions");setSuggForm({...EMPTY_SUGG});setSuggErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>Vorschlag hinzufügen</div></div>
          <div style={{background:t.suggBadgeBg,borderRadius:12,padding:"10px 14px",marginBottom:20,border:`1px solid ${t.suggBorder}`}}><div style={{fontSize:12,color:t.restSuggAccent}}>💡 Noch nicht besucht — als Idee für den nächsten Abend.</div></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Name</label><input value={suggForm.name} onChange={e=>{sf("name",e.target.value);setSuggErrors(p=>({...p,name:""}))}} placeholder="z.B. Trattoria da Marco" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{suggErrors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Stadt</label><input value={suggForm.city} onChange={e=>{sf("city",e.target.value);setSuggErrors(p=>({...p,city:""}))}} placeholder="z.B. München" list="rs-cities" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.city?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="rs-cities">{[...new Set([...cities,...suggCities])].map(c=><option key={c} value={c}/>)}</datalist>{suggErrors.city&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.city}</div>}</div>
          <div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Art der Küche <span style={{fontWeight:400,color:suggForm.cuisines.length===3?t.danger:t.tick}}>({suggForm.cuisines.length}/3)</span></label><TypeChips value={suggForm.cuisines} onChange={v=>{sf("cuisines",v);setSuggErrors(p=>({...p,cuisines:""}));}} options={CUISINES} chipOn={t.restChipOn} chipOnColor={t.restChipOnColor} t={t}/>{suggErrors.cuisines&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.cuisines}</div>}</div>
          <button onClick={handleAddSugg} disabled={saving} style={btn}>{saving?"Speichert…":"Vorschlag speichern"}</button>
        </div>
      )}
      {view==="rate"&&ratingTarget&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><button onClick={()=>{setView("list");setSection("list");setRatingTarget(null);}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title}}>Wertung abgeben</div></div>
          <div style={{fontSize:13,color:t.sub,marginBottom:20,paddingLeft:36}}>{ratingTarget.name} · {ratingTarget.city}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <Slider label="🍽️ Essen" value={ratingForm.food} min={0} max={10} onChange={v=>rf("food",v)} color="#2e7d52" t={t}/>
            <Slider label="🤝 Service" value={ratingForm.service} min={0} max={10} onChange={v=>rf("service",v)} color="#1a5f8c" t={t}/>
            <Slider label="💶 Preis" value={ratingForm.price} min={1} max={5} onChange={v=>rf("price",v)} color={t.restAccent} display={"€".repeat(ratingForm.price)+" "+PRICE_LABELS[ratingForm.price]} t={t}/>
            <Slider label="⭐ Sterne" value={ratingForm.stars} min={0} max={10} onChange={v=>rf("stars",v)} color="#e8a020" t={t}/>
            <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
              <textarea value={ratingForm.kommentar||""} onChange={e=>rf("kommentar",e.target.value)} placeholder="Notizen, Empfehlungen, besondere Gerichte…" style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
          </div>
          <button onClick={handleSaveRating} disabled={saving} style={btn}>{saving?"Speichert…":"Wertung speichern"}</button>
        </div>
      )}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:t.navBg,borderTop:`1px solid ${t.navBorder}`,display:"flex",boxShadow:`0 -4px 20px ${t.navShadow}`,transition:"background 0.3s"}}>
        {[["list",navActive,()=>navTo("list"),"🍽️","Restaurant\nÜbersicht"],["sugg",suggActive,()=>navTo("suggestions"),"💡","Restaurant\nVorschläge"],["add-btn",addActive,navAdd,"➕","Hinzufügen"]].map(([key,active,onClick,icon,label])=>(
          <button key={key} onClick={onClick} style={{flex:1,padding:"11px 4px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:9,color:active?navColor:t.navInactive,fontWeight:active?700:400,textAlign:"center",lineHeight:1.25,whiteSpace:"pre-line"}}>{label}</span>
            {active&&<div style={{width:20,height:2,background:navColor,borderRadius:1,marginTop:1}}/>}
          </button>
        ))}
      </div>
      <RestModal r={selected} user={user} onClose={()=>setSelected(null)} onDelete={handleDelete} onEdit={handleEdit} onRate={startRate} t={t}/>
      <RestSuggModal s={suggSelected} user={user} onClose={()=>setSuggSelected(null)} onDelete={handleDeleteSugg} onConvert={handleConvertSugg} t={t}/>
      <Toast msg={toast} color={t.restToast} textColor={t.toastColor}/>
    </div>
  );
}

// WHISKY FÜHRER
function WhiskyCard({w,onClick,t}){
  const avg=getAvgWhisky(w);
  const types=Array.isArray(w.types)?w.types:[];
  const raters=Object.keys(w.ratings||{});
  return(
    <div onClick={onClick} style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0,paddingRight:8}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{w.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>🥃 {w.distillery}{types.length?" · "+types.join(" & "):""}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.whiskyAccent}}>{avg.stars}</div>
          <div style={{fontSize:10,color:t.tick}}>Ø · {avg.count} Wertung{avg.count!==1?"en":""}</div>
        </div>
      </div>
      <div style={{marginTop:10}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <Badge value={avg.rauchigkeit} color="#505868"/><span style={{fontSize:11,color:t.sub}}>💨 Rauchigkeit</span>
        <Badge value={avg.fruchtigkeit} color="#c0306a"/><span style={{fontSize:11,color:t.sub}}>🍒 Fruchtigkeit</span>
      </div>
      {raters.length>0&&<div style={{textAlign:"right",marginTop:6}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>bewertet von {raters.join(", ")}</span></div>}
    </div>
  );
}
function WhiskySuggCard({s,onClick,t}){
  const types=Array.isArray(s.types)?s.types:[];
  return(
    <div onClick={onClick} style={{background:t.suggCard,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.suggBorder}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title}}>{s.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>🥃 {s.distillery}{types.length?" · "+types.join(" & "):""}</div>
        </div>
        <span style={{background:t.suggBadgeBg,borderRadius:10,padding:"4px 10px",fontSize:11,color:t.whiskySuggAccent,fontWeight:600,flexShrink:0,marginLeft:8}}>💡 Vorschlag</span>
      </div>
      <div style={{textAlign:"right",marginTop:8}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>vorgeschlagen von {s.author}</span></div>
    </div>
  );
}
function WhiskyModal({w,user,onClose,onDelete,onEdit,onRate,t}){
  if(!w)return null;
  const avg=getAvgWhisky(w);
  const types=Array.isArray(w.types)?w.types:[];
  const ratings=Object.entries(w.ratings||{});
  const isAuthor=user===w.author;const hasRated=!!w.ratings?.[user];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title,letterSpacing:"-0.01em"}}>{w.name}</div>
      <div style={{color:t.sub,fontSize:13,marginTop:4}}>🥃 {w.distillery}{types.length?" · "+types.join(" & "):""}</div>
      <div style={{marginTop:14}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:12,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
        <div style={{fontSize:11,color:t.sub}}>⭐ Gesamtgeschmack</div>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color:t.whiskyAccent}}>{avg.stars}/10</div>
        <div style={{fontSize:10,color:t.tick}}>Durchschnitt aus {avg.count} Wertung{avg.count!==1?"en":""}</div>
      </div>
      <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:t.sub}}>💨 Rauchigkeit</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#505868"}}>{avg.rauchigkeit}/10</div>
        </div>
        <div style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:t.sub}}>🍒 Fruchtigkeit</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#c0306a"}}>{avg.fruchtigkeit}/10</div>
        </div>
      </div>
      <div style={{marginTop:20}}>
        <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:8,fontWeight:700}}>Alle Bewertungen ({avg.count})</div>
        {ratings.map(([author,rating])=>(
          <div key={author} style={{background:t.ratingRow,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${t.ratingBorder}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:700,fontSize:13,color:t.title}}>{author}</span><span style={{fontSize:12,color:t.whiskyAccent}}>★ {rating.stars}/10</span></div>
            <div style={{display:"flex",gap:12,fontSize:12,color:t.sub}}><span>💨 {rating.rauchigkeit}/10</span><span>🍒 {rating.fruchtigkeit}/10</span></div>
            {rating.kommentar&&<div style={{marginTop:8,fontSize:12,color:t.sub,fontStyle:"italic",background:t.innerCard,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>"{rating.kommentar}"</div>}
          </div>
        ))}
      </div>
      {isAuthor&&<div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>onEdit(w)} style={{padding:"12px",borderRadius:12,background:t.innerCard,color:t.title,border:`1px solid ${t.cardBorder}`,fontSize:14,cursor:"pointer",fontWeight:600}}>✏️ Bearbeiten</button>
        <button onClick={()=>onDelete(w.id)} style={{padding:"12px",borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Löschen</button>
      </div>}
      {!isAuthor&&!hasRated&&<button onClick={()=>onRate(w)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.whiskyBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>🥃 Eigene Wertung abgeben</button>}
      {!isAuthor&&hasRated&&<button onClick={()=>onRate(w)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>✏️ Meine Wertung bearbeiten</button>}
    </SwipeableSheet>
  );
}
function WhiskySuggModal({s,user,onClose,onDelete,onConvert,t}){
  if(!s)return null;
  const types=Array.isArray(s.types)?s.types:[];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title}}>{s.name}</div>
        <span style={{background:t.suggBadgeBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:t.whiskySuggAccent,fontWeight:600}}>💡 Vorschlag</span>
      </div>
      <div style={{color:t.sub,fontSize:13}}>🥃 {s.distillery}{types.length?" · "+types.join(" & "):""}</div>
      <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14}}>
        <div style={{fontSize:13,color:t.sub}}>Noch nicht probiert.</div>
        <div style={{fontSize:12,color:t.tick,marginTop:4,fontStyle:"italic"}}>Vorgeschlagen von {s.author}</div>
      </div>
      <button onClick={()=>onConvert(s)} style={{marginTop:16,width:"100%",padding:15,borderRadius:12,background:t.whiskyBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>🥃 Jetzt bewerten & übernehmen</button>
      {user===s.author&&<button onClick={()=>onDelete(s.id)} style={{marginTop:10,width:"100%",padding:13,borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Vorschlag löschen</button>}
    </SwipeableSheet>
  );
}
function WhiskyRatingFields({form,setF,t}){
  return(
    <>
      <Slider label="⭐ Gesamtgeschmack" value={form.stars} min={0} max={10} onChange={v=>setF("stars",v)} color={t.whiskyAccent} t={t}/>
      <Slider label="💨 Rauchigkeit" value={form.rauchigkeit} min={0} max={10} onChange={v=>setF("rauchigkeit",v)} color="#505868" t={t}/>
      <Slider label="🍒 Fruchtigkeit" value={form.fruchtigkeit} min={0} max={10} onChange={v=>setF("fruchtigkeit",v)} color="#c0306a" t={t}/>
      <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
        <textarea value={form.kommentar||""} onChange={e=>setF("kommentar",e.target.value)} placeholder="Geschmacksnotizen, Aromen, erster Eindruck…" style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
    </>
  );
}
function WhiskyApp({user,dark,setDark,mode,setMode,modes,t,group,members,onBack,isAdmin,onSettings,onLogout}){
  const [view,setView]=useState("list");
  const [activeSection,setSection]=useState("list");
  const [whiskies,setWhiskies]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({...EMPTY_WHISKY});
  const [ratingForm,setRatingForm]=useState({...EMPTY_W_RATING});
  const [ratingTarget,setRatingTarget]=useState(null);
  const [suggForm,setSuggForm]=useState({...EMPTY_W_SUGG});
  const [suggToConvert,setSuggToConvert]=useState(null);
  const [wFilter,setWFilter]=useState({search:"",k1:"",k2:"",author:""});
  const [sFilter,setSFilter]=useState({search:"",k1:"",k2:""});
  const [selected,setSelected]=useState(null);
  const [suggSelected,setSuggSelected]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [errors,setErrors]=useState({});
  const [suggErrors,setSuggErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  useEffect(()=>{
    let ref;try{ref=db.ref("whiskies");ref.on("value",snap=>{const d=snap.val();setWhiskies(d?Object.values(d):[]);setLoading(false);},()=>setLoading(false));}catch{setLoading(false);}
    const tm=setTimeout(()=>setLoading(false),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[]);
  useEffect(()=>{
    let ref;try{ref=db.ref("whisky_suggestions");ref.on("value",snap=>{const d=snap.val();setSuggestions(d?Object.values(d):[]);});}catch{}
    return()=>ref&&ref.off();
  },[]);
  const visible=whiskies.map(w=>restrictToMembers(w,members)).filter(w=>Object.keys(w.ratings).length>0||members.includes(w.author));
  const visibleSugg=suggestions.filter(s=>members.includes(s.author));
  const distilleries=[...new Set(visible.map(w=>(w.distillery||"").trim()).filter(Boolean))].sort();
  const allTypes=[...new Set(visible.flatMap(w=>Array.isArray(w.types)?w.types:[]))].sort();
  const allRaters=[...new Set(visible.flatMap(w=>Object.keys(w.ratings||{})))].sort();
  const filteredW=visible.filter(w=>(!wFilter.k1||w.distillery===wFilter.k1)&&(!wFilter.k2||(Array.isArray(w.types)&&w.types.includes(wFilter.k2)))&&(!wFilter.author||Object.keys(w.ratings||{}).includes(wFilter.author))&&(!wFilter.search||w.name.toLowerCase().includes(wFilter.search.toLowerCase()))).sort((a,b)=>getAvgWhisky(b).stars-getAvgWhisky(a).stars);
  const suggDist=[...new Set(visibleSugg.map(s=>(s.distillery||"").trim()).filter(Boolean))].sort();
  const suggTypes=[...new Set(visibleSugg.flatMap(s=>Array.isArray(s.types)?s.types:[]))].sort();
  const filteredS=visibleSugg.filter(s=>(!sFilter.k1||s.distillery===sFilter.k1)&&(!sFilter.k2||(Array.isArray(s.types)&&s.types.includes(sFilter.k2)))&&(!sFilter.search||s.name.toLowerCase().includes(sFilter.search.toLowerCase())));
  const valW=()=>{const e={};if(!form.name.trim())e.name="Bitte Name eingeben";if(!form.distillery.trim())e.distillery="Bitte Destillerie eingeben";if(!form.types.length)e.types="Bitte Typ auswählen";return e;};
  const valS=()=>{const e={};if(!suggForm.name.trim())e.name="Bitte Name eingeben";if(!suggForm.distillery.trim())e.distillery="Bitte Destillerie eingeben";if(!suggForm.types.length)e.types="Bitte Typ auswählen";return e;};
  const handleAdd=async()=>{const e=valW();if(Object.keys(e).length){setErrors(e);return;}
    const _key=dupKey(form.name,form.distillery);
    const _dup=whiskies.find(w=>dupKey(w.name,w.distillery)===_key);
    if(_dup){
      if(!window.confirm("„"+_dup.name+"“ gibt es hier bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?"))return;
      setSaving(true);
      try{
        await db.ref("whiskies/"+_dup.id+"/ratings/"+user).set(stamped({stars:form.stars,rauchigkeit:form.rauchigkeit,fruchtigkeit:form.fruchtigkeit,kommentar:form.kommentar}));
        if(suggToConvert){await db.ref("whisky_suggestions/"+suggToConvert.id).remove();setSuggToConvert(null);}
        setForm({...EMPTY_WHISKY});setErrors({});setView("list");setSection("list");showToast("✅ Wertung hinzugefügt!");
      }catch{showToast("⚠️ Fehler");}
      setSaving(false);return;
    }
    const _dupS=!suggToConvert&&suggestions.find(s=>dupKey(s.name,s.distillery)===_key);
    if(_dupS){
      if(!window.confirm("„"+_dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?"))return;
      try{await db.ref("whisky_suggestions/"+_dupS.id).remove();}catch{}
    }
    setSaving(true);try{const id=Date.now().toString();await db.ref("whiskies/"+id).set({id,name:form.name,distillery:form.distillery.trim(),types:form.types,author:user,ratings:{[user]:stamped({stars:form.stars,rauchigkeit:form.rauchigkeit,fruchtigkeit:form.fruchtigkeit,kommentar:form.kommentar})}});if(suggToConvert){await db.ref("whisky_suggestions/"+suggToConvert.id).remove();setSuggToConvert(null);}setForm({...EMPTY_WHISKY});setErrors({});setView("list");setSection("list");showToast("✅ Whisky gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleEdit=w=>{const my=w.ratings?.[user]||EMPTY_W_RATING;setForm({name:w.name,distillery:w.distillery,types:Array.isArray(w.types)?w.types:[],stars:my.stars,rauchigkeit:my.rauchigkeit,fruchtigkeit:my.fruchtigkeit,kommentar:my.kommentar||""});setEditingId(w.id);setSelected(null);setSuggToConvert(null);setErrors({});setView("add");setSection("list");};
  const handleUpdate=async()=>{const e=valW();if(Object.keys(e).length){setErrors(e);return;}setSaving(true);try{await db.ref("whiskies/"+editingId).update({name:form.name,distillery:form.distillery.trim(),types:form.types});await db.ref("whiskies/"+editingId+"/ratings/"+user).set(stamped({stars:form.stars,rauchigkeit:form.rauchigkeit,fruchtigkeit:form.fruchtigkeit,kommentar:form.kommentar}));setForm({...EMPTY_WHISKY});setEditingId(null);setErrors({});setView("list");setSection("list");showToast("✅ Aktualisiert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDelete=async id=>{if(!window.confirm("Diesen Eintrag wirklich löschen? Alle Bewertungen dazu gehen verloren."))return;try{await db.ref("whiskies/"+id).remove();setSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const startRate=w=>{setRatingForm(w.ratings?.[user]||{...EMPTY_W_RATING});setRatingTarget(w);setSelected(null);setView("rate");};
  const handleSaveRating=async()=>{setSaving(true);try{await db.ref("whiskies/"+ratingTarget.id+"/ratings/"+user).set(stamped(ratingForm));setView("list");setSection("list");setRatingTarget(null);showToast("✅ Wertung gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleAddSugg=async()=>{const e=valS();if(Object.keys(e).length){setSuggErrors(e);return;}
    const _key=dupKey(suggForm.name,suggForm.distillery);
    const _dupS=suggestions.find(s=>dupKey(s.name,s.distillery)===_key);
    if(_dupS){showToast("💡 Bereits vorgeschlagen von "+_dupS.author+"!");return;}
    const _dupW=whiskies.find(w=>dupKey(w.name,w.distillery)===_key);
    if(_dupW){showToast("⭐ Gibt es schon in den Bewertungen!");return;}
    setSaving(true);try{const id=Date.now().toString();await db.ref("whisky_suggestions/"+id).set({id,name:suggForm.name,distillery:suggForm.distillery.trim(),types:suggForm.types,author:user});setSuggForm({...EMPTY_W_SUGG});setSuggErrors({});setView("suggestions");setSection("suggestions");showToast("✅ Vorschlag gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDeleteSugg=async id=>{if(!window.confirm("Diesen Vorschlag wirklich löschen?"))return;try{await db.ref("whisky_suggestions/"+id).remove();setSuggSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const handleConvertSugg=s=>{setForm({name:s.name,distillery:s.distillery,types:Array.isArray(s.types)?s.types:[],stars:7,rauchigkeit:5,fruchtigkeit:5,kommentar:""});setSuggToConvert(s);setEditingId(null);setErrors({});setSuggSelected(null);setView("add");setSection("list");};
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const rf=(k,v)=>setRatingForm(p=>({...p,[k]:v}));
  const sf=(k,v)=>setSuggForm(p=>({...p,[k]:v}));
  const navTo=s=>{setSection(s);setView(s);setSelected(null);setSuggSelected(null);};
  const navAdd=()=>{if(activeSection==="list"){setForm({...EMPTY_WHISKY});setEditingId(null);setErrors({});setSuggToConvert(null);setView("add");}else{setSuggForm({...EMPTY_W_SUGG});setSuggErrors({});setView("add-suggestion");}};
  const navActive=view==="list"||view==="rate";
  const suggActive=view==="suggestions";
  const addActive=view==="add"||view==="add-suggestion";
  const navColor=t.whiskyNavActive;
  const btn={width:"100%",padding:16,borderRadius:14,background:saving?"#ccc":t.whiskyBtn,color:t.btnColor,fontSize:16,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",fontFamily:"'Space Grotesk',sans-serif",opacity:saving?0.7:1};
  if(loading)return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>🥃</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",position:"relative",paddingBottom:92,transition:"background 0.3s"}}>
      <AppHeader user={user} dark={dark} setDark={setDark} mode={mode} setMode={setMode} modes={modes} t={t} onLogout={onLogout}
        title={"🥃 Whiskys · "+group.name}
        subtitle={visible.length+" bewertet · "+visibleSugg.length+" Vorschlag"+(visibleSugg.length!==1?"e":"")}
        headerBg={t.whiskyHeaderBg} headerSub={t.whiskyHeaderSub} onBack={onBack} isAdmin={isAdmin} onSettings={onSettings}/>
      {view==="list"&&(
        <div style={{padding:"20px 16px"}}>
          <FilterBar filter={wFilter} setFilter={setWFilter} col1={distilleries} col2={allTypes} col1Label="Alle Destillerien" col2Label="Alle Typen" extra={[["author","Alle Bewerter",allRaters]]} filterOn={t.whiskyFilterOn} filterOnColor={t.whiskyFilterOnColor} t={t}/>
          {filteredW.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>🥃</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visible.length===0?"Noch keine Whiskys":"Keine Treffer"}</div></div>):filteredW.map(w=><WhiskyCard key={w.id} w={w} onClick={()=>setSelected(w)} t={t}/>)}
        </div>
      )}
      {view==="suggestions"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:4}}>💡 Whisky Vorschläge</div>
          <div style={{fontSize:13,color:t.sub,marginBottom:16}}>Whiskys die ihr noch probieren möchtet</div>
          <FilterBar filter={sFilter} setFilter={setSFilter} col1={suggDist} col2={suggTypes} col1Label="Alle Destillerien" col2Label="Alle Typen" filterOn={t.whiskyFilterOn} filterOnColor={t.whiskyFilterOnColor} t={t}/>
          {filteredS.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>💡</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visibleSugg.length===0?"Noch keine Vorschläge":"Keine Treffer"}</div></div>):filteredS.map(s=><WhiskySuggCard key={s.id} s={s} onClick={()=>setSuggSelected(s)} t={t}/>)}
        </div>
      )}
      {view==="add"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
            <button onClick={()=>{setView(editingId?"list":activeSection);setForm({...EMPTY_WHISKY});setEditingId(null);setSuggToConvert(null);setErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub,paddingTop:2}}>←</button>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>{editingId?"Bearbeiten":suggToConvert?"Jetzt bewerten":"Whisky hinzufügen"}</div>{suggToConvert&&<div style={{fontSize:12,color:t.whiskySuggAccent,marginTop:3}}>💡 Aus Vorschlägen übernommen</div>}</div>
          </div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Whisky Name</label><input value={form.name} onChange={e=>{f("name",e.target.value);setErrors(p=>({...p,name:""}))}} placeholder="z.B. Laphroaig 10 Jahre" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{errors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Destillerie / Herkunft</label><input value={form.distillery} onChange={e=>{f("distillery",e.target.value);setErrors(p=>({...p,distillery:""}))}} placeholder="z.B. Laphroaig, Islay" list="w-dist" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.distillery?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="w-dist">{distilleries.map(d=><option key={d} value={d}/>)}</datalist>{errors.distillery&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.distillery}</div>}</div>
          <div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Whisky Typ <span style={{fontWeight:400,color:form.types.length===3?t.danger:t.tick}}>({form.types.length}/3)</span></label><TypeChips value={form.types} onChange={v=>{f("types",v);setErrors(p=>({...p,types:""}));}} options={WHISKY_TYPES} chipOn={t.whiskyChipOn} chipOnColor={t.whiskyChipOnColor} t={t}/>{errors.types&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.types}</div>}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,fontWeight:700}}>Deine Bewertung</div>
            <WhiskyRatingFields form={form} setF={f} t={t}/>
          </div>
          <button onClick={editingId?handleUpdate:handleAdd} disabled={saving} style={btn}>{saving?"Speichert…":editingId?"Änderungen speichern":suggToConvert?"Bewertung speichern":"Whisky speichern"}</button>
        </div>
      )}
      {view==="add-suggestion"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><button onClick={()=>{setView("suggestions");setSuggForm({...EMPTY_W_SUGG});setSuggErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>Whisky Vorschlag</div></div>
          <div style={{background:t.suggBadgeBg,borderRadius:12,padding:"10px 14px",marginBottom:20,border:`1px solid ${t.suggBorder}`}}><div style={{fontSize:12,color:t.whiskySuggAccent}}>💡 Noch nicht probiert — als Idee für den nächsten Abend.</div></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Whisky Name</label><input value={suggForm.name} onChange={e=>{sf("name",e.target.value);setSuggErrors(p=>({...p,name:""}))}} placeholder="z.B. Laphroaig 10 Jahre" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{suggErrors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Destillerie / Herkunft</label><input value={suggForm.distillery} onChange={e=>{sf("distillery",e.target.value);setSuggErrors(p=>({...p,distillery:""}))}} placeholder="z.B. Laphroaig, Islay" list="ws-dist" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.distillery?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="ws-dist">{[...new Set([...distilleries,...suggDist])].map(d=><option key={d} value={d}/>)}</datalist>{suggErrors.distillery&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.distillery}</div>}</div>
          <div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Whisky Typ <span style={{fontWeight:400,color:suggForm.types.length===3?t.danger:t.tick}}>({suggForm.types.length}/3)</span></label><TypeChips value={suggForm.types} onChange={v=>{sf("types",v);setSuggErrors(p=>({...p,types:""}));}} options={WHISKY_TYPES} chipOn={t.whiskyChipOn} chipOnColor={t.whiskyChipOnColor} t={t}/>{suggErrors.types&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.types}</div>}</div>
          <button onClick={handleAddSugg} disabled={saving} style={btn}>{saving?"Speichert…":"Vorschlag speichern"}</button>
        </div>
      )}
      {view==="rate"&&ratingTarget&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><button onClick={()=>{setView("list");setSection("list");setRatingTarget(null);}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title}}>Wertung abgeben</div></div>
          <div style={{fontSize:13,color:t.sub,marginBottom:20,paddingLeft:36}}>{ratingTarget.name} · {ratingTarget.distillery}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}><WhiskyRatingFields form={ratingForm} setF={rf} t={t}/></div>
          <button onClick={handleSaveRating} disabled={saving} style={btn}>{saving?"Speichert…":"Wertung speichern"}</button>
        </div>
      )}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:t.navBg,borderTop:`1px solid ${t.navBorder}`,display:"flex",boxShadow:`0 -4px 20px ${t.navShadow}`,transition:"background 0.3s"}}>
        {[["list",navActive,()=>navTo("list"),"🥃","Whisky\nÜbersicht"],["sugg",suggActive,()=>navTo("suggestions"),"💡","Whisky\nVorschläge"],["add-btn",addActive,navAdd,"➕","Hinzufügen"]].map(([key,active,onClick,icon,label])=>(
          <button key={key} onClick={onClick} style={{flex:1,padding:"11px 4px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:9,color:active?navColor:t.navInactive,fontWeight:active?700:400,textAlign:"center",lineHeight:1.25,whiteSpace:"pre-line"}}>{label}</span>
            {active&&<div style={{width:20,height:2,background:navColor,borderRadius:1,marginTop:1}}/>}
          </button>
        ))}
      </div>
      <WhiskyModal w={selected} user={user} onClose={()=>setSelected(null)} onDelete={handleDelete} onEdit={handleEdit} onRate={startRate} t={t}/>
      <WhiskySuggModal s={suggSelected} user={user} onClose={()=>setSuggSelected(null)} onDelete={handleDeleteSugg} onConvert={handleConvertSugg} t={t}/>
      <Toast msg={toast} color={t.whiskyToast} textColor={t.toastColor}/>
    </div>
  );
}

// MEDIA (FILME / SERIEN / EIGENE KATEGORIEN)
function MediaCard({item,onClick,t,mc,config}){
  const avg=getAvgMedia(item);
  const genres=Array.isArray(item.genres)?item.genres:[];
  const raters=Object.keys(item.ratings||{});
  return(
    <div onClick={onClick} style={{background:t.card,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.cardBorder}`,marginBottom:12,transition:"transform 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0,paddingRight:8}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title,letterSpacing:"-0.01em"}}>{item.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>{item[config.field1Key]||item.field1||""}{genres.length?" · "+genres.join(" & "):""}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:mc.accent}}>{avg.stars}</div>
          <div style={{fontSize:10,color:t.tick}}>Ø · {avg.count} Wertung{avg.count!==1?"en":""}</div>
        </div>
      </div>
      <div style={{marginTop:10}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <Badge value={avg.handlung} color="#2e7d52"/><span style={{fontSize:11,color:t.sub}}>{config.crit1Short}</span>
        <Badge value={avg.spannung} color="#7b3f9e"/><span style={{fontSize:11,color:t.sub}}>{config.crit2Short}</span>
      </div>
      {raters.length>0&&<div style={{textAlign:"right",marginTop:6}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>bewertet von {raters.join(", ")}</span></div>}
    </div>
  );
}
function MediaSuggCard({s,onClick,t,mc,config}){
  const genres=Array.isArray(s.genres)?s.genres:[];
  return(
    <div onClick={onClick} style={{background:t.suggCard,borderRadius:16,padding:"16px 18px",boxShadow:`0 2px 12px ${t.cardShadow}`,cursor:"pointer",border:`1px solid ${t.suggBorder}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:t.title}}>{s.name}</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2}}>{s[config.field1Key]||s.field1||""}{genres.length?" · "+genres.join(" & "):""}</div>
        </div>
        <span style={{background:t.suggBadgeBg,borderRadius:10,padding:"4px 10px",fontSize:11,color:mc.suggAccent,fontWeight:600,flexShrink:0,marginLeft:8}}>💡 Vorschlag</span>
      </div>
      <div style={{textAlign:"right",marginTop:8}}><span style={{fontSize:10,color:t.tick,fontStyle:"italic"}}>vorgeschlagen von {s.author}</span></div>
    </div>
  );
}
function MediaModal({item,user,onClose,onDelete,onEdit,onRate,t,mc,config}){
  if(!item)return null;
  const avg=getAvgMedia(item);
  const genres=Array.isArray(item.genres)?item.genres:[];
  const ratings=Object.entries(item.ratings||{});
  const isAuthor=user===item.author;const hasRated=!!item.ratings?.[user];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title,letterSpacing:"-0.01em"}}>{item.name}</div>
      <div style={{color:t.sub,fontSize:13,marginTop:4}}>{item[config.field1Key]||item.field1||""}{genres.length?" · "+genres.join(" & "):""}</div>
      <div style={{marginTop:14}}><Stars value={avg.stars} t={t}/></div>
      <div style={{marginTop:12,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
        <div style={{fontSize:11,color:t.sub}}>{config.starsLabel||"⭐ Gesamtwertung"}</div>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color:mc.accent}}>{avg.stars}/10</div>
        <div style={{fontSize:10,color:t.tick}}>Durchschnitt aus {avg.count} Wertung{avg.count!==1?"en":""}</div>
      </div>
      <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:t.sub}}>{config.crit1Label}</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#2e7d52"}}>{avg.handlung}/10</div>
        </div>
        <div style={{background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:t.sub}}>{config.crit2Label}</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#7b3f9e"}}>{avg.spannung}/10</div>
        </div>
      </div>
      <div style={{marginTop:20}}>
        <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:8,fontWeight:700}}>Alle Bewertungen ({avg.count})</div>
        {ratings.map(([author,rating])=>(
          <div key={author} style={{background:t.ratingRow,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${t.ratingBorder}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:700,fontSize:13,color:t.title}}>{author}</span><span style={{fontSize:12,color:mc.accent}}>★ {rating.stars}/10</span></div>
            <div style={{display:"flex",gap:12,fontSize:12,color:t.sub}}><span>{config.crit1Short} {rating.handlung}/10</span><span>{config.crit2Short} {rating.spannung}/10</span></div>
            {rating.kommentar&&<div style={{marginTop:8,fontSize:12,color:t.sub,fontStyle:"italic",background:t.innerCard,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>"{rating.kommentar}"</div>}
          </div>
        ))}
      </div>
      {isAuthor&&<div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>onEdit(item)} style={{padding:"12px",borderRadius:12,background:t.innerCard,color:t.title,border:`1px solid ${t.cardBorder}`,fontSize:14,cursor:"pointer",fontWeight:600}}>✏️ Bearbeiten</button>
        <button onClick={()=>onDelete(item.id)} style={{padding:"12px",borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Löschen</button>
      </div>}
      {!isAuthor&&!hasRated&&<button onClick={()=>onRate(item)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:mc.btn,color:mc.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>⭐ Eigene Wertung abgeben</button>}
      {!isAuthor&&hasRated&&<button onClick={()=>onRate(item)} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>✏️ Meine Wertung bearbeiten</button>}
    </SwipeableSheet>
  );
}
function MediaSuggModal({s,user,onClose,onDelete,onConvert,t,mc,config}){
  if(!s)return null;
  const genres=Array.isArray(s.genres)?s.genres:[];
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:t.title}}>{s.name}</div>
        <span style={{background:t.suggBadgeBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:mc.suggAccent,fontWeight:600}}>💡 Vorschlag</span>
      </div>
      <div style={{color:t.sub,fontSize:13}}>{s[config.field1Key]||s.field1||""}{genres.length?" · "+genres.join(" & "):""}</div>
      <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14}}>
        <div style={{fontSize:13,color:t.sub}}>Noch nicht gesehen.</div>
        <div style={{fontSize:12,color:t.tick,marginTop:4,fontStyle:"italic"}}>Vorgeschlagen von {s.author}</div>
      </div>
      <button onClick={()=>onConvert(s)} style={{marginTop:16,width:"100%",padding:15,borderRadius:12,background:mc.btn,color:mc.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>⭐ Jetzt bewerten & übernehmen</button>
      {user===s.author&&<button onClick={()=>onDelete(s.id)} style={{marginTop:10,width:"100%",padding:13,borderRadius:12,background:"#c0302815",color:t.danger,border:"1px solid #c0302840",fontSize:14,cursor:"pointer",fontWeight:600}}>🗑️ Vorschlag löschen</button>}
    </SwipeableSheet>
  );
}
function MediaRatingFields({form,setF,accent,config,t}){
  return(
    <>
      <Slider label={config.starsLabel||"⭐ Gesamtwertung"} value={form.stars} min={0} max={10} onChange={v=>setF("stars",v)} color={accent} t={t}/>
      <Slider label={config.crit1Label} value={form.handlung} min={0} max={10} onChange={v=>setF("handlung",v)} color="#2e7d52" t={t}/>
      <Slider label={config.crit2Label} value={form.spannung} min={0} max={10} onChange={v=>setF("spannung",v)} color="#7b3f9e" t={t}/>
      <div><div style={{fontSize:13,fontFamily:"'Space Grotesk',sans-serif",color:t.label,marginBottom:8}}>💬 Kommentar</div>
        <textarea value={form.kommentar||""} onChange={e=>setF("kommentar",e.target.value)} placeholder="Meinung, Highlights, Empfehlung…" style={{width:"100%",minHeight:80,padding:"12px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,resize:"vertical",lineHeight:1.5}}/></div>
    </>
  );
}
function MediaApp({user,dark,setDark,mode,setMode,modes,t,group,members,onBack,isAdmin,onSettings,config,onLogout}){
  const mc=dark?GOLD_MODE:GLASS_MODE;
  const [view,setView]=useState("list");
  const [activeSection,setSection]=useState("list");
  const [items,setItems]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({...EMPTY_MEDIA});
  const [ratingForm,setRatingForm]=useState({...EMPTY_MEDIA_RATING});
  const [ratingTarget,setRatingTarget]=useState(null);
  const [suggForm,setSuggForm]=useState({...EMPTY_MEDIA_SUGG});
  const [suggToConvert,setSuggToConvert]=useState(null);
  const [mFilter,setMFilter]=useState({search:"",k1:"",k2:"",author:""});
  const [sFilter,setSFilter]=useState({search:"",k1:"",k2:""});
  const [selected,setSelected]=useState(null);
  const [suggSelected,setSuggSelected]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [errors,setErrors]=useState({});
  const [suggErrors,setSuggErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  const fk=config.field1Key;
  useEffect(()=>{
    let ref;try{ref=db.ref(config.fbBase);ref.on("value",snap=>{const d=snap.val();setItems(d?Object.values(d):[]);setLoading(false);},()=>setLoading(false));}catch{setLoading(false);}
    const tm=setTimeout(()=>setLoading(false),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[config.fbBase]);
  useEffect(()=>{
    let ref;try{ref=db.ref(config.fbSugg);ref.on("value",snap=>{const d=snap.val();setSuggestions(d?Object.values(d):[]);});}catch{}
    return()=>ref&&ref.off();
  },[config.fbSugg]);
  const getField1=x=>x[fk]||x.field1||"";
  const visible=items.map(x=>restrictToMembers(x,members)).filter(x=>Object.keys(x.ratings).length>0||members.includes(x.author));
  const visibleSugg=suggestions.filter(s=>members.includes(s.author));
  const field1Vals=[...new Set(visible.map(x=>getField1(x).trim()).filter(Boolean))].sort();
  const allGenres=[...new Set(visible.flatMap(x=>Array.isArray(x.genres)?x.genres:[]))].sort();
  const allRaters=[...new Set(visible.flatMap(x=>Object.keys(x.ratings||{})))].sort();
  const filteredM=visible.filter(x=>(!mFilter.k1||getField1(x)===mFilter.k1)&&(!mFilter.k2||(Array.isArray(x.genres)&&x.genres.includes(mFilter.k2)))&&(!mFilter.author||Object.keys(x.ratings||{}).includes(mFilter.author))&&(!mFilter.search||x.name.toLowerCase().includes(mFilter.search.toLowerCase()))).sort((a,b)=>getAvgMedia(b).stars-getAvgMedia(a).stars);
  const suggField1=[...new Set(visibleSugg.map(s=>getField1(s).trim()).filter(Boolean))].sort();
  const suggGenres=[...new Set(visibleSugg.flatMap(s=>Array.isArray(s.genres)?s.genres:[]))].sort();
  const filteredS=visibleSugg.filter(s=>(!sFilter.k1||getField1(s)===sFilter.k1)&&(!sFilter.k2||(Array.isArray(s.genres)&&s.genres.includes(sFilter.k2)))&&(!sFilter.search||s.name.toLowerCase().includes(sFilter.search.toLowerCase())));
  const hasGenres=!!config.genreOptions;
  const valM=()=>{const e={};if(!form.name.trim())e.name="Bitte Name eingeben";if(hasGenres&&!form.genres.length)e.genres="Bitte Genre auswählen";return e;};
  const valS=()=>{const e={};if(!suggForm.name.trim())e.name="Bitte Name eingeben";if(hasGenres&&!suggForm.genres.length)e.genres="Bitte Genre auswählen";return e;};
  const handleAdd=async()=>{const e=valM();if(Object.keys(e).length){setErrors(e);return;}
    const _f1=i=>i.field1!==undefined&&i.field1!==null?i.field1:(i[fk]||"");
    const _key=dupKey(form.name,form.field1);
    const _dup=items.find(i=>dupKey(i.name,_f1(i))===_key);
    if(_dup){
      if(!window.confirm("„"+_dup.name+"“ gibt es hier bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?"))return;
      setSaving(true);
      try{
        await db.ref(config.fbBase+"/"+_dup.id+"/ratings/"+user).set(stamped({stars:form.stars,handlung:form.handlung,spannung:form.spannung,kommentar:form.kommentar}));
        if(suggToConvert){await db.ref(config.fbSugg+"/"+suggToConvert.id).remove();setSuggToConvert(null);}
        setForm({...EMPTY_MEDIA});setErrors({});setView("list");setSection("list");showToast("✅ Wertung hinzugefügt!");
      }catch{showToast("⚠️ Fehler");}
      setSaving(false);return;
    }
    const _dupS=!suggToConvert&&suggestions.find(s=>dupKey(s.name,_f1(s))===_key);
    if(_dupS){
      if(!window.confirm("„"+_dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?"))return;
      try{await db.ref(config.fbSugg+"/"+_dupS.id).remove();}catch{}
    }
    setSaving(true);try{const id=Date.now().toString();await db.ref(config.fbBase+"/"+id).set({id,name:form.name,[fk]:form.field1.trim(),field1:form.field1.trim(),genres:form.genres,author:user,ratings:{[user]:stamped({stars:form.stars,handlung:form.handlung,spannung:form.spannung,kommentar:form.kommentar})}});if(suggToConvert){await db.ref(config.fbSugg+"/"+suggToConvert.id).remove();setSuggToConvert(null);}setForm({...EMPTY_MEDIA});setErrors({});setView("list");setSection("list");showToast(config.saveToast);}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleEdit=x=>{const my=x.ratings?.[user]||EMPTY_MEDIA_RATING;setForm({name:x.name,field1:getField1(x),genres:Array.isArray(x.genres)?x.genres:[],stars:my.stars,handlung:my.handlung,spannung:my.spannung,kommentar:my.kommentar||""});setEditingId(x.id);setSelected(null);setSuggToConvert(null);setErrors({});setView("add");setSection("list");};
  const handleUpdate=async()=>{const e=valM();if(Object.keys(e).length){setErrors(e);return;}setSaving(true);try{await db.ref(config.fbBase+"/"+editingId).update({name:form.name,[fk]:form.field1.trim(),field1:form.field1.trim(),genres:form.genres});await db.ref(config.fbBase+"/"+editingId+"/ratings/"+user).set(stamped({stars:form.stars,handlung:form.handlung,spannung:form.spannung,kommentar:form.kommentar}));setForm({...EMPTY_MEDIA});setEditingId(null);setErrors({});setView("list");setSection("list");showToast("✅ Aktualisiert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDelete=async id=>{if(!window.confirm("Diesen Eintrag wirklich löschen? Alle Bewertungen dazu gehen verloren."))return;try{await db.ref(config.fbBase+"/"+id).remove();setSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const startRate=x=>{setRatingForm(x.ratings?.[user]||{...EMPTY_MEDIA_RATING});setRatingTarget(x);setSelected(null);setView("rate");};
  const handleSaveRating=async()=>{setSaving(true);try{await db.ref(config.fbBase+"/"+ratingTarget.id+"/ratings/"+user).set(stamped(ratingForm));setView("list");setSection("list");setRatingTarget(null);showToast("✅ Wertung gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleAddSugg=async()=>{const e=valS();if(Object.keys(e).length){setSuggErrors(e);return;}
    const _f1=i=>i.field1!==undefined&&i.field1!==null?i.field1:(i[fk]||"");
    const _key=dupKey(suggForm.name,suggForm.field1);
    const _dupS=suggestions.find(s=>dupKey(s.name,_f1(s))===_key);
    if(_dupS){showToast("💡 Bereits vorgeschlagen von "+_dupS.author+"!");return;}
    const _dupI=items.find(i=>dupKey(i.name,_f1(i))===_key);
    if(_dupI){showToast("⭐ Gibt es schon in den Bewertungen!");return;}
    setSaving(true);try{const id=Date.now().toString();await db.ref(config.fbSugg+"/"+id).set({id,name:suggForm.name,[fk]:suggForm.field1.trim(),field1:suggForm.field1.trim(),genres:suggForm.genres,author:user});setSuggForm({...EMPTY_MEDIA_SUGG});setSuggErrors({});setView("suggestions");setSection("suggestions");showToast("✅ Vorschlag gespeichert!");}catch{showToast("⚠️ Fehler");}setSaving(false);};
  const handleDeleteSugg=async id=>{if(!window.confirm("Diesen Vorschlag wirklich löschen?"))return;try{await db.ref(config.fbSugg+"/"+id).remove();setSuggSelected(null);showToast("🗑️ Gelöscht");}catch{showToast("⚠️ Fehler");}};
  const handleConvertSugg=s=>{setForm({name:s.name,field1:getField1(s),genres:Array.isArray(s.genres)?s.genres:[],stars:7,handlung:5,spannung:5,kommentar:""});setSuggToConvert(s);setEditingId(null);setErrors({});setSuggSelected(null);setView("add");setSection("list");};
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const rf=(k,v)=>setRatingForm(p=>({...p,[k]:v}));
  const sf=(k,v)=>setSuggForm(p=>({...p,[k]:v}));
  const navTo=s=>{setSection(s);setView(s);setSelected(null);setSuggSelected(null);};
  const navAdd=()=>{if(activeSection==="list"){setForm({...EMPTY_MEDIA});setEditingId(null);setErrors({});setSuggToConvert(null);setView("add");}else{setSuggForm({...EMPTY_MEDIA_SUGG});setSuggErrors({});setView("add-suggestion");}};
  const navActive=view==="list"||view==="rate";
  const suggActive=view==="suggestions";
  const addActive=view==="add"||view==="add-suggestion";
  const btn={width:"100%",padding:16,borderRadius:14,background:saving?"#ccc":mc.btn,color:mc.btnColor,fontSize:16,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",fontFamily:"'Space Grotesk',sans-serif",opacity:saving?0.7:1};
  if(loading)return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>{config.icon}</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",position:"relative",paddingBottom:92,transition:"background 0.3s"}}>
      <AppHeader user={user} dark={dark} setDark={setDark} mode={mode} setMode={setMode} modes={modes} t={t} onLogout={onLogout}
        title={config.icon+" "+config.label.replace(" Führer","")+" · "+group.name}
        subtitle={visible.length+" bewertet · "+visibleSugg.length+" Vorschlag"+(visibleSugg.length!==1?"e":"")}
        headerBg={mc.headerBg} headerSub={mc.headerSub} onBack={onBack} isAdmin={isAdmin} onSettings={onSettings}/>
      {view==="list"&&(
        <div style={{padding:"20px 16px"}}>
          <FilterBar filter={mFilter} setFilter={setMFilter} col1={field1Vals} col2={hasGenres?allGenres:[]} col1Label={config.field1FilterLabel} col2Label={config.typeFilterLabel} extra={[["author","Alle Bewerter",allRaters]]} filterOn={mc.filterOn} filterOnColor={mc.filterOnColor} t={t}/>
          {filteredM.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>{config.emptyIcon}</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visible.length===0?config.emptyText:"Keine Treffer"}</div></div>):filteredM.map(x=><MediaCard key={x.id} item={x} onClick={()=>setSelected(x)} t={t} mc={mc} config={config}/>)}
        </div>
      )}
      {view==="suggestions"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:4}}>💡 {config.suggListTitle}</div>
          <div style={{fontSize:13,color:t.sub,marginBottom:16}}>{config.suggHint}</div>
          <FilterBar filter={sFilter} setFilter={setSFilter} col1={suggField1} col2={hasGenres?suggGenres:[]} col1Label={config.field1FilterLabel} col2Label={config.typeFilterLabel} filterOn={mc.filterOn} filterOnColor={mc.filterOnColor} t={t}/>
          {filteredS.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:t.empty}}><div style={{fontSize:48}}>💡</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,marginTop:12,color:t.title}}>{visibleSugg.length===0?config.emptySuggText:"Keine Treffer"}</div></div>):filteredS.map(s=><MediaSuggCard key={s.id} s={s} onClick={()=>setSuggSelected(s)} t={t} mc={mc} config={config}/>)}
        </div>
      )}
      {view==="add"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
            <button onClick={()=>{setView(editingId?"list":activeSection);setForm({...EMPTY_MEDIA});setEditingId(null);setSuggToConvert(null);setErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub,paddingTop:2}}>←</button>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>{editingId?"Bearbeiten":suggToConvert?"Jetzt bewerten":config.addTitle}</div>{suggToConvert&&<div style={{fontSize:12,color:mc.suggAccent,marginTop:3}}>💡 Aus Vorschlägen übernommen</div>}</div>
          </div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Name</label><input value={form.name} onChange={e=>{f("name",e.target.value);setErrors(p=>({...p,name:""}))}} placeholder={config.namePlaceholder} style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${errors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{errors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>{config.field1Label}</label><input value={form.field1} onChange={e=>f("field1",e.target.value)} placeholder={config.field1Placeholder} list="m-field1" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="m-field1">{field1Vals.map(d=><option key={d} value={d}/>)}</datalist></div>
          {hasGenres&&<div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Genre <span style={{fontWeight:400,color:form.genres.length===3?t.danger:t.tick}}>({form.genres.length}/3)</span></label><TypeChips value={form.genres} onChange={v=>{f("genres",v);setErrors(p=>({...p,genres:""}));}} options={config.genreOptions} chipOn={mc.chipOn} chipOnColor={mc.chipOnColor} t={t}/>{errors.genres&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{errors.genres}</div>}</div>}
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}>
            <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,fontWeight:700}}>Deine Bewertung</div>
            <MediaRatingFields form={form} setF={f} accent={mc.accent} config={config} t={t}/>
          </div>
          <button onClick={editingId?handleUpdate:handleAdd} disabled={saving} style={btn}>{saving?"Speichert…":editingId?"Änderungen speichern":suggToConvert?"Bewertung speichern":"Speichern"}</button>
        </div>
      )}
      {view==="add-suggestion"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><button onClick={()=>{setView("suggestions");setSuggForm({...EMPTY_MEDIA_SUGG});setSuggErrors({});}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title}}>{config.addSuggTitle}</div></div>
          <div style={{background:t.suggBadgeBg,borderRadius:12,padding:"10px 14px",marginBottom:20,border:`1px solid ${t.suggBorder}`}}><div style={{fontSize:12,color:mc.suggAccent}}>{config.suggHint}</div></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>Name</label><input value={suggForm.name} onChange={e=>{sf("name",e.target.value);setSuggErrors(p=>({...p,name:""}))}} placeholder={config.namePlaceholder} style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${suggErrors.name?t.danger:t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/>{suggErrors.name&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.name}</div>}</div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>{config.field1Label}</label><input value={suggForm.field1} onChange={e=>sf("field1",e.target.value)} placeholder={config.field1Placeholder} list="ms-field1" style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor}}/><datalist id="ms-field1">{[...new Set([...field1Vals,...suggField1])].map(d=><option key={d} value={d}/>)}</datalist></div>
          {hasGenres&&<div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,color:t.label,marginBottom:4,fontFamily:"'Space Grotesk',sans-serif"}}>Genre <span style={{fontWeight:400,color:suggForm.genres.length===3?t.danger:t.tick}}>({suggForm.genres.length}/3)</span></label><TypeChips value={suggForm.genres} onChange={v=>{sf("genres",v);setSuggErrors(p=>({...p,genres:""}));}} options={config.genreOptions} chipOn={mc.chipOn} chipOnColor={mc.chipOnColor} t={t}/>{suggErrors.genres&&<div style={{color:t.danger,fontSize:11,marginTop:4}}>{suggErrors.genres}</div>}</div>}
          <button onClick={handleAddSugg} disabled={saving} style={btn}>{saving?"Speichert…":"Vorschlag speichern"}</button>
        </div>
      )}
      {view==="rate"&&ratingTarget&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><button onClick={()=>{setView("list");setSection("list");setRatingTarget(null);}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.sub}}>←</button><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title}}>Wertung abgeben</div></div>
          <div style={{fontSize:13,color:t.sub,marginBottom:20,paddingLeft:36}}>{ratingTarget.name}{getField1(ratingTarget)?" · "+getField1(ratingTarget):""}</div>
          <div style={{background:t.card,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${t.cardBorder}`}}><MediaRatingFields form={ratingForm} setF={rf} accent={mc.accent} config={config} t={t}/></div>
          <button onClick={handleSaveRating} disabled={saving} style={btn}>{saving?"Speichert…":"Wertung speichern"}</button>
        </div>
      )}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:t.navBg,borderTop:`1px solid ${t.navBorder}`,display:"flex",boxShadow:`0 -4px 20px ${t.navShadow}`,transition:"background 0.3s"}}>
        {[["list",navActive,()=>navTo("list"),config.icon,config.listLabel+"\nÜbersicht"],["sugg",suggActive,()=>navTo("suggestions"),"💡",config.listLabel+"\nVorschläge"],["add-btn",addActive,navAdd,"➕","Hinzufügen"]].map(([key,active,onClick,icon,label])=>(
          <button key={key} onClick={onClick} style={{flex:1,padding:"11px 4px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:9,color:active?mc.navActive:t.navInactive,fontWeight:active?700:400,textAlign:"center",lineHeight:1.25,whiteSpace:"pre-line"}}>{label}</span>
            {active&&<div style={{width:20,height:2,background:mc.navActive,borderRadius:1,marginTop:1}}/>}
          </button>
        ))}
      </div>
      <MediaModal item={selected} user={user} onClose={()=>setSelected(null)} onDelete={handleDelete} onEdit={handleEdit} onRate={startRate} t={t} mc={mc} config={config}/>
      <MediaSuggModal s={suggSelected} user={user} onClose={()=>setSuggSelected(null)} onDelete={handleDeleteSugg} onConvert={handleConvertSugg} t={t} mc={mc} config={config}/>
      <Toast msg={toast} color={mc.toast} textColor={mc.toastColor}/>
    </div>
  );
}

// Passwort ändern und Konto löschen (für alle Benutzer)
function AccountSheet({user,onClose,t}){
  const [oldPw,setOldPw]=useState("");
  const [newPw,setNewPw]=useState("");
  const [newPw2,setNewPw2]=useState("");
  const [msg,setMsg]=useState("");
  const [delPw,setDelPw]=useState("");
  const [delMsg,setDelMsg]=useState("");
  const [mailNew,setMailNew]=useState("");
  const [mailPw,setMailPw]=useState("");
  const [mailMsg,setMailMsg]=useState("");
  const [curMail,setCurMail]=useState(auth.currentUser?.email||"");
  const [busy,setBusy]=useState(false);
  const inp={width:"100%",padding:"12px 14px",borderRadius:10,fontSize:15,border:`1.5px solid ${t.inputBorder}`,background:t.inputBg,outline:"none",color:t.inputColor,marginBottom:10};
  // Aktuelle Adresse vom Server holen: nach Bestätigung einer neuen E-Mail ist sie geändert
  useEffect(()=>{const cu=auth.currentUser;if(cu)cu.reload().then(()=>setCurMail(auth.currentUser?.email||"")).catch(()=>{});},[]);
  const hasMail=hasRealEmail({email:curMail});
  // Erneute Anmeldung vor sensiblen Aktionen — mit der tatsächlich hinterlegten Adresse
  const reauth=async(pw,wrongMsg)=>{
    const cu=auth.currentUser;
    if(!cu)throw loginError("Sitzung abgelaufen. Bitte neu anmelden.");
    await cu.reload().catch(()=>{});
    const cred=firebase.auth.EmailAuthProvider.credential(auth.currentUser.email||authEmail(user),pw);
    try{await cu.reauthenticateWithCredential(cred);}
    catch(e){if(NO_ACCOUNT_CODES.includes(e.code))throw loginError(wrongMsg);throw e;}
    return cu;
  };
  const saveMail=async()=>{
    const m=mailNew.trim();
    if(!validEmail(m)){setMailMsg("Bitte eine gültige E-Mail-Adresse eingeben.");return;}
    if(!mailPw){setMailMsg("Bitte dein Passwort zur Bestätigung eingeben.");return;}
    setBusy(true);setMailMsg("");
    try{
      const cu=await reauth(mailPw,"Passwort ist falsch.");
      await cu.verifyBeforeUpdateEmail(m);
      setMailNew("");setMailPw("");
      setMailMsg("✅ Wir haben eine Bestätigungs-Mail an "+m+" geschickt. Sobald du auf den Link klickst, ist die Adresse hinterlegt. Ab dann meldest du dich mit ihr an.");
    }catch(e){setMailMsg(e.msg||authErrorMsg(e,"Speichern fehlgeschlagen. Bitte erneut versuchen."));}
    setBusy(false);
  };
  const change=async()=>{
    if(!oldPw||!newPw){setMsg("Bitte alle Felder ausfüllen.");return;}
    if(newPw.length<6){setMsg("Neues Passwort: mindestens 6 Zeichen.");return;}
    if(newPw!==newPw2){setMsg("Neue Passwörter stimmen nicht überein.");return;}
    setBusy(true);setMsg("");
    try{
      const cu=await reauth(oldPw,"Aktuelles Passwort ist falsch.");
      await cu.updatePassword(newPw);
      await db.ref("users/"+user+"/pwHash").remove().catch(()=>{});
      await db.ref("users/"+user+"/seeded").remove().catch(()=>{});
      setOldPw("");setNewPw("");setNewPw2("");setMsg("✅ Passwort geändert.");
    }catch(e){setMsg(e.msg||authErrorMsg(e,"Fehler beim Ändern."));}
    setBusy(false);
  };
  // Konto löschen (Pflicht für den App Store): Bewertungen weg, Vorschläge ohne Namen,
  // Gruppen verlassen, Profil + Verknüpfungen + Firebase-Konto löschen.
  // Reihenfolge ist wichtig: Die Regeln prüfen bis zuletzt users/<Name>/uid und uids/<uid>.
  const deleteAccount=async()=>{
    if(!delPw){setDelMsg("Bitte dein Passwort eingeben.");return;}
    if(!window.confirm("Konto „"+user+"“ wirklich löschen?\n\nDeine Bewertungen werden gelöscht, deine Vorschläge bleiben ohne Namen erhalten. Das lässt sich nicht rückgängig machen."))return;
    setBusy(true);setDelMsg("");
    try{
      const cu=await reauth(delPw,"Passwort ist falsch.");
      const groups=Object.values((await readOnce("groups"))||{});
      const mine=groups.filter(g=>g.members&&g.members[user]);
      const blocked=mine.filter(g=>{const m=g.members;const admins=Object.keys(m).filter(k=>m[k]==="admin");return m[user]==="admin"&&admins.length===1&&Object.keys(m).length>1;});
      if(blocked.length)throw loginError("Du bist alleiniger Admin in: "+blocked.map(g=>g.name).join(", ")+". Ernenne dort zuerst einen anderen Admin.");
      const bases=ALL_CATS.map(c=>[c.base,c.sugg]);
      groups.forEach(g=>Object.values(g.custom||{}).forEach(c=>bases.push(["custom_"+c.id,"custom_"+c.id+"_sugg"])));
      for(const [base,sugg] of bases){
        const items=(await readOnce(base))||{};
        for(const [id,it] of Object.entries(items)){
          if(it.ratings&&it.ratings[user])await db.ref(base+"/"+id+"/ratings/"+user).remove();
          if(it.author===user)await db.ref(base+"/"+id+"/author").remove().catch(()=>{});
        }
        const suggs=(await readOnce(sugg))||{};
        for(const [id,s] of Object.entries(suggs)){if(s.author===user)await db.ref(sugg+"/"+id+"/author").remove().catch(()=>{});}
      }
      const reqs=(await readOnce("category_requests"))||{};
      for(const [k,r] of Object.entries(reqs)){if(r.users&&r.users[user])await db.ref("category_requests/"+k+"/users/"+user).remove().catch(()=>{});}
      for(const g of mine){
        if(Object.keys(g.members).length===1)await db.ref("groups/"+g.id).remove();
        else await db.ref("groups/"+g.id+"/members/"+user).remove();
      }
      await db.ref("users/"+user).remove();
      await db.ref("names/"+nameKey(user)).remove().catch(()=>{});
      await db.ref("uids/"+cu.uid).remove().catch(()=>{});
      localStorage.removeItem("rmg_user");
      await cu.delete(); // löst onAuthStateChanged aus -> zurück zum Login
    }catch(e){setDelMsg(e.msg||authErrorMsg(e,"Löschen fehlgeschlagen. Bitte erneut versuchen."));}
    setBusy(false);
  };
  return(
    <SwipeableSheet onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,color:t.title,letterSpacing:"-0.01em"}}>🔑 Passwort ändern</div>
          <div style={{fontSize:12,color:t.sub,marginTop:2,marginBottom:20}}>Angemeldet als {user}</div>
        </div>
        <button onClick={onClose} title="Schließen" style={{background:t.secondaryBtn,color:t.secondaryBtnColor,border:"none",borderRadius:18,width:32,height:32,fontSize:18,cursor:"pointer",flexShrink:0,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <input type="password" value={oldPw} onChange={e=>{setOldPw(e.target.value);setMsg("");}} placeholder="Aktuelles Passwort" style={inp}/>
      <input type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setMsg("");}} placeholder="Neues Passwort (min. 6 Zeichen)" style={inp}/>
      <input type="password" value={newPw2} onChange={e=>{setNewPw2(e.target.value);setMsg("");}}
        onKeyDown={e=>e.key==="Enter"&&change()} placeholder="Neues Passwort wiederholen" style={inp}/>
      {msg&&<div style={{fontSize:12,color:msg.startsWith("✅")?"#2e7d52":t.danger,marginBottom:10}}>{msg}</div>}
      <button onClick={change} disabled={busy}
        style={{width:"100%",padding:14,borderRadius:12,background:busy?"#999":t.restBtn,color:t.btnColor,fontSize:15,fontWeight:700,border:"none",cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
        {busy?"Wird geändert…":"Passwort ändern"}
      </button>
      <div style={{borderTop:`1px solid ${t.inputBorder}`,marginTop:26,paddingTop:18}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:t.title}}>✉️ E-Mail für Passwort-Reset</div>
        <div style={{fontSize:12,color:t.sub,marginTop:2,marginBottom:12,lineHeight:1.45}}>
          {hasMail
            ?<>Hinterlegt: <b style={{color:t.title}}>{curMail}</b>. Du meldest dich mit dieser Adresse an und kannst ein vergessenes Passwort per Mail zurücksetzen. Hier kannst du sie ändern.</>
            :<>Freiwillig. Mit einer hinterlegten Adresse kannst du ein vergessenes Passwort selbst per Mail zurücksetzen. Du meldest dich dann mit der E-Mail-Adresse statt mit dem Benutzernamen an.</>}
        </div>
        <input type="email" value={mailNew} onChange={e=>{setMailNew(e.target.value);setMailMsg("");}} placeholder={hasMail?"Neue E-Mail-Adresse":"E-Mail-Adresse"} style={inp}/>
        <input type="password" value={mailPw} onChange={e=>{setMailPw(e.target.value);setMailMsg("");}}
          onKeyDown={e=>e.key==="Enter"&&saveMail()} placeholder="Passwort zur Bestätigung" style={inp}/>
        {mailMsg&&<div style={{fontSize:12,color:mailMsg.startsWith("✅")?"#2e7d52":t.danger,marginBottom:10,lineHeight:1.45}}>{mailMsg}</div>}
        <button onClick={saveMail} disabled={busy}
          style={{width:"100%",padding:13,borderRadius:12,background:t.secondaryBtn,color:t.secondaryBtnColor,fontSize:14,fontWeight:700,border:"none",cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
          {busy?"Bitte warten…":hasMail?"Adresse ändern":"Adresse hinterlegen"}
        </button>
      </div>
      <div style={{borderTop:`1px solid ${t.inputBorder}`,marginTop:26,paddingTop:18}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:t.title}}>🗑️ Konto löschen</div>
        <div style={{fontSize:12,color:t.sub,marginTop:2,marginBottom:12}}>Löscht dein Konto, deine Bewertungen und deine Gruppenmitgliedschaften endgültig. Deine Vorschläge bleiben ohne Namen erhalten.</div>
        <input type="password" value={delPw} onChange={e=>{setDelPw(e.target.value);setDelMsg("");}} placeholder="Passwort zur Bestätigung" style={inp}/>
        {delMsg&&<div style={{fontSize:12,color:t.danger,marginBottom:10}}>{delMsg}</div>}
        <button onClick={deleteAccount} disabled={busy}
          style={{width:"100%",padding:13,borderRadius:12,background:"transparent",color:t.danger,fontSize:14,fontWeight:700,border:`1.5px solid ${t.danger}`,cursor:busy?"wait":"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
          {busy?"Bitte warten…":"Konto endgültig löschen"}
        </button>
      </div>
    </SwipeableSheet>
  );
}

// BENUTZER-MENÜ (Avatar mit Initialen)
function initialsOf(name){
  const parts=(name||"").trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return "?";
  if(parts.length===1)return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[1][0]).toUpperCase();
}
function UserMenu({user,dark,setDark,t,onLogout,extraItems}){
  const [open,setOpen]=useState(false);
  const [showAccount,setShowAccount]=useState(false);
  const accent=dark?"#fab600":"#6c7bff";
  const accentText=dark?"#141414":"#ffffff";
  const row={display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px 16px",marginBottom:8,background:t.innerCard,borderRadius:12,border:`1px solid ${t.cardBorder}`,cursor:"pointer",textAlign:"left",fontSize:14,color:t.title};
  return(
    <>
      <button onClick={()=>setOpen(true)} title={user}
        style={{width:36,height:36,borderRadius:"50%",background:accent,color:accentText,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{initialsOf(user)}</button>
      {open&&(
        <SwipeableSheet onClose={()=>setOpen(false)} t={t} zIndex={400}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:accent,color:accentText,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif"}}>{initialsOf(user)}</div>
              <div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:700,color:t.title}}>{user}</div>
                <div style={{fontSize:12,color:t.sub}}>Angemeldet</div>
              </div>
            </div>
            <button onClick={()=>setDark(d=>!d)} style={row}>
              <span style={{fontSize:18}}>{dark?"☀️":"🌙"}</span><span style={{flex:1}}>{dark?"Heller Modus":"Dunkler Modus"}</span>
            </button>
            <button onClick={()=>{setOpen(false);setShowAccount(true);}} style={row}>
              <span style={{fontSize:18}}>🔑</span><span style={{flex:1}}>Passwort ändern</span>
            </button>
            {(extraItems||[]).map((x,i)=>(
              <button key={i} onClick={()=>{setOpen(false);x.onClick();}} style={row}>
                <span style={{fontSize:18}}>{x.icon}</span><span style={{flex:1}}>{x.label}</span>
              </button>
            ))}
            <button onClick={()=>{setOpen(false);onLogout();}} style={{...row,color:t.danger,marginTop:10,marginBottom:0}}>
              <span style={{fontSize:18}}>🚪</span><span style={{flex:1}}>Abmelden</span>
            </button>
        </SwipeableSheet>
      )}
      {showAccount&&<AccountSheet user={user} onClose={()=>setShowAccount(false)} t={t}/>}
    </>
  );
}
// KATEGORIE-VORSCHLAG
function catReqKey(name){
  const k=name.toLowerCase().trim().replace(/[.#$/[\]]/g,"").replace(/\s+/g,"_");
  return k||"unbenannt";
}
function CategoryRequestSheet({user,t,onClose}){
  const [name,setName]=useState("");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const send=async()=>{
    const n=name.trim();
    if(!n){setMsg("Bitte gib einen Namen für die Kategorie an.");return;}
    setBusy(true);setMsg("");
    try{
      const key=catReqKey(n);
      await db.ref("category_requests/"+key+"/name").set(n);
      await db.ref("category_requests/"+key+"/users/"+user).set(note.trim()||true);
      setMsg("✅ Danke! Dein Vorschlag wurde übermittelt.");
      setName("");setNote("");
      setTimeout(onClose,1400);
    }catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");}
    setBusy(false);
  };
  const inp={width:"100%",padding:"13px 16px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,outline:"none",background:t.inputBg,color:t.inputColor,marginBottom:12};
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={400}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:6,textAlign:"center"}}>💭 Kategorie vorschlagen</div>
      <div style={{fontSize:13,color:t.sub,textAlign:"center",marginBottom:18}}>Welche Kategorie fehlt dir in RateMates?</div>
      <input value={name} onChange={e=>{setName(e.target.value);setMsg("");}} placeholder="Name der Kategorie, z.B. Pizzerien" style={inp}/>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Anmerkung (optional)" style={inp}/>
      <button onClick={send} disabled={busy}
        style={{width:"100%",padding:14,borderRadius:12,background:busy?t.sliderTrack:t.restBtn,color:t.btnColor,border:"none",cursor:"pointer",fontSize:15,fontWeight:700}}>
        {busy?"Sende…":"Vorschlag absenden"}
      </button>
      {msg&&<div style={{marginTop:12,fontSize:13,textAlign:"center",color:msg.startsWith("✅")?t.restAccent:t.danger}}>{msg}</div>}
    </SwipeableSheet>
  );
}
// HAUPTSEITE
function HomePage({user,dark,setDark,t,onNav,onLogout}){
  const [showCatRequest,setShowCatRequest]=useState(false);
  const tiles=[
    {id:"ratings",icon:"⭐",title:"Bewertungen",text:"Alle Wertungen von dir und deinen Freunden aus allen Gruppen"},
    {id:"suggestions",icon:"💡",title:"Vorschläge",text:"Alle Ideen für das nächste Mal — gruppenübergreifend"},
    {id:"groups",icon:"👥",title:"Gruppen",text:"Deine Gruppen öffnen, verwalten und Freunde einladen"},
    {id:"catRequest",icon:"💭",title:"Kategorie vorschlagen",text:"Dir fehlt eine Kategorie? Reich deinen Wunsch ein"},
  ];
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",transition:"background 0.3s",display:"flex",flexDirection:"column",padding:"32px 20px 28px"}}>
      <div style={{display:"flex",justifyContent:"flex-end",gap:6}}>
        <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
      </div>
      <img src={dark?LOGO_SRC_DARK:LOGO_SRC} alt="RateMates" style={{width:150,height:150,objectFit:"contain",margin:"4px auto 2px",display:"block"}}/>
      <div style={{textAlign:"center",fontSize:13,color:t.sub,marginBottom:26}}>Hi <strong style={{color:t.title}}>{user}</strong>, was möchtest du tun?</div>
      {tiles.map(x=>(
        <button key={x.id} onClick={()=>x.id==="catRequest"?setShowCatRequest(true):onNav(x.id)}
          style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"18px 18px",marginBottom:12,background:t.card,borderRadius:16,border:`1.5px solid ${t.cardBorder}`,cursor:"pointer",textAlign:"left",boxShadow:`0 2px 10px ${t.cardShadow}`}}>
          <span style={{fontSize:30}}>{x.icon}</span>
          <span style={{flex:1}}>
            <span style={{display:"block",fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title}}>{x.title}</span>
            <span style={{display:"block",fontSize:12,color:t.sub,marginTop:3}}>{x.text}</span>
          </span>
          <span style={{fontSize:18,color:t.tick}}>›</span>
        </button>
      ))}
      <div style={{flex:1}}/>
      {showCatRequest&&<CategoryRequestSheet user={user} t={t} onClose={()=>setShowCatRequest(false)}/>}
    </div>
  );
}
// FORMULAR-METADATEN je Kategorie (für globales Anlegen)
function catFormMeta(cat){
  if(cat.kind==="rest")return{f1Label:"Stadt",f1Ph:"z.B. Köln",options:CUISINES,optLabel:"Küche"};
  if(cat.kind==="whisky")return{f1Label:"Destillerie",f1Ph:"z.B. Laphroaig",options:WHISKY_TYPES,optLabel:"Sorte"};
  return{f1Label:(cat.cfg&&cat.cfg.field1Label)||"Details",f1Ph:(cat.cfg&&cat.cfg.field1Placeholder)||"",options:(cat.cfg&&cat.cfg.genreOptions)||[],optLabel:"Sorte / Genre"};
}
// GLOBALES ANLEGEN: neuer Eintrag mit eigener Wertung bzw. neuer Vorschlag
function GlobalAddSheet({cat,user,isRatings,t,onClose,onSaved}){
  const meta=catFormMeta(cat);
  const [name,setName]=useState("");
  const [f1,setF1]=useState("");
  const [sel,setSel]=useState([]);
  const [vals,setVals]=useState(cat.kind==="rest"?{food:5,service:5,price:3,stars:7}:cat.kind==="whisky"?{stars:7,rauchigkeit:5,fruchtigkeit:5}:{stars:7,handlung:5,spannung:5});
  const [kommentar,setKommentar]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const setV=(k,v)=>setVals(p=>({...p,[k]:v}));
  const toggle=o=>setSel(p=>p.includes(o)?p.filter(x=>x!==o):[...p,o]);
  const accent=t.restAccent;
  const inp={width:"100%",padding:"13px 16px",borderRadius:12,fontSize:15,border:`1.5px solid ${t.inputBorder}`,outline:"none",background:t.inputBg,color:t.inputColor,marginBottom:12};
  const save=async()=>{
    const n=name.trim();
    if(!n){setMsg("Bitte gib einen Namen an.");return;}
    if(cat.kind==="rest"&&!f1.trim()){setMsg("Bitte gib die Stadt an.");return;}
    setBusy(true);setMsg("");
    try{
      // Duplikatprüfung: gleicher Name + gleiche Stadt/gleiches Medium in dieser Kategorie
      const fkG=(cat.cfg&&cat.cfg.field1Key)||"field1";
      const f1Of=i=>cat.kind==="rest"?i.city:cat.kind==="whisky"?i.distillery:(i.field1!==undefined&&i.field1!==null?i.field1:(i[fkG]||""));
      const [baseSnap,suggSnap]=await Promise.all([db.ref(cat.base).get().catch(()=>null),db.ref(cat.sugg).get().catch(()=>null)]);
      const baseArr=baseSnap&&baseSnap.val()?Object.values(baseSnap.val()):[];
      const suggArr=suggSnap&&suggSnap.val()?Object.values(suggSnap.val()):[];
      const key=dupKey(n,f1);
      const dupB=baseArr.find(i=>i&&dupKey(i.name,f1Of(i))===key);
      const dupS=suggArr.find(i=>i&&dupKey(i.name,f1Of(i))===key);
      const myRating=cat.kind==="rest"?{food:vals.food,service:vals.service,price:vals.price,stars:vals.stars,kommentar}
        :cat.kind==="whisky"?{stars:vals.stars,rauchigkeit:vals.rauchigkeit,fruchtigkeit:vals.fruchtigkeit,kommentar}
        :{stars:vals.stars,handlung:vals.handlung,spannung:vals.spannung,kommentar};
      if(isRatings){
        if(dupB){
          if(!window.confirm("„"+dupB.name+"“ gibt es bereits. Deine Wertung wird dem bestehenden Eintrag hinzugefügt. Fortfahren?")){setBusy(false);return;}
          await db.ref(cat.base+"/"+dupB.id+"/ratings/"+user).set(stamped(myRating));
          onSaved();return;
        }
        if(dupS){
          if(!window.confirm("„"+dupS.name+"“ steht bereits in den Vorschlägen und wird jetzt in die Bewertungen übernommen. Fortfahren?")){setBusy(false);return;}
          await db.ref(cat.sugg+"/"+dupS.id).remove().catch(()=>{});
        }
      }else{
        if(dupS){setMsg("💡 Diesen Vorschlag gibt es bereits (von "+dupS.author+").");setBusy(false);return;}
        if(dupB){setMsg("⭐ Das ist bereits in den Bewertungen vorhanden.");setBusy(false);return;}
      }
      const id=Date.now().toString();
      let data;
      if(cat.kind==="rest"){
        data={id,name:n,city:f1.trim(),cuisines:sel,author:user};
        if(isRatings)data.ratings={[user]:stamped({food:vals.food,service:vals.service,price:vals.price,stars:vals.stars,kommentar})};
      }else if(cat.kind==="whisky"){
        data={id,name:n,distillery:f1.trim(),types:sel,author:user};
        if(isRatings)data.ratings={[user]:stamped({stars:vals.stars,rauchigkeit:vals.rauchigkeit,fruchtigkeit:vals.fruchtigkeit,kommentar})};
      }else{
        const fk=(cat.cfg&&cat.cfg.field1Key)||"field1";
        data={id,name:n,[fk]:f1.trim(),field1:f1.trim(),genres:sel,author:user};
        if(isRatings)data.ratings={[user]:stamped({stars:vals.stars,handlung:vals.handlung,spannung:vals.spannung,kommentar})};
      }
      await db.ref((isRatings?cat.base:cat.sugg)+"/"+id).set(data);
      onSaved();
    }catch{setMsg("⚠️ Konnte nicht speichern. Bitte erneut versuchen.");setBusy(false);}
  };
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.title,marginBottom:16,textAlign:"center"}}>{cat.icon} {isRatings?((cat.cfg&&cat.cfg.addTitle)||cat.label.replace(/s$/,"")+" hinzufügen"):"Vorschlag: "+cat.label}</div>
      <input value={name} onChange={e=>{setName(e.target.value);setMsg("");}} placeholder="Name" style={inp}/>
      <input value={f1} onChange={e=>{setF1(e.target.value);setMsg("");}} placeholder={meta.f1Label+(meta.f1Ph?" — "+meta.f1Ph:"")} style={inp}/>
      {meta.options.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {meta.options.map(o=>(
            <button key={o} onClick={()=>toggle(o)}
              style={{padding:"6px 12px",borderRadius:16,border:`1.5px solid ${sel.includes(o)?t.restChipOn:t.chipBorder}`,background:sel.includes(o)?t.restChipOn:t.chipBg,color:sel.includes(o)?t.restChipOnColor:t.chipColor,fontSize:12,cursor:"pointer"}}>{o}</button>
          ))}
        </div>
      )}
      {isRatings&&cat.kind==="rest"&&(<>
        <Slider label="⭐ Gesamtwertung" value={vals.stars} min={0} max={10} onChange={v=>setV("stars",v)} color={accent} t={t}/>
        <Slider label="🍜 Essen" value={vals.food} min={0} max={10} onChange={v=>setV("food",v)} color="#2e7d52" t={t}/>
        <Slider label="💁 Service" value={vals.service} min={0} max={10} onChange={v=>setV("service",v)} color="#3a5a9e" t={t}/>
        <Slider label="💰 Preis" value={vals.price} min={1} max={5} onChange={v=>setV("price",v)} color="#8a5a2c" display={v=>"€".repeat(v)} t={t}/>
      </>)}
      {isRatings&&cat.kind==="whisky"&&(<>
        <Slider label="⭐ Gesamtgeschmack" value={vals.stars} min={0} max={10} onChange={v=>setV("stars",v)} color={accent} t={t}/>
        <Slider label="🌫️ Rauchigkeit" value={vals.rauchigkeit} min={0} max={10} onChange={v=>setV("rauchigkeit",v)} color="#5a6472" t={t}/>
        <Slider label="🍒 Fruchtigkeit" value={vals.fruchtigkeit} min={0} max={10} onChange={v=>setV("fruchtigkeit",v)} color="#a8364e" t={t}/>
      </>)}
      {isRatings&&cat.kind==="media"&&(<>
        <Slider label={(cat.cfg&&cat.cfg.starsLabel)||"⭐ Gesamtwertung"} value={vals.stars} min={0} max={10} onChange={v=>setV("stars",v)} color={accent} t={t}/>
        <Slider label={(cat.cfg&&cat.cfg.crit1Label)||"Kriterium 1"} value={vals.handlung} min={0} max={10} onChange={v=>setV("handlung",v)} color="#2e7d52" t={t}/>
        <Slider label={(cat.cfg&&cat.cfg.crit2Label)||"Kriterium 2"} value={vals.spannung} min={0} max={10} onChange={v=>setV("spannung",v)} color="#3a5a9e" t={t}/>
      </>)}
      {isRatings&&<textarea value={kommentar} onChange={e=>setKommentar(e.target.value)} placeholder="Kommentar (optional)" rows={2} style={{...inp,resize:"none",fontFamily:"inherit"}}/>}
      <button onClick={save} disabled={busy}
        style={{width:"100%",padding:14,borderRadius:12,background:busy?t.sliderTrack:t.restBtn,color:t.btnColor,border:"none",cursor:"pointer",fontSize:15,fontWeight:700}}>
        {busy?"Speichere…":(isRatings?"Speichern":"Vorschlag speichern")}
      </button>
      {msg&&<div style={{marginTop:12,fontSize:13,textAlign:"center",color:msg.startsWith("⚠️")?t.danger:t.sub}}>{msg}</div>}
    </SwipeableSheet>
  );
}
// GLOBALE DETAIL-ANSICHT
function GlobalDetailSheet({entry,isRatings,t,onClose}){
  const {cat,item,avg}=entry;
  const sub=subtitleOfCat(cat,item);
  const critLabels=cat.kind==="rest"
    ?[["food","🍜 Essen"],["service","💁 Service"],["price","💰 Preis"]]
    :cat.kind==="whisky"
    ?[["rauchigkeit","🌫️ Rauchigkeit"],["fruchtigkeit","🍒 Fruchtigkeit"]]
    :[["handlung",(cat.cfg&&cat.cfg.crit1Short)||"Kriterium 1"],["spannung",(cat.cfg&&cat.cfg.crit2Short)||"Kriterium 2"]];
  return(
    <SwipeableSheet onClose={onClose} t={t} zIndex={350}>
      <div style={{textAlign:"center",marginBottom:6}}><span style={{fontSize:40}}>{cat.icon}</span></div>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:t.title,textAlign:"center"}}>{item.name}</div>
      <div style={{fontSize:12.5,color:t.sub,textAlign:"center",marginTop:4}}>{[cat.label,sub].filter(Boolean).join(" · ")}</div>
      {isRatings?(
        <>
          <div style={{marginTop:14,background:t.innerCard,borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:11,color:t.sub}}>⭐ Durchschnitt</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color:t.restAccent}}>{avg.stars}/10</div>
            <div style={{fontSize:10,color:t.tick}}>aus {avg.count} Wertung{avg.count!==1?"en":""}</div>
          </div>
          <div style={{fontSize:12,color:t.label,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,margin:"16px 0 8px"}}>Einzelne Wertungen</div>
          {Object.entries(item.ratings||{}).map(([u,r])=>(
            <div key={u} style={{background:t.ratingRow,border:`1px solid ${t.ratingBorder}`,borderRadius:12,padding:"11px 14px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13.5,fontWeight:700,color:t.title,flex:1}}>{u}</span>
                <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.restAccent}}>{r.stars}<span style={{fontSize:10,color:t.tick}}>/10</span></span>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:11.5,color:t.sub,marginTop:6}}>
                {critLabels.map(([k,l])=>(
                  <span key={k} style={{background:t.innerCard,borderRadius:8,padding:"4px 9px"}}>{l}: {k==="price"?"€".repeat(r[k]||0):(r[k]??"–")}</span>
                ))}
              </div>
              {r.kommentar&&<div style={{fontSize:12,color:t.sub,marginTop:6,fontStyle:"italic"}}>„{r.kommentar}"</div>}
            </div>
          ))}
        </>
      ):(
        <div style={{marginTop:16,background:t.innerCard,borderRadius:12,padding:14,textAlign:"center"}}>
          <div style={{fontSize:13,color:t.sub}}>💡 Vorgeschlagen von <strong style={{color:t.title}}>{item.author}</strong></div>
          {!isNaN(+item.id)&&<div style={{fontSize:11,color:t.tick,marginTop:5}}>am {new Date(+item.id).toLocaleDateString("de-DE")}</div>}
        </div>
      )}
    </SwipeableSheet>
  );
}
// GLOBALE ÜBERSICHT: alle Bewertungen bzw. Vorschläge aus allen Gruppen
function AllItemsPage({type,user,groups,dark,setDark,t,onBack,onLogout}){
  const isRatings=type==="ratings";
  const my=groups.filter(g=>g.members&&g.members[user]);
  const friends=[...new Set(my.flatMap(g=>Object.keys(g.members||{})))];
  const activeCats=ALL_CATS.filter(c=>my.some(g=>g.categories?.[c.id]));
  const [loaded,setLoaded]=useState(false);
  const [raw,setRaw]=useState([]);
  const [catF,setCatF]=useState("");
  const [showCatMenu,setShowCatMenu]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [addCat,setAddCat]=useState(null);
  const [detail,setDetail]=useState(null);
  const [reloadKey,setReloadKey]=useState(0);
  const [k1F,setK1F]=useState("");
  const [k2F,setK2F]=useState("");
  const [sortBy,setSortBy]=useState(isRatings?"cat":"new");
  const [search,setSearch]=useState("");
  useEffect(()=>{
    let cancelled=false;
    const get=p=>db.ref(p).get().then(s=>s.val()||{}).catch(()=>({}));
    Promise.all(activeCats.map(c=>get(isRatings?c.base:c.sugg).then(d=>({cat:c,data:d}))))
      .then(res=>{if(!cancelled){setRaw(res);setLoaded(true);}})
      .catch(()=>{if(!cancelled)setLoaded(true);});
    const tm=setTimeout(()=>setLoaded(true),8000);
    return()=>{cancelled=true;clearTimeout(tm);};
  },[reloadKey]);
  const chooseCat=id=>{setCatF(id);setK1F("");setK2F("");setShowCatMenu(false);};
  let items=[];
  raw.forEach(({cat,data})=>{
    Object.values(data||{}).forEach(it=>{
      if(!it||!it.name)return;
      if(isRatings){
        const norm=cat.kind==="rest"?normalizeRest(it):it;
        const vis=restrictToMembers(norm,friends);
        const avg=avgOfCat(cat,vis);
        if(avg.count>0)items.push({cat,item:vis,avg});
      }else{
        if(it.author&&friends.includes(it.author))items.push({cat,item:it});
      }
    });
  });
  const selCat=activeCats.find(c=>c.id===catF)||null;
  const meta=selCat?catFilterMeta(selCat):null;
  const catItems=selCat?items.filter(x=>x.cat.id===selCat.id):[];
  const opts1=selCat?[...new Set(catItems.map(x=>meta.g1(x.item)).filter(Boolean))].sort():[];
  const opts2=selCat?[...new Set(catItems.flatMap(x=>meta.g2(x.item)))].sort():[];
  const q=search.trim().toLowerCase();
  items=items.filter(x=>(!catF||x.cat.id===catF)
    &&(!q||x.item.name.toLowerCase().includes(q))
    &&(!selCat||!k1F||meta.g1(x.item)===k1F)
    &&(!selCat||!k2F||meta.g2(x.item).includes(k2F)));
  const ci=x=>ALL_CATS.findIndex(c=>c.id===x.cat.id);
  items.sort((a,b)=>{
    if(sortBy==="cat"){const c=ci(a)-ci(b);if(c!==0)return c;return isRatings?(b.avg.stars-a.avg.stars):a.item.name.localeCompare(b.item.name);}
    if(sortBy==="best")return b.avg.stars-a.avg.stars;
    if(sortBy==="count")return b.avg.count-a.avg.count;
    if(sortBy==="new")return String(b.item.id).localeCompare(String(a.item.id));
    return a.item.name.localeCompare(b.item.name);
  });
  const selStyle={padding:"7px 10px",borderRadius:20,border:`1px solid ${t.filterBorder}`,background:t.filterBg,color:t.filterColor,fontSize:12,cursor:"pointer",outline:"none",flexShrink:0};
  const selOn={background:t.restFilterOn,color:t.restFilterOnColor,border:`1px solid ${t.restFilterOn}`};
  const currentIcon=selCat?selCat.icon:"⭐";
  const catSections=CATEGORY_GROUPS.map(g=>({...g,items:g.cats.filter(c=>activeCats.some(a=>a.id===c)).map(c=>activeCats.find(a=>a.id===c))})).filter(g=>g.items.length>0);
  return(
    <div style={{minHeight:"100vh",background:t.bg,maxWidth:440,margin:"0 auto",transition:"background 0.3s"}}>
      <div style={{background:t.restHeaderBg,padding:"20px 20px 16px",color:"white",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,flex:1,minWidth:0}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:"24px",flexShrink:0}}>←</button>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,letterSpacing:"-0.01em"}}>{isRatings?"Alle Bewertungen":"Alle Vorschläge"}</div>
            <div style={{fontSize:12,color:t.restHeaderSub,marginTop:4}}>{selCat?selCat.icon+" "+selCat.label:"Von dir und deinen Freunden · alle Gruppen"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:12}}>
          <button onClick={()=>setShowAdd(true)} title={isRatings?"Neu bewerten":"Neuer Vorschlag"} style={{background:t.modeSwitchBg,border:`1px solid ${t.modeSwitchBorder}`,borderRadius:18,padding:"5px 13px",cursor:"pointer",fontSize:16,fontWeight:700,color:"white"}}>+</button>
          <button onClick={()=>setShowCatMenu(true)} title="Kategorie wählen" style={{background:t.modeSwitchBg,border:`1px solid ${t.modeSwitchBorder}`,borderRadius:18,padding:"5px 11px",cursor:"pointer",fontSize:15}}>{currentIcon}</button>
          <UserMenu user={user} dark={dark} setDark={setDark} t={t} onLogout={onLogout}/>
        </div>
      </div>
      {showCatMenu&&(
        <SwipeableSheet onClose={()=>setShowCatMenu(false)} t={t} zIndex={300}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title,marginBottom:16,textAlign:"center"}}>Kategorie wählen</div>
            <button onClick={()=>chooseCat("")}
              style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:10,background:!catF?`${t.restNavActive}18`:t.innerCard,borderRadius:12,border:`1.5px solid ${!catF?t.restNavActive:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:24}}>⭐</span>
              <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:!catF?700:400,color:t.title,flex:1}}>Alle Kategorien</span>
              {!catF&&<span style={{color:t.restNavActive,fontSize:18}}>✓</span>}
            </button>
            {catSections.map(sec=>(
              <div key={sec.id} style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:t.sub,margin:"4px 2px 6px",fontFamily:"'Space Grotesk',sans-serif"}}>{sec.icon} {sec.label}</div>
                {sec.items.map(c=>(
                  <button key={c.id} onClick={()=>chooseCat(c.id)}
                    style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:8,background:catF===c.id?`${t.restNavActive}18`:t.innerCard,borderRadius:12,border:`1.5px solid ${catF===c.id?t.restNavActive:t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                    <span style={{fontSize:24}}>{c.icon}</span>
                    <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:catF===c.id?700:400,color:t.title,flex:1}}>{c.label}</span>
                    {catF===c.id&&<span style={{color:t.restNavActive,fontSize:18}}>✓</span>}
                  </button>
                ))}
              </div>
            ))}
        </SwipeableSheet>
      )}
      {showAdd&&!addCat&&(
        <SwipeableSheet onClose={()=>setShowAdd(false)} t={t} zIndex={350}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:t.title,marginBottom:6,textAlign:"center"}}>{isRatings?"Was möchtest du bewerten?":"Wofür ist dein Vorschlag?"}</div>
          <div style={{fontSize:12,color:t.sub,textAlign:"center",marginBottom:16}}>Wähle die Kategorie</div>
          {CATEGORY_GROUPS.map(g=>({...g,items:g.cats.filter(c=>activeCats.some(a=>a.id===c)).map(c=>activeCats.find(a=>a.id===c))})).filter(g=>g.items.length>0).map(sec=>(
            <div key={sec.id} style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:t.sub,margin:"4px 2px 6px",fontFamily:"'Space Grotesk',sans-serif"}}>{sec.icon} {sec.label}</div>
              {sec.items.map(c=>(
                <button key={c.id} onClick={()=>setAddCat(c)}
                  style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"14px 16px",marginBottom:8,background:t.innerCard,borderRadius:12,border:`1.5px solid ${t.cardBorder}`,cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:24}}>{c.icon}</span>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,color:t.title,flex:1}}>{c.label}</span>
                  <span style={{fontSize:16,color:t.tick}}>›</span>
                </button>
              ))}
            </div>
          ))}
        </SwipeableSheet>
      )}
      {showAdd&&addCat&&(
        <GlobalAddSheet cat={addCat} user={user} isRatings={isRatings} t={t}
          onClose={()=>{setAddCat(null);setShowAdd(false);}}
          onSaved={()=>{setAddCat(null);setShowAdd(false);setLoaded(false);setReloadKey(k=>k+1);}}/>
      )}
      {detail&&<GlobalDetailSheet entry={detail} isRatings={isRatings} t={t} onClose={()=>setDetail(null)}/>}
      <div style={{padding:"16px 16px 40px"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Suchen…"
          style={{width:"100%",padding:"11px 14px",borderRadius:12,fontSize:14,border:`1.5px solid ${t.inputBorder}`,outline:"none",background:t.inputBg,color:t.inputColor,marginBottom:10}}/>
        <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
          {selCat&&(
            <select value={k1F} onChange={e=>setK1F(e.target.value)} style={{...selStyle,...(k1F?selOn:{})}}>
              <option value="">{meta.l1}</option>
              {opts1.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          )}
          {selCat&&opts2.length>0&&(
            <select value={k2F} onChange={e=>setK2F(e.target.value)} style={{...selStyle,...(k2F?selOn:{})}}>
              <option value="">{meta.l2}</option>
              {opts2.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={selStyle}>
            {isRatings?(
              <>
                <option value="cat">Nach Kategorie</option>
                <option value="best">Beste zuerst</option>
                <option value="count">Meiste Wertungen</option>
                <option value="name">Name A–Z</option>
              </>
            ):(
              <>
                <option value="new">Neueste zuerst</option>
                <option value="cat">Nach Kategorie</option>
                <option value="name">Name A–Z</option>
              </>
            )}
          </select>
        </div>
        {!loaded&&<div style={{textAlign:"center",color:t.sub,fontSize:13,padding:"40px 0"}}>Lade…</div>}
        {loaded&&items.length===0&&(
          <div style={{textAlign:"center",padding:"48px 0",color:t.empty}}>
            <div style={{fontSize:44,marginBottom:10}}>{isRatings?"⭐":"💡"}</div>
            <div style={{fontSize:14}}>{isRatings?"Keine Bewertungen gefunden":"Keine Vorschläge gefunden"}</div>
          </div>
        )}
        {loaded&&items.map(x=>(
          <div key={x.cat.id+"_"+x.item.id} onClick={()=>setDetail(x)} style={{display:"flex",alignItems:"center",gap:12,background:t.card,borderRadius:14,border:`1px solid ${t.cardBorder}`,padding:"13px 14px",marginBottom:9,boxShadow:`0 1px 6px ${t.cardShadow}`,cursor:"pointer"}}>
            <span style={{fontSize:24}}>{x.cat.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14.5,fontWeight:600,color:t.title,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.item.name}</div>
              <div style={{fontSize:11.5,color:t.sub,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{[x.cat.label,subtitleOfCat(x.cat,x.item)].filter(Boolean).join(" · ")}</div>
              {!isRatings&&<div style={{fontSize:11,color:t.tick,marginTop:2}}>von {x.item.author}</div>}
            </div>
            {isRatings&&(
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:t.restAccent}}>{x.avg.stars}<span style={{fontSize:11,color:t.tick}}>/10</span></div>
                <div style={{fontSize:10,color:t.tick}}>{x.avg.count} Wertung{x.avg.count!==1?"en":""}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
// TOP-LEVEL APP
function readInviteFromUrl(){
  try{
    const h=window.location.hash||"";
    const m=h.match(/invite=([^&]+)/);
    return m?decodeURIComponent(m[1]):null;
  }catch{return null;}
}
function clearInviteHash(){
  try{
    if(window.location.hash.indexOf("invite=")>=0){
      history.replaceState(null,"",window.location.pathname+window.location.search);
    }
  }catch{}
}
function LoadingScreen({t}){
  return(<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:48}}>🍽️</div><div style={{fontFamily:"'Space Grotesk',sans-serif",color:t.sub,fontSize:14}}>Lade…</div></div>);
}

function App(){
  const [user,setUser]=useState(localStorage.getItem("rmg_user")||null);
  const [authReady,setAuthReady]=useState(false);
  const [dark,setDark]=useState(false);
  const [groups,setGroups]=useState([]);
  const [groupsLoaded,setGroupsLoaded]=useState(false);
  const [activeGroupId,setActiveGroupId]=useState(null);
  const [mode,setMode]=useState(null);
  const [showSettings,setShowSettings]=useState(false);
  const [pendingInvite,setPendingInvite]=useState(readInviteFromUrl());
  const [page,setPage]=useState("home");
  const [inviteMsg,setInviteMsg]=useState("");
  const t=dark?DARK:LIGHT;

  // Firebase-Sitzung: ohne gültige Anmeldung zurück zum Login (auch bei altem localStorage-Stand)
  useEffect(()=>auth.onAuthStateChanged(u=>{
    if(!u){localStorage.removeItem("rmg_user");setUser(null);}
    setAuthReady(true);
  }),[]);

  // Gruppen erst laden, wenn die Anmeldung steht — vorher verweigert die Datenbank den Zugriff
  useEffect(()=>{
    if(!user||!authReady){setGroups([]);setGroupsLoaded(false);return;}
    let ref;try{ref=db.ref("groups");ref.on("value",snap=>{const d=snap.val();setGroups(d?Object.values(d):[]);setGroupsLoaded(true);},()=>setGroupsLoaded(true));}catch{setGroupsLoaded(true);}
    const tm=setTimeout(()=>setGroupsLoaded(true),5000);return()=>{ref&&ref.off();clearTimeout(tm);};
  },[user,authReady]);

  // Einladung verarbeiten: sobald ein eingeloggter Nutzer + Token + geladene Gruppen vorliegen
  useEffect(()=>{
    if(!user||!pendingInvite||!groupsLoaded)return;
    const g=groups.find(x=>x.id===pendingInvite);
    if(!g){setInviteMsg("⚠️ Diese Einladung ist ungültig oder die Gruppe existiert nicht mehr.");setPendingInvite(null);clearInviteHash();return;}
    if(g.members&&g.members[user]){
      // schon Mitglied -> einfach öffnen
      setActiveGroupId(g.id);setMode(null);setPage("groups");setPendingInvite(null);clearInviteHash();return;
    }
    (async()=>{
      try{
        await db.ref("groups/"+g.id+"/members/"+user).set("member");
        setActiveGroupId(g.id);setMode(null);setPage("groups");
        setInviteMsg("✅ Du bist der Gruppe „"+g.name+"“ beigetreten!");
        setTimeout(()=>setInviteMsg(""),3500);
      }catch{setInviteMsg("⚠️ Beitritt fehlgeschlagen. Bitte erneut versuchen.");}
      setPendingInvite(null);clearInviteHash();
    })();
  },[user,pendingInvite,groupsLoaded,groups]);

  const activeGroup=groups.find(g=>g.id===activeGroupId)||null;
  // Wenn Gruppe gewählt: passenden Modus setzen
  useEffect(()=>{
    if(activeGroup){
      const modes=modesForGroup(activeGroup);
      if(modes.length&&!modes.find(m=>m[0]===mode))setMode(modes[0][0]);
    }
  },[activeGroupId,groups]);

  if(!authReady)return <LoadingScreen t={t}/>;
  if(!user)return <LoginScreen onLogin={setUser} invitePending={!!pendingInvite}/>;
  if(!groupsLoaded)return <LoadingScreen t={t}/>;

  // Keine Gruppe gewählt: Hauptseite bzw. globale Ansichten
  const doLogout=()=>{auth.signOut().catch(()=>{});localStorage.removeItem("rmg_user");setUser(null);setPage("home");};
  if(!activeGroup){
    if(page==="ratings")return <AllItemsPage type="ratings" user={user} groups={groups} dark={dark} setDark={setDark} t={t} onBack={()=>setPage("home")} onLogout={doLogout}/>;
    if(page==="suggestions")return <AllItemsPage type="suggestions" user={user} groups={groups} dark={dark} setDark={setDark} t={t} onBack={()=>setPage("home")} onLogout={doLogout}/>;
    if(page==="groups"){
      return <GroupsOverview user={user} groups={groups} dark={dark} setDark={setDark} t={t} inviteMsg={inviteMsg}
        onLogout={doLogout} onHome={()=>setPage("home")}
        onOpen={g=>{setActiveGroupId(g.id);setMode(null);}}/>;
    }
    return <HomePage user={user} dark={dark} setDark={setDark} t={t} onNav={setPage} onLogout={doLogout}/>;
  }

  const members=Object.keys(activeGroup.members||{});
  const isAdmin=activeGroup.members?.[user]==="admin";
  const modes=modesForGroup(activeGroup);
  const onBack=()=>{setActiveGroupId(null);setMode(null);};
  const onSettings=()=>setShowSettings(true);
  const shared={user,dark,setDark,mode,setMode,modes,t,group:activeGroup,members,onBack,isAdmin,onSettings,onLogout:doLogout};

  let content;
  if(mode==="restaurant")content=<RestaurantApp {...shared}/>;
  else if(mode==="whisky")content=<WhiskyApp {...shared}/>;
  else if(mode==="film")content=<MediaApp {...shared} config={FILM_CONFIG}/>;
  else if(mode==="serie")content=<MediaApp {...shared} config={SERIE_CONFIG}/>;
  else if(mode==="coffee")content=<MediaApp {...shared} config={KAFFEE_CONFIG}/>;
  else if(mode==="beer")content=<MediaApp {...shared} config={BEER_CONFIG}/>;
  else if(mode==="wine")content=<MediaApp {...shared} config={WINE_CONFIG}/>;
  else if(mode==="tea")content=<MediaApp {...shared} config={TEA_CONFIG}/>;
  else if(mode==="matcha")content=<MediaApp {...shared} config={MATCHA_CONFIG}/>;
  else if(mode==="gin")content=<MediaApp {...shared} config={GIN_CONFIG}/>;
  else if(mode==="rum")content=<MediaApp {...shared} config={RUM_CONFIG}/>;
  else if(mode==="vodka")content=<MediaApp {...shared} config={VODKA_CONFIG}/>;
  else if(mode==="book")content=<MediaApp {...shared} config={BOOK_CONFIG}/>;
  else if(mode==="audiobook")content=<MediaApp {...shared} config={AUDIOBOOK_CONFIG}/>;
  else if(mode==="cafe")content=<MediaApp {...shared} config={CAFE_CONFIG}/>;
  else if(mode==="bar")content=<MediaApp {...shared} config={BAR_CONFIG}/>;
  else if(mode==="icecream")content=<MediaApp {...shared} config={ICE_CONFIG}/>;
  else if(mode==="delivery")content=<MediaApp {...shared} config={DELIVERY_CONFIG}/>;
  else if(mode&&mode.startsWith("c:")){
    const cat=Object.values(activeGroup.custom||{}).find(c=>c.id===mode.slice(2));
    content=cat?<MediaApp {...shared} config={customConfig(cat)}/>:<div style={{padding:40,textAlign:"center",color:t.sub}}>Kategorie nicht gefunden.</div>;
  }else{
    content=<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",color:t.sub}}>Lade Bereich…</div>;
  }

  return(
    <>
      {content}
      {showSettings&&<GroupSettingsSheet group={activeGroup} user={user} onClose={()=>setShowSettings(false)} t={t}/>}
    </>
  );
}

export default App;
