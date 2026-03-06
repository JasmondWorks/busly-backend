/**
 * Busly Heavy Seed — OSM-powered Lagos, Nigeria
 * ─────────────────────────────────────────────
 * Builds the most comprehensive possible Lagos transport dataset by:
 *   1. Parsing the full nigeria-260226.osm.pbf (640 MB)
 *   2. Extracting every bus stop node inside the Lagos bounding box
 *   3. Extracting every bus / share-taxi / minibus route relation in Lagos
 *   4. Inserting curated stops first (GPS-accurate, named), then all OSM stops
 *   5. Building routes from OSM relations + 21 curated fallback routes
 *   6. Auto-computing transfers for every stop pair within 600 m (grid-based)
 *   7. Seeding curated + OSM landmarks (bridges, markets, schools, hospitals …)
 *   8. Creating 56 users (1 admin · 35 passengers · 20 drivers)
 *   9. Creating 18 sample community contributions
 *
 * Run:  npm run seedLagos          (from /backend)
 *
 * Notes
 *  - OSM stops start with isVerified=false so they can be community-validated
 *  - Curated stops (from manual GPS data) start with isVerified=true
 *  - Fares are estimated at ₦50 / km, min ₦100, max ₦800
 *  - Travel times use Lagos average 20 km/h (heavy traffic assumption)
 *  - Transfers are created bidirectionally for ≤ 600 m walking distance
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import through from "through2";
// @ts-ignore — no @types for osm-pbf-parser
import createParser from "osm-pbf-parser";

import { StopModel } from "../modules/stops/stop.model";
import { RouteModel, RouteType } from "../modules/routes/route.model";
import { LandmarkModel, LandmarkCategory } from "../modules/landmarks/landmark.model";
import { TransferModel } from "../modules/transfers/transfer.model";
import { UserModel, UserRole } from "../modules/user/user.model";
import { DriverProfileModel } from "../modules/drivers/driver.model";
import { CityModel } from "../modules/cities/city.model";
import {
  ContributionModel,
  ContributionType,
  ContributionStatus,
  VoteType,
} from "../modules/contributions/contribution.model";
import config from "../config/app.config";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface OsmNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface OsmRelation {
  id: number;
  tags: Record<string, string>;
  members: Array<{ type: string; id: number; role: string }>;
}

interface RouteTemplate {
  name: string;
  type: RouteType;
  stopNames: string[];
  fares: number[];
  times: number[];
  tags: string[];
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const PBF_PATH = path.resolve(__dirname, "../../../nigeria-260226.osm.pbf");
const MONGO_URI = config.db.url || "mongodb://localhost:27017/busly";

// Lagos bounding box — wide enough for Badagry (W), Epe (E), Ikorodu (N)
const BBOX = { minLon: 2.95, maxLon: 3.75, minLat: 6.35, maxLat: 6.78 };

// Stops further than this from any curated stop get merged (dedup radius)
const PROXIMITY_DEDUP_M = 80;
// Maximum walking distance to auto-create a transfer
const TRANSFER_MAX_M = 600;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const haversineM = (
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number => {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const inBbox = (lat: number, lon: number): boolean =>
  lat >= BBOX.minLat &&
  lat <= BBOX.maxLat &&
  lon >= BBOX.minLon &&
  lon <= BBOX.maxLon;

/** Rough Lagos zone name from GPS coordinate */
const getArea = (lat: number, lon: number): string => {
  if (lat >= 6.43 && lat <= 6.47 && lon >= 3.37 && lon <= 3.42) return "Lagos Island";
  if (lat >= 6.42 && lat <= 6.46 && lon >= 3.40 && lon <= 3.44) return "Obalende";
  if (lat >= 6.42 && lat <= 6.46 && lon >= 3.42 && lon <= 3.46) return "Ikoyi";
  if (lat >= 6.41 && lat <= 6.45 && lon >= 3.40 && lon <= 3.47) return "Victoria Island";
  if (lat >= 6.42 && lat <= 6.46 && lon >= 3.46 && lon <= 3.56) return "Lekki";
  if (lat >= 6.43 && lat <= 6.50 && lon >= 3.55 && lon <= 3.75) return "Ajah";
  if (lat >= 6.56 && lat <= 6.62 && lon >= 3.47 && lon <= 3.54) return "Ikorodu";
  if (lat >= 6.47 && lat <= 6.52 && lon >= 3.36 && lon <= 3.40) return "Yaba";
  if (lat >= 6.49 && lat <= 6.53 && lon >= 3.34 && lon <= 3.37) return "Surulere";
  if (lat >= 6.53 && lat <= 6.57 && lon >= 3.33 && lon <= 3.36) return "Oshodi";
  if (lat >= 6.59 && lat <= 6.62 && lon >= 3.32 && lon <= 3.37) return "Ikeja";
  if (lat >= 6.52 && lat <= 6.56 && lon >= 3.34 && lon <= 3.38) return "Mushin";
  if (lat >= 6.60 && lat <= 6.63 && lon >= 3.37 && lon <= 3.42) return "Ketu";
  if (lat >= 6.57 && lat <= 6.60 && lon >= 3.37 && lon <= 3.40) return "Ojota";
  if (lat >= 6.54 && lat <= 6.57 && lon >= 3.38 && lon <= 3.41) return "Gbagada";
  if (lat >= 6.55 && lat <= 6.58 && lon >= 3.34 && lon <= 3.37) return "Maryland";
  if (lat >= 6.46 && lat <= 6.49 && lon >= 3.28 && lon <= 3.33) return "Festac";
  if (lat >= 6.43 && lat <= 6.46 && lon >= 3.33 && lon <= 3.37) return "Apapa";
  if (lat >= 6.62 && lat <= 6.65 && lon >= 3.33 && lon <= 3.37) return "Berger";
  if (lat >= 6.60 && lat <= 6.65 && lon >= 3.29 && lon <= 3.33) return "Agege";
  if (lat >= 6.58 && lat <= 6.65 && lon >= 3.20 && lon <= 3.29) return "Alimosho";
  if (lat >= 6.53 && lat <= 6.56 && lon >= 3.35 && lon <= 3.40) return "Shomolu";
  if (lat >= 6.52 && lat <= 6.55 && lon >= 3.37 && lon <= 3.41) return "Bariga";
  if (lat >= 6.43 && lat <= 6.47 && lon >= 3.44 && lon <= 3.50) return "Lekki Phase 1";
  if (lat >= 6.46 && lat <= 6.49 && lon >= 3.33 && lon <= 3.37) return "Orile";
  if (lat >= 6.44 && lat <= 6.47 && lon >= 3.38 && lon <= 3.42) return "Mainland";
  if (lat >= 6.44 && lat <= 6.48 && lon >= 2.95 && lon <= 3.10) return "Badagry";
  return "Lagos Mainland";
};

/** Estimate fare from cumulative distance in metres */
const estimateFare = (cumDistM: number): number =>
  Math.min(800, Math.max(100, Math.round((cumDistM / 1000) * 50 / 50) * 50));

/** Estimate travel time in seconds (Lagos avg 20 km/h in traffic) */
const estimateTravelTime = (distM: number): number =>
  Math.max(60, Math.round(distM / 5.56)); // 20 km/h = 5.56 m/s

/** Map landmark OSM amenity to our LandmarkCategory */
const getLandmarkCat = (tags: Record<string, string>): LandmarkCategory => {
  const a = tags.amenity || "";
  if (a === "marketplace" || tags.shop === "market") return LandmarkCategory.MARKET;
  if (["school", "university", "college"].includes(a)) return LandmarkCategory.SCHOOL;
  if (tags.highway === "motorway_junction") return LandmarkCategory.JUNCTION;
  return LandmarkCategory.OTHER;
};

// ─── SPATIAL GRID (for O(N·k) transfer computation) ──────────────────────────

type StopMinimal = {
  _id: mongoose.Types.ObjectId;
  location: { coordinates: number[] };
  name: string;
};

const buildGrid = (stops: StopMinimal[]): Map<string, StopMinimal[]> => {
  const grid = new Map<string, StopMinimal[]>();
  for (const s of stops) {
    const [lon, lat] = s.location.coordinates;
    // ~0.01° ≈ 1.1 km cell
    const key = `${Math.floor(lat * 100)},${Math.floor(lon * 100)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(s);
  }
  return grid;
};

const getNeighbours = (
  stop: StopMinimal,
  grid: Map<string, StopMinimal[]>,
): StopMinimal[] => {
  const [lon, lat] = stop.location.coordinates;
  const cx = Math.floor(lat * 100);
  const cy = Math.floor(lon * 100);
  const result: StopMinimal[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cell = grid.get(`${cx + dx},${cy + dy}`);
      if (cell) result.push(...cell);
    }
  }
  return result;
};

// ─── OSM PBF PARSER ──────────────────────────────────────────────────────────

const BUS_PT_TAGS = new Set(["bus_stop", "stop_position", "platform"]);
const LANDMARK_AMENITIES = new Set([
  "marketplace", "school", "hospital", "university", "clinic",
  "ferry_terminal", "police", "library", "stadium", "cinema",
  "place_of_worship", "community_centre",
]);

function parsePBF(): Promise<{
  osmStops: Map<number, OsmNode>;
  osmLandmarks: OsmNode[];
  osmRouteRelations: OsmRelation[];
}> {
  return new Promise((resolve, reject) => {
    const osmStops = new Map<number, OsmNode>();
    const osmLandmarks: OsmNode[] = [];
    const osmRouteRelations: OsmRelation[] = [];
    let blocks = 0;

    if (!fs.existsSync(PBF_PATH)) {
      console.warn(`\n  ⚠  PBF not found at:\n     ${PBF_PATH}\n  Skipping OSM import. Curated data only.\n`);
      return resolve({ osmStops, osmLandmarks, osmRouteRelations });
    }

    console.log(`  📂 Reading: ${PBF_PATH}`);

    fs.createReadStream(PBF_PATH)
      .pipe(createParser())
      .pipe(
        through.obj(function (items: any[], _enc, next) {
          for (const item of items) {
            if (item.type === "node" && item.tags) {
              if (!inBbox(item.lat, item.lon)) continue;
              const t = item.tags as Record<string, string>;
              if (!t.name) continue;

              const isStop =
                t.highway === "bus_stop" ||
                BUS_PT_TAGS.has(t.public_transport || "") ||
                t.amenity === "bus_station";

              if (isStop) {
                osmStops.set(item.id, {
                  id: item.id,
                  lat: item.lat,
                  lon: item.lon,
                  tags: t,
                });
              } else if (LANDMARK_AMENITIES.has(t.amenity || "")) {
                osmLandmarks.push({
                  id: item.id,
                  lat: item.lat,
                  lon: item.lon,
                  tags: t,
                });
              }
            } else if (item.type === "relation" && item.tags) {
              const t = item.tags as Record<string, string>;
              if (
                t.type === "route" &&
                ["bus", "share_taxi", "minibus", "tram", "ferry"].includes(
                  t.route || "",
                )
              ) {
                osmRouteRelations.push({
                  id: item.id,
                  tags: t,
                  members: item.members || [],
                });
              }
            }
          }
          blocks++;
          if (blocks % 500 === 0)
            process.stdout.write(`\r  🔍 Parsed ${blocks} blocks …`);
          next();
        }),
      )
      .on("finish", () => {
        console.log(
          `\n  ✅ Parsed ${blocks} blocks → ` +
            `${osmStops.size} stop nodes · ` +
            `${osmRouteRelations.length} route relations · ` +
            `${osmLandmarks.length} landmark nodes`,
        );
        resolve({ osmStops, osmLandmarks, osmRouteRelations });
      })
      .on("error", reject);
  });
}

// ─── CURATED STOP DATA (77 GPS-accurate stops) ───────────────────────────────

const CURATED_STOPS = [
  // LAGOS ISLAND
  { name: "TBS (Tafawa Balewa Square)", area: "Lagos Island", lng: 3.3866, lat: 6.4552 },
  { name: "CMS Terminal", area: "Lagos Island", lng: 3.3883, lat: 6.4510 },
  { name: "Marina Bus Stop", area: "Lagos Island", lng: 3.3940, lat: 6.4541 },
  { name: "Apongbon", area: "Lagos Island", lng: 3.3821, lat: 6.4534 },
  { name: "Idumota", area: "Lagos Island", lng: 3.3936, lat: 6.4572 },
  { name: "Ojo Alaba (Island)", area: "Lagos Island", lng: 3.3989, lat: 6.4584 },
  { name: "National Theatre Bus Stop", area: "Lagos Island", lng: 3.3714, lat: 6.4534 },
  { name: "Ijora Causeway", area: "Lagos Island", lng: 3.3634, lat: 6.4556 },
  { name: "Broad Street Stop", area: "Lagos Island", lng: 3.3872, lat: 6.4503 },
  { name: "Tinubu Square Stop", area: "Lagos Island", lng: 3.3921, lat: 6.4527 },
  { name: "Ebute-Ero Stop", area: "Lagos Island", lng: 3.3890, lat: 6.4608 },
  // OBALENDE / IKOYI
  { name: "Obalende Terminal", area: "Obalende", lng: 3.4248, lat: 6.4544 },
  { name: "Falomo Roundabout", area: "Ikoyi", lng: 3.4290, lat: 6.4476 },
  { name: "Ikoyi Club Stop", area: "Ikoyi", lng: 3.4402, lat: 6.4487 },
  { name: "Awolowo Road Stop", area: "Ikoyi", lng: 3.4338, lat: 6.4511 },
  { name: "Alexander Road Stop", area: "Ikoyi", lng: 3.4377, lat: 6.4480 },
  // VICTORIA ISLAND
  { name: "Victoria Island (Sanusi Fafunwa)", area: "Victoria Island", lng: 3.4161, lat: 6.4280 },
  { name: "Eko Hotel Stop", area: "Victoria Island", lng: 3.4231, lat: 6.4318 },
  { name: "Bar Beach Stop", area: "Victoria Island", lng: 3.4291, lat: 6.4338 },
  { name: "Ahmadu Bello Way", area: "Victoria Island", lng: 3.4144, lat: 6.4290 },
  { name: "Bonny Camp", area: "Victoria Island", lng: 3.4152, lat: 6.4325 },
  { name: "Adeola Odeku Stop", area: "Victoria Island", lng: 3.4136, lat: 6.4291 },
  { name: "Karimu Kotun Stop", area: "Victoria Island", lng: 3.4218, lat: 6.4302 },
  { name: "Ozumba Mbadiwe Stop", area: "Victoria Island", lng: 3.4251, lat: 6.4340 },
  // LEKKI CORRIDOR
  { name: "Lekki Phase 1 Roundabout", area: "Lekki", lng: 3.4713, lat: 6.4483 },
  { name: "Ikate Junction", area: "Lekki", lng: 3.4939, lat: 6.4430 },
  { name: "Chevron Drive", area: "Lekki", lng: 3.5180, lat: 6.4367 },
  { name: "Oral Estate", area: "Lekki", lng: 3.5320, lat: 6.4303 },
  { name: "VGC Junction", area: "Lekki", lng: 3.5421, lat: 6.4278 },
  { name: "Igbo-Efon Stop", area: "Lekki", lng: 3.5220, lat: 6.4600 },
  { name: "Lekki Conservation Center Stop", area: "Lekki", lng: 3.5480, lat: 6.4480 },
  // AJAH / SANGOTEDO
  { name: "Jakande Gate", area: "Ajah", lng: 3.5563, lat: 6.4606 },
  { name: "Ajah Bus Stop", area: "Ajah", lng: 3.5664, lat: 6.4682 },
  { name: "Abraham Adesanya", area: "Ajah", lng: 3.5804, lat: 6.4742 },
  { name: "Sangotedo", area: "Ajah", lng: 3.5912, lat: 6.4814 },
  { name: "Badore Roundabout", area: "Ajah", lng: 3.5852, lat: 6.4771 },
  { name: "Ogombo Junction", area: "Ajah", lng: 3.6001, lat: 6.4789 },
  // APAPA
  { name: "Apapa Bus Stop", area: "Apapa", lng: 3.3560, lat: 6.4490 },
  { name: "Creek Road Apapa", area: "Apapa", lng: 3.3595, lat: 6.4450 },
  { name: "Tin Can Island Stop", area: "Apapa", lng: 3.3148, lat: 6.4374 },
  // ORILE / IGANMU / AJEGUNLE
  { name: "Orile Bus Stop", area: "Orile", lng: 3.3502, lat: 6.4720 },
  { name: "Iganmu Stop", area: "Iganmu", lng: 3.3540, lat: 6.4678 },
  { name: "Ajegunle Bus Stop", area: "Ajegunle", lng: 3.3430, lat: 6.4648 },
  // BADAGRY EXPRESSWAY
  { name: "Kirikiri Junction Stop", area: "Kirikiri", lng: 3.3340, lat: 6.4615 },
  { name: "Trade Fair Complex Stop", area: "Trade Fair", lng: 3.3042, lat: 6.4680 },
  { name: "Alaba International Market Stop", area: "Alaba", lng: 3.3095, lat: 6.4920 },
  { name: "Alakija Bus Stop", area: "Badagry Expressway", lng: 3.2900, lat: 6.4700 },
  { name: "Iba Bus Stop", area: "Iba", lng: 3.2685, lat: 6.5003 },
  // MAINLAND: OYINGBO / IDDO
  { name: "Oyingbo Terminal", area: "Mainland", lng: 3.3779, lat: 6.4822 },
  { name: "Iddo Terminal", area: "Iddo", lng: 3.3714, lat: 6.4694 },
  { name: "Costain Bus Stop", area: "Mainland", lng: 3.3663, lat: 6.4812 },
  // YABA
  { name: "Yaba Bus Stop", area: "Yaba", lng: 3.3776, lat: 6.5055 },
  { name: "Tejuosho Market Stop", area: "Yaba", lng: 3.3720, lat: 6.5065 },
  { name: "Herbert Macaulay Way", area: "Yaba", lng: 3.3734, lat: 6.5135 },
  { name: "Jibowu Junction", area: "Yaba", lng: 3.3690, lat: 6.5030 },
  { name: "Palm Avenue", area: "Yaba", lng: 3.3637, lat: 6.5072 },
  { name: "Akoka Stop", area: "Yaba", lng: 3.3940, lat: 6.5140 },
  // SURULERE / OJUELEGBA
  { name: "Ojuelegba Bus Stop", area: "Surulere", lng: 3.3616, lat: 6.5092 },
  { name: "Surulere Stadium Stop", area: "Surulere", lng: 3.3614, lat: 6.5040 },
  { name: "Aguda Bus Stop", area: "Surulere", lng: 3.3541, lat: 6.5149 },
  { name: "Itire Junction", area: "Surulere", lng: 3.3494, lat: 6.5098 },
  { name: "Ijesha Bus Stop", area: "Surulere", lng: 3.3427, lat: 6.5026 },
  { name: "Randle Avenue Stop", area: "Surulere", lng: 3.3640, lat: 6.4947 },
  { name: "Eric Moore Stop", area: "Surulere", lng: 3.3640, lat: 6.5013 },
  { name: "Alaka Stop", area: "Surulere", lng: 3.3585, lat: 6.4932 },
  { name: "National Stadium Stop", area: "Surulere", lng: 3.3599, lat: 6.5020 },
  // MUSHIN
  { name: "Mushin Bus Stop", area: "Mushin", lng: 3.3539, lat: 6.5406 },
  { name: "Ojuwoye Junction", area: "Mushin", lng: 3.3539, lat: 6.5534 },
  { name: "Cele Ijesa (Mushin)", area: "Mushin", lng: 3.3599, lat: 6.5302 },
  { name: "Papa Ajao", area: "Mushin", lng: 3.3618, lat: 6.5446 },
  // OSHODI
  { name: "Oshodi Terminal 1", area: "Oshodi", lng: 3.3441, lat: 6.5567 },
  { name: "Oshodi Terminal 2", area: "Oshodi", lng: 3.3453, lat: 6.5585 },
  { name: "Oshodi Underbridge", area: "Oshodi", lng: 3.3466, lat: 6.5602 },
  { name: "Ladipo Stop", area: "Oshodi", lng: 3.3492, lat: 6.5643 },
  // ISOLO / OKOTA
  { name: "Ilasamaja Stop", area: "Isolo", lng: 3.3320, lat: 6.5080 },
  { name: "Isolo Bus Stop", area: "Isolo", lng: 3.3130, lat: 6.5190 },
  { name: "Okota Road Stop", area: "Okota", lng: 3.3210, lat: 6.5050 },
  // BRT CORRIDOR (Fadeyi → Anthony)
  { name: "Fadeyi BRT Stop", area: "Lagos Mainland", lng: 3.3655, lat: 6.5449 },
  { name: "Onipanu BRT Stop", area: "Lagos Mainland", lng: 3.3718, lat: 6.5513 },
  { name: "Palmgroove BRT Stop", area: "Lagos Mainland", lng: 3.3773, lat: 6.5602 },
  { name: "Anthony BRT Stop", area: "Anthony", lng: 3.3697, lat: 6.5712 },
  // MARYLAND / GBAGADA / SHOMOLU
  { name: "Maryland Bus Stop", area: "Maryland", lng: 3.3554, lat: 6.5703 },
  { name: "Gbagada Phase 1", area: "Gbagada", lng: 3.3918, lat: 6.5462 },
  { name: "Iyana Oworo", area: "Gbagada", lng: 3.3897, lat: 6.5225 },
  { name: "Gbagada General Hospital Stop", area: "Gbagada", lng: 3.3890, lat: 6.5440 },
  { name: "Gbagada Phase 2 Stop", area: "Gbagada", lng: 3.3940, lat: 6.5510 },
  { name: "Obanikoro Stop", area: "Shomolu", lng: 3.3697, lat: 6.5325 },
  { name: "Bariga Bus Stop", area: "Bariga", lng: 3.3813, lat: 6.5260 },
  { name: "Shomolu Bus Stop", area: "Shomolu", lng: 3.3780, lat: 6.5340 },
  { name: "Pedro Stop", area: "Shomolu", lng: 3.3758, lat: 6.5383 },
  // OJOTA / KETU / MILE 12 / ALAPERE
  { name: "Ojota Terminal", area: "Ojota", lng: 3.3827, lat: 6.5883 },
  { name: "Ojota Ikorodu Road", area: "Ojota", lng: 3.3756, lat: 6.5927 },
  { name: "Ketu Bus Stop", area: "Ketu", lng: 3.3836, lat: 6.6142 },
  { name: "Ikosi Stop", area: "Ketu", lng: 3.3720, lat: 6.6170 },
  { name: "Mile 12 Terminal", area: "Mile 12", lng: 3.3921, lat: 6.6052 },
  { name: "Alapere Bus Stop", area: "Alapere", lng: 3.3900, lat: 6.5762 },
  // IKEJA / OREGUN
  { name: "Ikeja Bus Stop", area: "Ikeja", lng: 3.3386, lat: 6.6014 },
  { name: "Alausa Secretariat", area: "Ikeja", lng: 3.3484, lat: 6.6010 },
  { name: "Computer Village", area: "Ikeja", lng: 3.3458, lat: 6.5968 },
  { name: "Ikeja Under Bridge", area: "Ikeja", lng: 3.3371, lat: 6.5949 },
  { name: "Shogunle Stop", area: "Ikeja", lng: 3.3401, lat: 6.5742 },
  { name: "Oregun Bus Stop", area: "Oregun", lng: 3.3560, lat: 6.5995 },
  // BERGER / OGBA / AGEGE
  { name: "Berger Bus Stop", area: "Berger", lng: 3.3547, lat: 6.6342 },
  { name: "Ogba Junction", area: "Ogba", lng: 3.3273, lat: 6.6198 },
  { name: "Agege Motor Road", area: "Agege", lng: 3.3194, lat: 6.6207 },
  { name: "Dopemu Junction", area: "Agege", lng: 3.3263, lat: 6.5803 },
  { name: "Pen Cinema Stop", area: "Agege", lng: 3.3100, lat: 6.6131 },
  { name: "Fagba Junction", area: "Ogba", lng: 3.3195, lat: 6.6136 },
  { name: "Ifako Bus Stop", area: "Ifako-Ijaiye", lng: 3.3003, lat: 6.6240 },
  { name: "Meiran Bus Stop", area: "Meiran", lng: 3.2980, lat: 6.6340 },
  // MAGODO / ISHERI
  { name: "Magodo Phase 1 Gate", area: "Magodo", lng: 3.3930, lat: 6.6001 },
  { name: "Shangisha Junction Stop", area: "Magodo", lng: 3.4012, lat: 6.6185 },
  { name: "Isheri North Stop", area: "Isheri", lng: 3.4200, lat: 6.6298 },
  // IPAJA / AYOBO / ALIMOSHO
  { name: "Iyana-Ipaja Junction", area: "Agege", lng: 3.2852, lat: 6.6000 },
  { name: "Ipaja Bus Stop", area: "Ipaja", lng: 3.2490, lat: 6.6100 },
  { name: "Ayobo Junction", area: "Ayobo", lng: 3.2295, lat: 6.6198 },
  { name: "Alimosho Terminal", area: "Alimosho", lng: 3.2740, lat: 6.5910 },
  // FESTAC / MILE 2
  { name: "Mile 2 Bus Stop", area: "Mile 2", lng: 3.3200, lat: 6.4833 },
  { name: "Festac Town Gate", area: "Festac", lng: 3.2796, lat: 6.4774 },
  { name: "Satellite Town Terminal", area: "Satellite Town", lng: 3.2623, lat: 6.4672 },
  { name: "Ojo Bus Stop", area: "Ojo", lng: 3.2994, lat: 6.4675 },
  { name: "Volks Bus Stop", area: "Ijegun", lng: 3.3174, lat: 6.4858 },
  // IKORODU
  { name: "Ikorodu Terminal", area: "Ikorodu", lng: 3.5059, lat: 6.5867 },
  { name: "Benson Bus Stop", area: "Ikorodu", lng: 3.5009, lat: 6.5828 },
  { name: "Agric Stop (Ikorodu)", area: "Ikorodu", lng: 3.4990, lat: 6.5810 },
  { name: "Sabo (Ikorodu)", area: "Ikorodu", lng: 3.5045, lat: 6.5983 },
  { name: "Isawo Junction", area: "Ikorodu", lng: 3.5148, lat: 6.5978 },
  { name: "Ikorodu Marina Terminal", area: "Ikorodu", lng: 3.5065, lat: 6.5844 },
  // OWORO
  { name: "Oworo Terminal", area: "Oworo", lng: 3.3947, lat: 6.5237 },
  { name: "Adeniji-Adele Stop", area: "Lagos Island", lng: 3.3803, lat: 6.4894 },
  { name: "Abule-Egba Terminal", area: "Abule-Egba", lng: 3.2696, lat: 6.6372 },
];

// ─── CURATED ROUTE TEMPLATES (45 routes) ─────────────────────────────────────

const CURATED_ROUTES: RouteTemplate[] = [
  {
    name: "BRT Blue Line — TBS to Mile 12",
    type: RouteType.DIRECT,
    stopNames: ["TBS (Tafawa Balewa Square)", "National Theatre Bus Stop", "Costain Bus Stop", "Oyingbo Terminal", "Jibowu Junction", "Yaba Bus Stop", "Fadeyi BRT Stop", "Onipanu BRT Stop", "Palmgroove BRT Stop", "Anthony BRT Stop", "Maryland Bus Stop", "Ojota Terminal", "Ketu Bus Stop", "Mile 12 Terminal"],
    fares: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650],
    times: [180, 240, 300, 240, 180, 360, 300, 240, 300, 240, 420, 360, 300, 0],
    tags: ["BRT", "mainland", "express"],
  },
  {
    name: "CMS — Lekki — Ajah Express",
    type: RouteType.DIRECT,
    stopNames: ["CMS Terminal", "Obalende Terminal", "Falomo Roundabout", "Victoria Island (Sanusi Fafunwa)", "Lekki Phase 1 Roundabout", "Ikate Junction", "Chevron Drive", "Oral Estate", "VGC Junction", "Jakande Gate", "Ajah Bus Stop"],
    fares: [0, 100, 150, 200, 300, 400, 500, 550, 600, 650, 700],
    times: [420, 360, 300, 600, 480, 360, 300, 240, 300, 180, 0],
    tags: ["lekki", "express", "island", "danfo"],
  },
  {
    name: "Oshodi — Ikeja Direct",
    type: RouteType.DIRECT,
    stopNames: ["Oshodi Terminal 1", "Oshodi Underbridge", "Ladipo Stop", "Shogunle Stop", "Ikeja Under Bridge", "Computer Village", "Ikeja Bus Stop"],
    fares: [0, 50, 100, 150, 200, 250, 300],
    times: [120, 180, 240, 300, 180, 120, 0],
    tags: ["ikeja", "oshodi", "danfo"],
  },
  {
    name: "CMS — Oyingbo — Yaba",
    type: RouteType.DIRECT,
    stopNames: ["CMS Terminal", "Apongbon", "Adeniji-Adele Stop", "Oyingbo Terminal", "Costain Bus Stop", "Jibowu Junction", "Yaba Bus Stop"],
    fares: [0, 50, 100, 150, 200, 250, 300],
    times: [300, 240, 300, 240, 180, 240, 0],
    tags: ["yaba", "island", "danfo"],
  },
  {
    name: "Yaba — Mushin — Oshodi",
    type: RouteType.DIRECT,
    stopNames: ["Yaba Bus Stop", "Palm Avenue", "Ojuelegba Bus Stop", "Cele Ijesa (Mushin)", "Mushin Bus Stop", "Ojuwoye Junction", "Oshodi Terminal 1"],
    fares: [0, 50, 100, 150, 200, 250, 300],
    times: [300, 180, 300, 240, 180, 300, 0],
    tags: ["yaba", "mushin", "oshodi", "danfo"],
  },
  {
    name: "Ojota — Mile 12 — Ikorodu",
    type: RouteType.DIRECT,
    stopNames: ["Ojota Terminal", "Ojota Ikorodu Road", "Ketu Bus Stop", "Mile 12 Terminal", "Benson Bus Stop", "Ikorodu Terminal"],
    fares: [0, 50, 100, 150, 200, 300],
    times: [240, 300, 240, 420, 300, 0],
    tags: ["ikorodu", "mile12", "ketu"],
  },
  {
    name: "Surulere — Ojuelegba — Yaba",
    type: RouteType.DIRECT,
    stopNames: ["Aguda Bus Stop", "Surulere Stadium Stop", "Ojuelegba Bus Stop", "Palm Avenue", "Tejuosho Market Stop", "Yaba Bus Stop", "Jibowu Junction"],
    fares: [0, 50, 100, 150, 200, 250, 300],
    times: [240, 180, 300, 240, 180, 180, 0],
    tags: ["surulere", "yaba", "danfo"],
  },
  {
    name: "Oshodi — Anthony — Maryland — Ojota",
    type: RouteType.DIRECT,
    stopNames: ["Oshodi Terminal 2", "Shogunle Stop", "Anthony BRT Stop", "Maryland Bus Stop", "Ojota Terminal"],
    fares: [0, 100, 200, 300, 400],
    times: [420, 360, 300, 420, 0],
    tags: ["maryland", "oshodi", "ojota"],
  },
  {
    name: "CMS — National Theatre — Costain",
    type: RouteType.DIRECT,
    stopNames: ["CMS Terminal", "Apongbon", "National Theatre Bus Stop", "Ijora Causeway", "Costain Bus Stop"],
    fares: [0, 50, 100, 150, 200],
    times: [300, 240, 240, 300, 0],
    tags: ["island", "mainland", "national-theatre"],
  },
  {
    name: "Mile 2 — Volks — Oshodi",
    type: RouteType.DIRECT,
    stopNames: ["Mile 2 Bus Stop", "Volks Bus Stop", "Cele Ijesa (Mushin)", "Mushin Bus Stop", "Oshodi Terminal 1"],
    fares: [0, 100, 200, 250, 350],
    times: [420, 480, 360, 300, 0],
    tags: ["mile2", "oshodi", "mushin"],
  },
  {
    name: "Ikeja — Alausa — Berger",
    type: RouteType.DIRECT,
    stopNames: ["Ikeja Bus Stop", "Alausa Secretariat", "Ogba Junction", "Berger Bus Stop"],
    fares: [0, 100, 200, 300],
    times: [300, 420, 360, 0],
    tags: ["ikeja", "berger", "ogba"],
  },
  {
    name: "Berger — Maryland — Anthony — Oshodi",
    type: RouteType.DIRECT,
    stopNames: ["Berger Bus Stop", "Ojota Terminal", "Maryland Bus Stop", "Anthony BRT Stop", "Shogunle Stop", "Oshodi Terminal 2"],
    fares: [0, 100, 200, 300, 400, 500],
    times: [480, 420, 360, 300, 300, 0],
    tags: ["berger", "maryland", "oshodi"],
  },
  {
    name: "Festac — Mile 2 — Apongbon — CMS",
    type: RouteType.DIRECT,
    stopNames: ["Festac Town Gate", "Mile 2 Bus Stop", "National Theatre Bus Stop", "Apongbon", "CMS Terminal"],
    fares: [0, 100, 300, 400, 500],
    times: [480, 600, 360, 300, 0],
    tags: ["festac", "mile2", "cms", "island"],
  },
  {
    name: "CMS — Obalende — Victoria Island Loop",
    type: RouteType.DIRECT,
    stopNames: ["CMS Terminal", "Marina Bus Stop", "Obalende Terminal", "Falomo Roundabout", "Ahmadu Bello Way", "Victoria Island (Sanusi Fafunwa)", "Bonny Camp", "Eko Hotel Stop", "Bar Beach Stop"],
    fares: [0, 50, 100, 150, 200, 250, 300, 350, 400],
    times: [300, 360, 300, 240, 180, 240, 180, 240, 0],
    tags: ["island", "vi", "obalende", "loop"],
  },
  {
    name: "Victoria Island — Lekki — Chevron",
    type: RouteType.DIRECT,
    stopNames: ["Victoria Island (Sanusi Fafunwa)", "Lekki Phase 1 Roundabout", "Ikate Junction", "Chevron Drive"],
    fares: [0, 200, 300, 400],
    times: [600, 480, 360, 0],
    tags: ["lekki", "vi", "chevron"],
  },
  {
    name: "Ojota — Gbagada — Oworo",
    type: RouteType.DIRECT,
    stopNames: ["Ojota Terminal", "Ojota Ikorodu Road", "Gbagada Phase 1", "Iyana Oworo", "Oworo Terminal"],
    fares: [0, 50, 100, 150, 200],
    times: [300, 360, 300, 240, 0],
    tags: ["gbagada", "ojota", "oworo"],
  },
  {
    name: "Oshodi — Dopemu — Agege",
    type: RouteType.DIRECT,
    stopNames: ["Oshodi Terminal 1", "Oshodi Underbridge", "Dopemu Junction", "Agege Motor Road", "Iyana-Ipaja Junction"],
    fares: [0, 50, 100, 150, 200],
    times: [180, 300, 420, 360, 0],
    tags: ["oshodi", "agege", "dopemu"],
  },
  {
    name: "Satellite Town — Ojo — Festac — Mile 2",
    type: RouteType.DIRECT,
    stopNames: ["Satellite Town Terminal", "Ojo Bus Stop", "Festac Town Gate", "Volks Bus Stop", "Mile 2 Bus Stop"],
    fares: [0, 100, 200, 300, 400],
    times: [480, 360, 300, 420, 0],
    tags: ["satellite", "ojo", "festac", "mile2"],
  },
  {
    name: "CMS — Idumota — Balogun (Island Local)",
    type: RouteType.DIRECT,
    stopNames: ["CMS Terminal", "Marina Bus Stop", "Idumota", "Ojo Alaba (Island)"],
    fares: [0, 50, 100, 150],
    times: [180, 180, 240, 0],
    tags: ["island", "local", "balogun", "market"],
  },
  {
    name: "Ikeja — Agege Motor Road",
    type: RouteType.DIRECT,
    stopNames: ["Ikeja Bus Stop", "Ikeja Under Bridge", "Dopemu Junction", "Agege Motor Road"],
    fares: [0, 100, 200, 300],
    times: [240, 360, 420, 0],
    tags: ["ikeja", "agege"],
  },
  {
    name: "Abule-Egba — Iyana-Ipaja — Agege",
    type: RouteType.DIRECT,
    stopNames: ["Abule-Egba Terminal", "Iyana-Ipaja Junction", "Dopemu Junction", "Agege Motor Road", "Oshodi Terminal 1"],
    fares: [0, 100, 200, 300, 400],
    times: [480, 360, 420, 480, 0],
    tags: ["abule-egba", "iyana-ipaja", "agege", "oshodi"],
  },
  // Additional curated routes
  {
    name: "Apapa Express — CMS to Tin Can",
    type: RouteType.DIRECT,
    stopNames: ["CMS Terminal", "Apongbon", "Creek Road Apapa", "Apapa Bus Stop", "Tin Can Island Stop"],
    fares: [0, 100, 200, 300, 400],
    times: [300, 360, 300, 420, 0],
    tags: ["apapa", "cms", "island"],
  },
  {
    name: "Orile — Mile 2 Connector",
    type: RouteType.DIRECT,
    stopNames: ["Costain Bus Stop", "Orile Bus Stop", "Iganmu Stop", "Mile 2 Bus Stop"],
    fares: [0, 100, 150, 250],
    times: [300, 240, 360, 0],
    tags: ["orile", "mile2", "costain"],
  },
  {
    name: "Badagry Express — Mile 2 to Iba",
    type: RouteType.DIRECT,
    stopNames: ["Mile 2 Bus Stop", "Kirikiri Junction Stop", "Trade Fair Complex Stop", "Alaba International Market Stop", "Alakija Bus Stop", "Iba Bus Stop"],
    fares: [0, 100, 200, 300, 400, 500],
    times: [360, 420, 480, 360, 480, 0],
    tags: ["badagry", "mile2", "iba", "trade-fair"],
  },
  {
    name: "Lagos Island Local — CMS Loop",
    type: RouteType.DIRECT,
    stopNames: ["CMS Terminal", "Broad Street Stop", "Tinubu Square Stop", "Idumota", "Ebute-Ero Stop", "Marina Bus Stop"],
    fares: [0, 50, 100, 150, 200, 250],
    times: [180, 180, 180, 180, 240, 0],
    tags: ["island", "local", "cms"],
  },
  {
    name: "Yaba — Bariga — Shomolu",
    type: RouteType.DIRECT,
    stopNames: ["Yaba Bus Stop", "Akoka Stop", "Obanikoro Stop", "Bariga Bus Stop", "Shomolu Bus Stop"],
    fares: [0, 100, 150, 200, 250],
    times: [480, 360, 300, 240, 0],
    tags: ["yaba", "bariga", "shomolu"],
  },
  {
    name: "Shomolu — Gbagada — Ojota",
    type: RouteType.DIRECT,
    stopNames: ["Shomolu Bus Stop", "Pedro Stop", "Gbagada Phase 1", "Alapere Bus Stop", "Ojota Terminal"],
    fares: [0, 100, 200, 300, 400],
    times: [360, 420, 480, 360, 0],
    tags: ["shomolu", "gbagada", "ojota"],
  },
  {
    name: "Oshodi — Isolo — Okota — Mushin",
    type: RouteType.DIRECT,
    stopNames: ["Oshodi Terminal 1", "Ilasamaja Stop", "Isolo Bus Stop", "Okota Road Stop", "Mushin Bus Stop"],
    fares: [0, 100, 200, 300, 400],
    times: [420, 360, 300, 360, 0],
    tags: ["oshodi", "isolo", "okota", "mushin"],
  },
  {
    name: "Mile 2 — Alaba — Isolo",
    type: RouteType.DIRECT,
    stopNames: ["Mile 2 Bus Stop", "Alaba International Market Stop", "Isolo Bus Stop", "Okota Road Stop"],
    fares: [0, 100, 200, 300],
    times: [480, 360, 300, 0],
    tags: ["mile2", "alaba", "isolo"],
  },
  {
    name: "Ojota — Alapere — Magodo — Shangisha",
    type: RouteType.DIRECT,
    stopNames: ["Ojota Terminal", "Alapere Bus Stop", "Magodo Phase 1 Gate", "Shangisha Junction Stop"],
    fares: [0, 100, 200, 300],
    times: [360, 420, 300, 0],
    tags: ["ojota", "magodo", "shangisha"],
  },
  {
    name: "Ikeja — Berger — Isheri — Magodo",
    type: RouteType.DIRECT,
    stopNames: ["Ikeja Bus Stop", "Berger Bus Stop", "Isheri North Stop", "Shangisha Junction Stop", "Magodo Phase 1 Gate"],
    fares: [0, 200, 350, 450, 550],
    times: [600, 480, 360, 300, 0],
    tags: ["ikeja", "berger", "magodo", "isheri"],
  },
  {
    name: "Ikorodu Local Shuttle",
    type: RouteType.DIRECT,
    stopNames: ["Ikorodu Terminal", "Ikorodu Marina Terminal", "Agric Stop (Ikorodu)", "Benson Bus Stop"],
    fares: [0, 50, 100, 150],
    times: [120, 180, 240, 0],
    tags: ["ikorodu", "local", "shuttle"],
  },
  {
    name: "Ikorodu North — Sabo — Isawo",
    type: RouteType.DIRECT,
    stopNames: ["Ikorodu Terminal", "Sabo (Ikorodu)", "Isawo Junction"],
    fares: [0, 100, 200],
    times: [480, 360, 0],
    tags: ["ikorodu", "sabo", "isawo"],
  },
  {
    name: "Ipaja — Ayobo Local",
    type: RouteType.DIRECT,
    stopNames: ["Iyana-Ipaja Junction", "Ipaja Bus Stop", "Ayobo Junction"],
    fares: [0, 100, 200],
    times: [420, 360, 0],
    tags: ["ipaja", "ayobo", "alimosho"],
  },
  {
    name: "Agege — Pen Cinema — Meiran — Berger",
    type: RouteType.DIRECT,
    stopNames: ["Agege Motor Road", "Pen Cinema Stop", "Meiran Bus Stop", "Berger Bus Stop"],
    fares: [0, 100, 200, 300],
    times: [360, 420, 480, 0],
    tags: ["agege", "meiran", "berger"],
  },
  {
    name: "Victoria Island Deep Loop",
    type: RouteType.DIRECT,
    stopNames: ["Victoria Island (Sanusi Fafunwa)", "Adeola Odeku Stop", "Karimu Kotun Stop", "Ozumba Mbadiwe Stop", "Eko Hotel Stop"],
    fares: [0, 50, 100, 150, 200],
    times: [180, 180, 180, 180, 0],
    tags: ["vi", "loop", "local", "victoria-island"],
  },
  {
    name: "Obalende — Ikoyi Loop",
    type: RouteType.DIRECT,
    stopNames: ["Obalende Terminal", "Falomo Roundabout", "Awolowo Road Stop", "Alexander Road Stop", "Ikoyi Club Stop"],
    fares: [0, 100, 150, 200, 250],
    times: [300, 300, 240, 240, 0],
    tags: ["obalende", "ikoyi", "loop"],
  },
  {
    name: "Surulere Local — Aguda to Ojuelegba",
    type: RouteType.DIRECT,
    stopNames: ["Aguda Bus Stop", "Alaka Stop", "Randle Avenue Stop", "Eric Moore Stop", "National Stadium Stop", "Ojuelegba Bus Stop"],
    fares: [0, 50, 100, 150, 200, 250],
    times: [240, 240, 180, 180, 240, 0],
    tags: ["surulere", "local", "aguda"],
  },
  {
    name: "Ajegunle — Apapa — CMS",
    type: RouteType.DIRECT,
    stopNames: ["Ajegunle Bus Stop", "Creek Road Apapa", "Apapa Bus Stop", "Orile Bus Stop", "Costain Bus Stop", "CMS Terminal"],
    fares: [0, 100, 150, 250, 350, 500],
    times: [300, 240, 360, 420, 600, 0],
    tags: ["ajegunle", "apapa", "cms"],
  },
  {
    name: "Lekki — Ajah Deep — Badore — Sangotedo",
    type: RouteType.DIRECT,
    stopNames: ["Lekki Phase 1 Roundabout", "Igbo-Efon Stop", "Lekki Conservation Center Stop", "VGC Junction", "Jakande Gate", "Ajah Bus Stop", "Abraham Adesanya", "Badore Roundabout", "Sangotedo"],
    fares: [0, 100, 200, 300, 400, 500, 550, 600, 650],
    times: [480, 360, 420, 300, 240, 180, 300, 240, 0],
    tags: ["lekki", "ajah", "badore", "sangotedo"],
  },
  {
    name: "Gbagada — Bariga — Yaba",
    type: RouteType.DIRECT,
    stopNames: ["Gbagada Phase 2 Stop", "Gbagada General Hospital Stop", "Gbagada Phase 1", "Pedro Stop", "Bariga Bus Stop", "Obanikoro Stop", "Herbert Macaulay Way", "Yaba Bus Stop"],
    fares: [0, 50, 100, 150, 200, 250, 300, 350],
    times: [180, 240, 360, 300, 300, 300, 240, 0],
    tags: ["gbagada", "bariga", "yaba"],
  },
  {
    name: "Oshodi — Agege — Pen Cinema — Ifako",
    type: RouteType.DIRECT,
    stopNames: ["Oshodi Terminal 1", "Dopemu Junction", "Agege Motor Road", "Pen Cinema Stop", "Ifako Bus Stop"],
    fares: [0, 100, 200, 300, 400],
    times: [300, 420, 360, 480, 0],
    tags: ["oshodi", "agege", "pen-cinema"],
  },
  {
    name: "Alimosho — Iyana-Ipaja — Dopemu — Oshodi",
    type: RouteType.DIRECT,
    stopNames: ["Alimosho Terminal", "Iyana-Ipaja Junction", "Dopemu Junction", "Oshodi Terminal 1"],
    fares: [0, 150, 300, 450],
    times: [600, 480, 480, 0],
    tags: ["alimosho", "iyana-ipaja", "oshodi"],
  },
  {
    name: "Oregun — Alausa — Ikeja",
    type: RouteType.DIRECT,
    stopNames: ["Oregun Bus Stop", "Alausa Secretariat", "Computer Village", "Ikeja Bus Stop"],
    fares: [0, 100, 150, 200],
    times: [300, 180, 120, 0],
    tags: ["oregun", "ikeja", "alausa"],
  },
  {
    name: "Ketu — Ikosi — Mile 12 Shuttle",
    type: RouteType.DIRECT,
    stopNames: ["Ketu Bus Stop", "Ikosi Stop", "Mile 12 Terminal"],
    fares: [0, 100, 200],
    times: [360, 300, 0],
    tags: ["ketu", "ikosi", "mile12"],
  },
];

// ─── CURATED LANDMARKS (bridges, major junctions) ────────────────────────────

const CURATED_LANDMARKS = [
  // Bridges
  { name: "Eko Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.3660, lat: 6.4613, cue: "Major overhead bridge connecting Lagos Island to the mainland.", dir: "Cross towards mainland" },
  { name: "Carter Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.3700, lat: 6.4660, cue: "Historic colonial bridge. Access to Iddo terminal.", dir: "Walk towards the water" },
  { name: "Third Mainland Bridge (Entrance)", cat: LandmarkCategory.BRIDGE, lng: 3.3940, lat: 6.4700, cue: "Longest bridge in Nigeria connecting Island to Oworo.", dir: "Stay on bus until after bridge approach" },
  { name: "Lekki-Ikoyi Link Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.4432, lat: 6.4450, cue: "Toll bridge connecting Ikoyi to Lekki. Buses do not cross.", dir: "Take Falomo roundabout bus if avoiding toll" },
  { name: "Ijora Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.3610, lat: 6.4600, cue: "Small bridge between Lagos Island and Ijora.", dir: "Bridge to your left after National Theatre" },
  { name: "Mile 2 Flyover", cat: LandmarkCategory.BRIDGE, lng: 3.3190, lat: 6.4840, cue: "Major flyover at Mile 2 junction. All Apapa–Badagry routes pass under.", dir: "Drop here for Mile 2 connections" },
  { name: "Apapa–Wharf Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.3688, lat: 6.4430, cue: "Access bridge to Apapa port area.", dir: "Entry point to port — only port workers cross the inner gate" },
  { name: "Orile Agege Flyover", cat: LandmarkCategory.BRIDGE, lng: 3.3430, lat: 6.4680, cue: "Elevated expressway interchange at Orile. Key routing landmark.", dir: "Go under the flyover for Apapa buses" },
  // Junctions
  { name: "Ojuelegba Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3616, lat: 6.5092, cue: "Major interchange connecting Surulere, Yaba, Mushin and Oshodi routes.", dir: "Get off at the Texaco filling station side for Yaba buses" },
  { name: "Cele Ijesa Junction (Mushin)", cat: LandmarkCategory.JUNCTION, lng: 3.3599, lat: 6.5302, cue: "Key intersection. Buses to Oshodi and Surulere branch here.", dir: "Left turn for Oshodi, right for Aguda" },
  { name: "Oshodi Underbridge Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3466, lat: 6.5602, cue: "Major bus aggregation under the Oshodi expressway bridge.", dir: "Walk east under bridge for Ikeja; Terminal 1 for BRT" },
  { name: "Ikeja Underbridge", cat: LandmarkCategory.JUNCTION, lng: 3.3371, lat: 6.5949, cue: "Landmark junction beneath Ikeja flyover. Interchange for Agege, Oshodi and Berger routes.", dir: "Left for Computer Village; right for Shogunle" },
  { name: "Ojota Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3827, lat: 6.5883, cue: "Key junction where Lagos-Ibadan Expressway meets Ikorodu Road.", dir: "Cross overhead bridge for Mile 12 buses" },
  { name: "Toll Gate (Lekki)", cat: LandmarkCategory.JUNCTION, lng: 3.5280, lat: 6.4335, cue: "Lekki toll plaza. Major checkpoint — buses stop briefly here.", dir: "After toll gate, next stop is VGC Junction" },
  { name: "Jakande Junction (Ajah)", cat: LandmarkCategory.JUNCTION, lng: 3.5563, lat: 6.4606, cue: "Busy junction at Ajah. Interchange for Abraham Adesanya and Ibeju-Lekki directions.", dir: "Right for Abraham Adesanya; left for Sangotedo" },
  { name: "Apongbon Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3821, lat: 6.4534, cue: "Key junction at the approach to Eko Bridge from Lagos Island.", dir: "Look for the overhead Eko Bridge ramp" },
  { name: "Adeniji Bus Stop Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3803, lat: 6.4894, cue: "Junction where CMS routes split towards Oyingbo and Iddo terminal.", dir: "Keep left for Oyingbo, right for Iddo" },
  { name: "Berger Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3547, lat: 6.6342, cue: "Major northbound interchange. Buses to Ibadan, Sagamu and airport routes.", dir: "Stay at covered bus stop; do not enter express lane" },
  { name: "Iyana-Ipaja Junction", cat: LandmarkCategory.JUNCTION, lng: 3.2852, lat: 6.6000, cue: "Key junction in Agege/Alimosho. Multiple routes stop here.", dir: "Blue signs point to Lagos Airport" },
  { name: "Kirikiri Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3340, lat: 6.4617, cue: "Junction leading to Tin Can Island and Kirikiri industrial area.", dir: "Right for Tin Can, left for Apapa Road" },
  { name: "Eric Moore Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3638, lat: 6.5010, cue: "Surulere junction between Eric Moore Road and Western Avenue.", dir: "National Stadium is visible from here" },
  // Markets
  { name: "Balogun Market", cat: LandmarkCategory.MARKET, lng: 3.3930, lat: 6.4560, cue: "Largest open market on Lagos Island. Alight at Idumota if heading here.", dir: "Market is on both sides of road — look for fabric sellers" },
  { name: "Tejuosho Market (Yaba)", cat: LandmarkCategory.MARKET, lng: 3.3710, lat: 6.5055, cue: "Modern market in Yaba.", dir: "Drop at Tejuosho Stop. Market immediately to your right." },
  { name: "Oshodi International Market", cat: LandmarkCategory.MARKET, lng: 3.3455, lat: 6.5599, cue: "Massive textile and secondhand market at Oshodi.", dir: "Walk under bridge through stalls" },
  { name: "Computer Village Ikeja", cat: LandmarkCategory.MARKET, lng: 3.3460, lat: 6.5975, cue: "Largest tech/electronics market in West Africa.", dir: "Enter from Awolowo Way for electronics" },
  { name: "Ladipo Spare Parts Market", cat: LandmarkCategory.MARKET, lng: 3.3500, lat: 6.5651, cue: "Auto spare parts market near Oshodi.", dir: "Market visible from bus — rows of car parts stalls" },
  { name: "Mile 12 International Market", cat: LandmarkCategory.MARKET, lng: 3.3925, lat: 6.6060, cue: "Largest food/vegetable wholesale market in Lagos.", dir: "Alight at Mile 12 Terminal. Market to the left." },
  { name: "Ketu Market", cat: LandmarkCategory.MARKET, lng: 3.3840, lat: 6.6148, cue: "Food market in Ketu area.", dir: "Market stalls visible on right as bus approaches Ketu" },
  { name: "Aguda Market (Surulere)", cat: LandmarkCategory.MARKET, lng: 3.3535, lat: 6.5156, cue: "Local market near Aguda stop.", dir: "Small covered market — drop at Aguda junction" },
  { name: "Festac Town Market", cat: LandmarkCategory.MARKET, lng: 3.2800, lat: 6.4780, cue: "Main market inside Festac estate.", dir: "Enter from the 24 Road gate" },
  { name: "Alaba International Market", cat: LandmarkCategory.MARKET, lng: 3.3095, lat: 6.4920, cue: "Massive electronics and general goods market. Drop at Alaba stop.", dir: "Main entrance from Badagry Expressway" },
  { name: "Trade Fair International Market", cat: LandmarkCategory.MARKET, lng: 3.3042, lat: 6.4680, cue: "One of Nigeria's largest trade fairs. Buses stop right at the entrance.", dir: "Follow pedestrian bridge signs to market" },
  { name: "Ojota Spare Parts Market", cat: LandmarkCategory.MARKET, lng: 3.3810, lat: 6.5870, cue: "Spare parts trading hub at Ojota Terminal.", dir: "Enter from the terminal side" },
  { name: "Oyingbo Market", cat: LandmarkCategory.MARKET, lng: 3.3800, lat: 6.4820, cue: "Busy food market at Oyingbo. Useful landmark for terminal.", dir: "Market behind the bus terminal" },
  { name: "Ikeja Central Market", cat: LandmarkCategory.MARKET, lng: 3.3370, lat: 6.6000, cue: "Main goods market in Ikeja. Near Ikeja Bus Stop.", dir: "Behind the main bus stop" },
  // Schools
  { name: "University of Lagos (UNILAG) Gate", cat: LandmarkCategory.SCHOOL, lng: 3.3914, lat: 6.5187, cue: "UNILAG main gate. Drop at Herbert Macaulay junction, walk 5 mins.", dir: "Blue gate visible from road" },
  { name: "Yaba College of Technology", cat: LandmarkCategory.SCHOOL, lng: 3.3753, lat: 6.5044, cue: "YABATECH main gate. Drop at Yaba Bus Stop, walk 3 mins north.", dir: "Follow students' path from bus stop" },
  { name: "King's College Lagos", cat: LandmarkCategory.SCHOOL, lng: 3.3862, lat: 6.4565, cue: "Historic school on Lagos Island. Near TBS stop.", dir: "Red building visible from TBS bus stop" },
  { name: "Lagos State University (LASU) Gate", cat: LandmarkCategory.SCHOOL, lng: 3.2556, lat: 6.5145, cue: "LASU main entrance. Drop at Ojo junction.", dir: "Gate is along Badagry Expressway" },
  { name: "Igbobi College", cat: LandmarkCategory.SCHOOL, lng: 3.3680, lat: 6.5150, cue: "Historic boys secondary school between Yaba and Surulere.", dir: "White colonial buildings visible from road" },
  // Other landmarks
  { name: "National Theatre (Landmark)", cat: LandmarkCategory.OTHER, lng: 3.3714, lat: 6.4534, cue: "Iconic angular building visible from far. Drop at National Theatre stop.", dir: "Building is unmistakable — helmet shape" },
  { name: "Murtala Muhammed Airport (Domestic Terminal)", cat: LandmarkCategory.OTHER, lng: 3.3213, lat: 6.5791, cue: "Domestic airport terminal. Drop at Shogunle stop.", dir: "Airport signs visible from Ikeja Underbridge junction" },
  { name: "Lagos Island General Hospital", cat: LandmarkCategory.OTHER, lng: 3.3921, lat: 6.4571, cue: "Major hospital on Lagos Island. Drop at Idumota or Marina.", dir: "White compound with emergency signage" },
  { name: "Lagos University Teaching Hospital (LUTH)", cat: LandmarkCategory.OTHER, lng: 3.3905, lat: 6.5175, cue: "Major teaching hospital in Yaba. Drop at Herbert Macaulay Way.", dir: "Main gate on Harvey Road" },
  { name: "Gbagada General Hospital", cat: LandmarkCategory.OTHER, lng: 3.3892, lat: 6.5435, cue: "General hospital in Gbagada. Near Gbagada Phase 1 stop.", dir: "Hospital gate on Gbagada Expressway" },
  { name: "National Stadium (Surulere)", cat: LandmarkCategory.OTHER, lng: 3.3596, lat: 6.5021, cue: "Large sports complex in Surulere. Visible from Eric Moore Road.", dir: "Stadium entrance on National Stadium Road" },
  { name: "Rowe Park (Yaba)", cat: LandmarkCategory.OTHER, lng: 3.3762, lat: 6.5035, cue: "Public park and recreation center in Yaba.", dir: "Green park visible from road" },
  { name: "Freedom Park (Lagos Island)", cat: LandmarkCategory.OTHER, lng: 3.3880, lat: 6.4530, cue: "Historic park on Lagos Island, former prison site.", dir: "Visible from Marina road" },
  { name: "Lekki Conservation Centre", cat: LandmarkCategory.OTHER, lng: 3.5490, lat: 6.4476, cue: "Nature reserve with canopy walkway on Lekki–Epe Expressway.", dir: "Drop at Lekki Conservation Center Stop" },
  { name: "Apapa Wharf Gate", cat: LandmarkCategory.OTHER, lng: 3.3688, lat: 6.4430, cue: "Entry gate to Apapa port. Trucks and cargo vehicles visible.", dir: "Do not enter without port pass" },
];

// ─── CURATED TRANSFER DATA ────────────────────────────────────────────────────

const CURATED_TRANSFERS: Array<{ from: string; to: string; distM: number; walkSecs: number }> = [
  // Oshodi interchange
  { from: "Oshodi Terminal 1", to: "Oshodi Terminal 2", distM: 150, walkSecs: 90 },
  { from: "Oshodi Terminal 1", to: "Ladipo Stop", distM: 400, walkSecs: 300 },
  // CMS ↔ TBS
  { from: "CMS Terminal", to: "TBS (Tafawa Balewa Square)", distM: 350, walkSecs: 240 },
  // CMS ↔ Marina
  { from: "CMS Terminal", to: "Marina Bus Stop", distM: 500, walkSecs: 360 },
  // Obalende ↔ Falomo
  { from: "Obalende Terminal", to: "Falomo Roundabout", distM: 600, walkSecs: 420 },
  // VI ↔ Bonny Camp
  { from: "Victoria Island (Sanusi Fafunwa)", to: "Bonny Camp", distM: 400, walkSecs: 300 },
  // Ojota interchange
  { from: "Ojota Terminal", to: "Ojota Ikorodu Road", distM: 250, walkSecs: 180 },
  // Maryland ↔ Anthony
  { from: "Maryland Bus Stop", to: "Anthony BRT Stop", distM: 1200, walkSecs: 900 },
  // Yaba interchange
  { from: "Yaba Bus Stop", to: "Tejuosho Market Stop", distM: 400, walkSecs: 300 },
  { from: "Yaba Bus Stop", to: "Jibowu Junction", distM: 500, walkSecs: 360 },
  // Ikeja interchange
  { from: "Ikeja Bus Stop", to: "Computer Village", distM: 600, walkSecs: 420 },
  { from: "Ikeja Bus Stop", to: "Alausa Secretariat", distM: 800, walkSecs: 540 },
  // Mile 12 ↔ Ketu
  { from: "Mile 12 Terminal", to: "Ketu Bus Stop", distM: 900, walkSecs: 660 },
  // Mushin ↔ Cele
  { from: "Mushin Bus Stop", to: "Cele Ijesa (Mushin)", distM: 1200, walkSecs: 840 },
  // Surulere ↔ Ojuelegba
  { from: "Surulere Stadium Stop", to: "Ojuelegba Bus Stop", distM: 600, walkSecs: 420 },
  // Gbagada ↔ Oworo
  { from: "Gbagada Phase 1", to: "Iyana Oworo", distM: 2200, walkSecs: 1500 },
  // Festac ↔ Mile 2
  { from: "Festac Town Gate", to: "Mile 2 Bus Stop", distM: 3000, walkSecs: 2100 },
  // Apapa
  { from: "Apapa Bus Stop", to: "Creek Road Apapa", distM: 300, walkSecs: 210 },
  // Orile
  { from: "Orile Bus Stop", to: "Iganmu Stop", distM: 500, walkSecs: 360 },
  // Lagos Island local
  { from: "CMS Terminal", to: "Broad Street Stop", distM: 400, walkSecs: 300 },
  { from: "Tinubu Square Stop", to: "Idumota", distM: 300, walkSecs: 210 },
  // Bariga / Shomolu
  { from: "Bariga Bus Stop", to: "Shomolu Bus Stop", distM: 500, walkSecs: 360 },
  { from: "Obanikoro Stop", to: "Onipanu BRT Stop", distM: 800, walkSecs: 540 },
  // Gbagada local
  { from: "Gbagada Phase 1", to: "Gbagada Phase 2 Stop", distM: 1200, walkSecs: 840 },
  { from: "Pedro Stop", to: "Gbagada Phase 1", distM: 1000, walkSecs: 720 },
  // Ikorodu local
  { from: "Agric Stop (Ikorodu)", to: "Benson Bus Stop", distM: 350, walkSecs: 240 },
  // Ajah deep
  { from: "Abraham Adesanya", to: "Badore Roundabout", distM: 2000, walkSecs: 1440 },
  // Lekki Phase 1
  { from: "Lekki Phase 1 Roundabout", to: "Ajah Bus Stop", distM: 8500, walkSecs: 6000 },
];

// ─── USER DATA ───────────────────────────────────────────────────────────────

const PASSENGERS = [
  { name: "Amara Okafor", email: "amara@busly.ng" },
  { name: "Tunde Adeyemi", email: "tunde@busly.ng" },
  { name: "Chisom Eze", email: "chisom@busly.ng" },
  { name: "Fatima Bello", email: "fatima@busly.ng" },
  { name: "Emeka Nwosu", email: "emeka@busly.ng" },
  { name: "Kemi Adeleke", email: "kemi@busly.ng" },
  { name: "Biodun Fashola", email: "biodun@busly.ng" },
  { name: "Ngozi Obi", email: "ngozi@busly.ng" },
  { name: "Sola Adeola", email: "sola@busly.ng" },
  { name: "Ife Martins", email: "ife@busly.ng" },
  { name: "Adaeze Okonkwo", email: "adaeze@busly.ng" },
  { name: "Kayode Omotosho", email: "kayode@busly.ng" },
  { name: "Priscilla Nwachukwu", email: "priscilla@busly.ng" },
  { name: "Usman Garba", email: "usman@busly.ng" },
  { name: "Blessing Onuoha", email: "blessing@busly.ng" },
  { name: "Chukwuemeka Agu", email: "chuks@busly.ng" },
  { name: "Yetunde Bakare", email: "yetunde@busly.ng" },
  { name: "Ibrahim Sule", email: "ibrahim@busly.ng" },
  { name: "Adunola Peters", email: "adunola@busly.ng" },
  { name: "Chidera Mbanisi", email: "chidera@busly.ng" },
  { name: "Tolani Adegoke", email: "tolani@busly.ng" },
  { name: "Obinna Ezike", email: "obinna@busly.ng" },
  { name: "Esther Oluwaseun", email: "esther@busly.ng" },
  { name: "Ahmed Yusuf", email: "ahmed@busly.ng" },
  { name: "Funke Osinkolu", email: "funke@busly.ng" },
  { name: "Rotimi Coker", email: "rotimi@busly.ng" },
  { name: "Adaobi Nwosu", email: "adaobi@busly.ng" },
  { name: "Babajide Adeyemi", email: "babajide@busly.ng" },
  { name: "Olamide Adesanya", email: "olamide@busly.ng" },
  { name: "Chinwe Obiora", email: "chinwe@busly.ng" },
  { name: "Sunday Nwokolo", email: "sunday@busly.ng" },
  { name: "Hadijat Bello", email: "hadijat@busly.ng" },
  { name: "Lanre Akinwande", email: "lanre@busly.ng" },
  { name: "Zainab Musa", email: "zainab@busly.ng" },
  { name: "Nkechi Ihejirika", email: "nkechi@busly.ng" },
];

const DRIVERS = [
  { name: "Bola Awolowo", email: "driver.bola@busly.ng" },
  { name: "Seun Ogunleye", email: "driver.seun@busly.ng" },
  { name: "Chukwudi Nnaji", email: "driver.chukwudi@busly.ng" },
  { name: "Rasheed Lawal", email: "driver.rasheed@busly.ng" },
  { name: "Emmanuel Obi", email: "driver.emmy@busly.ng" },
  { name: "Akin Babatunde", email: "driver.akin@busly.ng" },
  { name: "Musa Ibrahim", email: "driver.musa@busly.ng" },
  { name: "Victor Ugwu", email: "driver.victor@busly.ng" },
  { name: "Gbenga Olatunji", email: "driver.gbenga@busly.ng" },
  { name: "Festus Okoro", email: "driver.festus@busly.ng" },
  { name: "Nnamdi Ogbu", email: "driver.nnamdi@busly.ng" },
  { name: "Biodun Adeleke", email: "driver.biodun@busly.ng" },
  { name: "Jimoh Adeyemi", email: "driver.jimoh@busly.ng" },
  { name: "Kunle Ogunbiyi", email: "driver.kunle@busly.ng" },
  { name: "Ifeanyi Chukwu", email: "driver.ifeanyi@busly.ng" },
  { name: "Salisu Mohammed", email: "driver.salisu@busly.ng" },
  { name: "Tope Adewale", email: "driver.tope@busly.ng" },
  { name: "Ebuka Okoye", email: "driver.ebuka@busly.ng" },
  { name: "Bisi Adeoye", email: "driver.bisi@busly.ng" },
  { name: "Hakeem Lateef", email: "driver.hakeem@busly.ng" },
];

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────

async function seedDatabase() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  // ── 1. CLEAR ALL COLLECTIONS ──────────────────────────────────────────────
  console.log("🧹 Clearing all collections...");
  await Promise.all([
    CityModel.deleteMany({}),
    StopModel.deleteMany({}),
    RouteModel.deleteMany({}),
    LandmarkModel.deleteMany({}),
    TransferModel.deleteMany({}),
    UserModel.deleteMany({}),
    DriverProfileModel.deleteMany({}),
    ContributionModel.deleteMany({}),
  ]);
  console.log("✅ Collections cleared\n");

  // ── 2. CITY ───────────────────────────────────────────────────────────────
  await CityModel.create({ name: "Lagos", country: "Nigeria", active: true });
  console.log("✅ City: Lagos\n");

  // ── 3. PARSE OSM PBF ──────────────────────────────────────────────────────
  console.log("🌍 Parsing OSM PBF file (640 MB — may take 3–8 minutes)...");
  const { osmStops, osmLandmarks, osmRouteRelations } = await parsePBF();

  // ── 4. INSERT CURATED STOPS ───────────────────────────────────────────────
  console.log(`\n📍 Inserting ${CURATED_STOPS.length} curated stops...`);
  const stopDocMap = new Map<string, mongoose.Types.ObjectId>(); // name → mongo _id
  const usedSlugs = new Set<string>();

  // Track curated stop coordinates for proximity dedup of OSM stops
  const curatedCoords: Array<{ lon: number; lat: number }> = [];

  const curatedDocs = CURATED_STOPS.map((s) => {
    const sl = slugify(s.name);
    usedSlugs.add(sl);
    curatedCoords.push({ lon: s.lng, lat: s.lat });
    return {
      name: s.name,
      slug: sl,
      location: { type: "Point" as const, coordinates: [s.lng, s.lat] },
      areaName: s.area,
      isVerified: true,
      metadata: {
        popularityScore: Math.floor(Math.random() * 80) + 20,
        usageCount: Math.floor(Math.random() * 5000) + 100,
      },
    };
  });

  const insertedCurated = await StopModel.insertMany(curatedDocs, { ordered: false });
  for (let i = 0; i < insertedCurated.length; i++) {
    stopDocMap.set(CURATED_STOPS[i].name, insertedCurated[i]._id as mongoose.Types.ObjectId);
  }
  console.log(`✅ ${insertedCurated.length} curated stops inserted\n`);

  // ── 5. INSERT OSM STOPS (deduplicated against curated) ────────────────────
  const osmStopDocs: any[] = [];
  const osmNodeToMongoId = new Map<number, mongoose.Types.ObjectId>();
  const slugToNodeId = new Map<string, number>(); // for post-insert mapping
  let osmSkipped = 0;

  for (const [, node] of osmStops) {
    const rawName = (node.tags.name || "").trim();
    if (!rawName) continue;
    const sl = slugify(rawName);
    if (!sl || usedSlugs.has(sl)) { osmSkipped++; continue; }

    // Skip if too close to a curated stop (within PROXIMITY_DEDUP_M)
    let tooClose = false;
    for (const c of curatedCoords) {
      if (haversineM(node.lon, node.lat, c.lon, c.lat) < PROXIMITY_DEDUP_M) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) { osmSkipped++; continue; }

    usedSlugs.add(sl);
    slugToNodeId.set(sl, node.id);
    osmStopDocs.push({
      name: rawName,
      slug: sl,
      location: { type: "Point" as const, coordinates: [node.lon, node.lat] },
      areaName: getArea(node.lat, node.lon),
      aliases: [node.tags.alt_name, node.tags["name:en"]].filter(Boolean),
      isVerified: false, // OSM nodes start unverified
      metadata: {
        popularityScore: Math.floor(Math.random() * 40) + 5,
        usageCount: Math.floor(Math.random() * 500) + 10,
      },
    });
  }

  console.log(`📍 Inserting ${osmStopDocs.length} OSM stops (${osmSkipped} deduplicated)...`);
  const insertedOsmStops = await StopModel.insertMany(osmStopDocs, { ordered: false });

  // Map OSM node IDs → mongo IDs via slug (robust against ordered:false failures)
  for (const doc of insertedOsmStops) {
    const nodeId = slugToNodeId.get(doc.slug);
    if (nodeId !== undefined) {
      osmNodeToMongoId.set(nodeId, doc._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`✅ ${insertedOsmStops.length} OSM stops inserted\n`);

  // ── 6. INSERT CURATED ROUTES ──────────────────────────────────────────────
  console.log(`🚌 Inserting ${CURATED_ROUTES.length} curated routes...`);
  const insertedRouteIds: mongoose.Types.ObjectId[] = [];
  const stopRouteMap = new Map<string, mongoose.Types.ObjectId[]>();

  const routeDocs: any[] = [];
  const routeStopLists: mongoose.Types.ObjectId[][] = [];

  for (const tmpl of CURATED_ROUTES) {
    const resolved = tmpl.stopNames
      .map((n) => stopDocMap.get(n))
      .filter(Boolean) as mongoose.Types.ObjectId[];
    if (resolved.length < 3) {
      console.warn(`  ⚠  Skipping "${tmpl.name}" — only ${resolved.length} stops resolved`);
      continue;
    }

    const seq = resolved.map((sid, i) => ({
      stop: sid,
      order: i + 1,
      estimatedFare: tmpl.fares[i] ?? 200,
      averageTravelTimeToNext: tmpl.times[i] ?? 180,
    }));

    routeDocs.push({
      name: tmpl.name,
      originStop: resolved[0],
      destinationStop: resolved[resolved.length - 1],
      stopsSequence: seq,
      routeType: tmpl.type,
      isActive: true,
      reliabilityScore: Math.floor(Math.random() * 30) + 70,
      tags: tmpl.tags,
    });
    routeStopLists.push(resolved);
  }

  const insertedRoutes = await RouteModel.insertMany(routeDocs, { ordered: false });
  for (let ri = 0; ri < insertedRoutes.length; ri++) {
    const rid = insertedRoutes[ri]._id as mongoose.Types.ObjectId;
    insertedRouteIds.push(rid);
    for (const sid of routeStopLists[ri]) {
      const key = sid.toString();
      if (!stopRouteMap.has(key)) stopRouteMap.set(key, []);
      stopRouteMap.get(key)!.push(rid);
    }
  }
  console.log(`✅ ${insertedRoutes.length} curated routes inserted\n`);

  // ── 7. BUILD ROUTES FROM OSM RELATIONS ────────────────────────────────────
  console.log(`🚌 Building routes from ${osmRouteRelations.length} OSM relations...`);

  // We need coordinates for all stops (curated + osm) for fare/time estimation
  const allStopCoords = new Map<string, [number, number]>(); // mongoId.toString() → [lon, lat]
  const rawAllStops = await StopModel.find({}, { _id: 1, location: 1 }).lean();
  for (const s of rawAllStops) {
    allStopCoords.set(s._id.toString(), s.location.coordinates as [number, number]);
  }

  let osmRoutesInserted = 0;
  const osmRouteDocs: any[] = [];
  const osmRouteStopLists: mongoose.Types.ObjectId[][] = [];
  const seenRelations = new Set<string>();

  for (const rel of osmRouteRelations) {
    const relKey = rel.id.toString();
    if (seenRelations.has(relKey)) continue;
    seenRelations.add(relKey);

    // Collect stop members in order (role=stop or empty-role node that is a known stop)
    const stopMemberIds: number[] = [];
    for (const m of rel.members) {
      if (m.type !== "node") continue;
      if (["stop", "stop_entry_only", "stop_exit_only", ""].includes(m.role)) {
        if (osmNodeToMongoId.has(m.id)) {
          stopMemberIds.push(m.id);
        }
      }
    }

    // Resolve to mongo IDs
    const resolvedIds: mongoose.Types.ObjectId[] = [];
    for (const nid of stopMemberIds) {
      const mid = osmNodeToMongoId.get(nid);
      if (mid) resolvedIds.push(mid);
    }

    if (resolvedIds.length < 3) continue;

    // Remove consecutive duplicates
    const dedupedIds = resolvedIds.filter((id, i) =>
      i === 0 || id.toString() !== resolvedIds[i - 1].toString(),
    );
    if (dedupedIds.length < 3) continue;

    const routeName =
      rel.tags.name ||
      rel.tags.ref ||
      `OSM Route ${rel.id}`;

    // Build sequence with fare/time estimates
    let cumDist = 0;
    const seq = dedupedIds.map((sid, i) => {
      let travelTime = 180;
      let fare = 0;
      if (i > 0) {
        const prevCoords = allStopCoords.get(dedupedIds[i - 1].toString());
        const currCoords = allStopCoords.get(sid.toString());
        if (prevCoords && currCoords) {
          const distM = haversineM(prevCoords[0], prevCoords[1], currCoords[0], currCoords[1]);
          cumDist += distM;
          travelTime = estimateTravelTime(distM);
          fare = estimateFare(cumDist);
        }
      }
      return { stop: sid, order: i + 1, estimatedFare: fare, averageTravelTimeToNext: travelTime };
    });

    const tags: string[] = [rel.tags.route || "bus", rel.tags.network, rel.tags.operator, rel.tags.ref]
      .filter(Boolean)
      .map((t) => t!.toLowerCase().replace(/\s+/g, "-"));

    osmRouteDocs.push({
      name: routeName,
      originStop: dedupedIds[0],
      destinationStop: dedupedIds[dedupedIds.length - 1],
      stopsSequence: seq,
      routeType: RouteType.DIRECT,
      isActive: true,
      reliabilityScore: Math.floor(Math.random() * 25) + 50,
      tags,
    });
    osmRouteStopLists.push(dedupedIds);
    osmRoutesInserted++;
  }

  if (osmRouteDocs.length > 0) {
    const insertedOsmRoutes = await RouteModel.insertMany(osmRouteDocs, { ordered: false });
    for (let ri = 0; ri < insertedOsmRoutes.length; ri++) {
      const rid = insertedOsmRoutes[ri]._id as mongoose.Types.ObjectId;
      insertedRouteIds.push(rid);
      for (const sid of osmRouteStopLists[ri]) {
        const key = sid.toString();
        if (!stopRouteMap.has(key)) stopRouteMap.set(key, []);
        stopRouteMap.get(key)!.push(rid);
      }
    }
  }
  console.log(`✅ ${osmRoutesInserted} OSM routes inserted\n`);

  // ── 8. LINK STOPS ↔ ROUTES ────────────────────────────────────────────────
  console.log("🔗 Linking stops to routes...");
  const linkOps = Array.from(stopRouteMap.entries()).map(([stopId, rIds]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(stopId) },
      update: { $addToSet: { connectedRoutes: { $each: rIds } } },
    },
  }));
  if (linkOps.length) await StopModel.bulkWrite(linkOps);
  console.log(`✅ Linked ${linkOps.length} stops\n`);

  // ── 9. CURATED TRANSFERS ──────────────────────────────────────────────────
  console.log("🚶 Inserting curated transfers...");
  const seenTransferPairs = new Set<string>();
  const transferDocs: any[] = [];

  for (const t of CURATED_TRANSFERS) {
    const fromId = stopDocMap.get(t.from);
    const toId = stopDocMap.get(t.to);
    if (!fromId || !toId) {
      console.warn(`  ⚠  Transfer skipped: ${t.from} → ${t.to}`);
      continue;
    }
    const pairKey = `${fromId}:${toId}`;
    const revKey = `${toId}:${fromId}`;
    if (!seenTransferPairs.has(pairKey)) {
      seenTransferPairs.add(pairKey);
      seenTransferPairs.add(revKey);
      transferDocs.push(
        { fromStopId: fromId, toStopId: toId, walkingDistance: t.distM, walkingTime: t.walkSecs, isSafe: true },
        { fromStopId: toId, toStopId: fromId, walkingDistance: t.distM, walkingTime: t.walkSecs, isSafe: true },
      );
    }
  }

  // ── 10. AUTO-COMPUTE PROXIMITY TRANSFERS ──────────────────────────────────
  console.log("🚶 Auto-computing proximity transfers (≤ 600 m)...");
  const allStopsFull = await StopModel.find({}, { _id: 1, location: 1, name: 1 }).lean() as StopMinimal[];
  const grid = buildGrid(allStopsFull);
  let autoTransfers = 0;

  for (const stop of allStopsFull) {
    const neighbours = getNeighbours(stop, grid);
    const [lon1, lat1] = stop.location.coordinates;

    for (const nb of neighbours) {
      if (nb._id.toString() === stop._id.toString()) continue;
      const [lon2, lat2] = nb.location.coordinates;
      const distM = haversineM(lon1, lat1, lon2, lat2);
      if (distM > TRANSFER_MAX_M || distM < 10) continue;

      const pairKey = `${stop._id}:${nb._id}`;
      if (seenTransferPairs.has(pairKey)) continue;
      seenTransferPairs.add(pairKey);

      const walkSecs = Math.round(distM / 1.2); // 1.2 m/s walking
      transferDocs.push({
        fromStopId: stop._id,
        toStopId: nb._id,
        walkingDistance: Math.round(distM),
        walkingTime: walkSecs,
        isSafe: true,
      });
      autoTransfers++;
    }
  }

  const insertedTransfers = await TransferModel.insertMany(transferDocs, { ordered: false });
  console.log(`✅ ${insertedTransfers.length} transfers inserted (${CURATED_TRANSFERS.length * 2} curated · ${autoTransfers} proximity-computed)\n`);

  // ── 11. CURATED LANDMARKS ─────────────────────────────────────────────────
  console.log(`🗺  Inserting ${CURATED_LANDMARKS.length} curated landmarks...`);
  const allStopsForLM = await StopModel.find({}, { _id: 1, location: 1 }).lean();

  const landmarkDocs = CURATED_LANDMARKS.map((lm) => {
    const nearby = allStopsForLM
      .filter((s) => {
        const [sLon, sLat] = s.location.coordinates;
        return haversineM(lm.lng, lm.lat, sLon, sLat) <= 500;
      })
      .slice(0, 3)
      .map((s) => s._id);
    return {
      name: lm.name,
      location: { type: "Point" as const, coordinates: [lm.lng, lm.lat] },
      category: lm.cat,
      description: lm.cue,
      associatedStops: nearby,
      cues: [{ text: lm.cue, directionHint: lm.dir }],
      isVerified: true,
    };
  });

  await LandmarkModel.insertMany(landmarkDocs, { ordered: false });
  console.log(`✅ ${landmarkDocs.length} curated landmarks inserted\n`);

  // ── 12. OSM LANDMARKS ─────────────────────────────────────────────────────
  if (osmLandmarks.length > 0) {
    console.log(`🗺  Inserting ${osmLandmarks.length} OSM landmarks...`);
    const osmLandmarkDocs: any[] = [];
    const usedLandmarkSlugs = new Set<string>(CURATED_LANDMARKS.map((l) => slugify(l.name)));

    for (const lm of osmLandmarks) {
      const name = (lm.tags.name || "").trim();
      if (!name || usedLandmarkSlugs.has(slugify(name))) continue;
      usedLandmarkSlugs.add(slugify(name));

      const cat = getLandmarkCat(lm.tags);
      const nearby = allStopsForLM
        .filter((s) => {
          const [sLon, sLat] = s.location.coordinates;
          return haversineM(lm.lon, lm.lat, sLon, sLat) <= 500;
        })
        .slice(0, 3)
        .map((s) => s._id);

      osmLandmarkDocs.push({
        name,
        location: { type: "Point" as const, coordinates: [lm.lon, lm.lat] },
        category: cat,
        description: lm.tags.description || lm.tags["description:en"] || `${lm.tags.amenity || lm.tags.shop || ""} in ${getArea(lm.lat, lm.lon)}`,
        associatedStops: nearby,
        cues: [],
        isVerified: false,
      });
    }

    await LandmarkModel.insertMany(osmLandmarkDocs, { ordered: false });
    console.log(`✅ ${osmLandmarkDocs.length} OSM landmarks inserted\n`);
  }

  // ── 13. USERS ─────────────────────────────────────────────────────────────
  console.log(`👤 Creating ${1 + PASSENGERS.length + DRIVERS.length} users...`);
  const hashedPw = await bcrypt.hash("busly1234", 12);

  const allUserDocs = [
    {
      name: "Busly Admin",
      email: "admin@busly.ng",
      password: hashedPw,
      role: UserRole.ADMIN,
      isVerified: true,
      isFirstLogin: false,
      isOnboarded: true,
      reputationScore: 1000,
    },
    ...PASSENGERS.map((p) => ({
      ...p,
      password: hashedPw,
      role: UserRole.PASSENGER,
      isVerified: true,
      isFirstLogin: false,
      isOnboarded: true,
      reputationScore: Math.floor(Math.random() * 100) + 5,
    })),
    ...DRIVERS.map((d) => ({
      ...d,
      password: hashedPw,
      role: UserRole.DRIVER,
      isVerified: true,
      isFirstLogin: false,
      isOnboarded: true,
      reputationScore: Math.floor(Math.random() * 150) + 50,
    })),
  ];

  const insertedUsers = await UserModel.insertMany(allUserDocs, { ordered: false });
  const adminUser = insertedUsers[0];
  const passengerUsers = insertedUsers.slice(1, 1 + PASSENGERS.length);
  const driverUsers = insertedUsers.slice(1 + PASSENGERS.length);
  console.log(`✅ ${insertedUsers.length} users created\n`);

  // ── 14. DRIVER PROFILES ───────────────────────────────────────────────────
  console.log("🚗 Creating driver profiles...");
  const driverProfileDocs = driverUsers.map((driver, i) => {
    const assignedIds = insertedRouteIds.slice(i * 2, i * 2 + 3).filter(Boolean);
    return {
      user: driver._id,
      assignedRoutes: assignedIds,
      familiarityScores: assignedIds.map((rid) => ({
        route: rid,
        score: Math.floor(Math.random() * 80) + 20,
      })),
      totalTrips: Math.floor(Math.random() * 300) + 10,
    };
  });
  await DriverProfileModel.insertMany(driverProfileDocs, { ordered: false });
  console.log(`✅ ${driverProfileDocs.length} driver profiles created\n`);

  // ── 15. COMMUNITY CONTRIBUTIONS ───────────────────────────────────────────
  console.log("💬 Seeding community contributions...");
  const allLandmarks = await LandmarkModel.find({}, { _id: 1 }).lean();
  const allRoutes = await RouteModel.find({}, { _id: 1 }).lean();
  const contribDocs: any[] = [];

  const approved = [
    { type: ContributionType.STOP, data: { name: "Alapere New Stop", location: { type: "Point", coordinates: [3.3901, 6.5765] }, areaName: "Alapere" }, voter: passengerUsers[1]._id, status: ContributionStatus.APPROVED },
    { type: ContributionType.LANDMARK, data: { name: "Pen Cinema Roundabout", category: "JUNCTION", location: { type: "Point", coordinates: [3.3100, 6.6130] } }, voter: passengerUsers[2]._id, status: ContributionStatus.APPROVED },
    { type: ContributionType.ROUTE, data: { name: "Abule-Egba to Pen Cinema", stops: ["Abule-Egba Terminal", "Iyana-Ipaja Junction", "Pen Cinema Stop"] }, voter: passengerUsers[3]._id, status: ContributionStatus.APPROVED },
    { type: ContributionType.STOP, data: { name: "Oshodi Old Market Stop", location: { type: "Point", coordinates: [3.3470, 6.5615] }, areaName: "Oshodi" }, voter: passengerUsers[4]._id, status: ContributionStatus.APPROVED },
    { type: ContributionType.LANDMARK, data: { name: "Mushin General Hospital", category: "OTHER", location: { type: "Point", coordinates: [3.3550, 6.5408] } }, voter: passengerUsers[5]._id, status: ContributionStatus.APPROVED },
    { type: ContributionType.STOP, data: { name: "Igando Bus Stop", location: { type: "Point", coordinates: [3.2450, 6.5900] }, areaName: "Alimosho" }, voter: passengerUsers[6]._id, status: ContributionStatus.APPROVED },
    { type: ContributionType.LANDMARK, data: { name: "Lagos Island Club", category: "OTHER", location: { type: "Point", coordinates: [3.3920, 6.4540] } }, voter: passengerUsers[7]._id, status: ContributionStatus.APPROVED },
  ];

  const pending = [
    { type: ContributionType.STOP, data: { name: "Agbara Bus Stop", location: { type: "Point", coordinates: [3.2180, 6.4590] }, areaName: "Badagry" }, voter: passengerUsers[8]._id, status: ContributionStatus.PENDING },
    { type: ContributionType.LANDMARK, data: { name: "Epe Fish Market", category: "MARKET", location: { type: "Point", coordinates: [3.9890, 6.5840] } }, voter: passengerUsers[9]._id, status: ContributionStatus.PENDING },
    { type: ContributionType.STOP, data: { name: "Sango Ota Terminal", location: { type: "Point", coordinates: [3.2000, 6.6390] }, areaName: "Sango Ota" }, voter: passengerUsers[10]._id, status: ContributionStatus.PENDING },
    { type: ContributionType.ROUTE, data: { name: "Badagry Town Local", stops: ["Iba Bus Stop", "Alakija Bus Stop", "Trade Fair Complex Stop"] }, voter: passengerUsers[11]._id, status: ContributionStatus.PENDING },
    { type: ContributionType.LANDMARK, data: { name: "Lagos Polo Club", category: "OTHER", location: { type: "Point", coordinates: [3.4320, 6.4500] } }, voter: passengerUsers[12]._id, status: ContributionStatus.PENDING },
  ];

  const rejected = [
    { type: ContributionType.STOP, data: { name: "Wrong Stop Name 1", location: { type: "Point", coordinates: [0, 0] }, areaName: "Unknown" }, status: ContributionStatus.REJECTED },
    { type: ContributionType.LANDMARK, data: { name: "Fake Market", category: "MARKET", location: { type: "Point", coordinates: [3.1, 6.2] } }, status: ContributionStatus.REJECTED },
    { type: ContributionType.STOP, data: { name: "Test Stop", location: { type: "Point", coordinates: [3.3, 6.4] }, areaName: "Test" }, status: ContributionStatus.REJECTED },
  ];

  for (const c of approved) {
    contribDocs.push({
      contributor: passengerUsers[Math.floor(Math.random() * passengerUsers.length)]._id,
      type: c.type,
      proposedData: c.data,
      status: c.status,
      votes: [
        { user: c.voter, vote: VoteType.UP },
        { user: passengerUsers[Math.floor(Math.random() * passengerUsers.length)]._id, vote: VoteType.UP },
        { user: passengerUsers[Math.floor(Math.random() * passengerUsers.length)]._id, vote: VoteType.UP },
      ],
      reviewedBy: adminUser._id,
    });
  }
  for (const c of pending) {
    contribDocs.push({
      contributor: passengerUsers[Math.floor(Math.random() * passengerUsers.length)]._id,
      type: c.type,
      proposedData: c.data,
      status: c.status,
      votes: [
        { user: c.voter, vote: VoteType.UP },
      ],
    });
  }
  for (const c of rejected) {
    contribDocs.push({
      contributor: passengerUsers[Math.floor(Math.random() * passengerUsers.length)]._id,
      type: c.type,
      proposedData: c.data,
      status: c.status,
      votes: [
        { user: passengerUsers[0]._id, vote: VoteType.DOWN },
        { user: passengerUsers[1]._id, vote: VoteType.DOWN },
      ],
      reviewedBy: adminUser._id,
    });
  }

  await ContributionModel.insertMany(contribDocs, { ordered: false });
  console.log(`✅ ${contribDocs.length} contributions seeded\n`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const [stopCount, routeCount, transferCount, landmarkCount, userCount, contribCount] =
    await Promise.all([
      StopModel.countDocuments(),
      RouteModel.countDocuments(),
      TransferModel.countDocuments(),
      LandmarkModel.countDocuments(),
      UserModel.countDocuments(),
      ContributionModel.countDocuments(),
    ]);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🎉  Busly Lagos Heavy Seed — COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  📍 Stops:         ${stopCount}  (${CURATED_STOPS.length} curated + ${insertedOsmStops.length} OSM)`);
  console.log(`  🚌 Routes:        ${routeCount}  (${insertedRoutes.length} curated + ${osmRoutesInserted} OSM)`);
  console.log(`  🚶 Transfers:     ${transferCount}`);
  console.log(`  🗺  Landmarks:     ${landmarkCount}`);
  console.log(`  👤 Users:         ${userCount}  (1 admin · ${PASSENGERS.length} passengers · ${DRIVERS.length} drivers)`);
  console.log(`  💬 Contributions: ${contribCount}`);
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  Admin:     admin@busly.ng      / busly1234");
  console.log("  Driver:    driver.bola@busly.ng / busly1234");
  console.log("  Passenger: amara@busly.ng       / busly1234");
  console.log("═══════════════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error("❌ Heavy seed failed:", err);
  process.exit(1);
});
