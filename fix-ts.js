const fs = require("fs");
const path = require("path");

const tsFiles = [
  "src/modules/cities/city.controller.ts",
  "src/modules/contributions/contribution.controller.ts",
  "src/modules/landmarks/landmark.controller.ts",
  "src/modules/routes/route.controller.ts",
  "src/modules/stops/stop.controller.ts",
  "src/modules/transfers/transfer.controller.ts",
];

for (const file of tsFiles) {
  const fullPath = path.join(__dirname, file);
  let content = fs.readFileSync(fullPath, "utf8");
  content = content.replace(
    /req\.params\.([a-zA-Z0-9_]+)/g,
    "(req.params.$1 as string)",
  );
  fs.writeFileSync(fullPath, content);
}

const services = [
  {
    file: "src/modules/contributions/contribution.service.ts",
    model: "IContribution",
  },
  { file: "src/modules/landmarks/landmark.service.ts", model: "ILandmark" },
  { file: "src/modules/routes/route.service.ts", model: "IRoute" },
  { file: "src/modules/stops/stop.service.ts", model: "IStop" },
  { file: "src/modules/transfers/transfer.service.ts", model: "ITransfer" },
];

for (const svc of services) {
  const fullPath = path.join(__dirname, svc.file);
  let content = fs.readFileSync(fullPath, "utf8");
  if (svc.file.includes("route.service")) {
    content = content.replace(
      /this\.routeRepo\.create\(data\)/g,
      "this.routeRepo.create(data as unknown as Partial<IRoute>)",
    );
    content = content.replace(
      /this\.variantRepo\.create\(data\)/g,
      "this.variantRepo.create(data as unknown as Partial<IRouteVariant>)",
    );
    content = content.replace(
      /this\.sequenceRepo\.create\(data\)/g,
      "this.sequenceRepo.create(data as unknown as Partial<IRouteStopSequence>)",
    );
  } else if (svc.file.includes("contribution.service")) {
    content = content.replace(
      /this\.repo\.create\(\{ \.\.\.data, userId \}\)/g,
      `this.repo.create({ ...data, userId } as unknown as Partial<IContribution>)`,
    );
  } else {
    content = content.replace(
      /this\.repo\.create\(data\)/g,
      `this.repo.create(data as unknown as Partial<${svc.model}>)`,
    );
  }
  fs.writeFileSync(fullPath, content);
}

// Fixed auth middleware import
let ctrlPath = path.join(
  __dirname,
  "src/modules/contributions/contribution.controller.ts",
);
let ctrlContent = fs.readFileSync(ctrlPath, "utf8");
ctrlContent = ctrlContent.replace(/AuthenticatedRequest/g, "AuthRequest");
fs.writeFileSync(ctrlPath, ctrlContent);

// Fix graph-builder relative imports
let gbPath = path.join(
  __dirname,
  "src/modules/journeys/utils/graph-builder.ts",
);
let gbContent = fs.readFileSync(gbPath, "utf8");
gbContent = gbContent.replace(/\"\.\.\/stops\//g, '"../../stops/');
gbContent = gbContent.replace(/\"\.\.\/routes\//g, '"../../routes/');
gbContent = gbContent.replace(/\"\.\.\/transfers\//g, '"../../transfers/');
fs.writeFileSync(gbPath, gbContent);

console.log("Fixed typescript issues");
