# Changelog

Alle wichtigen Änderungen an Gerätestrom. Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/), Versionierung nach [SemVer](https://semver.org/lang/de/).

## [1.3.0] – 2026-10-25
### Geändert
- **Neues Design der Seitenleisten-Seite** nach Vorbild des „Fenster & Heizung“-Dashboards: Kopfzeile mit Icon und Untertitel, großes Banner mit Farbverlauf („Heute gespart“, Datum, Infokapseln, Illustration), vier Kacheln für Heute, Monat, Jahr und Gesamt, Gerätekarten mit farbigem Icon und Statuszeile
### Hinzugefügt
- Sensoren **Kosten Jahr**, **Ersparnis Jahr**, **Energie Jahr** und **Durchläufe heute**
- Vorschau im neuen Design

## [1.2.1] – 2026-10-25
### Geändert
- Die **Startempfehlung** berücksichtigt andere Geräte: Solarstrom, den andere Geräte gerade nutzen, wird von der freien Solarleistung abgezogen. Das gilt auch mit Solarprognose-Sensor.
- Beim Ein- oder Ausschalten eines Geräts werden die Empfehlungen aller anderen Geräte sofort neu bewertet.
### Hinzugefügt
- Rechenfunktion `free_solar` mit Test
- README: Abschnitt zur Rechnung mit mehreren Geräten

## [1.2.0] – 2026-10-25
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

## [1.1.0] – 2026-10-25
### Hinzugefügt
- **Eigene Seite „Gerätestrom“ in der Seitenleiste**, wird automatisch angelegt: Karten pro Gerät (Desktop nebeneinander, Mobil untereinander) und Verlaufsgrafik mit 7 Tage, Monat, Jahr und Gesamt
- Abhängigkeiten `http`, `frontend`, `panel_custom`
- Sensoren tragen Attribute `geraetestrom` und `geraet`, damit die Seite sie findet
### Behoben
- Dashboard-YAML-Dateien enthielten nur die Ansicht. Sie sind jetzt komplette Dashboards mit `views:` und lassen sich im Rohkonfigurationseditor einfügen

## [1.0.0] – 2026-10-25
### Hinzugefügt
- Erste Version als HACS-Integration mit Einrichtung über die Oberfläche
- Verteilung der Geräteleistung auf Solar, Batterie und Netz, Energie in kWh, Kosten, Ersparnis und Eigenversorgung
- Bezugspreis und Einspeisevergütung wahlweise per Sensor oder manuell
- Optionen zum Umkehren der Vorzeichen von Batterie und Netz
- Mehrere Geräte möglich, Werte bleiben nach Neustart erhalten
- Dashboard-Beispiele für ein Gerät und drei Geräte (`dashboard/`)
- Deutsche und englische Texte, GitHub-Workflow für HACS und hassfest
