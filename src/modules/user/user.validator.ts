import { param } from "express-validator";

export const getUserValidator = [
  param("id").isMongoId().withMessage("Invalid user ID"),
];
