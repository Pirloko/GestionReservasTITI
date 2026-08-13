/* Capa Supabase — Gestión & Cuentas */

let sb = null;

function getSb() {
  if (sb) return sb;
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("PEGAR_") || key.includes("PEGAR_")) {
    throw new Error("Falta configurar supabase-config.js (URL y anon key)");
  }
  if (!window.supabase?.createClient) {
    throw new Error("No se cargó @supabase/supabase-js");
  }
  sb = window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return sb;
}

function currentUserId() {
  return state.user?.id || null;
}

function reservationToRow(r, userId) {
  const ids = resourceIdsOf(r);
  return {
    id: r.id,
    user_id: userId,
    category: r.category || categoryOfIds(ids),
    resource_id: ids[0] || r.resourceId || "",
    resource_ids: ids,
    date: r.date,
    client: r.client || "",
    phone: r.phone || "",
    total: Number(r.total) || 0,
    paid: Number(r.paid) || 0,
    method: r.method || "transferencia",
    notes: r.notes || "",
    address: r.address || "",
    comuna: r.comuna || "",
    comuna_otra: r.comunaOtra || "",
    delivery_fee: Number(r.deliveryFee) || 0,
    maps_url: r.mapsUrl || "",
  };
}

function rowToReservation(row) {
  return normalizeReservation({
    id: row.id,
    category: row.category,
    resourceId: row.resource_id,
    resourceIds: row.resource_ids || [],
    date: row.date,
    client: row.client,
    phone: row.phone,
    total: Number(row.total) || 0,
    paid: Number(row.paid) || 0,
    method: row.method,
    notes: row.notes,
    address: row.address,
    comuna: row.comuna,
    comunaOtra: row.comuna_otra,
    deliveryFee: Number(row.delivery_fee) || 0,
    mapsUrl: row.maps_url,
  });
}

function planToRow(p, userId) {
  return {
    id: p.id,
    user_id: userId,
    title: p.title || "",
    provider: p.provider || "",
    category: p.category || "",
    total: Number(p.total) || 0,
    first_due: p.firstDue || null,
  };
}

function installmentToRow(planId, c, userId) {
  return {
    plan_id: planId,
    user_id: userId,
    n: Number(c.n),
    due: c.due,
    amount: Number(c.amount) || 0,
    paid: !!c.paid,
  };
}

async function dbFetchAll() {
  const client = getSb();
  const userId = currentUserId();
  if (!userId) throw new Error("Sin sesión");

  const [resR, plansR, instR, prefsR] = await Promise.all([
    client.from("reservations").select("*").eq("user_id", userId).order("date", { ascending: true }),
    client.from("plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("plan_installments").select("*").eq("user_id", userId).order("n", { ascending: true }),
    client.from("prefs").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (resR.error) throw resR.error;
  if (plansR.error) throw plansR.error;
  if (instR.error) throw instR.error;
  if (prefsR.error) throw prefsR.error;

  const byPlan = {};
  (instR.data || []).forEach((row) => {
    if (!byPlan[row.plan_id]) byPlan[row.plan_id] = [];
    byPlan[row.plan_id].push({
      n: row.n,
      due: row.due,
      amount: Number(row.amount) || 0,
      paid: !!row.paid,
    });
  });

  const plans = (plansR.data || []).map((p) => ({
    id: p.id,
    title: p.title,
    provider: p.provider,
    category: p.category,
    total: Number(p.total) || 0,
    firstDue: p.first_due,
    installments: byPlan[p.id] || [],
  }));

  const prefs = prefsR.data
    ? {
        themeId: prefsR.data.theme_id || "bosque",
        primary: prefsR.data.primary_color || "#1f3d2f",
        accent: prefsR.data.accent_color || "#4a7c59",
        fontStep: Number(prefsR.data.font_step) || 1,
      }
    : null;

  return {
    reservations: (resR.data || []).map(rowToReservation),
    plans,
    bills: [],
    prefs,
  };
}

async function dbUpsertReservation(r) {
  const userId = currentUserId();
  const { error } = await getSb().from("reservations").upsert(reservationToRow(r, userId));
  if (error) throw error;
}

async function dbDeleteReservation(id) {
  const { error } = await getSb().from("reservations").delete().eq("id", id).eq("user_id", currentUserId());
  if (error) throw error;
}

async function dbUpsertPlan(p) {
  const userId = currentUserId();
  const client = getSb();
  const { error: planErr } = await client.from("plans").upsert(planToRow(p, userId));
  if (planErr) throw planErr;

  const { error: delErr } = await client
    .from("plan_installments")
    .delete()
    .eq("plan_id", p.id)
    .eq("user_id", userId);
  if (delErr) throw delErr;

  if (p.installments?.length) {
    const rows = p.installments.map((c) => installmentToRow(p.id, c, userId));
    const { error: insErr } = await client.from("plan_installments").insert(rows);
    if (insErr) throw insErr;
  }
}

async function dbDeletePlan(id) {
  const { error } = await getSb().from("plans").delete().eq("id", id).eq("user_id", currentUserId());
  if (error) throw error;
}

async function dbUpsertPrefs(prefs) {
  const userId = currentUserId();
  const { error } = await getSb().from("prefs").upsert({
    user_id: userId,
    theme_id: prefs.themeId || "bosque",
    primary_color: prefs.primary || "#1f3d2f",
    accent_color: prefs.accent || "#4a7c59",
    font_step: Number(prefs.fontStep) || 1,
  });
  if (error) throw error;
}

async function dbClearAllUserData() {
  const userId = currentUserId();
  const client = getSb();
  const ops = await Promise.all([
    client.from("reservations").delete().eq("user_id", userId),
    client.from("plans").delete().eq("user_id", userId),
    client.from("prefs").delete().eq("user_id", userId),
  ]);
  const err = ops.find((r) => r.error)?.error;
  if (err) throw err;
}

window.GC_DB = {
  getSb,
  dbFetchAll,
  dbUpsertReservation,
  dbDeleteReservation,
  dbUpsertPlan,
  dbDeletePlan,
  dbUpsertPrefs,
  dbClearAllUserData,
};
