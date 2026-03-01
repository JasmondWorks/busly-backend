export enum RouteMode {
  DANFO = "DANFO",
  BRT = "BRT",
  KEKEMARUWA = "KEKEMARUWA",
  FERRY = "FERRY",
  TRAIN = "TRAIN",
  OTHER = "OTHER",
}

export enum RouteDirection {
  OUTBOUND = "OUTBOUND",
  INBOUND = "INBOUND",
}

export interface BaseRoute {
  id: string;
  cityId: string;
  name: string;
  mode: RouteMode;
  provider: string; // e.g., "LAMATA" or "Community"
  confidenceScore: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseRouteVariant {
  id: string;
  routeId: string;
  direction: RouteDirection;
  polyline: {
    type: string;
    coordinates: number[][]; // LineString
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseRouteStopSequence {
  id: string;
  routeVariantId: string;
  stopId: string;
  sequenceOrder: number;
  distanceFromPrev: number; // in meters
  typicalTimeFromPrev: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

export type Route = BaseRoute;
export type RouteVariant = BaseRouteVariant;
export type RouteStopSequence = BaseRouteStopSequence;
