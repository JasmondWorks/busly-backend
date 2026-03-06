import { Router } from "express";
import { SpeedController } from "./speed.controller";
import { protect, restrictTo } from "../../middlewares/auth.middleware";
import { UserRole } from "../user/user.entity";
import { body } from "express-validator";
import { validateRequest } from "../../middlewares/validate-request.middleware";

const router = Router();
const controller = new SpeedController();

router.use(protect);

const logSpeedValidator = [
  body("speed").isNumeric().withMessage("speed must be a number"),
  body("location.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("location.coordinates must be [lng, lat]"),
];

// Driver endpoints
router.post(
  "/",
  restrictTo(UserRole.DRIVER),
  logSpeedValidator,
  validateRequest,
  controller.logSpeed,
);
router.get("/me", restrictTo(UserRole.DRIVER), controller.getMySpeedLogs);
router.get("/me/summary", restrictTo(UserRole.DRIVER), controller.getSpeedSummary);

// Admin endpoint
router.get("/:driverId", restrictTo(UserRole.ADMIN), controller.getDriverSpeedLogs);

export default router;
