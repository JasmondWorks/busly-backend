import { body } from "express-validator";
import { ContributionType, ContributionStatus } from "./contribution.entity";

export const createContributionValidator = [
  body("type")
    .notEmpty()
    .isIn(Object.values(ContributionType))
    .withMessage("Valid contribution type is required"),
  body("description").optional().isString(),
  body("geoData").isObject().withMessage("GeoData object is required"),
  body("geoData.type")
    .isIn(["Point", "LineString"])
    .withMessage("GeoData type must be Point or LineString"),
  body("geoData.coordinates")
    .notEmpty()
    .withMessage("Coordinates are required"),
];

export const updateContributionStatusValidator = [
  body("status")
    .notEmpty()
    .isIn(Object.values(ContributionStatus))
    .withMessage("Valid status is required"),
];
