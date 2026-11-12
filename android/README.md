# Parola für Android

Dieser Ordner enthält die native Android-App. Sie verwendet dieselbe Oberfläche und Lernlogik wie Parola auf dem iPhone, ergänzt um native Android-Spracherkennung, Teilen und Dateizugriff.

## Einfachster Weg zur APK

Nach jedem Hochladen auf GitHub baut der Workflow **Android APK** automatisch eine testbare Debug-APK. Auf GitHub unter **Actions → Android APK → letzter erfolgreicher Lauf → Artifacts** die Datei `Parola-Android-Debug` herunterladen und entpacken.

Vor der Installation muss Android gegebenenfalls das Installieren unbekannter Apps für den verwendeten Browser oder Dateimanager erlauben. Die APK ist nur zum privaten Testen gedacht und benötigt keinen Play-Store-Account.

## Lokal mit Android Studio

Voraussetzungen sind Android Studio, Android SDK und Java 21. Danach im Projekt-Hauptordner:

```powershell
npm ci
npm run android:sync
npm run android:open
```

In Android Studio ein verbundenes Gerät auswählen und auf **Run** drücken. Eine Debug-APK lässt sich alternativ mit `npm run android:apk` erzeugen und liegt anschließend unter `android/app/build/outputs/apk/debug/app-debug.apk`.

Persönliche Vokabeln und Lernfortschritt bleiben lokal in der App. Für einen Wechsel zwischen Geräten die JSON-Sicherung verwenden.
