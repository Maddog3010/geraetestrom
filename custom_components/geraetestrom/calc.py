"""Reine Rechenfunktionen ohne Home-Assistant-Abhängigkeit (leicht testbar)."""
from __future__ import annotations

SOURCES = ("solar", "battery", "grid")


def split_power(g: float, s: float, b: float, n: float) -> dict[str, float]:
    """Geräteleistung g anteilig auf Solar (s), Batterie (b) und Netz (n) verteilen."""
    g, s, b, n = max(g, 0.0), max(s, 0.0), max(b, 0.0), max(n, 0.0)
    t = s + b + n
    if t <= 0:
        return {"solar": 0.0, "battery": 0.0, "grid": g}
    return {"solar": g * s / t, "battery": g * b / t, "grid": g * n / t}


def money(d_kwh: float, source: str, price: float, feed: float, bat_cost: float) -> tuple[float, float]:
    """Kosten und Ersparnis (Delta) für d_kwh aus einer Quelle."""
    if source == "grid":
        return d_kwh * price, 0.0
    if source == "solar":
        return 0.0, d_kwh * (price - feed)
    return 0.0, d_kwh * (price - bat_cost)


def free_solar(estimate_w: float, others_solar_w: float) -> float:
    """Solarleistung, die nach Abzug dessen übrig bleibt, was andere Geräte schon nutzen."""
    return max(estimate_w - max(others_solar_w, 0.0), 0.0)


def cover_pct(estimate_w: float, typical_w: float) -> float:
    """Wie viel Prozent der typischen Geräteleistung die Solarleistung decken würde."""
    if typical_w <= 0:
        return 0.0
    return max(0.0, min(estimate_w / typical_w, 1.0)) * 100


def advice(cover: float) -> str:
    if cover >= 70:
        return "Jetzt starten"
    if cover >= 30:
        return "Teilweise Solar"
    return "Besser warten"
