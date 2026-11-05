# Parola kostenlos auf dem eigenen iPhone testen

Der vorbereitete Stand kann auf einem iPhone 15 Pro laufen. Für den letzten Bau- und Installationsschritt ist zwingend ein Mac nötig, weil Apple Xcode nur für macOS anbietet. Für das eigene Gerät reicht ein kostenloser Apple-Account; die kostenpflichtige Apple-Developer-Mitgliedschaft ist für diesen Test nicht erforderlich.

## Was bereits vorbereitet ist

- eine native iOS-App namens **Parola**
- Mindestversion iOS 15, damit ist das iPhone 15 Pro abgedeckt
- App-Symbol und Startbildschirm
- lokale Vokabeln und Lernstatistik
- native Mikrofon- und Spracherkennung auf Italienisch
- akustische Wiederholung der richtigen italienischen Antwort
- Sicherung über das Teilen-Menü des iPhones

## 1. Einmalig auf dem Mac einrichten

1. Installiere **Xcode 26 oder neuer** aus dem Mac App Store und öffne es einmal. Bestätige die Lizenz und lasse die zusätzlichen Komponenten installieren.
2. Öffne in Xcode **Settings → Accounts**, drücke auf **+** und melde dich mit deinem normalen Apple-Account an.
3. Installiere **Node.js 22 oder neuer**. Prüfe im Terminal mit:

   ```bash
   node --version
   ```

4. Installiere CocoaPods, zum Beispiel über Homebrew:

   ```bash
   brew install cocoapods
   ```

## 2. Projekt auf den Mac holen

Im Terminal:

```bash
git clone https://github.com/dpack1989/parola.git
cd parola
npm ci
npm run ios:sync
open ios/App/App.xcworkspace
```

Wichtig: Immer `App.xcworkspace` öffnen, nicht `App.xcodeproj`. Nur der Workspace enthält auch die native Spracherkennung.

Wenn das Projekt auf dem Mac schon vorhanden ist, genügen bei späteren Aktualisierungen:

```bash
git pull
npm ci
npm run ios:sync
open ios/App/App.xcworkspace
```

## 3. Kostenlose Signierung in Xcode einstellen

1. Klicke links ganz oben auf das blaue Projekt **App**.
2. Wähle unter **TARGETS** ebenfalls **App**.
3. Öffne **Signing & Capabilities**.
4. Aktiviere **Automatically manage signing**.
5. Wähle bei **Team** deinen Namen mit dem Zusatz **Personal Team**.
6. Falls Xcode meldet, dass `com.dpack1989.parola` bereits vergeben ist, ändere **Bundle Identifier** in etwas weltweit Eindeutiges, zum Beispiel `com.deinname.parola.privat`.

## 4. iPhone verbinden und App installieren

1. Verbinde das entsperrte iPhone 15 Pro per Kabel mit dem Mac und bestätige **Diesem Computer vertrauen**.
2. Aktiviere auf dem iPhone bei Bedarf **Einstellungen → Datenschutz & Sicherheit → Entwicklermodus**. Das iPhone startet danach neu.
3. Wähle oben in Xcode neben dem Startknopf dein echtes iPhone als Zielgerät aus.
4. Drücke den dreieckigen **Run**-Knopf. Xcode kompiliert Parola, installiert die App und öffnet sie.
5. Falls iOS die App beim ersten Mal noch nicht öffnet, bestätige den Entwickler unter **Einstellungen → Allgemein → VPN und Geräteverwaltung**. Dieser Punkt erscheint nur, wenn iOS ihn benötigt.
6. Erlaube beim ersten Sprechtraining den Zugriff auf **Mikrofon** und **Spracherkennung**.

## Grenzen des kostenlosen Tests

- Die Installation mit einem kostenlosen Personal Team ist nur für eigene, direkt verbundene Geräte gedacht.
- Die kostenlose Signierung läuft nach ungefähr sieben Tagen ab. Danach das iPhone wieder mit dem Mac verbinden und in Xcode erneut **Run** drücken.
- TestFlight, Weitergabe an andere Personen und App-Store-Veröffentlichung benötigen die kostenpflichtige Apple-Developer-Mitgliedschaft.
- Die native App übernimmt den Speicher der bisherigen Safari-Web-App nicht automatisch. In der Web-App zuerst unter **Sicherung** exportieren und die JSON-Datei anschließend in der App importieren, wenn du den bisherigen Lernstand mitnehmen möchtest.

## Kurzer Funktionstest auf dem iPhone

1. Öffne **Sprechen** und starte eine Runde mit allen Gruppen.
2. Sage die italienische Lösung. Bei einer richtigen Antwort muss Parola die Karte aufdecken, das italienische Wort vorsprechen und automatisch weiterschalten.
3. Sage absichtlich einmal eine falsche Lösung. Das Wort muss erneut verlangt und der Fehler gespeichert werden.
4. Prüfe zusätzlich **Vokabel hinzufügen**, **Bearbeiten**, **Löschen**, **Schreiben**, **Bewerten** sowie **Sicherung exportieren/importieren**.
