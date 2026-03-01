import mongoose from "mongoose";
import "dotenv/config";
import { StopModel } from "../modules/stops/stop.model";
import { RouteModel, RouteType } from "../modules/routes/route.model";
import fs from "fs";
import path from "path";
import through from "through2";
// @ts-ignore
import parseOSM from "osm-pbf-parser";

const DB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/busly";
const PBF_FILE_PATH = path.resolve(
  __dirname,
  "../../../nigeria-260226.osm.pbf",
);

const cleanString = (str: string | undefined): string => {
  return str ? str.replace(/[^a-zA-Z0-9\s-()]/g, "").trim() : "";
};

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};

const extractNodesFromPBF = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const nodes: any[] = [];
    const pbfParser = parseOSM();

    console.log(`📂 Reading PBF file from: ${PBF_FILE_PATH}`);

    if (!fs.existsSync(PBF_FILE_PATH)) {
      return reject(new Error(`PBF File not found at ${PBF_FILE_PATH}`));
    }

    fs.createReadStream(PBF_FILE_PATH)
      .pipe(pbfParser)
      .pipe(
        through.obj((items, enc, next) => {
          items.forEach((item: any) => {
            if (
              item.type === "node" &&
              item.tags &&
              item.tags.highway === "bus_stop" &&
              item.tags.name
            ) {
              nodes.push(item);
            }
          });
          next();
        }),
      )
      .on("finish", () => {
        resolve(nodes);
      })
      .on("error", (err: any) => {
        reject(err);
      });
  });
};

const seedFromOSM = async () => {
  try {
    console.log("⏳ Connecting to Database...");
    await mongoose.connect(DB_URI);
    console.log("✅ Database Connected.");

    console.log("⏳ Clearing old routing graphs...");
    await StopModel.deleteMany({});
    await RouteModel.deleteMany({});
    console.log("🧹 Collections cleared.");

    console.log("🌍 Parsing PBF file and searching for bus stops...");

    const nodes = await extractNodesFromPBF();

    console.log(
      `📡 Retrieved structured coordinates. Found ${nodes.length} uniquely named formal Bus Stops in the PBF file.`,
    );

    const uniqueSlugs = new Set();
    const deduplicatedNodes = nodes.filter((node: any) => {
      const slug = slugify(cleanString(node.tags.name));
      if (uniqueSlugs.has(slug)) return false;
      uniqueSlugs.add(slug);
      return true;
    });

    console.log(
      `📡 Cleaned duplicates. Down to ${deduplicatedNodes.length} unique stops.`,
    );

    const insertionPromises = deduplicatedNodes.map(async (node: any) => {
      try {
        const name = cleanString(node.tags.name);
        const slug = slugify(name);

        const aliases = [];
        if (node.tags.alt_name) aliases.push(cleanString(node.tags.alt_name));
        if (node.tags.old_name) aliases.push(cleanString(node.tags.old_name));

        const stop = new StopModel({
          name: name,
          slug: slug,
          location: {
            type: "Point",
            coordinates: [node.lon, node.lat],
          },
          areaName: "Nigeria Mapping Data",
          aliases: aliases,
          isVerified: true,
          metadata: {
            popularityScore: Math.floor(Math.random() * 80) + 10,
            usageCount: Math.floor(Math.random() * 5000),
          },
        });

        return stop.save();
      } catch (err) {
        return null;
      }
    });

    console.log("💾 Writing real-world Nodes to Geospatial Indexes...");
    const savedStops = (await Promise.all(insertionPromises)).filter(Boolean);
    console.log(
      `✅ ${savedStops.length} strict OSM nodes populated successfully.`,
    );

    // Now, let's create a functional mock "Big Route" connecting the top 50 random nodes to prove traversal structural arrays.
    console.log(
      "🕸 Generating dynamic routes linking real-world coordinates...",
    );

    if (savedStops.length > 5) {
      const heavyRouteStops = savedStops.slice(0, 30); // Grab 30 nodes
      const sequenceMapping = heavyRouteStops.map(
        (stop: any, index: number) => ({
          stop: stop._id,
          order: index + 1,
          estimatedFare: index === 0 ? 0 : 150,
          averageTravelTimeToNext: 120, // 2 minutes generic gap
        }),
      );

      const largeRoute = await RouteModel.create({
        name: "The Grand Nigerian BRT Simulator Line",
        originStop: heavyRouteStops[0]._id,
        destinationStop: heavyRouteStops[heavyRouteStops.length - 1]._id,
        stopsSequence: sequenceMapping,
        routeType: RouteType.DIRECT,
        isActive: true,
        tags: ["Nationwide", "Simulator"],
      });

      // Bind the nodes to the route physically
      const routingPromises = heavyRouteStops.map((stop: any) => {
        stop.connectedRoutes.push(largeRoute._id);
        return stop.save();
      });

      await Promise.all(routingPromises);
      console.log(
        `✅ Successfully synthesized Route Matrix with ${heavyRouteStops.length} geographic transfers.`,
      );
    }

    console.log("🎉 PBF Parsing and DB Seeding Pipeline completed fully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal Seeding Validation Failure:", err);
    process.exit(1);
  }
};

seedFromOSM();
