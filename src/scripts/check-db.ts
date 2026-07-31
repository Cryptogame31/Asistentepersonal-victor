import * as dotenv from 'dotenv';
dotenv.config();

import { adminDb } from '../lib/firebase-admin';

async function checkDatabase() {
  console.log(`🔍 Verificando TODO Firestore (Usuarios y Registros)...`);

  // 1. Check all users
  try {
    const snapshot = await adminDb.collection('users').get();
    console.log(`\n👥 Colección: [users] - Encontrados: ${snapshot.size} perfiles`);
    snapshot.forEach(doc => {
      console.log(`  - User UID: ${doc.id}`);
      console.log(`    Detalles:`, JSON.stringify(doc.data(), null, 2));
    });
  } catch (err: any) {
    console.error(`❌ Error en colección users:`, err.message);
  }

  // 2. Check all collections without userId filter
  const collections = ['inbox_logs', 'events_reminders', 'projects_goals', 'free_time_plans'];

  for (const coll of collections) {
    try {
      const snapshot = await adminDb.collection(coll).get();
      console.log(`\n📂 Colección: [${coll}] - Encontrados: ${snapshot.size} documentos en total`);
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - Doc ID: ${doc.id} | userId: ${data.userId} | category: ${data.parsedCategory || data.category}`);
        if (coll === 'projects_goals') {
          console.log(`    Tasks:`, JSON.stringify(data.tasks, null, 2));
        }
      });
    } catch (err: any) {
      console.error(`❌ Error en colección ${coll}:`, err.message);
    }
  }
}

checkDatabase();
