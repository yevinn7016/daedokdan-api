// src/core/config.ts
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Missing env var: ${name}`);
  }
  return value;
}

export const config = {
  // 서버
  port: Number(process.env.PORT ?? 4000),

  // 외부 API
  aladinTtbKey: process.env.ALADIN_TTB_KEY ?? '',

  // 🔥 Firebase (푸시알림)
  firebaseProjectId: required('FIREBASE_PROJECT_ID'),
  firebaseClientEmail: required('FIREBASE_CLIENT_EMAIL'),
  firebasePrivateKey: required('FIREBASE_PRIVATE_KEY'),
};