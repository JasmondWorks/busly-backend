import mongoose, { Schema, Document } from "mongoose";

export enum TripStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface ITrip extends Document {
  user: mongoose.Types.ObjectId;
  selectedRoute: mongoose.Types.ObjectId;
  originStop: mongoose.Types.ObjectId;
  destinationStop: mongoose.Types.ObjectId;
  currentStop?: mongoose.Types.ObjectId;
  completedStops: mongoose.Types.ObjectId[];
  status: TripStatus;
  deviationDetected: boolean;
  usedLearningMode: boolean;
  startedAt: Date;
  endedAt?: Date;
}

const TripSchema = new Schema<ITrip>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  selectedRoute: { type: Schema.Types.ObjectId, ref: "Route", required: true },
  originStop: { type: Schema.Types.ObjectId, ref: "Stop", required: true },
  destinationStop: { type: Schema.Types.ObjectId, ref: "Stop", required: true },
  currentStop: { type: Schema.Types.ObjectId, ref: "Stop" },
  completedStops: [{ type: Schema.Types.ObjectId, ref: "Stop" }],
  status: {
    type: String,
    enum: Object.values(TripStatus),
    default: TripStatus.ACTIVE,
    required: true,
  },
  deviationDetected: { type: Boolean, default: false },
  usedLearningMode: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
});

TripSchema.index({ user: 1 });
TripSchema.index({ status: 1 });

export const TripModel =
  mongoose.models.Trip || mongoose.model<ITrip>("Trip", TripSchema);
