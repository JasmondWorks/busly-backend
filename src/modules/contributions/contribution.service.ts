import { MongooseRepository } from "@/utils/crud.util";
import {
  ContributionModel,
  IContribution,
  ContributionStatus,
  ContributionType,
  VoteType,
} from "./contribution.model";
import { StopModel } from "../stops/stop.model";
import { LandmarkModel } from "../landmarks/landmark.model";
import { RouteModel } from "../routes/route.model";
import { UserModel } from "../user/user.model";
import { AppError } from "@/utils/app-error.util";
import mongoose from "mongoose";

const VOTE_THRESHOLD = 3; // Auto-flag for review once this many upvotes are reached

export class ContributionService {
  private repo: MongooseRepository<IContribution>;

  constructor() {
    this.repo = new MongooseRepository(ContributionModel);
  }

  async getContributions(status?: ContributionStatus, type?: ContributionType) {
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    return await ContributionModel.find(filter)
      .populate("contributor", "name email reputationScore")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
  }

  async getContributionById(id: string) {
    const contribution = await ContributionModel.findById(id)
      .populate("contributor", "name email reputationScore")
      .lean();
    if (!contribution) throw new AppError("Contribution not found", 404);
    return contribution;
  }

  async addCommunityContribution(userId: string, data: Partial<IContribution>) {
    return await this.repo.create({
      ...data,
      contributor: userId as any,
      status: ContributionStatus.PENDING,
      votes: [],
    });
  }

  /**
   * Allows a community member to vote on a pending contribution.
   * A user can only vote once. Their reputation score weights the vote.
   */
  async voteOnContribution(contributionId: string, userId: string, voteType: VoteType) {
    const contribution = await this.repo.findById(contributionId);
    if (!contribution) throw new AppError("Contribution not found", 404);

    if (contribution.status !== ContributionStatus.PENDING) {
      throw new AppError("Can only vote on PENDING contributions", 400);
    }

    if (contribution.contributor.toString() === userId) {
      throw new AppError("Cannot vote on your own contribution", 400);
    }

    // Check if user already voted
    const alreadyVoted = contribution.votes.find((v) => v.user.toString() === userId);
    if (alreadyVoted) {
      // Allow changing vote
      alreadyVoted.vote = voteType;
    } else {
      contribution.votes.push({ user: userId as any, vote: voteType });
    }

    // Increment contributor reputation on upvote
    if (voteType === VoteType.UP) {
      await UserModel.findByIdAndUpdate(contribution.contributor, {
        $inc: { reputationScore: 1 },
      });
    }

    await contribution.save();
    return contribution;
  }

  /**
   * Admin approve/reject. On approval, merges proposedData into the live entity.
   */
  async approveOrRejectContribution(
    contributionId: string,
    adminUserId: string,
    status: ContributionStatus,
  ) {
    if (status === ContributionStatus.PENDING) {
      throw new AppError("Status must be APPROVED or REJECTED", 400);
    }

    const contribution = await this.repo.findById(contributionId);
    if (!contribution) throw new AppError("Contribution not found", 404);

    if (contribution.status !== ContributionStatus.PENDING) {
      throw new AppError("Contribution has already been evaluated", 400);
    }

    contribution.status = status;
    contribution.reviewedBy = adminUserId as any;

    if (status === ContributionStatus.APPROVED) {
      await this.mergeApprovedContribution(contribution);
      // Give contributor a significant rep boost for approved contribution
      await UserModel.findByIdAndUpdate(contribution.contributor, {
        $inc: { reputationScore: 10 },
      });
    }

    await contribution.save();
    return contribution;
  }

  /**
   * Applies the proposedData from an approved contribution onto the target entity.
   */
  private async mergeApprovedContribution(contribution: IContribution) {
    const data = contribution.proposedData;

    switch (contribution.type) {
      case ContributionType.STOP: {
        if (contribution.entityId) {
          // Update existing stop
          await StopModel.findByIdAndUpdate(contribution.entityId, {
            $set: { ...data, isVerified: true },
          });
        } else {
          // Create new stop from proposedData
          const slug = (data.name as string)
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
          await StopModel.create({ ...data, slug, isVerified: true });
        }
        break;
      }

      case ContributionType.LANDMARK: {
        if (contribution.entityId) {
          await LandmarkModel.findByIdAndUpdate(contribution.entityId, {
            $set: { ...data, isVerified: true },
          });
        } else {
          await LandmarkModel.create({ ...data, isVerified: true });
        }
        break;
      }

      case ContributionType.ROUTE: {
        if (contribution.entityId) {
          await RouteModel.findByIdAndUpdate(contribution.entityId, {
            $set: data,
          });
        } else {
          await RouteModel.create(data);
        }
        break;
      }

      default:
        throw new AppError(`Unknown contribution type: ${contribution.type}`, 400);
    }
  }

  async getContributionsByUser(userId: string) {
    return await ContributionModel.find({ contributor: userId })
      .sort({ createdAt: -1 })
      .lean();
  }
}
