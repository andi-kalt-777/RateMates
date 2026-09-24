# RateMates

Private Bewertungs-App für Freundesgruppen — „von Freunden für Freunde".

Gruppen bewerten gemeinsam Restaurants, Cafés, Bars, Eisdielen, Lieferservices,
Filme, Serien, Bücher, Hörbücher, Spirituosen sowie Kaffee, Bier, Wein, Tee und
Matcha. Vorschläge sammeln, was beim nächsten Mal drankommt.

**Live:** https://andi-kalt-777.github.io/RateMates/

## Aufbau

React 18 mit Vite, der Code liegt unter `src/`. Daten liegen in einer Firebase
Realtime Database, gehostet wird über GitHub Pages.

## Entwicklung

```bash
npm install      # einmalig
npm run dev      # lokale Vorschau auf http://localhost:5173/RateMates/
npm test         # nur die Tests (Vitest)
npm run check    # Strukturprüfung, ESLint, Tests und Build — vor jedem Push ausführen
```

Ein Push auf `main` startet den Workflow `.github/workflows/deploy.yml`: er prüft,
baut und veröffentlicht die App auf GitHub Pages (Einstellung
Settings → Pages → Source: „GitHub Actions“).

Die Datenbankregeln liegen in `database.rules.json` und werden getrennt
veröffentlicht (einmalig `npm install -g firebase-tools` und `firebase login`):

```bash
firebase deploy --only database
```

## Passwort vergessen

Wer im Kontoblatt („Passwort ändern") eine E-Mail-Adresse hinterlegt hat,
setzt sein Passwort auf der Anmeldeseite über „Passwort vergessen?" selbst
zurück. Firebase verschickt die Mail.

Ohne hinterlegte Adresse gibt es keine Reset-Mail, weil die Anmeldung dann über
technische Adressen läuft. Stattdessen setzt der Admin das Konto lokal zurück:

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
