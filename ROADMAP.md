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
| Weg zur nativen App | Capacitor (Web-App in nativer Hülle) | Empfehlung, noch zu bestätigen |
| Build-Werkzeug | Vite + React, kein Babel mehr im Browser | entschieden |
| Mac für iOS-Builds verfügbar? | – | offen |
| Veröffentlichung als Firma oder Privatperson? | – | offen |
| Dürfen Fremde später eigene Gruppen gründen? | – | offen |

## Leitplanken für die laufende Arbeit

- Solange die App eine Einzeldatei ist, nur noch Sicherheitsarbeit (Phase 0)
  hineinbauen. Neue Funktionen erst nach dem Umbau in Phase 1, sonst wird der
  Umbau mit jeder Funktion teurer.
- Kategorien sollen künftig aus einer Konfiguration kommen, nicht aus acht
  Codestellen. Neue Kategorien bis dahin nur, wenn es wirklich nötig ist.
- Alles, was Nutzer sehen, muss auch für Fremde ohne Erklärung verständlich
  sein. Das gilt schon jetzt für neue Oberflächen.

## Phase 0 – Sicherheit und Fundament

Ziel: Die App ist so abgesichert, dass sie öffentlich erreichbar sein darf.

- [ ] Startpasswort ändern, Seed-Block mit Konten aus `index.html` entfernen
- [ ] Firebase Authentication für das Login (Benutzernamen bleiben erhalten,
      intern auf technische Adressen abgebildet)
- [ ] Übergangsphase: alle bisherigen Nutzer setzen einmal ein neues Passwort
- [ ] Datenbankregeln: Lesen nur angemeldet, Bewertungen nur unter eigenem
      Namen, Gruppen nur durch Mitglieder, Profile nur durch den Besitzer
- [ ] Regeln als Datei im Repo versionieren und vor dem Scharfschalten gegen
      die echten Pfade testen
- [ ] Konto löschen aus der App heraus (Pflicht bei Apple)

## Phase 1 – Vom Einzel-File zum Projekt

Ziel: Ein normales Software-Projekt mit Build-Schritt. Für Nutzer ändert sich
nichts sichtbar.

- [ ] Vite + React einrichten, gepinnte Abhängigkeiten über `package.json`
- [ ] Code auf Dateien verteilen: Komponenten, Kategorien, Firebase-Zugriff,
      Theme, Hilfsfunktionen
- [ ] Logos als eigene PNG-Dateien statt Base64
- [ ] Kategorien datengetrieben: eine Konfigurationsdatei statt acht Stellen
- [ ] Automatische Tests für Rechenlogik (Durchschnitte, Duplikate,
      Mitgliederfilter)
- [ ] GitHub Actions: bei Push auf `main` bauen und auf GitHub Pages
      veröffentlichen
- [ ] `npm run check` durch Linter und Build ersetzen

## Phase 2 – App-Fähigkeiten

Ziel: Die App fühlt sich auf dem Handy wie eine App an.

- [ ] PWA: Manifest, Service Worker, installierbar, lädt offline
- [ ] Capacitor-Projekte für iOS und Android anlegen
- [ ] App-Icons, Startbildschirm, Statusleiste, Safe Areas
- [ ] Android-Zurück-Taste und Tastaturverhalten
- [ ] Push-Nachrichten (z. B. neue Bewertung in der Gruppe)
- [ ] Einladungslinks, die direkt die App öffnen (Deep Links)

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
- [ ] Screenshots, Store-Texte, Beschreibung, Schlagwörter

## Phase 4 – Beta über die Stores

- [ ] Apple Developer Program (99 USD/Jahr)
- [ ] Google Play Console (25 USD einmalig, Identitätsprüfung)
- [ ] iOS-Builds: Mac mit Xcode oder Cloud-Build-Dienst
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
| Cloud-Builds für iOS (ohne Mac) | wenige Euro pro Monat, bei Bedarf |
