"""Rechenkern: Anteile, Energie, Kosten, Perioden, Durchläufe, Empfehlung."""
from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .calc import SOURCES, advice, cover_pct, free_solar, money, normalize_services, split_power
from .const import *

DEFAULT_TYPICAL_W = 1500.0
PERIODS = ("day", "month", "year")


def _blank() -> dict:
    return {"cost": 0.0, "saved": 0.0, "kwh": 0.0, "runs": 0.0}


class Engine:
    def __init__(self, hass: HomeAssistant, entry_id: str, cfg: dict) -> None:
        self.hass, self.cfg = hass, cfg
        self.name = cfg.get(CONF_NAME, "Gerät")
        self.signal = f"{DOMAIN}_{entry_id}"
        self.w = {k: 0.0 for k in SOURCES}
        self.e = {k: 0.0 for k in SOURCES}
        self.cost = self.saved = 0.0
        self.price, self.feed = cfg[CONF_PRICE], cfg[CONF_FEED]
        self.bat_cost = float(cfg.get(CONF_BAT_COST) or 0.0)
        self.thr = float(cfg.get(CONF_RUN_W) or 20)
        self.end_s = float(cfg.get(CONF_RUN_MIN) or 5) * 60
        self.g = 0.0
        self.cover = 0.0
        self._est = 0.0
        self.run: dict | None = None
        self.idle = None
        self.runs = 0
        self.avg_cost = self.last_cost = self.last_kwh = self.last_share = self.last_w = 0.0
        self.pk = {k: self._key(k) for k in PERIODS}
        self.pv = {k: _blank() for k in PERIODS}
        self.last = dt_util.utcnow()
        self._unsubs: list = []

    # --- Hilfsfunktionen -------------------------------------------------
    def _power(self, entity_id: str | None) -> float:
        s = self.hass.states.get(entity_id) if entity_id else None
        if s is None or s.state in ("unknown", "unavailable"):
            return 0.0
        try:
            v = float(s.state)
        except ValueError:
            return 0.0
        return v * 1000 if s.attributes.get("unit_of_measurement") == "kW" else v

    def _rate(self, ent_key: str, manual_key: str) -> float:
        eid = self.cfg.get(ent_key)
        if eid and (s := self.hass.states.get(eid)):
            try:
                return float(s.state)
            except ValueError:
                pass
        return self.cfg[manual_key]

    def _key(self, kind: str) -> str:
        n = dt_util.now()
        return {"day": n.date().isoformat(), "month": n.strftime("%Y-%m"), "year": n.strftime("%Y")}[kind]

    def period_start(self, kind: str):
        d = dt_util.start_of_local_day()
        if kind == "day":
            return d
        return d.replace(day=1) if kind == "month" else d.replace(month=1, day=1)

    def _roll(self) -> None:
        for k in PERIODS:
            key = self._key(k)
            if key != self.pk[k]:
                self.pk[k] = key
                self.pv[k] = _blank()

    # --- Berechnung ------------------------------------------------------
    def _acc(self) -> None:
        now = dt_util.utcnow()
        h = (now - self.last).total_seconds() / 3600
        self.last = now
        self._roll()
        for k, watts in self.w.items():
            d = watts * h / 1000
            dc, ds = money(d, k, self.price, self.feed, self.bat_cost)
            self.e[k] += d
            self.cost += dc
            self.saved += ds
            for p in self.pv.values():
                p["cost"] += dc
                p["saved"] += ds
                p["kwh"] += d
            if self.run:
                self.run["e"][k] += d
                self.run["cost"] += dc
                self.run["saved"] += ds

    def _calc(self) -> None:
        self.g = max(self._power(self.cfg[CONF_DEVICE]), 0)
        s = self._power(self.cfg[CONF_SOLAR])
        b = self._power(self.cfg[CONF_BATTERY]) * (-1 if self.cfg.get(CONF_BAT_INV) else 1)
        n = self._power(self.cfg[CONF_GRID]) * (-1 if self.cfg.get(CONF_GRID_INV) else 1)
        self.w = split_power(self.g, s, b, n)
        self.price = self._rate(CONF_PRICE_ENT, CONF_PRICE)
        self.feed = self._rate(CONF_FEED_ENT, CONF_FEED)
        self._est = self._power(self.cfg[CONF_FORECAST]) if self.cfg.get(CONF_FORECAST) else max(s, 0)
        self._update_cover()

    def _peers(self) -> list["Engine"]:
        """Andere eingerichtete Geräte (für die gemeinsame Solarrechnung)."""
        return [p for p in self.hass.data.get(DOMAIN, {}).values() if isinstance(p, Engine) and p is not self]

    def _update_cover(self) -> None:
        """Solardeckung nach Abzug des Solarstroms, den andere Geräte gerade nutzen."""
        others = sum(p.w["solar"] for p in self._peers())
        self.cover = cover_pct(free_solar(self._est, others), self.last_w or DEFAULT_TYPICAL_W)

    @property
    def advice(self) -> str:
        return advice(self.cover)

    @property
    def self_supply(self) -> float:
        t = sum(self.e.values())
        return 100 * (self.e["solar"] + self.e["battery"]) / t if t > 0 else 0.0

    # --- Durchläufe ------------------------------------------------------
    def _run_step(self, now) -> None:
        if self.run is None:
            if self.g >= self.thr:
                self.run = {"start": now, "e": {k: 0.0 for k in SOURCES}, "cost": 0.0, "saved": 0.0}
                self.idle = None
        elif self.g >= self.thr:
            self.idle = None
        elif self.idle is None:
            self.idle = now
        elif (now - self.idle).total_seconds() >= self.end_s:
            self._finish(self.idle)

    def _finish(self, end) -> None:
        r, self.run, self.idle = self.run, None, None
        kwh = sum(r["e"].values())
        if kwh < 0.01:
            return
        share = 100 * (r["e"]["solar"] + r["e"]["battery"]) / kwh
        hours = max((end - r["start"]).total_seconds() / 3600, 1e-6)
        self.runs += 1
        for p in self.pv.values():
            p["runs"] += 1
        self.avg_cost += (r["cost"] - self.avg_cost) / self.runs
        self.last_cost, self.last_kwh, self.last_share = r["cost"], kwh, share
        self.last_w = kwh * 1000 / hours
        data = {
            "geraet": self.name, "kwh": round(kwh, 3), "kosten": round(r["cost"], 3),
            "ersparnis": round(r["saved"], 3), "eigenanteil": round(share, 1),
            "dauer_min": round(hours * 60),
        }
        self.hass.bus.async_fire(EVENT_RUN, data)
        msg = (f"{kwh:.2f} kWh · {r['cost']:.2f} € · {share:.0f} % eigener Strom "
               f"(gespart: {r['saved']:.2f} €)".replace(".", ","))
        for domain, name in normalize_services(self.cfg.get(CONF_NOTIFY)):
            self.hass.async_create_task(self.hass.services.async_call(
                domain, name, {"title": f"{self.name} fertig", "message": msg}))

    # --- Wiederherstellung -----------------------------------------------
    def restore(self, kind: str, key: str, value: float) -> None:
        if kind == "e":
            self.e[key] = value
        else:
            setattr(self, key, int(value) if key == "runs" else value)

    def restore_period(self, kind: str, field: str, value: float, key) -> None:
        if key == self.pk[kind]:
            self.pv[kind][field] = value

    # --- Lebenszyklus ----------------------------------------------------
    @callback
    def _on(self, *_) -> None:
        self._acc()
        self._calc()
        self._run_step(dt_util.utcnow())
        for p in self._peers():  # andere Geräte neu bewerten
            p._update_cover()
            async_dispatcher_send(self.hass, p.signal)
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
