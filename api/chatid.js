// Endpoint temporal para obtener el ID numérico del grupo de Telegram.

const TG = (method) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function tgSendMessage(chat_id, text) {
  await fetch(TG("sendMessage"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");

  const msg = req.body?.message;
  if (!msg) return res.status(200).json({ ok: true });

  const chat_id = msg.chat?.id;
  const text = (msg.text ?? "").trim();

  if (text === "/chatid" || text.startsWith("/chatid@")) {
    await tgSendMessage(chat_id, `Chat ID: <code>${chat_id}</code>`);
  }

  return res.status(200).json({ ok: true });
}
