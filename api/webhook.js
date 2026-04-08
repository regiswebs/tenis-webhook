const TELEGRAM_TOKEN = '8622265212:AAFfDsSLYY1CG22ikFgFJ05YfP0L7iUQlBE';
const TELEGRAM_CHAT_ID = '469545869';
const SUPABASE_URL = 'https://lqqevqarvtzxtgzojhcp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxcWV2cWFydnR6eHRnem9qaGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjE3NDMsImV4cCI6MjA5MDI5Nzc0M30.9nLXdM8i0OkT6d4ejSx2Vp83kJfb_CLlLrD6Vvntj88';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(200).send('OK'); return; }
  const update = req.body;
  if (!update?.callback_query) { res.status(200).send('OK'); return; }
  const cb = update.callback_query;
  const [accion, tipo, recId] = cb.data.split('|');
  const messageId = cb.message.message_id;
  await answerCallback(cb.id, accion === 'A' ? '✅ Aprobado' : '❌ Rechazado');
  if (tipo === 'r') {
    const rec    = await sbGet('recuperaciones', `id=eq.${recId}`);
    const alumno = rec ? await sbGet('alumnos', `id=eq.${rec.alumno_id}`) : null;
    const clase  = rec ? await sbGet('clases',  `id=eq.${rec.clase_id}`)  : null;
    const nombre = alumno ? `${alumno.nombre} ${alumno.apellidos}` : 'el alumno';
    let tel = alumno ? (alumno.telefono || alumno.tel_tutor || '').replace(/[^0-9]/g,'') : '';
    if (tel.length === 9) tel = '34' + tel;
    const claNom = clase ? clase.nombre : 'la clase';
    const fecha  = rec ? new Date(rec.fecha).toLocaleDateString('es-ES') : '';
    if (accion === 'A') {
      await sbPatch('recuperaciones', `id=eq.${recId}`, { estado: 'aceptada' });
      const waMsg = `Hola ${nombre}, tu recuperación en ${claNom} el ${fecha} ha sido ✅ CONFIRMADA. ¡Nos vemos! Un saludo, Martín.`;
      const waUrl = `https://wa.me/${tel}?text=${encodeURIComponent(waMsg)}`;
      await editMessage(messageId,
        `✅ *Recuperación APROBADA*\n\n👤 ${nombre}\n📅 ${claNom} · ${fecha}`,
        { inline_keyboard: [[{ text: '📲 WhatsApp al alumno', url: waUrl }]] }
      );
    } else {
      await sbPatch('recuperaciones', `id=eq.${recId}`, { estado: 'rechazada' });
      await editMessage(messageId, `❌ *Solicitud rechazada*\n\n👤 ${nombre}\n📅 ${claNom} · ${fecha}`);
    }
  }
  res.status(200).send('OK');
}

async function editMessage(msgId, text, keyboard = null) {
  const body = { chat_id: TELEGRAM_CHAT_ID, message_id: msgId, text, parse_mode: 'Markdown',
    reply_markup: JSON.stringify(keyboard || { inline_keyboard: [] }) };
  await tgReq('editMessageText', body);
}
async function answerCallback(cbId, text = '') {
  await tgReq('answerCallbackQuery', { callback_query_id: cbId, text });
}
async function tgReq(method, params) {
  const form = new URLSearchParams(params);
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, { method: 'POST', body: form });
}
async function sbGet(table, filter) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const d = await r.json();
  return d?.[0] || null;
}
async function sbPatch(table, filter, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  });
}
