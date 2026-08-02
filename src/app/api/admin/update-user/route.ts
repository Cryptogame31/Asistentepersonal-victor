import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { uid, subscriptionStatus, role } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID de usuario es obligatorio' }, { status: 400 });
    }

    const updateData: any = {};
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (role !== undefined) updateData.role = role;
    updateData.updatedAt = new Date().toISOString();

    await adminDb.collection('users').doc(uid).update(updateData);

    return NextResponse.json({ success: true, updated: updateData });
  } catch (error: any) {
    console.error('Error updating user via Admin SDK:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar usuario' }, { status: 500 });
  }
}
