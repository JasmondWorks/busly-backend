import express from "express";
import { ContributionController } from "./contribution.controller";
import { protect, restrictTo } from "@/middlewares/auth.middleware";
import { UserRole } from "@/modules/user/user.entity";

const router = express.Router();
const controller = new ContributionController();

// Public: list all contributions (for community validation screen)
router.get("/", protect, controller.getContributions);
router.get("/mine", protect, controller.getMyContributions);
router.get("/:id", protect, controller.getContributionById);

// Any authenticated user can submit a contribution
router.post("/", protect, controller.createContribution);

// Any verified user can vote
router.post("/:id/vote", protect, controller.voteOnContribution);

// Only admins can approve/reject
router.put("/:id/evaluate", protect, restrictTo(UserRole.ADMIN), controller.approveOrReject);

export default router;
