import { Request, Response, NextFunction } from "express";
import { RouteService } from "./route.service";
import { ApiResponse } from "../../utils/api-response.util";

export class RouteController {
  private routeService: RouteService;

  constructor() {
    this.routeService = new RouteService();
  }

  getAllRoutes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const routes = await this.routeService.getAllRoutes(limit);
      ApiResponse.success(res, "Routes fetched", routes);
    } catch (error) {
      next(error);
    }
  };

  getRouteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const route = await this.routeService.getRouteById(req.params.id as string);
      ApiResponse.success(res, "Route fetched", route);
    } catch (error) {
      next(error);
    }
  };

  createRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const route = await this.routeService.createRoute(req.body);
      ApiResponse.success(res, "Route created successfully", route, 201);
    } catch (error) {
      next(error);
    }
  };

  searchRoutes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const originId = String(req.query.originId ?? "");
      const destId = String(req.query.destId ?? "");
      if (!originId || !destId) {
        throw new Error("Missing originId or destId query parameter");
      }
      const routes = await this.routeService.searchRoutesByOriginDestination(
        originId as string,
        destId as string,
      );
      ApiResponse.success(res, "Fetched routes successfully", routes);
    } catch (error) {
      next(error);
    }
  };

  getAlternateRoutes = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { stopId, routeId } = req.params;
      const routes = await this.routeService.getAlternateRoutesFromStop(
        stopId as string,
        routeId as string,
      );
      ApiResponse.success(res, "Fetched alternates successfully", routes);
    } catch (error) {
      next(error);
    }
  };
}
