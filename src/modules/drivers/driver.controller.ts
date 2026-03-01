import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { DriverService } from "./driver.service";
import { DriverProfileModel } from "./driver.model";
import { ApiResponse } from "@/utils/api-response.util";
import { AppError } from "@/utils/app-error.util";

export class DriverController {
  private driverService: DriverService;

  constructor() {
    this.driverService = new DriverService();
  }

  getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const profile = await DriverProfileModel.findOne({ user: userReq.user.id })
        .populate("assignedRoutes", "name originStop destinationStop reliabilityScore")
        .populate("user", "name email reputationScore")
        .lean();

      if (!profile) throw new AppError("Driver profile not found. Ensure you have a DRIVER role.", 404);
      ApiResponse.success(res, "Driver profile fetched", profile);
    } catch (error) {
      next(error);
    }
  };

  getFamiliarityScores = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const scores = await this.driverService.fetchDriverFamiliarityData(userReq.user.id);
      ApiResponse.success(res, "Familiarity scores fetched", scores);
    } catch (error) {
      next(error);
    }
  };

  incrementFamiliarity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const { routeId } = req.body;
      const profile = await this.driverService.incrementFamiliarityPoint(userReq.user.id, routeId);
      ApiResponse.success(res, "Familiarity score updated", profile);
    } catch (error) {
      next(error);
    }
  };

  getAssignedRoutes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const profile = await DriverProfileModel.findOne({ user: userReq.user.id })
        .populate({
          path: "assignedRoutes",
          populate: [
            { path: "originStop", select: "name areaName location" },
            { path: "destinationStop", select: "name areaName location" },
          ],
        })
        .lean();

      if (!profile) throw new AppError("Driver profile not found", 404);
      ApiResponse.success(res, "Assigned routes fetched", profile.assignedRoutes);
    } catch (error) {
      next(error);
    }
  };

  // Admin: create a driver profile for a user
  createDriverProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, assignedRoutes } = req.body;
      const existing = await DriverProfileModel.findOne({ user: userId });
      if (existing) throw new AppError("Driver profile already exists for this user", 400);

      const profile = await DriverProfileModel.create({
        user: userId,
        assignedRoutes: assignedRoutes ?? [],
        familiarityScores: [],
        totalTrips: 0,
      });
      ApiResponse.success(res, "Driver profile created", profile, 201);
    } catch (error) {
      next(error);
    }
  };

  // Admin: assign a route to a driver
  assignRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { routeId } = req.body;
      const profile = await DriverProfileModel.findOne({ user: req.params.userId });
      if (!profile) throw new AppError("Driver profile not found", 404);

      if (!profile.assignedRoutes.map((r: mongoose.Types.ObjectId) => r.toString()).includes(routeId)) {
        profile.assignedRoutes.push(routeId as any);
        await profile.save();
      }
      ApiResponse.success(res, "Route assigned to driver", profile);
    } catch (error) {
      next(error);
    }
  };
}
