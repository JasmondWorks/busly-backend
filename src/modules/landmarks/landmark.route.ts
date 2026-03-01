import { Router } from "express";
import { LandmarkController } from "./landmark.controller";
import { protect, restrictTo } from "@/middlewares/auth.middleware";
import { UserRole } from "@/modules/user/user.entity";
import {
  createLandmarkValidator,
  updateLandmarkValidator,
  nearbyLandmarksValidator,
} from "./landmark.validator";
import { validateRequest } from "@/middlewares/validate-request.middleware";

const controller = new LandmarkController();
const router = Router();

// Public routes
router.get("/", controller.getAllLandmarks.bind(controller));
router.get(
  "/nearby",
  nearbyLandmarksValidator,
  validateRequest,
  controller.getNearbyLandmarks.bind(controller),
);
router.get("/:id", controller.getLandmarkById.bind(controller));

// Protected routes (Admin level)
router.use(protect);

router.post(
  "/",
  restrictTo(UserRole.ADMIN, UserRole.ADMIN),
  createLandmarkValidator,
  validateRequest,
  controller.createLandmark.bind(controller),
);

router.put(
  "/:id",
  restrictTo(UserRole.ADMIN, UserRole.ADMIN),
  updateLandmarkValidator,
  validateRequest,
  controller.updateLandmark.bind(controller),
);

router.delete(
  "/:id",
  restrictTo(UserRole.ADMIN),
  controller.deleteLandmark.bind(controller),
);

export default router;
