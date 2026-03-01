export interface BaseCity {
  id: string;
  name: string;
  country: string;
  boundary?: any; // GeoJSON Polygon
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type City = BaseCity;
