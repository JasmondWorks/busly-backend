import { body } from "express-validator";
import { RouteMode, RouteDirection } from "./route.entity";

// --- Route Validators ---
export const createRouteValidator = [
  body("cityId").notEmpty().isMongoId().withMessage("Valid cityId is required"),
  body("name").notEmpty().withMessage("Route name is required"),
  body("mode")
    .notEmpty()
    .isIn(Object.values(RouteMode))
    .withMessage("Valid route mode is required"),
  body("provider").optional().isString(),
  body("confidenceScore").optional().isNumeric().isInt({ min: 0, max: 100 }),
];

export const updateRouteValidator = [
  body("name").optional().notEmpty().withMessage("Route name cannot be empty"),
  body("mode").optional().isIn(Object.values(RouteMode)),
  body("provider").optional().isString(),
  body("confidenceScore").optional().isNumeric().isInt({ min: 0, max: 100 }),
];

// --- Variant Validators ---
export const createRouteVariantValidator = [
  body("direction")
    .notEmpty()
    .isIn(Object.values(RouteDirection))
    .withMessage("Valid direction is required"),
  body("polyline.type")
    .equals("LineString")
    .withMessage("Polyline type must be 'LineString'"),
  body("polyline.coordinates")
    .isArray({ min: 2 })
    .withMessage("Polyline coordinates must be an array of points"),
];

export const updateRouteVariantValidator = [
  body("direction").optional().isIn(Object.values(RouteDirection)),
  body("polyline").optional().isObject(),
  body("polyline.type").optional().equals("LineString"),
  body("polyline.coordinates").optional().isArray({ min: 2 }),
];

// --- Sequence Validators ---
export const createRouteSequenceValidator = [
  body("stopId").notEmpty().isMongoId().withMessage("Valid stopId is required"),
  body("sequenceOrder")
    .notEmpty()
    .isInt({ min: 0 })
    .withMessage("Valid sequenceOrder is required"),
  body("distanceFromPrev").optional().isNumeric(),
  body("typicalTimeFromPrev").optional().isNumeric(),
];

export const updateRouteSequenceValidator = [
  body("stopId").optional().isMongoId(),
  body("sequenceOrder").optional().isInt({ min: 0 }),
  body("distanceFromPrev").optional().isNumeric(),
  body("typicalTimeFromPrev").optional().isNumeric(),
];
