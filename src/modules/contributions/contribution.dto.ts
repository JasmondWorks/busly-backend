import { ContributionType, ContributionStatus } from "./contribution.entity";

export class CreateContributionDto {
  type!: ContributionType;
  description?: string;
  geoData!: {
    type: "Point" | "LineString";
    coordinates: any;
  };
}

export class UpdateContributionDto {
  status?: ContributionStatus;
}
