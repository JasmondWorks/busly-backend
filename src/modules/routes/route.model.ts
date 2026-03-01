import mongoose, { Schema, Document } from "mongoose";

export enum RouteType {
  DIRECT = "DIRECT",
  TRANSFER = "TRANSFER",
  COMMUNITY_DEFINED = "COMMUNITY_DEFINED",
}

export interface IRouteSequence {
  stop: mongoose.Types.ObjectId;
  order: number;
  estimatedFare?: number;
  averageTravelTimeToNext?: number;
}

export interface IRoute extends Document {
  name: string;
  originStop: mongoose.Types.ObjectId;
  destinationStop: mongoose.Types.ObjectId;
  stopsSequence: IRouteSequence[];
  routeType: RouteType;
  isActive: boolean;
  reliabilityScore: number;
  tags?: string[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema = new Schema<IRoute>(
  {
    name: { type: String, required: true },
    originStop: { type: Schema.Types.ObjectId, ref: "Stop", required: true },
    destinationStop: {
      type: Schema.Types.ObjectId,
      ref: "Stop",
      required: true,
    },
    stopsSequence: [
      {
        stop: { type: Schema.Types.ObjectId, ref: "Stop", required: true },
        order: { type: Number, required: true },
        estimatedFare: { type: Number },
        averageTravelTimeToNext: { type: Number },
      },
    ],
    routeType: {
      type: String,
      enum: Object.values(RouteType),
      default: RouteType.DIRECT,
      required: true,
    },
    isActive: { type: Boolean, default: true },
    reliabilityScore: { type: Number, default: 0 },
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

RouteSchema.index({ originStop: 1, destinationStop: 1 });
RouteSchema.index({ reliabilityScore: -1 });

export const RouteModel =
  mongoose.models.Route || mongoose.model<IRoute>("Route", RouteSchema);
