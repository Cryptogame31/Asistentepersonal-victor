"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
// Load environment variables before anything else
dotenv.config();
const telegraf_1 = require("telegraf");
const firebase_admin_1 = require("../lib/firebase-admin");
const gemini_1 = require("../services/gemini");
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN no está definido en el archivo .env');
    process.exit(1);
}
const bot = new telegraf_1.Telegraf(token);
// Cache users to avoid querying Firestore on every single message (refreshed dynamically)
const userCache = new Map();
async function findUserByTelegramChatId(chatId) {
    if (userCache.has(chatId)) {
        return userCache.get(chatId);
    }
    try {
        const usersRef = firebase_admin_1.adminDb.collection('users');
        const snapshot = await usersRef.where('telegramChatId', '==', chatId.toString()).limit(1).get();
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        const data = doc.data();
        const userInfo = { id: doc.id, name: data.name || 'Usuario' };
        userCache.set(chatId, userInfo);
        return userInfo;
    }
    catch (error) {
        console.error('Error buscando usuario en Firestore:', error);
        return null;
    }
}
async function linkUser(uid, chatId, firstName) {
    const userRef = firebase_admin_1.adminDb.collection('users').doc(uid);
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
async function uploadAudioToStorage(userId, audioBuffer) {
    try {
        const bucket = (0, firebase_admin_1.getStorage)().bucket();
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
    }
    catch (error) {
        console.error('Error al subir nota de voz a Firebase Storage:', error);
        // Return a dummy value or throw
        return '';
    }
}
/**
 * Saves the parsed result from Gemini into Firestore.
 */
async function saveParsedResult(userId, parsed, inputType, rawInputSource) {
    const batch = firebase_admin_1.adminDb.batch();
    const timestamp = firebase_admin_1.FieldValue.serverTimestamp();
    let responseMessage = '';
    // 1. Create a log in inbox_logs
    const logRef = firebase_admin_1.adminDb.collection('inbox_logs').doc();
    const logData = {
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
    }
    else {
        logData.rawInput = rawInputSource; // This is the original text
    }
    batch.set(logRef, logData);
    // 2. Perform category-specific insertions
    if (parsed.category === 'evento' && parsed.event) {
        const eventRef = firebase_admin_1.adminDb.collection('events_reminders').doc();
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
    }
    else if (parsed.category === 'proyecto' && parsed.project) {
        const projectRef = firebase_admin_1.adminDb.collection('projects_goals').doc();
        // Add subtask IDs
        const tasksWithIds = parsed.project.tasks.map((task, index) => ({
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
            category: parsed.project.category,
            tasks: tasksWithIds,
            createdAt: timestamp
        };
        batch.set(projectRef, projectData);
        const tareasList = tasksWithIds.map(t => `  - [ ] ${t.title}`).join('\n');
        responseMessage = `🚀 *Proyecto Creado*:\n\n` +
            `• *Título*: ${parsed.project.title}\n` +
            `• *Descripción*: ${parsed.project.description}\n` +
            `• *Categoría*: ${parsed.project.category.toUpperCase()}\n` +
            `• *Subtareas*:\n${tareasList}`;
    }
    else if (parsed.category === 'plan' && parsed.plan) {
        const planRef = firebase_admin_1.adminDb.collection('free_time_plans').doc();
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
    }
    else {
        // Default to Inbox log
        responseMessage = `📝 *Nota Guardada en tu Inbox*:\n\n_"${parsed.summaryText}"_`;
    }
    await batch.commit();
    return responseMessage;
}
/**
 * Fallback to save raw input to inbox if parsing fails.
 */
async function saveFallback(userId, text, inputType) {
    const logRef = firebase_admin_1.adminDb.collection('inbox_logs').doc();
    await logRef.set({
        logId: logRef.id,
        userId,
        rawInput: text,
        inputType,
        transcribedText: text,
        parsedCategory: 'inbox',
        status: 'pending',
        createdAt: firebase_admin_1.FieldValue.serverTimestamp()
    });
}
/**
 * Retrieves data from Firestore for conversational queries.
 */
async function retrieveDataFromFirestore(userId, type, period) {
    const data = [];
    const now = new Date();
    // Helper to format dates to YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];
    const todayStr = formatDate(now);
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekStr = formatDate(nextWeek);
    const collectionsToQuery = [];
    if (type === 'general') {
        collectionsToQuery.push('events_reminders', 'projects_goals', 'free_time_plans');
    }
    else if (type === 'eventos') {
        collectionsToQuery.push('events_reminders');
    }
    else if (type === 'proyectos') {
        collectionsToQuery.push('projects_goals');
    }
    else if (type === 'planes') {
        collectionsToQuery.push('free_time_plans');
    }
    for (const collName of collectionsToQuery) {
        try {
            const q = firebase_admin_1.adminDb.collection(collName).where('userId', '==', userId);
            const snapshot = await q.get();
            snapshot.forEach(doc => {
                const item = doc.data();
                let match = true;
                if (collName === 'events_reminders') {
                    if (period === 'hoy')
                        match = item.date === todayStr;
                    else if (period === 'mañana')
                        match = item.date === tomorrowStr;
                    else if (period === 'semana')
                        match = item.date >= todayStr && item.date <= nextWeekStr;
                }
                else if (collName === 'free_time_plans') {
                    if (period === 'hoy')
                        match = item.plannedDate === todayStr;
                    else if (period === 'mañana')
                        match = item.plannedDate === tomorrowStr;
                    else if (period === 'semana')
                        match = item.plannedDate >= todayStr && item.plannedDate <= nextWeekStr;
                }
                else if (collName === 'projects_goals') {
                    if (period !== 'todo')
                        match = item.status === 'en_progreso';
                }
                if (match) {
                    data.push({
                        id: doc.id,
                        collectionName: collName === 'events_reminders' ? 'evento' : collName === 'projects_goals' ? 'proyecto' : 'plan',
                        ...item
                    });
                }
            });
        }
        catch (err) {
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
        }
        catch (err) {
            console.error('Error linking user:', err);
            ctx.reply('❌ Hubo un problema al vincular tu cuenta. Asegúrate de que el enlace sea correcto o intenta escribir `/vincular TU_UID`.');
        }
    }
    else {
        ctx.reply(`👋 ¡Hola ${firstName}!\n\nBienvenido al bot de tu *Bitácora Personal Inteligente*.\n\n` +
            `Para empezar a capturar ideas, citas o proyectos, debes vincular tu cuenta:\n` +
            `1. Abre la aplicación web.\n` +
            `2. Ve a la esquina inferior izquierda de la barra lateral y copia tu *ID de Vinculación Bot*.\n` +
            `3. Envía aquí el comando:\n` +
            `   \`/vincular TU_ID_COPIADO\`` +
            `\n\n_O bien, haz clic en el botón azul "Abrir Telegram Bot" en la esquina superior derecha del Dashboard para vincularte automáticamente en 1 click._`, { parse_mode: 'Markdown' });
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
    }
    catch (err) {
        console.error('Error linking user:', err);
        ctx.reply('❌ Error al vincular la cuenta. Verifica que el ID de Firebase sea correcto.');
    }
});
bot.command('id', (ctx) => {
    ctx.reply(`Tu Telegram Chat ID es: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
});
bot.command('ayuda', (ctx) => {
    ctx.reply(`💡 *Guía de captura inteligente*:\n\n` +
        `Simplemente escríbeme o graba una nota de voz con lo que deseas registrar. Ejemplos:\n\n` +
        `• *Eventos y Citas*: "Cita médica con el dentista este viernes a las 3:30 pm" o "Cumpleaños de mamá el 5 de agosto".\n` +
        `• *Compras y Tareas rápidas*: "Necesito comprar 3 cosas para mañana: leche, pan y huevos".\n` +
        `• *Proyectos*: "Proyecto de aprender NextJS con tareas: ver curso básico, hacer una app y subirla a github".\n` +
        `• *Tiempo Libre*: "Cena con amigos el sábado a las 9 de la noche" o "Tarde familiar de películas el domingo".\n` +
        `• *Notas rápidas*: "Idea de negocio: una app para pasear mascotas de forma automatizada".`, { parse_mode: 'Markdown' });
});
// Text Message Handler
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const messageText = ctx.message.text;
    // Ignore commands
    if (messageText.startsWith('/'))
        return;
    const user = await findUserByTelegramChatId(chatId);
    if (!user) {
        return ctx.reply('⚠️ Tu Telegram no está vinculado. Usa `/start` o `/vincular TU_UID` para enlazar tu cuenta.');
    }
    // Trigger typing action
    await ctx.sendChatAction('typing');
    try {
        console.log(`Procesando texto de ${user.name}: "${messageText}"`);
        const parsed = await (0, gemini_1.parseTextMessage)(messageText);
        if (parsed.category === 'consulta' && parsed.query) {
            console.log(`Ejecutando consulta de tipo ${parsed.query.queryType} para el período ${parsed.query.queryPeriod}`);
            const data = await retrieveDataFromFirestore(user.id, parsed.query.queryType, parsed.query.queryPeriod);
            const replyMessage = await (0, gemini_1.generateConversationalResponse)(messageText, data);
            ctx.reply(replyMessage.replace(/\*\*/g, '*'), { parse_mode: 'Markdown' });
        }
        else {
            const replyMessage = await saveParsedResult(user.id, parsed, 'text', messageText);
            ctx.reply(replyMessage, { parse_mode: 'Markdown' });
        }
    }
    catch (error) {
        console.error('Error procesando entrada de texto:', error);
        try {
            await saveFallback(user.id, messageText, 'text');
            ctx.reply('📝 *Guardado en Inbox (sin clasificar)*:\nHubo un problema al categorizar tu nota, pero ya la guardé en tu Inbox para que la revises más tarde.', { parse_mode: 'Markdown' });
        }
        catch (saveErr) {
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
        }
        catch (err) {
            console.warn('No se pudo subir el audio a Firebase Storage. Se guardará con un enlace temporal.', err);
            storageUrl = fileUrlObj.href; // Fallback to telegram URL (expires in 1hr)
        }
        console.log(`Enviando audio a Gemini para transcripción y estructuración...`);
        const parsed = await (0, gemini_1.parseVoiceMessage)(audioBuffer, 'audio/ogg');
        if (parsed.category === 'consulta' && parsed.query) {
            console.log(`Ejecutando consulta de voz de tipo ${parsed.query.queryType} para el período ${parsed.query.queryPeriod}`);
            const data = await retrieveDataFromFirestore(user.id, parsed.query.queryType, parsed.query.queryPeriod);
            const replyMessage = await (0, gemini_1.generateConversationalResponse)(parsed.transcribedText || parsed.summaryText, data);
            const finalReply = `🎙️ *Nota de Voz Transcrita*:\n_"${parsed.transcribedText || parsed.summaryText}"_\n\n${replyMessage}`;
            ctx.reply(finalReply.replace(/\*\*/g, '*'), { parse_mode: 'Markdown' });
        }
        else {
            const replyMessage = await saveParsedResult(user.id, parsed, 'voice', storageUrl || fileUrlObj.href);
            const finalReply = `🎙️ *Nota de Voz Transcrita*:\n_"${parsed.transcribedText}"_\n\n${replyMessage}`;
            ctx.reply(finalReply, { parse_mode: 'Markdown' });
        }
    }
    catch (error) {
        console.error('Error procesando nota de voz:', error);
        ctx.reply('❌ No se pudo procesar tu nota de voz. Por favor, asegúrate de hablar claro o intenta escribir el mensaje.');
    }
});
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
const http_1 = __importDefault(require("http"));
const PORT = process.env.PORT || 3000;
http_1.default.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
}).listen(PORT, () => {
    console.log(`Port server listening on ${PORT} for healthchecks`);
});
