import { MongooseRepository } from "@/utils/crud.util";
import { DriverProfileModel, IDriverProfile } from "./driver.model";
import { AppError } from "@/utils/app-error.util";

export class DriverService {
  private repo: MongooseRepository<IDriverProfile>;

  constructor() {
    this.repo = new MongooseRepository(DriverProfileModel);
  }

  async fetchDriverFamiliarityData(userId: string) {
    const profile = await DriverProfileModel.findOne({ user: userId })
      .populate("assignedRoutes")
      .lean();

    if (!profile)
      throw new AppError(
        "Driver profile not securely initialized for this user",
        404,
      );

    return profile.familiarityScores.sort(
      (a: any, b: any) => b.score - a.score,
    ); // Highest scoring familiarity first
  }

  async incrementFamiliarityPoint(userId: string, activeRouteId: string) {
    const profile = await DriverProfileModel.findOne({ user: userId });
    if (!profile) return;

    const familiarityIndex = profile.familiarityScores.findIndex(
      (f: any) => f.route.toString() === activeRouteId,
    );
    if (familiarityIndex !== -1) {
      profile.familiarityScores[familiarityIndex].score += 1;
    } else {
      profile.familiarityScores.push({ route: activeRouteId as any, score: 1 });
    }

    profile.totalTrips += 1;

    await profile.save();
    return profile;
  }
}
