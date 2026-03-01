export class CreateJourneySearchDto {
  originLat!: number;
  originLng!: number;
  destLat!: number;
  destLng!: number;
  cityId?: string; // Optional filter if known
  time?: string; // Optional preference
}

export class JourneyOptionDto {
  totalTimeSeconds!: number;
  totalDistanceMeters!: number;
  transfers!: number;
  legs!: any[]; // Represents segments
  fareEstimate?: number;
  contextualInstructions?: string[];
}
