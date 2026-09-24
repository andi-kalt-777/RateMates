# RateMates

Private Bewertungs-App für Freundesgruppen ("von Freunden für Freunde").
Antworte mit Andreas immer auf **Deutsch**.

## Harte Rahmenbedingungen

- **Vite-Projekt** mit React 18. Einstieg `index.html` → `src/main.jsx` →
  `src/App.jsx` (Anmeldung, Einladungen, Routing). Aufteilung unter `src/`:
  `firebase.js` (Zugang), `categories.js` (Kategorien, Konfigurationen, Registry),
  `theme.js` (Farben), `lib/auth.js` (Anmelde-Helfer), `lib/ratings.js`
  (Durchschnitte, Duplikate, Mitgliederfilter, `stamped`), `apps/` (Restaurant-,
  Whisky- und generische Media-Ansicht einer Gruppe), `screens/` (ganze Seiten),
  `components/` (Sheets, Menüs, `ui.jsx` mit Slider/Stars/SwipeableSheet …),
  Logos in `assets/`. Jede Datei exportiert ihre Funktionen benannt.
  `npm run dev` startet die lokale Vorschau (http://localhost:5173/RateMates/).
- **Versionen bleiben exakt gepinnt** in `package.json` (react 18.2.0, react-dom
  18.2.0, firebase 9.23.0, Werkzeuge ebenso), `package-lock.json` ist versioniert.
  Eine ungepinnte Babel-URL hat die App schon einmal tagelang lahmgelegt (weiße
  Seite bei allen Nutzern). Nie `^`/`~` eintragen — `npm run check` prüft das.
  Neue Pakete mit `npm install --save-exact`.
- **Deployment:** Push auf `main` → GitHub Actions (`.github/workflows/deploy.yml`)
  führt `npm run check` aus, baut und veröffentlicht auf GitHub Pages. Schlägt die
  Prüfung fehl, bleibt die alte Version live.
  Live: https://andi-kalt-777.github.io/RateMates/
- **Firebase Realtime Database**, Zugangsdaten stehen im Klartext in
  `src/firebase.js` (bei dieser App-Art normal; der Web-API-Schlüssel ist ein
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
  nie `users/<Name>` als Ganzes lesen. Nutzer können im Kontoblatt freiwillig eine
  echte E-Mail hinterlegen (`verifyBeforeUpdateEmail`); sie ersetzt dann die
  technische Adresse in Firebase Auth, Anmeldung läuft ab da über die E-Mail, und
  „Passwort vergessen?" schickt eine Reset-Mail. Die Adresse liegt nur in Firebase
  Auth, nicht in der Datenbank — nie per `authEmail(user)` neu anmelden, sondern
  mit `auth.currentUser.email`. Ohne E-Mail setzt der Admin Passwörter mit
  `scripts/reset-password.ps1` zurück (README). Konto löschen steckt in
  `AccountSheet`; die Reihenfolge der Löschschritte ist durch die Regeln vorgegeben.

## Nach jeder Änderung

```bash
npm run check     # Strukturprüfung (Kategorien, Regeln, Versionen), ESLint, Build
```

ESLint findet vor allem nicht deklarierte Namen — die lässt der Build durch, sie
fallen sonst erst im Browser als weiße Seite auf. Angemeldete Bereiche lassen
sich nur testen, wenn Andreas sich in der lokalen Vorschau selbst anmeldet.

## Kategorien hinzufügen

Alle Kategorien außer Restaurant und Whisky laufen generisch über `MediaApp` mit
einem CONFIG-Objekt. Eine neue Kategorie muss an **acht** Stellen verdrahtet werden —
wird eine vergessen, fehlt sie stillschweigend an einer Stelle der Oberfläche:

1. `CATEGORY_DEFS` — Icon und Label (1.–5. in `src/categories.js`)
2. `CATEGORY_GROUPS` — Zuordnung zu einer der Obergruppen
3. `<NAME>_TYPES` — Auswahlliste für Sorten/Genres
4. `<NAME>_CONFIG` — Labels, Kriterien, Firebase-Pfade
5. `ALL_CATS` — Registry für die globalen Übersichten (inkl. `cfg:`)
6. Formular-Defaults im Gruppenformular (**zwei** Stellen in
   `src/screens/GroupsOverview.jsx`)
7. Mode-Routing in `src/App.jsx` (Import der `_CONFIG` nicht vergessen)
8. `database.rules.json` — je ein Block für `fbBase` und `fbSugg`, danach
   `firebase deploy --only database`

## Konventionen

- Bewertungen liegen **global pro Kategorie** (`restaurants/`, `whiskies/`, …), nicht
  pro Gruppe. Gruppen legen nur fest, welche Kategorien sichtbar sind und wessen
  Wertungen zählen — deshalb Bewertungsansichten **immer** durch
  `restrictToMembers(item, members)` filtern.
- Duplikate über `dupKey(name, f1)` prüfen (Name + Stadt/Medium). Beim Bewerten eines
  vorhandenen Eintrags wird die Wertung unter `ratings/<user>` ergänzt statt ein
  Duplikat anzulegen; ein bestehender Vorschlag wandert dabei in die Bewertungen.
- Eigene Wertungen immer über `stamped(...)` speichern, das setzt `ratedAt` (Serverzeit).
  Das künftige Dashboard braucht es; Wertungen vor dem 24.09.2026 haben keins.
  Nie `ratings/<fremder Name>` schreiben — die Regeln lehnen das ab, und bei
  `update()` mit mehreren Pfaden scheitert dann der ganze Speichervorgang.
- Löschen immer mit `window.confirm`-Abfrage.
- Alle Bottom-Sheets über `SwipeableSheet`. Zwei iOS-Fallstricke, die schon Fehler
  verursacht haben: `maxHeight` in **dvh** (bei `vh` schneidet Safari oben ab), und
  die Ziehen-oder-Scrollen-Entscheidung fällt **einmal beim Aufsetzen des Fingers**
  (`canDrag`) — sonst schließt sich das Sheet beim Hochscrollen von selbst.
- Farben kommen aus den Theme-Objekten `LIGHT`/`GLASS_MODE` (hell) und
  `DARK`/`GOLD_MODE` (dunkel). Keine Farbwerte hart in Komponenten schreiben.
- Zwei Logos: `src/assets/logo-hell.png` (`LOGO_SRC`) und `logo-gold.png`
  (`LOGO_SRC_DARK`). Der Login nutzt immer die goldene Variante, die Hauptseite
  wechselt nach Modus.

## Umgangston

- Andreas prüft Ergebnisse genau und weist auf Fehler hin — Rückfragen sind erwünscht.
- Bei der Fehlersuche: **eine Frage pro Antwort**, nicht mehrere auf einmal.
- Keine Behauptungen ins Blaue. Wenn etwas unklar ist, lieber nachsehen oder sagen,
  dass du es nicht sicher weißt.

## Langfristiges Ziel

RateMates soll als native App in den App Store und den Play Store. Der Weg dorthin
steht in `ROADMAP.md` — vor jeder größeren Änderung dort nachsehen, in welcher
Phase wir sind und welche Leitplanken gelten. Aktuell: **Phase 1** (Umbau zum
Projekt). Bis sie abgeschlossen ist, keine neuen Funktionen — erst Code aufteilen,
Kategorien datengetrieben machen, Tests. Die neue Aufmachung folgt in Phase 2.

## Offene Themen

- Obergruppe 🌿 Freizeit existiert, ist aber noch leer.
- Sicherheit (Phase 0 der Roadmap): Regeln, Firebase Auth und Konto löschen sind
  seit 23.09.2026 live. Offen: nach der Übergangsphase die restlichen
  `pwHash`-Werte nicht migrierter Konten entfernen. Bekannte Lücke:
  wer einen Eintrag neu anlegt, kann dabei Bewertungen unter fremdem Namen
  mitschicken (Regeln können den Inhalt beim Anlegen nicht prüfen).
