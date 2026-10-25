"""Rechenkern: verteilt die Geräteleistung anteilig auf Solar, Batterie und Netz."""
from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import *


class Engine:
    def __init__(self, hass: HomeAssistant, entry_id: str, cfg: dict) -> None:
        self.hass, self.cfg = hass, cfg
        self.signal = f"{DOMAIN}_{entry_id}"
        self.w = {"solar": 0.0, "battery": 0.0, "grid": 0.0}  # aktuelle Anteile in W
        self.e = {"solar": 0.0, "battery": 0.0, "grid": 0.0}  # Energie in kWh
        self.cost = self.saved = 0.0
        self.price, self.feed = cfg[CONF_PRICE], cfg[CONF_FEED]
        self.last = dt_util.utcnow()
        self._unsubs: list = []

    # --- Hilfsfunktionen -------------------------------------------------
    def _power(self, entity_id: str) -> float:
        s = self.hass.states.get(entity_id)
        if s is None or s.state in ("unknown", "unavailable"):
            return 0.0
        try:
            v = float(s.state)
        except ValueError:
            return 0.0
        return v * 1000 if s.attributes.get("unit_of_measurement") == "kW" else v

    def _rate(self, ent_key: str, manual_key: str) -> float:
        """Preis aus Sensor, sonst manueller Wert."""
        eid = self.cfg.get(ent_key)
        if eid and (s := self.hass.states.get(eid)):
            try:
                return float(s.state)
            except ValueError:
                pass
        return self.cfg[manual_key]

    # --- Berechnung ------------------------------------------------------
    def _acc(self) -> None:
        now = dt_util.utcnow()
        h = (now - self.last).total_seconds() / 3600
        self.last = now
        for k, watts in self.w.items():
            d = watts * h / 1000
            self.e[k] += d
            if k == "grid":
                self.cost += d * self.price
            elif k == "solar":
                self.saved += d * (self.price - self.feed)
            else:
                self.saved += d * self.price

    def _calc(self) -> None:
        g = max(self._power(self.cfg[CONF_DEVICE]), 0)
        s = max(self._power(self.cfg[CONF_SOLAR]), 0)
        b = self._power(self.cfg[CONF_BATTERY]) * (-1 if self.cfg.get(CONF_BAT_INV) else 1)
        n = self._power(self.cfg[CONF_GRID]) * (-1 if self.cfg.get(CONF_GRID_INV) else 1)
        b, n = max(b, 0), max(n, 0)
        t = s + b + n
        self.w = (
            {"solar": g * s / t, "battery": g * b / t, "grid": g * n / t}
            if t > 0 else {"solar": 0.0, "battery": 0.0, "grid": g}
        )
        self.price = self._rate(CONF_PRICE_ENT, CONF_PRICE)
        self.feed = self._rate(CONF_FEED_ENT, CONF_FEED)

    @property
    def self_supply(self) -> float:
        t = sum(self.e.values())
        return 100 * (self.e["solar"] + self.e["battery"]) / t if t > 0 else 0.0

    def restore(self, kind: str, key: str | None, value: float) -> None:
        if kind == "e":
            self.e[key] = value
        else:
            setattr(self, kind, value)

    # --- Lebenszyklus ----------------------------------------------------
    @callback
    def _on(self, *_) -> None:
        self._acc()
        self._calc()
        async_dispatcher_send(self.hass, self.signal)

    def start(self) -> None:
        ids = [self.cfg[k] for k in (CONF_DEVICE, CONF_SOLAR, CONF_BATTERY, CONF_GRID)]
        ids += [self.cfg[k] for k in OPTIONAL_ENTITIES if self.cfg.get(k)]
        self.last = dt_util.utcnow()
        self._calc()
        self._unsubs = [
            async_track_state_change_event(self.hass, ids, self._on),
            async_track_time_interval(self.hass, self._on, timedelta(seconds=60)),
        ]
        async_dispatcher_send(self.hass, self.signal)

    def stop(self) -> None:
        for u in self._unsubs:
            u()
        self._unsubs = []
