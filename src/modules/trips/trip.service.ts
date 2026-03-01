import { MongooseRepository } from "@/utils/crud.util";
import { TripModel, ITrip, TripStatus } from "./trip.model";
import { AppError } from "@/utils/app-error.util";
import { RouteModel } from "../routes/route.model";

export class TripService {
  private repo: MongooseRepository<ITrip>;

  constructor() {
    this.repo = new MongooseRepository(TripModel);
  }

  async startTrip(
    userId: string,
    selectedRouteId: string,
    originStopId: string,
    destinationStopId: string,
  ) {
    const trip = await this.repo.create({
      user: userId as any,
      selectedRoute: selectedRouteId as any,
      originStop: originStopId as any,
      destinationStop: destinationStopId as any,
      currentStop: originStopId as any,
      status: TripStatus.ACTIVE,
      completedStops: [],
    });
    return trip;
  }

  async updateTripProgress(tripId: string, unverifiedCurrentStopId: string) {
    const trip = await this.repo.findById(tripId);
    if (!trip) throw new AppError("Trip not found", 404);
    if (trip.status !== TripStatus.ACTIVE)
      throw new AppError("Trip is not active", 400);

    // Trip updates must validate stop order
    const route = await RouteModel.findById(trip.selectedRoute);
    if (!route) throw new AppError("Active route geometry lost", 404);

    const oldStopIndex = route.stopsSequence.findIndex(
      (s: any) => s.stop.toString() === trip.currentStop?.toString(),
    );
    const newStopIndex = route.stopsSequence.findIndex(
      (s: any) => s.stop.toString() === unverifiedCurrentStopId,
    );

    if (newStopIndex === -1) {
      // Stop is completely unfamiliar to route path => Deviation Detected
      trip.deviationDetected = true;
    } else if (oldStopIndex > newStopIndex) {
      throw new AppError(
        "Invalid progress: Cannot logically move backward in route sequence",
        400,
      );
    }

    // Push into completed mapping properly
    if (trip.currentStop) trip.completedStops.push(trip.currentStop);

    trip.currentStop = unverifiedCurrentStopId as any;

    if (unverifiedCurrentStopId === trip.destinationStop.toString()) {
      trip.status = TripStatus.COMPLETED;
      trip.endedAt = new Date();
    }

    await trip.save();
    return trip;
  }

  async switchRouteMidTrip(
    tripId: string,
    newRouteId: string,
    switchStopId: string,
  ) {
    const trip = await this.repo.findById(tripId);
    if (!trip) throw new AppError("Trip not found", 404);

    if (switchStopId !== trip.currentStop?.toString()) {
      throw new AppError(
        "You can only switch paths from your current positional stop",
        400,
      );
    }

    trip.selectedRoute = newRouteId as any;
    trip.deviationDetected = false;

    await trip.save();
    return trip;
  }
}
