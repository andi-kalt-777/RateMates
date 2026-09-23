# RateMates

Private Bewertungs-App für Freundesgruppen — „von Freunden für Freunde".

Gruppen bewerten gemeinsam Restaurants, Cafés, Bars, Eisdielen, Lieferservices,
Filme, Serien, Bücher, Hörbücher, Spirituosen sowie Kaffee, Bier, Wein, Tee und
Matcha. Vorschläge sammeln, was beim nächsten Mal drankommt.

**Live:** https://andi-kalt-777.github.io/RateMates/

## Aufbau

Die komplette App steckt in `index.html`: React 18 mit Babel im Browser, ohne
Build-Schritt. Daten liegen in einer Firebase Realtime Database, gehostet wird
über GitHub Pages.

## Entwicklung

```bash
npm install      # einmalig, nur für die Syntaxprüfung
npm run check    # prüft index.html — vor jedem Push ausführen
npm run serve    # lokale Vorschau auf http://localhost:8000
```

Ein Push auf `main` geht automatisch live.

Die Datenbankregeln liegen in `database.rules.json` und werden getrennt
veröffentlicht (einmalig `npm install -g firebase-tools` und `firebase login`):

```bash
firebase deploy --only database
```

## Passwort vergessen

Die Anmeldung läuft über Firebase Authentication mit technischen Adressen, es
gibt also keine Reset-Mail. Stattdessen setzt der Admin das Konto lokal zurück:

```bash
powershell -ExecutionPolicy Bypass -File scripts/reset-password.ps1 -Name "Jupp"
```

Das Skript fragt verdeckt nach einem Startpasswort und schreibt nur den Hash in
die Datenbank. War das Konto schon auf Firebase Auth umgezogen, muss vorher der
Nutzer in der Firebase-Konsole unter Authentication → Nutzer gelöscht werden
(das Skript nennt die Adresse). Beim nächsten Login zieht das Konto automatisch
wieder um; das Startpasswort wird dann in der App geändert.

`CLAUDE.md` enthält die Projektkonventionen für die Arbeit mit Claude Code,
`UMZUG.md` die Einrichtungsanleitung, `ROADMAP.md` den Fahrplan zur Store-App.
