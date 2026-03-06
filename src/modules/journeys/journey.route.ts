import { Router } from "express";
import { JourneyController } from "./journey.controller";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { query } from "express-validator";

const controller = new JourneyController();
const router = Router();

const coordValidator = [
  query("originLat").notEmpty().isFloat().withMessage("originLat must be a float"),
  query("originLng").notEmpty().isFloat().withMessage("originLng must be a float"),
  query("destLat").notEmpty().isFloat().withMessage("destLat must be a float"),
  query("destLng").notEmpty().isFloat().withMessage("destLng must be a float"),
];

const stopIdValidator = [
  query("originStopId").notEmpty().withMessage("originStopId is required"),
  query("destStopId").notEmpty().withMessage("destStopId is required"),
];

// Search by coordinates
router.get("/search", coordValidator, validateRequest, controller.searchJourney);

// Search by stop IDs (when user selects stops directly)
router.get("/search-by-stops", stopIdValidator, validateRequest, controller.searchJourneyByStops);

// Get alternate routes at a decision stop (core PRD feature)
router.get("/alternates", controller.getAlternatesAtStop);

export default router;
