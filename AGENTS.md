# Projektanweisungen für Codex

## Ziel

Parola ist eine einfache, private Italienisch-Vokabel-Web-App für das iPhone. Sie soll ohne App-Store-Veröffentlichung funktionieren und für nichttechnische Nutzer leicht bedienbar bleiben.

## Kommunikation

- Mit dem Nutzer auf Deutsch und in verständlicher, nichttechnischer Sprache kommunizieren.
- Änderungen zuerst anhand des sichtbaren Nutzens erklären.
- Bei iPhone- oder Safari-Einschränkungen klar zwischen sicherer Funktion und geräteabhängigem Verhalten unterscheiden.

## Technische Leitlinien

- Die Anwendung bleibt vorerst eine buildfreie HTML/CSS/JavaScript-PWA.
- Keine externen Frameworks oder Dienste hinzufügen, solange sie nicht wirklich benötigt werden.
- Persönliche Vokabeln standardmäßig nur lokal im Browser speichern.
- Das vorhandene Sicherungsformat und den `localStorage`-Schlüssel `parola-v1` rückwärtskompatibel halten.
- Sprachausgabe mit `it-IT` verwenden.
- Für Spracherkennung immer eine Eingabe- oder Diktieralternative anbieten.
- Mobile Bedienung, große Berührungsflächen, gute Lesbarkeit und sichere Bereiche des iPhones berücksichtigen.
- Bei Änderungen am Offline-Cache die Cache-Version in `sw.js` erhöhen.

## Prüfung vor Übergabe

- `node --check js/app.js` ausführen.
- Die Startseite und mindestens einen vollständigen Lernablauf testen.
- Darstellung mindestens bei 390 × 844 Pixel prüfen.
- Hinzufügen, Bearbeiten, Löschen, Schreiben, Bewerten sowie Export/Import bei betroffenen Änderungen kontrollieren.
- Keine echten Nutzerdaten oder Beispielvokabeln fest in den Produktivstand schreiben.

## Aktueller Stand und nächste Schritte

Die funktionsfähige Erstversion umfasst Vokabelverwaltung, Lernkarten, Schreiben, Sprechen, gemischtes Üben, Wiederholungsplanung, Sprachausgabe, lokale Sicherung und Offline-Unterstützung. Als Nächstes soll eine kostenlose HTTPS-Veröffentlichung eingerichtet und anschließend auf dem echten iPhone getestet werden. Details stehen in `README.md`.
