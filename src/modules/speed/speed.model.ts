import mongoose, { Schema, Document } from "mongoose";

export interface ISpeedLog extends Document {
  driver: mongoose.Types.ObjectId;
  route?: mongoose.Types.ObjectId;
  speed: number;
  speedLimit?: number;
  location: {
    type: "Point";
    coordinates: number[];
  };
  isOverLimit: boolean;
  recordedAt: Date;
}

const SpeedLogSchema = new Schema<ISpeedLog>({
  driver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  route: { type: Schema.Types.ObjectId, ref: "Route" },
  speed: { type: Number, required: true },
  speedLimit: { type: Number },
  location: {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: { type: [Number], required: true },
  },
  isOverLimit: { type: Boolean, required: true, default: false },
  recordedAt: { type: Date, required: true, default: Date.now },
});

SpeedLogSchema.index({ location: "2dsphere" });
SpeedLogSchema.index({ driver: 1 });
SpeedLogSchema.index({ recordedAt: -1 });

export const SpeedLogModel =
  mongoose.models.SpeedLog ||
  mongoose.model<ISpeedLog>("SpeedLog", SpeedLogSchema);
