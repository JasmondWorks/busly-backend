import express from "express";
import { RouteController } from "./route.controller";
import { protect, restrictTo } from "../../middlewares/auth.middleware";
import { UserRole } from "../user/user.entity";

const router = express.Router();
const controller = new RouteController();

router.get("/", controller.getAllRoutes);
router.get("/search", controller.searchRoutes);
router.get("/:id", controller.getRouteById);
router.get("/:routeId/stops/:stopId/alternates", controller.getAlternateRoutes);

router.post("/", protect, restrictTo(UserRole.ADMIN), controller.createRoute);

export default router;
