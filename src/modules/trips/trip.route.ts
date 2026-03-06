import { Router } from "express";
import { TripController } from "./trip.controller";
import { protect } from "../../middlewares/auth.middleware";
import { body } from "express-validator";
import { validateRequest } from "../../middlewares/validate-request.middleware";

const router = Router();
const controller = new TripController();

const startTripValidator = [
  body("selectedRouteId").notEmpty().withMessage("selectedRouteId is required"),
  body("originStopId").notEmpty().withMessage("originStopId is required"),
  body("destinationStopId").notEmpty().withMessage("destinationStopId is required"),
];

const progressValidator = [
  body("currentStopId").notEmpty().withMessage("currentStopId is required"),
];

const switchValidator = [
  body("newRouteId").notEmpty().withMessage("newRouteId is required"),
  body("switchStopId").notEmpty().withMessage("switchStopId is required"),
];

// All trip routes require authentication
router.use(protect);

router.get("/", controller.getMyTrips);
router.get("/active", controller.getActiveTrip);
router.get("/:id", controller.getTripById);
router.post("/", startTripValidator, validateRequest, controller.startTrip);
router.patch("/:id/progress", progressValidator, validateRequest, controller.updateProgress);
router.patch("/:id/switch-route", switchValidator, validateRequest, controller.switchRoute);
router.patch("/:id/cancel", controller.cancelTrip);

export default router;
