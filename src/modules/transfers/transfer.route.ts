import { Router } from "express";
import { TransferController } from "./transfer.controller";
import { protect, restrictTo } from "@/middlewares/auth.middleware";
import { UserRole } from "@/modules/user/user.entity";
import {
  createTransferValidator,
  updateTransferValidator,
} from "./transfer.validator";
import { validateRequest } from "@/middlewares/validate-request.middleware";

const controller = new TransferController();
const router = Router();

// Public routes
router.get("/", controller.getAllTransfers.bind(controller));
router.get(
  "/stop/:fromStopId",
  controller.getTransfersFromStop.bind(controller),
);
router.get("/:id", controller.getTransferById.bind(controller));

// Protected routes (Admin level)
router.use(protect);

router.post(
  "/",
  restrictTo(UserRole.ADMIN, UserRole.ADMIN),
  createTransferValidator,
  validateRequest,
  controller.createTransfer.bind(controller),
);

router.put(
  "/:id",
  restrictTo(UserRole.ADMIN, UserRole.ADMIN),
  updateTransferValidator,
  validateRequest,
  controller.updateTransfer.bind(controller),
);

router.delete(
  "/:id",
  restrictTo(UserRole.ADMIN),
  controller.deleteTransfer.bind(controller),
);

export default router;
