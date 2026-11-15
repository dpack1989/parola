# Parola im Überblick

## Was ist Parola?

**Parola** bedeutet auf Italienisch „Wort“. Die App ist ein privater Vokabeltrainer für das Italienischlernen. Sie ist bewusst einfach gehalten und lässt sich als Web-App sowie in vorbereiteten Versionen für iPhone, Android und Windows verwenden.

## Was kann die App?

Parola verwaltet eigene Vokabeln und ordnet sie in frei benennbare Gruppen ein. Zum Lernen gibt es Lernkarten, Schreib- und Sprechübungen, eine schnelle Übung, gemischtes Training und einen Grammatikbereich. Schwierige oder falsch beantwortete Wörter werden häufiger wiederholt. Italienische Wörter können mit einer italienischen Systemstimme vorgelesen werden.

## Wo bleiben die persönlichen Daten?

Persönliche Vokabeln, Lernfortschritt und Fehlerstatistik bleiben grundsätzlich lokal auf dem jeweiligen Gerät. Im Browser werden sie unter dem internen Schlüssel `parola-v1` gespeichert. Sie werden niemals zu GitHub übertragen.

Im Bereich **Sicherung** kann zusätzlich die freiwillige Cloud-Synchronisierung aktiviert werden. Nach einer persönlichen Anmeldung gleicht Parola den Stand über Supabase zwischen mehreren Geräten ab. Ohne Anmeldung bleiben Browser, iPhone-App, Android-App und Windows-Version getrennt. Eine JSON-Datei kann weiterhin exportiert und später wieder importiert werden.

## Wie wird Parola verwendet?

Die veröffentlichte Web-App ist unter <https://dpack1989.github.io/parola/> erreichbar. Auf dem iPhone kann sie in Safari geöffnet und zum Home-Bildschirm hinzugefügt werden. Danach verhält sie sich weitgehend wie eine App und kann durch den Offline-Cache auch ohne durchgehende Internetverbindung funktionieren.

Die Sprachausgabe verwendet Italienisch (`it-IT`). Die Spracherkennung hängt im Browser von Gerät, Betriebssystem und Browser ab. Wenn sie auf dem iPhone nicht zuverlässig verfügbar ist, kann stattdessen die italienische Diktierfunktion der Tastatur benutzt werden.

## Was gehört zum Projekt?

- Die Web-App ist der gemeinsame Kern.
- GitHub Pages stellt diesen Kern kostenlos über HTTPS bereit.
- Das iOS-Projekt verpackt die Web-App für Xcode und ein echtes iPhone.
- Das Android-Projekt kann eine installierbare Test-APK erzeugen.
- Die Windows-Verpackung erstellt ein portables Programm.

Die technische Gesamtübersicht und die Projektstruktur stehen in der [README-Datei](../README.md). Hinweise zum iPhone-Test stehen in [IOS-TEST.md](../IOS-TEST.md).
