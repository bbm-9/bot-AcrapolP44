// api/telegram.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TG = (method) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function tgSendMessage(chat_id, text, reply_markup) {
  const payload = { chat_id, text, parse_mode: "HTML" };
  if (reply_markup) payload.reply_markup = reply_markup;

  await fetch(TG("sendMessage"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
async function tgAnswerCallbackQuery(callback_query_id) {
  await fetch(TG("answerCallbackQuery"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id }),
  });
}
function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🎓 Acceder al grupo oficial de la Academia", callback_data: "acceso_grupo" }],
      [{ text: "❓ Preguntar una duda", callback_data: "preguntar_duda" }],
    ],
  };
}

async function getOrCreateUser(telegram_user_id, username) {
  const { data: existing } = await supabase
    .from("telegram_onboarding")
    .select("*")
    .eq("telegram_user_id", telegram_user_id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("telegram_onboarding")
    .insert({ telegram_user_id, username, estado: "menu" })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}

async function updateUser(telegram_user_id, patch) {
  const { error } = await supabase
    .from("telegram_onboarding")
    .update({ ...patch, ultima_interaccion: new Date().toISOString() })
    .eq("telegram_user_id", telegram_user_id);

  if (error) throw error;
}

function isValidLinePaso2(text) {
  // "Nombre Apellidos | email@... | Curso"
  if (!text.includes("|")) return false;
  const parts = text.split("|").map((s) => s.trim());
  if (parts.length < 3) return false;
  const email = parts[1];
  return email.includes("@") && email.length >= 6;
}

function extractPaso2(text) {
  const [nombre, email, curso] = text.split("|").map((s) => s.trim());
  return { nombre, email, curso };
}

function msgInicio() {
  return (
    "👋 Bienvenido a <b>ACRAPOL</b>, la academia que eligen los mejores.\n\n" +
    "Selecciona una opción:\n\n" +
    "Puedes escribir <b>MENU</b> en cualquier momento para volver al inicio."
  );
}

function msgPaso1() {
  return (
    "Paso 1/4 ✅\n\n" +
    "Solicita acceso al grupo desde el campus → apartado <b>“Grupo Telegram”</b>.\n\n" +
    "Cuando lo hayas hecho, escribe: <b>HECHO</b>\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

function msgPaso2() {
  return (
    "Paso 2/4 ✅\n\n" +
    "Envíame en una sola línea (copia, pega y sustituye datos):\n\n" +
    "<b>Nombre y apellidos | Email con el que te has matriculado | Curso (Total43, Pack 3 Módulos, Intensivo)</b>\n\n" +
    "Ejemplo:\nMiguel García Fernández | miguel.acrapol@acrapol.com | Curso Total43\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

function msgPaso3() {
  return (
    "Paso 3/4 (verificación obligatoria) 📱\n\n" +
    "Necesito tu número de teléfono visible en Telegram para comprobar que coincide con tu matrícula.\n\n" +
    "Hazlo así (30 segundos):\n" +
    "1️⃣ Telegram → Ajustes\n" +
    "2️⃣ Privacidad y seguridad\n" +
    "3️⃣ Número de teléfono\n" +
    "4️⃣ En “¿Quién puede ver mi número?” selecciona <b>Mis contactos</b> o <b>Todos</b>\n" +
    "5️⃣ Vuelve aquí y pulsa: 📎 Adjuntar → Contacto → <b>Enviar mi contacto</b>\n\n" +
    "Cuando lo envíes correctamente te marcaré ✅\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

function msgPaso4() {
  return (
    "Paso 4/4 ✅\n\n" +
    "Datos recibidos correctamente.\n\n" +
    "Un profesor verificará la información y te dará acceso al grupo.\n" +
    "⏳ Tiempo habitual: menos de 24h.\n\n" +
    "Si pasado ese tiempo no tienes acceso, escribe: <b>REVISAR</b>\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

async function notifyTeachers(user, telegram_user_id, username) {
  const text =
    "📥 <b>ALTA TELEGRAM PENDIENTE</b>\n\n" +
    `👤 Nombre: ${user.nombre ?? "-"}\n` +
    `📧 Email: ${user.email ?? "-"}\n` +
    `🎓 Curso: ${user.curso ?? "-"}\n` +
    `📱 Teléfono: ${user.telefono ?? "-"}\n` +
    `🆔 Telegram ID: ${telegram_user_id}\n` +
    `🔤 Usuario: ${username ? "@" + username : "-"}\n\n` +
    "Estado: Pendiente de verificación";

  await tgSendMessage(process.env.TEACHERS_CHAT_ID, text);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");

  const update = req.body;

  // Callback de botones
  if (update.callback_query) {
    const cq = update.callback_query;
    await tgAnswerCallbackQuery(cq.id);
    const chat_id = cq.message.chat.id;
    const telegram_user_id = cq.from.id;
    const username = cq.from.username ?? null;
    const data = cq.data;

    const user = await getOrCreateUser(telegram_user_id, username);

    if (data === "acceso_grupo") {
      await updateUser(telegram_user_id, { estado: "acceso_p1" });
      await tgSendMessage(chat_id, msgPaso1());
    }

    if (data === "preguntar_duda") {
      await updateUser(telegram_user_id, { estado: "duda_pendiente" });
      await tgSendMessage(
        chat_id,
        "Escribe tu duda en un único mensaje.\nSi puedes, indica:\n📚 Tema\n❓ Pregunta concreta\n\nCuando la envíes, la recibirá un profesor.\n\n(<i>Escribe MENU para volver al inicio</i>)"
      );
    }

    return res.status(200).json({ ok: true });
  }

  // Mensajes normales
  if (!update.message) return res.status(200).json({ ok: true });

  const msg = update.message;
  const chat_id = msg.chat.id;
  const telegram_user_id = msg.from.id;
  const username = msg.from.username ?? null;

  const text = (msg.text ?? "").trim();

  const user = await getOrCreateUser(telegram_user_id, username);

  // Comandos universales
  if (text.toUpperCase() === "MENU" || text === "/start" || text === "/menu") {
    await updateUser(telegram_user_id, { estado: "menu" });
    await tgSendMessage(chat_id, msgInicio(), mainMenuKeyboard());
    return res.status(200).json({ ok: true });
  }

  // Flujo DUDAS: reenviar al grupo interno
  if (user.estado === "duda_pendiente") {
    const duda =
      "❓ <b>DUDA ALUMNO</b>\n\n" +
      `🆔 Telegram ID: ${telegram_user_id}\n` +
      `🔤 Usuario: ${username ? "@" + username : "-"}\n\n` +
      `📝 Mensaje:\n${text}`;

    await tgSendMessage(process.env.TEACHERS_CHAT_ID, duda);
    await tgSendMessage(chat_id, "Recibido ✅ Te responderá un profesor.");
    await updateUser(telegram_user_id, { estado: "menu" });
    await tgSendMessage(chat_id, msgInicio(), mainMenuKeyboard());
    return res.status(200).json({ ok: true });
  }

  // Flujo ACCESO
  if (user.estado === "acceso_p1") {
    if (text.toUpperCase() === "HECHO") {
      await updateUser(telegram_user_id, { estado: "acceso_p2" });
      await tgSendMessage(chat_id, msgPaso2());
    } else {
      await tgSendMessage(chat_id, "Cuando lo hayas hecho, escribe <b>HECHO</b>.");
    }
    return res.status(200).json({ ok: true });
  }

  if (user.estado === "acceso_p2") {
    if (!isValidLinePaso2(text)) {
      await tgSendMessage(chat_id, "Formato incorrecto. Ejemplo:\nJuan Pérez García | juan@email.com | Curso Básica");
      return res.status(200).json({ ok: true });
    }

    const { nombre, email, curso } = extractPaso2(text);
    await updateUser(telegram_user_id, { nombre, email, curso, estado: "acceso_p3" });
    await tgSendMessage(chat_id, msgPaso3());
    return res.status(200).json({ ok: true });
  }

  if (user.estado === "acceso_p3") {
    // Aquí exigimos CONTACTO. Si escribe texto, le insistimos.
    await tgSendMessage(
      chat_id,
      "Necesito que lo envíes como <b>Contacto</b>, no escrito en texto.\nPulsa 📎 → Contacto → <b>Enviar mi contacto</b>."
    );
    return res.status(200).json({ ok: true });
  }

  // Si el usuario envía un contacto (NO es texto)
  if (msg.contact && (user.estado === "acceso_p3" || user.estado === "acceso_p3_ok")) {
    const phone = msg.contact.phone_number;
    await updateUser(telegram_user_id, { telefono: phone, estado: "acceso_pendiente_revision" });
    const refreshed = await getOrCreateUser(telegram_user_id, username);
    await tgSendMessage(chat_id, "Contacto recibido ✅");
    await tgSendMessage(chat_id, msgPaso4());
    await notifyTeachers(refreshed, telegram_user_id, username);
    return res.status(200).json({ ok: true });
  }

  // Default: si no está en flujo, re-muestra menú
  await tgSendMessage(chat_id, msgInicio(), mainMenuKeyboard());
  return res.status(200).json({ ok: true });
}
