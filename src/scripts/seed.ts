/**
 * Busly Master Seed Script
 * Real-world Lagos, Nigeria transport data.
 * Run: npm run seedData
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { StopModel } from "@/modules/stops/stop.model";
import { RouteModel, RouteType } from "@/modules/routes/route.model";
import { LandmarkModel, LandmarkCategory } from "@/modules/landmarks/landmark.model";
import { TransferModel } from "@/modules/transfers/transfer.model";
import { UserModel, UserRole } from "@/modules/user/user.model";
import { DriverProfileModel } from "@/modules/drivers/driver.model";
import { CityModel } from "@/modules/cities/city.model";
import config from "@/config/app.config";

// ─── HELPER ──────────────────────────────────────────────────────────────────

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

// ─── STOP DEFINITIONS (Real GPS coordinates from Lagos, Nigeria) ─────────────

const STOP_DATA = [
  // ── LAGOS ISLAND ──────────────────────────────────────────────────────────
  { name: "TBS (Tafawa Balewa Square)", area: "Lagos Island", lng: 3.3866, lat: 6.4552 },
  { name: "CMS Terminal", area: "Lagos Island", lng: 3.3883, lat: 6.4510 },
  { name: "Marina Bus Stop", area: "Lagos Island", lng: 3.3940, lat: 6.4541 },
  { name: "Apongbon", area: "Lagos Island", lng: 3.3821, lat: 6.4534 },
  { name: "Idumota", area: "Lagos Island", lng: 3.3936, lat: 6.4572 },
  { name: "Ojo Alaba (Island)", area: "Lagos Island", lng: 3.3989, lat: 6.4584 },
  { name: "National Theatre Bus Stop", area: "Lagos Island", lng: 3.3714, lat: 6.4534 },
  { name: "Ijora Causeway", area: "Lagos Island", lng: 3.3634, lat: 6.4556 },

  // ── OBALENDE / IKOYI ──────────────────────────────────────────────────────
  { name: "Obalende Terminal", area: "Obalende", lng: 3.4248, lat: 6.4544 },
  { name: "Falomo Roundabout", area: "Ikoyi", lng: 3.4290, lat: 6.4476 },
  { name: "Ikoyi Club Stop", area: "Ikoyi", lng: 3.4402, lat: 6.4487 },

  // ── VICTORIA ISLAND ───────────────────────────────────────────────────────
  { name: "Victoria Island (Sanusi Fafunwa)", area: "Victoria Island", lng: 3.4161, lat: 6.4280 },
  { name: "Eko Hotel Stop", area: "Victoria Island", lng: 3.4231, lat: 6.4318 },
  { name: "Bar Beach Stop", area: "Victoria Island", lng: 3.4291, lat: 6.4338 },
  { name: "Ahmadu Bello Way", area: "Victoria Island", lng: 3.4144, lat: 6.4290 },
  { name: "Bonny Camp", area: "Victoria Island", lng: 3.4152, lat: 6.4325 },

  // ── LEKKI CORRIDOR ────────────────────────────────────────────────────────
  { name: "Lekki Phase 1 Roundabout", area: "Lekki", lng: 3.4713, lat: 6.4483 },
  { name: "Ikate Junction", area: "Lekki", lng: 3.4939, lat: 6.4430 },
  { name: "Chevron Drive", area: "Lekki", lng: 3.5180, lat: 6.4367 },
  { name: "Oral Estate", area: "Lekki", lng: 3.5320, lat: 6.4303 },
  { name: "VGC Junction", area: "Lekki", lng: 3.5421, lat: 6.4278 },
  { name: "Jakande Gate", area: "Ajah", lng: 3.5563, lat: 6.4606 },
  { name: "Ajah Bus Stop", area: "Ajah", lng: 3.5664, lat: 6.4682 },
  { name: "Abraham Adesanya", area: "Ajah", lng: 3.5804, lat: 6.4742 },
  { name: "Sangotedo", area: "Ajah", lng: 3.5912, lat: 6.4814 },

  // ── MAINLAND: OYINGBO / IDDO ──────────────────────────────────────────────
  { name: "Oyingbo Terminal", area: "Mainland", lng: 3.3779, lat: 6.4822 },
  { name: "Iddo Terminal", area: "Iddo", lng: 3.3714, lat: 6.4694 },
  { name: "Costain Bus Stop", area: "Mainland", lng: 3.3663, lat: 6.4812 },

  // ── YABA ──────────────────────────────────────────────────────────────────
  { name: "Yaba Bus Stop", area: "Yaba", lng: 3.3776, lat: 6.5055 },
  { name: "Tejuosho Market Stop", area: "Yaba", lng: 3.3720, lat: 6.5065 },
  { name: "Herbert Macaulay Way", area: "Yaba", lng: 3.3734, lat: 6.5135 },
  { name: "Jibowu Junction", area: "Yaba", lng: 3.3690, lat: 6.5030 },
  { name: "Palm Avenue", area: "Yaba", lng: 3.3637, lat: 6.5072 },

  // ── SURULERE / OJUELEGBA ──────────────────────────────────────────────────
  { name: "Ojuelegba Bus Stop", area: "Surulere", lng: 3.3616, lat: 6.5092 },
  { name: "Surulere Stadium Stop", area: "Surulere", lng: 3.3614, lat: 6.5040 },
  { name: "Aguda Bus Stop", area: "Surulere", lng: 3.3541, lat: 6.5149 },
  { name: "Itire Junction", area: "Surulere", lng: 3.3494, lat: 6.5098 },
  { name: "Ijesha Bus Stop", area: "Surulere", lng: 3.3427, lat: 6.5026 },

  // ── MUSHIN ────────────────────────────────────────────────────────────────
  { name: "Mushin Bus Stop", area: "Mushin", lng: 3.3539, lat: 6.5406 },
  { name: "Ojuwoye Junction", area: "Mushin", lng: 3.3539, lat: 6.5534 },
  { name: "Cele Ijesa (Mushin)", area: "Mushin", lng: 3.3599, lat: 6.5302 },
  { name: "Papa Ajao", area: "Mushin", lng: 3.3618, lat: 6.5446 },

  // ── OSHODI ────────────────────────────────────────────────────────────────
  { name: "Oshodi Terminal 1", area: "Oshodi", lng: 3.3441, lat: 6.5567 },
  { name: "Oshodi Terminal 2", area: "Oshodi", lng: 3.3453, lat: 6.5585 },
  { name: "Oshodi Underbridge", area: "Oshodi", lng: 3.3466, lat: 6.5602 },
  { name: "Ladipo Stop", area: "Oshodi", lng: 3.3492, lat: 6.5643 },

  // ── BRT CORRIDOR (Fadeyi → Anthony) ───────────────────────────────────────
  { name: "Fadeyi BRT Stop", area: "Lagos Mainland", lng: 3.3655, lat: 6.5449 },
  { name: "Onipanu BRT Stop", area: "Lagos Mainland", lng: 3.3718, lat: 6.5513 },
  { name: "Palmgroove BRT Stop", area: "Lagos Mainland", lng: 3.3773, lat: 6.5602 },
  { name: "Anthony BRT Stop", area: "Anthony", lng: 3.3697, lat: 6.5712 },

  // ── MARYLAND / GBAGADA ───────────────────────────────────────────────────
  { name: "Maryland Bus Stop", area: "Maryland", lng: 3.3554, lat: 6.5703 },
  { name: "Gbagada Phase 1", area: "Gbagada", lng: 3.3918, lat: 6.5462 },
  { name: "Iyana Oworo", area: "Gbagada", lng: 3.3897, lat: 6.5225 },

  // ── OJOTA / KETU ─────────────────────────────────────────────────────────
  { name: "Ojota Terminal", area: "Ojota", lng: 3.3827, lat: 6.5883 },
  { name: "Ketu Bus Stop", area: "Ketu", lng: 3.3836, lat: 6.6142 },
  { name: "Mile 12 Terminal", area: "Mile 12", lng: 3.3921, lat: 6.6052 },

  // ── IKEJA ─────────────────────────────────────────────────────────────────
  { name: "Ikeja Bus Stop", area: "Ikeja", lng: 3.3386, lat: 6.6014 },
  { name: "Alausa Secretariat", area: "Ikeja", lng: 3.3484, lat: 6.6010 },
  { name: "Computer Village", area: "Ikeja", lng: 3.3458, lat: 6.5968 },
  { name: "Ikeja Under Bridge", area: "Ikeja", lng: 3.3371, lat: 6.5949 },
  { name: "Shogunle Stop", area: "Ikeja", lng: 3.3401, lat: 6.5742 },

  // ── BERGER / OGBA / AGEGE ─────────────────────────────────────────────────
  { name: "Berger Bus Stop", area: "Berger", lng: 3.3547, lat: 6.6342 },
  { name: "Ogba Junction", area: "Ogba", lng: 3.3273, lat: 6.6198 },
  { name: "Agege Motor Road", area: "Agege", lng: 3.3194, lat: 6.6207 },
  { name: "Dopemu Junction", area: "Agege", lng: 3.3263, lat: 6.5803 },

  // ── FESTAC / MILE 2 ────────────────────────────────────────────────────────
  { name: "Mile 2 Bus Stop", area: "Mile 2", lng: 3.3200, lat: 6.4833 },
  { name: "Festac Town Gate", area: "Festac", lng: 3.2796, lat: 6.4774 },
  { name: "Satellite Town Terminal", area: "Satellite Town", lng: 3.2623, lat: 6.4672 },
  { name: "Ojo Bus Stop", area: "Ojo", lng: 3.2994, lat: 6.4675 },
  { name: "Volks Bus Stop", area: "Ijegun", lng: 3.3174, lat: 6.4858 },

  // ── IKORODU ───────────────────────────────────────────────────────────────
  { name: "Ikorodu Terminal", area: "Ikorodu", lng: 3.5059, lat: 6.5867 },
  { name: "Benson Bus Stop", area: "Ikorodu", lng: 3.5009, lat: 6.5828 },
  { name: "Oworo Terminal", area: "Oworo", lng: 3.3947, lat: 6.5237 },

  // ── ADDITIONAL MAINLAND ───────────────────────────────────────────────────
  { name: "Adeniji-Adele Stop", area: "Lagos Island", lng: 3.3803, lat: 6.4894 },
  { name: "Ojota Ikorodu Road", area: "Ojota", lng: 3.3756, lat: 6.5927 },
  { name: "Iyana-Ipaja Junction", area: "Agege", lng: 3.2852, lat: 6.6000 },
  { name: "Abule-Egba Terminal", area: "Abule-Egba", lng: 3.2696, lat: 6.6372 },
];

// ─── LANDMARK DEFINITIONS ────────────────────────────────────────────────────

const LANDMARK_DATA = [
  // Bridges
  { name: "Eko Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.3660, lat: 6.4613, cue: "The major overhead bridge connecting Lagos Island to the mainland. Alight just before the bridge if going to Apongbon.", dir: "Cross towards mainland" },
  { name: "Carter Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.3700, lat: 6.4660, cue: "Old colonial bridge. Drop here for Iddo terminal access.", dir: "Walk towards the water" },
  { name: "Third Mainland Bridge (Entrance)", cat: LandmarkCategory.BRIDGE, lng: 3.3940, lat: 6.4700, cue: "Longest bridge in Nigeria connecting Island to Oworo. If you see the bridge overhead, Adeniji stop is next.", dir: "Stay on the bus until after the bridge approach" },
  { name: "Lekki-Ikoyi Link Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.4432, lat: 6.4450, cue: "Toll bridge connecting Ikoyi to Lekki. Buses do not cross — take a private vehicle.", dir: "Take Falomo roundabout bus if avoiding toll" },
  { name: "Ijora Bridge", cat: LandmarkCategory.BRIDGE, lng: 3.3610, lat: 6.4600, cue: "Small bridge between Lagos Island and Ijora. Visible from the National Theatre stop.", dir: "Bridge to your left after National Theatre" },

  // Markets
  { name: "Balogun Market", cat: LandmarkCategory.MARKET, lng: 3.3930, lat: 6.4560, cue: "Largest open market on Lagos Island. Very crowded. Alight at Idumota if heading here.", dir: "Market is on both sides of the road — look for the fabric sellers" },
  { name: "Tejuosho Market (Yaba)", cat: LandmarkCategory.MARKET, lng: 3.3710, lat: 6.5055, cue: "Modern market in Yaba. Good landmark for Tejuosho Stop.", dir: "Drop at Tejuosho Stop. Market is immediately to your right." },
  { name: "Oshodi International Market", cat: LandmarkCategory.MARKET, lng: 3.3455, lat: 6.5599, cue: "Massive textile and secondhand market at Oshodi. Used as navigation anchor for Oshodi Terminal 1.", dir: "Walk under the bridge through the stalls" },
  { name: "Computer Village Ikeja", cat: LandmarkCategory.MARKET, lng: 3.3460, lat: 6.5975, cue: "Largest tech/electronics market in West Africa. Drop at Computer Village stop.", dir: "Enter from the Awolowo Way side for electronics" },
  { name: "Ladipo Spare Parts Market", cat: LandmarkCategory.MARKET, lng: 3.3500, lat: 6.5651, cue: "Auto spare parts market near Oshodi. Very large. Drop at Ladipo stop.", dir: "Market visible from bus — rows of car parts stalls" },
  { name: "Mile 12 International Market", cat: LandmarkCategory.MARKET, lng: 3.3925, lat: 6.6060, cue: "Largest food/vegetable wholesale market in Lagos. Terminal is right beside it.", dir: "Alight at Mile 12 Terminal. Market is to the left." },
  { name: "Ketu Market", cat: LandmarkCategory.MARKET, lng: 3.3840, lat: 6.6148, cue: "Food market in Ketu area. Useful navigation landmark at Ketu stop.", dir: "Market stalls visible on right side as bus approaches Ketu" },
  { name: "Aguda Market (Surulere)", cat: LandmarkCategory.MARKET, lng: 3.3535, lat: 6.5156, cue: "Local market near Aguda stop.", dir: "Small covered market — drop at Aguda junction" },
  { name: "Festac Town Market", cat: LandmarkCategory.MARKET, lng: 3.2800, lat: 6.4780, cue: "Main market inside Festac estate.", dir: "Enter from the 24 Road gate" },

  // Junctions
  { name: "Ojuelegba Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3616, lat: 6.5092, cue: "Major interchange connecting Surulere, Yaba, Mushin and Oshodi routes. Buses stop on all four corners.", dir: "Get off at the Texaco filling station side for Yaba buses" },
  { name: "Cele Ijesa Junction (Mushin)", cat: LandmarkCategory.JUNCTION, lng: 3.3599, lat: 6.5302, cue: "Key intersection. Buses to Oshodi and Surulere branch here.", dir: "Left turn for Oshodi, right for Aguda" },
  { name: "Oshodi Underbridge Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3466, lat: 6.5602, cue: "Major bus aggregation under the Oshodi expressway bridge. All directions from here.", dir: "Walk east under the bridge for Ikeja buses; stay near Terminal 1 for BRT" },
  { name: "Ikeja Underbridge", cat: LandmarkCategory.JUNCTION, lng: 3.3371, lat: 6.5949, cue: "Landmark junction beneath Ikeja flyover. Interchange for Agege, Oshodi and Berger routes.", dir: "Take left lane for Computer Village; right for Shogunle" },
  { name: "Ojota Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3827, lat: 6.5883, cue: "Key junction where Lagos-Ibadan Expressway meets Ikorodu Road. Terminus for many mainland routes.", dir: "Cross overhead bridge for buses towards Mile 12" },
  { name: "Toll Gate (Lekki)", cat: LandmarkCategory.JUNCTION, lng: 3.5280, lat: 6.4335, cue: "Lekki toll plaza on the expressway. Major checkpoint. Buses stop briefly here.", dir: "After toll gate, next stop is VGC Junction" },
  { name: "Jakande Junction (Ajah)", cat: LandmarkCategory.JUNCTION, lng: 3.5563, lat: 6.4606, cue: "Busy junction at Ajah. Interchange for Abraham Adesanya and Ibeju-Lekki directions.", dir: "Right turn for Abraham Adesanya; left for Sangotedo" },
  { name: "Apongbon Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3821, lat: 6.4534, cue: "Key junction at the approach to Eko Bridge from Lagos Island. Danfo stop here.", dir: "Look for the overhead Eko Bridge ramp" },
  { name: "Adeniji Bus Stop Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3803, lat: 6.4894, cue: "Junction where CMS routes split towards Oyingbo and Iddo terminal.", dir: "Keep left for Oyingbo, right for Iddo" },
  { name: "Berger Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3547, lat: 6.6342, cue: "Major northbound interchange. Buses here go to Ibadan, Sagamu and airport routes.", dir: "Stay at the covered bus stop; do not wander into the express lane" },
  { name: "Iyana-Ipaja Junction", cat: LandmarkCategory.JUNCTION, lng: 3.2852, lat: 6.6000, cue: "Key junction in Agege/Alimosho. Very busy. Multiple routes stop here.", dir: "Follow road markings — blue signs point to Lagos Airport" },
  { name: "Yaba-Herbert Macaulay Junction", cat: LandmarkCategory.JUNCTION, lng: 3.3734, lat: 6.5135, cue: "Junction between Herbert Macaulay Way and Yaba Road. BRT buses stop just ahead.", dir: "Continue straight for Jibowu; right for UNILAG gate" },

  // Schools / Landmarks
  { name: "University of Lagos (UNILAG) Gate", cat: LandmarkCategory.SCHOOL, lng: 3.3914, lat: 6.5187, cue: "UNILAG main gate. Drop at Herbert Macaulay junction then walk 5 mins.", dir: "Blue gate visible from road" },
  { name: "Lagos State University (LASU) Gate", cat: LandmarkCategory.SCHOOL, lng: 3.2556, lat: 6.5145, cue: "LASU main entrance. Drop at Ojo junction.", dir: "Gate is along the Badagry Expressway" },
  { name: "King's College Lagos", cat: LandmarkCategory.SCHOOL, lng: 3.3862, lat: 6.4565, cue: "Historic school on Lagos Island. Near TBS stop.", dir: "Red building visible from TBS bus stop" },
  { name: "Yaba College of Technology", cat: LandmarkCategory.SCHOOL, lng: 3.3753, lat: 6.5044, cue: "YABATECH main gate. Drop at Yaba bus stop, walk 3 mins north.", dir: "Follow students' path from the bus stop" },
  { name: "National Theatre (Landmark)", cat: LandmarkCategory.OTHER, lng: 3.3714, lat: 6.4534, cue: "Iconic angular building visible from far. Drop at National Theatre stop.", dir: "Building is unmistakable — helmet shape" },
  { name: "Murtala Muhammed Airport (Domestic Terminal)", cat: LandmarkCategory.OTHER, lng: 3.3213, lat: 6.5791, cue: "Domestic airport terminal. Drop at Shogunle stop or take airport taxi.", dir: "Airport signs visible from Ikeja Underbridge junction" },
  { name: "Lagos Island General Hospital", cat: LandmarkCategory.OTHER, lng: 3.3921, lat: 6.4571, cue: "Major hospital on Lagos Island. Drop at Idumota or Marina.", dir: "White compound with emergency signage" },
  { name: "Rowe Park (Yaba)", cat: LandmarkCategory.OTHER, lng: 3.3762, lat: 6.5035, cue: "Public park and recreation center in Yaba. Useful landmark near Palm Avenue stop.", dir: "Green park visible from the road" },
];

// ─── ROUTE DEFINITIONS ───────────────────────────────────────────────────────

interface RouteTemplate {
  name: string;
  type: RouteType;
  stopNames: string[];
  fares: number[]; // fare from prev stop (index 0 = boarding fare ₦0)
  times: number[]; // seconds to next stop (last element ignored)
  tags: string[];
}

const ROUTE_TEMPLATES: RouteTemplate[] = [
  // ── BRT BLUE LINE: TBS → Mile 12 ──────────────────────────────────────────
  {
    name: "BRT Blue Line — TBS to Mile 12",
    type: RouteType.DIRECT,
    stopNames: [
      "TBS (Tafawa Balewa Square)",
      "National Theatre Bus Stop",
      "Costain Bus Stop",
      "Oyingbo Terminal",
      "Jibowu Junction",
      "Yaba Bus Stop",
      "Fadeyi BRT Stop",
      "Onipanu BRT Stop",
      "Palmgroove BRT Stop",
      "Anthony BRT Stop",
      "Maryland Bus Stop",
      "Ojota Terminal",
      "Ketu Bus Stop",
      "Mile 12 Terminal",
    ],
    fares: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650],
    times: [180, 240, 300, 240, 180, 360, 300, 240, 300, 240, 420, 360, 300, 0],
    tags: ["BRT", "mainland", "express"],
  },

  // ── CMS → AJAH (Lekki Expressway) ─────────────────────────────────────────
  {
    name: "CMS — Lekki — Ajah Express",
    type: RouteType.DIRECT,
    stopNames: [
      "CMS Terminal",
      "Obalende Terminal",
      "Falomo Roundabout",
      "Victoria Island (Sanusi Fafunwa)",
      "Lekki Phase 1 Roundabout",
      "Ikate Junction",
      "Chevron Drive",
      "Oral Estate",
      "VGC Junction",
      "Jakande Gate",
      "Ajah Bus Stop",
    ],
    fares: [0, 100, 150, 200, 300, 400, 500, 550, 600, 650, 700],
    times: [420, 360, 300, 600, 480, 360, 300, 240, 300, 180, 0],
    tags: ["lekki", "express", "island", "danfo"],
  },

  // ── OSHODI → IKEJA ────────────────────────────────────────────────────────
  {
    name: "Oshodi — Ikeja Direct",
    type: RouteType.DIRECT,
    stopNames: [
      "Oshodi Terminal 1",
      "Oshodi Underbridge",
      "Ladipo Stop",
      "Shogunle Stop",
      "Ikeja Under Bridge",
      "Computer Village",
      "Ikeja Bus Stop",
    ],
    fares: [0, 50, 100, 150, 200, 250, 300],
    times: [120, 180, 240, 300, 180, 120, 0],
    tags: ["ikeja", "oshodi", "danfo"],
  },

  // ── CMS → OYINGBO → YABA ─────────────────────────────────────────────────
  {
    name: "CMS — Oyingbo — Yaba",
    type: RouteType.DIRECT,
    stopNames: [
      "CMS Terminal",
      "Apongbon",
      "Adeniji-Adele Stop",
      "Oyingbo Terminal",
      "Costain Bus Stop",
      "Jibowu Junction",
      "Yaba Bus Stop",
    ],
    fares: [0, 50, 100, 150, 200, 250, 300],
    times: [300, 240, 300, 240, 180, 240, 0],
    tags: ["yaba", "island", "danfo"],
  },

  // ── YABA → OSHODI ─────────────────────────────────────────────────────────
  {
    name: "Yaba — Mushin — Oshodi",
    type: RouteType.DIRECT,
    stopNames: [
      "Yaba Bus Stop",
      "Palm Avenue",
      "Ojuelegba Bus Stop",
      "Cele Ijesa (Mushin)",
      "Mushin Bus Stop",
      "Ojuwoye Junction",
      "Oshodi Terminal 1",
    ],
    fares: [0, 50, 100, 150, 200, 250, 300],
    times: [300, 180, 300, 240, 180, 300, 0],
    tags: ["yaba", "mushin", "oshodi", "danfo"],
  },

  // ── OJOTA → IKORODU ───────────────────────────────────────────────────────
  {
    name: "Ojota — Mile 12 — Ikorodu",
    type: RouteType.DIRECT,
    stopNames: [
      "Ojota Terminal",
      "Ojota Ikorodu Road",
      "Ketu Bus Stop",
      "Mile 12 Terminal",
      "Benson Bus Stop",
      "Ikorodu Terminal",
    ],
    fares: [0, 50, 100, 150, 200, 300],
    times: [240, 300, 240, 420, 300, 0],
    tags: ["ikorodu", "mile12", "ketu"],
  },

  // ── SURULERE → OJUELEGBA → YABA ──────────────────────────────────────────
  {
    name: "Surulere — Ojuelegba — Yaba",
    type: RouteType.DIRECT,
    stopNames: [
      "Aguda Bus Stop",
      "Surulere Stadium Stop",
      "Ojuelegba Bus Stop",
      "Palm Avenue",
      "Tejuosho Market Stop",
      "Yaba Bus Stop",
      "Jibowu Junction",
    ],
    fares: [0, 50, 100, 150, 200, 250, 300],
    times: [240, 180, 300, 240, 180, 180, 0],
    tags: ["surulere", "yaba", "danfo"],
  },

  // ── OSHODI → MARYLAND → OJOTA ─────────────────────────────────────────────
  {
    name: "Oshodi — Anthony — Maryland — Ojota",
    type: RouteType.DIRECT,
    stopNames: [
      "Oshodi Terminal 2",
      "Shogunle Stop",
      "Anthony BRT Stop",
      "Maryland Bus Stop",
      "Ojota Terminal",
    ],
    fares: [0, 100, 200, 300, 400],
    times: [420, 360, 300, 420, 0],
    tags: ["maryland", "oshodi", "ojota"],
  },

  // ── CMS → APONGBON → NATIONAL THEATRE ────────────────────────────────────
  {
    name: "CMS — National Theatre — Costain",
    type: RouteType.DIRECT,
    stopNames: [
      "CMS Terminal",
      "Apongbon",
      "National Theatre Bus Stop",
      "Ijora Causeway",
      "Costain Bus Stop",
    ],
    fares: [0, 50, 100, 150, 200],
    times: [300, 240, 240, 300, 0],
    tags: ["island", "mainland", "national-theatre"],
  },

  // ── MILE 2 → OSHODI (via Volks) ──────────────────────────────────────────
  {
    name: "Mile 2 — Volks — Oshodi",
    type: RouteType.DIRECT,
    stopNames: [
      "Mile 2 Bus Stop",
      "Volks Bus Stop",
      "Cele Ijesa (Mushin)",
      "Mushin Bus Stop",
      "Oshodi Terminal 1",
    ],
    fares: [0, 100, 200, 250, 350],
    times: [420, 480, 360, 300, 0],
    tags: ["mile2", "oshodi", "mushin"],
  },

  // ── IKEJA → BERGER ────────────────────────────────────────────────────────
  {
    name: "Ikeja — Alausa — Berger",
    type: RouteType.DIRECT,
    stopNames: [
      "Ikeja Bus Stop",
      "Alausa Secretariat",
      "Ogba Junction",
      "Berger Bus Stop",
    ],
    fares: [0, 100, 200, 300],
    times: [300, 420, 360, 0],
    tags: ["ikeja", "berger", "ogba"],
  },

  // ── BERGER → MARYLAND → OSHODI ───────────────────────────────────────────
  {
    name: "Berger — Maryland — Anthony — Oshodi",
    type: RouteType.DIRECT,
    stopNames: [
      "Berger Bus Stop",
      "Ojota Terminal",
      "Maryland Bus Stop",
      "Anthony BRT Stop",
      "Shogunle Stop",
      "Oshodi Terminal 2",
    ],
    fares: [0, 100, 200, 300, 400, 500],
    times: [480, 420, 360, 300, 300, 0],
    tags: ["berger", "maryland", "oshodi"],
  },

  // ── FESTAC → MILE 2 → CMS ─────────────────────────────────────────────────
  {
    name: "Festac — Mile 2 — Apongbon — CMS",
    type: RouteType.DIRECT,
    stopNames: [
      "Festac Town Gate",
      "Mile 2 Bus Stop",
      "National Theatre Bus Stop",
      "Apongbon",
      "CMS Terminal",
    ],
    fares: [0, 100, 300, 400, 500],
    times: [480, 600, 360, 300, 0],
    tags: ["festac", "mile2", "cms", "island"],
  },

  // ── CMS → OBALENDE → VI LOOP ──────────────────────────────────────────────
  {
    name: "CMS — Obalende — Victoria Island Loop",
    type: RouteType.DIRECT,
    stopNames: [
      "CMS Terminal",
      "Marina Bus Stop",
      "Obalende Terminal",
      "Falomo Roundabout",
      "Ahmadu Bello Way",
      "Victoria Island (Sanusi Fafunwa)",
      "Bonny Camp",
      "Eko Hotel Stop",
      "Bar Beach Stop",
    ],
    fares: [0, 50, 100, 150, 200, 250, 300, 350, 400],
    times: [300, 360, 300, 240, 180, 240, 180, 240, 0],
    tags: ["island", "vi", "obalende", "loop"],
  },

  // ── VI → LEKKI PHASE 1 → CHEVRON ─────────────────────────────────────────
  {
    name: "Victoria Island — Lekki — Chevron",
    type: RouteType.DIRECT,
    stopNames: [
      "Victoria Island (Sanusi Fafunwa)",
      "Lekki Phase 1 Roundabout",
      "Ikate Junction",
      "Chevron Drive",
    ],
    fares: [0, 200, 300, 400],
    times: [600, 480, 360, 0],
    tags: ["lekki", "vi", "chevron"],
  },

  // ── OJOTA → GBAGADA → OWORO ──────────────────────────────────────────────
  {
    name: "Ojota — Gbagada — Oworo",
    type: RouteType.DIRECT,
    stopNames: [
      "Ojota Terminal",
      "Ojota Ikorodu Road",
      "Gbagada Phase 1",
      "Iyana Oworo",
      "Oworo Terminal",
    ],
    fares: [0, 50, 100, 150, 200],
    times: [300, 360, 300, 240, 0],
    tags: ["gbagada", "ojota", "oworo"],
  },

  // ── OSHODI → DOPEMU → AGEGE ──────────────────────────────────────────────
  {
    name: "Oshodi — Dopemu — Agege",
    type: RouteType.DIRECT,
    stopNames: [
      "Oshodi Terminal 1",
      "Oshodi Underbridge",
      "Dopemu Junction",
      "Agege Motor Road",
      "Iyana-Ipaja Junction",
    ],
    fares: [0, 50, 100, 150, 200],
    times: [180, 300, 420, 360, 0],
    tags: ["oshodi", "agege", "dopemu"],
  },

  // ── SATELLITE TOWN → OJO → FESTAC → MILE 2 ───────────────────────────────
  {
    name: "Satellite Town — Ojo — Festac — Mile 2",
    type: RouteType.DIRECT,
    stopNames: [
      "Satellite Town Terminal",
      "Ojo Bus Stop",
      "Festac Town Gate",
      "Volks Bus Stop",
      "Mile 2 Bus Stop",
    ],
    fares: [0, 100, 200, 300, 400],
    times: [480, 360, 300, 420, 0],
    tags: ["satellite", "ojo", "festac", "mile2"],
  },

  // ── CMS → IDUMOTA → BALOGUN (ISLAND LOCAL) ────────────────────────────────
  {
    name: "CMS — Idumota — Balogun (Island Local)",
    type: RouteType.DIRECT,
    stopNames: [
      "CMS Terminal",
      "Marina Bus Stop",
      "Idumota",
      "Ojo Alaba (Island)",
    ],
    fares: [0, 50, 100, 150],
    times: [180, 180, 240, 0],
    tags: ["island", "local", "balogun", "market"],
  },

  // ── IKEJA → AGEGE ─────────────────────────────────────────────────────────
  {
    name: "Ikeja — Agege Motor Road",
    type: RouteType.DIRECT,
    stopNames: [
      "Ikeja Bus Stop",
      "Ikeja Under Bridge",
      "Dopemu Junction",
      "Agege Motor Road",
    ],
    fares: [0, 100, 200, 300],
    times: [240, 360, 420, 0],
    tags: ["ikeja", "agege"],
  },

  // ── ABULE-EGBA → IYANA-IPAJA → AGEGE ─────────────────────────────────────
  {
    name: "Abule-Egba — Iyana-Ipaja — Agege",
    type: RouteType.DIRECT,
    stopNames: [
      "Abule-Egba Terminal",
      "Iyana-Ipaja Junction",
      "Dopemu Junction",
      "Agege Motor Road",
      "Oshodi Terminal 1",
    ],
    fares: [0, 100, 200, 300, 400],
    times: [480, 360, 420, 480, 0],
    tags: ["abule-egba", "iyana-ipaja", "agege", "oshodi"],
  },
];

// ─── TRANSFER DEFINITIONS (walking connections between stops) ────────────────

interface TransferDef {
  from: string;
  to: string;
  distanceM: number;
  walkSecs: number;
}

const TRANSFER_DATA: TransferDef[] = [
  // Oshodi interchange
  { from: "Oshodi Terminal 1", to: "Oshodi Terminal 2", distanceM: 150, walkSecs: 90 },
  { from: "Oshodi Terminal 1", to: "Ladipo Stop", distanceM: 400, walkSecs: 300 },

  // CMS ↔ TBS
  { from: "CMS Terminal", to: "TBS (Tafawa Balewa Square)", distanceM: 350, walkSecs: 240 },

  // CMS ↔ Marina
  { from: "CMS Terminal", to: "Marina Bus Stop", distanceM: 500, walkSecs: 360 },

  // Obalende ↔ Falomo
  { from: "Obalende Terminal", to: "Falomo Roundabout", distanceM: 600, walkSecs: 420 },

  // VI ↔ Bonny Camp
  { from: "Victoria Island (Sanusi Fafunwa)", to: "Bonny Camp", distanceM: 400, walkSecs: 300 },

  // Ojota interchange
  { from: "Ojota Terminal", to: "Ojota Ikorodu Road", distanceM: 250, walkSecs: 180 },
  { from: "Ojota Terminal", to: "Ketu Bus Stop", distanceM: 2800, walkSecs: 1800 },

  // Maryland ↔ Anthony
  { from: "Maryland Bus Stop", to: "Anthony BRT Stop", distanceM: 1200, walkSecs: 900 },

  // Yaba interchange
  { from: "Yaba Bus Stop", to: "Tejuosho Market Stop", distanceM: 400, walkSecs: 300 },
  { from: "Yaba Bus Stop", to: "Jibowu Junction", distanceM: 500, walkSecs: 360 },

  // Ikeja interchange
  { from: "Ikeja Bus Stop", to: "Computer Village", distanceM: 600, walkSecs: 420 },
  { from: "Ikeja Bus Stop", to: "Alausa Secretariat", distanceM: 800, walkSecs: 540 },

  // Mile 12 ↔ Ketu
  { from: "Mile 12 Terminal", to: "Ketu Bus Stop", distanceM: 900, walkSecs: 660 },

  // Mushin ↔ Cele
  { from: "Mushin Bus Stop", to: "Cele Ijesa (Mushin)", distanceM: 1200, walkSecs: 840 },

  // Lekki Phase 1 ↔ Ajah (long express)
  { from: "Lekki Phase 1 Roundabout", to: "Ajah Bus Stop", distanceM: 8500, walkSecs: 6000 },

  // Surulere ↔ Ojuelegba
  { from: "Surulere Stadium Stop", to: "Ojuelegba Bus Stop", distanceM: 600, walkSecs: 420 },

  // Gbagada ↔ Oworo
  { from: "Gbagada Phase 1", to: "Iyana Oworo", distanceM: 2200, walkSecs: 1500 },

  // Festac ↔ Mile 2
  { from: "Festac Town Gate", to: "Mile 2 Bus Stop", distanceM: 3000, walkSecs: 2100 },
];

// ─── SEEDER ───────────────────────────────────────────────────────────────────

async function seedDatabase() {
  const MONGO_URI = config.db.url || "mongodb://localhost:27017/busly";
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

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
  ]);
  console.log("✅ Collections cleared");

  // ── 2. CITY ───────────────────────────────────────────────────────────────
  await CityModel.create({
    name: "Lagos",
    country: "Nigeria",
    active: true,
  });
  console.log("✅ City: Lagos");

  // ── 3. STOPS ──────────────────────────────────────────────────────────────
  console.log(`📍 Creating ${STOP_DATA.length} stops...`);
  const stopDocMap = new Map<string, mongoose.Types.ObjectId>();

  const stopDocs = STOP_DATA.map((s) => ({
    name: s.name,
    slug: slug(s.name),
    location: { type: "Point" as const, coordinates: [s.lng, s.lat] },
    areaName: s.area,
    isVerified: true,
    metadata: {
      popularityScore: Math.floor(Math.random() * 80) + 20,
      usageCount: Math.floor(Math.random() * 5000) + 100,
    },
  }));

  const insertedStops = await StopModel.insertMany(stopDocs, { ordered: false });
  for (let i = 0; i < insertedStops.length; i++) {
    stopDocMap.set(STOP_DATA[i].name, insertedStops[i]._id as mongoose.Types.ObjectId);
  }
  console.log(`✅ ${stopDocMap.size} stops created`);

  // ── 4. ROUTES ─────────────────────────────────────────────────────────────
  console.log(`🚌 Creating ${ROUTE_TEMPLATES.length} routes...`);
  const routeDocs: any[] = [];
  const resolvedStopsPerRoute: mongoose.Types.ObjectId[][] = [];

  for (const template of ROUTE_TEMPLATES) {
    const resolvedStops = template.stopNames
      .map((name) => stopDocMap.get(name))
      .filter(Boolean) as mongoose.Types.ObjectId[];

    if (resolvedStops.length < 2) {
      console.warn(`  ⚠ Skipping route "${template.name}" — not enough resolved stops`);
      continue;
    }

    const stopsSequence = resolvedStops.map((stopId, i) => ({
      stop: stopId,
      order: i + 1,
      estimatedFare: template.fares[i] ?? 0,
      averageTravelTimeToNext: template.times[i] ?? 180,
    }));

    routeDocs.push({
      name: template.name,
      originStop: resolvedStops[0],
      destinationStop: resolvedStops[resolvedStops.length - 1],
      stopsSequence,
      routeType: template.type,
      isActive: true,
      reliabilityScore: Math.floor(Math.random() * 30) + 70,
      tags: template.tags,
    });
    resolvedStopsPerRoute.push(resolvedStops);
  }

  const insertedRoutes = await RouteModel.insertMany(routeDocs, { ordered: false });
  const routeIds = insertedRoutes.map((r) => r._id as mongoose.Types.ObjectId);
  console.log(`✅ ${routeIds.length} routes created`);

  // Bulk-update stop connectedRoutes
  console.log("🔗 Linking routes to stops...");
  const stopRouteMap = new Map<string, mongoose.Types.ObjectId[]>();
  for (let ri = 0; ri < insertedRoutes.length; ri++) {
    for (const stopId of resolvedStopsPerRoute[ri]) {
      const key = stopId.toString();
      if (!stopRouteMap.has(key)) stopRouteMap.set(key, []);
      stopRouteMap.get(key)!.push(routeIds[ri]);
    }
  }
  const stopUpdateOps = Array.from(stopRouteMap.entries()).map(([stopId, rIds]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(stopId) },
      update: { $addToSet: { connectedRoutes: { $each: rIds } } },
    },
  }));
  if (stopUpdateOps.length) await StopModel.bulkWrite(stopUpdateOps);

  // ── 5. TRANSFERS ──────────────────────────────────────────────────────────
  console.log(`🚶 Creating transfer links...`);
  const transferDocs: any[] = [];

  for (const t of TRANSFER_DATA) {
    const fromId = stopDocMap.get(t.from);
    const toId = stopDocMap.get(t.to);
    if (!fromId || !toId) {
      console.warn(`  ⚠ Transfer skipped: ${t.from} → ${t.to}`);
      continue;
    }
    transferDocs.push({ fromStopId: fromId, toStopId: toId, walkingDistance: t.distanceM, walkingTime: t.walkSecs, isSafe: true });
  }

  const insertedTransfers = await TransferModel.insertMany(transferDocs, { ordered: false });
  console.log(`✅ ${insertedTransfers.length} transfer links created`);

  // ── 6. LANDMARKS ──────────────────────────────────────────────────────────
  console.log(`🗺 Creating ${LANDMARK_DATA.length} landmarks...`);

  // Pre-fetch all stops for local distance computation (avoids N geoNear queries)
  const allStopsForLandmarks = await StopModel.find({}, { _id: 1, location: 1 }).lean();

  const haversineM = (lng1: number, lat1: number, lng2: number, lat2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const landmarkDocs = LANDMARK_DATA.map((lm) => {
    const nearby = allStopsForLandmarks
      .filter((s) => {
        const [slng, slat] = s.location.coordinates;
        return haversineM(lm.lng, lm.lat, slng, slat) <= 500;
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
  console.log(`✅ ${landmarkDocs.length} landmarks created`);

  // ── 7. USERS ──────────────────────────────────────────────────────────────
  console.log("👤 Creating users...");
  const hashedPw = await bcrypt.hash("busly1234", 12);

  const passengerData = [
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
  ];

  const driverData = [
    { name: "Bola Awolowo", email: "driver.bola@busly.ng" },
    { name: "Seun Ogunleye", email: "driver.seun@busly.ng" },
    { name: "Chukwudi Nnaji", email: "driver.chukwudi@busly.ng" },
    { name: "Rasheed Lawal", email: "driver.rasheed@busly.ng" },
    { name: "Emmanuel Obi", email: "driver.emmy@busly.ng" },
    { name: "Akin Babatunde", email: "driver.akin@busly.ng" },
    { name: "Musa Ibrahim", email: "driver.musa@busly.ng" },
    { name: "Victor Ugwu", email: "driver.victor@busly.ng" },
  ];

  const allUserDocs = [
    { name: "Busly Admin", email: "admin@busly.ng", password: hashedPw, role: UserRole.ADMIN, isVerified: true, isFirstLogin: false, isOnboarded: true, reputationScore: 1000 },
    ...passengerData.map((p) => ({ ...p, password: hashedPw, role: UserRole.PASSENGER, isVerified: true, isFirstLogin: false, isOnboarded: true, reputationScore: Math.floor(Math.random() * 50) + 5 })),
    ...driverData.map((d) => ({ ...d, password: hashedPw, role: UserRole.DRIVER, isVerified: true, isFirstLogin: false, isOnboarded: true, reputationScore: Math.floor(Math.random() * 100) + 50 })),
  ];

  const insertedUsers = await UserModel.insertMany(allUserDocs, { ordered: false });
  // Drivers are at the end of insertedUsers
  const driverUsers = insertedUsers.slice(1 + passengerData.length);
  console.log(`✅ ${insertedUsers.length} users created`);

  // ── 8. DRIVER PROFILES ───────────────────────────────────────────────────
  console.log("🚗 Creating driver profiles...");

  const driverProfileDocs = driverUsers.map((driver, i) => {
    const assignedRouteIds = routeIds.slice(i * 2, i * 2 + 3).filter(Boolean);
    return {
      user: driver._id,
      assignedRoutes: assignedRouteIds,
      familiarityScores: assignedRouteIds.map((rid) => ({
        route: rid,
        score: Math.floor(Math.random() * 80) + 20,
      })),
      totalTrips: Math.floor(Math.random() * 200) + 10,
    };
  });

  await DriverProfileModel.insertMany(driverProfileDocs, { ordered: false });
  console.log(`✅ ${driverProfileDocs.length} driver profiles created`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log("\n🎉 Busly Lagos seed complete!");
  console.log(`  Stops:     ${stopDocMap.size}`);
  console.log(`  Routes:    ${routeIds.length}`);
  console.log(`  Transfers: ${insertedTransfers.length}`);
  console.log(`  Landmarks: ${LANDMARK_DATA.length}`);
  console.log(`  Users:     ${insertedUsers.length} (1 admin, ${passengerData.length} passengers, ${driverData.length} drivers)`);
  console.log("\n  Login credentials: admin@busly.ng / busly1234");
  console.log("  Driver login:     driver.bola@busly.ng / busly1234");
  console.log("  Passenger login:  amara@busly.ng / busly1234\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
