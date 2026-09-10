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
      [{ text: "🎓 Acceder al grupo de Telegram P44", callback_data: "acceso_grupo" }],
      [{ text: "❓ Escribir mensaje a Miguel", url: "https://t.me/Miguel_ACRAPOL" }],
    ],
  };
}

// ✅ Botón obligatorio para compartir MI contacto (cierra la brecha)
function shareContactKeyboard() {
  return {
    keyboard: [[{ text: "📱 Enviar mi contacto", request_contact: true }]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function removeKeyboard() {
  return { remove_keyboard: true };
}

async function getOrCreateUser(telegram_user_id, username) {
  const { data: existing } = await supabase
    .from("telegram_onboarding_p44")
    .select("*")
    .eq("telegram_user_id", telegram_user_id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("telegram_onboarding_p44")
    .insert({ telegram_user_id, username, estado: "menu" })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}

async function updateUser(telegram_user_id, patch) {
  const { error } = await supabase
    .from("telegram_onboarding_p44")
    .update({ ...patch, ultima_interaccion: new Date().toISOString() })
    .eq("telegram_user_id", telegram_user_id);

  if (error) throw error;
}

function isValidLinePaso2(text) {
  const parts = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 3) return false;
  const email = parts[1];
  return email.includes("@") && email.length >= 6;
}

function extractPaso2(text) {
  const [nombre, email, curso] = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return { nombre, email, curso };
}

function msgInicio() {
  return (
    "👋 Bienvenido a <b>ACRAPOL</b>, la academia que eligen los mejores.\n\n" +
    "Selecciona una opción:\n\n" +
    "Puedes escribir <b>MENÚ</b> en cualquier momento para volver al inicio."
  );
}

function msgPaso1() {
  return (
    "Paso 1/5 ✅\n\n" +
    "Dentro del curso <b><u>debes</u></b> realizar estas acciones:\n\n" +
    "1️⃣ Rellenar el <b>FORMULARIO DEL ALUMNO</b> con datos veraces\n" +
    "2️⃣ Aceptar las <b>CONDICIONES Y NORMAS DE USO</b>\n" +
    "3️⃣ Lectura obligatoria del PDF <b>EXPLICACIÓN Y DESARROLLO DEL CURSO</b>\n\n" +
    "Cuando lo hayas hecho todo, escribe: <b>HECHO</b>\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

function msgPaso2() {
  return (
    "Paso 2/5 ✅\n\n" +
    "Solicita el acceso al grupo desde el Campus, ¡OJO! recomendamos hacer este paso con tu teléfono móvil:\n\n" +
    "1️⃣ Apartado <b>INICIO</b> dentro del Módulo/Curso <b> → “Solicitud de acceso al Grupo P44”</b>;\n\n" +
    "2️⃣ Se te abrirá la web o app de Telegram → Unirse al grupo o <i>Join group</i>.\n\n" +
    "Cuando lo hayas hecho, escribe: <b>HECHO</b>\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

function msgPaso3() {
  return (
    "Paso 3/5 ✅\n\n" +
    "Envíame tus datos en <b>3 líneas</b>, de esta forma:\n\n" +
    "<b>Nombre y apellidos</b>\n" +
    "<b>Correo con el que te has matriculado (el mismo del formulario del alumno)</b>\n" +
    "<b>Curso (Total44, Pack 3 Módulos, Intensivo)</b>\n\n" +
    "Ejemplo:\n" +
    "Miguel García Fernández\n" +
    "miguel.acrapol@acrapol.es\n" +
    "Total44\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

// ✅ Paso 4 con TODOS + botón obligatorio + frase ✅ + vuelta a menú
function msgPaso4() {
  return (
    "Paso 4/5 (verificación obligatoria) 📱\n\n" +
    "Antes de enviarme tu contacto, configura tu teléfono como <b>VISIBLE PARA TODOS</b>:\n\n" +
    "1️⃣ Telegram → Ajustes\n" +
    "2️⃣ Privacidad y seguridad\n" +
    "3️⃣ Número de teléfono\n" +
    "4️⃣ En “¿Quién puede ver mi número?” selecciona <b>TODOS</b>\n\n" +
    "✅ Cuando esté en <b>TODOS</b>, vuelve aquí y pulsa el botón:\n" +
    "<b>📱 Enviar mi contacto</b>\n\n" +
    "Si no ves el botón, pulsa el icono del <b>teclado</b> abajo en Telegram.\n\n" +
    "❌ <b>NO</b> uses el clip 📎 → Contacto (abre la agenda y permite enviar otro contacto).\n\n" +
    "Cuando lo envíes correctamente te marcaré ✅\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

function msgPaso5() {
  return (
    "Paso 5/5 ✅\n\n" +
    "Datos recibidos correctamente.\n\n" +
    "Miguel verificará la información y te dará acceso al grupo.\n" +
    "⏳ Tiempo habitual: menos de 24h.\n\n" +
    "Si pasado ese tiempo no tienes acceso, escribe: <b>REVISAR</b>\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

function msgYaPendiente() {
  return (
    "✅ Ya tengo tus datos y tu teléfono.\n\n" +
    "Tu solicitud está <b>pendiente de revisión</b> por un profesor.\n" +
    "Si han pasado 24h, escribe <b>REVISAR</b>.\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

function msgYaAprobado() {
  return (
    "✅ Ya estás verificado.\n\n" +
    "Si aún no tienes acceso al grupo, escribe <b>REVISAR</b>.\n\n" +
    "(<i>Escribe MENU para volver al inicio</i>)"
  );
}

async function notifyTeachers(user, telegram_user_id, username, tg_name) {
  const text =
    "📥 <b>ALTA TELEGRAM P44 PENDIENTE</b>\n\n" +
    `👤 Nombre: ${user.nombre ?? "-"}\n` +
    `📧 Email: ${user.email ?? "-"}\n` +
    `🎓 Curso: ${user.curso ?? "-"}\n` +
    `📱 Teléfono: ${user.telefono ?? "-"}\n` +
    `🆔 Telegram ID: ${telegram_user_id}\n` +
    `🔤 Usuario: ${
      username
        ? "@" + username
        : `<a href="tg://user?id=${telegram_user_id}">${tg_name || "Abrir perfil"}</a>`
    }\n\n` +
    "Estado: Pendiente de verificación";

  await tgSendMessage(process.env.TEACHERS_CHAT_ID, text);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");

  const update = req.body;

  // ✅ Callback de botones
  if (update.callback_query) {
    const cq = update.callback_query;
    await tgAnswerCallbackQuery(cq.id);

    const chat_id = cq.message.chat.id;
    const telegram_user_id = cq.from.id;
    const username = cq.from.username ?? null;
    const data = cq.data;

    const user = await getOrCreateUser(telegram_user_id, username);

    if (data === "acceso_grupo") {
      // ✅ Si ya está aprobado/concedido, no repetir proceso
      if (user.acceso_concedido === true || user.estado === "acceso_aprobado") {
        await tgSendMessage(chat_id, msgYaAprobado());
        return res.status(200).json({ ok: true });
      }

      // ✅ Si ya envió teléfono y está pendiente, no repetir proceso
      if (user.telefono && user.estado === "acceso_pendiente_revision") {
        await tgSendMessage(chat_id, msgYaPendiente());
        return res.status(200).json({ ok: true });
      }

      // 🔁 Flujo normal
      await updateUser(telegram_user_id, { estado: "acceso_p1" });
      await tgSendMessage(chat_id, msgPaso1());
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  }

  // ✅ Mensajes normales
  if (!update.message) return res.status(200).json({ ok: true });

  const msg = update.message;
  const chat_id = msg.chat.id;
  const telegram_user_id = msg.from.id;
  const username = msg.from.username ?? null;
  const first_name = msg.from.first_name ?? "";
  const last_name = msg.from.last_name ?? "";
  const tg_name = `${first_name} ${last_name}`.trim();
  const text = (msg.text ?? "").trim();

  const user = await getOrCreateUser(telegram_user_id, username);

  // ✅ Comando universal: MENU (NO aplica en grupo interno)
  if (
    chat_id.toString() !== process.env.TEACHERS_CHAT_ID?.toString() &&
    text &&
    (text.toUpperCase() === "MENU" || text === "/start" || text === "/menu")
  ) {
    await updateUser(telegram_user_id, { estado: "menu" });
    await tgSendMessage(chat_id, msgInicio(), mainMenuKeyboard());
    return res.status(200).json({ ok: true });
  }

  // ✅ Comandos de profesor SOLO desde el grupo interno
  if (chat_id.toString() === process.env.TEACHERS_CHAT_ID?.toString()) {
    let t = (text || "").trim();

    // Alias: APROBADO <id> -> APROBAR <id>
    const TU = t.toUpperCase();
    if (TU.startsWith("APROBADO ")) {
      const id = t.split(" ")[1];
      t = `APROBAR ${id}`;
    }

    // Formato: APROBAR <telegram_user_id>
    if (t.toUpperCase().startsWith("APROBAR ")) {
      const alumnoId = Number(t.split(" ")[1]);

      if (!Number.isFinite(alumnoId)) {
        await tgSendMessage(chat_id, "Formato: APROBAR <telegram_user_id>");
        return res.status(200).json({ ok: true });
      }

      const { error } = await supabase
        .from("telegram_onboarding_p44")
        .update({
          acceso_concedido: true,
          estado: "acceso_aprobado",
          fecha_acceso: new Date().toISOString(),
          verificado_por: "PROFESOR",
        })
        .eq("telegram_user_id", alumnoId);

      if (error) {
        await tgSendMessage(chat_id, `❌ Error aprobando: ${error.message}`);
        return res.status(200).json({ ok: true });
      }

      await tgSendMessage(
        alumnoId,
        "✅ Verificación completada. Ya puedes acceder al grupo. Si aún no lo ves, escribe REVISAR."
      );

      await tgSendMessage(chat_id, `✅ Aprobado P44: ${alumnoId}`);
      return res.status(200).json({ ok: true });
    }

    // Formato: DENEGAR <telegram_user_id> <motivo opcional...>
    if (t.toUpperCase().startsWith("DENEGAR ")) {
      const parts = t.split(" ");
      const alumnoId = Number(parts[1]);
      const motivo = parts.slice(2).join(" ").trim() || "No coincide con la matrícula.";

      if (!Number.isFinite(alumnoId)) {
        await tgSendMessage(chat_id, "Formato: DENEGAR <telegram_user_id> <motivo opcional>");
        return res.status(200).json({ ok: true });
      }

      const { error } = await supabase
        .from("telegram_onboarding_p44")
        .update({
          acceso_concedido: false,
          estado: "acceso_denegado",
          fecha_verificacion: new Date().toISOString(),
          verificado_por: "PROFESOR",
          notas: motivo,
        })
        .eq("telegram_user_id", alumnoId);

      if (error) {
        await tgSendMessage(chat_id, `❌ Error denegando: ${error.message}`);
        return res.status(200).json({ ok: true });
      }

      await tgSendMessage(
        alumnoId,
        `❌ Verificación no aprobada: ${motivo}\nSi crees que es un error, escribe REVISAR.`
      );

      await tgSendMessage(chat_id, `❌ Denegado P44: ${alumnoId} — ${motivo}`);
      return res.status(200).json({ ok: true });
    }

    // Fallback comandos profe
    await tgSendMessage(
      chat_id,
      "Comandos P44:\n✅ APROBAR <telegram_user_id>\n❌ DENEGAR <telegram_user_id> <motivo opcional>"
    );
    return res.status(200).json({ ok: true });
  }

  // ✅ Comando universal: REVISAR (NO aplica en grupo interno)
  if (
    chat_id.toString() !== process.env.TEACHERS_CHAT_ID?.toString() &&
    (text.toUpperCase() === "REVISAR" || text === "/revisar")
  ) {
    const aviso =
      "🔔 <b>REVISAR ACCESO P44</b>\n\n" +
      `🆔 Telegram ID: ${telegram_user_id}\n` +
      `🔤 Usuario: ${username ? "@" + username : "-"}\n` +
      `📱 Teléfono: ${user.telefono ?? "-"}\n` +
      `📧 Email: ${user.email ?? "-"}\n` +
      `🎓 Curso: ${user.curso ?? "-"}\n`;

    await tgSendMessage(process.env.TEACHERS_CHAT_ID, aviso);
    await tgSendMessage(chat_id, "Perfecto ✅ He avisado al profesor para que revise tu acceso.");
    return res.status(200).json({ ok: true });
  }

  // PASO 1/5
  if (user.estado === "acceso_p1") {
    if (text.toUpperCase() === "HECHO") {
      await updateUser(telegram_user_id, { estado: "acceso_p2" });
      await tgSendMessage(chat_id, msgPaso2());
    } else {
      await tgSendMessage(chat_id, "Cuando lo hayas hecho, escribe <b>HECHO</b>.");
    }
    return res.status(200).json({ ok: true });
  }

  // PASO 2/5
  if (user.estado === "acceso_p2") {
    if (text.toUpperCase() === "HECHO") {
      await updateUser(telegram_user_id, { estado: "acceso_p3" });
      await tgSendMessage(chat_id, msgPaso3());
    } else {
      await tgSendMessage(chat_id, "Cuando lo hayas hecho, escribe <b>HECHO</b>.");
    }
    return res.status(200).json({ ok: true });
  }

  // PASO 3/5
  if (user.estado === "acceso_p3") {
    if (!isValidLinePaso2(text)) {
      await tgSendMessage(
        chat_id,
        "Formato incorrecto. Envíame exactamente 3 líneas. Ejemplo:\nMiguel García Fernández\nmiguel.acrapol@acrapol.es\nTotal44"
      );
      return res.status(200).json({ ok: true });
    }

    const { nombre, email, curso } = extractPaso2(text);
    await updateUser(telegram_user_id, { nombre, email, curso, estado: "acceso_p4" });

    // ✅ Aquí mandamos Paso 4 con el botón obligatorio
    await tgSendMessage(chat_id, msgPaso4(), shareContactKeyboard());
    return res.status(200).json({ ok: true });
  }

  // PASO 4/5 (contacto)
  if (user.estado === "acceso_p4") {
    if (msg.contact && msg.contact.phone_number) {
      // 🔒 Validación crítica: solo aceptamos "MI contacto"
      if (!msg.contact.user_id || msg.contact.user_id !== telegram_user_id) {
        await tgSendMessage(
          chat_id,
          "❌ Ese no es tu contacto.\nPulsa <b>📱 Enviar mi contacto</b> (no vale enviar un contacto desde la agenda).",
          shareContactKeyboard()
        );
        return res.status(200).json({ ok: true });
      }

      await updateUser(telegram_user_id, {
        telefono: msg.contact.phone_number,
        estado: "acceso_pendiente_revision",
      });

      const refreshed = await getOrCreateUser(telegram_user_id, username);

      await tgSendMessage(chat_id, "Contacto recibido ✅", removeKeyboard());
      await tgSendMessage(chat_id, msgPaso5());
      await notifyTeachers(refreshed, telegram_user_id, username, tg_name);

      return res.status(200).json({ ok: true });
    }

    // Si NO es contacto, insistimos con el botón
    await tgSendMessage(
      chat_id,
      "Pulsa <b>📱 Enviar mi contacto</b> (y asegúrate de tener “¿Quién puede ver mi número?” en <b>TODOS</b>).",
      shareContactKeyboard()
    );
    return res.status(200).json({ ok: true });
  }

  // Default: si no está en flujo, re-muestra menú
  await tgSendMessage(chat_id, msgInicio(), mainMenuKeyboard());
  return res.status(200).json({ ok: true });
}
