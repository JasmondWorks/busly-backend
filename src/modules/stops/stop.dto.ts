export class CreateStopDto {
  cityId!: string;
  name!: string;
  aliases?: string[];
  location!: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  confidenceScore?: number;
  isTerminal?: boolean;
}

export class UpdateStopDto {
  name?: string;
  aliases?: string[];
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  confidenceScore?: number;
  isTerminal?: boolean;
  popularity?: number;
}
