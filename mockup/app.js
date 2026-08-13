/* Gestión & Cuentas — interactive mockup (localStorage) */

const STORAGE_KEY = "gestion-cuentas-fran-v6";
const PREFS_KEY = "gestion-cuentas-fran-prefs-v1";
const DAY_MS = 86400000;

const FONT_STEPS = [
  { scale: 0.88, label: "Pequeño" },
  { scale: 1, label: "Normal" },
  { scale: 1.18, label: "Grande" },
  { scale: 1.36, label: "Muy grande" },
];

const THEME_PRESETS = {
  bosque: {
    name: "Bosque",
    meta: "Clásico",
    primary: "#1f3d2f",
    accent: "#4a7c59",
    mid: "#2f5d45",
    soft: "#e8f1ea",
    line: "#d5e0d4",
    bg: "#f3f6f1",
    bgDeep: "#e7eee4",
    berry: "#6b3d55",
  },
  oceano: {
    name: "Océano",
    meta: "Azul calma",
    primary: "#1a3a4a",
    accent: "#3d7ea6",
    mid: "#2a5670",
    soft: "#e4f0f6",
    line: "#c9dde8",
    bg: "#f2f6f8",
    bgDeep: "#e3ecef",
    berry: "#5a4a7a",
  },
  arena: {
    name: "Arena",
    meta: "Cálido",
    primary: "#5c4030",
    accent: "#c47a2a",
    mid: "#7a5540",
    soft: "#f6eee4",
    line: "#e6d7c6",
    bg: "#f7f2ea",
    bgDeep: "#ebe3d6",
    berry: "#8a4560",
  },
  uva: {
    name: "Uva",
    meta: "Suave",
    primary: "#3d2a45",
    accent: "#7a4d8a",
    mid: "#5a3d66",
    soft: "#f1e8f4",
    line: "#ddd0e2",
    bg: "#f6f2f7",
    bgDeep: "#ebe4ed",
    berry: "#6b3d55",
  },
  carbon: {
    name: "Carbón",
    meta: "Contraste",
    primary: "#222826",
    accent: "#5a7a68",
    mid: "#3a4842",
    soft: "#e8ece9",
    line: "#cfd5d2",
    bg: "#f0f2f1",
    bgDeep: "#e2e6e4",
    berry: "#704858",
  },
};

const RESOURCES = {
  inflables: [
    { id: "tobogan", name: "Tobogán arcoíris", icon: "🌈" },
    { id: "castillo", name: "Castillo inflable", icon: "🏰" },
    { id: "combo-mesas", name: "Air hockey + taca taca", icon: "🏒" },
    { id: "air-hockey", name: "Mesa air hockey", icon: "🎯" },
    { id: "taca-taca", name: "Taca taca", icon: "⚽" },
    { id: "candy-bar", name: "Candy bar", icon: "🍬" },
  ],
  cocteles: [
    { id: "dulce", name: "Cóctel dulce", icon: "🧁" },
    { id: "salado", name: "Cóctel salado", icon: "🥪" },
    { id: "mixto", name: "Mixto (dulce+salado)", icon: "🍾" },
  ],
};

const state = {
  weekOffset: 0,
  monthOffset: 0,
  selectedDayISO: null,
  inicioMode: "semana", // "semana" | "mes"
  inicioOffset: 0,
  data: null,
  user: null,
  prefs: {
    fontStep: 1,
    themeId: "bosque",
    primary: "#1f3d2f",
    accent: "#4a7c59",
  },
  expandedPlans: new Set(),
};

/* ---------- helpers ---------- */

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  return d;
}

function weekDates(offset = 0) {
  const base = startOfWeek(new Date());
  base.setDate(base.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

function formatMoney(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString("es-CL")}`;
}

function formatDayMonth(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function daysUntilLabel(iso, today = new Date()) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const days = Math.round((parseISO(iso) - start) / DAY_MS);
  if (days === 0) return "Es hoy";
  if (days === 1) return "Falta 1 día";
  if (days > 1) return `Faltan ${days} días`;
  if (days === -1) return "Fue ayer";
  return `Hace ${Math.abs(days)} días`;
}

function formatWeekRange(dates) {
  const a = dates[0];
  const b = dates[6];
  const sameMonth = a.getMonth() === b.getMonth();
  const opts = { day: "numeric", month: "long", year: "numeric" };
  if (sameMonth) {
    return `del ${a.getDate()} al ${b.toLocaleDateString("es-CL", opts)}`;
  }
  return `del ${a.toLocaleDateString("es-CL", { day: "numeric", month: "long" })} al ${b.toLocaleDateString("es-CL", opts)}`;
}

function resourceById(id) {
  return [...RESOURCES.inflables, ...RESOURCES.cocteles].find((r) => r.id === id);
}

function resourceIdsOf(res) {
  if (Array.isArray(res?.resourceIds) && res.resourceIds.length) {
    return res.resourceIds.filter((id) => resourceById(id));
  }
  if (res?.resourceId && resourceById(res.resourceId)) return [res.resourceId];
  return [];
}

function categoryOfIds(ids) {
  if (!ids.length) return "inflables";
  const hasInf = ids.some((id) => RESOURCES.inflables.some((r) => r.id === id));
  const hasCoc = ids.some((id) => RESOURCES.cocteles.some((r) => r.id === id));
  if (hasInf && hasCoc) return "mixto";
  if (hasCoc) return "cocteles";
  return "inflables";
}

function categoryOfResource(resourceId) {
  return categoryOfIds([resourceId]);
}

function resourcesLabel(res, { short = false } = {}) {
  const ids = resourceIdsOf(res);
  if (!ids.length) return "Sin ítem";
  const parts = ids.map((id) => {
    const r = resourceById(id);
    return short ? `${r.icon} ${r.name}` : `${r.icon} ${r.name}`;
  });
  return parts.join(" + ");
}

function resourcesIcons(res) {
  return resourceIdsOf(res).map((id) => resourceById(id)?.icon || "").join("");
}

function categoryTag(category) {
  if (category === "cocteles") return { className: "coctel", label: "Cóctel" };
  if (category === "mixto") return { className: "mixto", label: "Mixto" };
  return { className: "inflable", label: "Inflable" };
}

function isCoctelStyle(res) {
  const cat = res.category || categoryOfIds(resourceIdsOf(res));
  return cat === "cocteles" || cat === "mixto";
}

function saldo(res) {
  return Math.max(0, (res.total || 0) - (res.paid || 0));
}

function isPaid(res) {
  return saldo(res) <= 0 && (res.paid || 0) > 0;
}

function methodLabel(method) {
  if (method === "efectivo") return "EFECTIVO";
  if (method === "transferencia") return "TRANSF.";
  if (method === "pendiente") return "PENDIENTE";
  return "ABONO";
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => { el.hidden = true; }, 220);
  }, 2200);
}

/* ---------- storage ---------- */

function weekendDatesInRange(startISO, endISO) {
  const dates = [];
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 5 || dow === 6) dates.push(toISODate(new Date(d)));
  }
  return dates;
}

function seedWeekendReservations() {
  const clients = [
    "Familia Rojas", "Pérez", "Escuela Sur", "Sofía", "Cumple Leo",
    "Núñez", "Martínez", "González", "Castro", "Familia Díaz",
    "Cumple Ana", "Jardín Arcoíris", "López", "Silva", "Morales",
    "Familia Soto", "Cumple Tomás", "Herrera", "Paredes", "Fuentes",
  ];
  const catalog = [
    { resourceId: "castillo", category: "inflables", total: 180000 },
    { resourceId: "tobogan", category: "inflables", total: 150000 },
    { resourceId: "combo-mesas", category: "inflables", total: 80000 },
    { resourceId: "air-hockey", category: "inflables", total: 40000 },
    { resourceId: "taca-taca", category: "inflables", total: 40000 },
    { resourceId: "candy-bar", category: "inflables", total: 55000 },
    { resourceId: "dulce", category: "cocteles", total: 80000 },
    { resourceId: "salado", category: "cocteles", total: 60000 },
    { resourceId: "mixto", category: "cocteles", total: 100000 },
  ];
  const reservations = [];
  const dates = weekendDatesInRange("2026-06-01", "2026-08-31");

  dates.forEach((date, i) => {
    const dow = parseISO(date).getDay();
    const count = dow === 6 ? 3 : dow === 5 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const item = catalog[(i * 2 + k) % catalog.length];
      const client = clients[(i * 3 + k) % clients.length];
      const payKind = (i + k) % 6;
      let paid = item.total;
      let method = (i + k) % 2 === 0 ? "efectivo" : "transferencia";
      if (payKind === 0) {
        paid = 0;
        method = "pendiente";
      } else if (payKind === 3) {
        paid = Math.round(item.total / 2);
      }
      reservations.push({
        id: `r-${date}-${item.resourceId}-${k}`,
        category: item.category,
        resourceId: item.resourceId,
        resourceIds: [item.resourceId],
        date,
        client,
        phone: "",
        total: item.total,
        paid,
        method,
        notes: "",
      });
    }
  });

  // Ejemplos con varios ítems el mismo día
  const combos = [
    {
      date: "2026-08-15",
      client: "Familia combo",
      resourceIds: ["castillo", "taca-taca"],
      total: 220000,
      paid: 220000,
      method: "efectivo",
    },
    {
      date: "2026-07-18",
      client: "Cumple mixto",
      resourceIds: ["castillo", "dulce"],
      total: 260000,
      paid: 130000,
      method: "transferencia",
    },
    {
      date: "2026-06-21",
      client: "Fiesta patio",
      resourceIds: ["tobogan", "candy-bar", "salado"],
      total: 265000,
      paid: 0,
      method: "pendiente",
    },
  ];
  combos.forEach((c, i) => {
    reservations.push({
      id: `r-combo-${i}`,
      category: categoryOfIds(c.resourceIds),
      resourceId: c.resourceIds[0],
      resourceIds: c.resourceIds,
      date: c.date,
      client: c.client,
      phone: "",
      total: c.total,
      paid: c.paid,
      method: c.method,
      notes: "Varios ítems",
    });
  });

  return reservations;
}

function seedData() {
  const week = weekDates(0);
  return {
    reservations: [],
    bills: [],
    plans: [
      makePlan({
        title: "Castillo inflable",
        provider: "Compra en cuotas",
        category: "Equipo",
        amountEach: 58000,
        count: 12,
        paidCount: 10,
        // cuotas 11 y 12 pendientes: esta semana / próximo mes
        firstDue: toISODate(new Date(week[0].getFullYear(), week[0].getMonth() - 10, 15)),
      }),
      makePlan({
        title: "Tobogán arcoíris",
        provider: "Compra en cuotas",
        category: "Equipo",
        amountEach: 100000,
        count: 10,
        paidCount: 2,
        firstDue: toISODate(new Date(week[0].getFullYear(), week[0].getMonth() - 1, 15)),
      }),
    ],
  };
}

function makePlan({ title, provider, category, amountEach, count, paidCount, firstDue }) {
  const first = parseISO(firstDue);
  const installments = Array.from({ length: count }, (_, i) => {
    const due = new Date(first.getFullYear(), first.getMonth() + i, first.getDate());
    return {
      n: i + 1,
      due: toISODate(due),
      amount: amountEach,
      paid: i < paidCount,
    };
  });
  return {
    id: uid(),
    title,
    provider,
    category,
    total: amountEach * count,
    firstDue,
    installments,
  };
}

function normalizeReservation(r) {
  const resourceIds = resourceIdsOf(r);
  return {
    ...r,
    resourceIds,
    resourceId: resourceIds[0] || r.resourceId || "",
    category: categoryOfIds(resourceIds),
    address: r.address || "",
    comuna: r.comuna || "",
    comunaOtra: r.comunaOtra || "",
    deliveryFee: Number(r.deliveryFee) || 0,
    mapsUrl: r.mapsUrl || "",
  };
}

function comunaLabel(res) {
  if (!res?.comuna) return "";
  if (res.comuna === "Otro") return res.comunaOtra?.trim() || "Otro";
  return res.comuna;
}

function syncComunaOtraField(form) {
  const select = field(form, "comuna");
  const wrap = document.getElementById("field-comuna-otra");
  const otra = field(form, "comunaOtra");
  if (!select || !wrap || !otra) return;
  const isOtro = select.value === "Otro";
  wrap.classList.toggle("is-visible", isOtro);
  wrap.hidden = !isOtro;
  otra.disabled = !isOtro;
  if (!isOtro) otra.value = "";
}

function loadData() {
  return { reservations: [], bills: [], plans: [] };
}

function saveData() {
  /* persistencia vía Supabase en cada mutación */
}

async function persistReservation(r) {
  try {
    await window.GC_DB.dbUpsertReservation(r);
  } catch (err) {
    console.error(err);
    toast("No se pudo guardar la reserva en la nube");
  }
}

async function persistDeleteReservation(id) {
  try {
    await window.GC_DB.dbDeleteReservation(id);
  } catch (err) {
    console.error(err);
    toast("No se pudo eliminar en la nube");
  }
}

async function persistPlan(p) {
  try {
    await window.GC_DB.dbUpsertPlan(p);
  } catch (err) {
    console.error(err);
    toast("No se pudo guardar el plan en la nube");
  }
}

async function persistDeletePlan(id) {
  try {
    await window.GC_DB.dbDeletePlan(id);
  } catch (err) {
    console.error(err);
    toast("No se pudo eliminar el plan en la nube");
  }
}

function loadPrefs() {
  /* prefs vienen de Supabase tras login */
}

async function savePrefs() {
  try {
    await window.GC_DB.dbUpsertPrefs(state.prefs);
  } catch (err) {
    console.error(err);
    toast("No se pudieron guardar los ajustes");
  }
}

function mixHex(a, b, t) {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ra = parseInt(pa.slice(0, 2), 16);
  const ga = parseInt(pa.slice(2, 4), 16);
  const ba = parseInt(pa.slice(4, 6), 16);
  const rb = parseInt(pb.slice(0, 2), 16);
  const gb = parseInt(pb.slice(2, 4), 16);
  const bb = parseInt(pb.slice(4, 6), 16);
  const r = Math.round(ra + (rb - ra) * t);
  const g = Math.round(ga + (gb - ga) * t);
  const bl = Math.round(ba + (bb - ba) * t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function themeFromColors(primary, accent, base) {
  const preset = base || THEME_PRESETS.bosque;
  return {
    ...preset,
    primary,
    accent,
    mid: mixHex(primary, accent, 0.45),
    soft: mixHex(accent, "#ffffff", 0.88),
    line: mixHex(primary, "#ffffff", 0.82),
    bg: mixHex(primary, "#ffffff", 0.94),
    bgDeep: mixHex(primary, "#ffffff", 0.88),
  };
}

function activeThemeColors() {
  if (state.prefs.themeId === "custom") {
    return themeFromColors(state.prefs.primary, state.prefs.accent);
  }
  const preset = THEME_PRESETS[state.prefs.themeId] || THEME_PRESETS.bosque;
  return preset;
}

function applyThemeColors(theme) {
  const root = document.documentElement;
  root.style.setProperty("--green-900", theme.primary);
  root.style.setProperty("--green-700", theme.mid);
  root.style.setProperty("--green-500", theme.accent);
  root.style.setProperty("--green-200", mixHex(theme.accent, "#ffffff", 0.7));
  root.style.setProperty("--green-100", theme.soft);
  root.style.setProperty("--mint", mixHex(theme.soft, theme.accent, 0.12));
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--bg-deep", theme.bgDeep);
  root.style.setProperty("--line", theme.line);
  root.style.setProperty("--ink", mixHex(theme.primary, "#000000", 0.15));
  root.style.setProperty("--ink-soft", mixHex(theme.primary, "#7a8a80", 0.55));
  root.style.setProperty("--berry", theme.berry);
  root.style.setProperty("--berry-soft", mixHex(theme.berry, "#ffffff", 0.88));
  root.style.setProperty("--berry-card", mixHex(theme.berry, "#ffffff", 0.92));
  root.style.setProperty("--shadow", `0 10px 30px ${theme.primary}14`);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.primary);
}

function applyFontScale() {
  const step = FONT_STEPS[state.prefs.fontStep] || FONT_STEPS[1];
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(step.scale));
  // Forzar tamaño base del documento (más fiable que solo la variable)
  root.style.fontSize = `${(17 * step.scale).toFixed(2)}px`;
  root.dataset.fontStep = String(state.prefs.fontStep);

  const label = document.getElementById("font-size-label");
  if (label) label.textContent = step.label;
  const sample = document.getElementById("font-size-sample");
  if (sample) sample.textContent = step.label === "Normal" ? "Aa" : step.label === "Pequeño" ? "aa" : "AA";

  const smaller = document.getElementById("font-smaller");
  const larger = document.getElementById("font-larger");
  if (smaller) smaller.disabled = state.prefs.fontStep <= 0;
  if (larger) larger.disabled = state.prefs.fontStep >= FONT_STEPS.length - 1;
}

function applyPrefs() {
  applyFontScale();
  const theme = activeThemeColors();
  applyThemeColors(theme);
  const primaryInput = document.getElementById("color-primary");
  const accentInput = document.getElementById("color-accent");
  if (primaryInput) primaryInput.value = state.prefs.primary || theme.primary;
  if (accentInput) accentInput.value = state.prefs.accent || theme.accent;
}

function renderThemeGrid() {
  const grid = document.getElementById("theme-grid");
  if (!grid) return;
  grid.innerHTML = Object.entries(THEME_PRESETS).map(([id, theme]) => `
    <button type="button" class="theme-swatch${state.prefs.themeId === id ? " active" : ""}" data-theme="${id}" role="radio" aria-checked="${state.prefs.themeId === id}">
      <span class="theme-swatch-preview" aria-hidden="true">
        <span style="background:${theme.primary}"></span>
        <span style="background:${theme.accent}"></span>
        <span style="background:${theme.soft}"></span>
      </span>
      <span class="theme-swatch-name">${theme.name}</span>
      <span class="theme-swatch-meta">${theme.meta}</span>
    </button>
  `).join("");
}

function changeFontStep(delta) {
  const next = state.prefs.fontStep + delta;
  if (next < 0 || next >= FONT_STEPS.length) return;
  state.prefs.fontStep = next;
  savePrefs();
  applyFontScale();
  toast(`Texto: ${FONT_STEPS[next].label}`);
}

function setThemePreset(id) {
  const theme = THEME_PRESETS[id];
  if (!theme) return;
  state.prefs.themeId = id;
  state.prefs.primary = theme.primary;
  state.prefs.accent = theme.accent;
  savePrefs();
  applyPrefs();
  renderThemeGrid();
  toast(`Colores: ${theme.name}`);
}

function setCustomColors(primary, accent) {
  state.prefs.themeId = "custom";
  state.prefs.primary = primary;
  state.prefs.accent = accent;
  savePrefs();
  applyPrefs();
  renderThemeGrid();
}

/* ---------- render calendar ---------- */

function reservationsOnDate(dateISO) {
  return state.data.reservations
    .filter((r) => r.date === dateISO)
    .sort((a, b) => a.client.localeCompare(b.client, "es"));
}

function ensureSelectedDay() {
  const days = weekDates(state.weekOffset);
  const isos = days.map(toISODate);
  const todayISO = toISODate(new Date());
  if (state.selectedDayISO && isos.includes(state.selectedDayISO)) return;
  if (isos.includes(todayISO)) {
    state.selectedDayISO = todayISO;
    return;
  }
  state.selectedDayISO = isos[0];
}

function formatLongDay(iso) {
  const d = parseISO(iso);
  const weekday = d.toLocaleDateString("es-CL", { weekday: "long" });
  const dayMonth = d.toLocaleDateString("es-CL", { day: "numeric", month: "long" });
  const raw = `${weekday} ${dayMonth}`;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function visibleMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + state.monthOffset, 1);
}

function monthGridDates(offset = state.monthOffset) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function bookingBadge(b) {
  const paid = isPaid(b);
  const badgeClass = paid
    ? b.method === "efectivo" ? "cash" : "transfer"
    : b.paid > 0 ? "abono" : "pending";
  const badgeText = paid ? methodLabel(b.method) : (b.paid > 0 ? "ABONO" : "PENDIENTE");
  return { paid, badgeClass, badgeText };
}

function eyeSvg(open = true) {
  if (open) {
    return `<svg class="eye-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
  return `<svg class="eye-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

function editSvg() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
}

function methodPlain(method) {
  if (method === "efectivo") return "Efectivo";
  if (method === "transferencia") return "Transferencia";
  if (method === "pendiente") return "Sin pago aún";
  return method || "—";
}

function openVerReservaModal(id) {
  const b = state.data.reservations.find((r) => r.id === id);
  if (!b) return;
  const { paid, badgeText } = bookingBadge(b);
  const tag = categoryTag(b.category || categoryOfIds(resourceIdsOf(b)));
  const body = document.getElementById("ver-reserva-body");
  document.getElementById("ver-reserva-title").textContent = b.client || "Reserva";
  body.innerHTML = `
    <div class="view-chips">
      <span class="tag ${tag.className}">${tag.label}</span>
      <span class="pay-badge ${paid ? (b.method === "efectivo" ? "cash" : "transfer") : b.paid > 0 ? "abono" : "pending"}">${badgeText}</span>
    </div>
    <dl class="view-dl">
      <div><dt>Fecha</dt><dd>${escapeHtml(formatLongDay(b.date))}</dd></div>
      <div><dt>Cliente</dt><dd>${escapeHtml(b.client)}</dd></div>
      <div><dt>Teléfono</dt><dd>${escapeHtml(b.phone || "—")}</dd></div>
      <div><dt>Ítems</dt><dd>${escapeHtml(resourcesLabel(b))}</dd></div>
      <div><dt>Total</dt><dd>${formatMoney(b.total)}</dd></div>
      <div><dt>Abono</dt><dd>${formatMoney(b.paid || 0)}</dd></div>
      <div><dt>Saldo</dt><dd>${formatMoney(saldo(b))}</dd></div>
      <div><dt>Método</dt><dd>${escapeHtml(methodPlain(b.method))}</dd></div>
      <div><dt>Comuna</dt><dd>${escapeHtml(comunaLabel(b) || "—")}</dd></div>
      <div><dt>Instalación / entrega</dt><dd>${formatMoney(b.deliveryFee || 0)}</dd></div>
      <div class="full"><dt>Dirección</dt><dd>${escapeHtml(b.address || "—")}</dd></div>
      <div class="full"><dt>Google Maps</dt><dd>${
        b.mapsUrl
          ? `<a class="maps-link" href="${escapeHtml(b.mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir ubicación</a>`
          : "—"
      }</dd></div>
      <div class="full"><dt>Notas</dt><dd>${escapeHtml(b.notes || "Sin notas")}</dd></div>
    </dl>
  `;
  const editBtn = document.getElementById("btn-edit-from-view");
  editBtn.onclick = () => {
    closeDialog(document.getElementById("modal-ver-reserva"));
    openReservaModal({ id: b.id });
  };
  openDialog("modal-ver-reserva");
}

function openVerDiaModal(iso) {
  const bookings = reservationsOnDate(iso);
  const total = bookings.reduce((s, b) => s + b.total, 0);
  const cobrado = bookings.reduce((s, b) => s + Math.min(b.paid || 0, b.total || 0), 0);
  document.getElementById("ver-dia-title").textContent = formatLongDay(iso);
  document.getElementById("ver-dia-summary").innerHTML = `
    <span>${bookings.length} reserva${bookings.length === 1 ? "" : "s"}</span>
    <span>Total ${formatMoney(total)}</span>
    <span>Cobrado ${formatMoney(cobrado)}</span>
    <span>Por cobrar ${formatMoney(Math.max(0, total - cobrado))}</span>
  `;
  const body = document.getElementById("ver-dia-body");
  if (!bookings.length) {
    body.innerHTML = `<p class="day-empty">Sin reservas este día.</p>`;
  } else {
    body.innerHTML = bookings.map((b) => {
      const { paid, badgeClass, badgeText } = bookingBadge(b);
      return `
        <article class="day-detail-card ${paid ? "paid" : "pending"}${isCoctelStyle(b) ? " coctel" : ""}">
          <div class="day-detail-main">
            <div class="booking-row-items">${resourceIdsOf(b).map((id) => {
              const r = resourceById(id);
              return `<span class="item-pill">${escapeHtml(r?.icon || "")} ${escapeHtml(r?.name || "")}</span>`;
            }).join("")}</div>
            <strong>${escapeHtml(b.client)}</strong>
            <em>${formatMoney(b.total)}${b.paid > 0 && !paid ? ` · abono ${formatMoney(b.paid)}` : ""} · ${escapeHtml(methodPlain(b.method))}</em>
            ${b.notes ? `<p class="day-detail-notes">${escapeHtml(b.notes)}</p>` : ""}
          </div>
          <div class="day-detail-actions">
            <span class="pay-badge ${badgeClass}">${badgeText}</span>
            <button type="button" class="icon-action" data-view-res="${b.id}" aria-label="Ver reserva" title="Ver">${eyeSvg(true)}</button>
            <button type="button" class="icon-action" data-edit-res="${b.id}" aria-label="Editar reserva" title="Editar">${editSvg()}</button>
          </div>
        </article>`;
    }).join("");
  }
  const addBtn = document.getElementById("btn-add-from-day");
  addBtn.onclick = () => {
    closeDialog(document.getElementById("modal-ver-dia"));
    openReservaModal({ date: iso });
  };
  openDialog("modal-ver-dia");
}

function renderMonthBoard() {
  const board = document.getElementById("month-board");
  if (!board) return;
  const month = visibleMonth();
  const monthIndex = month.getMonth();
  const todayISO = toISODate(new Date());
  const dates = monthGridDates();
  const frag = document.createDocumentFragment();

  dates.forEach((d) => {
    const iso = toISODate(d);
    const inMonth = d.getMonth() === monthIndex;
    const bookings = inMonth ? reservationsOnDate(iso) : [];
    const cell = document.createElement("div");
    cell.className = `month-cell${inMonth ? "" : " outside"}${iso === todayISO ? " today" : ""}`;

    const head = document.createElement("div");
    head.className = "month-cell-head";
    const headLeft = document.createElement("div");
    headLeft.className = "month-cell-head-left";
    headLeft.innerHTML = `<strong>${d.getDate()}</strong>`;
    if (inMonth && bookings.length) {
      headLeft.innerHTML += `<em>${bookings.length} · ${formatMoney(bookings.reduce((s, b) => s + b.total, 0))}</em>`;
    }
    head.appendChild(headLeft);
    if (inMonth) {
      const dayEye = document.createElement("button");
      dayEye.type = "button";
      dayEye.className = "eye-btn eye-btn-sm";
      dayEye.title = "Ver día completo";
      dayEye.setAttribute("aria-label", `Ver ${formatLongDay(iso)}`);
      dayEye.innerHTML = eyeSvg(true);
      dayEye.addEventListener("click", (e) => {
        e.stopPropagation();
        openVerDiaModal(iso);
      });
      head.appendChild(dayEye);
    }
    cell.appendChild(head);

    const list = document.createElement("div");
    list.className = "month-cell-list";

    if (inMonth) {
      bookings.forEach((b) => {
        const label = resourcesLabel(b);
        const { paid, badgeClass, badgeText } = bookingBadge(b);
        const card = document.createElement("div");
        card.className = `month-event ${paid ? "paid" : "pending"}${isCoctelStyle(b) ? " coctel" : ""}`;
        card.title = `${label} · ${b.client} · ${formatMoney(b.total)} · ${badgeText}`;
        card.innerHTML = `
          <div class="month-event-main">
            <span class="month-event-name">${escapeHtml(b.client)}</span>
            <span class="month-event-meta">${escapeHtml(resourcesIcons(b))} ${escapeHtml(resourceIdsOf(b).length > 1 ? `· ${resourceIdsOf(b).length}` : "")} ${formatMoney(b.total)}</span>
            <span class="pay-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="month-event-actions">
            <button type="button" class="icon-action" data-view-res="${b.id}" aria-label="Ver reserva" title="Ver">${eyeSvg(true)}</button>
            <button type="button" class="icon-action" data-edit-res="${b.id}" aria-label="Editar reserva" title="Editar">${editSvg()}</button>
          </div>
        `;
        list.appendChild(card);
      });

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "month-add";
      addBtn.innerHTML = "+";
      addBtn.title = "Agregar reserva";
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openReservaModal({ date: iso });
      });
      list.appendChild(addBtn);
    }

    cell.appendChild(list);
    frag.appendChild(cell);
  });

  board.replaceChildren(frag);
}

function renderDayBoard() {
  ensureSelectedDay();
  renderMonthBoard();

  const strip = document.getElementById("day-strip");
  const title = document.getElementById("day-title");
  const summary = document.getElementById("day-summary");
  const list = document.getElementById("day-list");
  if (!strip || !title || !list) return;

  const days = weekDates(state.weekOffset);
  const letters = ["L", "M", "X", "J", "V", "S", "D"];
  const frag = document.createDocumentFragment();

  days.forEach((d, i) => {
    const iso = toISODate(d);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `day-chip${iso === state.selectedDayISO ? " active" : ""}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", iso === state.selectedDayISO ? "true" : "false");
    btn.innerHTML = `<span>${letters[i]}</span><strong>${d.getDate()}</strong>`;
    btn.addEventListener("click", () => {
      state.selectedDayISO = iso;
      renderDayBoard();
    });
    frag.appendChild(btn);
  });
  strip.replaceChildren(frag);

  const selectedISO = state.selectedDayISO;
  title.textContent = formatLongDay(selectedISO);

  const viewDayBtn = document.getElementById("btn-view-day");
  if (viewDayBtn) {
    viewDayBtn.onclick = () => openVerDiaModal(selectedISO);
  }

  const bookings = reservationsOnDate(selectedISO);
  const total = bookings.reduce((s, b) => s + b.total, 0);
  const cobrado = bookings.reduce((s, b) => s + Math.min(b.paid || 0, b.total || 0), 0);
  if (summary) {
    summary.innerHTML = `
      <span>${bookings.length} reserva${bookings.length === 1 ? "" : "s"}</span>
      <span>Total ${formatMoney(total)}</span>
      <span>Cobrado ${formatMoney(cobrado)}</span>
    `;
  }

  const listFrag = document.createDocumentFragment();
  if (bookings.length === 0) {
    const empty = document.createElement("div");
    empty.className = "day-empty";
    empty.textContent = "Sin reservas este día.";
    listFrag.appendChild(empty);
  } else {
    bookings.forEach((b) => {
      const { paid, badgeClass, badgeText } = bookingBadge(b);
      const card = document.createElement("div");
      card.className = `booking-row ${paid ? "paid" : "pending"}${isCoctelStyle(b) ? " coctel" : ""}`;
      card.innerHTML = `
        <div class="booking-row-main">
          <div class="booking-row-items">${resourceIdsOf(b).map((id) => {
            const r = resourceById(id);
            return `<span class="item-pill">${escapeHtml(r?.icon || "")} ${escapeHtml(r?.name || "")}</span>`;
          }).join("")}</div>
          <strong>${escapeHtml(b.client)}</strong>
          <em>${formatMoney(b.total)}${b.paid > 0 && !paid ? ` · abono ${formatMoney(b.paid)}` : ""}</em>
        </div>
        <div class="booking-row-actions">
          <span class="pay-badge ${badgeClass}">${badgeText}</span>
          <button type="button" class="icon-action" data-view-res="${b.id}" aria-label="Ver reserva" title="Ver">${eyeSvg(true)}</button>
          <button type="button" class="icon-action" data-edit-res="${b.id}" aria-label="Editar reserva" title="Editar">${editSvg()}</button>
        </div>
      `;
      listFrag.appendChild(card);
    });
  }

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "day-add-slot";
  addBtn.innerHTML = "<span>+</span> Agregar";
  addBtn.addEventListener("click", () => openReservaModal({ date: selectedISO }));
  listFrag.appendChild(addBtn);

  list.replaceChildren(listFrag);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderWeekLabels() {
  const dates = weekDates(state.weekOffset);
  const range = formatWeekRange(dates);
  const weekHtml = `<span>Semana</span> ${range}`;
  const weekLabel = document.getElementById("week-label-calendario");
  if (weekLabel) weekLabel.innerHTML = weekHtml;

  const month = visibleMonth();
  const monthName = month.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  const monthHtml = `<span>Mes</span> ${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`;
  const monthLabel = document.getElementById("month-label-calendario");
  if (monthLabel) monthLabel.innerHTML = monthHtml;
}

function inicioPeriodRange() {
  if (state.inicioMode === "mes") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + state.inicioOffset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const label = start.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    const shortLabel = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      start: toISODate(start),
      end: toISODate(end),
      title: shortLabel,
      chip: "Este mes",
      periodWord: "mes",
    };
  }
  const days = weekDates(state.inicioOffset);
  const range = formatWeekRange(days);
  return {
    start: toISODate(days[0]),
    end: toISODate(days[6]),
    title: `Semana ${range}`,
    chip: "Esta semana",
    periodWord: "semana",
  };
}

/* ---------- inicio ---------- */

function renderInicio() {
  const period = inicioPeriodRange();
  const { start, end } = period;
  const periodRes = state.data.reservations.filter((r) => r.date >= start && r.date <= end);

  const cobradoTransfer = periodRes
    .filter((r) => r.method === "transferencia")
    .reduce((s, r) => s + Math.min(r.paid || 0, r.total || 0), 0);
  const cobradoEfectivo = periodRes
    .filter((r) => r.method === "efectivo")
    .reduce((s, r) => s + Math.min(r.paid || 0, r.total || 0), 0);
  const ingresos = periodRes.reduce((s, r) => s + Math.min(r.paid || 0, r.total || 0), 0);
  const porCobrar = periodRes.reduce((s, r) => s + saldo(r), 0);
  const entregas = periodRes.reduce((s, r) => s + (Number(r.deliveryFee) || 0), 0);

  const nextCuotas = state.data.plans.flatMap((p) =>
    p.installments
      .filter((c) => !c.paid)
      .map((c) => ({
        ...c,
        title: p.title,
        provider: p.provider || "",
        planTotal: p.installments.length,
      }))
  );
  const cuotasPorPagarTotal = nextCuotas.reduce((s, c) => s + c.amount, 0);
  const cuotasPendientesCount = nextCuotas.length;
  const cuotaPromedio = cuotasPendientesCount
    ? Math.round(cuotasPorPagarTotal / cuotasPendientesCount)
    : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 5);
  const horizonISO = toISODate(horizon);

  const cuotasAlerta = nextCuotas
    .filter((c) => c.due <= horizonISO)
    .sort((a, b) => a.due.localeCompare(b.due));

  const titleEl = document.getElementById("inicio-period-title");
  if (titleEl) titleEl.textContent = period.title;

  document.getElementById("inicio-kpis").innerHTML = `
    <article class="kpi">
      <p class="kpi-label">Ingresos por transferencia</p>
      <p class="kpi-value">${formatMoney(cobradoTransfer)}</p>
      <p class="kpi-meta">Cobrado en el ${period.periodWord}</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">Ingresos por efectivo</p>
      <p class="kpi-value">${formatMoney(cobradoEfectivo)}</p>
      <p class="kpi-meta">Cobrado en el ${period.periodWord}</p>
    </article>
    <article class="kpi highlight">
      <p class="kpi-label">Cantidad total de reservas</p>
      <p class="kpi-value">${periodRes.length}</p>
      <p class="kpi-meta">${period.chip}</p>
    </article>
  `;

  document.getElementById("inicio-kpis-sec").innerHTML = `
    <article class="kpi">
      <p class="kpi-label">Total cobrado</p>
      <p class="kpi-value">${formatMoney(ingresos)}</p>
      <p class="kpi-meta">Transferencia + efectivo + otros</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">Total recibido por entregas</p>
      <p class="kpi-value">${formatMoney(entregas)}</p>
      <p class="kpi-meta">Instalación / entrega del ${period.periodWord}</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">Por cobrar</p>
      <p class="kpi-value accent-warn">${formatMoney(porCobrar)}</p>
      <p class="kpi-meta">Saldo de clientes</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">Cuotas por pagar</p>
      <p class="kpi-value accent-debt">${formatMoney(cuotasPorPagarTotal)}</p>
      <p class="kpi-meta">${cuotasPendientesCount} cuota${cuotasPendientesCount === 1 ? "" : "s"} pendiente${cuotasPendientesCount === 1 ? "" : "s"}${cuotasPendientesCount ? ` · ≈ ${formatMoney(cuotaPromedio)}` : ""}</p>
    </article>
  `;

  const timeline = document.getElementById("inicio-timeline");
  const todayISO = toISODate(today);
  const upcoming = state.data.reservations
    .filter((r) => r.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.client.localeCompare(b.client));
  const proximasChip = document.getElementById("inicio-proximas-chip");
  if (proximasChip) {
    proximasChip.textContent = upcoming.length
      ? `${Math.min(upcoming.length, 8)}${upcoming.length > 8 ? "+" : ""} próxima${upcoming.length === 1 ? "" : "s"}`
      : "Sin próximas";
  }
  if (upcoming.length === 0) {
    timeline.innerHTML = `<li class="empty-state">No hay próximas reservas. <button type="button" class="linkish" data-goto="calendario">Crear una</button></li>`;
  } else {
    timeline.innerHTML = upcoming.slice(0, 8).map((r) => {
      const label = resourcesLabel(r);
      const tag = categoryTag(r.category || categoryOfIds(resourceIdsOf(r)));
      const status = isPaid(r)
        ? `Pagado ${formatMoney(r.total)}`
        : r.paid > 0
          ? `Abono ${formatMoney(r.paid)} / ${formatMoney(r.total)}`
          : `Pendiente ${formatMoney(r.total)}`;
      const methodMeta = r.method === "efectivo"
        ? "Efectivo"
        : r.method === "transferencia"
          ? "Transferencia"
          : "Sin pago";
      const when = daysUntilLabel(r.date, today);
      return `
        <li>
          <span class="dot ${isPaid(r) ? "paid" : "pending"}"></span>
          <div>
            <strong>${escapeHtml(label)} · ${escapeHtml(r.client)}</strong>
            <p><span class="when-label">${escapeHtml(when)}</span> · ${status} · ${methodMeta}</p>
          </div>
          <div class="timeline-end">
            <span class="tag ${tag.className}">${tag.label}</span>
            <button type="button" class="icon-action" data-view-res="${r.id}" aria-label="Ver reserva" title="Ver">${eyeSvg(true)}</button>
          </div>
        </li>`;
    }).join("");
  }

  const alerts = [];

  cuotasAlerta.forEach((c) => {
    const daysLeft = Math.round((parseISO(c.due) - today) / DAY_MS);
    const when =
      daysLeft < 0
        ? `vencida hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) === 1 ? "" : "s"}`
        : daysLeft === 0
          ? "vence hoy"
          : daysLeft === 1
            ? "vence mañana"
            : `vence en ${daysLeft} días`;
    alerts.push({
      type: daysLeft < 0 ? "debt" : "warn",
      title: daysLeft < 0
        ? `Cuota ${c.n} vencida · ${c.title}`
        : `Pronto se debe pagar la cuota ${c.n}`,
      body: `${c.title}${c.provider ? ` · ${c.provider}` : ""} · ${formatMoney(c.amount)} · ${formatDayMonth(c.due)} (${when}) · cuota ${c.n} de ${c.planTotal}`,
      priority: daysLeft < 0 ? 0 : 1,
    });
  });

  periodRes.filter((r) => saldo(r) > 0).forEach((r) => {
    alerts.push({
      type: "warn",
      title: "Abono / saldo pendiente",
      body: `${r.client} — saldo ${formatMoney(saldo(r))} · ${resourcesLabel(r)} (${formatDayMonth(r.date)})`,
      priority: 2,
    });
  });

  alerts.sort((a, b) => a.priority - b.priority);

  if (alerts.length === 0) {
    alerts.push({ type: "ok", title: "Todo al día", body: "No hay alertas de cobro ni cuotas por vencer en los próximos 5 días." });
  }

  document.getElementById("inicio-alerts").innerHTML = alerts.slice(0, 8).map((a) => `
    <li class="alert ${a.type}">
      <strong>${escapeHtml(a.title)}</strong>
      <p>${escapeHtml(a.body)}</p>
    </li>
  `).join("");
}

/* ---------- plans ---------- */

function renderPlans() {
  const wrap = document.getElementById("plans-list");
  if (state.data.plans.length === 0) {
    wrap.innerHTML = `<p class="empty-state">No hay planes de cuotas. Crea uno para deudas grandes.</p>`;
    return;
  }

  wrap.innerHTML = state.data.plans.map((p) => {
    const paidCount = p.installments.filter((c) => c.paid).length;
    const paidSum = p.installments.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0);
    const pct = Math.round((paidSum / p.total) * 100);
    const next = p.installments.find((c) => !c.paid);
    const expanded = state.expandedPlans.has(p.id);
    const nextLine = next
      ? `Próxima: cuota ${next.n} · ${formatDayMonth(next.due)} · ${formatMoney(next.amount)}`
      : "Plan completo · todas las cuotas pagadas";

    return `
      <article class="panel installment${expanded ? " is-expanded" : " is-collapsed"}" data-plan-id="${p.id}">
        <div class="panel-head">
          <div>
            <p class="eyebrow">${escapeHtml(p.category || "Plan")}</p>
            <h2>${escapeHtml(p.title)}</h2>
            <p class="muted">${escapeHtml(p.provider || "")} · Total ${formatMoney(p.total)}</p>
          </div>
          <div class="plan-head-actions">
            <button
              type="button"
              class="eye-btn"
              data-toggle-plan="${p.id}"
              aria-expanded="${expanded ? "true" : "false"}"
              aria-label="${expanded ? "Ocultar detalle de cuotas" : "Ver detalle de cuotas"}"
              title="${expanded ? "Ocultar cuotas" : "Ver cuotas"}"
            >
              <svg class="eye-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${expanded
                  ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
                  : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`}
              </svg>
            </button>
            <span class="chip">${paidCount} de ${p.installments.length}</span>
          </div>
        </div>
        <div class="progress"><div class="progress-bar" style="--p:${pct}%"></div></div>
        <p class="progress-label">Pagado ${formatMoney(paidSum)} · Resta ${formatMoney(p.total - paidSum)}</p>
        <p class="plan-next-line">${nextLine}</p>

        <div class="plan-detail" ${expanded ? "" : "hidden"}>
          <p class="cuota-hint">Clic en una cuota para editar fecha o marcar pagada / pendiente</p>
          <ul class="cuota-list">
            ${p.installments.map((c) => {
              const cls = c.paid ? "done" : next && next.n === c.n ? "next" : "";
              const st = c.paid ? "paid" : next && next.n === c.n ? "pending" : "muted";
              const label = c.paid ? "Pagada" : next && next.n === c.n ? "Próxima" : "Pendiente";
              return `<li class="cuota-row ${cls}" data-edit-cuota="${p.id}" data-cuota-n="${c.n}" title="Editar cuota ${c.n}">
                <span>Cuota ${c.n}</span>
                <span>${formatDayMonth(c.due)}</span>
                <span>${formatMoney(c.amount)}</span>
                <span class="status ${st}">${label}</span>
              </li>`;
            }).join("")}
          </ul>
        </div>

        <div class="bill-actions" style="justify-content:space-between">
          <button type="button" class="btn danger ghost sm" data-delete-plan="${p.id}">Eliminar plan</button>
          ${next ? `<button type="button" class="btn primary" data-pay-cuota="${p.id}">Pagar cuota ${next.n}</button>` : `<span class="status paid">Plan completo</span>`}
        </div>
      </article>`;
  }).join("");
}

/* ---------- full render ---------- */

function renderAll() {
  renderWeekLabels();
  renderDayBoard();
  renderInicio();
  renderPlans();
  renderThemeGrid();
  applyFontScale();
}

/* ---------- modals ---------- */

function openDialog(id) {
  const dlg = document.getElementById(id);
  if (typeof dlg.showModal === "function") dlg.showModal();
  else dlg.setAttribute("open", "");
}

function closeDialog(dlg) {
  if (typeof dlg.close === "function") dlg.close();
  else dlg.removeAttribute("open");
}

function fillResourcePicks(selectedIds = []) {
  const wrap = document.getElementById("resource-picks");
  if (!wrap) return;
  const selected = new Set(selectedIds);
  const groups = [
    { label: "Juegos e ítems", items: RESOURCES.inflables },
    { label: "Cócteles", items: RESOURCES.cocteles },
  ];
  wrap.innerHTML = `
    <div class="resource-summary" id="resource-summary" hidden></div>
    ${groups.map((g) => `
      <section class="resource-group">
        <p class="resource-group-label">${g.label}</p>
        <div class="resource-grid">
          ${g.items.map((r) => `
            <label class="resource-tile">
              <input type="checkbox" name="resourceIds" value="${r.id}" ${selected.has(r.id) ? "checked" : ""} />
              <span class="resource-tile-face">
                <span class="resource-tile-icon" aria-hidden="true">${r.icon}</span>
                <span class="resource-tile-name">${escapeHtml(r.name)}</span>
                <span class="resource-tile-mark" aria-hidden="true"></span>
              </span>
            </label>
          `).join("")}
        </div>
      </section>
    `).join("")}
  `;
  wrap.querySelectorAll('input[name="resourceIds"]').forEach((input) => {
    input.addEventListener("change", () => updateResourceSummary(wrap.closest("form") || document.getElementById("form-reserva")));
  });
  updateResourceSummary(document.getElementById("form-reserva"));
}

function updateResourceSummary(form) {
  const summary = document.getElementById("resource-summary");
  if (!summary || !form) return;
  const ids = selectedResourceIds(form);
  if (!ids.length) {
    summary.hidden = true;
    summary.innerHTML = "";
    return;
  }
  const cat = categoryOfIds(ids);
  const tag = categoryTag(cat);
  summary.hidden = false;
  summary.innerHTML = `
    <div class="resource-summary-main">
      <p class="resource-summary-kicker">Pack del evento</p>
      <p class="resource-summary-list">${escapeHtml(resourcesLabel({ resourceIds: ids }))}</p>
    </div>
    <span class="tag ${tag.className}">${ids.length} ítem${ids.length === 1 ? "" : "s"} · ${tag.label}</span>
  `;
}

function selectedResourceIds(form) {
  return Array.from(form.querySelectorAll('input[name="resourceIds"]:checked')).map((el) => el.value);
}

function updateSaldoHint(form) {
  const total = Number(field(form, "total").value) || 0;
  const paid = Number(field(form, "paid").value) || 0;
  const hint = document.getElementById("reserva-saldo-hint");
  const s = Math.max(0, total - paid);
  if (total <= 0) {
    hint.textContent = "";
    return;
  }
  if (s === 0) hint.textContent = "Estado: pagado completo.";
  else if (paid === 0) hint.textContent = `Estado: pendiente · saldo ${formatMoney(s)}.`;
  else hint.textContent = `Estado: con abono · saldo ${formatMoney(s)}.`;
}

function field(form, name) {
  return form.elements.namedItem(name);
}

function openReservaModal(opts = {}) {
  const form = document.getElementById("form-reserva");
  const delBtn = document.getElementById("btn-delete-reserva");
  form.reset();

  let reservation = null;
  if (opts.id) {
    reservation = state.data.reservations.find((r) => r.id === opts.id);
  }

  const selectedIds = reservation
    ? resourceIdsOf(reservation)
    : opts.resourceIds || (opts.resourceId ? [opts.resourceId] : ["castillo"]);

  field(form, "id").value = reservation?.id || "";
  fillResourcePicks(selectedIds);
  field(form, "date").value = reservation?.date || opts.date || toISODate(new Date());
  field(form, "client").value = reservation?.client || "";
  field(form, "phone").value = reservation?.phone || "";
  field(form, "total").value = reservation?.total ?? "";
  field(form, "paid").value = reservation?.paid ?? 0;
  field(form, "method").value = reservation?.method || "transferencia";
  field(form, "comuna").value = reservation?.comuna || "";
  field(form, "comunaOtra").value = reservation?.comunaOtra || "";
  field(form, "address").value = reservation?.address || "";
  field(form, "deliveryFee").value = reservation?.deliveryFee ?? 0;
  field(form, "mapsUrl").value = reservation?.mapsUrl || "";
  field(form, "notes").value = reservation?.notes || "";
  syncComunaOtraField(form);

  document.getElementById("reserva-modal-eyebrow").textContent = "Calendario";
  document.getElementById("reserva-modal-title").textContent =
    reservation ? "Editar reserva" : "Nueva reserva";
  delBtn.hidden = !reservation;
  updateSaldoHint(form);
  openDialog("modal-reserva");
  field(form, "client").focus();
}

/* ---------- actions ---------- */

function saveReservation(form) {
  const resourceIds = selectedResourceIds(form);
  if (!resourceIds.length) {
    toast("Elige al menos un ítem");
    return false;
  }
  const comuna = field(form, "comuna").value;
  const comunaOtra = field(form, "comunaOtra").value.trim();
  if (comuna === "Otro" && !comunaOtra) {
    toast("Escribe la comuna en Otro");
    return false;
  }
  const payload = {
    id: field(form, "id").value || uid(),
    category: categoryOfIds(resourceIds),
    resourceId: resourceIds[0],
    resourceIds,
    date: field(form, "date").value,
    client: field(form, "client").value.trim(),
    phone: field(form, "phone").value.trim(),
    total: Number(field(form, "total").value) || 0,
    paid: Number(field(form, "paid").value) || 0,
    method: field(form, "method").value,
    address: field(form, "address").value.trim(),
    comuna,
    comunaOtra: comuna === "Otro" ? comunaOtra : "",
    deliveryFee: Number(field(form, "deliveryFee").value) || 0,
    mapsUrl: field(form, "mapsUrl").value.trim(),
    notes: field(form, "notes").value.trim(),
  };
  if (!payload.client || !payload.date || payload.total < 0) {
    toast("Completa cliente, fecha y total");
    return false;
  }
  if (payload.paid > payload.total) payload.paid = payload.total;

  const idx = state.data.reservations.findIndex((r) => r.id === payload.id);
  if (idx >= 0) state.data.reservations[idx] = payload;
  else state.data.reservations.push(payload);

  state.selectedDayISO = payload.date;
  const target = parseISO(payload.date);
  const targetMonday = startOfWeek(target);
  const currentMonday = startOfWeek(new Date());
  state.weekOffset = Math.round((targetMonday - currentMonday) / (7 * 24 * 60 * 60 * 1000));
  const now = new Date();
  state.monthOffset =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());

  saveData();
  renderAll();
  toast(idx >= 0 ? "Reserva actualizada" : "Reserva creada");
  persistReservation(payload);
  return true;
}

function deleteReservation(id) {
  if (!confirm("¿Eliminar esta reserva?")) return;
  state.data.reservations = state.data.reservations.filter((r) => r.id !== id);
  saveData();
  renderAll();
  toast("Reserva eliminada");
  persistDeleteReservation(id);
}

function addPlan(form) {
  const total = Number(field(form, "total").value) || 0;
  const n = Number(field(form, "installments").value) || 2;
  const each = Math.floor(total / n);
  const remainder = total - each * n;
  const first = parseISO(field(form, "firstDue").value);
  const installments = Array.from({ length: n }, (_, i) => {
    const due = new Date(first);
    due.setMonth(first.getMonth() + i);
    return {
      n: i + 1,
      due: toISODate(due),
      amount: each + (i === n - 1 ? remainder : 0),
      paid: false,
    };
  });
  const plan = {
    id: uid(),
    title: field(form, "title").value.trim(),
    provider: field(form, "provider").value.trim(),
    category: field(form, "category").value.trim() || "Plan",
    total,
    firstDue: field(form, "firstDue").value,
    installments,
  };
  state.data.plans.unshift(plan);
  saveData();
  renderAll();
  toast("Plan de cuotas creado");
  persistPlan(plan);
  return true;
}

function payCuota(planId) {
  const p = state.data.plans.find((x) => x.id === planId);
  if (!p) return;
  const next = p.installments.find((c) => !c.paid);
  if (!next) return;
  next.paid = true;
  saveData();
  renderAll();
  toast(`Cuota ${next.n} pagada`);
  persistPlan(p);
}

function openCuotaModal(planId, n) {
  const plan = state.data.plans.find((p) => p.id === planId);
  if (!plan) return;
  const cuota = plan.installments.find((c) => c.n === Number(n));
  if (!cuota) return;
  const form = document.getElementById("form-cuota");
  field(form, "planId").value = planId;
  field(form, "n").value = String(cuota.n);
  field(form, "due").value = cuota.due;
  field(form, "paid").value = cuota.paid ? "true" : "false";
  field(form, "amount").value = cuota.amount;
  document.getElementById("cuota-modal-eyebrow").textContent = plan.title;
  document.getElementById("cuota-modal-title").textContent = `Editar cuota ${cuota.n}`;
  openDialog("modal-cuota");
}

function saveCuota(form) {
  const planId = field(form, "planId").value;
  const n = Number(field(form, "n").value);
  const plan = state.data.plans.find((p) => p.id === planId);
  if (!plan) return false;
  const cuota = plan.installments.find((c) => c.n === n);
  if (!cuota) return false;

  cuota.due = field(form, "due").value;
  cuota.paid = field(form, "paid").value === "true";
  cuota.amount = Number(field(form, "amount").value) || 0;
  plan.total = plan.installments.reduce((s, c) => s + c.amount, 0);

  saveData();
  renderAll();
  toast(`Cuota ${n} actualizada`);
  persistPlan(plan);
  return true;
}

function deletePlan(id) {
  if (!confirm("¿Eliminar este plan de cuotas?")) return;
  state.data.plans = state.data.plans.filter((p) => p.id !== id);
  saveData();
  renderAll();
  toast("Plan eliminado");
  persistDeletePlan(id);
}

/* ---------- navigation & events ---------- */

function showView(id) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${id}`);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === id);
  });
  const main = document.querySelector(".main");
  if (main && window.matchMedia("(max-width: 860px)").matches) {
    main.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => showView(item.dataset.view));
  });

  document.querySelectorAll("[data-week]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.weekOffset += Number(btn.dataset.week);
      state.selectedDayISO = null;
      renderAll();
    });
  });

  document.querySelectorAll("[data-month]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.monthOffset += Number(btn.dataset.month);
      renderAll();
    });
  });

  document.getElementById("inicio-mode").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-inicio-mode]");
    if (!btn) return;
    state.inicioMode = btn.dataset.inicioMode;
    state.inicioOffset = 0;
    document.querySelectorAll("#inicio-mode .seg-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
    renderInicio();
  });

  document.getElementById("inicio-prev").addEventListener("click", () => {
    state.inicioOffset -= 1;
    renderInicio();
  });
  document.getElementById("inicio-next").addEventListener("click", () => {
    state.inicioOffset += 1;
    renderInicio();
  });

  document.getElementById("btn-new-reserva").addEventListener("click", () => {
    ensureSelectedDay();
    openReservaModal({ date: state.selectedDayISO || toISODate(weekDates(state.weekOffset)[0]) });
  });
  const formReserva = document.getElementById("form-reserva");
  field(formReserva, "total").addEventListener("input", () => updateSaldoHint(formReserva));
  field(formReserva, "paid").addEventListener("input", () => updateSaldoHint(formReserva));
  field(formReserva, "comuna").addEventListener("change", () => syncComunaOtraField(formReserva));
  formReserva.addEventListener("submit", (e) => {
    e.preventDefault();
    if (saveReservation(formReserva)) closeDialog(formReserva.closest("dialog"));
  });
  document.getElementById("btn-delete-reserva").addEventListener("click", () => {
    const id = field(formReserva, "id").value;
    if (!id) return;
    deleteReservation(id);
    closeDialog(formReserva.closest("dialog"));
  });

  document.getElementById("form-plan").addEventListener("submit", (e) => {
    e.preventDefault();
    if (addPlan(e.currentTarget)) closeDialog(e.currentTarget.closest("dialog"));
  });

  document.getElementById("form-cuota").addEventListener("submit", (e) => {
    e.preventDefault();
    if (saveCuota(e.currentTarget)) closeDialog(e.currentTarget.closest("dialog"));
  });

  document.getElementById("btn-new-plan").addEventListener("click", () => {
    const form = document.getElementById("form-plan");
    form.reset();
    field(form, "installments").value = 4;
    field(form, "firstDue").value = toISODate(new Date());
    openDialog("modal-plan");
  });

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeDialog(btn.closest("dialog")));
  });

  document.querySelectorAll("dialog.modal").forEach((dlg) => {
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) closeDialog(dlg);
    });
  });

  document.body.addEventListener("click", (e) => {
    const togglePlan = e.target.closest("[data-toggle-plan]");
    if (togglePlan) {
      const id = togglePlan.dataset.togglePlan;
      if (state.expandedPlans.has(id)) state.expandedPlans.delete(id);
      else state.expandedPlans.add(id);
      renderPlans();
      return;
    }
    const viewRes = e.target.closest("[data-view-res]");
    if (viewRes) {
      e.stopPropagation();
      const dayDlg = document.getElementById("modal-ver-dia");
      if (dayDlg?.open) closeDialog(dayDlg);
      openVerReservaModal(viewRes.dataset.viewRes);
      return;
    }
    const edit = e.target.closest("[data-edit-res]");
    if (edit) {
      e.stopPropagation();
      const dayDlg = document.getElementById("modal-ver-dia");
      const viewDlg = document.getElementById("modal-ver-reserva");
      if (dayDlg?.open) closeDialog(dayDlg);
      if (viewDlg?.open) closeDialog(viewDlg);
      openReservaModal({ id: edit.dataset.editRes });
      return;
    }
    const payCuotaBtn = e.target.closest("[data-pay-cuota]");
    if (payCuotaBtn) {
      payCuota(payCuotaBtn.dataset.payCuota);
      return;
    }
    const editCuota = e.target.closest("[data-edit-cuota]");
    if (editCuota) {
      openCuotaModal(editCuota.dataset.editCuota, editCuota.dataset.cuotaN);
      return;
    }
    const delPlan = e.target.closest("[data-delete-plan]");
    if (delPlan) {
      deletePlan(delPlan.dataset.deletePlan);
      return;
    }
    const goto = e.target.closest("[data-goto]");
    if (goto) showView(goto.dataset.goto);
  });

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    try {
      await window.GC_DB.getSb().auth.signOut();
    } catch (err) {
      console.error(err);
    }
    state.user = null;
    state.data = loadData();
    showAuthScreen();
    toast("Sesión cerrada");
  });

  document.getElementById("form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const errEl = document.getElementById("login-error");
    const btn = document.getElementById("btn-login");
    errEl.hidden = true;
    errEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Entrando…";
    try {
      const email = field(form, "email").value.trim();
      const password = field(form, "password").value;
      const client = window.GC_DB.getSb();
      // Limpia sesión local corrupta / desfasada antes de entrar
      try {
        await client.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await enterApp(data.session);
    } catch (err) {
      console.error(err);
      const msg = String(err?.message || "");
      if (msg === "Invalid login credentials") {
        errEl.textContent = "Email o contraseña incorrectos";
      } else if (/JWT issued at future/i.test(msg)) {
        errEl.textContent =
          "El reloj de este dispositivo está desfasado. En Ajustes → Fecha y hora, activa “Ajustar automáticamente” y vuelve a intentar.";
      } else if (/Email not confirmed/i.test(msg)) {
        errEl.textContent = "Debes confirmar el email en Supabase (o desactiva Confirm email).";
      } else {
        errEl.textContent = msg || "No se pudo iniciar sesión";
      }
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });

  document.getElementById("font-smaller")?.addEventListener("click", () => changeFontStep(-1));
  document.getElementById("font-larger")?.addEventListener("click", () => changeFontStep(1));

  document.getElementById("theme-grid")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme]");
    if (!btn) return;
    setThemePreset(btn.dataset.theme);
  });

  const colorPrimary = document.getElementById("color-primary");
  const colorAccent = document.getElementById("color-accent");
  const onCustomColor = () => {
    if (!colorPrimary || !colorAccent) return;
    setCustomColors(colorPrimary.value, colorAccent.value);
  };
  colorPrimary?.addEventListener("input", onCustomColor);
  colorAccent?.addEventListener("input", onCustomColor);

  document.getElementById("btn-reset-theme")?.addEventListener("click", () => {
    setThemePreset("bosque");
  });
}

/* ---------- auth & boot ---------- */

function showAuthScreen() {
  document.getElementById("auth-screen").hidden = false;
  document.getElementById("app-shell").hidden = true;
}

function showAppShell() {
  document.getElementById("auth-screen").hidden = true;
  document.getElementById("app-shell").hidden = false;
}

async function enterApp(session) {
  state.user = session.user;
  const userLabel = document.getElementById("sidebar-user");
  if (userLabel) userLabel.textContent = state.user.email || "Sesión activa";

  const remote = await window.GC_DB.dbFetchAll();
  state.data = {
    reservations: remote.reservations,
    bills: [],
    plans: remote.plans,
  };

  if (remote.prefs) {
    state.prefs = {
      ...state.prefs,
      ...remote.prefs,
      fontStep: Math.min(FONT_STEPS.length - 1, Math.max(0, Number(remote.prefs.fontStep) || 1)),
    };
  } else {
    await savePrefs();
  }

  // Primera vez: si no hay planes, carga los de ejemplo (cuotas), sin reservas
  if (!state.data.plans.length) {
    const seeded = seedData();
    state.data.plans = seeded.plans;
    for (const p of seeded.plans) {
      await persistPlan(p);
    }
  }

  applyPrefs();
  showAppShell();
  renderAll();
}

async function boot() {
  applyPrefs();
  state.data = loadData();
  bindEvents();

  try {
    const client = window.GC_DB.getSb();
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      await enterApp(session);
    } else {
      showAuthScreen();
    }
    client.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === "SIGNED_OUT") {
        state.user = null;
        state.data = loadData();
        showAuthScreen();
      } else if (event === "SIGNED_IN" && nextSession && !state.user) {
        await enterApp(nextSession);
      }
    });
  } catch (err) {
    console.error(err);
    showAuthScreen();
    const errEl = document.getElementById("login-error");
    if (errEl) {
      errEl.textContent = err.message || "Configura supabase-config.js";
      errEl.hidden = false;
    }
  }
}

boot();
