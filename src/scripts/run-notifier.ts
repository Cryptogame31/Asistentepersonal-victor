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

import { generateMotivationalMorningBriefing } from '../services/gemini';

let lastBriefingDateStr = '';

async function checkAndSendDailyBriefing() {
  const now = new Date();
  
  // Format current date YYYY-MM-DD
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  
  // Trigger at 7:00 AM if it hasn't run yet today
  if (currentHour === 7 && lastBriefingDateStr !== todayStr) {
    console.log(`🌅 Iniciando envío de Resumen Motivacional Matutino (7:00 AM) para ${todayStr}...`);
    lastBriefingDateStr = todayStr;

    try {
      const usersSnap = await adminDb.collection('users').get();
      if (usersSnap.empty) return;

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const telegramChatId = userData?.telegramChatId;
        const userName = userData?.displayName || userData?.name || 'Usuario';

        if (!telegramChatId) continue;

        try {
          // 1. Events for today
          const eventsSnap = await adminDb.collection('events_reminders')
            .where('userId', '==', userId)
            .get();
          
          const eventsToday = eventsSnap.docs
            .map(d => d.data())
            .filter((e: any) => e.date === todayStr);

          // 2. Active projects and their progress
          const projectsSnap = await adminDb.collection('projects_goals')
            .where('userId', '==', userId)
            .get();
          
          const projects = projectsSnap.docs
            .map(d => d.data())
            .filter((p: any) => p.status === 'en_progreso');

          // 3. Pending daily tasks
          const tasksSnap = await adminDb.collection('daily_tasks')
            .where('userId', '==', userId)
            .get();

          const dailyTasks = tasksSnap.docs
            .map(d => d.data())
            .filter((t: any) => !t.completed);

          // Generate Gemini Motivational Briefing
          const briefingMsg = await generateMotivationalMorningBriefing(
            userName,
            eventsToday,
            projects,
            dailyTasks
          );

          await bot.telegram.sendMessage(telegramChatId, briefingMsg, { parse_mode: 'Markdown' });
          console.log(`✅ Resumen Motivacional de las 7:00 AM enviado a ${userName} (${telegramChatId})`);
        } catch (userErr) {
          console.error(`❌ Error enviando resumen a ${userName}:`, userErr);
        }
      }
    } catch (err) {
      console.error('Error durante la generación de resúmenes matutinos:', err);
    }
  }
}

// Run immediately on start
runNotifier().then(() => {
  console.log('⏰ Daemon de notificaciones y resumen matutino iniciado. Próximo escaneo en 1 minuto...');
});

// Poll the database every 1 minute
setInterval(async () => {
  await runNotifier();
  await checkAndSendDailyBriefing();
}, 60000);

// Lightweight HTTP server for Render free-tier healthchecks
import http from 'http';
import https from 'https';

const PORT = process.env.PORT || 3001; // Default fallback to 3001 to avoid local conflict with the bot
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Notifier daemon is running\n');
}).listen(PORT, () => {
  console.log(`Port server listening on ${PORT} for healthchecks`);
});

// Self keep-alive ping every 10 minutes to keep Render free tier awake 24/7
const BOT_URL = process.env.BOT_URL || 'https://asistente-personal-bot.onrender.com';
const NOTIFIER_URL = process.env.NOTIFIER_URL || 'https://asistente-personal-notifier.onrender.com';

setInterval(() => {
  try {
    https.get(BOT_URL, () => {}).on('error', () => {});
    https.get(NOTIFIER_URL, () => {}).on('error', () => {});
    console.log('🔄 Keep-alive ping enviado para mantener Render activo 24/7.');
  } catch (e) {}
}, 10 * 60 * 1000);
