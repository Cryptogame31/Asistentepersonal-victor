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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTextMessage = parseTextMessage;
exports.parseVoiceMessage = parseVoiceMessage;
exports.generateConversationalResponse = generateConversationalResponse;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const genai_1 = require("@google/genai");
// Initialize Gemini API client
const ai = new genai_1.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});
// JSON Schema for structured output
const parsedResultSchema = {
    type: genai_1.Type.OBJECT,
    properties: {
        category: {
            type: genai_1.Type.STRING,
            enum: ['inbox', 'evento', 'proyecto', 'plan', 'consulta'],
            description: 'La categoría principal detectada del mensaje.',
        },
        summaryText: {
            type: genai_1.Type.STRING,
            description: 'Un resumen de una sola frase o transcripción limpia de lo que el usuario quiere registrar.',
        },
        event: {
            type: genai_1.Type.OBJECT,
            properties: {
                title: { type: genai_1.Type.STRING, description: 'Título del evento o recordatorio' },
                date: { type: genai_1.Type.STRING, description: 'Fecha en formato YYYY-MM-DD' },
                time: { type: genai_1.Type.STRING, description: 'Hora en formato HH:MM (dejar vacío si no se especifica)' },
                category: {
                    type: genai_1.Type.STRING,
                    enum: ['cita', 'cumpleaños', 'compromiso', 'compras'],
                    description: 'Subcategoría del evento',
                },
            },
            required: ['title', 'date', 'category'],
        },
        project: {
            type: genai_1.Type.OBJECT,
            properties: {
                title: { type: genai_1.Type.STRING, description: 'Título del proyecto o meta' },
                description: { type: genai_1.Type.STRING, description: 'Breve descripción del proyecto' },
                targetDate: { type: genai_1.Type.STRING, description: 'Fecha límite tentativa en formato YYYY-MM-DD' },
                category: {
                    type: genai_1.Type.STRING,
                    enum: ['profesional', 'personal', 'aprendizaje'],
                    description: 'Categoría del proyecto',
                },
                tasks: {
                    type: genai_1.Type.ARRAY,
                    items: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            title: { type: genai_1.Type.STRING, description: 'Título de la subtarea' },
                            completed: { type: genai_1.Type.BOOLEAN, description: 'Siempre inicializar en false' },
                        },
                        required: ['title', 'completed'],
                    },
                    description: 'Lista de subtareas extraídas',
                },
            },
            required: ['title', 'description', 'category', 'tasks'],
        },
        plan: {
            type: genai_1.Type.OBJECT,
            properties: {
                title: { type: genai_1.Type.STRING, description: 'Título del plan o actividad de tiempo libre' },
                activityType: {
                    type: genai_1.Type.STRING,
                    enum: ['familia', 'amigos', 'personal'],
                    description: 'Tipo de actividad',
                },
                plannedDate: { type: genai_1.Type.STRING, description: 'Fecha planificada en formato YYYY-MM-DD' },
                durationHours: { type: genai_1.Type.NUMBER, description: 'Duración estimada en horas (por ejemplo: 1.5, 2, 3)' },
            },
            required: ['title', 'activityType', 'plannedDate', 'durationHours'],
        },
        query: {
            type: genai_1.Type.OBJECT,
            properties: {
                queryType: {
                    type: genai_1.Type.STRING,
                    enum: ['eventos', 'proyectos', 'planes', 'general'],
                    description: 'El tipo de información que el usuario desea consultar o listar.',
                },
                queryPeriod: {
                    type: genai_1.Type.STRING,
                    enum: ['hoy', 'mañana', 'semana', 'todo'],
                    description: 'El período de tiempo consultado.',
                },
            },
            required: ['queryType', 'queryPeriod'],
        },
    },
    required: ['category', 'summaryText'],
};
function getSystemInstruction(currentDateStr) {
    return `Eres un asistente de organización personal inteligente en español. Tu objetivo es procesar la entrada del usuario (que puede ser un mensaje escrito o una nota de voz) y estructurarla en un formato JSON limpio.
  
La fecha y hora actual de referencia es: ${currentDateStr}. Usa esto para resolver fechas relativas (ej. "mañana", "el próximo lunes", "el jueves a las 3pm", "mi cumpleaños es en 2 días").

Clasifica la entrada en una de estas 5 categorías:
1. "evento": Para citas médicas, peluquería, reuniones, cumpleaños o tareas con fecha y hora específicas. (Ej. "cita medica hoy 3 pm", "Peluquería mañana 2pm", "reunión el viernes").
2. "proyecto": Para metas, objetivos de aprendizaje o proyectos a mediano/largo plazo que tengan una lista de subtareas asociadas. (Ej. "proyecto estudiar inglés con tareas ver películas y leer").
3. "plan": Para actividades de ocio, descanso, tiempo libre o reuniones con familia y amigos (ej. "cena con amigos el viernes", "ir al cine mañana").
4. "consulta": Cuando el usuario PREGUNTA sobre su información registrada, pide listados, resúmenes, reportes o informes de lo que ya tiene guardado. (Ej. "qué citas tengo hoy?", "dame mis citas de hoy", "dame mis tareas de esta semana", "tengo algún plan para mañana?", "dame un informe de mis citas", "Listado de citas de hoy", "Regálame mis citas de hoy").
5. "inbox": Para notas rápidas, ideas sueltas o cosas generales que no sean citas con hora ni proyectos estructurados. (Ej. "comprar leche", "idea: escribir una novela", "recordar limpiar la casa").

Reglas críticas:
- Si el usuario está preguntando o solicitando ver información (ej. "mostrar citas", "informe", "qué tengo que hacer", "dame mis citas", "regálame mis citas", "listado de citas"), clasifícalo estrictamente como "consulta" y llena el objeto "query".
- Si es una acción a registrar con fecha u hora, clasifícala estrictamente como "evento", "proyecto" o "plan" y llena el objeto respectivo ("event", "project" o "plan"). No lo pongas en "inbox" si contiene fechas, horas o subtareas estructuradas.
- Retorna estrictamente el objeto JSON que se ajusta al esquema proporcionado.`;
}
/**
 * Parses a plain text input using Gemini.
 */
async function parseTextMessage(text) {
    const now = new Date();
    const currentDateStr = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
            { text: `Entrada del usuario: "${text}"` }
        ],
        config: {
            systemInstruction: getSystemInstruction(currentDateStr),
            responseMimeType: 'application/json',
            responseSchema: parsedResultSchema,
        }
    });
    if (!response.text) {
        throw new Error('No se recibió respuesta de Gemini.');
    }
    console.log('--- RESPUESA RAW DE GEMINI (TEXTO) ---');
    console.log(response.text);
    console.log('--------------------------------------');
    const result = JSON.parse(response.text);
    result.transcribedText = text;
    return result;
}
/**
 * Transcribes and parses an audio file buffer (OGG/Opus from Telegram) using Gemini Multimodal.
 */
async function parseVoiceMessage(audioBuffer, mimeType = 'audio/ogg') {
    const now = new Date();
    const currentDateStr = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
            {
                inlineData: {
                    mimeType,
                    data: audioBuffer.toString('base64'),
                }
            },
            {
                text: 'Escucha este audio atentamente. Transcríbelo palabra por palabra en español y luego clasifica y estructura la información extraída según las instrucciones del sistema.'
            }
        ],
        config: {
            systemInstruction: getSystemInstruction(currentDateStr),
            responseMimeType: 'application/json',
            responseSchema: parsedResultSchema,
        }
    });
    if (!response.text) {
        throw new Error('No se recibió respuesta de Gemini al procesar el audio.');
    }
    console.log('--- RESPUESA RAW DE GEMINI (VOZ) ---');
    console.log(response.text);
    console.log('------------------------------------');
    const result = JSON.parse(response.text);
    result.transcribedText = result.summaryText;
    return result;
}
/**
 * Generates a conversational response based on the database content.
 */
async function generateConversationalResponse(userQuery, data) {
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
            {
                text: `El usuario ha preguntado en su asistente de bitácora personal: "${userQuery}".
        
Los datos recuperados en tiempo real de su base de datos de Firestore son los siguientes:
${JSON.stringify(data, null, 2)}

Por favor, redacta una respuesta amigable, corta y bien estructurada en español que responda directamente a su consulta utilizando estos datos. Usa emojis apropiados (ej: 🏥 para citas, 🎂 cumpleaños, 🚀 proyectos, 🏡 tiempo libre, 📅 recordatorios). Usa formato Markdown simple compatible con Telegram: utiliza asterisco simple (*texto*) para negrita, guión bajo simple (_texto_) para cursiva y comillas invertidas (\`texto\`) para código. NUNCA uses doble asterisco (**texto**) para negritas ni escapes innecesarios. Si no hay datos, infórmale cortésmente que no tiene registros para ese período.`
            }
        ]
    });
    return response.text || 'No pude procesar la respuesta en este momento.';
}
