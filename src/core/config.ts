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
  // NOTE: 배포 환경에서 푸시를 쓰지 않는 경우도 있으므로 optional로 둡니다.
  // 푸시를 실제로 호출하는 시점에만 (firebaseClient에서) 누락 여부를 검사합니다.
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? '',
};