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
const ACC = ["#3dcba8", "#e8a23c", "#9b8cf0", "#ee6fb0", "#5b8def"];
const ICON = (n) => { n = n.toLowerCase(); return /wasch/.test(n) ? "mdi:washing-machine" : /trockn/.test(n) ? "mdi:tumble-dryer" : /sp(ü|u)l|geschirr/.test(n) ? "mdi:dishwasher" : "mdi:flash"; };
const ART = `<svg viewBox="0 0 220 200" width="200" height="182" aria-hidden="true"><rect x="14" y="8" width="140" height="122" rx="24" fill="#fff"/><rect x="26" y="20" width="116" height="98" rx="15" fill="#1b3a46"/><circle cx="84" cy="69" r="37" fill="#e6f6f3"/><circle cx="84" cy="69" r="26" fill="#4fb3a5"/><path d="M60 71q12-11 24 0t24 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="38" cy="34" r="4" fill="#f5b83d"/><circle cx="188" cy="38" r="17" fill="#f5b83d"/><g stroke="#f5b83d" stroke-width="4" stroke-linecap="round"><path d="M188 8v8M188 60v8M158 38h8M210 38h8M167 17l6 6M203 53l6 6M209 17l-6 6M173 53l-6 6"/></g><rect x="22" y="146" width="150" height="42" rx="21" fill="#fff"/><g fill="#1b3a46"><rect x="40" y="156" width="14" height="22" rx="7"/><rect x="66" y="156" width="14" height="22" rx="7"/><rect x="92" y="156" width="14" height="22" rx="7"/><rect x="118" y="156" width="14" height="22" rx="7"/></g><rect x="144" y="156" width="14" height="22" rx="7" fill="#3ecf9b"/><circle cx="194" cy="170" r="9" fill="#f5b83d"/></svg>`;
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

  _card(n, d, ix) {
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
    return `<div class="card"><div class="hd"><div class="dev"><div class="ic" style="background:${ACC[ix % 5]}"><ha-icon icon="${ICON(n)}"></ha-icon></div><div><b>${n}</b><div class="st"><i style="background:${T > 0 ? "#3ecf9b" : "#8888"}"></i>${T > 0 ? `läuft · ${num(T)} W` : "aus"}</div></div></div>${ok ? `<span class="pill ${cls}" title="Solardeckung ca. ${num(v("cover"))} %">${adv}</span>` : ""}</div>
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
    const cards = names.map((n, i) => this._card(n, this._dev[n], i)).join("") ||
      '<div class="card">Noch kein Gerät eingerichtet: Einstellungen → Geräte &amp; Dienste → Gerätestrom.</div>';
    const T = this._totals(), tmax = Math.max(...Object.values(T).map((a) => a[0] + a[1] + a[2]), 0.001);
    const cmp = names.map((n) => {
      const a = T[n] || [0, 0, 0], t = a[0] + a[1] + a[2];
      return `<div class="cmp"><span>${n}</span><div class="cb">${a.map((q, i) => `<i style="width:${(q / tmax) * 100}%;background:${COL[SRC[i]]}"></i>`).join("")}</div><b>${num(t, 1)} kWh</b></div>`;
    }).join("");
    const D = Object.values(this._dev), sm = (k) => D.reduce((a, d) => a + (d[k]?.v || 0), 0);
    const run = D.filter((d) => SRC.some((s) => (d[s + "_w"]?.v || 0) > 0)).length;
    const date = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    const banner = `<div class="ban"><div><div class="lb"><ha-icon icon="mdi:solar-power"></ha-icon>Heute gespart (geschätzt)</div>
      <div class="big2">${sm("saved_day").toFixed(2).replace(".", ",")}<span>€</span></div><div class="dt">${date}</div>
      <div class="pills"><span><ha-icon icon="mdi:washing-machine"></ha-icon> ${num(sm("runs_day"))} Durchläufe heute</span>
      <span><ha-icon icon="mdi:power-plug"></ha-icon> ${run} von ${D.length} Geräten laufen</span>
      <span><ha-icon icon="mdi:flash"></ha-icon> ${num(sm("kwh_day"), 1)} kWh heute</span></div></div>${ART}</div>`;
    const tiles = `<div class="tl">${[["Heute", "_day", "#3ecf9b", "mdi:calendar-today"], ["Monat", "_month", "#5b8def", "mdi:calendar-month"], ["Jahr", "_year", "#9b7bf0", "mdi:calendar"], ["Gesamt", "", "#ee6fb0", "mdi:infinity"]]
      .map(([l, s, c, ic]) => `<div class="card" style="--c:${c}"><div class="mut"><ha-icon icon="${ic}"></ha-icon> ${l}</div><div class="v sav">${eur(sm("saved" + s))} <small>gespart</small></div><div class="mut">Kosten ${eur(sm("cost" + s))}</div></div>`).join("")}</div>`;
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;background:var(--primary-background-color);color:var(--primary-text-color);min-height:100%}
      .bar{display:flex;align-items:center;padding:6px 8px}ha-icon{--mdc-icon-size:20px;vertical-align:-5px}
      .ph{display:flex;align-items:center;gap:14px;margin-bottom:14px}.ph h1{margin:0;font-size:24px}.ph .mut{font-size:14px}
      .logo{width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,#3dcba8,#2a7f86);display:grid;place-items:center;color:#fff;flex:none}.logo ha-icon{--mdc-icon-size:28px}
      .ban{overflow:hidden;border-radius:28px;padding:26px 30px;margin-bottom:12px;color:#fff;background:radial-gradient(120% 150% at 85% -10%,#52b8a8 0%,#2a7f86 30%,#1b4a5a 62%,#142f3b 100%);display:flex;justify-content:space-between;align-items:center;gap:12px}
      .lb{opacity:.92;font-size:15px}.big2{font-size:66px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:8px}.big2 span{font-size:26px;font-weight:600;margin-left:8px}.dt{opacity:.85}
      .pills{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.pills span{background:#ffffff1f;border-radius:99px;padding:9px 16px;font-size:14px}.ban svg{flex:none}
      @media (max-width:620px){.ban{padding:20px}.big2{font-size:50px}.ban svg{width:92px;height:auto;align-self:flex-start}.pills span{padding:7px 12px;font-size:13px}}
      .tl{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}@media (max-width:760px){.tl{grid-template-columns:1fr 1fr}}
      .tl .card{margin:0;border-left:4px solid var(--c);border-radius:18px;padding:12px 14px}.v{font-size:26px;font-weight:800;line-height:1.2}.v small{font-size:13px;font-weight:400;color:var(--secondary-text-color)}
      .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#fff;flex:none}.ic ha-icon{--mdc-icon-size:24px}.dev{display:flex;align-items:center;gap:12px}.dev b{font-size:18px}
      .st{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--secondary-text-color)}.st i{width:9px;height:9px;border-radius:50%;display:inline-block}
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
    <div class="bar"><ha-menu-button></ha-menu-button></div>
    <div class="w"><div class="ph"><div class="logo"><ha-icon icon="mdi:flash"></ha-icon></div><div><h1>Gerätestrom</h1><div class="mut">Stromherkunft, Kosten und Ersparnis pro Gerät</div></div></div>
    ${banner}${tiles}<div class="all">${cards}</div>
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
