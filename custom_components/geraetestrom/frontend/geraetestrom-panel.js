const COL = { solar: "#e9a413", battery: "#13a97b", grid: "#6f78e8" };
const NAME = { solar: "Solar", battery: "Batterie", grid: "Netz" };
const SRC = ["solar", "battery", "grid"];
const PER = {
  "7": { t: "Letzte 7 Tage", p: "day", n: 7, f: { weekday: "short" } },
  m: { t: "Letzter Monat", p: "day", n: 30, f: { day: "numeric", month: "numeric" } },
  j: { t: "Letzte 12 Monate", p: "month", n: 12, f: { month: "short" } },
  g: { t: "Gesamt", p: "month", n: 60, f: { month: "short", year: "2-digit" } },
};
const LBL = { "7": "7 Tage", m: "Monat", j: "Jahr", g: "Gesamt" };
const eur = (v) => v.toFixed(2).replace(".", ",") + " €";
const num = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d });

class GeraetstromPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._per = "7"; this._sig = ""; this._chart = []; this._tl = 0; this._busy = false; this._dev = {};
  }
  set hass(h) { this._hass = h; if (this._menu) this._menu.hass = h; this._tick(); }
  set narrow(v) { this._narrow = v; if (this._menu) this._menu.narrow = v; }
  set panel(v) {}

  _devices() {
    const m = {};
    for (const s of Object.values(this._hass.states)) {
      const k = s.attributes.geraetestrom;
      if (!k) continue;
      (m[s.attributes.geraet] ??= {})[k] = { id: s.entity_id, v: parseFloat(s.state) || 0 };
    }
    return m;
  }
  _tick() {
    const d = this._devices(), sig = JSON.stringify(d);
    if (sig !== this._sig) { this._sig = sig; this._dev = d; this._draw(); }
    if (Date.now() - this._tl > 3e5 && !this._busy) this._load();
  }

  async _load() {
    const ids = SRC.map((s) => Object.values(this._dev).map((d) => d[s + "_kwh"]?.id).filter(Boolean));
    const all = ids.flat();
    this._tl = Date.now();
    if (!all.length) return;
    this._busy = true;
    try {
      const P = PER[this._per], end = new Date(), st = new Date(end);
      if (P.p === "day") st.setDate(st.getDate() - P.n); else st.setMonth(st.getMonth() - P.n);
      const r = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: st.toISOString(), end_time: end.toISOString(),
        statistic_ids: all, period: P.p, types: ["change"],
      });
      const bk = new Map();
      ids.forEach((list, i) => list.forEach((id) => (r[id] || []).forEach((x) => {
        const t = typeof x.start === "number" ? x.start : Date.parse(x.start);
        if (!bk.has(t)) bk.set(t, [0, 0, 0]);
        bk.get(t)[i] += x.change || 0;
      })));
      let rows = [...bk.entries()].sort((a, b) => a[0] - b[0]);
      while (rows.length > 1 && rows[0][1].every((q) => q === 0)) rows.shift();
      this._chart = rows.map(([t, v]) => ({ v, l: new Date(t).toLocaleDateString("de-DE", P.f) }));
    } catch (e) { this._chart = []; }
    this._busy = false;
    this._draw();
  }

  _card(n, d) {
    const v = (k) => d[k]?.v || 0, W = SRC.map((k) => v(k + "_w")), T = W.reduce((a, b) => a + b, 0);
    const R = 38, L = 2 * Math.PI * R;
    let o = 0, seg = "";
    if (T > 0) W.forEach((w, i) => {
      const l = (w / T) * L;
      if (l > 0) { seg += `<circle cx="48" cy="48" r="${R}" fill="none" stroke="${COL[SRC[i]]}" stroke-width="12" stroke-dasharray="${Math.max(l - 2, 0)} ${L}" stroke-dashoffset="${-o}"/>`; o += l; }
    });
    const pc = T > 0 ? ((W[0] + W[1]) / T) * 100 : v("self");
    const leg = SRC.map((k, i) => `<div><span class="dot" style="background:${COL[k]}"></span><span><strong>${num(W[i])} W</strong><span class="mut">${NAME[k]}</span></span></div>`).join("");
    return `<div class="card"><b>${n}</b>
      <div class="hero"><div class="donut"><svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="${R}" fill="none" stroke="var(--divider-color,#8883)" stroke-width="12"/>${seg}</svg>
      <div class="c"><b>${num(pc)}</b><span>% eigen</span></div></div><div class="leg">${leg}</div></div>
      <div class="two"><div><div class="mut">Kosten gesamt</div><b class="big">${eur(v("cost"))}</b></div>
      <div><div class="mut">Ersparnis gesamt</div><b class="big sav">${eur(v("saved"))}</b></div></div></div>`;
  }

  _chartHtml() {
    const c = this._chart;
    if (!c.length) return '<div class="mut">Noch keine Daten. Statistiken entstehen stündlich.</div>';
    const mx = Math.max(...c.map((x) => x.v[0] + x.v[1] + x.v[2]), 0.001);
    return '<div class="bars">' + c.map((x) => {
      const t = x.v[0] + x.v[1] + x.v[2];
      return `<div title="${num(t, 2)} kWh"><div class="stack">${x.v.map((q, i) => `<i style="height:${(q / mx) * 100}%;background:${COL[SRC[i]]}"></i>`).join("")}</div><small>${x.l}</small></div>`;
    }).join("") + "</div>";
  }

  _draw() {
    const names = Object.keys(this._dev), P = PER[this._per];
    const tot = this._chart.reduce((a, x) => [a[0] + x.v[0], a[1] + x.v[1], a[2] + x.v[2]], [0, 0, 0]);
    const sum = tot[0] + tot[1] + tot[2];
    const cards = names.map((n) => this._card(n, this._dev[n])).join("") ||
      '<div class="card">Noch kein Gerät eingerichtet: Einstellungen → Geräte &amp; Dienste → Gerätestrom.</div>';
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;background:var(--primary-background-color);color:var(--primary-text-color);min-height:100%;font-family:var(--paper-font-body1_-_font-family,inherit)}
      .bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--app-header-background-color,var(--primary-color));color:var(--app-header-text-color,#fff);font-size:20px}
      .w{max-width:1100px;margin:0 auto;padding:16px}
      .all{display:grid;grid-template-columns:1fr;gap:12px}
      @media (min-width:760px){.all{grid-template-columns:repeat(3,1fr)}}
      .card{background:var(--card-background-color);border-radius:var(--ha-card-border-radius,16px);padding:16px;box-shadow:var(--ha-card-box-shadow,none);border:1px solid var(--divider-color,#8883)}
      .hero{display:flex;align-items:center;gap:16px;margin-top:8px}
      .donut{position:relative;width:96px;height:96px;flex:none}.donut svg{transform:rotate(-90deg)}
      .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
      .c b{font-size:22px;line-height:1}.c span{font-size:11px;color:var(--secondary-text-color)}
      .leg{flex:1;display:grid;gap:8px}.leg div{display:flex;align-items:center;gap:8px}.leg strong{display:block;font-size:14px}
      .dot{width:12px;height:12px;border-radius:4px;flex:none}
      .mut{color:var(--secondary-text-color);font-size:13px}
      .two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.big{font-size:20px}.sav{color:#13a97b}
      .chart{margin-top:12px}.chips{display:flex;gap:6px;margin:10px 0}
      .chips button{border:1px solid var(--divider-color,#8883);background:var(--card-background-color);color:inherit;border-radius:99px;padding:6px 12px;cursor:pointer;font:inherit;font-size:14px}
      .chips button.on{background:#e9a413;color:#1b1500;border-color:#e9a413;font-weight:600}
      .bars{display:flex;align-items:flex-end;gap:4px;margin-top:10px}.bars>div{flex:1;min-width:0;text-align:center}
      .stack{display:flex;flex-direction:column-reverse;height:110px;border-radius:6px;overflow:hidden}.stack i{display:block;width:100%}
      small{color:var(--secondary-text-color);font-size:11px}
    </style>
    <div class="bar"><ha-menu-button></ha-menu-button><span>Gerätestrom</span></div>
    <div class="w"><div class="all">${cards}</div>
    <div class="card chart"><b>${P.t}</b>
      <div class="mut">${num(sum)} kWh gesamt, davon ${sum > 0 ? Math.round(((tot[0] + tot[1]) / sum) * 100) : 0} % eigener Strom</div>
      <div class="chips">${Object.keys(LBL).map((k) => `<button data-r="${k}" class="${k === this._per ? "on" : ""}">${LBL[k]}</button>`).join("")}</div>
      ${this._chartHtml()}</div></div>`;
    this._menu = this.shadowRoot.querySelector("ha-menu-button");
    if (this._menu) { this._menu.hass = this._hass; this._menu.narrow = this._narrow; }
    this.shadowRoot.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => {
      this._per = b.dataset.r; this._chart = []; this._draw(); this._load();
    }));
  }
}
customElements.define("geraetestrom-panel", GeraetstromPanel);
