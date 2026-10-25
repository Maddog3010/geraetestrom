# Gerätestrom für Home Assistant

Zeigt pro Gerät (z. B. Waschmaschine), **woher der Strom kommt**: Solaranlage, Batterie oder Netz. Dazu **Kosten** und **Ersparnis**.

## Vorschau
Die Datei `docs/vorschau.html` im Browser öffnen: Übersicht pro Gerät, Tab „Alle Geräte“ mit drei Karten (Desktop nebeneinander, Mobil untereinander), Sensor- und Preisauswahl. Die Werte dort sind Beispieldaten.

## Funktionen
- Sensoren per Auswahlliste wählen (Gerät, Solar, Batterie, Netz)
- Bezugspreis und Einspeisevergütung wahlweise per **Sensor** oder **manuell**
- Mehrere Geräte möglich (Integration mehrfach hinzufügen)
- Sensoren für Anteile (W), Energie (kWh), Kosten, Ersparnis, Eigenversorgung
- Werte bleiben nach einem Neustart erhalten

## Installation über HACS
1. HACS → ⋮ → **Benutzerdefinierte Repositories**
2. URL dieses Repos eintragen, Kategorie **Integration**
3. „Gerätestrom“ installieren, Home Assistant neu starten
4. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Gerätestrom**

## So wird gerechnet
Die Leistung des Geräts wird anteilig auf Solar, Batterie und Netz verteilt, je nachdem, woher das Haus gerade Strom bezieht. Über die Zeit ergeben sich kWh pro Quelle.
- **Kosten** = Netzbezug × Bezugspreis
- **Ersparnis** = Solar × (Bezugspreis − Einspeisevergütung) + Batterie × Bezugspreis

## Vorzeichen
Erwartet: Batterie positiv beim Entladen, Netz positiv beim Bezug. Bei umgekehrten Sensoren die Optionen „Vorzeichen umkehren“ nutzen.

## Dashboard
`dashboard/geraete.yaml` zeigt drei Geräte (Desktop nebeneinander, Mobil untereinander), `dashboard/geraet.yaml` ein einzelnes Gerät. Die Datei im Dashboard-Rohkonfigurationseditor als Ansicht einfügen. „waschmaschine“ durch den Namen deines Geräts ersetzen. Heute, Monat und Jahr zeigen die Statistik-Grafiken.

## Vor dem Hochladen
`DEIN_GITHUB_NAME` in `custom_components/geraetestrom/manifest.json` ersetzen. Das Repo braucht ein GitHub-Release (z. B. `v1.0.0`), damit HACS die Version erkennt.
