import mongoose, { Schema, Document } from "mongoose";

export interface ITransfer extends Document {
  fromStopId: mongoose.Types.ObjectId;
  toStopId: mongoose.Types.ObjectId;
  walkingDistance: number; // in meters
  walkingTime: number; // in seconds
  isSafe: boolean; // Safe path
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema<ITransfer>(
  {
    fromStopId: { type: Schema.Types.ObjectId, ref: "Stop", required: true },
    toStopId: { type: Schema.Types.ObjectId, ref: "Stop", required: true },
    walkingDistance: { type: Number, required: true },
    walkingTime: { type: Number, required: true },
    isSafe: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Indexes for fast lookup of connections
TransferSchema.index({ fromStopId: 1, toStopId: 1 }, { unique: true });
TransferSchema.index({ toStopId: 1 }); // reverse direction lookup

export const TransferModel = mongoose.model<ITransfer>(
  "Transfer",
  TransferSchema,
);
