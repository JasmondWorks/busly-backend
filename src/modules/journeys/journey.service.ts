import { StopService } from "../stops/stop.service";
import { RouteService } from "../routes/route.service";
import { TransferService } from "../transfers/transfer.service";
import { LandmarkModel } from "../landmarks/landmark.model";
import { RouteModel } from "../routes/route.model";
import { StopModel } from "../stops/stop.model";
import { RoutingGraphService, GraphNode } from "./utils/graph-builder";
import { AStarRouting } from "./utils/a-star-routing";
import { AppError } from "../../utils/app-error.util";

interface StopDetail {
  id: string;
  name: string;
  areaName?: string;
  coordinates: number[];
  landmark?: {
    name: string;
    category: string;
    cue?: string;
  } | null;
}

interface JourneyLeg {
  routeId: string;
  routeName: string;
  mode: string;
  stops: StopDetail[];
  estimatedFare: number;
  estimatedDurationSeconds: number;
}

interface JourneyOption {
  totalLegs: number;
  totalStops: number;
  totalDurationSeconds: number;
  totalEstimatedFare: number;
  legs: JourneyLeg[];
  summary: string;
}

export class JourneyService {
  private stopService: StopService;
  private routeService: RouteService;
  private transferService: TransferService;
  private graphService: RoutingGraphService;
  private routingAlgorithm: AStarRouting;

  constructor() {
    this.stopService = new StopService();
    this.routeService = new RouteService();
    this.transferService = new TransferService();
    this.graphService = RoutingGraphService.getInstance();
    this.routingAlgorithm = new AStarRouting();
  }

  async initializeRoutingEngine() {
    console.log("Initializing In-Memory Transit Graph...");
    await this.graphService.reloadGraphFromDB();
  }

  /**
   * Fetches the nearest landmark to a stop and returns its name + a navigation cue.
   */
  private async getLandmarkForStop(stopId: string): Promise<StopDetail["landmark"]> {
    const stop = await StopModel.findById(stopId).lean();
    if (!stop) return null;

    const [lng, lat] = stop.location.coordinates;
    const nearby = await LandmarkModel.findOne({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: 300, // 300m radius
        },
      },
    }).lean();

    if (!nearby) return null;
    const cue = nearby.cues?.[0]?.text ?? null;
    return { name: nearby.name, category: nearby.category, cue };
  }

  /**
   * Transforms a raw A* path into structured journey legs grouped by route.
   */
  private async buildJourneyLegs(
    rawPath: Array<{ stopId: string; type: string; routeId?: string; routeName?: string; weight?: number; estimatedFare?: number }>,
  ): Promise<JourneyLeg[]> {
    const legs: JourneyLeg[] = [];
    let currentLeg: JourneyLeg | null = null;

    for (let i = 0; i < rawPath.length; i++) {
      const step = rawPath[i];
      const stopNode = this.graphService.getNode(step.stopId);
      const stopDetail: StopDetail = {
        id: step.stopId,
        name: stopNode?.name ?? step.stopId,
        areaName: stopNode?.areaName,
        coordinates: stopNode ? [stopNode.lng, stopNode.lat] : [],
        landmark: await this.getLandmarkForStop(step.stopId),
      };

      if (step.type === "START" || !currentLeg) {
        // Start a new leg
        if (currentLeg) legs.push(currentLeg);
        currentLeg = {
          routeId: step.routeId ?? "walking",
          routeName: step.routeName ?? "Start",
          mode: step.type === "TRANSFER" ? "WALK" : "BUS",
          stops: [stopDetail],
          estimatedFare: step.estimatedFare ?? 0,
          estimatedDurationSeconds: step.weight ?? 0,
        };
      } else if (currentLeg && step.routeId && step.routeId !== currentLeg.routeId) {
        // Route change: push current leg and start new one
        legs.push(currentLeg);
        currentLeg = {
          routeId: step.routeId,
          routeName: step.routeName ?? "Bus",
          mode: step.type === "TRANSFER" ? "WALK" : "BUS",
          stops: [stopDetail],
          estimatedFare: step.estimatedFare ?? 0,
          estimatedDurationSeconds: step.weight ?? 0,
        };
      } else {
        // Continue current leg
        currentLeg.stops.push(stopDetail);
        currentLeg.estimatedFare += step.estimatedFare ?? 0;
        currentLeg.estimatedDurationSeconds += step.weight ?? 0;
      }
    }

    if (currentLeg) legs.push(currentLeg);
    return legs;
  }

  /**
   * Main journey search: snaps coordinates to nearest stops, runs A* routing,
   * injects landmark context, returns up to 3 alternate journey options.
   */
  async searchJourney(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<JourneyOption[]> {
    // Ensure graph is loaded
    if (!this.graphService.isInitialized()) {
      await this.initializeRoutingEngine();
    }

    // 1. Snap user location to nearest transit stops (1km radius)
    const originStops = await this.stopService.findNearestStops(originLng, originLat, 1500, 3);
    const destStops = await this.stopService.findNearestStops(destLng, destLat, 1500, 3);

    if (!originStops.length) {
      throw new AppError("No transit stops found within 1.5km of your origin location", 404);
    }
    if (!destStops.length) {
      throw new AppError("No transit stops found within 1.5km of your destination", 404);
    }

    // 2. Try DB-based direct route search first (faster for direct routes)
    const directResults = await this.searchDirectRoutes(originStops, destStops);

    // 3. Try graph-based A* for multi-stop paths
    const graphResults = await this.searchViaGraph(originStops, destStops);

    // 4. Merge, deduplicate, and sort by duration
    const allOptions = [...directResults, ...graphResults];
    const seen = new Set<string>();
    const uniqueOptions = allOptions.filter((opt) => {
      const key = opt.legs.map((l) => l.routeId).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    uniqueOptions.sort((a, b) => a.totalDurationSeconds - b.totalDurationSeconds);

    if (!uniqueOptions.length) {
      throw new AppError(
        "No viable route found between these locations. Try searching with different stops.",
        404,
      );
    }

    return uniqueOptions.slice(0, 3);
  }

  /**
   * Direct route search using MongoDB: finds routes where both stops exist in sequence.
   */
  private async searchDirectRoutes(
    originStops: any[],
    destStops: any[],
  ): Promise<JourneyOption[]> {
    const options: JourneyOption[] = [];

    for (const originStop of originStops) {
      for (const destStop of destStops) {
        const originId = originStop._id.toString();
        const destId = destStop._id.toString();

        const directRoutes = await this.routeService.searchRoutesByOriginDestination(
          originId,
          destId,
        );

        for (const route of directRoutes) {
          const seq = [...route.stopsSequence].sort((a: any, b: any) => a.order - b.order);
          const originIdx = seq.findIndex((s: any) => s.stop.toString() === originId);
          const destIdx = seq.findIndex((s: any) => s.stop.toString() === destId);

          if (originIdx === -1 || destIdx === -1 || originIdx >= destIdx) continue;

          const relevantSeq = seq.slice(originIdx, destIdx + 1);
          let totalFare = 0;
          let totalDuration = 0;

          const stops: StopDetail[] = [];
          for (const seqItem of relevantSeq) {
            const stopId = seqItem.stop.toString();
            const node = this.graphService.getNode(stopId);
            stops.push({
              id: stopId,
              name: node?.name ?? "Stop",
              areaName: node?.areaName,
              coordinates: node ? [node.lng, node.lat] : [],
              landmark: await this.getLandmarkForStop(stopId),
            });
            totalFare += seqItem.estimatedFare ?? 0;
            totalDuration += seqItem.averageTravelTimeToNext ?? 180;
          }

          const leg: JourneyLeg = {
            routeId: route._id.toString(),
            routeName: route.name,
            mode: "BUS",
            stops,
            estimatedFare: totalFare,
            estimatedDurationSeconds: totalDuration,
          };

          options.push({
            totalLegs: 1,
            totalStops: stops.length,
            totalDurationSeconds: totalDuration,
            totalEstimatedFare: totalFare,
            legs: [leg],
            summary: `Take ${route.name} from ${stops[0].name} to ${stops[stops.length - 1].name} (${stops.length} stops)`,
          });
        }
      }
    }

    return options;
  }

  /**
   * Graph-based routing via A* — finds multi-route paths across transfers.
   */
  private async searchViaGraph(
    originStops: any[],
    destStops: any[],
  ): Promise<JourneyOption[]> {
    const options: JourneyOption[] = [];

    for (const start of originStops.slice(0, 2)) {
      for (const end of destStops.slice(0, 2)) {
        const startId = start._id.toString();
        const endId = end._id.toString();

        const rawPath = this.routingAlgorithm.computeShortestPath(startId, endId);
        if (!rawPath || rawPath.length < 2) continue;

        const legs = await this.buildJourneyLegs(rawPath);
        if (!legs.length) continue;

        const totalFare = legs.reduce((s, l) => s + l.estimatedFare, 0);
        const totalDuration = legs.reduce((s, l) => s + l.estimatedDurationSeconds, 0);
        const totalStops = legs.reduce((s, l) => s + l.stops.length, 0);
        const firstStop = legs[0]?.stops[0]?.name ?? "Origin";
        const lastLeg = legs[legs.length - 1];
        const lastStop = lastLeg?.stops[lastLeg.stops.length - 1]?.name ?? "Destination";

        options.push({
          totalLegs: legs.length,
          totalStops,
          totalDurationSeconds: totalDuration,
          totalEstimatedFare: totalFare,
          legs,
          summary:
            legs.length === 1
              ? `Take ${legs[0].routeName} from ${firstStop} to ${lastStop}`
              : `${legs.length} routes: board at ${firstStop}, alight at ${lastStop}`,
        });
      }
    }

    return options;
  }

  /**
   * Direct lookup when the frontend already knows both stop IDs.
   */
  async searchJourneyByStops(originStopId: string, destStopId: string): Promise<JourneyOption[]> {
    if (!this.graphService.isInitialized()) {
      await this.initializeRoutingEngine();
    }

    const originStop = await this.stopService.getStopById(originStopId);
    const destStop = await this.stopService.getStopById(destStopId);

    // Try direct DB route match first
    const directRoutes = await this.routeService.searchRoutesByOriginDestination(
      originStopId,
      destStopId,
    );

    if (directRoutes.length) {
      const route = directRoutes[0];
      const seq = [...route.stopsSequence].sort((a: any, b: any) => a.order - b.order);
      const oIdx = seq.findIndex((s: any) => s.stop.toString() === originStopId);
      const dIdx = seq.findIndex((s: any) => s.stop.toString() === destStopId);
      const relevant = seq.slice(oIdx, dIdx + 1);

      const stops: StopDetail[] = [];
      let totalFare = 0;
      let totalDuration = 0;
      for (const seqItem of relevant) {
        const stopId = seqItem.stop.toString();
        const node = this.graphService.getNode(stopId);
        stops.push({
          id: stopId,
          name: node?.name ?? "Stop",
          areaName: node?.areaName,
          coordinates: node ? [node.lng, node.lat] : [],
          landmark: await this.getLandmarkForStop(stopId),
        });
        totalFare += seqItem.estimatedFare ?? 0;
        totalDuration += seqItem.averageTravelTimeToNext ?? 180;
      }

      return [
        {
          totalLegs: 1,
          totalStops: stops.length,
          totalDurationSeconds: totalDuration,
          totalEstimatedFare: totalFare,
          legs: [{ routeId: route._id.toString(), routeName: route.name, mode: "BUS", stops, estimatedFare: totalFare, estimatedDurationSeconds: totalDuration }],
          summary: `Take ${route.name} — ${stops.length} stops`,
        },
      ];
    }

    // Fall back to A*
    const rawPath = this.routingAlgorithm.computeShortestPath(originStopId, destStopId);
    if (!rawPath) {
      throw new AppError("No viable route found between these stops", 404);
    }

    const legs = await this.buildJourneyLegs(rawPath);
    const totalFare = legs.reduce((s, l) => s + l.estimatedFare, 0);
    const totalDuration = legs.reduce((s, l) => s + l.estimatedDurationSeconds, 0);
    const totalStops = legs.reduce((s, l) => s + l.stops.length, 0);

    return [
      {
        totalLegs: legs.length,
        totalStops,
        totalDurationSeconds: totalDuration,
        totalEstimatedFare: totalFare,
        legs,
        summary: `Journey from ${originStop.name} to ${destStop.name}`,
      },
    ];
  }

  /**
   * Returns alternate routes at a given stop for the active trip (decision node feature).
   */
  async getAlternatesAtStop(currentStopId: string, currentRouteId: string, destinationStopId: string) {
    const alternates = await this.routeService.getAlternateRoutesFromStop(
      currentStopId,
      currentRouteId,
    );

    const results = [];
    for (const alt of alternates.slice(0, 3)) {
      const seq = [...alt.stopsSequence].sort((a: any, b: any) => a.order - b.order);
      const currentIdx = seq.findIndex((s: any) => s.stop.toString() === currentStopId);
      const destIdx = seq.findIndex((s: any) => s.stop.toString() === destinationStopId);

      let stopsRemaining = 0;
      let estimatedFare = 0;
      if (currentIdx !== -1 && destIdx !== -1 && currentIdx < destIdx) {
        stopsRemaining = destIdx - currentIdx;
        for (let i = currentIdx; i < destIdx; i++) {
          estimatedFare += seq[i + 1]?.estimatedFare ?? 0;
        }
      } else {
        stopsRemaining = seq.length - (currentIdx !== -1 ? currentIdx : 0);
      }

      results.push({
        routeId: alt._id.toString(),
        routeName: alt.name,
        stopsRemaining,
        estimatedFare,
        reliabilityScore: alt.reliabilityScore,
        requiresTransfer: false,
      });
    }

    return results;
  }
}
