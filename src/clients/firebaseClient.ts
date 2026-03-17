import admin from 'firebase-admin';
import { config } from '../core/config';

function assertFirebaseConfigured() {
  if (!config.firebaseProjectId || !config.firebaseClientEmail || !config.firebasePrivateKey) {
    throw new Error(
      'Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.',
    );
  }
}

if (!admin.apps.length) {
  assertFirebaseConfigured();
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebaseProjectId,
      clientEmail: config.firebaseClientEmail,
      // .env에서는 개행이 "\\n"으로 들어오는 경우가 많아서 실제 개행으로 복원
      privateKey: config.firebasePrivateKey.replace(/\\n/g, '\n'),
    }),
  });
}

export const firebaseAdmin = admin;