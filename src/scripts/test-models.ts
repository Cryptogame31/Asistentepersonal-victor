import * as dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

async function listModels() {
  try {
    console.log('Consultando modelos disponibles en tu API Key de Gemini...');
    const response = await ai.models.list();
    console.log('✅ Modelos encontrados:');
    
    // Check if response contains models
    if (response && response.models) {
      response.models.forEach((m: any) => {
        console.log(`- ID: ${m.name} | Métodos: ${m.supportedGenerationMethods.join(', ')}`);
      });
    } else {
      console.log('No se devolvió lista de modelos directa. Respuesta:', JSON.stringify(response));
    }
  } catch (error: any) {
    console.error('❌ Error al listar modelos:', error.message);
  }
}

listModels();
