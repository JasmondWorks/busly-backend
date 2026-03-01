import express from "express";
import { UserController } from "@/modules/user/user.controller";
import { protect, restrictTo } from "@/middlewares/auth.middleware";
import { validateRequest } from "@/middlewares/validate-request.middleware";
import { getUserValidator } from "@/modules/user/user.validator";

const router = express.Router();
const userController = new UserController();

router.use(protect);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin/Super Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", restrictTo("SUPER_ADMIN", "ADMIN"), userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 */
router.get(
  "/:id",
  getUserValidator,
  validateRequest,
  userController.getUserById,
);

export default router;
