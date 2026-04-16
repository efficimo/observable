import { writeFileSync } from "node:fs";

writeFileSync("dist/esm/package.json", JSON.stringify({ type: "module" }));
writeFileSync("dist/cjs/package.json", JSON.stringify({ type: "commonjs" }));
