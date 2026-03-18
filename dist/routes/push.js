"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userDeviceRepository_1 = require("../repositories/userDeviceRepository");
const pushService_1 = require("../services/pushService");
const router = express_1.default.Router();
router.post('/token', async (req, res) => {
    try {
        const { userId, token } = req.body;
        if (!userId || !token) {
            return res.status(400).json({
                message: 'userId and token are required',
            });
        }
        await (0, userDeviceRepository_1.saveDeviceToken)(userId, token);
        return res.status(200).json({
            message: 'FCM token saved successfully',
        });
    }
    catch (error) {
        console.error('❌ Failed to save FCM token:', error);
        return res.status(500).json({
            message: 'Failed to save FCM token',
        });
    }
});
router.delete('/token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                message: 'token is required',
            });
        }
        await (0, userDeviceRepository_1.deleteDeviceToken)(token);
        return res.status(200).json({
            message: 'FCM token deleted successfully',
        });
    }
    catch (error) {
        console.error('❌ Failed to delete FCM token:', error);
        return res.status(500).json({
            message: 'Failed to delete FCM token',
        });
    }
});
router.post('/broadcast', async (req, res) => {
    try {
        const { title, body } = req.body;
        if (!title || !body) {
            return res.status(400).json({
                message: 'title and body are required',
            });
        }
        await (0, pushService_1.sendPushToAll)({ title, body });
        return res.status(200).json({
            message: 'Broadcast push sent successfully',
        });
    }
    catch (error) {
        console.error('❌ Failed to send broadcast push:', error);
        return res.status(500).json({
            message: 'Failed to send broadcast push',
        });
    }
});
exports.default = router;
