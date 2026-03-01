import { Router } from "express";
import { CityController } from "./city.controller";
import { protect, restrictTo } from "@/middlewares/auth.middleware";
import { UserRole } from "@/modules/user/user.entity";
import { createCityValidator, updateCityValidator } from "./city.validator";
import { validateRequest } from "@/middlewares/validate-request.middleware";

const controller = new CityController();
const router = Router();

// Public routes
router.get("/", controller.getAllCities.bind(controller));
router.get("/:id", controller.getCityById.bind(controller));

// Protected routes (Admin level)
router.use(protect);

router.post(
  "/",
  restrictTo(UserRole.ADMIN, UserRole.ADMIN),
  createCityValidator,
  validateRequest,
  controller.createCity.bind(controller),
);

router.put(
  "/:id",
  restrictTo(UserRole.ADMIN, UserRole.ADMIN),
  updateCityValidator,
  validateRequest,
  controller.updateCity.bind(controller),
);

router.delete(
  "/:id",
  restrictTo(UserRole.ADMIN),
  controller.deleteCity.bind(controller),
);

export default router;
