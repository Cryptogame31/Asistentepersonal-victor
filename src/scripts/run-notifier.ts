import * as dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import { Telegraf } from 'telegraf';
import { adminDb } from '../lib/firebase-admin';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ ERROR: TELEGRAM_BOT_TOKEN no está definido en el archivo .env');
  process.exit(1);
}

const bot = new Telegraf(token);

async function runNotifier() {
  console.log('⏰ Iniciando escaneo de recordatorios...');
  const now = new Date();

  try {
    // Query events that are pending
    const eventsRef = adminDb.collection('events_reminders');
    const snapshot = await eventsRef
      .where('status', '==', 'pendiente')
      .get();

    if (snapshot.empty) {
      console.log('✅ No hay compromisos pendientes por procesar.');
      return;
    }

    let notificationsSentCount = 0;

    for (const doc of snapshot.docs) {
      const eventId = doc.id;
      const event = doc.data();
      const userId = event.userId;

      // Ensure we have a valid date
      if (!event.date) continue;

      // Extract event date and time
      const [year, month, day] = event.date.split('-').map(Number);
      const [hours, minutes] = (event.time || '09:00').split(':').map(Number); // Default to 9:00 AM if no time is specified
      
      const eventDateTime = new Date(year, month - 1, day, hours, minutes);
      
      const diffMs = eventDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // If the event has already passed, we skip it
      if (diffHours <= 0) {
        continue;
      }

      // Check if we need to send the 24-hour reminder
      const shouldSend24h = diffHours <= 24 && diffHours > 1 && !event.reminder24hSent;
      
      // Check if we need to send the 1-hour reminder
      const shouldSend1h = diffHours <= 1 && diffHours > 0 && !event.reminder1hSent;

      if (!shouldSend24h && !shouldSend1h) {
        continue; // No action needed for this event in this cycle
      }

      // Fetch user to get telegramChatId
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.warn(`⚠️ Evento ${eventId} huérfano. El usuario ${userId} no existe.`);
        continue;
      }

      const userData = userDoc.data();
      const telegramChatId = userData?.telegramChatId;

      if (!telegramChatId) {
        console.warn(`⚠️ El usuario ${userId} no tiene telegramChatId configurado. Saltando.`);
        continue;
      }

      // Determine reminder content details
      let titlePrefix = '';
      let updateFields: any = {};
      
      if (shouldSend24h) {
        titlePrefix = '🔔 *RECORDATORIO (Faltan 24 horas)*';
        updateFields.reminder24hSent = true;
      } else if (shouldSend1h) {
        titlePrefix = '🚨 *RECORDATORIO URGENTE (Falta 1 hora)*';
        updateFields.reminder1hSent = true;
        updateFields.reminderSent = true; // Set general flag as true
      }

      // Send the reminder message
      try {
        const timeDisplay = event.time ? ` a las *${event.time}*` : ' (Todo el día)';
        const dateDisplay = `el ${event.date}`;
        
        let emoji = '📅';
        if (event.category === 'cita') emoji = '🏥';
        else if (event.category === 'cumpleaños') emoji = '🎂';
        else if (event.category === 'compras') emoji = '🛒';
        else if (event.category === 'compromiso') emoji = '🤝';

        const message = 
          `${titlePrefix}\n\n` +
          `• *Título*: ${event.title}\n` +
          `• *Cuándo*: ${dateDisplay}${timeDisplay}\n` +
          `• *Categoría*: ${event.category.toUpperCase()}\n\n` +
          `_Revisa tu dashboard en http://localhost:3000 para completarlo o posponerlo._`;

        await bot.telegram.sendMessage(telegramChatId, message, { parse_mode: 'Markdown' });
        console.log(`✅ Notificación [${shouldSend24h ? '24h' : '1h'}] enviada a usuario ${userId} (${telegramChatId}) para evento: "${event.title}"`);

        // Mark as sent in Firestore
        await doc.ref.update(updateFields);
        notificationsSentCount++;
      } catch (tgErr) {
        console.error(`❌ Error enviando mensaje de Telegram a ${telegramChatId}:`, tgErr);
      }
    }

    if (notificationsSentCount > 0) {
      console.log(`🎉 Notificación escaneada. Recordatorios enviados en este ciclo: ${notificationsSentCount}`);
    }

  } catch (error) {
    console.error('Error durante la ejecución del notificador:', error);
  }
}

// Run immediately on start
runNotifier().then(() => {
  console.log('⏰ Daemon de notificaciones iniciado. Próximo escaneo en 1 minuto...');
});

// Poll the database every 1 minute
setInterval(async () => {
  await runNotifier();
}, 60000);
