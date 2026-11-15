# Cloud-Synchronisierung

Parola speichert die Wörter weiterhin zuerst lokal unter `parola-v1`. Dadurch bleibt die App auch ohne Internet benutzbar. Wer sich im Bereich **Sicherung** anmeldet, erhält zusätzlich eine persönliche Kopie in Supabase.

## Ablauf für Nutzer

1. In Parola **Sicherung** öffnen.
2. Beim ersten Gerät mit E-Mail-Adresse und einem eigenen Passwort ein kostenloses Konto anlegen.
3. Die Bestätigungs-E-Mail von Supabase öffnen.
4. Danach auf jedem Gerät mit derselben E-Mail-Adresse und demselben Passwort anmelden.

Neue, bearbeitete und gelöschte Wörter sowie der Lernfortschritt werden automatisch abgeglichen. Wenn ein Gerät offline ist, bleiben Änderungen lokal erhalten und werden bei der nächsten Verbindung übertragen. Der manuelle Export bleibt als zusätzliche Sicherung verfügbar.

## Technischer Stand

- Supabase-Projekt: `Parola`
- Region: Frankfurt (`eu-central-1`)
- Projektadresse: `https://uobxilbvszqpelnfvyyt.supabase.co`
- Tabelle: `public.parola_state`
- Datenmodell: eine JSON-Sicherung pro angemeldetem Benutzer
- Schutz: Row Level Security; jeder Benutzer darf nur den Datensatz mit seiner eigenen Benutzer-ID lesen und verändern
- SQL-Migration: `supabase/migrations/20261115103000_create_parola_state.sql`

Im Quellcode steht ausschließlich der öffentliche Supabase-Schlüssel. Dieser ist für Browser-Apps vorgesehen und erhält erst durch eine Benutzeranmeldung und die Datenbankregeln Zugriff. Der geheime Supabase-Schlüssel und das Datenbankpasswort dürfen niemals in das Repository geschrieben werden.

## Konflikte und Offline-Betrieb

Parola führt Wortlisten anhand der Wort-ID zusammen. Bei Änderungen desselben Wortes gewinnt die neuere Änderung. Löschungen werden mit Zeitstempel vorgemerkt, damit ein älterer Stand das Wort nicht wieder zurückbringt. Das vorhandene Sicherungsformat bleibt lesbar; das zusätzliche Feld `deletedWords` ist optional.
