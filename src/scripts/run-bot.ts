import * as dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import { Telegraf } from 'telegraf';
import { adminDb, FieldValue, getStorage } from '../lib/firebase-admin';
import { parseTextMessage, parseVoiceMessage, ParsedResult, generateConversationalResponse } from '../services/gemini';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ ERROR: TELEGRAM_BOT_TOKEN no está definido en el archivo .env');
  process.exit(1);
}

const bot = new Telegraf(token, {
  telegram: {
    fetch: globalThis.fetch,
  },
});

// Cache users to avoid querying Firestore on every single message (refreshed dynamically)
const userCache = new Map<number, { id: string; name: string }>();

async function findUserByTelegramChatId(chatId: number) {
  if (userCache.has(chatId)) {
    return userCache.get(chatId);
  }

  try {
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('telegramChatId', '==', chatId.toString()).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    const userInfo = { id: doc.id, name: data.name || 'Usuario' };
    userCache.set(chatId, userInfo);
    return userInfo;
  } catch (error) {
    console.error('Error buscando usuario en Firestore:', error);
    return null;
  }
}

async function linkUser(uid: string, chatId: number, firstName: string) {
  const userRef = adminDb.collection('users').doc(uid);
  
  await userRef.set({
    uid,
    name: firstName,
    telegramChatId: chatId.toString(),
    preferences: {
      theme: 'dark',
      reminderLeadMinutes: 30
    }
  }, { merge: true });

  // Update cache
  userCache.set(chatId, { id: uid, name: firstName });
}

/**
 * Uploads a buffer to Firebase Storage and returns a permanent read URL.
 */
async function uploadAudioToStorage(userId: string, audioBuffer: Buffer): Promise<string> {
  try {
    const bucket = getStorage().bucket();
    const fileName = `voice-notes/${userId}/${Date.now()}.ogg`;
    const file = bucket.file(fileName);

    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/ogg',
      },
    });

    // Make the file public or get a signed URL that expires in the far future
    const signedUrlData = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // Far future
    });

    return signedUrlData[0];
  } catch (error) {
    console.error('Error al subir nota de voz a Firebase Storage:', error);
    // Return a dummy value or throw
    return '';
  }
}

/**
 * Saves the parsed result from Gemini into Firestore.
 */
async function saveParsedResult(
  userId: string, 
  parsed: ParsedResult, 
  inputType: 'text' | 'voice', 
  rawInputSource: string
): Promise<string> {
  const batch = adminDb.batch();
  const timestamp = FieldValue.serverTimestamp();
  
  let responseMessage = '';

  // 1. Create a log in inbox_logs
  const logRef = adminDb.collection('inbox_logs').doc();
  const logData: any = {
    logId: logRef.id,
    userId,
    inputType,
    transcribedText: parsed.transcribedText || parsed.summaryText,
    parsedCategory: parsed.category,
    status: 'processed',
    createdAt: timestamp,
  };

  // If voice, we set the Firebase Storage URL as rawInput
  if (inputType === 'voice') {
    logData.rawInput = rawInputSource; // This is the storage URL
  } else {
    logData.rawInput = rawInputSource; // This is the original text
  }

  batch.set(logRef, logData);

  // 2. Perform category-specific insertions
  if (parsed.category === 'evento' && parsed.event) {
    const eventRef = adminDb.collection('events_reminders').doc();
    const eventData = {
      eventId: eventRef.id,
      userId,
      title: parsed.event.title,
      date: parsed.event.date,
      time: parsed.event.time || '',
      category: parsed.event.category,
      status: 'pendiente',
      reminderSent: false,
      reminder24hSent: false,
      reminder1hSent: false,
      createdAt: timestamp
    };
    batch.set(eventRef, eventData);

    const horaMsg = parsed.event.time ? ` a las ${parsed.event.time}` : '';
    responseMessage = `📅 *Evento Agendado*:\n\n` +
      `• *Título*: ${parsed.event.title}\n` +
      `• *Fecha*: ${parsed.event.date}${horaMsg}\n` +
      `• *Categoría*: ${parsed.event.category.toUpperCase()}`;

  } else if (parsed.category === 'proyecto' && parsed.project) {
    if (parsed.project.isSubtaskAdd) {
      const projectsSnap = await adminDb.collection('projects_goals')
        .where('userId', '==', userId)
        .get();

      let targetDoc: any = null;
      let targetData: any = null;
      const searchTitle = parsed.project.title.toLowerCase();

      projectsSnap.forEach(d => {
        const pData = d.data();
        if (pData.title && (pData.title.toLowerCase().includes(searchTitle) || searchTitle.includes(pData.title.toLowerCase()))) {
          targetDoc = d;
          targetData = pData;
        }
      });

      if (targetDoc && targetData) {
        const newTasks = (parsed.project.tasks || []).map((t, idx) => ({
          taskId: `task_${Date.now()}_${idx}`,
          title: t.title,
          completed: false
        }));

        const updatedTasks = [...(targetData.tasks || []), ...newTasks];
        await targetDoc.ref.update({ tasks: updatedTasks });

        const addedList = newTasks.map(t => `  - [ ] ${t.title}`).join('\n');
        return `📌 *Nuevas subtareas agregadas al proyecto "${targetData.title}"*:\n\n${addedList}`;
      }
    }

    const projectRef = adminDb.collection('projects_goals').doc();
    
    // Add subtask IDs
    const tasksWithIds = (parsed.project.tasks || []).map((task, index) => ({
      taskId: `task_${Date.now()}_${index}`,
      title: task.title,
      completed: false
    }));

    const projectData = {
      projectId: projectRef.id,
      userId,
      title: parsed.project.title,
      description: parsed.project.description || '',
      targetDate: parsed.project.targetDate || '',
      status: 'en_progreso',
      category: parsed.project.category || 'personal',
      tasks: tasksWithIds,
      createdAt: timestamp
    };
    batch.set(projectRef, projectData);

    const tareasList = tasksWithIds.map(t => `  - [ ] ${t.title}`).join('\n');
    responseMessage = `🚀 *Proyecto Creado*:\n\n` +
      `• *Título*: ${parsed.project.title}\n` +
      `• *Descripción*: ${parsed.project.description || 'Sin descripción'}\n` +
      `• *Categoría*: ${(parsed.project.category || 'personal').toUpperCase()}\n` +
      `• *Subtareas*:\n${tareasList}`;

  } else if (parsed.category === 'plan' && parsed.plan) {
    const planRef = adminDb.collection('free_time_plans').doc();
    const planData = {
      planId: planRef.id,
      userId,
      title: parsed.plan.title,
      activityType: parsed.plan.activityType,
      plannedDate: parsed.plan.plannedDate,
      durationHours: parsed.plan.durationHours,
      status: 'planificado',
      createdAt: timestamp
    };
    batch.set(planRef, planData);

    responseMessage = `🏡 *Plan de Tiempo Libre Registrado*:\n\n` +
      `• *Actividad*: ${parsed.plan.title}\n` +
      `• *Fecha*: ${parsed.plan.plannedDate}\n` +
      `• *Duración*: ${parsed.plan.durationHours} horas\n` +
      `• *Tipo*: ${parsed.plan.activityType.toUpperCase()}`;

  } else if (parsed.category === 'tarea') {
    const taskRef = adminDb.collection('daily_tasks').doc();
    const taskTitle = parsed.dailyTask?.title || parsed.summaryText;
    const taskCat = parsed.dailyTask?.category || 'general';
    const taskDate = parsed.dailyTask?.dueDate || new Date().toISOString().split('T')[0];

    const taskData = {
      taskId: taskRef.id,
      userId,
      title: taskTitle,
      category: taskCat,
      dueDate: taskDate,
      completed: false,
      createdAt: timestamp
    };
    batch.set(taskRef, taskData);

    responseMessage = `✅ *Tarea Diaria Guardada (Módulo 5)*:\n\n` +
      `• *Tarea*: ${taskTitle}\n` +
      `• *Categoría*: ${taskCat.toUpperCase()}\n` +
      `• *Fecha*: ${taskDate}`;

  } else {
    // Default to Inbox log
    responseMessage = `📝 *Nota Guardada en tu Inbox*:\n\n_"${parsed.summaryText}"_`;
  }

  await batch.commit();
  return responseMessage;
}

/**
 * Fallback to save raw input to inbox if parsing fails.
 */
async function saveFallback(userId: string, text: string, inputType: 'text' | 'voice') {
  const logRef = adminDb.collection('inbox_logs').doc();
  await logRef.set({
    logId: logRef.id,
    userId,
    rawInput: text,
    inputType,
    transcribedText: text,
    parsedCategory: 'inbox',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp()
  });
}

/**
 * Retrieves data from Firestore for conversational queries.
 */
async function retrieveDataFromFirestore(
  userId: string, 
  type: 'eventos' | 'proyectos' | 'planes' | 'tareas' | 'general', 
  period: 'hoy' | 'mañana' | 'semana' | 'todo'
): Promise<any[]> {
  const data: any[] = [];
  const now = new Date();
  
  // Helper to format dates to YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = formatDate(now);
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = formatDate(nextWeek);

  const collectionsToQuery: string[] = [];
  if (type === 'general') {
    collectionsToQuery.push('events_reminders', 'projects_goals', 'free_time_plans', 'daily_tasks');
  } else if (type === 'eventos') {
    collectionsToQuery.push('events_reminders');
  } else if (type === 'proyectos') {
    collectionsToQuery.push('projects_goals');
  } else if (type === 'planes') {
    collectionsToQuery.push('free_time_plans');
  } else if (type === 'tareas') {
    collectionsToQuery.push('daily_tasks');
  }

  for (const collName of collectionsToQuery) {
    try {
      const q = adminDb.collection(collName).where('userId', '==', userId);
      const snapshot = await q.get();
      
      snapshot.forEach(doc => {
        const item = doc.data();
        let match = true;
        
        if (collName === 'events_reminders') {
          if (period === 'hoy') match = item.date === todayStr;
          else if (period === 'mañana') match = item.date === tomorrowStr;
          else if (period === 'semana') match = item.date >= todayStr && item.date <= nextWeekStr;
        } else if (collName === 'free_time_plans') {
          if (period === 'hoy') match = item.plannedDate === todayStr;
          else if (period === 'mañana') match = item.plannedDate === tomorrowStr;
          else if (period === 'semana') match = item.plannedDate >= todayStr && item.plannedDate <= nextWeekStr;
        } else if (collName === 'projects_goals') {
          if (period !== 'todo') match = item.status === 'en_progreso';
        } else if (collName === 'daily_tasks') {
          match = !item.completed;
        }
        
        if (match) {
          data.push({ 
            id: doc.id, 
            collectionName: collName === 'events_reminders' ? 'evento' : collName === 'projects_goals' ? 'proyecto' : collName === 'daily_tasks' ? 'tarea' : 'plan',
            ...item 
          });
        }
      });
    } catch (err) {
      console.error(`Error consultando colección ${collName}:`, err);
    }
  }

  return data;
}

// Bot Command Handlers
bot.start(async (ctx) => {
  const uid = ctx.payload; // Deep-linked parameter: /start <uid>
  const chatId = ctx.chat.id;
  const firstName = ctx.from.first_name || 'Usuario';

  if (uid) {
    try {
      await linkUser(uid, chatId, firstName);
      ctx.reply(`🎉 ¡Hola ${firstName}! Tu Telegram ha sido vinculado correctamente a tu cuenta de la Bitácora.\n\nYa puedes enviarme mensajes de texto o notas de voz para registrarlas en tu Dashboard.`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Error linking user:', err);
      ctx.reply('❌ Hubo un problema al vincular tu cuenta. Asegúrate de que el enlace sea correcto o intenta escribir `/vincular TU_UID`.');
    }
  } else {
    ctx.reply(
      `👋 ¡Hola ${firstName}!\n\nBienvenido al bot de tu *Bitácora Personal Inteligente*.\n\n` +
      `Para empezar a capturar ideas, citas o proyectos, debes vincular tu cuenta:\n` +
      `1. Abre la aplicación web.\n` +
      `2. Ve a la esquina inferior izquierda de la barra lateral y copia tu *ID de Vinculación Bot*.\n` +
      `3. Envía aquí el comando:\n` +
      `   \`/vincular TU_ID_COPIADO\`` +
      `\n\n_O bien, haz clic en el botón azul "Abrir Telegram Bot" en la esquina superior derecha del Dashboard para vincularte automáticamente en 1 click._`, 
      { parse_mode: 'Markdown' }
    );
  }
});

bot.command('vincular', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const uid = parts[1];
  const chatId = ctx.chat.id;
  const firstName = ctx.from.first_name || 'Usuario';

  if (!uid) {
    return ctx.reply('❌ Debes proporcionar tu UID. Ejemplo: `/vincular aBcdEfGhIjKlMnOpQrStUvWxYz12`', { parse_mode: 'Markdown' });
  }

  try {
    await linkUser(uid, chatId, firstName);
    ctx.reply(`🎉 ¡Vinculación exitosa! Hola ${firstName}, tu cuenta de Telegram ya está enlazada.`, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Error linking user:', err);
    ctx.reply('❌ Error al vincular la cuenta. Verifica que el ID de Firebase sea correcto.');
  }
});

bot.command('id', (ctx) => {
  ctx.reply(`Tu Telegram Chat ID es: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
});

const MANUAL_TEXT = 
  `📖 *MANUAL DE USO Y REGLAS DEL BOT* 🤖\n\n` +
  `Puedes enviarme texto o *notas de voz* de forma natural. Aquí están las reglas para que el bot organice todo en tu Dashboard:\n\n` +
  `1️⃣ *TAREAS DIARIAS (Módulo 5)*:\n` +
  `• Di la palabra *"tarea"*, *"tarea del día"* o *"pendiente"*.\n` +
  `• Ejemplos:\n` +
  `  - "Guardar tarea enviar informe a Juan"\n` +
  `  - "Tarea del día comprar pan"\n` +
  `  - "Pendiente llamar al fontanero"\n\n` +
  `2️⃣ *AÑADIR SUBTAREAS A UN PROYECTO EXISTENTE (Módulo 3)*:\n` +
  `• Di *"agregar tarea X al proyecto Y"* o *"añadir subtarea X a mi proyecto Y"*.\n` +
  `• Ejemplos:\n` +
  `  - "Agregar tarea comprar pintura al proyecto remodelar casa"\n` +
  `  - "Añadir subtarea subir a GitHub a mi proyecto aprender NextJS"\n\n` +
  `3️⃣ *CREAR UN PROYECTO NUEVO (Módulo 3)*:\n` +
  `• Di *"Proyecto X con tareas: A, B y C"*.\n` +
  `• Ejemplo: "Proyecto remodelar cocina con tareas: comprar azulejos, llamar al albañil y pintar".\n\n` +
  `4️⃣ *EVENTOS Y CITAS (Módulo 2)*:\n` +
  `• Menciona la fecha u hora.\n` +
  `• Ejemplo: "Cita médica el viernes a las 3:30 pm".\n\n` +
  `5️⃣ *TIEMPO LIBRE (Módulo 4)*:\n` +
  `• Menciona actividades de ocio o familia.\n` +
  `• Ejemplo: "Cena con amigos el sábado en la noche".\n\n` +
  `6️⃣ *CONSULTAS Y REPORTES*:\n` +
  `• Ejemplos: "qué citas tengo hoy?", "dame mis tareas pendientes", "cuáles son mis proyectos en progreso?".`;

bot.command(['ayuda', 'manual', 'guia'], (ctx) => {
  ctx.reply(MANUAL_TEXT, { parse_mode: 'Markdown' });
});

// Text Message Handler
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const messageText = ctx.message.text;

  // Ignore commands
  if (messageText.startsWith('/')) return;

  const user = await findUserByTelegramChatId(chatId);
  if (!user) {
    return ctx.reply('⚠️ Tu Telegram no está vinculado. Usa `/start` o `/vincular TU_UID` para enlazar tu cuenta.');
  }

  // Trigger typing action
  await ctx.sendChatAction('typing');

  try {
    console.log(`Procesando texto de ${user.name}: "${messageText}"`);
    const parsed = await parseTextMessage(messageText);
    
    if (parsed.category === 'consulta' && parsed.query) {
      console.log(`Ejecutando consulta de tipo ${parsed.query.queryType} para el período ${parsed.query.queryPeriod}`);
      const data = await retrieveDataFromFirestore(user.id, parsed.query.queryType, parsed.query.queryPeriod);
      const replyMessage = await generateConversationalResponse(messageText, data);
      ctx.reply(replyMessage.replace(/\*\*/g, '*'), { parse_mode: 'Markdown' });
    } else {
      const replyMessage = await saveParsedResult(user.id, parsed, 'text', messageText);
      ctx.reply(replyMessage, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error procesando entrada de texto:', error);
    try {
      await saveFallback(user.id, messageText, 'text');
      ctx.reply('📝 *Guardado en Inbox (sin clasificar)*:\nHubo un problema al categorizar tu nota, pero ya la guardé en tu Inbox para que la revises más tarde.', { parse_mode: 'Markdown' });
    } catch (saveErr) {
      console.error('Error en fallback:', saveErr);
      ctx.reply('❌ Hubo un error al guardar tu nota. Por favor, verifica la conexión.');
    }
  }
});

// Voice Note Handler
bot.on('voice', async (ctx) => {
  const chatId = ctx.chat.id;
  
  const user = await findUserByTelegramChatId(chatId);
  if (!user) {
    return ctx.reply('⚠️ Tu Telegram no está vinculado. Usa `/start` o `/vincular TU_UID` para enlazar tu cuenta.');
  }

  await ctx.sendChatAction('record_voice');

  try {
    const fileId = ctx.message.voice.file_id;
    console.log(`Descargando nota de voz de ${user.name} (fileId: ${fileId})...`);
    
    const fileUrlObj = await ctx.telegram.getFileLink(fileId);
    
    // Download file buffer
    const fileResponse = await fetch(fileUrlObj.href);
    const fileArrayBuffer = await fileResponse.arrayBuffer();
    const audioBuffer = Buffer.from(fileArrayBuffer);
    
    await ctx.sendChatAction('typing');
    
    // Upload to Firebase Storage
    let storageUrl = '';
    try {
      storageUrl = await uploadAudioToStorage(user.id, audioBuffer);
      console.log(`Audio subido correctamente a Firebase Storage: ${storageUrl}`);
    } catch (err) {
      console.warn('No se pudo subir el audio a Firebase Storage. Se guardará con un enlace temporal.', err);
      storageUrl = fileUrlObj.href; // Fallback to telegram URL (expires in 1hr)
    }

    console.log(`Enviando audio a Gemini para transcripción y estructuración...`);
    const parsed = await parseVoiceMessage(audioBuffer, 'audio/ogg');
    
    if (parsed.category === 'consulta' && parsed.query) {
      console.log(`Ejecutando consulta de voz de tipo ${parsed.query.queryType} para el período ${parsed.query.queryPeriod}`);
      const data = await retrieveDataFromFirestore(user.id, parsed.query.queryType, parsed.query.queryPeriod);
      const replyMessage = await generateConversationalResponse(parsed.transcribedText || parsed.summaryText, data);
      const finalReply = `🎙️ *Nota de Voz Transcrita*:\n_"${parsed.transcribedText || parsed.summaryText}"_\n\n${replyMessage}`;
      ctx.reply(finalReply.replace(/\*\*/g, '*'), { parse_mode: 'Markdown' });
    } else {
      const replyMessage = await saveParsedResult(user.id, parsed, 'voice', storageUrl || fileUrlObj.href);
      const finalReply = `🎙️ *Nota de Voz Transcrita*:\n_"${parsed.transcribedText}"_\n\n${replyMessage}`;
      ctx.reply(finalReply, { parse_mode: 'Markdown' });
    }
    
  } catch (error) {
    console.error('Error procesando nota de voz:', error);
    ctx.reply('❌ No se pudo procesar tu nota de voz. Por favor, asegúrate de hablar claro o intenta escribir el mensaje.');
  }
});

// Register Telegram Native Command Menu (Auto-completes on typing /)
bot.telegram.setMyCommands([
  { command: 'start', description: 'Vincular tu cuenta con la Bitácora AI' },
  { command: 'manual', description: '📖 Ver manual de uso y reglas para voz/texto' },
  { command: 'ayuda', description: '💡 Guía rápida de captura inteligente' },
  { command: 'vincular', description: '🔗 Vincular ID de usuario manualmente' },
  { command: 'id', description: '🆔 Ver tu Telegram Chat ID' },
]).catch(err => console.error('Error registrando comandos de Telegram:', err));

// Launch Bot
bot.launch().then(() => {
  console.log('🤖 Bot de Telegram iniciado correctamente y escuchando...');
}).catch((err) => {
  console.error('Error al iniciar el bot de Telegram:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Lightweight HTTP server for Render free-tier healthchecks
import http from 'http';
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running\n');
}).listen(PORT, () => {
  console.log(`Port server listening on ${PORT} for healthchecks`);
});
