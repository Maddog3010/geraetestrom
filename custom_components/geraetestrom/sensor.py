"""Sensoren pro Gerät."""
from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass as DC, SensorEntity, SensorStateClass as SC
from homeassistant.const import PERCENTAGE, UnitOfEnergy, UnitOfPower
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN

W, KWH, EUR = UnitOfPower.WATT, UnitOfEnergy.KILO_WATT_HOUR, "EUR"
M, TI, T = SC.MEASUREMENT, SC.TOTAL_INCREASING, SC.TOTAL
PCT = PERCENTAGE

# key, Name, Einheit, Geräteklasse, Statusklasse, Wert, Wiederherstellung, Periode (für last_reset)
SENSORS = [
    ("solar_w", "Solar-Anteil", W, DC.POWER, M, lambda e: e.w["solar"], None, None),
    ("battery_w", "Batterie-Anteil", W, DC.POWER, M, lambda e: e.w["battery"], None, None),
    ("grid_w", "Netz-Anteil", W, DC.POWER, M, lambda e: e.w["grid"], None, None),
    ("solar_kwh", "Solar-Energie", KWH, DC.ENERGY, TI, lambda e: e.e["solar"], ("e", "solar"), None),
    ("battery_kwh", "Batterie-Energie", KWH, DC.ENERGY, TI, lambda e: e.e["battery"], ("e", "battery"), None),
    ("grid_kwh", "Netz-Energie", KWH, DC.ENERGY, TI, lambda e: e.e["grid"], ("e", "grid"), None),
    ("cost", "Kosten", EUR, DC.MONETARY, T, lambda e: e.cost, ("a", "cost"), None),
    ("saved", "Ersparnis", EUR, DC.MONETARY, T, lambda e: e.saved, ("a", "saved"), None),
    ("self", "Eigenversorgung", PCT, None, M, lambda e: e.self_supply, None, None),
    ("cost_day", "Kosten heute", EUR, DC.MONETARY, T, lambda e: e.pv["day"]["cost"], ("p", "day", "cost"), "day"),
    ("saved_day", "Ersparnis heute", EUR, DC.MONETARY, T, lambda e: e.pv["day"]["saved"], ("p", "day", "saved"), "day"),
    ("kwh_day", "Energie heute", KWH, DC.ENERGY, T, lambda e: e.pv["day"]["kwh"], ("p", "day", "kwh"), "day"),
    ("cost_month", "Kosten Monat", EUR, DC.MONETARY, T, lambda e: e.pv["month"]["cost"], ("p", "month", "cost"), "month"),
    ("saved_month", "Ersparnis Monat", EUR, DC.MONETARY, T, lambda e: e.pv["month"]["saved"], ("p", "month", "saved"), "month"),
    ("kwh_month", "Energie Monat", KWH, DC.ENERGY, T, lambda e: e.pv["month"]["kwh"], ("p", "month", "kwh"), "month"),
    ("cost_year", "Kosten Jahr", EUR, DC.MONETARY, T, lambda e: e.pv["year"]["cost"], ("p", "year", "cost"), "year"),
    ("saved_year", "Ersparnis Jahr", EUR, DC.MONETARY, T, lambda e: e.pv["year"]["saved"], ("p", "year", "saved"), "year"),
    ("kwh_year", "Energie Jahr", KWH, DC.ENERGY, T, lambda e: e.pv["year"]["kwh"], ("p", "year", "kwh"), "year"),
    ("runs_day", "Durchläufe heute", None, None, T, lambda e: e.pv["day"]["runs"], ("p", "day", "runs"), "day"),
    ("last_cost", "Letzter Durchlauf Kosten", EUR, None, M, lambda e: e.last_cost, ("a", "last_cost"), None),
    ("last_kwh", "Letzter Durchlauf Energie", KWH, None, M, lambda e: e.last_kwh, ("a", "last_kwh"), None),
    ("last_share", "Letzter Durchlauf Eigenanteil", PCT, None, M, lambda e: e.last_share, ("a", "last_share"), None),
    ("avg_cost", "Durchschnittskosten pro Durchlauf", EUR, None, M, lambda e: e.avg_cost, ("a", "avg_cost"), None),
    ("runs", "Durchläufe", None, None, TI, lambda e: float(e.runs), ("a", "runs"), None),
    ("cover", "Solardeckung", PCT, None, M, lambda e: e.cover, None, None),
    ("advice", "Startempfehlung", None, None, None, lambda e: e.advice, None, None),
]


async def async_setup_entry(hass, entry, async_add_entities):
    eng = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(GSensor(entry, eng, *d) for d in SENSORS)
    eng.start()


class GSensor(RestoreEntity, SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, entry, eng, key, name, unit, dc, sc, fn, rst, lr) -> None:
        self._eng, self._fn, self._rst, self._lr, self._key = eng, fn, rst, lr, key
        self._title = entry.title
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_name = name
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = dc
        self._attr_state_class = sc
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)}, name=entry.title)

    @property
    def extra_state_attributes(self) -> dict:
        a = {"geraetestrom": self._key, "geraet": self._title}
        if self._lr:
            a["periode"] = self._eng.pk[self._lr]
        return a

    @property
    def last_reset(self):
        return self._eng.period_start(self._lr) if self._lr else None

    async def async_added_to_hass(self) -> None:
        if self._rst and (last := await self.async_get_last_state()):
            try:
                v = float(last.state)
                if self._rst[0] == "p":
                    self._eng.restore_period(self._rst[1], self._rst[2], v, last.attributes.get("periode"))
                else:
                    self._eng.restore(*self._rst, v)
            except ValueError:
                pass
        self.async_on_remove(
            async_dispatcher_connect(self.hass, self._eng.signal, self.async_write_ha_state)
        )

    @property
    def native_value(self):
        v = self._fn(self._eng)
        return round(v, 3) if isinstance(v, float) else v
