import * as dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI, Type, Schema } from '@google/genai';

// Initialize Gemini API client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// JSON Schema for structured output
const parsedResultSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ['inbox', 'evento', 'proyecto', 'plan', 'tarea', 'consulta'],
      description: 'La categoría principal detectada del mensaje.',
    },
    summaryText: {
      type: Type.STRING,
      description: 'Un resumen de una sola frase o transcripción limpia de lo que el usuario quiere registrar.',
    },
    dailyTask: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título de la tarea del día o acción rápida' },
        category: {
          type: Type.STRING,
          enum: ['personal', 'trabajo', 'hogar', 'salud', 'general'],
          description: 'Categoría de la tarea diaria',
        },
        dueDate: { type: Type.STRING, description: 'Fecha asignada YYYY-MM-DD' },
      },
      required: ['title'],
    },
    event: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título del evento o recordatorio' },
        date: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD' },
        time: { type: Type.STRING, description: 'Hora en formato HH:MM (dejar vacío si no se especifica)' },
        category: {
          type: Type.STRING,
          enum: ['cita', 'cumpleaños', 'compromiso', 'compras'],
          description: 'Subcategoría del evento',
        },
      },
      required: ['title', 'date', 'category'],
    },
    project: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título del proyecto o meta' },
        description: { type: Type.STRING, description: 'Breve descripción del proyecto' },
        targetDate: { type: Type.STRING, description: 'Fecha límite tentativa en formato YYYY-MM-DD' },
        category: {
          type: Type.STRING,
          enum: ['profesional', 'personal', 'aprendizaje'],
          description: 'Categoría del proyecto',
        },
        tasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Título de la subtarea' },
              completed: { type: Type.BOOLEAN, description: 'Siempre inicializar en false' },
            },
            required: ['title', 'completed'],
          },
          description: 'Lista de subtareas extraídas',
        },
        isSubtaskAdd: {
          type: Type.BOOLEAN,
          description: 'Establecer en true SI Y SOLO SI el usuario quiere AÑADIR/AGREGAR nuevas subtareas a un proyecto que ya existe (ej: "Agregar tarea comprar pintura al proyecto remodelar cocina").',
        },
      },
      required: ['title'],
    },
    plan: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título del plan o actividad de tiempo libre' },
        activityType: {
          type: Type.STRING,
          enum: ['familia', 'amigos', 'personal'],
          description: 'Tipo de actividad',
        },
        plannedDate: { type: Type.STRING, description: 'Fecha planificada en formato YYYY-MM-DD' },
        durationHours: { type: Type.NUMBER, description: 'Duración estimada en horas (por ejemplo: 1.5, 2, 3)' },
      },
      required: ['title', 'activityType', 'plannedDate', 'durationHours'],
    },
    query: {
      type: Type.OBJECT,
      properties: {
        queryType: {
          type: Type.STRING,
          enum: ['eventos', 'proyectos', 'planes', 'tareas', 'general'],
          description: 'El tipo de información que el usuario desea consultar o listar.',
        },
        queryPeriod: {
          type: Type.STRING,
          enum: ['hoy', 'mañana', 'semana', 'todo'],
          description: 'El período de tiempo consultado.',
        },
      },
      required: ['queryType', 'queryPeriod'],
    },
  },
  required: ['category', 'summaryText'],
};

function getSystemInstruction(currentDateStr: string): string {
  return `Eres un asistente de organización personal inteligente en español. Tu objetivo es procesar la entrada del usuario (que puede ser un mensaje escrito o una nota de voz) y estructurarla en un formato JSON limpio.
  
La fecha y hora actual de referencia es: ${currentDateStr}. Usa esto para resolver fechas relativas (ej. "mañana", "el próximo lunes", "el jueves a las 3pm", "mi cumpleaños es en 2 días").

Clasifica la entrada en una de estas 6 categorías:
1. "evento": Para citas médicas, peluquería, reuniones, cumpleaños o compromisos con fecha y hora específicas. (Ej. "cita medica hoy 3 pm", "Peluquería mañana 2pm", "reunión el viernes").
2. "tarea": Para tareas diarias, pendientes del día, recados, listas de to-do o acciones individuales del Módulo 5 (Tareas Diarias). Usar SIEMPRE que el usuario diga "guardar tarea", "tarea del día", "pendiente", "to-do" o solicite hacer algo individual como comprar algo, enviar un mensaje o realizar un trámite sin crear un gran proyecto con múltiples subtareas. (Ej. "tarea del día comprar leche", "guardar tarea enviar informe a Juan", "pendiente llamar al plomero", "hacer la tarea X para hoy").
3. "proyecto": ÚNICAMENTE para metas complejas a mediano/largo plazo u objetivos estructurados que requieran explícitamente una lista de múltiples subtareas complejas. (Ej. "proyecto remodelar casa con tareas pintar y comprar muebles").
4. "plan": Para actividades de ocio, descanso, tiempo libre o reuniones con familia y amigos (ej. "cena con amigos el viernes", "ir al cine mañana").
5. "consulta": Cuando el usuario PREGUNTA sobre su información registrada, pide listados, resúmenes, reportes o informes de lo que ya tiene guardado. (Ej. "qué citas tengo hoy?", "dame mis tareas de hoy", "cuáles son mis tareas pendientes?", "tengo algún plan para mañana?").
6. "inbox": Para notas rápidas, ideas sueltas o reflexiones que no sean tareas pendientes, citas con hora ni proyectos.

Reglas críticas:
- Si el usuario dice "tarea", "tarea diaria", "pendiente", "to-do" o pide registrar una acción individual, clasifícalo estrictamente como "tarea" y llena el objeto "dailyTask". NO crees un "proyecto" salvo que tenga múltiples subtareas explícitamente.
- Si el usuario está preguntando o solicitando ver información (ej. "mostrar citas", "dame mis tareas", "listado de tareas"), clasifícalo estrictamente como "consulta" y llena el objeto "query".
- Retorna strictly el objeto JSON que se ajusta al esquema proporcionado.`;
}

export interface ParsedResult {
  category: 'inbox' | 'evento' | 'proyecto' | 'plan' | 'tarea' | 'consulta';
  summaryText: string;
  transcribedText?: string;
  dailyTask?: {
    title: string;
    category?: 'personal' | 'trabajo' | 'hogar' | 'salud' | 'general';
    dueDate?: string;
  };
  event?: {
    title: string;
    date: string;
    time?: string;
    category: 'cita' | 'cumpleaños' | 'compromiso' | 'compras';
  };
  project?: {
    title: string;
    description?: string;
    targetDate?: string;
    category?: 'profesional' | 'personal' | 'aprendizaje';
    tasks?: Array<{ title: string; completed: boolean }>;
    isSubtaskAdd?: boolean;
  };
  plan?: {
    title: string;
    activityType: 'familia' | 'amigos' | 'personal';
    plannedDate: string;
    durationHours: number;
  };
  query?: {
    queryType: 'eventos' | 'proyectos' | 'planes' | 'general';
    queryPeriod: 'hoy' | 'mañana' | 'semana' | 'todo';
  };
}

/**
 * Parses a plain text input using Gemini.
 */
export async function parseTextMessage(text: string): Promise<ParsedResult> {
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let response: any = null;
  let attempts = 0;
  while (attempts < 3) {
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: text,
        config: {
          systemInstruction: getSystemInstruction(currentDateStr),
          responseMimeType: 'application/json',
          responseSchema: parsedResultSchema,
        }
      });
      if (response && response.text) break;
    } catch (err) {
      attempts++;
      console.warn(`⚠️ Intento ${attempts} fallido al llamar a Gemini API (texto). Reintentando en 1.5s...`, err);
      if (attempts >= 3) throw err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (!response?.text) {
    throw new Error('No se recibió respuesta válida de Gemini.');
  }

  const result = JSON.parse(response.text) as ParsedResult;
  result.transcribedText = text;
  return result;
}

/**
 * Transcribes and parses an audio file buffer (OGG/Opus from Telegram) using Gemini Multimodal.
 */
export async function parseVoiceMessage(audioBuffer: Buffer, mimeType: string = 'audio/ogg'): Promise<ParsedResult> {
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let response: any = null;
  let attempts = 0;
  while (attempts < 3) {
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType,
              data: audioBuffer.toString('base64'),
            }
          },
          {
            text: 'Escucha este audio atentamente. Transcríbelo en español y luego clasifica y estructura la información extraída según las instrucciones del sistema.'
          }
        ],
        config: {
          systemInstruction: getSystemInstruction(currentDateStr),
          responseMimeType: 'application/json',
          responseSchema: parsedResultSchema,
        }
      });
      if (response && response.text) break;
    } catch (err) {
      attempts++;
      console.warn(`⚠️ Intento ${attempts} fallido al llamar a Gemini API (voz). Reintentando en 1.5s...`, err);
      if (attempts >= 3) throw err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (!response?.text) {
    throw new Error('No se recibió respuesta de Gemini al procesar el audio.');
  }

  console.log('--- RESPUESA RAW DE GEMINI (VOZ) ---');
  console.log(response.text);
  console.log('------------------------------------');

  const result = JSON.parse(response.text) as ParsedResult;
  result.transcribedText = result.summaryText;
  return result;
}

/**
 * Generates a personalized 7:00 AM motivational morning briefing for a user.
 */
export async function generateMotivationalMorningBriefing(
  userName: string,
  eventsToday: any[],
  projects: any[],
  dailyTasks: any[]
): Promise<string> {
  const prompt = `
  Eres el Asistente Personal Inteligente de ${userName}.
  Genera un mensaje motivacional de inicio de día (7:00 AM) cálido, enérgico, inspirador y profesional en español.

  DATOS DEL DÍA DE HOY:
  - Citas/Eventos de hoy (${eventsToday.length}):
  ${eventsToday.length > 0 ? eventsToday.map(e => `  • ${e.title} (${e.time || 'Todo el día'}) - ${e.category || 'Compromiso'}`).join('\n') : '  • No tienes citas programadas para hoy.'}

  - Avance de Proyectos (${projects.length}):
  ${projects.length > 0 ? projects.map(p => {
    const total = p.tasks?.length || 0;
    const done = p.tasks?.filter((t: any) => t.completed)?.length || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return `  • ${p.title}: ${pct}% completado (${done}/${total} subtareas)`;
  }).join('\n') : '  • No tienes proyectos activos actualmente.'}

  - Tareas Diarias Pendientes (${dailyTasks.length}):
  ${dailyTasks.length > 0 ? dailyTasks.map(t => `  • ${t.title} [Categoría: ${t.category || 'general'}]`).join('\n') : '  • ¡Excelente! No tienes tareas diarias pendientes.'}

  FORMATO DEL MENSAJE:
  1. Saludo matutino inspirador con emoji y una frase motivacional corta y poderosa.
  2. 📅 *Citas y Compromisos de Hoy*: Listado claro con hora.
  3. 🚀 *Progreso de Proyectos*: Lista de proyectos con porcentaje de avance.
  4. 📋 *Tareas del Día*: Lista de pendientes clave para hoy.
  5. Cierre positivo deseando un gran día.

  Usa formato de Markdown claro para Telegram (*negrita*, emojis, listas).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || `☀️ *¡Buenos días ${userName}!*\n\nQue tengas un excelente día lleno de éxitos y energía.`;
  } catch (error) {
    console.error('Error generando resumen motivacional:', error);
    return `☀️ *¡Buenos días ${userName}!*\n\nQue tengas un día increíble y muy productivo.`;
  }
}

/**
 * Generates a conversational response based on the database content.
 */
export async function generateConversationalResponse(userQuery: string, data: any[]): Promise<string> {
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
