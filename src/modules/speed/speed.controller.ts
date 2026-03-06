import { Request, Response, NextFunction } from "express";
import { SpeedService } from "./speed.service";
import { SpeedLogModel } from "./speed.model";
import { ApiResponse } from "../../utils/api-response.util";

export class SpeedController {
  private speedService: SpeedService;

  constructor() {
    this.speedService = new SpeedService();
  }

  logSpeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const { speed, speedLimit, location, route } = req.body;
      const log = await this.speedService.logSpeedEvent(userReq.user.id, {
        speed,
        speedLimit,
        location,
        route,
      });
      ApiResponse.success(res, "Speed event logged", log, 201);
    } catch (error) {
      next(error);
    }
  };

  getMySpeedLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await this.speedService.getDriverSpeedLogs(userReq.user.id, limit);
      ApiResponse.success(res, "Speed logs fetched", logs);
    } catch (error) {
      next(error);
    }
  };

  getSpeedSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const logs = await this.speedService.getDriverSpeedLogs(userReq.user.id, 500);
      const totalLogs = logs.length;
      const overLimitCount = logs.filter((l: any) => l.isOverLimit).length;
      const complianceRate = totalLogs > 0 ? ((totalLogs - overLimitCount) / totalLogs) * 100 : 100;
      const avgSpeed =
        totalLogs > 0 ? logs.reduce((s: number, l: any) => s + l.speed, 0) / totalLogs : 0;

      ApiResponse.success(res, "Speed summary", {
        totalLogs,
        overLimitCount,
        complianceRate: Math.round(complianceRate),
        averageSpeed: Math.round(avgSpeed),
      });
    } catch (error) {
      next(error);
    }
  };

  // Admin: get speed logs for any driver
  getDriverSpeedLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const driverId = req.params.driverId as string;
      const logs = await this.speedService.getDriverSpeedLogs(driverId, limit);
      ApiResponse.success(res, "Driver speed logs", logs);
    } catch (error) {
      next(error);
    }
  };
}
