# Changelog

Alle wichtigen Änderungen an Gerätestrom. Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/), Versionierung nach [SemVer](https://semver.org/lang/de/).

## [0.4.4] – 2026-10-25
### Geändert
- **Verlauf:** Die Achsenwerte ganz links und die Summen ganz oben über den Balken entfallen. Die Werte in den Abschnitten und die Beschriftung darunter bleiben
- **Vergleich der Geräte:** Die Beschriftung steht komplett unterhalb der Balken (je Quelle mit Farbpunkt und kWh, dazu die Summe). Die Balken selbst bleiben ohne Text

## [0.4.3] – 2026-10-25
### Geändert
- **Kleine Abschnitte werden trotzdem beschriftet:** Passt der Wert nicht in den Abschnitt, steht er mit farbigem Punkt unter dem Balken (Verlauf bis 12 Balken) bzw. mit Quelle und kWh unter dem Vergleichsbalken. Die Balkenhöhen bleiben dabei maßstabsgetreu

## [0.4.2] – 2026-10-25
### Geändert
- **Balken beschriftet:** Im Verlauf (z. B. „Letzte 7 Tage“) und im Vergleich der Geräte steht in jedem Farbabschnitt seine Energie in kWh. Zu kleine Abschnitte bleiben unbeschriftet (Wert im Tooltip beim Verlauf), im Verlauf nur bei bis zu 12 Balken. Die Gesamtsumme steht weiterhin über dem Balken bzw. am Ende des Vergleichsbalkens

## [0.4.1] – 2026-10-25
### Geändert
- **Vergleich der Geräte:** In den Balken steht nur noch die Summe in kWh, die Zahlen je Quelle in den Abschnitten entfallen (die Legende zeigt weiterhin die Summen je Quelle)
### Behoben
- Gerätenamen im Vergleich werden nicht mehr abgeschnitten: Name und Eigenanteil stehen jetzt über dem Balken

## [0.4.0] – 2026-10-25
### Hinzugefügt
- **Verschiebbare Komponenten:** Mit „Anpassen“ lassen sich Banner, Kacheln, Geräte-Bereich, Verlauf und Vergleich sowie die einzelnen Gerätekarten per Drag & Drop oder mit Pfeiltasten (auch am Handy) neu anordnen. „Zurücksetzen“ stellt die Standardanordnung wieder her. Die Anordnung wird pro Benutzer in Home Assistant gespeichert und gilt auf allen Geräten
- **Mehrere Benachrichtigungsdienste:** In der Einrichtung per Auswahlmenü (Mehrfachauswahl, alle vorhandenen `notify.*`-Dienste, zusätzlich eigene Eingabe möglich)
- **Beschriftungen der Balkendiagramme:** Legende mit Summen je Quelle, Achsenwerte in kWh, Werte über den Balken, Zahlen in den Abschnitten im Gerätevergleich samt Eigenanteil
- Test für die Auswahl der Benachrichtigungsdienste
### Geändert
- Dein GitHub-Name `Maddog3010` ist in `manifest.json`, `LICENSE`, `README.md` und `CHANGELOG.md` eingetragen
- Bestehende Einstellungen mit einem einzelnen Benachrichtigungsdienst funktionieren weiter

## [0.3.0] – 2026-10-25
### Geändert
- **Neues Design der Seitenleisten-Seite** nach Vorbild des „Fenster & Heizung“-Dashboards: Kopfzeile mit Icon und Untertitel, großes Banner mit Farbverlauf („Heute gespart“, Datum, Infokapseln, Illustration), vier Kacheln für Heute, Monat, Jahr und Gesamt, Gerätekarten mit farbigem Icon und Statuszeile
### Hinzugefügt
- Sensoren **Kosten Jahr**, **Ersparnis Jahr**, **Energie Jahr** und **Durchläufe heute**
- Vorschau im neuen Design

## [0.2.1] – 2026-10-25
### Geändert
- Die **Startempfehlung** berücksichtigt andere Geräte: Solarstrom, den andere Geräte gerade nutzen, wird von der freien Solarleistung abgezogen. Das gilt auch mit Solarprognose-Sensor.
- Beim Ein- oder Ausschalten eines Geräts werden die Empfehlungen aller anderen Geräte sofort neu bewertet.
### Hinzugefügt
- Rechenfunktion `free_solar` mit Test
- README: Abschnitt zur Rechnung mit mehreren Geräten

## [0.2.0] – 2026-10-25
### Hinzugefügt
- **Heute und Monat:** neue Sensoren für Kosten, Ersparnis und Energie (heute und Monat), mit `last_reset`, nach Neustart wiederhergestellt
- **Durchläufe:** automatische Erkennung (einstellbare Startschwelle in W und Endzeit in Minuten). Sensoren für Kosten, Energie und Eigenanteil des letzten Durchlaufs, Durchschnittskosten und Anzahl der Durchläufe
- **Speicherkosten der Batterie** (€/kWh) in der Ersparnisrechnung
- **Startempfehlung** („Jetzt starten“, „Teilweise Solar“, „Besser warten“) und Sensor **Solardeckung**, optional mit Solarprognose-Sensor
- **Meldung am Ende eines Durchlaufs** über einen Benachrichtigungsdienst und als Ereignis `geraetestrom_run_finished`
- Seitenleisten-Seite: Zeitraum **Heute**, Auswahl **Alle Geräte oder ein Gerät** für die Verlaufsgrafik, Karte **Vergleich der Geräte**, Tabelle Heute/Monat/Gesamt, Hinweis zur Startempfehlung in jeder Karte
- Neue Optionen in der Einrichtung: Speicherkosten, Prognose-Sensor, Benachrichtigungsdienst, Startschwelle, Endzeit
- `calc.py` mit reinen Rechenfunktionen, Tests (`tests/test_calc.py`), Test-Workflow, MIT-Lizenz, Icon und Logo
- README: Energie-Dashboard, Durchläufe, Empfehlung, Entwicklung
### Geändert
- Rechenlogik in `calc.py` ausgelagert
- Vorschau komplett überarbeitet (`docs/vorschau.html`)

## [0.1.1] – 2026-10-25
### Hinzugefügt
- **Eigene Seite „Gerätestrom“ in der Seitenleiste**, wird automatisch angelegt: Karten pro Gerät (Desktop nebeneinander, Mobil untereinander) und Verlaufsgrafik mit 7 Tage, Monat, Jahr und Gesamt
- Abhängigkeiten `http`, `frontend`, `panel_custom`
- Sensoren tragen Attribute `geraetestrom` und `geraet`, damit die Seite sie findet
### Behoben
- Dashboard-YAML-Dateien enthielten nur die Ansicht. Sie sind jetzt komplette Dashboards mit `views:` und lassen sich im Rohkonfigurationseditor einfügen

## [0.1.0] – 2026-10-25
### Hinzugefügt
- Erste Version als HACS-Integration mit Einrichtung über die Oberfläche
- Verteilung der Geräteleistung auf Solar, Batterie und Netz, Energie in kWh, Kosten, Ersparnis und Eigenversorgung
- Bezugspreis und Einspeisevergütung wahlweise per Sensor oder manuell
- Optionen zum Umkehren der Vorzeichen von Batterie und Netz
- Mehrere Geräte möglich, Werte bleiben nach Neustart erhalten
- Dashboard-Beispiele für ein Gerät und drei Geräte (`dashboard/`)
- Deutsche und englische Texte, GitHub-Workflow für HACS und hassfest
