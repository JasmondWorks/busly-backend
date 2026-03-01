import { body, query } from "express-validator";

export const createStopValidator = [
  body("cityId").notEmpty().isMongoId().withMessage("Valid cityId is required"),
  body("name").notEmpty().withMessage("Stop name is required"),
  body("location.type")
    .equals("Point")
    .withMessage("Location type must be 'Point'"),
  body("location.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("Location must be [lng, lat] coordinates"),
  body("aliases")
    .optional()
    .isArray()
    .withMessage("Aliases must be an array of strings"),
  body("confidenceScore").optional().isNumeric().isInt({ min: 0, max: 100 }),
  body("isTerminal").optional().isBoolean(),
];

export const updateStopValidator = [
  body("name").optional().notEmpty().withMessage("Stop name cannot be empty"),
  body("location").optional().isObject(),
  body("location.type").optional().equals("Point"),
  body("location.coordinates").optional().isArray({ min: 2, max: 2 }),
  body("aliases").optional().isArray(),
  body("confidenceScore").optional().isNumeric().isInt({ min: 0, max: 100 }),
  body("isTerminal").optional().isBoolean(),
  body("popularity").optional().isNumeric(),
];

export const nearbyStopsValidator = [
  query("lng")
    .notEmpty()
    .isFloat()
    .withMessage("Longitude must be a valid float"),
  query("lat")
    .notEmpty()
    .isFloat()
    .withMessage("Latitude must be a valid float"),
  query("radius")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Radius must be a positive float"),
];
