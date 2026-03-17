import admin from 'firebase-admin';
import { config } from '../core/config';

if (!admin.apps.length) {
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