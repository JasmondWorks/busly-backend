import { NextFunction, Request, Response } from "express";
import { TransferService } from "./transfer.service";

export class TransferController {
  private transferService: TransferService;

  constructor() {
    this.transferService = new TransferService();
  }

  public async getAllTransfers(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const transfers = await this.transferService.getAllTransfers();
      res.status(200).json({ status: "success", data: transfers });
    } catch (error) {
      next(error);
    }
  }

  public async getTransfersFromStop(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const transfers = await this.transferService.getTransfersFromStop(
        (req.params.fromStopId as string),
      );
      res.status(200).json({ status: "success", data: transfers });
    } catch (error) {
      next(error);
    }
  }

  public async getTransferById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const transfer = await this.transferService.getTransferById(
        (req.params.id as string),
      );
      res.status(200).json({ status: "success", data: transfer });
    } catch (error) {
      next(error);
    }
  }

  public async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await this.transferService.createTransfer(req.body);
      res.status(201).json({ status: "success", data: transfer });
    } catch (error) {
      next(error);
    }
  }

  public async updateTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await this.transferService.updateTransfer(
        (req.params.id as string),
        req.body,
      );
      res.status(200).json({ status: "success", data: transfer });
    } catch (error) {
      next(error);
    }
  }

  public async deleteTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      await this.transferService.deleteTransfer((req.params.id as string));
      res.status(204).json({ status: "success", data: null });
    } catch (error) {
      next(error);
    }
  }
}
