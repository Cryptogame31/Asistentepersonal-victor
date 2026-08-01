import * as dotenv from 'dotenv';
dotenv.config();

import { getApps, initializeApp, cert, getApp, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

let firebaseApp: App;

if (getApps().length === 0) {
  try {
    if (clientEmail && privateKey) {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log('Firebase Admin SDK inicializado con cuenta de servicio.');
    } else {
      firebaseApp = initializeApp({
        projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log('Firebase Admin SDK inicializado usando projectId.');
    }
  } catch (error) {
    console.warn('Advertencia: No se pudo inicializar Firebase Admin SDK. Usando inicialización mínima.', error);
    firebaseApp = initializeApp({ projectId });
  }
} else {
  firebaseApp = getApp();
}

const adminDb = getFirestore(firebaseApp);
const adminAuth = getAuth(firebaseApp);

export { adminDb, adminAuth, firebaseApp, FieldValue, getStorage };
