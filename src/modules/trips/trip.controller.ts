import { Request, Response, NextFunction } from "express";
import { TripService } from "./trip.service";
import { TripModel, TripStatus } from "./trip.model";
import { ApiResponse } from "@/utils/api-response.util";
import { AppError } from "@/utils/app-error.util";

export class TripController {
  private tripService: TripService;

  constructor() {
    this.tripService = new TripService();
  }

  startTrip = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const { selectedRouteId, originStopId, destinationStopId } = req.body;
      const trip = await this.tripService.startTrip(
        userReq.user.id,
        selectedRouteId,
        originStopId,
        destinationStopId,
      );
      ApiResponse.success(res, "Trip started", trip, 201);
    } catch (error) {
      next(error);
    }
  };

  updateProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentStopId = req.body.currentStopId as string;
      const trip = await this.tripService.updateTripProgress(req.params.id as string, currentStopId);
      ApiResponse.success(res, "Trip progress updated", trip);
    } catch (error) {
      next(error);
    }
  };

  switchRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newRouteId = req.body.newRouteId as string;
      const switchStopId = req.body.switchStopId as string;
      const trip = await this.tripService.switchRouteMidTrip(req.params.id as string, newRouteId, switchStopId);
      ApiResponse.success(res, "Route switched successfully", trip);
    } catch (error) {
      next(error);
    }
  };

  cancelTrip = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trip = await TripModel.findById(req.params.id);
      if (!trip) throw new AppError("Trip not found", 404);

      const userReq = req as any;
      if (trip.user.toString() !== userReq.user.id) {
        throw new AppError("You can only cancel your own trips", 403);
      }

      trip.status = TripStatus.CANCELLED;
      trip.endedAt = new Date();
      await trip.save();
      ApiResponse.success(res, "Trip cancelled", trip);
    } catch (error) {
      next(error);
    }
  };

  getMyTrips = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const { status } = req.query;
      const filter: Record<string, any> = { user: userReq.user.id };
      if (status) filter.status = status;

      const trips = await TripModel.find(filter)
        .populate("selectedRoute", "name")
        .populate("originStop", "name areaName")
        .populate("destinationStop", "name areaName")
        .populate("currentStop", "name areaName")
        .sort({ startedAt: -1 })
        .limit(20)
        .lean();

      ApiResponse.success(res, "Your trips", trips);
    } catch (error) {
      next(error);
    }
  };

  getTripById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trip = await TripModel.findById(req.params.id)
        .populate("selectedRoute", "name stopsSequence")
        .populate("originStop", "name areaName location")
        .populate("destinationStop", "name areaName location")
        .populate("currentStop", "name areaName location")
        .populate("completedStops", "name areaName")
        .lean();

      if (!trip) throw new AppError("Trip not found", 404);
      ApiResponse.success(res, "Trip details", trip);
    } catch (error) {
      next(error);
    }
  };

  getActiveTrip = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const trip = await TripModel.findOne({ user: userReq.user.id, status: TripStatus.ACTIVE })
        .populate("selectedRoute", "name stopsSequence")
        .populate("originStop", "name areaName location")
        .populate("destinationStop", "name areaName location")
        .populate("currentStop", "name areaName location")
        .lean();

      ApiResponse.success(res, trip ? "Active trip found" : "No active trip", trip);
    } catch (error) {
      next(error);
    }
  };
}
