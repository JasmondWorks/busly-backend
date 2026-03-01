import swaggerJSDoc from "swagger-jsdoc";

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Busly Transit Navigation API",
    version: "1.0.0",
    description:
      "Full API documentation for Busly Backend - Stop-centric public transit navigation for Lagos, Nigeria.",
  },
  servers: [
    {
      url: "http://localhost:5000/api/v1",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      GeoJSONPoint: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["Point"], default: "Point" },
          coordinates: {
            type: "array",
            items: { type: "number" },
            description: "[longitude, latitude]",
          },
        },
      },
      GeoJSONLineString: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["LineString"], default: "LineString" },
          coordinates: {
            type: "array",
            items: { type: "array", items: { type: "number" } },
            description: "Array of [longitude, latitude]",
          },
        },
      },
      City: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          country: { type: "string" },
          active: { type: "boolean" },
          boundary: { $ref: "#/components/schemas/GeoJSONLineString" },
        },
      },
      Stop: {
        type: "object",
        properties: {
          id: { type: "string" },
          cityId: { type: "string" },
          name: { type: "string" },
          aliases: { type: "array", items: { type: "string" } },
          location: { $ref: "#/components/schemas/GeoJSONPoint" },
          confidenceScore: { type: "number" },
          isTerminal: { type: "boolean" },
          popularity: { type: "number" },
        },
      },
      Landmark: {
        type: "object",
        properties: {
          id: { type: "string" },
          cityId: { type: "string" },
          name: { type: "string" },
          type: {
            type: "string",
            enum: [
              "MARKET",
              "CHURCH",
              "MOSQUE",
              "ROUNDABOUT",
              "FILLING_STATION",
              "BRIDGE",
              "OTHER",
            ],
          },
          location: { $ref: "#/components/schemas/GeoJSONPoint" },
        },
      },
      Route: {
        type: "object",
        properties: {
          id: { type: "string" },
          cityId: { type: "string" },
          name: { type: "string" },
          mode: {
            type: "string",
            enum: ["BRT", "DANFO", "KEKEMARUWA", "FERRY", "TRAIN", "OTHER"],
          },
          provider: { type: "string" },
          confidenceScore: { type: "number" },
        },
      },
      RouteVariant: {
        type: "object",
        properties: {
          id: { type: "string" },
          routeId: { type: "string" },
          direction: {
            type: "string",
            enum: ["OUTBOUND", "INBOUND", "CIRCULAR"],
          },
          polyline: { $ref: "#/components/schemas/GeoJSONLineString" },
        },
      },
      RouteStopSequence: {
        type: "object",
        properties: {
          id: { type: "string" },
          routeVariantId: { type: "string" },
          stopId: { type: "string" },
          sequenceOrder: { type: "number" },
          distanceFromPrev: { type: "number" },
          typicalTimeFromPrev: { type: "number" },
        },
      },
      Transfer: {
        type: "object",
        properties: {
          id: { type: "string" },
          fromStopId: { type: "string" },
          toStopId: { type: "string" },
          walkingDistance: { type: "number" },
          walkingTime: { type: "number" },
          isSafe: { type: "boolean" },
        },
      },
      Contribution: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          type: {
            type: "string",
            enum: [
              "NEW_STOP",
              "STOP_MISSING",
              "ROUTE_CHANGE",
              "TRAFFIC_UPDATE",
              "OTHER",
            ],
          },
          description: { type: "string" },
          geoData: { $ref: "#/components/schemas/GeoJSONPoint" },
          status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
          upvotes: { type: "number" },
        },
      },
      JourneyOption: {
        type: "object",
        properties: {
          startStop: { type: "string" },
          endStop: { type: "string" },
          totalLegs: { type: "number" },
          pathDetails: { type: "array", items: { type: "object" } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Cities", description: "City map zones" },
    { name: "Stops", description: "Transport hubs and stations" },
    { name: "Landmarks", description: "Navigational context markers" },
    { name: "Routes", description: "Transport pathways and variants" },
    { name: "Transfers", description: "Pedestrian walking connections" },
    { name: "Contributions", description: "Community-driven map changes" },
    { name: "Journeys", description: "A* Public transport pathfinder" },
  ],
  paths: {
    // === CITIES ===
    "/cities": {
      get: {
        tags: ["Cities"],
        summary: "Get all cities",
        responses: { 200: { description: "Success" } },
      },
      post: {
        tags: ["Cities"],
        summary: "Create a City",
        description: "Admin only.",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/City" },
            },
          },
        },
        responses: { 201: { description: "City Created" } },
      },
    },
    "/cities/{id}": {
      get: {
        tags: ["Cities"],
        summary: "Get a City by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
      put: {
        tags: ["Cities"],
        summary: "Update a City by ID",
        description: "Admin only.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/City" },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Cities"],
        summary: "Delete a City by ID",
        description: "Super Admin only.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    // === STOPS ===
    "/stops": {
      get: {
        tags: ["Stops"],
        summary: "Get all stops (Optional cityId filter)",
        parameters: [
          {
            name: "cityId",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "OK" } },
      },
      post: {
        tags: ["Stops"],
        summary: "Create a Stop",
        description: "Admin only.",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Stop" },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/stops/nearby": {
      get: {
        tags: ["Stops"],
        summary: "Find nearby stops georeferenced",
        parameters: [
          {
            name: "lng",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "lat",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "radius",
            in: "query",
            required: false,
            schema: { type: "number", default: 1000 },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
    },
    "/stops/{id}": {
      get: {
        tags: ["Stops"],
        summary: "Get a Stop by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
      put: {
        tags: ["Stops"],
        summary: "Update a Stop by ID",
        description: "Admin only.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Stop" },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Stops"],
        summary: "Delete a Stop by ID",
        description: "Super Admin only.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    // === LANDMARKS ===
    "/landmarks": {
      get: {
        tags: ["Landmarks"],
        summary: "Get all landmarks",
        parameters: [
          {
            name: "cityId",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "OK" } },
      },
      post: {
        tags: ["Landmarks"],
        summary: "Create a Landmark",
        description: "Admin only.",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Landmark" },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/landmarks/nearby": {
      get: {
        tags: ["Landmarks"],
        summary: "Find nearby landmarks",
        parameters: [
          {
            name: "lng",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "lat",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "radius",
            in: "query",
            required: false,
            schema: { type: "number", default: 1000 },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
    },
    "/landmarks/{id}": {
      get: {
        tags: ["Landmarks"],
        summary: "Get Landmark by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
      put: {
        tags: ["Landmarks"],
        summary: "Update Landmark by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Landmark" },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Landmarks"],
        summary: "Delete Landmark by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    // === ROUTES ===
    "/routes": {
      get: {
        tags: ["Routes"],
        summary: "List routes",
        parameters: [
          {
            name: "cityId",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
      post: {
        tags: ["Routes"],
        summary: "Create route",
        description: "Admin only.",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Route" },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/routes/{id}": {
      get: {
        tags: ["Routes"],
        summary: "Get Route by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
      put: {
        tags: ["Routes"],
        summary: "Update Route by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Route" },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Routes"],
        summary: "Delete Route by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    "/routes/{routeId}/variants": {
      get: {
        tags: ["Routes"],
        summary: "Get variants for a Route",
        parameters: [
          {
            name: "routeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "OK" } },
      },
      post: {
        tags: ["Routes"],
        summary: "Create a route variant",
        description: "Admin only.",
        parameters: [
          {
            name: "routeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RouteVariant" },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/routes/variants/{variantId}": {
      put: {
        tags: ["Routes"],
        summary: "Update Route Variant",
        parameters: [
          {
            name: "variantId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RouteVariant" },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Routes"],
        summary: "Delete Route Variant",
        parameters: [
          {
            name: "variantId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    "/routes/variants/{variantId}/sequences": {
      get: {
        tags: ["Routes"],
        summary: "Get sequences for a variant",
        parameters: [
          {
            name: "variantId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "OK" } },
      },
      post: {
        tags: ["Routes"],
        summary: "Add a Stop Sequence",
        description: "Admin only.",
        parameters: [
          {
            name: "variantId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RouteStopSequence" },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/routes/sequences/{sequenceId}": {
      put: {
        tags: ["Routes"],
        summary: "Update Route Sequence",
        parameters: [
          {
            name: "sequenceId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RouteStopSequence" },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Routes"],
        summary: "Delete Route Sequence",
        parameters: [
          {
            name: "sequenceId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    // === TRANSFERS ===
    "/transfers": {
      get: {
        tags: ["Transfers"],
        summary: "List pedestrian transfers",
        responses: { 200: { description: "Success" } },
      },
      post: {
        tags: ["Transfers"],
        summary: "Create a transfer",
        description: "Admin only.",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Transfer" },
            },
          },
        },
        responses: { 201: { description: "Created transfer" } },
      },
    },
    "/transfers/{id}": {
      get: {
        tags: ["Transfers"],
        summary: "Get Transfer by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
      put: {
        tags: ["Transfers"],
        summary: "Update a transfer",
        description: "Admin only.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Transfer" },
            },
          },
        },
        responses: { 200: { description: "Updated transfer" } },
      },
      delete: {
        tags: ["Transfers"],
        summary: "Delete a transfer",
        description: "Super Admin only.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted transfer" } },
      },
    },
    // === CONTRIBUTIONS ===
    "/contributions": {
      post: {
        tags: ["Contributions"],
        summary: "Submit community feedback",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Contribution" },
            },
          },
        },
        responses: { 201: { description: "Logged" } },
      },
      get: {
        tags: ["Contributions"],
        summary: "List Admin Contributions queue",
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
            },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
    },
    "/contributions/{id}": {
      get: {
        tags: ["Contributions"],
        summary: "Get Contribution by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
      delete: {
        tags: ["Contributions"],
        summary: "Delete Contribution by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    "/contributions/user/{userId}": {
      get: {
        tags: ["Contributions"],
        summary: "Get Contributions for User",
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
    },
    "/contributions/{id}/vote": {
      patch: {
        tags: ["Contributions"],
        summary: "Upvote a contribution (public)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Upvoted" } },
      },
    },
    "/contributions/{id}/status": {
      patch: {
        tags: ["Contributions"],
        summary: "Update Contribution status (Admin)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "Status Updated" } },
      },
    },
    // === JOURNEYS ===
    "/journeys/search": {
      get: {
        tags: ["Journeys"],
        summary: "A* Pathfinding Router Map",
        parameters: [
          {
            name: "originLat",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "originLng",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "destLat",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "destLng",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
        ],
        responses: {
          200: {
            description: "Journeys options found",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/JourneyOption" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default swaggerDocument;
