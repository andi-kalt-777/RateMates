# RateMates – Fahrplan zur Store-App

Stand: 10.09.2026

## Ziel

RateMates soll als richtige App im Apple App Store und im Google Play Store
erscheinen. Bis dahin wird sie im Freundeskreis weiterentwickelt und getestet.
Jede Entscheidung auf dem Weg soll das Ziel im Blick behalten: nichts bauen,
was später im Store im Weg steht.

## Grundentscheidungen

| Thema | Entscheidung | Status |
|---|---|---|
| Datenbank | Firebase bleibt (Realtime Database, Region Europa) | entschieden |
| Weg zur nativen App | Capacitor (Web-App in nativer Hülle) | entschieden |
| Build-Werkzeug | Vite + React, kein Babel mehr im Browser | entschieden |
| Mac für iOS-Builds | vorhanden, iOS-Builds laufen lokal über Xcode | entschieden |
| Veröffentlichung als Firma oder Privatperson? | Tendenz: kleine Selbständigkeit rund um die App | offen, Entscheidung vor Phase 4 |
| Dürfen Fremde eigene Gruppen gründen? | vorerst nicht; später evtl. als Pro-Funktion gegen Bezahlung | offen, Entscheidung vor Phase 3 |

### Folgen dieser Entscheidungen

- **Selbständigkeit:** Für die Beta (Phase 4) reicht ein privates Entwicklerkonto.
  Apple und Google erlauben später die Übertragung der App auf ein Firmenkonto.
  Ein Firmenkonto bei Apple braucht eine eingetragene Firma und eine D-U-N-S-Nummer,
  das dauert Wochen und sollte früh beantragt werden, sobald die Entscheidung steht.
- **Pro-Funktionen:** Bezahlte Funktionen in der App laufen über In-App-Käufe der
  Stores (Apple und Google behalten 15–30 %). Das braucht Steuer- und Bankdaten im
  Entwicklerkonto und ist ein Grund mehr für eine saubere Gewerbe-Entscheidung.
  Technisch: Das Nutzermodell bekommt ab Phase 0 ein Feld für die Berechtigungsstufe
  (z. B. `plan: "free" | "pro"`), damit Funktionen später sauber freigeschaltet
  werden können. Gruppen-Gründung bleibt bis dahin auf bekannte Nutzer beschränkt.
- **Kein Cloud-Build nötig:** Der Kostenpunkt „Cloud-Builds für iOS" entfällt.

## Leitplanken für die laufende Arbeit

- Der Umbau zum Projekt (Phase 1) ist abgeschlossen; neue Funktionen kommen jetzt
  in die aufgeteilte Struktur unter `src/`, mit Tests für neue Rechenlogik.
- Kategorien kommen aus `src/categories/definitions.js`. Neue Kategorie =
  Definition + Block in `database.rules.json`.
- Alles, was Nutzer sehen, muss auch für Fremde ohne Erklärung verständlich
  sein. Das gilt schon jetzt für neue Oberflächen.

## Phase 0 – Sicherheit und Fundament

Ziel: Die App ist so abgesichert, dass sie öffentlich erreichbar sein darf.

- [x] Startpasswort ändern, Seed-Block mit Konten aus `index.html` entfernen
      (10.09.2026)
- [x] Firebase Authentication für das Login (Benutzernamen bleiben erhalten,
      intern auf technische Adressen abgebildet) — 23.09.2026
- [x] Übergangsphase: alte Konten ziehen beim ersten Login automatisch um, ohne
      neues Passwort; die Regel prüft dabei den alten Hash — 23.09.2026.
      Offen: nach einigen Wochen die `pwHash`-Werte nie eingeloggter Konten
      entfernen.
- [x] Datenbankregeln: Lesen nur angemeldet, Bewertungen nur unter eigenem
      Namen, Gruppen nur durch Admins, Profile nur durch den Besitzer — 23.09.2026
- [x] Regeln als Datei im Repo versionieren (`database.rules.json`), vor dem
      Scharfschalten gegen die echten Pfade getestet — 23.09.2026
- [x] Konto löschen aus der App heraus (Pflicht bei Apple) — 23.09.2026, im
      Blatt „Passwort ändern"
- [x] Admin-Weg für vergessene Passwörter: `scripts/reset-password.ps1`, Ablauf
      in der README — 23.09.2026
- [x] „Passwort vergessen" per Mail für Nutzer mit freiwillig hinterlegter
      E-Mail-Adresse — 23.09.2026. Für die Datenschutzerklärung (Phase 3): die
      Adresse liegt nur in Firebase Authentication (Google, auch USA).
- [ ] Auftragsverarbeitungsvertrag mit Google in den Firebase-Projekteinstellungen
      akzeptieren, bevor Fremde die App nutzen

## Phase 1 – Vom Einzel-File zum Projekt

Ziel: Ein normales Software-Projekt mit Build-Schritt. Für Nutzer ändert sich
nichts sichtbar.

- [x] Vite + React einrichten, gepinnte Abhängigkeiten über `package.json`
      (24.09.2026; Firebase vorerst weiter als compat-SDK 9.23.0, Wechsel aufs
      modulare SDK spart später gut 300 kB)
- [x] Code auf Dateien verteilen: Komponenten, Kategorien, Firebase-Zugriff,
      Theme, Hilfsfunktionen (24.09.2026, 18 Dateien unter `src/`)
- [x] Logos als eigene PNG-Dateien statt Base64 (24.09.2026)
- [x] Kategorien datengetrieben: eine Konfigurationsdatei statt acht Stellen
      (24.09.2026: `src/categories/definitions.js`, eine gemeinsame Ansicht
      `CategoryApp` statt drei; neue Kategorie = Definition + Regelblock)
- [x] Automatische Tests für Rechenlogik (Durchschnitte, Duplikate,
      Mitgliederfilter) — 24.09.2026, Vitest, 39 Tests inkl. Kategorie-Registry
      und Anmelde-Helfer, laufen in `npm run check` und im Deployment mit
- [x] GitHub Actions: bei Push auf `main` bauen und auf GitHub Pages
      veröffentlichen (24.09.2026)
- [x] `npm run check` durch Linter und Build ersetzen (24.09.2026; die
      Strukturprüfung für Kategorien und Regeln bleibt davor)

## Phase 2 – App-Fähigkeiten

Ziel: Die App fühlt sich auf dem Handy wie eine App an.

- [x] Neue Aufmachung nach dem Entwurf vom 24.09.2026 (live seit 24.09.2026)
      (https://claude.ai/artifact/KmrMwWcBupGWJMpXF7ZNEo), entschieden:
      Variante A. Leiste unten mit fünf Reitern (Start, Bewertungen,
      Vorschläge, Gruppen, Kategorien), Start ist ein Dashboard (Bilanz,
      letzte eigene Bewertung, Neues von Freunden, meistbewertete
      Kategorien). Die Leiste bleibt auch in geöffneten Gruppen stehen,
      dort oben Umschalter Bewertungen/Vorschläge. Wertungen tragen seit
      24.09.2026 ein Zeitfeld `ratedAt`; ältere haben keins und zählen nur
      zur Bilanz.
- [ ] PWA: Manifest, Service Worker, installierbar, lädt offline
- [ ] Capacitor-Projekte für iOS und Android anlegen
- [ ] App-Icons, Startbildschirm, Statusleiste, Safe Areas
- [ ] Android-Zurück-Taste und Tastaturverhalten
- [ ] Push-Nachrichten (z. B. neue Bewertung in der Gruppe)
- [ ] Einladungslinks, die direkt die App öffnen (Deep Links)
- [ ] Anmeldung mit Google und Apple, zusätzlich zu Name/Passwort. Beides
      zusammen: Apple verlangt „Mit Apple anmelden", sobald eine iOS-App einen
      anderen Drittanbieter-Login bietet. Läuft in Capacitor über native
      Plugins; die uid-Zuordnung in `uids/` ist dafür schon vorbereitet.
      Apple-Login braucht das Entwicklerkonto aus Phase 4. Keine SMS-Zwei-Faktor
      (Bezahltarif, Telefonnummern als zusätzliche Daten, kein Mehrwert).
      Schon erledigt (24.09.2026): Google Auth Platform in Google Cloud
      eingerichtet (Branding, Zielgruppe Extern). Deren App-Name „RateMates"
      ist auch der Name in den Firebase-Mails (`%APP_NAME%`); ohne Branding
      stand dort die Projekt-ID. OAuth-Client fehlt noch.

## Phase 3 – Store-Reife

Ziel: Alles, was die Stores verlangen und was Fremde brauchen.

- [ ] Datenschutzerklärung, Impressum, Nutzungsbedingungen
- [ ] Melden und Blockieren von Inhalten und Nutzern (Pflicht bei Apple für
      nutzererstellte Inhalte)
- [ ] Altersfreigabe entscheiden: Alkoholkategorien führen voraussichtlich zu
      17+/18+
- [ ] Onboarding für neue Nutzer ohne Vorwissen
- [ ] Absturz- und Fehlerberichte
- [ ] Namensprüfung: ist „RateMates" in beiden Stores und markenrechtlich frei?
- [ ] Eigene Domain kaufen (erst nach der Namensprüfung), z. B. `ratemates.de`.
      Damit: Firebase-Mails von `noreply@<domain>` statt
      `noreply@montagabendrestaurants.firebaseapp.com` (Authentication →
      Vorlagen → Domain anpassen, DNS-Einträge beim Anbieter), Links in den
      Mails auf die eigene Domain, Support-Adresse für die Stores, feste
      Adresse für Datenschutzerklärung und Impressum, App unter eigener
      Domain statt `andi-kalt-777.github.io`
- [ ] Screenshots, Store-Texte, Beschreibung, Schlagwörter

## Phase 4 – Beta über die Stores

- [ ] Apple Developer Program (99 USD/Jahr)
- [ ] Google Play Console (25 USD einmalig, Identitätsprüfung)
- [ ] iOS-Builds auf dem Mac mit Xcode einrichten
- [ ] TestFlight-Beta mit dem Freundeskreis
- [ ] Google: geschlossener Test mit mindestens 12 Testern über 14 Tage
      (Pflicht für neue Privatkonten)
- [ ] Rückmeldungen einarbeiten

## Phase 5 – Veröffentlichung und Betrieb

- [ ] Einreichung in beiden Stores, Review-Runden
- [ ] Monitoring: Fehler, Nutzung, Firebase-Kosten
- [ ] Update-Prozess über die Stores festlegen
- [ ] Firebase-Tarif prüfen, sobald die App über den Freundeskreis hinauswächst

## Kosten im Überblick

| Posten | Betrag |
|---|---|
| Apple Developer Program | 99 USD pro Jahr |
| Google Play Console | 25 USD einmalig |
| Firebase | kostenlos bis zu spürbarer Nutzung |
| In-App-Käufe (falls Pro-Funktionen) | 15–30 % Provision an die Stores |
