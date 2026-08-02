import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../../lib/firebase-admin';

export async function GET() {
  try {
    // 1. Fetch all accounts registered in Firebase Authentication
    const authResult = await adminAuth.listUsers(1000);
    const authUsers = authResult.users;

    // 2. Fetch all Firestore user documents
    const firestoreSnap = await adminDb.collection('users').get();
    const firestoreDocs: Record<string, any> = {};
    firestoreSnap.forEach(d => {
      firestoreDocs[d.id] = d.data();
    });

    // 3. Merge Firebase Auth users with Firestore profile data
    const users = authUsers.map(u => {
      const fsData = firestoreDocs[u.uid] || {};
      return {
        uid: u.uid,
        email: u.email || fsData.email || '',
        name: fsData.name || u.displayName || u.email?.split('@')[0] || 'Usuario',
        displayName: u.displayName || fsData.name || 'Usuario',
        telegramChatId: fsData.telegramChatId || '',
        role: fsData.role || (u.email === 'victorrc3181@gmail.com' ? 'superadmin' : 'user'),
        subscriptionStatus: fsData.subscriptionStatus || 'free',
        createdAt: u.metadata?.creationTime || fsData.createdAt || ''
      };
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users via Admin SDK:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener usuarios' }, { status: 500 });
  }
}
