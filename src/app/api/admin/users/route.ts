import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function GET() {
  try {
    const snap = await adminDb.collection('users').get();
    const users: any[] = [];
    
    snap.forEach(doc => {
      users.push({
        uid: doc.id,
        ...doc.data()
      });
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users via Admin SDK:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener usuarios' }, { status: 500 });
  }
}
