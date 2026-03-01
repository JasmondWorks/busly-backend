import express from "express";
import { AuthController } from "@/modules/auth/auth.controller";
import { validateRequest } from "@/middlewares/validate-request.middleware";
import {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
} from "@/modules/auth/auth.validator";

const router = express.Router();
const authController = new AuthController();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post(
  "/register",
  registerValidator,
  validateRequest,
  authController.register,
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", loginValidator, validateRequest, authController.login);

/**
 * @swagger
 * /auth/verify-email:
 *  post:
 *    summary: Verify a user's email using OTP
 *    tags: [Auth]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required: [userId, otp]
 *            properties:
 *              userId: { type: string }
 *              otp: { type: string }
 *    responses:
 *      200: { description: Email verified successfully }
 */
router.post(
  "/verify-email",
  verifyEmailValidator,
  validateRequest,
  authController.verifyEmail,
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *    summary: Resets JWT Token parsing from silent secure cookie
 *    tags: [Auth]
 *    responses:
 *      200: { description: Refreshed token payload }
 */
router.post("/refresh-token", authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *    summary: Logout and clear cookies
 *    tags: [Auth]
 *    responses:
 *      200: { description: Cleared refresh cookie payload }
 */
router.post("/logout", authController.logout);

export default router;
