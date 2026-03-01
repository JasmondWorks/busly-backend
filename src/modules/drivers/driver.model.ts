import mongoose, { Schema, Document } from "mongoose";

export interface IFamiliarityScore {
  route: mongoose.Types.ObjectId;
  score: number;
}

export interface IDriverProfile extends Document {
  user: mongoose.Types.ObjectId;
  assignedRoutes: mongoose.Types.ObjectId[];
  familiarityScores: IFamiliarityScore[];
  totalTrips: number;
  createdAt: Date;
  updatedAt: Date;
}

const DriverProfileSchema = new Schema<IDriverProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    assignedRoutes: [{ type: Schema.Types.ObjectId, ref: "Route" }],
    familiarityScores: [
      {
        route: { type: Schema.Types.ObjectId, ref: "Route", required: true },
        score: { type: Number, required: true, default: 0 },
      },
    ],
    totalTrips: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const DriverProfileModel =
  mongoose.models.DriverProfile ||
  mongoose.model<IDriverProfile>("DriverProfile", DriverProfileSchema);
