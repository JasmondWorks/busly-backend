export interface BaseStop {
  id: string;
  cityId: string;
  name: string;
  aliases: string[];
  location: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  confidenceScore: number;
  isTerminal: boolean;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
}

export type Stop = BaseStop;
