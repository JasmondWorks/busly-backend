import { Request, Response, NextFunction } from "express";
import { AuthService } from "@/modules/auth/auth.service";
import { ApiResponse } from "@/utils/api-response.util";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  private sendTokenResponse(
    res: Response,
    user: any,
    accessToken: string,
    refreshToken: string,
    statusCode: number,
    message: string,
  ) {
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days matching JWT expiration
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
    };

    res.cookie("refreshToken", refreshToken, cookieOptions);

    ApiResponse.success(res, message, { user, accessToken }, statusCode);
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, accessToken, refreshToken } =
        await this.authService.register(req.body);
      this.sendTokenResponse(
        res,
        user,
        accessToken,
        refreshToken,
        201,
        "User registered successfully. Please verify your email.",
      );
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, accessToken, refreshToken } = await this.authService.login(
        req.body,
      );
      this.sendTokenResponse(
        res,
        user,
        accessToken,
        refreshToken,
        200,
        "User logged in successfully",
      );
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, otp } = req.body;
      const result = await this.authService.verifyEmail(userId, otp);
      ApiResponse.success(res, result.message, null, 200);
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken || req.body.refreshToken;
      const { accessToken, refreshToken } =
        await this.authService.refreshTokens(token);

      const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
      };

      res.cookie("refreshToken", refreshToken, cookieOptions);
      ApiResponse.success(
        res,
        "Tokens refreshed successfully",
        { accessToken },
        200,
      );
    } catch (error) {
      next(error);
    }
  };

  logout = (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("refreshToken", "loggedout", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
      });
      ApiResponse.success(res, "Logged out successfully", null, 200);
    } catch (error) {
      next(error);
    }
  };
}
