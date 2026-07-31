import { adminDb, FieldValue } from '../lib/firebase-admin';

const sourceUid = '3fNdY7ltyW3xYNvbk4alqN64y93'; // The duplicate account containing today's bot logs
const destUid = 'e3fNdY7ltyW3xYNvbk4alqN64y93';   // The actual account you are logged in on the web

async function migrate() {
  console.log(`🚀 Iniciando migración de datos de ${sourceUid} a ${destUid}...`);

  const collections = ['inbox_logs', 'events_reminders', 'projects_goals', 'free_time_plans'];
  
  for (const coll of collections) {
    const snapshot = await adminDb.collection(coll).where('userId', '==', sourceUid).get();
    console.log(`Mapeando ${snapshot.size} documentos de la colección [${coll}]...`);
    
    if (snapshot.size > 0) {
      const batch = adminDb.batch();
      snapshot.forEach(doc => {
        const docRef = adminDb.collection(coll).doc(doc.id);
        batch.update(docRef, { userId: destUid });
      });
      await batch.commit();
      console.log(`✅ Colección [${coll}] migrada exitosamente.`);
    }
  }

  // Remove telegram link from the duplicate source account
  await adminDb.collection('users').doc(sourceUid).update({
    telegramChatId: FieldValue.delete()
  });
  console.log(`✅ Vinculación de Telegram removida de la cuenta duplicada (${sourceUid}).`);

  // Ensure telegram link is set correctly on the destination account
  await adminDb.collection('users').doc(destUid).set({
    telegramChatId: '1795595987'
  }, { merge: true });
  console.log(`✅ Vinculación de Telegram asegurada en tu cuenta principal (${destUid}).`);

  console.log('\n🎉 ¡MIGRACIÓN COMPLETADA! Todos tus registros ya están consolidados en tu cuenta del Dashboard.');
}

migrate().catch(console.error);
