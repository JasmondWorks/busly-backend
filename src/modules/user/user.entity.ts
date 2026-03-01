export enum UserRole {
  PASSENGER = "PASSENGER",
  DRIVER = "DRIVER",
  ADMIN = "ADMIN",
}

export const userRoles = [UserRole.PASSENGER, UserRole.DRIVER, UserRole.ADMIN];

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isFirstLogin: boolean;
  isOnboarded: boolean;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
