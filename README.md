# Parola – Italienisch-Vokabeltrainer

Parola ist eine kleine, installierbare Web-App zum Lernen eigener italienischer Vokabeln auf dem iPhone. Sie benötigt keine App-Store-Veröffentlichung und speichert die persönlichen Lerninhalte ausschließlich lokal im Browser.

## Aktueller Stand

Die erste funktionsfähige Version ist fertig und für eine iPhone-Breite geprüft.

Enthalten sind:

- eigene Vokabeln hinzufügen, bearbeiten und löschen
- Vokabeln in frei benennbare Gruppen einteilen und gruppenweise trainieren
- italienische Sprachausgabe über die Systemstimme
- Lernkarten mit selbstständiger Bewertung
- Schreibübungen Deutsch → Italienisch
- Sprechübungen mit Browser-Spracherkennung
- automatischer Ablauf beim Sprechen: erkennen, Lösung zeigen, vorsprechen und weiterschalten
- dauerhafte Fehlerstatistik mit häufigerer Wiederholung schwieriger Wörter
- Ausweichmöglichkeit über die Diktierfunktion der iPhone-Tastatur
- gemischter Lernmodus
- lokale Wiederholungsplanung mit vier Bewertungen
- lokale Speicherung im Browser
- Export und Import einer JSON-Datensicherung
- Web-App-Manifest, App-Symbol und Offline-Cache
- responsive Bedienoberfläche für das iPhone

## Noch offen

1. Eine kostenlose HTTPS-Adresse einrichten und die Web-App veröffentlichen.
2. Spracherkennung und Installation auf dem tatsächlichen iPhone testen.
3. Bei Bedarf Lernstatistiken, Kategorien oder eine umkehrbare Abfragerichtung ergänzen.

## Projektstruktur

- `index.html` – Oberfläche und Dialoge
- `css/styles.css` – Gestaltung und mobile Darstellung
- `js/app.js` – Vokabelverwaltung, Übungen und Wiederholungslogik
- `manifest.webmanifest` – Installation als Web-App
- `sw.js` – Offline-Cache
- `assets/icon.svg` – App-Symbol
- `AGENTS.md` – dauerhafte Hinweise für zukünftige Codex-Chats

## Lokal testen

`index.html` lässt sich für einen einfachen Oberflächentest direkt öffnen. Für Service Worker, Mikrofonzugriff und die Installation als Home-Bildschirm-App muss die Seite über `https://` oder einen lokalen Webserver geladen werden.

Beispiel mit Python im Projektordner:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Danach im Browser `http://127.0.0.1:8765` öffnen.

## Speicherung und Sicherung

Die Vokabeln liegen im `localStorage` des jeweiligen Browsers unter dem Schlüssel `parola-v1`. Sie sind nicht automatisch zwischen Geräten synchronisiert. Deshalb regelmäßig im Bereich **Sicherung** eine JSON-Datei herunterladen.

Beim Import einer Sicherung wird die vorhandene Sammlung ersetzt. Wenn bereits Wörter vorhanden sind, lädt Parola vorher automatisch eine Sicherung herunter.

## Bekannte Einschränkung

Die Browser-Spracherkennung ist in Safari abhängig von iOS-Version und Geräteeinstellungen. Wenn sie nicht verfügbar ist, kann die italienische Diktierfunktion der iPhone-Tastatur im Eingabefeld verwendet werden.
