import { MongooseRepository } from "../../utils/crud.util";
import { StopModel, IStop } from "./stop.model";
import { AppError } from "../../utils/app-error.util";

export class StopService {
  private repo: MongooseRepository<IStop>;

  constructor() {
    this.repo = new MongooseRepository(StopModel);
  }

  // Find nearest stops (geo query) with proper $geoNear aggregation
  async findNearestStops(
    lng: number,
    lat: number,
    maxDistance: number = 2000,
    limit: number = 10,
  ) {
    if (!lng || !lat)
      throw new AppError("Longitude and Latitude are required", 400);

    const stops = await StopModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "dist.calculated",
          maxDistance: maxDistance,
          spherical: true,
        },
      },
      { $limit: limit },
    ]);

    return stops;
  }

  async createStop(data: Partial<IStop>) {
    // Prevent duplicate stops (same name + near coordinates) - simple check
    const existingNamed = await StopModel.findOne({ name: data.name });
    if (existingNamed) {
      // If name exists, check if it's within 100 meters
      if (data.location?.coordinates) {
        const veryClose = await this.findNearestStops(
          data.location.coordinates[0],
          data.location.coordinates[1],
          100,
          1,
        );
        if (veryClose.length > 0 && veryClose[0].name === data.name) {
          throw new AppError(
            "A stop with this name already exists in this precise location",
            400,
          );
        }
      }
    }
    return await this.repo.create(data);
  }

  async getStopById(id: string) {
    const stop = await this.repo.findById(id);
    if (!stop) throw new AppError("Stop not found", 404);
    return stop;
  }

  async getAllStops(limit = 100, area?: string) {
    const filter: Record<string, any> = {};
    if (area) filter.areaName = { $regex: area, $options: "i" };
    return await StopModel.find(filter)
      .sort({ "metadata.popularityScore": -1 })
      .limit(limit)
      .lean();
  }

  async searchStops(query: string) {
    return await StopModel.find({ $text: { $search: query } }).limit(20);
  }
}
