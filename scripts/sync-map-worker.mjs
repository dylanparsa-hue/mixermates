import { cpSync, mkdirSync, readFileSync } from "node:fs";
const root = "node_modules/maplibre-gl";
const version = JSON.parse(readFileSync(root + "/package.json", "utf8")).version;
if (version !== "6.4.1") throw Error("Review the map worker path before changing MapLibre versions.");
const target = "public/vendor/maplibre-" + version;
mkdirSync(target, { recursive: true });
for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
  cpSync(root + "/dist/" + name, target + "/" + name);
cpSync(root + "/LICENSE.txt", target + "/LICENSE.txt");
