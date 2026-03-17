import express, { Request, Response } from 'express';
import { saveDeviceToken, deleteDeviceToken } from '../repositories/userDeviceRepository';
import { sendPushToAll } from '../services/pushService';

const router = express.Router();

router.post('/token', async (req: Request, res: Response) => {
  try {
    const { userId, token } = req.body as { userId?: string; token?: string };

    if (!userId || !token) {
      return res.status(400).json({
        message: 'userId and token are required',
      });
    }

    await saveDeviceToken(userId, token);

    return res.status(200).json({
      message: 'FCM token saved successfully',
    });
  } catch (error) {
    console.error('❌ Failed to save FCM token:', error);
    return res.status(500).json({
      message: 'Failed to save FCM token',
    });
  }
});

router.delete('/token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token?: string };

    if (!token) {
      return res.status(400).json({
        message: 'token is required',
      });
    }

    await deleteDeviceToken(token);

    return res.status(200).json({
      message: 'FCM token deleted successfully',
    });
  } catch (error) {
    console.error('❌ Failed to delete FCM token:', error);
    return res.status(500).json({
      message: 'Failed to delete FCM token',
    });
  }
});

router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { title, body } = req.body as { title?: string; body?: string };

    if (!title || !body) {
      return res.status(400).json({
        message: 'title and body are required',
      });
    }

    await sendPushToAll({ title, body });

    return res.status(200).json({
      message: 'Broadcast push sent successfully',
    });
  } catch (error) {
    console.error('❌ Failed to send broadcast push:', error);
    return res.status(500).json({
      message: 'Failed to send broadcast push',
    });
  }
});

export default router;