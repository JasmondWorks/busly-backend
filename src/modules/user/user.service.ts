import { MongooseRepository } from "../../utils/crud.util";
import { UserModel, IUser } from "./user.model";
import { AppError } from "../../utils/app-error.util";

export class UserService {
  private repo: MongooseRepository<IUser>;

  constructor() {
    this.repo = new MongooseRepository(UserModel);
  }

  async getAllUsers() {
    return await this.repo.findAll();
  }

  async getUserById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new AppError("User not found", 404);
    return user;
  }
}
