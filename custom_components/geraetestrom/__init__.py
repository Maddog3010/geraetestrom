"""Gerätestrom: Stromherkunft (Solar, Batterie, Netz), Kosten und Ersparnis pro Gerät."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .engine import Engine

PLATFORMS = ["sensor"]
PANEL = "geraetestrom"


async def _register_panel(hass: HomeAssistant) -> None:
    """Seitenleisten-Eintrag „Gerätestrom“ anlegen (einmalig)."""
    store = hass.data[DOMAIN]
    if not store.get("_static"):
        js = Path(__file__).parent / "frontend" / "geraetestrom-panel.js"
        await hass.http.async_register_static_paths(
            [StaticPathConfig("/geraetestrom/panel.js", str(js), False)]
        )
        store["_static"] = True
    if not store.get("_panel"):
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL,
            webcomponent_name="geraetestrom-panel",
            module_url="/geraetestrom/panel.js?v=1.2.0",
            sidebar_title="Gerätestrom",
            sidebar_icon="mdi:flash",
            require_admin=False,
        )
        store["_panel"] = True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    cfg = {**entry.data, **entry.options}
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = Engine(hass, entry.entry_id, cfg)
    await _register_panel(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_reload))
    return True


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        store = hass.data[DOMAIN]
        store.pop(entry.entry_id).stop()
        if not [k for k in store if not k.startswith("_")] and store.get("_panel"):
            frontend.async_remove_panel(hass, PANEL)
            store["_panel"] = False
    return ok
