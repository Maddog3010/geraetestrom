"""Einrichtung per UI: Sensoren wählen, Preise per Sensor oder manuell."""
from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import *


def _schema(d: dict, with_name: bool) -> vol.Schema:
    ent = selector.EntitySelector(selector.EntitySelectorConfig(domain="sensor"))
    num = selector.NumberSelector(selector.NumberSelectorConfig(
        min=0, max=2, step=0.001, mode=selector.NumberSelectorMode.BOX, unit_of_measurement="€/kWh"))
    sug = lambda k: {"suggested_value": d.get(k)}
    s: dict = {}
    if with_name:
        s[vol.Required(CONF_NAME, default="Waschmaschine")] = str
    for k in (CONF_DEVICE, CONF_SOLAR, CONF_BATTERY, CONF_GRID):
        s[vol.Required(k, description=sug(k))] = ent
    s[vol.Optional(CONF_BAT_INV, default=d.get(CONF_BAT_INV, False))] = bool
    s[vol.Optional(CONF_GRID_INV, default=d.get(CONF_GRID_INV, False))] = bool
    s[vol.Optional(CONF_PRICE_ENT, description=sug(CONF_PRICE_ENT))] = ent
    s[vol.Required(CONF_PRICE, default=d.get(CONF_PRICE, 0.32))] = num
    s[vol.Optional(CONF_FEED_ENT, description=sug(CONF_FEED_ENT))] = ent
    s[vol.Required(CONF_FEED, default=d.get(CONF_FEED, 0.08))] = num
    s[vol.Required(CONF_BAT_COST, default=d.get(CONF_BAT_COST, 0.0))] = num
    s[vol.Optional(CONF_FORECAST, description=sug(CONF_FORECAST))] = ent
    s[vol.Optional(CONF_NOTIFY, description=sug(CONF_NOTIFY))] = str
    s[vol.Required(CONF_RUN_W, default=d.get(CONF_RUN_W, 20))] = selector.NumberSelector(
        selector.NumberSelectorConfig(min=1, max=500, step=1, mode=selector.NumberSelectorMode.BOX, unit_of_measurement="W"))
    s[vol.Required(CONF_RUN_MIN, default=d.get(CONF_RUN_MIN, 5))] = selector.NumberSelector(
        selector.NumberSelectorConfig(min=1, max=120, step=1, mode=selector.NumberSelectorMode.BOX, unit_of_measurement="min"))
    return vol.Schema(s)


class GeraetFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title=user_input[CONF_NAME], data=user_input)
        return self.async_show_form(step_id="user", data_schema=_schema({}, True))

    @staticmethod
    @callback
    def async_get_options_flow(entry):
        return GeraetOptions()


class GeraetOptions(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        d = {**self.config_entry.data, **self.config_entry.options}
        if user_input is not None:
            for k in OPTIONAL_KEYS:  # leeres Feld = Standardverhalten
                user_input.setdefault(k, None)
            return self.async_create_entry(title="", data=user_input)
        return self.async_show_form(step_id="init", data_schema=_schema(d, False))
