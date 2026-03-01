import { RoutingGraphService } from "./graph-builder";

export class AStarRouting {
  private graph: RoutingGraphService;

  constructor() {
    this.graph = RoutingGraphService.getInstance();
  }

  // Simplified heuristic: straight line distance for A* (spherical law of cosines or haversine)
  private heuristic(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d / 5; // Assumes ~5m/s speed as base heuristic for time (meters / speed = seconds)
  }

  public computeShortestPath(startNodeId: string, endNodeId: string) {
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, any>();
    const openSet = new Set<string>();

    const startNode = this.graph.getNode(startNodeId);
    const endNode = this.graph.getNode(endNodeId);

    if (!startNode || !endNode) return null;

    gScore.set(startNodeId, 0);
    fScore.set(
      startNodeId,
      this.heuristic(startNode.lat, startNode.lng, endNode.lat, endNode.lng),
    );
    openSet.add(startNodeId);

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let currentId = Array.from(openSet).reduce((minId, id) => {
        return (fScore.get(id) || Infinity) < (fScore.get(minId) || Infinity)
          ? id
          : minId;
      });

      if (currentId === endNodeId) {
        return this.reconstructPath(cameFrom, currentId);
      }

      openSet.delete(currentId);
      const currentNode = this.graph.getNode(currentId);
      if (!currentNode) continue;

      for (const edge of currentNode.edges) {
        const tentativeGScore = (gScore.get(currentId) || 0) + edge.weight;
        const neighborScore = gScore.get(edge.toNodeId) || Infinity;

        if (tentativeGScore < neighborScore) {
          cameFrom.set(edge.toNodeId, { from: currentId, edge });
          gScore.set(edge.toNodeId, tentativeGScore);

          const neighborNode = this.graph.getNode(edge.toNodeId);
          if (neighborNode) {
            fScore.set(
              edge.toNodeId,
              tentativeGScore +
                this.heuristic(
                  neighborNode.lat,
                  neighborNode.lng,
                  endNode.lat,
                  endNode.lng,
                ),
            );
          }

          if (!openSet.has(edge.toNodeId)) {
            openSet.add(edge.toNodeId);
          }
        }
      }
    }

    return null; // Path not found
  }

  private reconstructPath(cameFrom: Map<string, any>, currentId: string) {
    const path = [];
    while (cameFrom.has(currentId)) {
      const step = cameFrom.get(currentId);
      path.unshift({ stopId: currentId, ...step.edge });
      currentId = step.from;
    }
    // Final prepends the exact start
    path.unshift({ stopId: currentId, type: "START" });
    return path;
  }
}
