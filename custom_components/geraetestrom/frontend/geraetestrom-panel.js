const SRC = ["solar", "battery", "grid"];
const COL = { solar: "#e9a413", battery: "#13a97b", grid: "#6f78e8" };
const NAME = { solar: "Solar", battery: "Batterie", grid: "Netz" };
const PER = {
  h: { t: "Heute", b: "Heute", p: "hour", f: { hour: "2-digit" } },
  "7": { t: "Letzte 7 Tage", b: "7 Tage", p: "day", n: 7, f: { weekday: "short" } },
  m: { t: "Letzter Monat", b: "Monat", p: "day", n: 30, f: { day: "numeric", month: "numeric" } },
  j: { t: "Letzte 12 Monate", b: "Jahr", p: "month", n: 12, f: { month: "short" } },
  g: { t: "Gesamt", b: "Gesamt", p: "month", n: 60, f: { month: "short", year: "2-digit" } },
};
const eur = (v) => v.toFixed(2).replace(".", ",") + " €";
const num = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d });

class GeraetstromPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._per = "7"; this._ds = ""; this._sig = ""; this._rows = []; this._tl = 0; this._busy = false; this._dev = {};
  }
  set hass(h) { this._hass = h; if (this._menu) this._menu.hass = h; this._tick(); }
  set narrow(v) { this._narrow = v; if (this._menu) this._menu.narrow = v; }
  set panel(v) {}

  _devices() {
    const m = {};
    for (const s of Object.values(this._hass.states)) {
      const k = s.attributes.geraetestrom;
      if (!k) continue;
      (m[s.attributes.geraet] ??= {})[k] = { id: s.entity_id, v: parseFloat(s.state) || 0, s: s.state };
    }
    return m;
  }
  _tick() {
    const d = this._devices(), sig = JSON.stringify(d);
    if (sig !== this._sig) { this._sig = sig; this._dev = d; this._draw(); }
    if (Date.now() - this._tl > 3e5 && !this._busy) this._load();
  }

  async _load() {
    const names = Object.keys(this._dev);
    const ids = names.map((n) => SRC.map((s) => this._dev[n][s + "_kwh"]?.id));
    const all = ids.flat().filter(Boolean);
    this._tl = Date.now();
    if (!all.length) return;
    this._busy = true;
    try {
      const P = PER[this._per], end = new Date(), st = new Date(end);
      if (this._per === "h") st.setHours(0, 0, 0, 0);
      else if (P.p === "day") st.setDate(st.getDate() - P.n);
      else st.setMonth(st.getMonth() - P.n);
      const r = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: st.toISOString(), end_time: end.toISOString(),
        statistic_ids: all, period: P.p, types: ["change"],
      });
      const bk = new Map();
      names.forEach((n, di) => ids[di].forEach((id, i) => {
        if (!id) return;
        (r[id] || []).forEach((x) => {
          const t = typeof x.start === "number" ? x.start : Date.parse(x.start);
          if (!bk.has(t)) bk.set(t, {});
          (bk.get(t)[n] ??= [0, 0, 0])[i] += x.change || 0;
        });
      }));
      this._rows = [...bk.entries()].sort((a, b) => a[0] - b[0]);
    } catch (e) { this._rows = []; }
    this._busy = false;
    this._draw();
  }

  _series() {
    const P = PER[this._per];
    const rows = this._rows.map(([t, o]) => {
      const v = [0, 0, 0];
      for (const [n, a] of Object.entries(o)) { if (this._ds && n !== this._ds) continue; a.forEach((q, i) => (v[i] += q)); }
      return { t, v };
    });
    while (rows.length > 1 && rows[0].v.every((q) => q === 0)) rows.shift();
    return rows.map((x) => ({ v: x.v, l: new Date(x.t).toLocaleString("de-DE", P.f) }));
  }
  _totals() {
    const tot = {};
    for (const [, o] of this._rows) for (const [n, a] of Object.entries(o)) {
      const t = (tot[n] ??= [0, 0, 0]); a.forEach((q, i) => (t[i] += q));
    }
    return tot;
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
    const row = (l, c, s) => `<tr><td>${l}</td><td>${eur(c)}</td><td class="sav">${eur(s)}</td></tr>`;
    const adv = d.advice?.s, ok = adv && !["unknown", "unavailable"].includes(adv);
    const cls = adv === "Jetzt starten" ? "ok" : adv === "Besser warten" ? "no" : "mid";
    const run = v("runs") > 0
      ? `Letzter Durchlauf: ${num(v("last_kwh"), 2)} kWh · ${eur(v("last_cost"))} · ${num(v("last_share"))} % eigener Strom<br>Ø ${eur(v("avg_cost"))} pro Durchlauf (${num(v("runs"))} Durchläufe)`
      : "Noch kein Durchlauf erfasst.";
    return `<div class="card"><div class="hd"><b>${n}</b>${ok ? `<span class="pill ${cls}" title="Solardeckung ca. ${num(v("cover"))} %">${adv}</span>` : ""}</div>
      <div class="hero"><div class="donut"><svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="${R}" fill="none" stroke="var(--divider-color,#8883)" stroke-width="12"/>${seg}</svg>
      <div class="c"><b>${num(pc)}</b><span>% eigen</span></div></div><div class="leg">${leg}</div></div>
      <table><tr><th></th><th>Kosten</th><th>Ersparnis</th></tr>${row("Heute", v("cost_day"), v("saved_day"))}${row("Monat", v("cost_month"), v("saved_month"))}${row("Gesamt", v("cost"), v("saved"))}</table>
      <div class="mut run">${run}</div></div>`;
  }

  _bars(c) {
    if (!c.length) return '<div class="mut">Noch keine Daten. Statistiken entstehen stündlich.</div>';
    const mx = Math.max(...c.map((x) => x.v[0] + x.v[1] + x.v[2]), 0.001), step = Math.ceil(c.length / 12);
    return '<div class="bars">' + c.map((x, j) => {
      const t = x.v[0] + x.v[1] + x.v[2];
      return `<div title="${num(t, 2)} kWh"><div class="stack">${x.v.map((q, i) => `<i style="height:${(q / mx) * 100}%;background:${COL[SRC[i]]}"></i>`).join("")}</div><small>${j % step === 0 ? x.l : "&nbsp;"}</small></div>`;
    }).join("") + "</div>";
  }

  _draw() {
    const names = Object.keys(this._dev), P = PER[this._per], c = this._series();
    const tot = c.reduce((a, x) => [a[0] + x.v[0], a[1] + x.v[1], a[2] + x.v[2]], [0, 0, 0]), sum = tot[0] + tot[1] + tot[2];
    const cards = names.map((n) => this._card(n, this._dev[n])).join("") ||
      '<div class="card">Noch kein Gerät eingerichtet: Einstellungen → Geräte &amp; Dienste → Gerätestrom.</div>';
    const T = this._totals(), tmax = Math.max(...Object.values(T).map((a) => a[0] + a[1] + a[2]), 0.001);
    const cmp = names.map((n) => {
      const a = T[n] || [0, 0, 0], t = a[0] + a[1] + a[2];
      return `<div class="cmp"><span>${n}</span><div class="cb">${a.map((q, i) => `<i style="width:${(q / tmax) * 100}%;background:${COL[SRC[i]]}"></i>`).join("")}</div><b>${num(t, 1)} kWh</b></div>`;
    }).join("");
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;background:var(--primary-background-color);color:var(--primary-text-color);min-height:100%}
      .bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--app-header-background-color,var(--primary-color));color:var(--app-header-text-color,#fff);font-size:20px}
      .w{max-width:1100px;margin:0 auto;padding:16px}.all{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:12px}
      @media (min-width:760px){.all{grid-template-columns:repeat(3,1fr)}}
      .card{background:var(--card-background-color);border-radius:var(--ha-card-border-radius,16px);padding:16px;box-shadow:var(--ha-card-box-shadow,none);border:1px solid var(--divider-color,#8883);margin-bottom:12px}.all .card{margin:0}
      .hd{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .pill{font-size:12px;font-weight:600;padding:3px 9px;border-radius:99px}.ok{background:#13a97b26;color:#13a97b}.mid{background:#e9a41326;color:#c88a00}.no{background:#6f78e826;color:#6f78e8}
      .hero{display:flex;align-items:center;gap:16px;margin-top:8px}.donut{position:relative;width:96px;height:96px;flex:none}.donut svg{transform:rotate(-90deg)}
      .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.c b{font-size:22px;line-height:1}.c span,.mut,small{color:var(--secondary-text-color);font-size:12px}
      .leg{flex:1;display:grid;gap:8px}.leg div{display:flex;align-items:center;gap:8px}.leg strong{display:block;font-size:14px}.dot{width:12px;height:12px;border-radius:4px;flex:none}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}th{font-weight:400;color:var(--secondary-text-color);text-align:right}td{text-align:right;padding:3px 0}td:first-child,th:first-child{text-align:left}.sav{color:#13a97b}.run{margin-top:10px}
      .chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.chips button{border:1px solid var(--divider-color,#8883);background:var(--card-background-color);color:inherit;border-radius:99px;padding:5px 12px;cursor:pointer;font:inherit;font-size:14px}
      .chips button.on{background:#e9a413;color:#1b1500;border-color:#e9a413;font-weight:600}
      .bars{display:flex;align-items:flex-end;gap:3px;margin-top:10px}.bars>div{flex:1;min-width:0;text-align:center}
      .stack{display:flex;flex-direction:column-reverse;height:110px;border-radius:5px;overflow:hidden}.stack i{display:block;width:100%}
      .cmp{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center;margin-top:8px;font-size:14px}.cb{display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--divider-color,#8883)}.cb i{display:block;height:100%}
    </style>
    <div class="bar"><ha-menu-button></ha-menu-button><span>Gerätestrom</span></div>
    <div class="w"><div class="all">${cards}</div>
    <div class="card"><b>${P.t}${this._ds ? " · " + this._ds : ""}</b>
      <div class="mut">${num(sum)} kWh gesamt, davon ${sum > 0 ? Math.round(((tot[0] + tot[1]) / sum) * 100) : 0} % eigener Strom</div>
      <div class="chips">${Object.keys(PER).map((k) => `<button data-r="${k}" class="${k === this._per ? "on" : ""}">${PER[k].b}</button>`).join("")}</div>
      <div class="chips"><button data-d="" class="${this._ds === "" ? "on" : ""}">Alle Geräte</button>${names.map((n) => `<button data-d="${n}" class="${this._ds === n ? "on" : ""}">${n}</button>`).join("")}</div>
      ${this._bars(c)}</div>
    <div class="card"><b>Vergleich der Geräte</b><div class="mut">${P.t}, Energie nach Herkunft</div>${cmp}</div></div>`;
    this._menu = this.shadowRoot.querySelector("ha-menu-button");
    if (this._menu) { this._menu.hass = this._hass; this._menu.narrow = this._narrow; }
    this.shadowRoot.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => { this._per = b.dataset.r; this._rows = []; this._draw(); this._load(); }));
    this.shadowRoot.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => { this._ds = b.dataset.d; this._draw(); }));
  }
}
customElements.define("geraetestrom-panel", GeraetstromPanel);
