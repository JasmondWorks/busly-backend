import { MongooseRepository } from "../../utils/crud.util";
import { LandmarkModel, ILandmark } from "./landmark.model";
import { AppError } from "../../utils/app-error.util";
import { CreateLandmarkDto, UpdateLandmarkDto } from "./landmark.dto";

export class LandmarkService {
  private repo: MongooseRepository<ILandmark>;

  constructor() {
    this.repo = new MongooseRepository(LandmarkModel);
  }

  async getAllLandmarks(cityId?: string) {
    const filter = cityId ? { cityId } : {};
    return await this.repo.findAll(filter);
  }

  async getLandmarkById(id: string) {
    const landmark = await this.repo.findById(id);
    if (!landmark) throw new AppError("Landmark not found", 404);
    return landmark;
  }

  async createLandmark(data: CreateLandmarkDto) {
    return await this.repo.create(data as unknown as Partial<ILandmark>);
  }

  async updateLandmark(id: string, data: UpdateLandmarkDto) {
    const landmark = await this.repo.findById(id);
    if (!landmark) throw new AppError("Landmark not found", 404);

    return await this.repo.update(id, data);
  }

  async deleteLandmark(id: string) {
    const landmark = await this.repo.findById(id);
    if (!landmark) throw new AppError("Landmark not found", 404);

    return await this.repo.delete(id);
  }

  async getNearbyLandmarks(
    lng: number,
    lat: number,
    maxDistance: number = 200,
  ) {
    // Geospatial query using MongoDB $near
    return LandmarkModel.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: maxDistance, // Distance in meters
        },
      },
    }).exec();
  }
}
