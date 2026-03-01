import mongoose, { Schema, Document } from "mongoose";

export interface ICity extends Document {
  name: string;
  country: string;
  boundary?: {
    type: string;
    coordinates: number[][][];
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CitySchema = new Schema<ICity>(
  {
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    boundary: {
      type: {
        type: String,
        enum: ["Polygon", "MultiPolygon"],
      },
      coordinates: {
        type: Schema.Types.Mixed,
      },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Compound index for uniqueness of city within a country
CitySchema.index({ name: 1, country: 1 }, { unique: true });

export const CityModel = mongoose.model<ICity>("City", CitySchema);
