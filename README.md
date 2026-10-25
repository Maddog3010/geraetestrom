<p align="center">
  <img src="https://raw.githubusercontent.com/Maddog3010/geraetestrom/main/docs/images/banner.png" alt="Gerätestrom für Home Assistant" width="100%">
</p>

# Gerätestrom für Home Assistant

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz)
[![Release](https://img.shields.io/github/v/release/Maddog3010/geraetestrom)](https://github.com/Maddog3010/geraetestrom/releases)
[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-green.svg)](LICENSE)

[![In HACS öffnen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Maddog3010&repository=geraetestrom&category=integration)

Zeigt pro Gerät (Waschmaschine, Trockner, Spülmaschine …), **woher der Strom kommt**: Solaranlage, Batterie oder Netz. Dazu **Kosten** und **Ersparnis**, pro Durchlauf, heute, im Monat und gesamt.

## Vorschau

<p align="center"><img src="https://raw.githubusercontent.com/Maddog3010/geraetestrom/main/docs/images/uebersicht.png" alt="Übersicht mit Banner, Kacheln und Gerätekarten" width="100%"></p>
<p align="center"><em>Übersicht: Heute gespart, Kacheln für Heute, Monat, Jahr und Gesamt, eine Karte pro Gerät</em></p>

<p align="center"><img src="https://raw.githubusercontent.com/Maddog3010/geraetestrom/main/docs/images/verlauf.png" alt="Verlauf und Vergleich der Geräte" width="100%"></p>
<p align="center"><em>Verlauf der letzten 7 Tage und Vergleich der Geräte, beschriftet nach Solar, Batterie und Netz</em></p>

<p align="center"><img src="https://raw.githubusercontent.com/Maddog3010/geraetestrom/main/docs/images/einrichtung.png" alt="Einrichtung mit Sensorauswahl" width="100%"></p>
<p align="center"><em>Einrichtung per Oberfläche mit Auswahllisten für alle Sensoren</em></p>

> Die Bilder zeigen Beispieldaten.

## Funktionen
- Einrichtung per Oberfläche mit Auswahllisten für alle Sensoren, mehrere Geräte möglich
- **Erste und zweite Solarleistung** (z. B. zwei Wechselrichter), **Batterie-Entladung und -Ladung** sowie **Netzbezug und Netzeinspeisung**
- Eigene Seite **Gerätestrom** in der Seitenleiste: Banner „Heute gespart“, Kacheln für Heute, Monat, Jahr und Gesamt, Karten pro Gerät (Desktop nebeneinander, Mobil untereinander), Verlauf (Heute, 7 Tage, Monat, Jahr, Gesamt) für alle oder ein Gerät, Vergleich der Geräte
- **Verschiebbare Komponenten:** „Anpassen“, dann per Drag & Drop oder Pfeiltasten anordnen, wird pro Benutzer gespeichert
- **Heute, Monat und Gesamt** für Kosten und Ersparnis
- **Durchläufe** werden automatisch erkannt: Kosten, Energie und Eigenanteil des letzten Durchlaufs sowie Durchschnitt
- **Speicherkosten der Batterie** einstellbar (0 = Batteriestrom gilt als kostenlos)
- **Startempfehlung** („Jetzt starten“, „Teilweise Solar“, „Besser warten“) aus der Solarleistung oder einem Prognose-Sensor, unter Berücksichtigung anderer laufender Geräte
- **Meldung am Ende eines Durchlaufs** über einen oder mehrere Benachrichtigungsdienste (Auswahlmenü), zusätzlich als Ereignis `geraetestrom_run_finished`
- Bezugspreis und Einspeisevergütung wahlweise per Sensor oder manuell
- Werte bleiben nach einem Neustart erhalten

## Installation über HACS
1. Auf den Knopf **In HACS öffnen** klicken, oder in HACS → ⋮ → **Benutzerdefinierte Repositories** die URL `https://github.com/Maddog3010/geraetestrom` mit Kategorie **Integration** eintragen
2. „Gerätestrom“ installieren und Home Assistant neu starten
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Gerätestrom**

## Sensoren auswählen
| Feld | Bedeutung |
| --- | --- |
| Leistungssensor des Geräts | Steckdose oder Zähler des Geräts in W |
| Solar-Leistung fürs Haus | Erster Solarsensor in W |
| Zweite Solarleistung (optional) | Wird zur ersten addiert |
| Batterie-Entladeleistung | positiv beim Entladen |
| Batterie-Ladeleistung (optional) | nur nötig, wenn die Solarsensoren die Gesamterzeugung melden |
| Netzbezug | positiv beim Bezug |
| Netzeinspeisung (optional) | nur nötig, wenn die Solarsensoren die Gesamterzeugung melden. Ohne Sensor werden negative Werte des Netz-Sensors als Einspeisung genutzt |
| Solarsensoren melden die Gesamterzeugung | Zieht Batterie-Ladeleistung und Einspeisung ab, damit nur der Solarstrom fürs Haus zählt |

Beispiel: 1.800 W + 900 W Solar, 600 W Batterie lädt, 200 W Einspeisung ergeben 1.900 W Solarstrom fürs Haus. Der Wert steht auch als Sensor „Solarleistung fürs Haus“ zur Verfügung.

## So wird gerechnet
Die Leistung des Geräts wird anteilig auf Solar, Batterie und Netz verteilt, je nachdem, woher das Haus gerade Strom bezieht. Über die Zeit ergeben sich kWh pro Quelle.
- **Kosten** = Netzbezug × Bezugspreis
- **Ersparnis** = Solar × (Bezugspreis − Einspeisevergütung) + Batterie × (Bezugspreis − Speicherkosten)
- **Durchlauf**: beginnt, wenn die Geräteleistung die Schwelle überschreitet, und endet, wenn sie die eingestellte Zeit darunter bleibt
- **Solardeckung** = freie Solarleistung geteilt durch die typische Geräteleistung des letzten Durchlaufs (Näherung). Frei heißt: Solarleistung (oder Prognose) minus der Solarstrom, den andere Geräte gerade nutzen
- **Mehrere Geräte** laufen unabhängig voneinander mit demselben Hausmix (Anteile statt feste Watt, daher kein doppelt gezählter Solarstrom). Eine Rangfolge gibt es nicht

## Vorzeichen
Erwartet: Batterie positiv beim Entladen, Netz positiv beim Bezug. Bei umgekehrten Sensoren die Optionen „Vorzeichen umkehren“ nutzen.

## Energie-Dashboard
Die kWh-Sensoren sind für das Energie-Dashboard geeignet: **Einstellungen → Dashboards → Energie → Einzelne Geräte → Gerät hinzufügen** und „Solar-Energie“, „Batterie-Energie“ oder „Netz-Energie“ wählen.

## Eigenes Dashboard (optional)
Statt der Seitenleisten-Seite lässt sich `dashboard/geraete.yaml` (drei Geräte) oder `dashboard/geraet.yaml` (ein Gerät) im Rohkonfigurationseditor eines neuen Dashboards einfügen. Entity-Namen anpassen: `waschmaschine` ist der Gerätename in Kleinbuchstaben, Umlaute werden zu einfachen Buchstaben.

## Weitersagen
Gefällt dir das Projekt? Teile es gern. Banner und Beitragstext liegen in `docs/images/social-banner.png` und [docs/social-post.md](docs/social-post.md).

## Änderungen
Siehe [CHANGELOG.md](CHANGELOG.md).

## Entwicklung
`pytest` prüft die Rechenfunktionen (`calc.py`). Der Workflow „Validate“ prüft HACS und hassfest.

## Veröffentlichen
Repository: `https://github.com/Maddog3010/geraetestrom`. Für HACS braucht das Repo ein GitHub-Release (z. B. `v1.5.0`). Das Vorschaubild für Links (Settings → General → Social preview) ist `docs/images/social-banner.png`.
