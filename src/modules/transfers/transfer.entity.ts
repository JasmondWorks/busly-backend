export interface BaseTransfer {
  id: string;
  fromStopId: string;
  toStopId: string;
  walkingDistance: number; // in meters
  walkingTime: number; // in seconds
  isSafe: boolean; // safe pedestrian path
  createdAt: Date;
  updatedAt: Date;
}

export type Transfer = BaseTransfer;
