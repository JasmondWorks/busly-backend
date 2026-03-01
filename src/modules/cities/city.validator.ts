import { body } from "express-validator";

export const createCityValidator = [
  body("name").notEmpty().withMessage("City name is required"),
  body("country").notEmpty().withMessage("Country name is required"),
  body("active").optional().isBoolean().withMessage("Active must be a boolean"),
  body("boundary")
    .optional()
    .isObject()
    .withMessage("Boundary must be a valid GeoJSON object"),
];

export const updateCityValidator = [
  body("name").optional().notEmpty().withMessage("Name cannot be empty"),
  body("country").optional().notEmpty().withMessage("Country cannot be empty"),
  body("active").optional().isBoolean().withMessage("Active must be a boolean"),
  body("boundary")
    .optional()
    .isObject()
    .withMessage("Boundary must be a valid GeoJSON object"),
];
