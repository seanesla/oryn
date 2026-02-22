import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..", "..");

// Load local env for development/test runs.
// Cloud Run provides environment variables directly, so missing files are fine.
dotenv.config({ path: path.join(pkgRoot, ".env") });
dotenv.config({ path: path.join(pkgRoot, ".env.local"), override: true });
