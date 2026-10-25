"""Sensoren: Anteile (W), Energie (kWh), Kosten, Ersparnis, Eigenversorgung."""
from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass as DC, SensorEntity, SensorStateClass as SC
from homeassistant.const import PERCENTAGE, UnitOfEnergy, UnitOfPower
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN

W, KWH, EUR = UnitOfPower.WATT, UnitOfEnergy.KILO_WATT_HOUR, "EUR"
M, TI, T = SC.MEASUREMENT, SC.TOTAL_INCREASING, SC.TOTAL

# key, Name, Einheit, Geräteklasse, Statusklasse, Wert, Wiederherstellung
SENSORS = [
    ("solar_w", "Solar-Anteil", W, DC.POWER, M, lambda e: e.w["solar"], None),
    ("battery_w", "Batterie-Anteil", W, DC.POWER, M, lambda e: e.w["battery"], None),
    ("grid_w", "Netz-Anteil", W, DC.POWER, M, lambda e: e.w["grid"], None),
    ("solar_kwh", "Solar-Energie", KWH, DC.ENERGY, TI, lambda e: e.e["solar"], ("e", "solar")),
    ("battery_kwh", "Batterie-Energie", KWH, DC.ENERGY, TI, lambda e: e.e["battery"], ("e", "battery")),
    ("grid_kwh", "Netz-Energie", KWH, DC.ENERGY, TI, lambda e: e.e["grid"], ("e", "grid")),
    ("cost", "Kosten", EUR, DC.MONETARY, T, lambda e: e.cost, ("cost", None)),
    ("saved", "Ersparnis", EUR, DC.MONETARY, T, lambda e: e.saved, ("saved", None)),
    ("self", "Eigenversorgung", PERCENTAGE, None, M, lambda e: e.self_supply, None),
]


async def async_setup_entry(hass, entry, async_add_entities):
    eng = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(GSensor(entry, eng, *d) for d in SENSORS)
    eng.start()


class GSensor(RestoreEntity, SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, entry, eng, key, name, unit, dc, sc, fn, rst) -> None:
        self._eng, self._fn, self._rst = eng, fn, rst
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_name = name
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = dc
        self._attr_state_class = sc
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)}, name=entry.title)

    async def async_added_to_hass(self) -> None:
        if self._rst and (last := await self.async_get_last_state()):
            try:
                self._eng.restore(*self._rst, float(last.state))
            except ValueError:
                pass
        self.async_on_remove(
            async_dispatcher_connect(self.hass, self._eng.signal, self.async_write_ha_state)
        )

    @property
    def native_value(self) -> float:
        return round(self._fn(self._eng), 3)
