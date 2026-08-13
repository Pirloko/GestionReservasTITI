#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_ANON_KEY || "";

if (!url || !key) {
  console.error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno de Netlify.");
  process.exit(1);
}

const out = path.join(__dirname, "..", "mockup", "supabase-config.js");
const body = `/* Generado en el build de Netlify — no editar a mano en producción */
window.SUPABASE_URL = ${JSON.stringify(url)};
window.SUPABASE_ANON_KEY = ${JSON.stringify(key)};
`;

fs.writeFileSync(out, body, "utf8");
console.log("Escrito mockup/supabase-config.js");
