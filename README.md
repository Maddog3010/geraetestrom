# Gerätestrom für Home Assistant

Zeigt pro Gerät (z. B. Waschmaschine, Trockner, Spülmaschine), **woher der Strom kommt**: Solaranlage, Batterie oder Netz. Dazu **Kosten** und **Ersparnis**, pro Durchlauf, heute, im Monat und gesamt.

Vorschau: `docs/vorschau.html` im Browser öffnen (Beispieldaten).

## Funktionen
- Einrichtung per Oberfläche mit Auswahllisten für alle Sensoren, mehrere Geräte möglich
- Eigene Seite **Gerätestrom** in der Seitenleiste: Banner „Heute gespart“, Kacheln für Heute, Monat, Jahr und Gesamt, Karten pro Gerät (Desktop nebeneinander, Mobil untereinander), Verlauf (Heute, 7 Tage, Monat, Jahr, Gesamt) wahlweise für alle oder ein Gerät, Vergleich der Geräte
- **Heute, Monat und Gesamt** für Kosten und Ersparnis
- **Durchläufe** werden automatisch erkannt: Kosten, Energie und Eigenanteil des letzten Durchlaufs sowie Durchschnitt
- **Speicherkosten der Batterie** einstellbar (0 = Batteriestrom gilt als kostenlos)
- **Startempfehlung** („Jetzt starten“, „Teilweise Solar“, „Besser warten“) aus der aktuellen Solarleistung oder einem Solarprognose-Sensor
- **Meldung am Ende eines Durchlaufs** über einen oder mehrere Benachrichtigungsdienste (Auswahlmenü), zusätzlich als Ereignis `geraetestrom_run_finished` für eigene Automationen
- **Verschiebbare Komponenten:** „Anpassen“ in der Seite, dann per Drag & Drop oder Pfeiltasten anordnen, wird pro Benutzer gespeichert
- Beschriftete Balkendiagramme mit Legende, Achsenwerten und Summen
- Bezugspreis und Einspeisevergütung wahlweise per Sensor oder manuell
- Werte bleiben nach einem Neustart erhalten

## Installation über HACS
1. HACS → ⋮ → **Benutzerdefinierte Repositories**
2. `https://github.com/Maddog3010/geraetestrom` eintragen, Kategorie **Integration**
3. „Gerätestrom“ installieren, Home Assistant neu starten
4. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Gerätestrom**

## So wird gerechnet
Die Leistung des Geräts wird anteilig auf Solar, Batterie und Netz verteilt, je nachdem, woher das Haus gerade Strom bezieht. Über die Zeit ergeben sich kWh pro Quelle.
- **Kosten** = Netzbezug × Bezugspreis
- **Ersparnis** = Solar × (Bezugspreis − Einspeisevergütung) + Batterie × (Bezugspreis − Speicherkosten)
- **Durchlauf**: beginnt, wenn die Geräteleistung die Schwelle überschreitet, und endet, wenn sie die eingestellte Zeit darunter bleibt
- **Solardeckung** = freie Solarleistung geteilt durch die typische Geräteleistung des letzten Durchlaufs (Näherung). Frei heißt: Solarleistung (oder Prognose) minus der Solarstrom, den andere Geräte gerade nutzen. Läuft der Trockner schon mit Solarstrom, sinkt die Empfehlung für die Waschmaschine.
- **Mehrere Geräte** laufen unabhängig voneinander mit demselben Hausmix (Anteile statt feste Watt, daher kein doppelt gezählter Solarstrom). Eine Rangfolge gibt es nicht.

## Vorzeichen
Erwartet: Batterie positiv beim Entladen, Netz positiv beim Bezug. Bei umgekehrten Sensoren die Optionen „Vorzeichen umkehren“ nutzen.

## Energie-Dashboard
Die kWh-Sensoren sind für das Energie-Dashboard geeignet: **Einstellungen → Dashboards → Energie → Einzelne Geräte → Gerät hinzufügen** und „Solar-Energie“, „Batterie-Energie“ oder „Netz-Energie“ wählen.

## Eigenes Dashboard (optional)
Statt der Seitenleisten-Seite lässt sich `dashboard/geraete.yaml` (drei Geräte) oder `dashboard/geraet.yaml` (ein Gerät) im Rohkonfigurationseditor eines neuen Dashboards einfügen. Entity-Namen anpassen: `waschmaschine` ist der Gerätename in Kleinbuchstaben, Umlaute werden zu einfachen Buchstaben.

## Änderungen
Siehe [CHANGELOG.md](CHANGELOG.md).

## Entwicklung
`pytest` prüft die Rechenfunktionen (`calc.py`). Der Workflow „Validate“ prüft HACS und hassfest.

## Veröffentlichen
Repository: `https://github.com/Maddog3010/geraetestrom`. Für HACS braucht das Repo ein GitHub-Release (z. B. `v1.4.0`).
