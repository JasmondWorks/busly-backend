import { Response } from "express";

export class ApiResponse {
  static success(
    res: Response,
    message: string,
    data: any = null,
    statusCode = 200,
  ) {
    return res.status(statusCode).json({
      status: "success",
      message,
      data,
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors: any = null,
  ) {
    return res.status(statusCode).json({
      status: "error",
      message,
      errors,
    });
  }
}
