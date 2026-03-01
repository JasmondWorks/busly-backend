import { Router } from "express";
import { DriverController } from "./driver.controller";
import { protect, restrictTo } from "@/middlewares/auth.middleware";
import { UserRole } from "@/modules/user/user.entity";
import { body } from "express-validator";
import { validateRequest } from "@/middlewares/validate-request.middleware";

const router = Router();
const controller = new DriverController();

router.use(protect);

// Driver-accessible endpoints
router.get("/me", restrictTo(UserRole.DRIVER), controller.getMyProfile);
router.get("/me/routes", restrictTo(UserRole.DRIVER), controller.getAssignedRoutes);
router.get("/me/familiarity", restrictTo(UserRole.DRIVER), controller.getFamiliarityScores);
router.post(
  "/me/familiarity",
  restrictTo(UserRole.DRIVER),
  [body("routeId").notEmpty().withMessage("routeId is required")],
  validateRequest,
  controller.incrementFamiliarity,
);

// Admin-only endpoints
router.post(
  "/",
  restrictTo(UserRole.ADMIN),
  [body("userId").notEmpty().withMessage("userId is required")],
  validateRequest,
  controller.createDriverProfile,
);
router.post(
  "/:userId/assign-route",
  restrictTo(UserRole.ADMIN),
  [body("routeId").notEmpty().withMessage("routeId is required")],
  validateRequest,
  controller.assignRoute,
);

export default router;
