export enum LandmarkType {
  MARKET = "MARKET",
  PROMINENT_BUILDING = "PROMINENT_BUILDING",
  INTERSECTION = "INTERSECTION",
  BRIDGE = "BRIDGE",
  ROUNDABOUT = "ROUNDABOUT",
  OTHER = "OTHER",
}

export interface BaseLandmark {
  id: string;
  cityId: string;
  name: string;
  location: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  type: LandmarkType;
  createdAt: Date;
  updatedAt: Date;
}

export type Landmark = BaseLandmark;
