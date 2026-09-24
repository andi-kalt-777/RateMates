import {getAvgRest,getAvgWhisky,getAvgMedia} from "./lib/ratings.js";

// Konstanten
export const CUISINES=["Italienisch","Japanisch","Chinesisch","Indisch","Mexikanisch","Französisch","Griechisch","Türkisch","Deutsch","Amerikanisch","Thai","Vietnamesisch","Spanisch","Libanesisch","Koreanisch","Polnisch","Sushi","Burger","Fusion","Frühstück","Brunch","Andere"];
export const WHISKY_TYPES=["Single Malt","Blended Malt","Blended Scotch","Bourbon","Rye Whiskey","Irish Whiskey","Japanese Whisky","Highlands","Speyside","Islay","Islands","Lowlands","Campbeltown","Amerikanisch","Kanadisch","Andere"];
export const MEDIA_GENRES=["Action","Abenteuer","Animation","Biografie","Dokumentation","Drama","Fantasy","Horror","Komödie","Krimi","Musical","Romance","Science-Fiction","Thriller","Western","Andere"];
export const BOOK_GENRES=["Roman","Krimi","Thriller","Fantasy","Science-Fiction","Historisch","Biografie","Sachbuch","Ratgeber","Klassiker","Abenteuer","Horror","Romance","Kinder / Jugend","Andere"];
export const CAFE_TYPES=["Café","Rösterei-Café","Bäckerei / Konditorei","Frühstück / Brunch","Eiscafé","Teehaus","Andere"];
export const BAR_TYPES=["Cocktailbar","Pub / Kneipe","Weinbar","Biergarten","Rooftop-Bar","Sportsbar","Shisha-Bar","Club","Andere"];
export const ICE_TYPES=["Eisdiele","Eiscafé","Frozen Yogurt","Softeis","Veganes Eis","Andere"];
export const DELIVERY_TYPES=["Pizza","Burger","Sushi","Asiatisch","Italienisch","Döner / Türkisch","Indisch","Vietnamesisch","Amerikanisch","Vegetarisch / Vegan","Andere"];
export const BEER_TYPES=["Pils","Helles","Weizen","Kölsch","Alt","Lager","IPA","Pale Ale","Stout / Porter","Bock","Radler","Alkoholfrei","Andere"];
export const WINE_TYPES=["Rotwein","Weißwein","Rosé","Sekt / Schaumwein","Champagner","Riesling","Spätburgunder","Merlot","Chardonnay","Sauvignon Blanc","Trocken","Halbtrocken","Lieblich","Andere"];
export const TEA_TYPES=["Schwarzer Tee","Grüner Tee","Kräutertee","Früchtetee","Weißer Tee","Oolong","Chai","Rooibos","Eistee","Andere"];
export const MATCHA_TYPES=["Ceremonial Grade","Premium Grade","Culinary Grade","Matcha Latte","Eis-Matcha","Bio","Japan","Andere"];
export const COFFEE_TYPES=["Kaffeebohne","Espressobohne","Filterkaffee","Instant","Mokka","Cold Brew","Entkoffeiniert","Arabica","Robusta","Liberica","Excelsa","Andere"];
export const GIN_TYPES=["London Dry","Dry Gin","Old Tom","Plymouth","Sloe Gin","Navy Strength","New Western / Contemporary","Barrel Aged","Pink Gin","Genever","Andere"];
export const RUM_TYPES=["White / Silver","Gold","Dark","Aged / Añejo","Spiced","Overproof","Rhum Agricole","Navy","Cachaça","Andere"];
export const VODKA_TYPES=["Getreide","Weizen","Roggen","Kartoffel","Trauben","Mais","Bio","Aromatisiert","Premium","Andere"];
export const PRICE_LABELS=["","Sehr günstig","Günstig","Mittel","Teuer","Sehr teuer"];
export const EMPTY_REST={city:"",name:"",cuisines:[],service:5,food:5,price:3,stars:7,kommentar:""};
export const EMPTY_RATING={service:5,food:5,price:3,stars:7,kommentar:""};
export const EMPTY_SUGG={city:"",name:"",cuisines:[]};
export const EMPTY_WHISKY={name:"",distillery:"",types:[],stars:7,rauchigkeit:5,fruchtigkeit:5,kommentar:""};
export const EMPTY_W_RATING={stars:7,rauchigkeit:5,fruchtigkeit:5,kommentar:""};
export const EMPTY_W_SUGG={name:"",distillery:"",types:[]};
export const EMPTY_MEDIA={name:"",field1:"",genres:[],stars:7,handlung:5,spannung:5,kommentar:""};
export const EMPTY_MEDIA_RATING={stars:7,handlung:5,spannung:5,kommentar:""};
export const EMPTY_MEDIA_SUGG={name:"",field1:"",genres:[]};

export const CATEGORY_DEFS={
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
export const CATEGORY_GROUPS=[
  {id:"lokal",icon:"📍",label:"Lokalitäten",cats:["restaurant","cafe","bar","icecream","delivery"]},
  {id:"unterhaltung",icon:"🎭",label:"Unterhaltung",cats:["film","serie","book","audiobook"]},
  {id:"spirituosen",icon:"🥃",label:"Spirituosen",cats:["whisky","gin","rum","vodka"]},
  {id:"genuss",icon:"😋",label:"Genuss",cats:["coffee","beer","wine","tea","matcha"]},
  {id:"freizeit",icon:"🌿",label:"Freizeit",cats:[]},
];

export const FILM_CONFIG={
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
export const SERIE_CONFIG={
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
export const KAFFEE_CONFIG={
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
export const GIN_CONFIG={
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
export const RUM_CONFIG={
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
export const VODKA_CONFIG={
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
export const BOOK_CONFIG={
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
export const AUDIOBOOK_CONFIG={
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
export const CAFE_CONFIG={
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
export const BAR_CONFIG={
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
export const ICE_CONFIG={
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
export const DELIVERY_CONFIG={
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
export const BEER_CONFIG={
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
export const WINE_CONFIG={
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
export const TEA_CONFIG={
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
export const MATCHA_CONFIG={
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
export const ALL_CATS=[
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
export function avgOfCat(cat,item){
  if(cat.kind==="rest")return getAvgRest(item);
  if(cat.kind==="whisky")return getAvgWhisky(item);
  return getAvgMedia(item);
}
export function subtitleOfCat(cat,item){
  if(cat.kind==="rest")return [item.city,(Array.isArray(item.cuisines)?item.cuisines:[]).join(" & ")].filter(Boolean).join(" · ");
  if(cat.kind==="whisky")return [item.distillery,(Array.isArray(item.types)?item.types:[]).join(" & ")].filter(Boolean).join(" · ");
  return [item.field1||item.director||"",(Array.isArray(item.genres)?item.genres:[]).join(" & ")].filter(Boolean).join(" · ");
}
export function catFilterMeta(cat){
  if(cat.kind==="rest")return{l1:"Alle Städte",l2:"Alle Küchen",g1:i=>(i.city||"").trim(),g2:i=>Array.isArray(i.cuisines)?i.cuisines:[]};
  if(cat.kind==="whisky")return{l1:"Alle Destillerien",l2:"Alle Sorten",g1:i=>(i.distillery||"").trim(),g2:i=>Array.isArray(i.types)?i.types:[]};
  return{l1:(cat.cfg&&cat.cfg.field1FilterLabel)||"Alle",l2:(cat.cfg&&cat.cfg.typeFilterLabel)||"Alle",g1:i=>(i.field1||"").trim(),g2:i=>Array.isArray(i.genres)?i.genres:[]};
}
export function customConfig(cat){
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
// Bereiche einer Gruppe: Standard-Kategorien in Obergruppen-Reihenfolge, dann eigene
export function modesForGroup(group){
  const order=CATEGORY_GROUPS.flatMap(g=>g.cats);
  const modes=order.filter(c=>group.categories?.[c]).map(c=>[c,CATEGORY_DEFS[c].icon,CATEGORY_DEFS[c].label]);
  Object.values(group.custom||{}).forEach(c=>modes.push(["c:"+c.id,c.icon||"⭐",c.name]));
  return modes;
}
