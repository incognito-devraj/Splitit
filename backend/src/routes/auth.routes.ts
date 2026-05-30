import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { googleLoginSchema, refreshSchema, logoutSchema } from '../validators/auth.validator';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login with Google ID token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful — returns user, accessToken, refreshToken
 */
router.post('/google', authLimiter, validate(googleLoginSchema), ctrl.googleLogin);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token and get new access token
 *     tags: [Auth]
 *     security: []
 */
router.post('/refresh', authLimiter, validate(refreshSchema), ctrl.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout — revoke refresh token
 *     tags: [Auth]
 */
router.post('/logout', authenticate, validate(logoutSchema), ctrl.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 */
router.get('/me', authenticate, ctrl.getMe);

export default router;
