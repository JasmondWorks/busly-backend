import { Router } from "express";
import authRoutes from "../modules/auth/auth.route";
import userRoutes from "../modules/user/user.route";
import stopRoutes from "../modules/stops/stop.route";
import routeRoutes from "../modules/routes/route.route";
import journeyRoutes from "../modules/journeys/journey.route";
import landmarkRoutes from "../modules/landmarks/landmark.route";
import contributionRoutes from "../modules/contributions/contribution.route";
import tripRoutes from "../modules/trips/trip.route";
import driverRoutes from "../modules/drivers/driver.route";
import speedRoutes from "../modules/speed/speed.route";
import transferRoutes from "../modules/transfers/transfer.route";
import cityRoutes from "../modules/cities/city.route";

const router = Router();

// Health check
router.get("/health", (_, res) => {
  res.status(200).json({ ok: true, service: "Busly API", version: "1.0.0" });
});

// Auth & Users
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// Core transport graph
router.use("/stops", stopRoutes);
router.use("/routes", routeRoutes);
router.use("/transfers", transferRoutes);

// Journey planning & navigation (core feature)
router.use("/journeys", journeyRoutes);

// Spatial context
router.use("/landmarks", landmarkRoutes);

// Community intelligence
router.use("/contributions", contributionRoutes);

// Session tracking
router.use("/trips", tripRoutes);

// Driver subsystem
router.use("/drivers", driverRoutes);
router.use("/speed", speedRoutes);

// Multi-city
router.use("/cities", cityRoutes);

export default router;
