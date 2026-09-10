# Umzug zu Claude Code

Eine einmalige Einrichtung, danach entfällt das manuelle Hochladen: Claude Code
arbeitet direkt in deinem Repository und kann selbst committen und pushen.

---

## 1. Claude Code installieren

Ein Befehl im Terminal. Auf dem Mac öffnest du dazu die App **Terminal**, unter
Windows **PowerShell**:

**macOS / Linux**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows (PowerShell)**
```powershell
irm https://claude.ai/install.ps1 | iex
```

Danach prüfen:
```bash
claude --version
```

Wenn du lieber eine grafische Oberfläche statt des Terminals möchtest, gibt es
Claude Code auch in der Claude-Desktop-App — dann überspringst du diesen Schritt
und öffnest dort den Code-Bereich.

Voraussetzung: ein Claude-Abo (Pro, Max, Team oder Enterprise). Beim ersten Start
mit `claude` meldest du dich im Browser an.

---

## 2. Repository auf den Rechner holen

Du brauchst Git. Auf dem Mac ist es meist schon da (`git --version` prüft das),
sonst über https://git-scm.com installieren.

```bash
cd ~/Projekte                     # oder wohin du magst; Ordner ggf. vorher anlegen
git clone https://github.com/andi-kalt-777/RateMates.git
cd RateMates
```

**Wichtig:** Deine Datei auf GitHub enthält die **echten Firebase-Zugangsdaten**.
Die Kopie aus unserem Chat enthält an dieser Stelle nur Platzhalter. Arbeite
deshalb mit der geklonten Datei weiter und überschreibe sie nicht blind.

---

## 3. Hilfsdateien einsortieren

Kopiere aus dem Umzugspaket in den Projektordner:

```
CLAUDE.md            → ins Hauptverzeichnis
package.json         → ins Hauptverzeichnis
.gitignore           → ins Hauptverzeichnis
scripts/check.js     → in einen neuen Ordner "scripts"
```

`index.html` aus dem Paket brauchst du nur, falls deinem Repository die letzten
Änderungen fehlen — siehe Schritt 5.

Dann einmalig die Prüfwerkzeuge installieren (dafür brauchst du Node.js von
https://nodejs.org):

```bash
npm install
npm run check
```

Die Prüfung sollte mit „✅ Alles in Ordnung." enden.

---

## 4. Erste Sitzung starten

```bash
claude
```

Claude Code liest `CLAUDE.md` automatisch und kennt damit sofort die Architektur,
die Konventionen und die Fallstricke des Projekts. Du kannst direkt loslegen, zum
Beispiel:

> Füge unter Freizeit die Kategorie Wandern ein, mit den Kriterien Aussicht und
> Schwierigkeit.

Claude ändert die Datei, du lässt `npm run check` laufen, und wenn alles passt:

> Committe das und pushe es.

Nach ein bis zwei Minuten ist die Änderung live auf GitHub Pages.

---

## 5. Ist dein Repository auf dem neuesten Stand?

Prüfe nach dem Klonen, ob die zuletzt gebauten Sachen vorhanden sind:

```bash
grep -c "delivery" index.html     # Lieferservice, die letzte Änderung
grep -c "matcha" index.html       # Matcha
```

Kommt dort eine Zahl größer als 0, ist alles da. Steht dort 0, hast du die
betreffende Version noch nicht hochgeladen — dann nimm die `index.html` aus dem
Paket, **trage aber deine echte Firebase-Konfiguration wieder ein** (Zeilen 29–38,
die Werte findest du in deinem alten Stand über `git show HEAD:index.html`).

---

## 6. Lokal ausprobieren, bevor es live geht

```bash
npm run serve
```

Dann im Browser http://localhost:8000 öffnen. So siehst du Änderungen sofort,
ohne sie zu veröffentlichen. Beenden mit `Strg + C`.

---

## Alltag danach

| Aufgabe | Befehl |
|---|---|
| Sitzung starten | `claude` |
| Datei prüfen | `npm run check` |
| Lokal ansehen | `npm run serve` |
| Änderungen live stellen | Claude bitten zu committen und zu pushen |
| Letzte Änderung rückgängig | `git revert HEAD` |

Der größte Gewinn gegenüber vorher: Es gibt eine **Versionshistorie**. Geht etwas
schief, kommst du mit einem Befehl zum letzten funktionierenden Stand zurück —
das mühsame Suchen wie damals beim Babel-Fehler entfällt.

---

## Wenn du magst: Mehrere Dateien statt einer

Die App ist momentan eine einzige 580-KB-Datei, davon etwa 300 KB eingebettete
Logos. Das war nötig, solange du Dateien von Hand hochgeladen hast. Mit Git ist
diese Einschränkung weg: Die Logos könnten als eigene PNG-Dateien danebenliegen
und der Code ließe sich aufteilen. Das macht das Bearbeiten deutlich schneller.

Nötig ist es nicht — die App läuft so, wie sie ist. Wenn du es willst, sag es
Claude Code einfach in einer Sitzung; GitHub Pages liefert mehrere Dateien
genauso problemlos aus wie eine.
