# Parola für Windows

Dieser Ordner enthält das eigenständige Windows-Programm. Vokabeln und Lernfortschritt werden ausschließlich im lokalen Programmspeicher dieses PCs gespeichert. Der Speicher ist von der Browser-, Android- und iPhone-Version getrennt; zum Übertragen dient die JSON-Sicherung in Parola.

## Fertiges Programm starten

Die gebaute Datei liegt nach dem Erstellen unter `desktop/dist/Parola-Windows-1.0.0.exe`. Sie ist portabel und kann ohne Installation gestartet werden.

## Aus dem Quellcode starten oder neu bauen

Im Hauptordner des Projekts:

```powershell
npm ci
npm run desktop:start
```

Eine neue portable EXE wird so erzeugt:

```powershell
npm run desktop:build
```

Auf Windows steht neben der Browser-Spracherkennung immer das Eingabefeld als sichere Alternative bereit. Ob die automatische Mikrofonerkennung verfügbar ist, hängt von der in Electron enthaltenen Chromium-Version und den Windows-Spracheinstellungen ab.
