import mongoose, { Schema, Document } from "mongoose";

export interface IStop extends Document {
  name: string;
  slug: string;
  location: {
    type: "Point";
    coordinates: number[]; // [lng, lat]
  };
  areaName?: string;
  aliases?: string[];
  isVerified: boolean;
  createdBy?: mongoose.Types.ObjectId;
  connectedRoutes: mongoose.Types.ObjectId[];
  metadata: {
    popularityScore: number;
    usageCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StopSchema = new Schema<IStop>(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point", required: true },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    areaName: { type: String },
    aliases: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    connectedRoutes: [{ type: Schema.Types.ObjectId, ref: "Route" }],
    metadata: {
      popularityScore: { type: Number, default: 0 },
      usageCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

StopSchema.index({ location: "2dsphere" });
StopSchema.index({ name: "text" });

export const StopModel =
  mongoose.models.Stop || mongoose.model<IStop>("Stop", StopSchema);
