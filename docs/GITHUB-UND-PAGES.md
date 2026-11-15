# GitHub und GitHub Pages

Stand: 15. November 2026

## Wo liegt Parola auf GitHub?

- GitHub-Benutzer: `dpack1989`
- Repository: `parola`
- Vollständiger Name: `dpack1989/parola`
- Repository-Adresse: <https://github.com/dpack1989/parola>
- Hauptzweig: `main`
- Sichtbarkeit: öffentlich

Ein **Repository** ist der Projektordner auf GitHub. Dort liegen der Quellcode, die Dokumentation und die bisherigen Änderungen von Parola. „Öffentlich“ bedeutet, dass andere den Quellcode ansehen können. Die persönlichen Vokabeln der Nutzer werden dadurch nicht veröffentlicht: Sie bleiben im jeweiligen Browser oder in der App gespeichert und gehören nicht zum Repository.

## Was ist GitHub Pages?

GitHub Pages ist der kostenlose Webserver von GitHub. Er macht die Dateien aus dem Repository als normale HTTPS-Webseite erreichbar. Für Parola ist das die direkt nutzbare Web-App:

<https://dpack1989.github.io/parola/>

Kurz gesagt:

1. GitHub bewahrt das Projekt auf.
2. GitHub Pages veröffentlicht daraus die Web-App.
3. Die Adresse beginnt automatisch mit dem GitHub-Benutzernamen und endet mit dem Repository-Namen: `dpack1989.github.io/parola`.

## Wie ist die Veröffentlichung eingerichtet?

Parola wird aus dem Hauptzweig `main` veröffentlicht. Die Webdateien liegen direkt im obersten Ordner des Repositorys; dort befindet sich auch `index.html`, die Startseite der App. Eine separate Pages-Workflow-Datei ist nicht nötig.

Der Ablauf ist:

1. Änderungen werden lokal am Projekt vorgenommen.
2. Ein bestätigter Stand wird zu GitHub in den Zweig `main` hochgeladen.
3. GitHub Pages startet automatisch den Vorgang **pages build and deployment**.
4. Nach kurzer Zeit ist der neue Stand über die Web-App-Adresse erreichbar.

Der aktuelle Stand wurde online geprüft: GitHub Pages ist aktiv, die Web-App antwortet über HTTPS, und die Veröffentlichungen beziehen sich auf `main`.

Die Einstellung lässt sich als angemeldeter Besitzer hier kontrollieren:

- Repository öffnen: <https://github.com/dpack1989/parola>
- **Settings** wählen
- links **Pages** öffnen
- unter **Build and deployment** sollte die Veröffentlichung aus einem Zweig mit `main` und dem Stammordner `/(root)` stehen

Die bisherigen automatischen Vorgänge sind unter **Actions** sichtbar: <https://github.com/dpack1989/parola/actions>

## Was passiert bei einer neuen Änderung?

Eine Änderung auf dem Computer ist noch nicht automatisch online. Erst wenn sie in Git festgehalten und zu GitHub hochgeladen wurde, kann GitHub Pages sie veröffentlichen. Die Veröffentlichung dauert gewöhnlich etwas länger als das Hochladen selbst.

Auf einem iPhone kann zusätzlich noch eine ältere Offline-Version im Zwischenspeicher liegen. Dann die App vollständig schließen und erneut öffnen. Wenn Dateien des Offline-Caches geändert werden, muss außerdem die Cache-Version in `sw.js` erhöht werden.

## Welches Konto wird verwendet?

Sicher bestätigt ist:

- Das Repository gehört zum GitHub-Konto `dpack1989`.
- Git verwendet die geschützte GitHub-Adresse `dpack1989@users.noreply.github.com`. Diese Adresse verrät nicht, welche private E-Mail-Adresse hinter dem Konto liegt.

Noch **nicht bestätigt** ist, ob die Anmeldung bei GitHub mit einer Apple-ID verknüpft ist. GitHub und die Apple-ID sind grundsätzlich getrennte Konten. Selbst wenn beim Anlegen oder Anmelden eine Apple-Adresse verwendet wurde, bleibt der GitHub-Benutzername `dpack1989` maßgeblich.

So lässt sich die Verbindung später sicher prüfen, ohne private Daten in diese Dokumentation zu schreiben:

1. Bei GitHub anmelden und oben rechts das Profilbild öffnen.
2. **Settings → Emails** aufrufen und die hinterlegten Adressen prüfen.
3. **Settings → Password and authentication** öffnen und die eingerichteten Anmeldearten prüfen.

Eine Adresse mit `privaterelay.appleid.com` wäre ein Hinweis auf **E-Mail-Adresse verbergen** von Apple. Eine normale iCloud-Adresse wäre ebenfalls ein Hinweis auf eine Apple-Adresse, beweist aber allein noch keine besondere Konto-Verknüpfung.

## Merksatz

**GitHub-Konto:** `dpack1989`  
**Projekt:** `parola`  
**Web-App:** <https://dpack1989.github.io/parola/>  
**Technik:** GitHub Pages veröffentlicht automatisch den Stand von `main` über HTTPS.
