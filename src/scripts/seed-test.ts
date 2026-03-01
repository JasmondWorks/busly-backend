import fs from "fs";
import path from "path";
import through from "through2";
// @ts-ignore
import parseOSM from "osm-pbf-parser";

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

    console.log("🎉 PBF Parsing Test completed fully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal Seeding Validation Failure:", err);
    process.exit(1);
  }
};

seedFromOSM();
