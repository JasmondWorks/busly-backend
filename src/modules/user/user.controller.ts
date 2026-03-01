import { Request, Response, NextFunction } from "express";
import { UserService } from "@/modules/user/user.service";
import { ApiResponse } from "@/utils/api-response.util";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.getAllUsers();
      ApiResponse.success(res, "Users retrieved successfully", users);
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getUserById(req.params.id as string);
      ApiResponse.success(res, "User retrieved successfully", user);
    } catch (error) {
      next(error);
    }
  };
}
