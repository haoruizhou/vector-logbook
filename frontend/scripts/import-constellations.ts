// Regenerates src/lib/constellation-lines.ts from the d3-celestial dataset.
//
// Usage:
//   curl -fsSL https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json -o /tmp/constlines.json
//   npx tsx scripts/import-constellations.ts /tmp/constlines.json
//
// Source: https://github.com/ofrohn/d3-celestial (BSD-3-Clause). Each feature's
// MultiLineString vertices are real bright stars in [RA(deg), Dec(deg)]. Edit
// NAMES below to change which constellations are bundled into the pool.

import * as fs from "fs";

const NAMES: Record<string, string> = {
  And: "Andromeda", Aql: "Aquila", Ari: "Aries", Aur: "Auriga", Boo: "Boötes",
  CMa: "Canis Major", Car: "Carina", Cas: "Cassiopeia", Cen: "Centaurus", Cet: "Cetus",
  Cyg: "Cygnus", Eri: "Eridanus", Gem: "Gemini", Leo: "Leo", Ori: "Orion",
  Peg: "Pegasus", Per: "Perseus", Sgr: "Sagittarius", Sco: "Scorpius", Tau: "Taurus",
  UMa: "Ursa Major", Vir: "Virgo", Cnc: "Cancer", Cap: "Capricornus", Cru: "Crux",
  Lyr: "Lyra", CrB: "Corona Borealis", UMi: "Ursa Minor", Dra: "Draco", Aqr: "Aquarius",
};

const src = process.argv[2] ?? "/tmp/constlines.json";
const d = JSON.parse(fs.readFileSync(src, "utf8"));

const out: { name: string; lines: number[][][] }[] = [];
for (const id of Object.keys(NAMES)) {
  const f = d.features.find((x: any) => x.id === id);
  if (!f) {
    console.error("MISSING", id);
    continue;
  }
  const raw =
    f.geometry.type === "MultiLineString"
      ? f.geometry.coordinates
      : [f.geometry.coordinates];
  const lines = raw.map((ln: number[][]) =>
    ln.map(([ra, dec]) => [Math.round(ra * 100) / 100, Math.round(dec * 100) / 100]),
  );
  out.push({ name: NAMES[id], lines });
}

const header =
  `// AUTO-GENERATED from the d3-celestial constellation-lines dataset\n` +
  `// (https://github.com/ofrohn/d3-celestial, data/constellations.lines.json).\n` +
  `// Each constellation is a set of polylines whose vertices are real bright\n` +
  `// stars, in [RA(deg), Dec(deg)]. Regenerate with scripts/import-constellations.ts.\n\n` +
  `export interface ConstellationData {\n  name: string;\n  lines: number[][][]; // polylines of [ra, dec] in degrees\n}\n\n` +
  `export const CONSTELLATION_DATA: ConstellationData[] = `;

fs.writeFileSync(
  new URL("../src/lib/constellation-lines.ts", import.meta.url),
  header + JSON.stringify(out, null, 0) + ";\n",
);
console.log("wrote", out.length, "constellations");
