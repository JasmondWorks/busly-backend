import { MongooseRepository } from "@/utils/crud.util";
import { CityModel, ICity } from "./city.model";
import { AppError } from "@/utils/app-error.util";
import { CreateCityDto, UpdateCityDto } from "./city.dto";

export class CityService {
  private repo: MongooseRepository<ICity>;

  constructor() {
    this.repo = new MongooseRepository(CityModel);
  }

  async getAllCities() {
    return await this.repo.findAll();
  }

  async getCityById(id: string) {
    const city = await this.repo.findById(id);
    if (!city) throw new AppError("City not found", 404);
    return city;
  }

  async createCity(data: CreateCityDto) {
    const existing = await this.repo.findOne({
      name: data.name,
      country: data.country,
    });
    if (existing)
      throw new AppError(
        `City ${data.name} in ${data.country} already exists`,
        400,
      );

    return await this.repo.create(data);
  }

  async updateCity(id: string, data: UpdateCityDto) {
    const city = await this.repo.findById(id);
    if (!city) throw new AppError("City not found", 404);

    return await this.repo.update(id, data);
  }

  async deleteCity(id: string) {
    const city = await this.repo.findById(id);
    if (!city) throw new AppError("City not found", 404);

    return await this.repo.delete(id);
  }
}
