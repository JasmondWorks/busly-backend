import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongooseRepository } from "../../utils/crud.util";
import { UserModel, IUser } from "../user/user.model";
import { CreateUserDto } from "../user/user.dto";
import { LoginDto } from "./auth.dto";
import { AppError } from "../../utils/app-error.util";
import config from "../../config/app.config";
import { EmailService } from "../../utils/email.util";

export class AuthService {
  private repo: MongooseRepository<IUser>;
  private emailService: EmailService;

  constructor() {
    this.repo = new MongooseRepository(UserModel);
    this.emailService = new EmailService();
  }

  private signTokens(id: string, role: string) {
    const accessToken = jwt.sign({ id, role }, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessTokenExpiresIn as any,
    });

    const refreshToken = jwt.sign({ id, role }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenExpiresIn as any,
    });

    return { accessToken, refreshToken };
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(data: CreateUserDto) {
    const existingUser = await this.repo.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError("Email already in use", 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const otp = this.generateOTP();

    // OTP expires in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const newUser = await this.repo.create({
      ...data,
      password: hashedPassword,
      verificationToken: otp,
      verificationTokenExpiresAt: expiresAt,
      isVerified: false,
      isFirstLogin: true,
      isOnboarded: false,
    });

    try {
      if (config.env !== "test") {
        await this.emailService.sendVerificationEmail(newUser.email, otp);
      }
    } catch (err) {
      console.error("Could not send email", err);
    }

    const { accessToken, refreshToken } = this.signTokens(
      newUser.id,
      newUser.role,
    );
    const userObj = newUser.toObject();
    delete userObj.password;
    delete userObj.verificationToken;

    return { user: userObj, accessToken, refreshToken };
  }

  async verifyEmail(userId: string, otp: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.isVerified) {
      throw new AppError("Email is already verified", 400);
    }

    if (!user.verificationToken || user.verificationToken !== otp) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    if (
      user.verificationTokenExpiresAt &&
      new Date() > user.verificationTokenExpiresAt
    ) {
      throw new AppError("OTP has expired", 400);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    return { message: "Email successfully verified" };
  }

  async login(data: LoginDto) {
    const user = await UserModel.findOne({ email: data.email }).select(
      "+password",
    );

    if (!user || !user.password) {
      throw new AppError("Incorrect email or password", 401);
    }

    const isPasswordCorrect = await bcrypt.compare(
      data.password,
      user.password,
    );

    if (!isPasswordCorrect) {
      throw new AppError("Incorrect email or password", 401);
    }

    // Set first login false safely
    if (user.isFirstLogin && user.isVerified) {
      user.isFirstLogin = false;
      await user.save();
    }

    const { accessToken, refreshToken } = this.signTokens(user.id, user.role);

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.verificationToken;

    return { user: userObj, accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken)
      throw new AppError("Please provide a valid refresh token", 401);

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
        id: string;
        role: string;
      };
      const user = await this.repo.findById(decoded.id);

      if (!user) {
        throw new AppError(
          "The user belonging to this token no longer exists",
          401,
        );
      }

      const tokens = this.signTokens(user.id, user.role);
      return tokens;
    } catch (err) {
      throw new AppError("Invalid refresh token, please login again", 401);
    }
  }
}
