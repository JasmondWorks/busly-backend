import { body } from "express-validator";

export const createTransferValidator = [
  body("fromStopId")
    .notEmpty()
    .isMongoId()
    .withMessage("Valid fromStopId is required"),
  body("toStopId")
    .notEmpty()
    .isMongoId()
    .withMessage("Valid toStopId is required"),
  body("walkingDistance")
    .notEmpty()
    .isNumeric()
    .withMessage("Walking distance is required"),
  body("walkingTime")
    .notEmpty()
    .isNumeric()
    .withMessage("Walking time is required"),
  body("isSafe").optional().isBoolean(),
];

export const updateTransferValidator = [
  body("fromStopId").optional().isMongoId(),
  body("toStopId").optional().isMongoId(),
  body("walkingDistance").optional().isNumeric(),
  body("walkingTime").optional().isNumeric(),
  body("isSafe").optional().isBoolean(),
];
