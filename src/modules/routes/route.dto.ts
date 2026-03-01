import { RouteMode, RouteDirection } from "./route.entity";

export class CreateRouteDto {
  cityId!: string;
  name!: string;
  mode!: RouteMode;
  provider?: string;
  confidenceScore?: number;
}

export class UpdateRouteDto {
  name?: string;
  mode?: RouteMode;
  provider?: string;
  confidenceScore?: number;
}

export class CreateRouteVariantDto {
  routeId!: string;
  direction!: RouteDirection;
  polyline!: {
    type: "LineString";
    coordinates: number[][]; // [longitude, latitude] array
  };
}

export class UpdateRouteVariantDto {
  direction?: RouteDirection;
  polyline?: {
    type: "LineString";
    coordinates: number[][]; // [longitude, latitude] array
  };
}

export class CreateRouteStopSequenceDto {
  routeVariantId!: string;
  stopId!: string;
  sequenceOrder!: number;
  distanceFromPrev?: number;
  typicalTimeFromPrev?: number;
}

export class UpdateRouteStopSequenceDto {
  stopId?: string;
  sequenceOrder?: number;
  distanceFromPrev?: number;
  typicalTimeFromPrev?: number;
}
