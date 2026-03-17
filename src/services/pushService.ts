import { firebaseAdmin } from '../clients/firebaseClient';
import {
  deleteDeviceToken,
  getAllTokens,
  getUserTokens,
} from '../repositories/userDeviceRepository';

export type PushPayload = {
  title: string;
  body: string;
};

async function sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
  if (!tokens.length) {
    console.log('🔕 No FCM tokens to send');
    return;
  }

  const response = await firebaseAdmin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
  });

  const invalidTokens: string[] = [];

  response.responses.forEach((result, index) => {
    if (!result.success && result.error) {
      const code = result.error.code;

      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(tokens[index]);
      }

      console.error(`❌ Push send failed for token[${index}]`, result.error);
    }
  });

  if (invalidTokens.length) {
    await Promise.all(invalidTokens.map((token) => deleteDeviceToken(token)));
    console.log(`🧹 Removed invalid FCM tokens: ${invalidTokens.length}`);
  }

  console.log(
    `✅ Push send complete. success=${response.successCount}, failure=${response.failureCount}`
  );
}

export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  const tokens = await getUserTokens(userId);
  await sendToTokens(tokens, payload);
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const tokens = await getAllTokens();

  if (!tokens.length) {
    console.log('🔕 No tokens for broadcast');
    return;
  }

  const chunkSize = 500; // FCM multicast limit
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    await sendToTokens(chunk, payload);
  }
}