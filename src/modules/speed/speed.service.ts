import { MongooseRepository } from "../../utils/crud.util";
import { SpeedLogModel, ISpeedLog } from "./speed.model";

export class SpeedService {
  private repo: MongooseRepository<ISpeedLog>;

  constructor() {
    this.repo = new MongooseRepository(SpeedLogModel);
  }

  async logSpeedEvent(driverId: string, speedData: Partial<ISpeedLog>) {
    const isOverLimit = speedData.speedLimit
      ? speedData.speed! > speedData.speedLimit
      : false;

    return await this.repo.create({
      ...speedData,
      driver: driverId as any,
      isOverLimit: isOverLimit,
      recordedAt: new Date(),
    });
  }

  async getDriverSpeedLogs(driverId: string, limit: number = 50) {
    return await SpeedLogModel.find({ driver: driverId })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();
  }
}
