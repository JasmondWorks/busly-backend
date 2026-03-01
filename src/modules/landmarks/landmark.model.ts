import mongoose, { Schema, Document } from "mongoose";

export enum LandmarkCategory {
  MARKET = "MARKET",
  BRIDGE = "BRIDGE",
  JUNCTION = "JUNCTION",
  SCHOOL = "SCHOOL",
  OTHER = "OTHER",
}

export interface ICue {
  text: string;
  directionHint?: string;
  createdBy?: mongoose.Types.ObjectId;
}

export interface ILandmark extends Document {
  name: string;
  location: {
    type: "Point";
    coordinates: number[];
  };
  category: LandmarkCategory;
  description?: string;
  associatedStops: mongoose.Types.ObjectId[];
  cues: ICue[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LandmarkSchema = new Schema<ILandmark>(
  {
    name: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point", required: true },
      coordinates: { type: [Number], required: true },
    },
    category: {
      type: String,
      enum: Object.values(LandmarkCategory),
      default: LandmarkCategory.OTHER,
      required: true,
    },
    description: { type: String },
    associatedStops: [{ type: Schema.Types.ObjectId, ref: "Stop" }],
    cues: [
      {
        text: { type: String, required: true },
        directionHint: { type: String },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

LandmarkSchema.index({ location: "2dsphere" });

export const LandmarkModel =
  mongoose.models.Landmark ||
  mongoose.model<ILandmark>("Landmark", LandmarkSchema);
