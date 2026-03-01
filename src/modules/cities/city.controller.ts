import { NextFunction, Request, Response } from "express";
import { CityService } from "./city.service";

export class CityController {
  private cityService: CityService;

  constructor() {
    this.cityService = new CityService();
  }

  public async getAllCities(req: Request, res: Response, next: NextFunction) {
    try {
      const cities = await this.cityService.getAllCities();
      res.status(200).json({ status: "success", data: cities });
    } catch (error) {
      next(error);
    }
  }

  public async getCityById(req: Request, res: Response, next: NextFunction) {
    try {
      const city = await this.cityService.getCityById((req.params.id as string));
      res.status(200).json({ status: "success", data: city });
    } catch (error) {
      next(error);
    }
  }

  public async createCity(req: Request, res: Response, next: NextFunction) {
    try {
      const city = await this.cityService.createCity(req.body);
      res.status(201).json({ status: "success", data: city });
    } catch (error) {
      next(error);
    }
  }

  public async updateCity(req: Request, res: Response, next: NextFunction) {
    try {
      const city = await this.cityService.updateCity((req.params.id as string), req.body);
      res.status(200).json({ status: "success", data: city });
    } catch (error) {
      next(error);
    }
  }

  public async deleteCity(req: Request, res: Response, next: NextFunction) {
    try {
      await this.cityService.deleteCity((req.params.id as string));
      res.status(204).json({ status: "success", data: null });
    } catch (error) {
      next(error);
    }
  }
}
