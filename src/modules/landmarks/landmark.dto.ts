import { LandmarkType } from "./landmark.entity";

export class CreateLandmarkDto {
  cityId!: string;
  name!: string;
  location!: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  type?: LandmarkType;
}

export class UpdateLandmarkDto {
  name?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  type?: LandmarkType;
}
