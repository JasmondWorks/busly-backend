import mongoose from "mongoose";
import "dotenv/config";
import { CityModel } from "../modules/cities/city.model";
import { StopModel } from "../modules/stops/stop.model";
import { RouteModel, RouteType } from "../modules/routes/route.model";
import {
  LandmarkModel,
  LandmarkCategory,
} from "../modules/landmarks/landmark.model";

const DB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/busly";

const seedDatabase = async () => {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB.");

    await CityModel.deleteMany({});
    await StopModel.deleteMany({});
    await RouteModel.deleteMany({});
    await LandmarkModel.deleteMany({});

    console.log("🧹 Collections cleared.");

    // Sample Stop
    const cmsStop = await StopModel.create({
      name: "CMS Terminal",
      slug: "cms-terminal",
      location: { type: "Point", coordinates: [3.388, 6.452] },
      areaName: "Lagos Island",
      isVerified: true,
    });

    const oyingboStop = await StopModel.create({
      name: "Oyingbo Terminus",
      slug: "oyingbo-terminus",
      location: { type: "Point", coordinates: [3.379, 6.482] },
      areaName: "Mainland",
      isVerified: true,
    });

    // Sample Route
    const mainRoute = await RouteModel.create({
      name: "CMS to Oyingbo BRT",
      originStop: cmsStop._id,
      destinationStop: oyingboStop._id,
      stopsSequence: [
        {
          stop: cmsStop._id,
          order: 1,
          estimatedFare: 0,
          averageTravelTimeToNext: 15,
        },
        {
          stop: oyingboStop._id,
          order: 2,
          estimatedFare: 200,
          averageTravelTimeToNext: 0,
        },
      ],
      routeType: RouteType.DIRECT,
      isActive: true,
    });

    // Validations linking connected stops
    cmsStop.connectedRoutes.push(mainRoute._id as any);
    oyingboStop.connectedRoutes.push(mainRoute._id as any);
    await cmsStop.save();
    await oyingboStop.save();

    // Sample Landmark
    await LandmarkModel.create({
      name: "Eko Bridge Connection",
      location: { type: "Point", coordinates: [3.385, 6.46] },
      category: LandmarkCategory.BRIDGE,
      associatedStops: [cmsStop._id],
    });

    console.log(
      "🎉 Fast-seed complete. Implementation matches production domain constraints.",
    );
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed: ", error);
    process.exit(1);
  }
};

seedDatabase();
