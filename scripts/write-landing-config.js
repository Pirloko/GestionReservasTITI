#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const whatsapp = (process.env.TITI_WHATSAPP || "56933735687").replace(/\D/g, "");
const whatsappMessage =
  process.env.TITI_WHATSAPP_MESSAGE ||
  "Hola Titi Mundo Diversión! Quiero cotizar para un evento 🎉";
const instagram =
  process.env.TITI_INSTAGRAM || "https://www.instagram.com/titimundodiversion/";
const instagramHandle = process.env.TITI_INSTAGRAM_HANDLE || "@titimundodiversion";

const out = path.join(__dirname, "..", "mockup", "landing-config.js");
const body = `/* Generado en build — número por defecto: 56933735687 */
window.TITI_CONFIG = {
  whatsapp: ${JSON.stringify(whatsapp)},
  whatsappMessage: ${JSON.stringify(whatsappMessage)},
  instagram: ${JSON.stringify(instagram)},
  instagramHandle: ${JSON.stringify(instagramHandle)},
};
`;

fs.writeFileSync(out, body, "utf8");
console.log("Escrito mockup/landing-config.js (WhatsApp:", whatsapp + ")");
