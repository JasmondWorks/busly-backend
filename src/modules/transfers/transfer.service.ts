import { MongooseRepository } from "@/utils/crud.util";
import { TransferModel, ITransfer } from "./transfer.model";
import { AppError } from "@/utils/app-error.util";
import { CreateTransferDto, UpdateTransferDto } from "./transfer.dto";

export class TransferService {
  private repo: MongooseRepository<ITransfer>;

  constructor() {
    this.repo = new MongooseRepository(TransferModel);
  }

  async getAllTransfers() {
    return await this.repo.findAll();
  }

  async getTransfersFromStop(fromStopId: string) {
    return await this.repo.findAll({ fromStopId });
  }

  async getTransferById(id: string) {
    const transfer = await this.repo.findById(id);
    if (!transfer) throw new AppError("Transfer not found", 404);
    return transfer;
  }

  async createTransfer(data: CreateTransferDto) {
    // Check if transfer already exists
    const existing = await this.repo.findOne({
      fromStopId: data.fromStopId,
      toStopId: data.toStopId,
    });
    if (existing) throw new AppError("Transfer link already exists", 400);

    return await this.repo.create(data as unknown as Partial<ITransfer>);
  }

  async updateTransfer(id: string, data: UpdateTransferDto) {
    const transfer = await this.repo.findById(id);
    if (!transfer) throw new AppError("Transfer not found", 404);

    return await this.repo.update(id, data);
  }

  async deleteTransfer(id: string) {
    const transfer = await this.repo.findById(id);
    if (!transfer) throw new AppError("Transfer not found", 404);

    return await this.repo.delete(id);
  }
}
