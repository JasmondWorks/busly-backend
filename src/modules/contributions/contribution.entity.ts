export enum ContributionType {
  NEW_STOP = "NEW_STOP",
  STOP_MISSING = "STOP_MISSING",
  ROUTE_CHANGE = "ROUTE_CHANGE",
  TRAFFIC_UPDATE = "TRAFFIC_UPDATE",
  OTHER = "OTHER",
}

export enum ContributionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface BaseContribution {
  id: string;
  userId: string;
  type: ContributionType;
  description?: string;
  geoData: {
    type: string;
    coordinates: any; // Point or LineString depending on type
  };
  status: ContributionStatus;
  upvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export type Contribution = BaseContribution;
