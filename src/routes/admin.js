import express from 'express';
import { apiKeyAuth } from '../middleware/auth.js';
import {
  adminLogin,
  getAdminStats,
  getAdminAnalytics,
  getAdminLogs,
  getExpiringClients,
  createApiClient,
  listApiClients,
  updateApiClient,
  deleteApiClient,
  regenerateApiKey,
  getClientStats
} from '../controllers/admin.controller.js';

const router = express.Router();

// Public admin routes (no auth)
router.post('/login', adminLogin);

// Apply admin authentication to all routes below
router.use(apiKeyAuth);

router.get('/stats', getAdminStats);
router.get('/analytics', getAdminAnalytics);
router.get('/logs', getAdminLogs);
router.get('/expiring', getExpiringClients);

/**
 * @swagger
 * /admin/clients:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create new API client
 *     description: Create a new API client for tenant usage
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: Client name
 *                 example: "PT. Streaming Indonesia"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Client email
 *                 example: "contact@streaming.id"
 *               rateLimit:
 *                 type: integer
 *                 description: Rate limit per 15 minutes
 *                 default: 100
 *                 example: 1000
 *               allowedEndpoints:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Allowed endpoints (use "*" for all)
 *                 default: ["*"]
 *                 example: ["*"]
 *               expiresAt:
 *                 type: string
 *                 format: date
 *                 description: Expiration date
 *                 example: "2026-12-31"
 *     responses:
 *       201:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API client created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientId:
 *                       type: string
 *                       example: "client_1672531200000"
 *                     name:
 *                       type: string
 *                       example: "PT. Streaming Indonesia"
 *                     email:
 *                       type: string
 *                       example: "contact@streaming.id"
 *                     apiKey:
 *                       type: string
 *                       example: "dk_a1b2c3d4e5f6..."
 *                     rateLimit:
 *                       type: integer
 *                       example: 1000
 *                     allowedEndpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["*"]
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-12-31T00:00:00.000Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-03-05T06:15:30.000Z"
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/clients', createApiClient);

/**
 * @swagger
 * /admin/clients:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List all API clients
 *     description: Get list of all API clients (admin only)
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of clients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API clients retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       clientId:
 *                         type: string
 *                         example: "client_1672531200000"
 *                       name:
 *                         type: string
 *                         example: "PT. Streaming Indonesia"
 *                       email:
 *                         type: string
 *                         example: "contact@streaming.id"
 *                       apiKey:
 *                         type: string
 *                         description: Masked API key
 *                         example: "dk_a1b2c3d..."
 *                       rateLimit:
 *                         type: integer
 *                         example: 1000
 *                       allowedEndpoints:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["*"]
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-12-31T00:00:00.000Z"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-03-05T06:15:30.000Z"
 *                       lastUsed:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2026-03-05T06:15:30.000Z"
 *                       totalRequests:
 *                         type: integer
 *                         example: 15420
 *       401:
 *         description: Unauthorized
 */
router.get('/clients', listApiClients);

/**
 * @swagger
 * /admin/clients/{clientId}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update API client
 *     description: Update existing API client information
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: clientId
 *         in: path
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: string
 *           example: "client_1672531200000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "PT. Streaming Indonesia Updated"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "updated@streaming.id"
 *               rateLimit:
 *                 type: integer
 *                 example: 2000
 *               allowedEndpoints:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["*"]
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               expiresAt:
 *                 type: string
 *                 format: date
 *                 example: "2027-12-31"
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
router.put('/clients/:clientId', updateApiClient);

/**
 * @swagger
 * /admin/clients/{clientId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete API client
 *     description: Delete an API client
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: clientId
 *         in: path
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: string
 *           example: "client_1672531200000"
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/clients/:clientId', deleteApiClient);

/**
 * @swagger
 * /admin/clients/{clientId}/regenerate:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Regenerate API key
 *     description: Generate new API key for existing client
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: clientId
 *         in: path
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: string
 *           example: "client_1672531200000"
 *     responses:
 *       200:
 *         description: API key regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API key regenerated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientId:
 *                       type: string
 *                       example: "client_1672531200000"
 *                     apiKey:
 *                       type: string
 *                       example: "dk_new_key_here..."
 *                     message:
 *                       type: string
 *                       example: "Please save this new API key securely"
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
router.post('/clients/:clientId/regenerate', regenerateApiKey);

/**
 * @swagger
 * /admin/clients/{clientId}/stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get client statistics
 *     description: Get usage statistics for specific client
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: clientId
 *         in: path
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: string
 *           example: "client_1672531200000"
 *     responses:
 *       200:
 *         description: Client statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Client statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientId:
 *                       type: string
 *                       example: "client_1672531200000"
 *                     name:
 *                       type: string
 *                       example: "PT. Streaming Indonesia"
 *                     totalRequests:
 *                       type: integer
 *                       example: 15420
 *                     lastUsed:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-03-05T06:15:30.000Z"
 *                     rateLimit:
 *                       type: integer
 *                       example: 1000
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-12-31T00:00:00.000Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-03-05T06:15:30.000Z"
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
router.get('/clients/:clientId/stats', getClientStats);

export default router;
