import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import connectToDatabase from "@/config/db.config";
import v1Routes from "@/routes/v1.route";
import { globalErrorHandler } from "@/middlewares/error.middleware";
import { AppError } from "@/utils/app-error.util";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "@/config/swagger.config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { RoutingGraphService } from "@/modules/journeys/utils/graph-builder";

const app = express();

// Database connection + routing graph initialization
connectToDatabase().then(async () => {
  try {
    const graph = RoutingGraphService.getInstance();
    await graph.reloadGraphFromDB();
  } catch (err) {
    console.error("[Startup] Failed to initialize routing graph:", err);
  }
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/v1", v1Routes);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
