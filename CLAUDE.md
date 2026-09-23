# RateMates

Private Bewertungs-App für Freundesgruppen ("von Freunden für Freunde").
Antworte mit Andreas immer auf **Deutsch**.

## Harte Rahmenbedingungen

- **Single-File-App.** Die gesamte App ist `index.html` — React 18 + Babel werden im
  Browser geladen, es gibt **keinen Build-Schritt**. Kein npm-Projekt, kein Bundler,
  kein JSX-Import. Neue Abhängigkeiten nur als `<script>`-Tag.
- **Skript-Versionen bleiben gepinnt** (react@18.2.0, react-dom@18.2.0,
  @babel/standalone@7.23.10, Firebase 9.23.0). Eine ungepinnte Babel-URL hat die App
  schon einmal tagelang lahmgelegt ("Cannot use import statement outside a module",
  weiße Seite bei allen Nutzern). Niemals eine Versionsnummer entfernen.
- **Deployment:** Push auf `main` → GitHub Pages baut automatisch.
  Live: https://andi-kalt-777.github.io/RateMates/
- **Firebase Realtime Database**, Zugangsdaten stehen im Klartext im obersten
  `<script>`-Block (bei dieser App-Art normal; der Web-API-Schlüssel ist ein
  öffentlicher Projekt-Identifikator, die Zugriffskontrolle machen die Regeln).
- **Datenbankregeln** liegen versioniert in `database.rules.json` und gehen mit
  `firebase deploy --only database` live (Firebase CLI, Projekt in `.firebaserc`).
  Ohne Anmeldung ist nichts lesbar. Jeder Firebase-Pfad braucht dort seinen
  Block — `npm run check` prüft das.
- **Login läuft über Firebase Authentication** (E-Mail/Passwort). Benutzernamen
  werden über `authEmail()` auf technische Adressen abgebildet
  (`gabi.kalthoefer@ratemates.invalid`), der Benutzername bleibt überall der
  Datenbankschlüssel. Struktur: `users/<Name>/{uid,createdAt}`, `uids/<uid> = Name`,
  `names/<name klein> = Name` (Eindeutigkeit ohne Groß/Klein). Alte Konten haben
  noch `pwHash`; beim ersten Login zieht `completeLogin()` sie um, die Regel prüft
  dabei den Hash. Von fremden Profilen sind nur `uid` und `createdAt` lesbar —
  nie `users/<Name>` als Ganzes lesen. Vergessene Passwörter setzt der Admin mit
  `scripts/reset-password.ps1` zurück (README). Konto löschen steckt in
  `AccountSheet`; die Reihenfolge der Löschschritte ist durch die Regeln vorgegeben.

## Nach jeder Änderung

Die Datei muss syntaktisch fehlerfrei sein, sonst zeigt die App eine weiße Seite —
ohne Build-Schritt fällt so ein Fehler sonst erst im Live-Betrieb auf:

```bash
npm run check     # kompiliert den Babel-Block, prüft Klammer-Balance
```

## Kategorien hinzufügen

Alle Kategorien außer Restaurant und Whisky laufen generisch über `MediaApp` mit
einem CONFIG-Objekt. Eine neue Kategorie muss an **neun** Stellen verdrahtet werden —
wird eine vergessen, fehlt sie stillschweigend an einer Stelle der Oberfläche:

1. `CATEGORY_DEFS` — Icon und Label
2. `CATEGORY_GROUPS` — Zuordnung zu einer der Obergruppen
3. `<NAME>_TYPES` — Auswahlliste für Sorten/Genres
4. `<NAME>_CONFIG` — Labels, Kriterien, Firebase-Pfade
5. `ALL_CATS` — Registry für die globalen Übersichten (inkl. `cfg:`)
6. Formular-Defaults im Gruppenformular (**zwei** Stellen)
7. Mode-Routing in der App-Komponente
8. `MasterDashboard` — Promise.all, countRatings, cats-Array, beide Summen
9. `database.rules.json` — je ein Block für `fbBase` und `fbSugg`, danach
   `firebase deploy --only database`

## Konventionen

- Bewertungen liegen **global pro Kategorie** (`restaurants/`, `whiskies/`, …), nicht
  pro Gruppe. Gruppen legen nur fest, welche Kategorien sichtbar sind und wessen
  Wertungen zählen — deshalb Bewertungsansichten **immer** durch
  `restrictToMembers(item, members)` filtern.
- Duplikate über `dupKey(name, f1)` prüfen (Name + Stadt/Medium). Beim Bewerten eines
  vorhandenen Eintrags wird die Wertung unter `ratings/<user>` ergänzt statt ein
  Duplikat anzulegen; ein bestehender Vorschlag wandert dabei in die Bewertungen.
- Löschen immer mit `window.confirm`-Abfrage.
- Alle Bottom-Sheets über `SwipeableSheet`. Zwei iOS-Fallstricke, die schon Fehler
  verursacht haben: `maxHeight` in **dvh** (bei `vh` schneidet Safari oben ab), und
  die Ziehen-oder-Scrollen-Entscheidung fällt **einmal beim Aufsetzen des Fingers**
  (`canDrag`) — sonst schließt sich das Sheet beim Hochscrollen von selbst.
- Farben kommen aus den Theme-Objekten `LIGHT`/`GLASS_MODE` (hell) und
  `DARK`/`GOLD_MODE` (dunkel). Keine Farbwerte hart in Komponenten schreiben.
- Zwei eingebettete Base64-Logos: `LOGO_SRC` (hell) und `LOGO_SRC_DARK` (gold).
  Der Login nutzt immer die goldene Variante, die Hauptseite wechselt nach Modus.

## Umgangston

- Andreas prüft Ergebnisse genau und weist auf Fehler hin — Rückfragen sind erwünscht.
- Bei der Fehlersuche: **eine Frage pro Antwort**, nicht mehrere auf einmal.
- Keine Behauptungen ins Blaue. Wenn etwas unklar ist, lieber nachsehen oder sagen,
  dass du es nicht sicher weißt.

## Langfristiges Ziel

RateMates soll als native App in den App Store und den Play Store. Der Weg dorthin
steht in `ROADMAP.md` — vor jeder größeren Änderung dort nachsehen, in welcher
Phase wir sind und welche Leitplanken gelten. Aktuell: **Phase 0** (Sicherheit).
Solange die App eine Einzeldatei ist, keine neuen Funktionen hineinbauen, nur
Sicherheitsarbeit; der Umbau auf Vite folgt in Phase 1.

## Offene Themen

- Obergruppe 🌿 Freizeit existiert, ist aber noch leer.
- Sicherheit (Phase 0 der Roadmap): Regeln, Firebase Auth und Konto löschen sind
  seit 23.09.2026 live. Offen: nach der Übergangsphase die restlichen
  `pwHash`-Werte nicht migrierter Konten entfernen. Bekannte Lücke:
  wer einen Eintrag neu anlegt, kann dabei Bewertungen unter fremdem Namen
  mitschicken (Regeln können den Inhalt beim Anlegen nicht prüfen).
