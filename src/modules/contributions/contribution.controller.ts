import { Request, Response, NextFunction } from "express";
import { ContributionService } from "./contribution.service";
import { ContributionStatus, ContributionType, VoteType } from "./contribution.model";
import { ApiResponse } from "@/utils/api-response.util";
import { AppError } from "@/utils/app-error.util";

export class ContributionController {
  private service: ContributionService;

  constructor() {
    this.service = new ContributionService();
  }

  getContributions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as ContributionStatus | undefined;
      const type = req.query.type as ContributionType | undefined;
      const data = await this.service.getContributions(status, type);
      ApiResponse.success(res, "Contributions fetched", data);
    } catch (error) {
      next(error);
    }
  };

  getContributionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getContributionById(req.params.id as string);
      ApiResponse.success(res, "Contribution fetched", data);
    } catch (error) {
      next(error);
    }
  };

  createContribution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const result = await this.service.addCommunityContribution(userReq.user.id, req.body);
      ApiResponse.success(res, "Contribution submitted successfully", result, 201);
    } catch (error) {
      next(error);
    }
  };

  voteOnContribution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const vote = req.body.vote as VoteType;
      if (!vote || !Object.values(VoteType).includes(vote)) {
        throw new AppError("Vote must be UP or DOWN", 400);
      }
      const result = await this.service.voteOnContribution(req.params.id as string, userReq.user.id, vote);
      ApiResponse.success(res, "Vote recorded", result);
    } catch (error) {
      next(error);
    }
  };

  approveOrReject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const status = req.body.status as ContributionStatus;
      const result = await this.service.approveOrRejectContribution(
        req.params.id as string,
        userReq.user.id,
        status,
      );
      ApiResponse.success(res, "Contribution evaluated", result);
    } catch (error) {
      next(error);
    }
  };

  getMyContributions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as any;
      const data = await this.service.getContributionsByUser(userReq.user.id);
      ApiResponse.success(res, "Your contributions", data);
    } catch (error) {
      next(error);
    }
  };
}
