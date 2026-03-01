import { NextFunction, Request, Response } from "express";
import { LandmarkService } from "./landmark.service";

export class LandmarkController {
  private landmarkService: LandmarkService;

  constructor() {
    this.landmarkService = new LandmarkService();
  }

  public async getAllLandmarks(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const cityId = req.query.cityId as string;
      const landmarks = await this.landmarkService.getAllLandmarks(cityId);
      res.status(200).json({ status: "success", data: landmarks });
    } catch (error) {
      next(error);
    }
  }

  public async getLandmarkById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const landmark = await this.landmarkService.getLandmarkById(
        (req.params.id as string),
      );
      res.status(200).json({ status: "success", data: landmark });
    } catch (error) {
      next(error);
    }
  }

  public async getNearbyLandmarks(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const lng = parseFloat(req.query.lng as string);
      const lat = parseFloat(req.query.lat as string);
      const radius = parseFloat(req.query.radius as string) || 200;

      if (isNaN(lng) || isNaN(lat)) {
        res
          .status(400)
          .json({ status: "fail", message: "Invalid coordinates provided" });
        return;
      }

      const landmarks = await this.landmarkService.getNearbyLandmarks(
        lng,
        lat,
        radius,
      );
      res.status(200).json({ status: "success", data: landmarks });
    } catch (error) {
      next(error);
    }
  }

  public async createLandmark(req: Request, res: Response, next: NextFunction) {
    try {
      const landmark = await this.landmarkService.createLandmark(req.body);
      res.status(201).json({ status: "success", data: landmark });
    } catch (error) {
      next(error);
    }
  }

  public async updateLandmark(req: Request, res: Response, next: NextFunction) {
    try {
      const landmark = await this.landmarkService.updateLandmark(
        (req.params.id as string),
        req.body,
      );
      res.status(200).json({ status: "success", data: landmark });
    } catch (error) {
      next(error);
    }
  }

  public async deleteLandmark(req: Request, res: Response, next: NextFunction) {
    try {
      await this.landmarkService.deleteLandmark((req.params.id as string));
      res.status(204).json({ status: "success", data: null });
    } catch (error) {
      next(error);
    }
  }
}
