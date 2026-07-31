import * as fs from 'fs';

const jsonPath = 'c:/Users/USER/Downloads/mibotvic-firebase-adminsdk-fbsvc-095da8a639.json';
const envPath = 'c:/Users/USER/Downloads/Antigravity/Asistente personal/.env';

try {
  const credentials = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const clientEmail = credentials.client_email;
  const privateKey = credentials.private_key;

  let envContent = fs.readFileSync(envPath, 'utf8');

  // Escape the newlines of the private key to be literal \n on a single line for the .env standard format
  const escapedKey = privateKey.replace(/\n/g, '\\n');

  // Replace old configurations or add them
  // We'll clean up the entire block first to avoid duplicates
  envContent = envContent.replace(/FIREBASE_CLIENT_EMAIL=".*"\r?\n?/g, '');
  envContent = envContent.replace(/FIREBASE_PRIVATE_KEY=".*"\r?\n?/g, '');
  
  // Clean up any remaining comment lines of admin SDK config to keep it clean
  envContent = envContent.replace(/# --- Firebase Admin SDK Config ---.*\r?\n?/g, '');

  envContent += `\n# --- Firebase Admin SDK Config ---\nFIREBASE_CLIENT_EMAIL="${clientEmail}"\nFIREBASE_PRIVATE_KEY="${escapedKey}"\n`;

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ ¡El archivo .env ha sido actualizado con éxito usando los valores exactos del archivo descargado!');
} catch (err: any) {
  console.error('❌ Error al actualizar el archivo .env:', err.message);
}
