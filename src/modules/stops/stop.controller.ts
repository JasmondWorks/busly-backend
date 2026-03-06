import { Request, Response, NextFunction } from "express";
import { StopService } from "./stop.service";
import { ApiResponse } from "../../utils/api-response.util";

export class StopController {
  private stopService: StopService;

  constructor() {
    this.stopService = new StopService();
  }

  getAllStops = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const area = req.query.area as string | undefined;
      const stops = await this.stopService.getAllStops(limit, area);
      ApiResponse.success(res, "Stops fetched", stops);
    } catch (error) {
      next(error);
    }
  };

  createStop = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stop = await this.stopService.createStop(req.body);
      ApiResponse.success(res, "Stop created successfully", stop, 201);
    } catch (error) {
      next(error);
    }
  };

  getStopById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stop = await this.stopService.getStopById(req.params.id as string);
      ApiResponse.success(res, "Stop fetched successfully", stop);
    } catch (error) {
      next(error);
    }
  };

  findNearestStops = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const lng = parseFloat(req.query.lng as string);
      const lat = parseFloat(req.query.lat as string);
      const dist = req.query.dist ? parseInt(req.query.dist as string) : 2000;

      const stops = await this.stopService.findNearestStops(lng, lat, dist);
      ApiResponse.success(res, "Fetched nearby stops successfully", stops);
    } catch (error) {
      next(error);
    }
  };

  searchStopsByName = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const query = req.query.q as string;
      const stops = await this.stopService.searchStops(query);
      ApiResponse.success(res, "Stop text search successful", stops);
    } catch (error) {
      next(error);
    }
  };
}
