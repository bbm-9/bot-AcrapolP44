// api/telegram.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TG = (method) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function tgSendMessage(chat_id, text, reply_markup) {
  const payload = { chat_id, text, parse_mode: "HTML" };
  if (reply_markup) payload.reply_markup = reply_markup;
  await fetch(TG("sendMessage"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
}
async function tgAnswerCallbackQuery(callback_query_id) {
  await fetch(TG("answerCallbackQuery"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ callback_query_id }) });
}
async function tgEditMessageText(chat_id, message_id, text) {
  await fetch(TG("editMessageText"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id, message_id, text }) });
}
function mainMenuKeyboard() { return { inline_keyboard: [[{ text: "🎓 Acceder al grupo de Telegram P44", callback_data: "acceso_grupo" }],[{ text: "❓ Escribir mensaje a Miguel", url: "https://t.me/Miguel_ACRAPOL" }]] }; }
function verificationKeyboard(telegram_user_id) { return { inline_keyboard: [[{ text: "✅ APROBAR", callback_data: `aprobar:${telegram_user_id}` }, { text: "❌ DENEGAR", callback_data: `denegar:${telegram_user_id}` }]] }; }
function shareContactKeyboard() { return { keyboard: [[{ text: "📱 Enviar mi contacto", request_contact: true }]], resize_keyboard: true, is_persistent: true }; }
function removeKeyboard() { return { remove_keyboard: true }; }
async function getOrCreateUser(telegram_user_id, username) {
  const { data: existing } = await supabase.from("telegram_onboarding_p44").select("*").eq("telegram_user_id", telegram_user_id).maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await supabase.from("telegram_onboarding_p44").insert({ telegram_user_id, username, estado: "menu" }).select("*").single();
  if (error) throw error; return created;
}
async function updateUser(telegram_user_id, patch) {
  const { error } = await supabase.from("telegram_onboarding_p44").update({ ...patch, ultima_interaccion: new Date().toISOString() }).eq("telegram_user_id", telegram_user_id);
  if (error) throw error;
}
function isValidLinePaso2(text) { const parts = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); if (parts.length !== 3) return false; const email=parts[1]; return email.includes("@") && email.length>=6; }
function extractPaso2(text) { const [nombre,email,curso]=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); return {nombre,email,curso}; }
function msgInicio() { return "👋 Bienvenido a <b>ACRAPOL</b>, la academia que eligen los mejores.\n\nSelecciona una de las opciones. Si vas a solicitar acceder al grupo de Telegram hazlo con tu <b><u>teléfono móvil</u></b> 📱\n\nPuedes escribir <b>MENÚ</b> en cualquier momento para volver al inicio."; }
function msgPaso1() { return "Paso 1/5 ✅\n\nDentro del curso <b><u>debes</u></b> realizar estas acciones:\n\n1️⃣ Lectura obligatoria del PDF <b>EXPLICACIÓN DEL CURSO</b>\n2️⃣ Rellenar el <b>FORMULARIO DEL ALUMNO</b> con datos veraces\n3️⃣ Aceptar las <b>CONDICIONES Y NORMAS DE USO</b>\n\nCuando lo hayas hecho todo, escribe: <b>HECHO</b>\n\n(<i>Escribe MENÚ para volver al inicio</i>)"; }
function msgPaso2() { return "Paso 2/5 ✅\n\nSolicita el acceso al grupo desde el Campus:\n\n1️⃣ Apartado <b>INICIO</b> dentro del Módulo/Curso → <b>“Solicitud de acceso al Grupo P44”</b>;\n\n2️⃣ Se te abrirá la web o app de Telegram → Unirse al grupo o <i>Join group</i>.\n\nCuando lo hayas hecho, escribe: <b>HECHO</b>\n\n(<i>Escribe MENÚ para volver al inicio</i>)"; }
function msgPaso3() { return "Paso 3/5 ✅\n\nEnvíame tus datos en <b>3 líneas</b>, de esta forma:\n\n<b>Nombre y apellidos</b>\n<b>Correo con el que te has matriculado</b>\n<b>Curso (Total44, Pack 3 Módulos, Intensivo)</b>\n\nEjemplo:\nMiguel García Fernández\nmiguel@acrapol.es\nTotal44\n\n(<i>Escribe MENÚ para volver al inicio</i>)"; }
function msgPaso4() { return "Paso 4/5 (verificación obligatoria) 📱\n\nAntes de enviarme tu contacto, configura tu teléfono como <b>VISIBLE PARA TODOS</b>:\n\n1️⃣ Telegram → Ajustes\n2️⃣ Privacidad y seguridad\n3️⃣ Número de teléfono\n4️⃣ En “¿Quién puede ver mi número?” selecciona <b>TODOS</b>\n\n✅ Cuando esté en <b>TODOS</b>, vuelve aquí y pulsa el botón que aparece debajo del teclado ⬇️:\n<b>📱 Enviar mi contacto</b>\n\nSi no ves el botón minimiza el <b>teclado</b>.\n\n❌ <b>NO</b> uses el clip 📎 → Contacto (abre la agenda y permite enviar otro contacto).\n\nCuando lo envíes correctamente te marcaré ✅\n\n(<i>Escribe MENÚ para volver al inicio</i>)"; }
function msgPaso5() { return "Paso 5/5 ✅\n\nDatos recibidos correctamente.\n\nMiguel verificará la información y te dará acceso al grupo.\n⏳ Tiempo habitual: menos de 24h.\n\nSi pasado ese tiempo no tienes acceso, escribe: <b>REVISAR</b>\n\n(<i>Escribe MENÚ para volver al inicio</i>)"; }
function msgYaPendiente() { return "✅ Ya tengo tus datos y tu teléfono.\n\nTu solicitud está <b>pendiente de revisión</b> por un profesor.\nSi han pasado 24h, escribe <b>REVISAR</b>.\n\n(<i>Escribe MENÚ para volver al inicio</i>)"; }
function msgYaAprobado() { return "✅ Ya estás verificado.\n\nSi aún no tienes acceso al grupo, escribe <b>REVISAR</b>.\n\n(<i>Escribe MENÚ para volver al inicio</i>)"; }
async function notifyTeachers(user, telegram_user_id, username, tg_name) {
  const text = "📥 <b>ALTA TELEGRAM P44 PENDIENTE</b>\n\n"+`👤 Nombre: ${user.nombre??"-"}\n`+`📧 Email: ${user.email??"-"}\n`+`🎓 Curso: ${user.curso??"-"}\n`+`📱 Teléfono: ${user.telefono??"-"}\n`+`🆔 Telegram ID: ${telegram_user_id}\n`+`🔤 Usuario: ${username?"@"+username:`<a href="tg://user?id=${telegram_user_id}">${tg_name||"Abrir perfil"}</a>`}\n\nEstado: Pendiente de verificación`;
  const response = await fetch(TG("sendMessage"), {
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({chat_id:process.env.TEACHERS_CHAT_ID,text,parse_mode:"HTML",reply_markup:verificationKeyboard(telegram_user_id)})
  });
  const result = await response.json();
  if(!result.ok) throw new Error("Error notificando profesores: "+result.description);
  await updateUser(telegram_user_id,{mensaje_profesores_id:result.result.message_id});
}

async function actualizarFichaProfesores(alumnoId) {
  const {data: alumno, error} = await supabase.from("telegram_onboarding_p44")
    .select("mensaje_profesores_id,nombre,email,curso,telefono,username,estado")
    .eq("telegram_user_id",alumnoId).maybeSingle();
  if(error) throw error;
  if(!alumno?.mensaje_profesores_id || alumno.estado !== "acceso_aprobado") return;
  const texto = "📥 ALTA TELEGRAM P44\n\n"
    + "👤 Nombre: " + (alumno.nombre ?? "-") + "\n"
    + "📧 Email: " + (alumno.email ?? "-") + "\n"
    + "🎓 Curso: " + (alumno.curso ?? "-") + "\n"
    + "📱 Teléfono: " + (alumno.telefono ?? "-") + "\n"
    + "🆔 Telegram ID: " + alumnoId + "\n"
    + "🔤 Usuario: " + (alumno.username ? "@" + alumno.username : "-") + "\n\n"
    + "Estado: ✅ APROBADO";
  const response = await fetch(TG("editMessageText"), {
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({chat_id:process.env.TEACHERS_CHAT_ID,message_id:alumno.mensaje_profesores_id,texto:texto,text:texto})
  });
  const result = await response.json();
  if(!result.ok) throw new Error("No se pudo actualizar ficha: "+result.description);
}

const avisoSinSolicitud = "¡Hola! 👋\n\nAunque en el Asistente Virtual te indicamos que tienes todos los pasos completados, <b>NO has realizado correctamente la solicitud de acceso al Grupo P44 (paso 2)</b>.\n\nPara que podamos aceptarte en el grupo, sigue estos pasos:\n\n<b>⚠️ MUY IMPORTANTE: hazlo con el móvil 📱</b>\n\n1️⃣ Accede al Campus de ACRAPOL y entra en el <b>Módulo 1</b>.\n\n2️⃣ Ve al apartado <b>INICIO (la casita)</b> y pincha en el enlace denominado <b>«Solicitud de acceso al Grupo P44»</b>.\n\n3️⃣ Se te abrirá la aplicación de Telegram. Pulsa <b>«Solicitar unirme al grupo»</b>.\n\nCuando completes los tres pasos correctamente, escribe: <b>HECHO</b>.\n\nUn saludo.";

async function intentarAdmision(alumnoId) {
  const response = await fetch(TG("approveChatJoinRequest"), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_GROUP_ID, user_id: alumnoId })
  });
  const result = await response.json();
  if(result.ok) {
    await updateUser(alumnoId, {
      acceso_concedido: true, estado: "acceso_aprobado",
      solicitud_grupo_pendiente: false, fecha_acceso: new Date().toISOString(),
      fecha_admision_grupo: new Date().toISOString()
    });
    return "aprobado";
  }
  const description = String(result.description || "");
  if(result.error_code === 400 && /request|join|missing|not found/i.test(description)) return "sin_solicitud";
  throw new Error("Telegram no pudo aprobar la solicitud: " + description);
}

export default async function handler(req,res) {
  if(req.method!=="POST") return res.status(200).send("ok"); const update=req.body;
  // Registrar solicitudes de entrada al grupo P44 sin aprobarlas todavía.
  if(update.chat_join_request) {
    const solicitud = update.chat_join_request;
    if(String(solicitud.chat?.id) !== String(process.env.TELEGRAM_GROUP_ID)) {
      return res.status(200).json({ok:true});
    }
    const alumnoId = solicitud.from?.id;
    if(!alumnoId) return res.status(200).json({ok:true});
    await getOrCreateUser(alumnoId, solicitud.from.username ?? null);
    await updateUser(alumnoId, {
      solicitud_grupo_pendiente: true,
      fecha_solicitud_grupo: new Date(solicitud.date * 1000).toISOString()
    });
    const {data: alumno} = await supabase.from("telegram_onboarding_p44").select("estado").eq("telegram_user_id",alumnoId).maybeSingle();
    if(alumno?.estado === "acceso_pendiente_de_solicitud") {
      try {
        if(await intentarAdmision(alumnoId) === "aprobado") {
          await tgSendMessage(alumnoId,"✅ <b>Verificación completada</b>. Ya tienes acceso al grupo. ¡Un saludo! 👋");
          await actualizarFichaProfesores(alumnoId);
        }
      } catch(error) { console.error("Error aprobando solicitud posterior:",error); }
    }
    return res.status(200).json({ok:true});
  }
  // Ignorar mensajes y botones del grupo de alumnos P44; las solicitudes de acceso se gestionarán aparte.
  const groupId = process.env.TELEGRAM_GROUP_ID;
  if(groupId && (String(update.message?.chat?.id) === groupId || String(update.callback_query?.message?.chat?.id) === groupId)) {
    return res.status(200).json({ok:true});
  }

  if(update.callback_query){
    const cq=update.callback_query; await tgAnswerCallbackQuery(cq.id); const chat_id=cq.message.chat.id, telegram_user_id=cq.from.id, username=cq.from.username??null, data=cq.data;
    if(chat_id.toString()===process.env.TEACHERS_CHAT_ID?.toString()&&(data.startsWith("aprobar:")||data.startsWith("denegar:"))){
      const alumnoId=Number(data.split(":")[1]);
      if(!Number.isFinite(alumnoId)) return res.status(200).json({ok:true});
      if(data.startsWith("aprobar:")){
        const {data: alumno, error: lookupError} = await supabase.from("telegram_onboarding_p44").select("estado").eq("telegram_user_id",alumnoId).maybeSingle();
        if(lookupError || !alumno){await tgSendMessage(chat_id,"❌ No se encontró al alumno.");return res.status(200).json({ok:true});}
        if(alumno.estado === "acceso_aprobado" || alumno.estado === "acceso_pendiente_de_solicitud") return res.status(200).json({ok:true});
        try {
          const resultado = await intentarAdmision(alumnoId);
          if(resultado === "aprobado") {
            await updateUser(alumnoId,{verificado_por:"PROFESOR",fecha_verificacion:new Date().toISOString()});
            await tgSendMessage(alumnoId,"✅ <b>Verificación completada</b>. Ya tienes acceso al grupo. ¡Un saludo! 👋");
            await tgEditMessageText(chat_id,cq.message.message_id,(cq.message.text||"").replace("Estado: Pendiente de verificación","Estado: ✅ APROBADO"));
          } else {
            await updateUser(alumnoId,{estado:"acceso_pendiente_de_solicitud",acceso_concedido:false,verificado_por:"PROFESOR",fecha_verificacion:new Date().toISOString(),solicitud_grupo_pendiente:false,mensaje_profesores_id:cq.message.message_id});
            await tgSendMessage(alumnoId,avisoSinSolicitud);
            await tgEditMessageText(chat_id,cq.message.message_id,(cq.message.text||"").replace("Estado: Pendiente de verificación","Estado: ⚠️ DATOS VERIFICADOS — FALTA SOLICITUD"));
          }
        } catch(error) {
          console.error("Error aprobando entrada:",error);
          await tgSendMessage(chat_id,"⚠️ No se pudo tramitar la entrada de "+alumnoId+". Revisa los permisos del bot y vuelve a intentarlo.");
        }
        return res.status(200).json({ok:true});
      }
      const motivo="❌ <b>Acceso denegado</b>. Los datos aportados no coinciden con el formulario del alumno. Escribe a Miguel para solucionarlo. ¡Un saludo! 👋";
      const{error}=await supabase.from("telegram_onboarding_p44").update({acceso_concedido:false,estado:"acceso_denegado",fecha_verificacion:new Date().toISOString(),verificado_por:"PROFESOR",notas:motivo}).eq("telegram_user_id",alumnoId);
      if(error){await tgSendMessage(chat_id,`❌ Error denegando: ${error.message}`);return res.status(200).json({ok:true});}
      await tgSendMessage(alumnoId,motivo);
      const nuevoTexto=(cq.message.text||"").replace("Estado: Pendiente de verificación","Estado: ❌ DENEGADO");
      await tgEditMessageText(chat_id,cq.message.message_id,nuevoTexto);
      return res.status(200).json({ok:true});
    }
    const user=await getOrCreateUser(telegram_user_id,username);
    if(data==="acceso_grupo"){ if(user.acceso_concedido===true||user.estado==="acceso_aprobado"){await tgSendMessage(chat_id,msgYaAprobado());return res.status(200).json({ok:true});} if(user.telefono&&user.estado==="acceso_pendiente_revision"){await tgSendMessage(chat_id,msgYaPendiente());return res.status(200).json({ok:true});} await updateUser(telegram_user_id,{estado:"acceso_p1"});await tgSendMessage(chat_id,msgPaso1());return res.status(200).json({ok:true});} return res.status(200).json({ok:true}); }
  if(update.message?.text?.trim().match(/^\/chatid(?:@\w+)?$/i) && update.message.chat?.type === "supergroup") {
    await tgSendMessage(update.message.chat.id, `Chat ID: <code>${update.message.chat.id}</code>`);
    return res.status(200).json({ok:true});
  }
  if(!update.message) return res.status(200).json({ok:true}); const msg=update.message, chat_id=msg.chat.id, telegram_user_id=msg.from.id, username=msg.from.username??null, first_name=msg.from.first_name??"", last_name=msg.from.last_name??"", tg_name=`${first_name} ${last_name}`.trim(), text=(msg.text??"").trim(); const user=await getOrCreateUser(telegram_user_id,username);
  if(chat_id.toString()!==process.env.TEACHERS_CHAT_ID?.toString()&&text&&(["MENU","MENÚ"].includes(text.toUpperCase())||text==="/start"||text==="/menu")){await updateUser(telegram_user_id,{estado:"menu"});await tgSendMessage(chat_id,msgInicio(),mainMenuKeyboard());return res.status(200).json({ok:true});}
  if(chat_id.toString()===process.env.TEACHERS_CHAT_ID?.toString()){let t=(text||"").trim();const TU=t.toUpperCase();if(TU.startsWith("APROBADO "))t=`APROBAR ${t.split(" ")[1]}`;if(t.toUpperCase().startsWith("APROBAR ")){const alumnoId=Number(t.split(" ")[1]);if(!Number.isFinite(alumnoId)){await tgSendMessage(chat_id,"Formato: APROBAR <telegram_user_id>");return res.status(200).json({ok:true});}const{error}=await supabase.from("telegram_onboarding_p44").update({acceso_concedido:true,estado:"acceso_aprobado",fecha_acceso:new Date().toISOString(),verificado_por:"PROFESOR"}).eq("telegram_user_id",alumnoId);if(error){await tgSendMessage(chat_id,`❌ Error aprobando: ${error.message}`);return res.status(200).json({ok:true});}await tgSendMessage(alumnoId,"✅ Verificación completada. Ya puedes acceder al grupo. Si aún no lo ves, escribe REVISAR.");await tgSendMessage(chat_id,`✅ Aprobado P44: ${alumnoId}`);return res.status(200).json({ok:true});}if(t.toUpperCase().startsWith("DENEGAR ")){const parts=t.split(" "),alumnoId=Number(parts[1]),motivo=parts.slice(2).join(" ").trim()||"No coincide con la matrícula.";if(!Number.isFinite(alumnoId)){await tgSendMessage(chat_id,"Formato: DENEGAR <telegram_user_id> <motivo opcional>");return res.status(200).json({ok:true});}const{error}=await supabase.from("telegram_onboarding_p44").update({acceso_concedido:false,estado:"acceso_denegado",fecha_verificacion:new Date().toISOString(),verificado_por:"PROFESOR",notas:motivo}).eq("telegram_user_id",alumnoId);if(error){await tgSendMessage(chat_id,`❌ Error denegando: ${error.message}`);return res.status(200).json({ok:true});}await tgSendMessage(alumnoId,`❌ Verificación no aprobada: ${motivo}\nSi crees que es un error, escribe REVISAR.`);await tgSendMessage(chat_id,`❌ Denegado P44: ${alumnoId} — ${motivo}`);return res.status(200).json({ok:true});}await tgSendMessage(chat_id,"Comandos P44:\n✅ APROBAR <telegram_user_id>\n❌ DENEGAR <telegram_user_id> <motivo opcional>");return res.status(200).json({ok:true});}
  if(chat_id.toString()!==process.env.TEACHERS_CHAT_ID?.toString()&&(text.toUpperCase()==="REVISAR"||text==="/revisar")){const aviso="🔔 <b>REVISAR ACCESO P44</b>\n\n"+`🆔 Telegram ID: ${telegram_user_id}\n`+`🔤 Usuario: ${username?"@"+username:"-"}\n`+`📱 Teléfono: ${user.telefono??"-"}\n`+`📧 Email: ${user.email??"-"}\n`+`🎓 Curso: ${user.curso??"-"}\n`;await tgSendMessage(process.env.TEACHERS_CHAT_ID,aviso);await tgSendMessage(chat_id,"Perfecto ✅ He avisado al profesor para que revise tu acceso.");return res.status(200).json({ok:true});}
  if(user.estado==="acceso_pendiente_de_solicitud"){
    if(text.toUpperCase()==="HECHO"){
      try {
        const resultado=await intentarAdmision(telegram_user_id);
        if(resultado==="aprobado") { await tgSendMessage(chat_id,"✅ <b>Verificación completada</b>. Ya tienes acceso al grupo. ¡Un saludo! 👋"); await actualizarFichaProfesores(telegram_user_id); }
        else await tgSendMessage(chat_id,"⚠️ Aún no encontramos tu solicitud de acceso. Revisa el paso 2 en el Campus y escribe <b>HECHO</b> después.");
      } catch(error) {
        console.error("Error al reintentar entrada:",error);
        await tgSendMessage(chat_id,"⚠️ No hemos podido comprobar tu solicitud ahora. Inténtalo de nuevo más tarde.");
      }
    } else await tgSendMessage(chat_id,"Tus datos ya están verificados. Solicita el acceso desde el Campus y escribe <b>HECHO</b>.");
    return res.status(200).json({ok:true});
  }
  if(user.estado==="acceso_p1"){if(text.toUpperCase()==="HECHO"){await updateUser(telegram_user_id,{estado:"acceso_p2"});await tgSendMessage(chat_id,msgPaso2());}else await tgSendMessage(chat_id,"Cuando lo hayas hecho, escribe <b>HECHO</b>.");return res.status(200).json({ok:true});}
  if(user.estado==="acceso_p2"){if(text.toUpperCase()==="HECHO"){await updateUser(telegram_user_id,{estado:"acceso_p3"});await tgSendMessage(chat_id,msgPaso3());}else await tgSendMessage(chat_id,"Cuando lo hayas hecho, escribe <b>HECHO</b>.");return res.status(200).json({ok:true});}
  if(user.estado==="acceso_p3"){if(!isValidLinePaso2(text)){await tgSendMessage(chat_id,"Formato incorrecto. Envíame exactamente 3 líneas. Ejemplo:\nMiguel García Fernández\nmiguel.acrapol@acrapol.es\nTotal44");return res.status(200).json({ok:true});}const{nombre,email,curso}=extractPaso2(text);await updateUser(telegram_user_id,{nombre,email,curso,estado:"acceso_p4"});await tgSendMessage(chat_id,msgPaso4(),shareContactKeyboard());return res.status(200).json({ok:true});}
  if(user.estado==="acceso_p4"){if(msg.contact&&msg.contact.phone_number){if(!msg.contact.user_id||msg.contact.user_id!==telegram_user_id){await tgSendMessage(chat_id,"❌ Ese no es tu contacto.\nPulsa <b>📱 Enviar mi contacto</b> (no vale enviar un contacto desde la agenda).",shareContactKeyboard());return res.status(200).json({ok:true});}await updateUser(telegram_user_id,{telefono:msg.contact.phone_number,estado:"acceso_pendiente_revision"});const refreshed=await getOrCreateUser(telegram_user_id,username);await tgSendMessage(chat_id,"Contacto recibido ✅",removeKeyboard());await tgSendMessage(chat_id,msgPaso5());await notifyTeachers(refreshed,telegram_user_id,username,tg_name);return res.status(200).json({ok:true});}await tgSendMessage(chat_id,"Pulsa <b>📱 Enviar mi contacto</b> (y asegúrate de tener “¿Quién puede ver mi número?” en <b>TODOS</b>).",shareContactKeyboard());return res.status(200).json({ok:true});}
  await tgSendMessage(chat_id,msgInicio(),mainMenuKeyboard());return res.status(200).json({ok:true});
}
