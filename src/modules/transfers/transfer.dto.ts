export class CreateTransferDto {
  fromStopId!: string;
  toStopId!: string;
  walkingDistance!: number;
  walkingTime!: number;
  isSafe?: boolean;
}

export class UpdateTransferDto {
  fromStopId?: string;
  toStopId?: string;
  walkingDistance?: number;
  walkingTime?: number;
  isSafe?: boolean;
}
