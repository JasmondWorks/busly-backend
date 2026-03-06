import { MongooseRepository } from "../../utils/crud.util";
import { RouteModel, IRoute } from "./route.model";
import { AppError } from "../../utils/app-error.util";
import mongoose from "mongoose";

export class RouteService {
  private repo: MongooseRepository<IRoute>;

  constructor() {
    this.repo = new MongooseRepository(RouteModel);
  }

  // Search routes by origin/destination logic
  async searchRoutesByOriginDestination(
    originStopId: string,
    destStopId: string,
  ) {
    // Route search must match: origin in sequence, destination later in sequence
    const routes = await RouteModel.find({
      "stopsSequence.stop": { $all: [originStopId, destStopId] },
    }).lean();

    // Strict validation: origin must logically precede destination mathematically
    const ObjectStopsAny = routes.filter((route) => {
      const originIndex = route.stopsSequence.findIndex(
        (seqItem: any) => seqItem.stop.toString() === originStopId.toString(),
      );
      const destIndex = route.stopsSequence.findIndex(
        (seqItem: any) => seqItem.stop.toString() === destStopId.toString(),
      );
      return originIndex !== -1 && destIndex !== -1 && originIndex < destIndex;
    });

    return ObjectStopsAny;
  }

  async getAllRoutes(limit = 50) {
    return await RouteModel.find({ isActive: true })
      .populate("originStop", "name areaName")
      .populate("destinationStop", "name areaName")
      .sort({ reliabilityScore: -1 })
      .limit(limit)
      .lean();
  }

  async getRouteById(id: string) {
    const route = await RouteModel.findById(id)
      .populate("originStop", "name areaName location")
      .populate("destinationStop", "name areaName location")
      .populate("stopsSequence.stop", "name areaName location")
      .lean();
    if (!route) throw new AppError("Route not found", 404);
    return route;
  }

  async createRoute(data: any) {
    // Prevent circular route sequences
    const stopIds = data.stopsSequence.map((s: any) => s.stop.toString());
    const uniqueStops = new Set(stopIds);

    if (uniqueStops.size !== stopIds.length) {
      throw new AppError(
        "Circular route sequence detected. A route cannot pass through the exact same stop twice.",
        400,
      );
    }

    // Prevent invalid stop order logic mappings
    const isSorted = data.stopsSequence.every(
      (val: any, i: number, arr: any[]) => !i || val.order >= arr[i - 1].order,
    );
    if (!isSorted) {
      throw new AppError(
        "Route stops sequence must sequentially process increasing order values",
        400,
      );
    }

    return await this.repo.create(data);
  }

  async getAlternateRoutesFromStop(
    currentStopId: string,
    currentRouteId: string,
  ) {
    // Alternate routes must share current stop but differ in downstream path.
    // Fetch all routes that contain this stop
    const alternates = await RouteModel.find({
      _id: { $ne: currentRouteId },
      "stopsSequence.stop": currentStopId,
      isActive: true,
    })
      .limit(10)
      .lean();

    return alternates;
  }
}
