import { NextFunction, Request, Response } from "express";
import { JourneyService } from "./journey.service";
import { ApiResponse } from "../../utils/api-response.util";

export class JourneyController {
  private journeyService: JourneyService;

  constructor() {
    this.journeyService = new JourneyService();
  }

  public searchJourney = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const originLat = parseFloat(req.query.originLat as string);
      const originLng = parseFloat(req.query.originLng as string);
      const destLat = parseFloat(req.query.destLat as string);
      const destLng = parseFloat(req.query.destLng as string);

      if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
        res.status(400).json({ status: "fail", message: "originLat, originLng, destLat, destLng must be valid numbers" });
        return;
      }

      const options = await this.journeyService.searchJourney(originLat, originLng, destLat, destLng);
      ApiResponse.success(res, "Journey options found", options);
    } catch (error) {
      next(error);
    }
  };

  public searchJourneyByStops = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { originStopId, destStopId } = req.query as { originStopId: string; destStopId: string };
      if (!originStopId || !destStopId) {
        res.status(400).json({ status: "fail", message: "originStopId and destStopId are required" });
        return;
      }

      const options = await this.journeyService.searchJourneyByStops(originStopId, destStopId);
      ApiResponse.success(res, "Journey options found", options);
    } catch (error) {
      next(error);
    }
  };

  public getAlternatesAtStop = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stopId, currentRouteId, destinationStopId } = req.query as {
        stopId: string;
        currentRouteId: string;
        destinationStopId: string;
      };

      if (!stopId || !currentRouteId) {
        res.status(400).json({ status: "fail", message: "stopId and currentRouteId are required" });
        return;
      }

      const alternates = await this.journeyService.getAlternatesAtStop(
        stopId,
        currentRouteId,
        destinationStopId ?? "",
      );
      ApiResponse.success(res, "Alternate routes at stop", alternates);
    } catch (error) {
      next(error);
    }
  };
}
