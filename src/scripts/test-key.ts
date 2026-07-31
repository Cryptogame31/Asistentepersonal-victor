import * as dotenv from 'dotenv';
dotenv.config();

import * as crypto from 'crypto';

const pk = process.env.FIREBASE_PRIVATE_KEY || '';
console.log('Clave leída de .env (primeros 50 caracteres):', JSON.stringify(pk.substring(0, 50)));

// Clean up key line breaks
let cleanedKey = pk.trim();

// Print line-by-line length details
const lines = cleanedKey.split(/\r?\n/);
console.log(`La clave tiene ${lines.length} líneas en total.`);
lines.forEach((line, idx) => {
  console.log(`Línea ${idx + 1}: longitud ${line.length} | Comienza con: ${line.substring(0, 15)}...`);
});

try {
  crypto.createPrivateKey(cleanedKey);
  console.log('✅ ¡LA CLAVE DIRECTA ES VÁLIDA PARA CRYPTO!');
} catch (e: any) {
  console.error('❌ CLAVE DIRECTA INVÁLIDA:', e.message);
  
  // Let's try to reconstruct the key properly
  // Make sure it has correct header/footer and no extra spaces
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  
  const base64Body = lines
    .filter(line => !line.includes('BEGIN PRIVATE KEY') && !line.includes('END PRIVATE KEY'))
    .map(line => line.trim())
    .join(''); // join in a single block
    
  // Re-chunk to 64 character lines as expected by standard PEM
  const chunks = [];
  for (let i = 0; i < base64Body.length; i += 64) {
    chunks.push(base64Body.substring(i, i + 64));
  }
  
  const formattedKey = `${header}\n${chunks.join('\n')}\n${footer}`;
  
  try {
    crypto.createPrivateKey(formattedKey);
    console.log('✅ ¡LA CLAVE RECONSTRUIDA ES TOTALMENTE VÁLIDA!');
    // If the reconstructed key works, we will write it to the .env file!
    console.log('Escribiendo la clave reconstruida y válida a la base de datos...');
  } catch (reconstructedErr: any) {
    console.error('❌ LA CLAVE RECONSTRUIDA TAMBIÉN FALLÓ:', reconstructedErr.message);
  }
}
