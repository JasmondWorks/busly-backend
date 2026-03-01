import mongoose, { Schema, Document } from "mongoose";

export enum ContributionType {
  STOP = "STOP",
  LANDMARK = "LANDMARK",
  ROUTE = "ROUTE",
}

export enum ContributionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum VoteType {
  UP = "UP",
  DOWN = "DOWN",
}

export interface IVote {
  user: mongoose.Types.ObjectId;
  vote: VoteType;
}

export interface IContribution extends Document {
  contributor: mongoose.Types.ObjectId;
  type: ContributionType;
  entityId?: mongoose.Types.ObjectId;
  proposedData: Record<string, any>;
  status: ContributionStatus;
  votes: IVote[];
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    contributor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: Object.values(ContributionType),
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId }, // Flexible ref based on type
    proposedData: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: Object.values(ContributionStatus),
      default: ContributionStatus.PENDING,
    },
    votes: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        vote: { type: String, enum: Object.values(VoteType), required: true },
      },
    ],
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const ContributionModel =
  mongoose.models.Contribution ||
  mongoose.model<IContribution>("Contribution", ContributionSchema);
