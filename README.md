# Parola – Italienisch-Vokabeltrainer

**Parola** ist Italienisch und bedeutet „Wort“. Unter diesem Namen entsteht ein privater Italienisch-Vokabeltrainer für Web, iPhone, Android und Windows. Persönliche Lerninhalte bleiben lokal auf dem jeweiligen Gerät.

- **Web-App öffnen:** [dpack1989.github.io/parola](https://dpack1989.github.io/parola/)
- **Projekt auf GitHub:** [github.com/dpack1989/parola](https://github.com/dpack1989/parola)
- **Dokumentation:** [GitHub und GitHub Pages](docs/GITHUB-UND-PAGES.md) · [Parola im Überblick](docs/PAROLA.md)

## Aktueller Stand

Die erste funktionsfähige Version ist fertig und für eine iPhone-Breite geprüft.

Enthalten sind:

- eigene Vokabeln hinzufügen, bearbeiten und löschen
- Vokabeln in frei benennbare Gruppen einteilen und gruppenweise trainieren
- italienische Sprachausgabe über die Systemstimme
- Lernkarten Deutsch → Italienisch mit antippbarer Kartenwendung und automatischer Aussprache
- Schnelle Übung mit bis zu 30 zufälligen Wörtern; Fehler kommen erneut, bis alle Wörter sitzen
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
- eingebauter Vokabelkatalog aus dem Ordner `INBOUND`
- durchsuchbare, sortierbare zweisprachige Vokabelliste mit umkehrbarer Sprachrichtung
- natives iOS-Projekt mit App-Symbol, Startbildschirm und iPhone-Berechtigungen
- native Spracherkennung in der iPhone-App mit italienischer Sprache (`it-IT`)
- native Sicherung über das iOS-Teilen-Menü
- native Android-App mit automatisch gebauter Test-APK
- eigenständiges, portables Windows-Programm

## iPhone-App testen

Das iOS-Projekt liegt im Ordner `ios`. Die Web-App wird dafür mit Capacitor in eine echte iPhone-App eingebettet. Die letzte Kompilierung und Installation muss auf einem Mac mit Xcode erfolgen; Apple stellt Xcode nicht für Windows bereit.

Die vollständige Anleitung steht in [IOS-TEST.md](IOS-TEST.md). Für einen Test auf dem eigenen iPhone genügt ein kostenloser Apple-Account. Eine kostenpflichtige Mitgliedschaft wird erst für TestFlight oder eine Veröffentlichung benötigt.

## Android-App

Das vollständige Android-Projekt liegt in `android`. Nach dem Hochladen baut GitHub automatisch eine testbare Debug-APK; die Anleitung zum Herunterladen und zur lokalen Arbeit mit Android Studio steht in [android/README.md](android/README.md).

## Windows-Programm

Das eigenständige PC-Programm liegt in `desktop`. Mit `npm run desktop:build` entsteht die portable Datei `desktop/dist/Parola-Windows-1.0.0.exe`. Sie benötigt keine Installation. Weitere Hinweise stehen in [desktop/README.md](desktop/README.md).

## Projektstruktur

- `index.html` – Oberfläche und Dialoge
- `css/styles.css` – Gestaltung und mobile Darstellung
- `js/app.js` – Vokabelverwaltung, Übungen und Wiederholungslogik
- `manifest.webmanifest` – Installation als Web-App
- `sw.js` – Offline-Cache
- `assets/icon.svg` – App-Symbol
- `assets/logo.svg` – hochauflösende Quelle für das native App-Symbol
- `capacitor.config.json` – Einstellungen der iPhone-Verpackung
- `ios` – das von Xcode verwendete iOS-Projekt
- `android` – eigenständiges Android-Studio-Projekt
- `desktop` – eigenständige Windows-Verpackung
- `tools/build-native.mjs` – übernimmt den aktuellen Web-Stand in die iPhone-App
- `AGENTS.md` – dauerhafte Hinweise für zukünftige Codex-Chats

## Lokal testen

`index.html` lässt sich für einen einfachen Oberflächentest direkt öffnen. Für Service Worker, Mikrofonzugriff und die Installation als Home-Bildschirm-App muss die Seite über `https://` oder einen lokalen Webserver geladen werden.

Beispiel mit Python im Projektordner:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Danach im Browser `http://127.0.0.1:8765` öffnen.

## Speicherung und Sicherung

Die Vokabeln liegen im `localStorage` des jeweiligen Browsers beziehungsweise der iPhone-App unter dem Schlüssel `parola-v1`. Web-App und native App besitzen getrennte Speicherbereiche und werden nicht automatisch synchronisiert. Deshalb regelmäßig im Bereich **Sicherung** eine JSON-Datei sichern. In der iPhone-App öffnet sich dafür das iOS-Teilen-Menü.

Beim Import einer Sicherung wird die vorhandene Sammlung ersetzt. Wenn bereits Wörter vorhanden sind, lädt Parola vorher automatisch eine Sicherung herunter.

## Neue Vokabeldateien einlesen

Neue Wortpaare werden in `INBOUND/vokabeln.txt` eingetragen. Das Format besteht immer aus Italienisch, Deutsch und einer Leerzeile:

```text
il treno
der Zug

la stazione
der Bahnhof
```

Danach im Projektordner ausführen:

```powershell
& .\tools\Import-Vocabulary.ps1
```

Das Skript ergänzt neue Wörter in `data/vocabulary.json`, aktualisiert geänderte Übersetzungen und Kategorien und lässt alle übrigen Wörter bestehen. Die gelesene TXT-Datei wird mit einem Zeitstempel nach `INBOUND/Archiv` verschoben. Bekannte Kategorien und bevorzugte Übersetzungen stehen in `tools/vocabulary-rules.json`; völlig unbekannte Wörter erhalten zunächst die Gruppe **Neu / prüfen**.

Beim nächsten Laden gleicht Parola den Katalog mit dem lokalen Bestand ab. Persönlicher Lernfortschritt und Fehlerstatistik bleiben erhalten.

## Bekannte Einschränkung

Die Browser-Spracherkennung ist in Safari abhängig von iOS-Version und Geräteeinstellungen. Wenn sie nicht verfügbar ist, kann die italienische Diktierfunktion der iPhone-Tastatur im Eingabefeld verwendet werden.
