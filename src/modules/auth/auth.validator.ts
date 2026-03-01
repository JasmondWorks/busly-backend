import { body } from "express-validator";
import { userRoles } from "@/modules/user/user.entity";

export const registerValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role").optional().isIn(userRoles).withMessage("Invalid user role"),
];

export const loginValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const verifyEmailValidator = [
  body("userId").notEmpty().withMessage("UserId is required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("Valid 6 digit OTP is required"),
];
