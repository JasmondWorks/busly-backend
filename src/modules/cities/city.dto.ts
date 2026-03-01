export class CreateCityDto {
  name!: string;
  country!: string;
  boundary?: any; // GeoJSON Polygon
  active?: boolean;
}

export class UpdateCityDto {
  name?: string;
  country?: string;
  boundary?: any;
  active?: boolean;
}
