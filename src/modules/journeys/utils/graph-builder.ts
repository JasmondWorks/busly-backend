import { StopModel } from "../../stops/stop.model";
import { RouteModel } from "../../routes/route.model";
import { TransferModel } from "../../transfers/transfer.model";

export interface GraphEdge {
  toNodeId: string;
  weight: number; // time in seconds
  type: "ROUTE" | "TRANSFER";
  routeId?: string;
  routeName?: string;
  estimatedFare?: number;
}

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  name: string;
  areaName?: string;
  edges: GraphEdge[];
}

export class RoutingGraphService {
  private static instance: RoutingGraphService;
  private adjacencyList: Map<string, GraphNode> = new Map();
  private initialized = false;

  private constructor() {}

  public static getInstance(): RoutingGraphService {
    if (!RoutingGraphService.instance) {
      RoutingGraphService.instance = new RoutingGraphService();
    }
    return RoutingGraphService.instance;
  }

  public addNode(stopId: string, lat: number, lng: number, name = "", areaName = "") {
    if (!this.adjacencyList.has(stopId)) {
      this.adjacencyList.set(stopId, { id: stopId, lat, lng, name, areaName, edges: [] });
    }
  }

  public addEdge(
    fromStopId: string,
    toStopId: string,
    weight: number,
    type: "ROUTE" | "TRANSFER",
    metadata: Partial<GraphEdge> = {},
  ) {
    const node = this.adjacencyList.get(fromStopId);
    if (!node) return;
    // Avoid duplicate edges on same route
    const exists = node.edges.find(
      (e) => e.toNodeId === toStopId && e.routeId === metadata.routeId,
    );
    if (!exists) {
      node.edges.push({ toNodeId: toStopId, weight, type, ...metadata });
    }
  }

  public getNode(stopId: string): GraphNode | undefined {
    return this.adjacencyList.get(stopId);
  }

  public getGraph(): Map<string, GraphNode> {
    return this.adjacencyList;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Loads all stops, routes, and transfers from MongoDB into the in-memory graph.
   * Must be called on server startup and after any significant data change.
   */
  public async reloadGraphFromDB(): Promise<void> {
    console.log("[Graph] Reloading transit graph from DB...");
    this.adjacencyList.clear();

    // 1. Load all stops as graph nodes
    const stops = await StopModel.find({}).lean();
    for (const stop of stops) {
      const [lng, lat] = stop.location.coordinates;
      this.addNode(
        stop._id.toString(),
        lat,
        lng,
        stop.name,
        stop.areaName || "",
      );
    }
    console.log(`[Graph] Loaded ${stops.length} stop nodes`);

    // 2. Load all active routes and add directed edges between consecutive stops
    const routes = await RouteModel.find({ isActive: true }).lean();
    let edgeCount = 0;
    for (const route of routes) {
      const seq = [...route.stopsSequence].sort((a, b) => a.order - b.order);
      for (let i = 0; i < seq.length - 1; i++) {
        const from = seq[i];
        const to = seq[i + 1];
        // Default 3 min per stop if not specified
        const travelTime = from.averageTravelTimeToNext ?? 180;
        this.addEdge(
          from.stop.toString(),
          to.stop.toString(),
          travelTime,
          "ROUTE",
          {
            routeId: route._id.toString(),
            routeName: route.name,
            estimatedFare: to.estimatedFare ?? 0,
          },
        );
        edgeCount++;
      }
    }
    console.log(`[Graph] Added ${edgeCount} route edges from ${routes.length} routes`);

    // 3. Load all transfers and add transfer edges (bidirectional walking links)
    const transfers = await TransferModel.find({}).lean();
    for (const transfer of transfers) {
      const fromId = transfer.fromStopId.toString();
      const toId = transfer.toStopId.toString();
      // Transfer penalty: walking time + 120s boarding buffer
      const penalty = (transfer.walkingTime ?? 120) + 120;
      this.addEdge(fromId, toId, penalty, "TRANSFER");
      this.addEdge(toId, fromId, penalty, "TRANSFER"); // bidirectional
    }
    console.log(`[Graph] Added ${transfers.length * 2} transfer edges`);

    this.initialized = true;
    const totalNodes = this.adjacencyList.size;
    const totalEdges = Array.from(this.adjacencyList.values()).reduce(
      (sum, n) => sum + n.edges.length,
      0,
    );
    console.log(`[Graph] Transit graph ready: ${totalNodes} nodes, ${totalEdges} edges`);
  }
}
