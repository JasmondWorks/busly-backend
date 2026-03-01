import { body, query } from "express-validator";
import { LandmarkType } from "./landmark.entity";

export const createLandmarkValidator = [
  body("cityId").notEmpty().isMongoId().withMessage("Valid cityId is required"),
  body("name").notEmpty().withMessage("Landmark name is required"),
  body("location.type")
    .equals("Point")
    .withMessage("Location type must be 'Point'"),
  body("location.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("Location must be [lng, lat] coordinates"),
  body("type")
    .optional()
    .isIn(Object.values(LandmarkType))
    .withMessage("Invalid landmark type"),
];

export const updateLandmarkValidator = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Landmark name cannot be empty"),
  body("location").optional().isObject(),
  body("location.type").optional().equals("Point"),
  body("location.coordinates").optional().isArray({ min: 2, max: 2 }),
  body("type").optional().isIn(Object.values(LandmarkType)),
];

export const nearbyLandmarksValidator = [
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
