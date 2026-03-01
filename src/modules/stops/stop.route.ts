import express from "express";
import { StopController } from "./stop.controller";
import { protect, restrictTo } from "@/middlewares/auth.middleware";
import { UserRole } from "@/modules/user/user.entity";

const router = express.Router();
const controller = new StopController();

router.get("/", controller.getAllStops);
router.get("/nearby", controller.findNearestStops);
router.get("/search", controller.searchStopsByName);
router.get("/:id", controller.getStopById);

router.post("/", protect, restrictTo(UserRole.ADMIN), controller.createStop);

export default router;
