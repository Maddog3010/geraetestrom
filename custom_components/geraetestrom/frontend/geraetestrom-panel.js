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
const SEC = ["banner", "tiles", "flow", "devices", "chart", "compare"];
const TXT = ["#1b1500", "#fff", "#fff"];
const eur = (v) => v.toFixed(2).replace(".", ",") + " €";
const num = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d });

const spark = (vals, color, h = 26, w = 100) => {
  if (!vals || vals.length < 2) return "";
  const mx = Math.max(...vals, 1e-9), mn = Math.min(...vals, 0), n = vals.length;
  const pts = vals.map((v, i) => [(i / (n - 1)) * w, h - 2 - ((v - mn) / (mx - mn || 1)) * (h - 4)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  return `<svg class="sp" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${line}L${w} ${h}L0 ${h}Z" fill="${color}" opacity=".18"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};
const flowSvg = (devs) => {
  const W = 680, H = 250, xl = 142, xr = 488, nw = 12, gap = 14, pad = 10, xm = (xl + xr) / 2;
  const srcT = [0, 1, 2].map((i) => devs.reduce((a, d) => a + d.w[i], 0)), devT = devs.map((d) => d.w[0] + d.w[1] + d.w[2]);
  const total = srcT.reduce((a, b) => a + b, 0);
  if (total <= 0) return `<div class="mut" style="padding:24px 0;text-align:center">Gerade läuft kein Gerät.</div>`;
  const k = Math.min((H - 2 * pad - gap * 2) / total, (H - 2 * pad - gap * (devs.length - 1)) / total);
  const hs = srcT.map((t) => Math.max(t * k, 18)), hd = devT.map((t) => Math.max(t * k, 18));
  const place = (hh) => { let y = (H - (hh.reduce((a, b) => a + b, 0) + gap * (hh.length - 1))) / 2; return hh.map((h) => { const r = y; y += h + gap; return r; }); };
  const ys = place(hs), yd = place(hd), oS = [0, 0, 0], oD = devs.map(() => 0);
  let out = "";
  for (let i = 0; i < 3; i++) devs.forEach((d, j) => {
    const w = d.w[i];
    if (w <= 0) return;
    const t = w * k, y1 = ys[i] + oS[i], y2 = yd[j] + oD[j];
    oS[i] += t; oD[j] += t;
    out += `<path d="M${xl} ${y1}C${xm} ${y1},${xm} ${y2},${xr} ${y2}L${xr} ${y2 + t}C${xm} ${y2 + t},${xm} ${y1 + t},${xl} ${y1 + t}Z" fill="${COL[SRC[i]]}" opacity=".5"/>`;
    out += `<path class="fl" d="M${xl} ${y1 + t / 2}C${xm} ${y1 + t / 2},${xm} ${y2 + t / 2},${xr} ${y2 + t / 2}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="${Math.min(2.5, Math.max(t * 0.35, 1))}" stroke-dasharray="2 10" stroke-linecap="round"/>`;
  });
  srcT.forEach((t, i) => { out += `<rect x="${xl - nw}" y="${ys[i]}" width="${nw}" height="${hs[i]}" rx="3" fill="${COL[SRC[i]]}"/><text class="fl-t" x="${xl - nw - 8}" y="${ys[i] + hs[i] / 2 - 1}" text-anchor="end" font-size="13" font-weight="700">${NAME[SRC[i]]}</text><text class="fl-m" x="${xl - nw - 8}" y="${ys[i] + hs[i] / 2 + 14}" text-anchor="end" font-size="12">${num(t)} W</text>`; });
  devs.forEach((d, j) => { out += `<rect x="${xr}" y="${yd[j]}" width="${nw}" height="${hd[j]}" rx="3" fill="${d.c}"/><text class="fl-t" x="${xr + nw + 8}" y="${yd[j] + hd[j] / 2 - 1}" font-size="13" font-weight="700">${d.n}</text><text class="fl-m" x="${xr + nw + 8}" y="${yd[j] + hd[j] / 2 + 14}" font-size="12">${num(devT[j])} W</text>`; });
  return `<svg class="fls" viewBox="0 0 ${W} ${H}" role="img" aria-label="Energiefluss">${out}</svg>`;
};
class GeraetstromPanel extends HTMLElement {
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    this._per = "7"; this._ds = ""; this._sig = ""; this._rows = []; this._tl = 0; this._busy = false; this._dev = {};
    this._sp = { dev: {}, tiles: {} }; this._ts = 0; this._sbusy = false;
    this._edit = false; this._lay = {}; this._ids = { sec: [], dev: [] }; this._drag = null; this._lload = false;
    r.addEventListener("dragstart", (e) => {
      const b = this._edit && e.target.closest?.(".blk");
      if (!b) return;
      this._drag = [b.dataset.g, b.dataset.id];
      e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "x"); e.stopPropagation();
    });
    r.addEventListener("dragover", (e) => { if (this._drag && e.target.closest?.(`.blk[data-g="${this._drag[0]}"]`)) e.preventDefault(); });
    r.addEventListener("drop", (e) => {
      if (!this._drag) return;
      const b = e.target.closest?.(`.blk[data-g="${this._drag[0]}"]`);
      e.preventDefault();
      if (b) this._move(this._drag[0], this._drag[1], b.dataset.id);
      this._drag = null;
    });
    r.addEventListener("dragend", () => { this._drag = null; });
    r.addEventListener("click", (e) => {
      const b = e.target.closest?.("button");
      if (!b) return;
      if (b.dataset.mv) this._step(b.dataset.g, b.dataset.id, +b.dataset.mv);
      else if (b.dataset.eye) this._toggle(b.dataset.g, b.dataset.id);
      else if (b.id === "ed") { this._edit = !this._edit; this._draw(); }
      else if (b.id === "rs") { this._lay = {}; this._saveLayout(); this._draw(); }
      else if (b.dataset.r) { this._per = b.dataset.r; this._rows = []; this._draw(); this._load(); }
      else if (b.dataset.d !== undefined) { this._ds = b.dataset.d; this._draw(); }
    });
  }
  set hass(h) {
    this._hass = h;
    if (this._menu) this._menu.hass = h;
    if (!this._lload) { this._lload = true; this._loadLayout(); }
    this._tick();
  }
  set narrow(v) { this._narrow = v; if (this._menu) this._menu.narrow = v; }
  set panel(v) {}

  // --- Anordnung (pro Benutzer gespeichert) -------------------------------
  async _loadLayout() {
    try {
      const r = await this._hass.callWS({ type: "frontend/get_user_data", key: "geraetestrom_layout" });
      this._lay = r?.value || {};
    } catch (e) {
      try { this._lay = JSON.parse(localStorage.getItem("geraetestrom_layout") || "{}"); } catch (_) { this._lay = {}; }
    }
    this._draw();
  }
  _saveLayout() {
    try { localStorage.setItem("geraetestrom_layout", JSON.stringify(this._lay)); } catch (_) {}
    try { this._hass.callWS({ type: "frontend/set_user_data", key: "geraetestrom_layout", value: this._lay }).catch(() => {}); } catch (_) {}
  }
  _ord(g, ids) { const s = this._lay[g] || []; return [...s.filter((i) => ids.includes(i)), ...ids.filter((i) => !s.includes(i))]; }
  _move(g, id, to) {
    const a = [...this._ids[g]], f = a.indexOf(id), t = a.indexOf(to);
    if (f < 0 || t < 0 || f === t) return;
    a.splice(f, 1); a.splice(t, 0, id);
    this._lay[g] = a; this._saveLayout(); this._draw();
  }
  _isHidden(g, id) { return (this._lay.hide || []).includes(`${g}:${id}`); }
  _toggle(g, id) {
    const key = `${g}:${id}`, h = new Set(this._lay.hide || []);
    if (h.has(key)) h.delete(key); else h.add(key);
    this._lay.hide = [...h]; this._saveLayout(); this._draw();
  }
  _step(g, id, d) {
    const a = [...this._ids[g]], i = a.indexOf(id), j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    this._lay[g] = a; this._saveLayout(); this._draw();
  }

  // --- Daten ---------------------------------------------------------------
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
    if (Date.now() - this._ts > 3e5 && !this._sbusy) this._loadSpark();
  }
  async _loadSpark() {
    const names = Object.keys(this._dev);
    this._ts = Date.now();
    if (!names.length) return;
    this._sbusy = true;
    try {
      const now = new Date(), idsK = {}, all = [];
      names.forEach((n) => { idsK[n] = SRC.map((s) => this._dev[n][s + "_kwh"]?.id).filter(Boolean); all.push(...idsK[n]); });
      const savedIds = names.map((n) => this._dev[n].saved?.id).filter(Boolean);
      const q = (ids, period, start) => (ids.length ? this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: now.toISOString(), statistic_ids: ids, period, types: ["change"] }) : Promise.resolve({}));
      const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
      const dStart = (n) => { const d = new Date(d0); d.setDate(d.getDate() - n); return d; };
      const mStart = (n) => new Date(now.getFullYear(), now.getMonth() - n + 1, 1);
      const [rk, rh, rd, rm] = await Promise.all([q(all, "day", dStart(6)), q(savedIds, "hour", d0), q(savedIds, "day", dStart(29)), q(savedIds, "month", mStart(24))]);
      const kf = {
        hour: (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`,
        day: (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        month: (d) => `${d.getFullYear()}-${d.getMonth()}`,
      };
      const series = (r, ids, f, keys) => {
        const m = {};
        ids.forEach((id) => (r[id] || []).forEach((x) => { const k = f(new Date(typeof x.start === "number" ? x.start : Date.parse(x.start))); m[k] = (m[k] || 0) + (x.change || 0); }));
        return keys.map((k) => m[f(k)] || 0);
      };
      const days = (n) => Array.from({ length: n }, (_, i) => dStart(n - 1 - i));
      const hours = Array.from({ length: now.getHours() + 1 }, (_, h) => new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), h));
      const months = (n) => Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));
      const dev = {};
      names.forEach((n) => { dev[n] = series(rk, idsK[n], kf.day, days(7)); });
      this._sp = { dev, tiles: { day: series(rh, savedIds, kf.hour, hours), month: series(rd, savedIds, kf.day, days(30)), year: series(rm, savedIds, kf.month, months(12)), all: series(rm, savedIds, kf.month, months(24)) } };
    } catch (e) { this._sp = { dev: {}, tiles: {} }; }
    this._sbusy = false;
    this._draw();
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

  // --- Darstellung ---------------------------------------------------------
  _legend(a) {
    return `<div class="lgd">${SRC.map((k, i) => `<span><i style="background:${COL[k]}"></i>${NAME[k]} <b>${num(a[i], 1)} kWh</b></span>`).join("")}</div>`;
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
    const v7 = this._sp.dev[n];
    const spk = v7 && v7.length > 1 ? `<div class="spk"><div class="mut">Letzte 7 Tage · ${num(v7.reduce((a, b) => a + b, 0), 1)} kWh</div>${spark(v7, ACC[ix % 5])}</div>` : "";
    return `<div class="card"><div class="hd"><div class="dev"><div class="ic" style="background:${ACC[ix % 5]}"><ha-icon icon="${ICON(n)}"></ha-icon></div><div><b>${n}</b><div class="st"><i style="background:${T > 0 ? "#3ecf9b" : "#8888"}"></i>${T > 0 ? `läuft · ${num(T)} W` : "aus"}</div></div></div>${ok ? `<span class="pill ${cls}" title="Solardeckung ca. ${num(v("cover"))} %">${adv}</span>` : ""}</div>
      <div class="hero"><div class="donut"><svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="${R}" fill="none" stroke="var(--divider-color,#8883)" stroke-width="12"/>${seg}</svg>
      <div class="c"><b>${num(pc)}</b><span>% eigen</span></div></div><div class="leg">${leg}</div></div>
      <table><tr><th></th><th>Kosten</th><th>Ersparnis</th></tr>${row("Heute", v("cost_day"), v("saved_day"))}${row("Monat", v("cost_month"), v("saved_month"))}${row("Gesamt", v("cost"), v("saved"))}</table>
      ${spk}<div class="mut run">${run}</div></div>`;
  }
  _bars(c) {
    if (!c.length) return '<div class="mut">Noch keine Daten. Statistiken entstehen stündlich.</div>';
    const tt = c.map((x) => x.v[0] + x.v[1] + x.v[2]), mx = Math.max(...tt, 0.001), step = Math.ceil(c.length / 12), showV = c.length <= 12;
    return `<div class="chw"><div class="bars">${c.map((x, j) =>
      `<div title="${num(tt[j], 2)} kWh"><div class="stack">${x.v.map((q, i) => `<i style="height:${(q / mx) * 100}%;background:${COL[SRC[i]]};color:${TXT[i]}">${showV && (q / mx) * 110 >= 13 ? num(q, 1) : ""}</i>`).join("")}</div><small>${j % step === 0 ? x.l : "&nbsp;"}</small>${showV ? this._hid(x.v, mx) : ""}</div>`).join("")}</div></div>`;
  }
  _hid(v, mx) {
    const h = v.map((q, i) => (q > 0 && (q / mx) * 110 < 13 ? `<span><i style="background:${COL[SRC[i]]}"></i>${num(q, 1)}</span>` : "")).join("");
    return h ? `<div class="hid">${h}</div>` : "";
  }
  _wrap(g, id, html) {
    const e = this._edit, off = this._isHidden(g, id);
    if (off && !e) return "";
    const arrows = g === "dev" ? ["◀", "▶"] : ["▲", "▼"], at = `data-g="${g}" data-id="${id}"`;
    return `<div class="blk${off ? " off" : ""}" data-g="${g}" data-id="${id}"${e ? ' draggable="true"' : ""}>${html}${e ? `${off ? '<div class="offb">ausgeblendet</div>' : ""}<div class="mv"><span>⠿</span><button data-mv="-1" ${at}>${arrows[0]}</button><button data-mv="1" ${at}>${arrows[1]}</button><button data-eye="1" ${at} title="${off ? "Einblenden" : "Ausblenden"}"><ha-icon icon="${off ? "mdi:eye-off" : "mdi:eye"}"></ha-icon></button></div>` : ""}</div>`;
  }

  _draw() {
    const names = Object.keys(this._dev), P = PER[this._per], c = this._series();
    const tot = c.reduce((a, x) => [a[0] + x.v[0], a[1] + x.v[1], a[2] + x.v[2]], [0, 0, 0]), sum = tot[0] + tot[1] + tot[2];
    const devIds = this._ord("dev", names);
    this._ids.dev = devIds; this._ids.sec = this._ord("sec", SEC);
    const cards = names.length
      ? devIds.map((n) => this._wrap("dev", n, this._card(n, this._dev[n], names.indexOf(n)))).join("")
      : '<div class="card">Noch kein Gerät eingerichtet: Einstellungen → Geräte &amp; Dienste → Gerätestrom.</div>';

    const D = Object.values(this._dev), sm = (k) => D.reduce((a, d) => a + (d[k]?.v || 0), 0);
    const run = D.filter((d) => SRC.some((s) => (d[s + "_w"]?.v || 0) > 0)).length;
    const date = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    const banner = `<div class="ban"><div><div class="lb"><ha-icon icon="mdi:solar-power"></ha-icon>Heute gespart (geschätzt)</div>
      <div class="big2">${sm("saved_day").toFixed(2).replace(".", ",")}<span>€</span></div><div class="dt">${date}</div>
      <div class="pills"><span><ha-icon icon="mdi:washing-machine"></ha-icon> ${num(sm("runs_day"))} Durchläufe heute</span>
      <span><ha-icon icon="mdi:power-plug"></ha-icon> ${run} von ${D.length} Geräten laufen</span>
      <span><ha-icon icon="mdi:flash"></ha-icon> ${num(sm("kwh_day"), 1)} kWh heute</span></div></div>${ART}</div>`;
    const tiles = `<div class="tl">${[["Heute", "_day", "#3ecf9b", "mdi:calendar-today", "day"], ["Monat", "_month", "#5b8def", "mdi:calendar-month", "month"], ["Jahr", "_year", "#9b7bf0", "mdi:calendar", "year"], ["Gesamt", "", "#ee6fb0", "mdi:infinity", "all"]]
      .map(([l, s, col, ic, sk]) => `<div class="card" style="--c:${col}"><div class="mut"><ha-icon icon="${ic}"></ha-icon> ${l}</div><div class="v sav">${eur(sm("saved" + s))} <small>gespart</small></div><div class="mut">Kosten ${eur(sm("cost" + s))}</div>${spark(this._sp.tiles[sk], col)}</div>`).join("")}</div>`;

    const chart = `<div class="card"><b>${P.t}${this._ds ? " · " + this._ds : ""}</b>
      <div class="mut">${num(sum)} kWh gesamt, davon ${sum > 0 ? Math.round(((tot[0] + tot[1]) / sum) * 100) : 0} % eigener Strom</div>
      <div class="chips">${Object.keys(PER).map((k) => `<button data-r="${k}" class="${k === this._per ? "on" : ""}">${PER[k].b}</button>`).join("")}</div>
      <div class="chips"><button data-d="" class="${this._ds === "" ? "on" : ""}">Alle Geräte</button>${names.map((n) => `<button data-d="${n}" class="${this._ds === n ? "on" : ""}">${n}</button>`).join("")}</div>
      <div class="mut cap">Energie pro Zeitraum in kWh, nach Herkunft</div>${this._bars(c)}${this._legend(tot)}</div>`;

    const T = this._totals(), tmax = Math.max(...Object.values(T).map((a) => a[0] + a[1] + a[2]), 0.001), all3 = [0, 0, 0];
    Object.values(T).forEach((a) => a.forEach((q, i) => (all3[i] += q)));
    const cmp = names.map((n) => {
      const a = T[n] || [0, 0, 0], t = a[0] + a[1] + a[2];
      return `<div class="cmp"><div class="h"><span>${n}</span><span class="mut">${t > 0 ? Math.round(((a[0] + a[1]) / t) * 100) : 0} % eigener Strom</span></div><div class="cb">${a.map((q, i) => `<i style="width:${(q / (tmax * 1.05)) * 100}%;background:${COL[SRC[i]]}"></i>`).join("")}</div><div class="cl">${a.map((q, i) => (q > 0 ? `<span><i style="background:${COL[SRC[i]]}"></i>${NAME[SRC[i]]} ${num(q, 1)} kWh</span>` : "")).join("")}<b>Summe ${num(t, 1)} kWh</b></div></div>`;
    }).join("");
    const compare = `<div class="card"><b>Vergleich der Geräte</b><div class="mut">${P.t}, Energie je Gerät in kWh nach Herkunft</div>${this._legend(all3)}${cmp}</div>`;

    const flow = `<div class="card"><b>Energiefluss</b><div class="mut">Woher der Strom gerade kommt</div>${flowSvg(devIds.map((n) => ({ n, w: SRC.map((k) => this._dev[n][k + "_w"]?.v || 0), c: ACC[names.indexOf(n) % 5] })))}</div>`;
    const sec = { banner, tiles, flow, devices: `<div class="all">${cards}</div>`, chart, compare };
    let main = this._ids.sec.map((id) => this._wrap("sec", id, sec[id])).join("");
    if (!main) main = '<div class="card mut">Alle Bereiche sind ausgeblendet. Mit „Anpassen“ lassen sie sich wieder einblenden.</div>';

    this.shadowRoot.innerHTML = `<style>
      :host{display:block;background:var(--primary-background-color);color:var(--primary-text-color);min-height:100%}
      .bar{display:flex;align-items:center;padding:6px 8px}ha-icon{--mdc-icon-size:20px;vertical-align:-5px}
      .w{max-width:1100px;margin:0 auto;padding:16px}.main{display:flex;flex-direction:column}
      .ph{display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap}.ph h1{margin:0;font-size:24px}.ph .mut{font-size:14px}
      .logo{width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,#3dcba8,#2a7f86);display:grid;place-items:center;color:#fff;flex:none}.logo ha-icon{--mdc-icon-size:28px}
      .acts{margin-left:auto;display:flex;gap:8px}.acts button{border:1px solid var(--divider-color,#8883);background:var(--card-background-color);color:inherit;border-radius:99px;padding:9px 16px;font:inherit;cursor:pointer}
      .blk{position:relative;margin-bottom:12px}.all .blk{margin:0}.blk>.card,.blk>.ban,.blk>.tl,.blk>.all{margin-bottom:0}
      .blk.off>:not(.mv):not(.offb){opacity:.4;filter:grayscale(.6)}.offb{position:absolute;left:12px;top:-14px;z-index:3;background:#000b;color:#fff;border-radius:99px;padding:4px 10px;font-size:12px}.mv button ha-icon{--mdc-icon-size:16px;vertical-align:-3px}
      .edit .blk{outline:2px dashed #3ecf9b;outline-offset:4px;border-radius:20px;cursor:grab}
      .mv{position:absolute;top:-14px;right:12px;z-index:3;display:flex;gap:6px;align-items:center;background:#000b;color:#fff;border-radius:99px;padding:4px 8px}
      .mv button{border:0;background:#fff2;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer}
.sp{width:100%;height:26px;display:block}.spk{margin-top:8px}.tl .sp{margin-top:6px}.fls{width:100%;height:auto;margin-top:8px}.fl-t{fill:var(--primary-text-color)}.fl-m{fill:var(--secondary-text-color)}.fl{animation:flm 1.2s linear infinite}@keyframes flm{to{stroke-dashoffset:-12}}@media (prefers-reduced-motion:reduce){.fl{animation:none}}
      .ban{overflow:hidden;border-radius:28px;padding:26px 30px;color:#fff;background:radial-gradient(120% 150% at 85% -10%,#52b8a8 0%,#2a7f86 30%,#1b4a5a 62%,#142f3b 100%);display:flex;justify-content:space-between;align-items:center;gap:12px}
      .lb{opacity:.92;font-size:15px}.big2{font-size:66px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:8px}.big2 span{font-size:26px;font-weight:600;margin-left:8px}.dt{opacity:.85}
      .pills{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.pills span{background:#ffffff1f;border-radius:99px;padding:9px 16px;font-size:14px}.ban svg{flex:none}
      @media (max-width:620px){.ban{padding:20px}.big2{font-size:50px}.ban svg{width:92px;height:auto;align-self:flex-start}.pills span{padding:7px 12px;font-size:13px}}
      .tl{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}@media (max-width:760px){.tl{grid-template-columns:1fr 1fr}}
      .tl .card{margin:0;border-left:4px solid var(--c);border-radius:18px;padding:12px 14px}.v{font-size:26px;font-weight:800;line-height:1.2}.v small{font-size:13px;font-weight:400;color:var(--secondary-text-color)}
      .all{display:grid;grid-template-columns:1fr;gap:12px}@media (min-width:760px){.all{grid-template-columns:repeat(3,1fr)}}
      .card{background:var(--card-background-color);border-radius:var(--ha-card-border-radius,16px);padding:16px;box-shadow:var(--ha-card-box-shadow,none);border:1px solid var(--divider-color,#8883)}.all .card{margin:0}
      .hd{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#fff;flex:none}.ic ha-icon{--mdc-icon-size:24px}.dev{display:flex;align-items:center;gap:12px}.dev b{font-size:18px}
      .st{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--secondary-text-color)}.st i{width:9px;height:9px;border-radius:50%;display:inline-block}
      .pill{font-size:12px;font-weight:600;padding:3px 9px;border-radius:99px}.ok{background:#13a97b26;color:#13a97b}.mid{background:#e9a41326;color:#c88a00}.no{background:#6f78e826;color:#6f78e8}
      .hero{display:flex;align-items:center;gap:16px;margin-top:8px}.donut{position:relative;width:96px;height:96px;flex:none}.donut svg{transform:rotate(-90deg)}
      .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.c b{font-size:22px;line-height:1}.c span,.mut,small{color:var(--secondary-text-color);font-size:12px}
      .leg{flex:1;display:grid;gap:8px}.leg div{display:flex;align-items:center;gap:8px}.leg strong{display:block;font-size:14px}.dot{width:12px;height:12px;border-radius:4px;flex:none}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}th{font-weight:400;color:var(--secondary-text-color);text-align:right}td{text-align:right;padding:3px 0}td:first-child,th:first-child{text-align:left}.sav{color:#13a97b}.run{margin-top:10px}
      .chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.chips button{border:1px solid var(--divider-color,#8883);background:var(--card-background-color);color:inherit;border-radius:99px;padding:5px 12px;cursor:pointer;font:inherit;font-size:14px}
      .chips button.on{background:#e9a413;color:#1b1500;border-color:#e9a413;font-weight:600}.cap{margin-top:6px}
      .chw{display:flex;gap:8px}.yax{display:flex;flex-direction:column;justify-content:space-between;height:110px;margin-top:16px;text-align:right;font-size:11px;color:var(--secondary-text-color);min-width:28px}
      .bars{flex:1;display:flex;align-items:flex-start;gap:3px;margin-top:2px}.bars>div{flex:1;min-width:0;text-align:center}.vl{font-size:10px;color:var(--secondary-text-color);height:14px;line-height:14px}
      .stack{display:flex;flex-direction:column-reverse;height:110px;border-radius:5px;overflow:hidden}.stack i,.cb i{display:flex;align-items:center;justify-content:center;font-size:10.5px;font-style:normal;overflow:hidden;white-space:nowrap}.stack i{width:100%}
      .lgd{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px;font-size:13px}.lgd i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
      .hid{display:flex;flex-direction:column;align-items:center;gap:1px;margin-top:3px}.hid span{font-size:10px;color:var(--secondary-text-color);white-space:nowrap}.hid i{display:inline-block;width:7px;height:7px;border-radius:2px;margin-right:3px}.hid2{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:4px}.hid2 span{font-size:11px;color:var(--secondary-text-color)}.hid2 i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px}.cl{display:flex;flex-wrap:wrap;align-items:center;gap:2px 14px;margin-top:6px;font-size:12px}.cl span{white-space:nowrap}.cl i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}.cl b{margin-left:auto;white-space:nowrap}.cmp{margin-top:12px;font-size:14px}.cmp .h{display:flex;justify-content:space-between;gap:8px;margin-bottom:5px}.cmp .h span:first-child{font-weight:600}
      .cb{display:flex;align-items:center;height:22px;border-radius:11px;overflow:hidden;background:var(--divider-color,#8883)}.cb i{height:100%}.cb .sm{padding-left:8px;font-size:12px;font-weight:600;white-space:nowrap}
    </style>
    <div class="bar"><ha-menu-button></ha-menu-button></div>
    <div class="w${this._edit ? " edit" : ""}"><div class="ph"><div class="logo"><ha-icon icon="mdi:flash"></ha-icon></div><div><h1>Gerätestrom</h1><div class="mut">Stromherkunft, Kosten und Ersparnis pro Gerät</div></div>
      <div class="acts">${this._edit ? '<button id="rs">Zurücksetzen</button>' : ""}<button id="ed">${this._edit ? "✓ Fertig" : "✏️ Anpassen"}</button></div></div>
    <div class="main">${main}</div></div>`;
    this._menu = this.shadowRoot.querySelector("ha-menu-button");
    if (this._menu) { this._menu.hass = this._hass; this._menu.narrow = this._narrow; }
  }
}
customElements.define("geraetestrom-panel", GeraetstromPanel);
