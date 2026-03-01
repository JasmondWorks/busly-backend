import mongoose, { Schema, Document } from "mongoose";

export enum UserRole {
  PASSENGER = "PASSENGER",
  DRIVER = "DRIVER",
  ADMIN = "ADMIN",
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  reputationScore: number;
  isVerified: boolean; // Replaces isEmailVerified
  isFirstLogin?: boolean;
  isOnboarded?: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  savedRoutes: mongoose.Types.ObjectId[];
  frequentStops: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.PASSENGER,
    },
    reputationScore: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    // Auth internals preserved
    isFirstLogin: { type: Boolean, default: true },
    isOnboarded: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpiresAt: { type: Date },
    // References
    savedRoutes: [{ type: Schema.Types.ObjectId, ref: "Route" }],
    frequentStops: [{ type: Schema.Types.ObjectId, ref: "Stop" }],
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
