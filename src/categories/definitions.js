// Alle Standard-Kategorien an einer Stelle. Registry, Formulare, Durchschnitte und
// Ansichten werden daraus abgeleitet (siehe index.js).
//
// Eine neue Kategorie = ein Eintrag hier + je ein Block für paths.items und
// paths.suggestions in database.rules.json (danach firebase deploy --only database).
//
// Aufbau eines Eintrags:
//   id, icon, label (Mehrzahl), title (Kopfzeile in der Gruppe), group (Obergruppe)
//   paths      Firebase-Pfade für Bewertungen und Vorschläge
//   field1     Freitextfeld (Stadt, Destillerie, Plattform …): key im Datensatz, legacyKey =
//              zusätzlich geschriebener Altname (Film: director, Serie: platform)
//   types      Mehrfachauswahl (max. 3) aus options, key im Datensatz
//   overall    Gesamtwertung (key "stars", 0–10)
//   criteria   weitere Regler; format "euro" = Preis 1–5
//   score      "stars" oder Liste von Kriterien, deren Mittel der Hauptwert ist
//   texts      Beschriftungen
//
// Die Schlüssel (city, cuisines, food, handlung …) sind die Feldnamen in der Datenbank
// und dürfen sich nicht ändern, sonst passen bestehende Einträge nicht mehr.

import {
  CUISINES, WHISKY_TYPES, MEDIA_GENRES, BOOK_GENRES, CAFE_TYPES, BAR_TYPES, ICE_TYPES,
  DELIVERY_TYPES, BEER_TYPES, WINE_TYPES, TEA_TYPES, MATCHA_TYPES, COFFEE_TYPES,
  GIN_TYPES, RUM_TYPES, VODKA_TYPES,
} from "./options.js";

export const GROUPS=[
  {id:"lokal",icon:"📍",label:"Lokalitäten"},
  {id:"unterhaltung",icon:"🎭",label:"Unterhaltung"},
  {id:"spirituosen",icon:"🥃",label:"Spirituosen"},
  {id:"genuss",icon:"😋",label:"Genuss"},
  {id:"freizeit",icon:"🌿",label:"Freizeit"},
];

// Gemeinsame Vorgaben aller Kategorien mit Gesamtwertung + zwei freien Kriterien
function standard({crit1,crit2,field1,types,overallLabel,texts,...rest}){
  return{
    ...rest,
    field1:{key:"field1",required:false,prefix:"",...field1},
    types:{key:"genres",label:"Genre",required:true,max:3,errorText:"Bitte Genre auswählen",...types},
    overall:{key:"stars",label:overallLabel||"⭐ Gesamtwertung",default:7},
    criteria:[
      {key:"handlung",color:"#2e7d52",min:0,max:10,default:5,...crit1},
      {key:"spannung",color:"#7b3f9e",min:0,max:10,default:5,...crit2},
    ],
    score:"stars",
    texts:{
      nameLabel:"Name",saveButton:"Speichern",emptySuggText:"Noch keine Vorschläge",
      kommentarPlaceholder:"Meinung, Highlights, Empfehlung…",rateIcon:"⭐",
      suggListSub:texts.suggHint,
      ...texts,
    },
  };
}

export const DEFINITIONS=[
  // ── Lokalitäten ──────────────────────────────────────────────
  {
    id:"restaurant",icon:"🍽️",label:"Restaurants",title:"Restaurants",group:"lokal",
    paths:{items:"restaurants",suggestions:"suggestions"},
    field1:{key:"city",label:"Stadt",placeholder:"z.B. München",filterLabel:"Alle Städte",required:true,prefix:"📍 ",errorText:"Bitte Stadt eingeben"},
    types:{key:"cuisines",label:"Art der Küche",options:CUISINES,filterLabel:"Alle Küchen",required:true,max:3,errorText:"Bitte Küche auswählen"},
    overall:{key:"stars",label:"⭐ Sterne",color:"#e8a020",default:7},
    criteria:[
      {key:"food",label:"🍽️ Essen",short:"Essen",color:"#2e7d52",min:0,max:10,default:5},
      {key:"service",label:"🤝 Service",short:"Service",color:"#1a5f8c",min:0,max:10,default:5},
      {key:"price",label:"💶 Preis",short:"Preis",min:1,max:5,default:3,format:"euro"},
    ],
    score:["food","service"],
    legacyRestaurant:true,
    texts:{
      listLabel:"Restaurant",addTitle:"Restaurant hinzufügen",addSuggTitle:"Vorschlag hinzufügen",
      suggListTitle:"Restaurant Vorschläge",suggListSub:"Restaurants die ihr noch besuchen möchtet",
      suggHint:"💡 Noch nicht besucht — als Idee für den nächsten Abend.",notYet:"Noch nicht besucht.",
      emptyText:"Noch keine Restaurants",emptySuggText:"Noch keine Vorschläge",
      nameLabel:"Name",namePlaceholder:"z.B. Trattoria da Marco",saveToast:"✅ Gespeichert!",saveButton:"Restaurant speichern",
      kommentarPlaceholder:"Notizen, Empfehlungen, besondere Gerichte…",rateIcon:"⭐",
    },
  },
  standard({
    id:"cafe",icon:"🍰",label:"Cafés",title:"Café",group:"lokal",
    paths:{items:"cafes",suggestions:"cafe_suggestions"},
    field1:{label:"Stadt / Ort",placeholder:"z.B. Köln, Altstadt",filterLabel:"Alle Orte"},
    types:{options:CAFE_TYPES,filterLabel:"Alle Arten"},
    overallLabel:"⭐ Gesamtwertung",
    crit1:{label:"☕ Kaffee & Kuchen",short:"☕ Qualität"},crit2:{label:"🛋️ Ambiente",short:"🛋️ Ambiente"},
    texts:{listLabel:"Café",addTitle:"Café hinzufügen",addSuggTitle:"Café Vorschlag",suggListTitle:"Café Vorschläge",
      suggHint:"💡 Noch nicht besucht — als Idee für das nächste Mal.",notYet:"Noch nicht besucht.",
      emptyText:"Noch keine Cafés",namePlaceholder:"z.B. Café Central",saveToast:"✅ Café gespeichert!"},
  }),
  standard({
    id:"bar",icon:"🍹",label:"Bars",title:"Bar",group:"lokal",
    paths:{items:"bars",suggestions:"bar_suggestions"},
    field1:{label:"Stadt / Ort",placeholder:"z.B. Köln, Friesenviertel",filterLabel:"Alle Orte"},
    types:{options:BAR_TYPES,filterLabel:"Alle Arten"},
    overallLabel:"⭐ Gesamtwertung",
    crit1:{label:"🍹 Getränke",short:"🍹 Getränke"},crit2:{label:"🎶 Atmosphäre",short:"🎶 Atmosphäre"},
    texts:{listLabel:"Bar",addTitle:"Bar hinzufügen",addSuggTitle:"Bar Vorschlag",suggListTitle:"Bar Vorschläge",
      suggHint:"💡 Noch nicht besucht — als Idee für das nächste Mal.",notYet:"Noch nicht besucht.",
      emptyText:"Noch keine Bars",namePlaceholder:"z.B. Little Link",saveToast:"✅ Bar gespeichert!"},
  }),
  standard({
    id:"icecream",icon:"🍦",label:"Eisdielen",title:"Eisdielen",group:"lokal",
    paths:{items:"icecreams",suggestions:"icecream_suggestions"},
    field1:{label:"Stadt / Ort",placeholder:"z.B. Köln, Südstadt",filterLabel:"Alle Orte"},
    types:{options:ICE_TYPES,filterLabel:"Alle Arten"},
    overallLabel:"⭐ Gesamtwertung",
    crit1:{label:"🍦 Eisqualität",short:"🍦 Qualität"},crit2:{label:"🍨 Auswahl",short:"🍨 Auswahl"},
    texts:{listLabel:"Eisdiele",addTitle:"Eisdiele hinzufügen",addSuggTitle:"Eisdielen Vorschlag",suggListTitle:"Eisdielen Vorschläge",
      suggHint:"💡 Noch nicht besucht — als Idee für den nächsten Sommer.",notYet:"Noch nicht besucht.",
      emptyText:"Noch keine Eisdielen",namePlaceholder:"z.B. Eiscafé Venezia",saveToast:"✅ Eisdiele gespeichert!"},
  }),
  standard({
    id:"delivery",icon:"🛵",label:"Lieferservices",title:"Lieferservice",group:"lokal",
    paths:{items:"deliveries",suggestions:"delivery_suggestions"},
    field1:{label:"Stadt / Ort",placeholder:"z.B. Köln",filterLabel:"Alle Orte"},
    types:{options:DELIVERY_TYPES,filterLabel:"Alle Küchen"},
    overallLabel:"⭐ Gesamtwertung",
    crit1:{label:"🍜 Essensqualität",short:"🍜 Essen"},crit2:{label:"🚀 Lieferzeit / Zuverlässigkeit",short:"🚀 Lieferzeit"},
    texts:{listLabel:"Lieferservice",addTitle:"Lieferservice hinzufügen",addSuggTitle:"Lieferservice Vorschlag",suggListTitle:"Lieferservice Vorschläge",
      suggHint:"💡 Noch nicht bestellt — als Idee für den nächsten Abend.",notYet:"Noch nicht bestellt.",
      emptyText:"Noch keine Lieferservices",namePlaceholder:"z.B. Pizza Roma Lieferdienst",saveToast:"✅ Lieferservice gespeichert!"},
  }),

  // ── Unterhaltung ─────────────────────────────────────────────
  standard({
    id:"film",icon:"🎬",label:"Filme",title:"Film",group:"unterhaltung",
    paths:{items:"movies",suggestions:"movie_suggestions"},
    field1:{legacyKey:"director",label:"Plattform / Sender",placeholder:"z.B. Netflix, Kino, Prime",filterLabel:"Alle Plattformen"},
    types:{options:MEDIA_GENRES,filterLabel:"Alle Genres"},
    crit1:{label:"📖 Handlung",short:"Handlung"},crit2:{label:"🎭 Spannung",short:"Spannung"},
    texts:{listLabel:"Film",addTitle:"Film hinzufügen",addSuggTitle:"Film Vorschlag",suggListTitle:"Film Vorschläge",
      suggHint:"💡 Noch nicht gesehen — als Idee für den nächsten Filmabend.",notYet:"Noch nicht gesehen.",
      emptyText:"Noch keine Filme",namePlaceholder:"z.B. Inception",saveToast:"✅ Film gespeichert!"},
  }),
  standard({
    id:"serie",icon:"📺",label:"Serien",title:"Serien",group:"unterhaltung",
    paths:{items:"series",suggestions:"serie_suggestions"},
    field1:{legacyKey:"platform",label:"Plattform / Sender",placeholder:"z.B. Netflix, HBO, ARD",filterLabel:"Alle Plattformen"},
    types:{options:MEDIA_GENRES,filterLabel:"Alle Genres"},
    crit1:{label:"📖 Handlung",short:"Handlung"},crit2:{label:"🎭 Spannung",short:"Spannung"},
    texts:{listLabel:"Serien",addTitle:"Serie hinzufügen",addSuggTitle:"Serien Vorschlag",suggListTitle:"Serien Vorschläge",
      suggHint:"💡 Noch nicht gesehen — als Idee für den nächsten Serienabend.",notYet:"Noch nicht gesehen.",
      emptyText:"Noch keine Serien",namePlaceholder:"z.B. Breaking Bad",saveToast:"✅ Serie gespeichert!"},
  }),
  standard({
    id:"book",icon:"📚",label:"Bücher",title:"Bücher",group:"unterhaltung",
    paths:{items:"books",suggestions:"book_suggestions"},
    field1:{label:"Autor",placeholder:"z.B. Stephen King",filterLabel:"Alle Autoren"},
    types:{options:BOOK_GENRES,filterLabel:"Alle Genres"},
    overallLabel:"⭐ Gesamtwertung",
    crit1:{label:"📖 Handlung",short:"📖 Handlung"},crit2:{label:"✍️ Schreibstil",short:"✍️ Schreibstil"},
    texts:{listLabel:"Buch",addTitle:"Buch hinzufügen",addSuggTitle:"Buch Vorschlag",suggListTitle:"Buch Vorschläge",
      suggHint:"💡 Noch nicht gelesen — als Idee für die nächste Lektüre.",notYet:"Noch nicht gelesen.",
      emptyText:"Noch keine Bücher",namePlaceholder:"z.B. Der Schwarm",saveToast:"✅ Buch gespeichert!"},
  }),
  standard({
    id:"audiobook",icon:"🎧",label:"Hörbücher",title:"Hörbücher",group:"unterhaltung",
    paths:{items:"audiobooks",suggestions:"audiobook_suggestions"},
    field1:{label:"Autor / Sprecher",placeholder:"z.B. gelesen von …",filterLabel:"Alle"},
    types:{options:BOOK_GENRES,filterLabel:"Alle Genres"},
    overallLabel:"⭐ Gesamtwertung",
    crit1:{label:"📖 Handlung",short:"📖 Handlung"},crit2:{label:"🎙️ Sprecher / Vertonung",short:"🎙️ Sprecher"},
    texts:{listLabel:"Hörbuch",addTitle:"Hörbuch hinzufügen",addSuggTitle:"Hörbuch Vorschlag",suggListTitle:"Hörbuch Vorschläge",
      suggHint:"💡 Noch nicht gehört — als Idee zum Reinhören.",notYet:"Noch nicht gehört.",
      emptyText:"Noch keine Hörbücher",namePlaceholder:"z.B. Die Känguru-Chroniken",saveToast:"✅ Hörbuch gespeichert!"},
  }),

  // ── Spirituosen ──────────────────────────────────────────────
  {
    id:"whisky",icon:"🥃",label:"Whiskys",title:"Whiskys",group:"spirituosen",
    paths:{items:"whiskies",suggestions:"whisky_suggestions"},
    field1:{key:"distillery",label:"Destillerie / Herkunft",placeholder:"z.B. Laphroaig, Islay",filterLabel:"Alle Destillerien",required:true,prefix:"🥃 ",errorText:"Bitte Destillerie eingeben"},
    types:{key:"types",label:"Whisky Typ",options:WHISKY_TYPES,filterLabel:"Alle Typen",required:true,max:3,errorText:"Bitte Typ auswählen"},
    overall:{key:"stars",label:"⭐ Gesamtgeschmack",default:7},
    criteria:[
      {key:"rauchigkeit",label:"💨 Rauchigkeit",short:"💨 Rauchigkeit",color:"#505868",min:0,max:10,default:5},
      {key:"fruchtigkeit",label:"🍒 Fruchtigkeit",short:"🍒 Fruchtigkeit",color:"#c0306a",min:0,max:10,default:5},
    ],
    score:"stars",
    texts:{
      listLabel:"Whisky",addTitle:"Whisky hinzufügen",addSuggTitle:"Whisky Vorschlag",
      suggListTitle:"Whisky Vorschläge",suggListSub:"Whiskys die ihr noch probieren möchtet",
      suggHint:"💡 Noch nicht probiert — als Idee für den nächsten Abend.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Whiskys",emptySuggText:"Noch keine Vorschläge",
      nameLabel:"Whisky Name",namePlaceholder:"z.B. Laphroaig 10 Jahre",saveToast:"✅ Whisky gespeichert!",saveButton:"Whisky speichern",
      kommentarPlaceholder:"Geschmacksnotizen, Aromen, erster Eindruck…",rateIcon:"🥃",
    },
  },
  standard({
    id:"gin",icon:"🍸",label:"Gin",title:"Gin",group:"spirituosen",
    paths:{items:"gins",suggestions:"gin_suggestions"},
    field1:{label:"Marke / Destillerie",placeholder:"z.B. Monkey 47, Bombay",filterLabel:"Alle Marken"},
    types:{options:GIN_TYPES,filterLabel:"Alle Sorten"},
    overallLabel:"😋 Geschmack",
    crit1:{label:"🌲 Wacholder",short:"🌲 Wacholder"},crit2:{label:"🌿 Intensität der Botanicals",short:"🌿 Botanicals"},
    texts:{listLabel:"Gin",addTitle:"Gin hinzufügen",addSuggTitle:"Gin Vorschlag",suggListTitle:"Gin Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Gins",namePlaceholder:"z.B. Monkey 47 Dry Gin",saveToast:"✅ Gin gespeichert!"},
  }),
  standard({
    id:"rum",icon:"🥂",label:"Rum",title:"Rum",group:"spirituosen",
    paths:{items:"rums",suggestions:"rum_suggestions"},
    field1:{label:"Marke / Herkunft",placeholder:"z.B. Diplomático, Jamaika",filterLabel:"Alle Marken"},
    types:{options:RUM_TYPES,filterLabel:"Alle Sorten"},
    overallLabel:"😋 Geschmack",
    crit1:{label:"🍯 Süße",short:"🍯 Süße"},crit2:{label:"🌶️ Würze / Komplexität",short:"🌶️ Würze"},
    texts:{listLabel:"Rum",addTitle:"Rum hinzufügen",addSuggTitle:"Rum Vorschlag",suggListTitle:"Rum Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Rums",namePlaceholder:"z.B. Diplomático Reserva",saveToast:"✅ Rum gespeichert!"},
  }),
  standard({
    id:"vodka",icon:"🧊",label:"Vodka",title:"Vodka",group:"spirituosen",
    paths:{items:"vodkas",suggestions:"vodka_suggestions"},
    field1:{label:"Marke / Herkunft",placeholder:"z.B. Belvedere, Polen",filterLabel:"Alle Marken"},
    types:{options:VODKA_TYPES,filterLabel:"Alle Sorten"},
    overallLabel:"😋 Geschmack",
    crit1:{label:"💧 Reinheit / Weichheit",short:"💧 Reinheit"},crit2:{label:"✨ Charakter",short:"✨ Charakter"},
    texts:{listLabel:"Vodka",addTitle:"Vodka hinzufügen",addSuggTitle:"Vodka Vorschlag",suggListTitle:"Vodka Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Vodkas",namePlaceholder:"z.B. Belvedere Pure",saveToast:"✅ Vodka gespeichert!"},
  }),

  // ── Genuss ───────────────────────────────────────────────────
  standard({
    id:"coffee",icon:"☕",label:"Kaffee",title:"Kaffee",group:"genuss",
    paths:{items:"coffees",suggestions:"coffee_suggestions"},
    field1:{label:"Rösterei / Herkunft",placeholder:"z.B. Dallmayr, Äthiopien",filterLabel:"Alle Röstereien"},
    types:{options:COFFEE_TYPES,filterLabel:"Alle Sorten"},
    overallLabel:"😋 Geschmack",
    crit1:{label:"💪 Stärke",short:"💪 Stärke"},crit2:{label:"🍋 Säure",short:"🍋 Säure"},
    texts:{listLabel:"Kaffee",addTitle:"Kaffee hinzufügen",addSuggTitle:"Kaffee Vorschlag",suggListTitle:"Kaffee Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Kaffees",namePlaceholder:"z.B. Espresso Roma",saveToast:"✅ Kaffee gespeichert!"},
  }),
  standard({
    id:"beer",icon:"🍺",label:"Bier",title:"Bier",group:"genuss",
    paths:{items:"beers",suggestions:"beer_suggestions"},
    field1:{label:"Brauerei / Herkunft",placeholder:"z.B. Gaffel, Köln",filterLabel:"Alle Brauereien"},
    types:{options:BEER_TYPES,filterLabel:"Alle Sorten"},
    overallLabel:"😋 Geschmack",
    crit1:{label:"🍃 Herbe / Bitterkeit",short:"🍃 Herbe"},crit2:{label:"🍺 Süffigkeit",short:"🍺 Süffigkeit"},
    texts:{listLabel:"Bier",addTitle:"Bier hinzufügen",addSuggTitle:"Bier Vorschlag",suggListTitle:"Bier Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Biere",namePlaceholder:"z.B. Gaffel Kölsch",saveToast:"✅ Bier gespeichert!"},
  }),
  standard({
    id:"wine",icon:"🍷",label:"Wein",title:"Wein",group:"genuss",
    paths:{items:"wines",suggestions:"wine_suggestions"},
    field1:{label:"Weingut / Herkunft",placeholder:"z.B. Rioja, Spanien",filterLabel:"Alle Weingüter"},
    types:{options:WINE_TYPES,filterLabel:"Alle Sorten"},
    overallLabel:"😋 Geschmack",
    crit1:{label:"🍇 Fruchtigkeit",short:"🍇 Frucht"},crit2:{label:"🍂 Körper / Tannine",short:"🍂 Körper"},
    texts:{listLabel:"Wein",addTitle:"Wein hinzufügen",addSuggTitle:"Wein Vorschlag",suggListTitle:"Wein Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Weine",namePlaceholder:"z.B. Marqués de Riscal",saveToast:"✅ Wein gespeichert!"},
  }),
  standard({
    id:"tea",icon:"🫖",label:"Tee",title:"Tee",group:"genuss",
    paths:{items:"teas",suggestions:"tea_suggestions"},
    field1:{label:"Marke / Herkunft",placeholder:"z.B. Meßmer, Darjeeling",filterLabel:"Alle Marken"},
    types:{options:TEA_TYPES,filterLabel:"Alle Sorten"},
    overallLabel:"😋 Geschmack",
    crit1:{label:"🌿 Aroma",short:"🌿 Aroma"},crit2:{label:"💪 Stärke",short:"💪 Stärke"},
    texts:{listLabel:"Tee",addTitle:"Tee hinzufügen",addSuggTitle:"Tee Vorschlag",suggListTitle:"Tee Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Tees",namePlaceholder:"z.B. Earl Grey",saveToast:"✅ Tee gespeichert!"},
  }),
  standard({
    id:"matcha",icon:"🍵",label:"Matcha",title:"Matcha",group:"genuss",
    paths:{items:"matchas",suggestions:"matcha_suggestions"},
    field1:{label:"Marke / Herkunft",placeholder:"z.B. Uji, Japan",filterLabel:"Alle Marken"},
    types:{options:MATCHA_TYPES,filterLabel:"Alle Sorten"},
    overallLabel:"😋 Geschmack",
    crit1:{label:"🌱 Umami",short:"🌱 Umami"},crit2:{label:"🫧 Cremigkeit",short:"🫧 Cremigkeit"},
    texts:{listLabel:"Matcha",addTitle:"Matcha hinzufügen",addSuggTitle:"Matcha Vorschlag",suggListTitle:"Matcha Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für das nächste Mal.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Matchas",namePlaceholder:"z.B. Matcha Miyako",saveToast:"✅ Matcha gespeichert!"},
  }),
];

// Gruppeneigene Kategorien (vom Admin angelegt, liegen unter custom_<id>)
export function customDefinition(cat){
  return standard({
    id:"c:"+cat.id,icon:cat.icon||"⭐",label:cat.name,title:cat.name,group:null,custom:true,
    paths:{items:"custom_"+cat.id,suggestions:"custom_"+cat.id+"_sugg"},
    field1:{label:cat.field1Label||"Herkunft / Marke",placeholder:"z.B. "+(cat.field1Label||"Marke"),filterLabel:"Alle"},
    types:{options:null,required:false,filterLabel:""},
    crit1:{label:"◆ "+(cat.crit1Label||"Qualität"),short:cat.crit1Label||"Qualität"},
    crit2:{label:"◆ "+(cat.crit2Label||"Preis-Leistung"),short:cat.crit2Label||"Preis-Leistung"},
    texts:{listLabel:cat.name,addTitle:cat.name+" hinzufügen",addSuggTitle:cat.name+" Vorschlag",suggListTitle:cat.name+" Vorschläge",
      suggHint:"💡 Noch nicht probiert — als Idee für den nächsten Abend.",notYet:"Noch nicht probiert.",
      emptyText:"Noch keine Einträge",namePlaceholder:"Name",saveToast:"✅ Gespeichert!"},
  });
}
