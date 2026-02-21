import { createHash } from "node:crypto";

type CachedExtraction = {
  title?: string;
  text: string;
  quotes: string[];
  cachedAtMs: number;
};

function urlToKey(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function isEnabled(): boolean {
  return (
    String(process.env.ORYN_GCS_ENABLE ?? "").toLowerCase() === "true" &&
    Boolean(process.env.ORYN_GCS_BUCKET)
  );
}

let storageModule: any = null;

async function getStorage() {
  if (!isEnabled()) return null;
  if (storageModule) return storageModule;

  try {
    const { Storage } = await import("@google-cloud/storage");
    storageModule = new Storage();
    return storageModule;
  } catch {
    return null;
  }
}

function getBucket() {
  return process.env.ORYN_GCS_BUCKET ?? "";
}

/**
 * Reads a cached extraction from GCS.
 * Returns null if GCS is disabled, the object doesn't exist, or any error occurs.
 */
export async function readCachedExtraction(url: string): Promise<CachedExtraction | null> {
  if (!isEnabled()) return null;

  try {
    const storage = await getStorage();
    if (!storage) return null;

    const key = urlToKey(url);
    const file = storage.bucket(getBucket()).file(`extractions/${key}.json`);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [content] = await file.download();
    return JSON.parse(content.toString()) as CachedExtraction;
  } catch {
    return null;
  }
}

/**
 * Writes an extraction to GCS cache.
 * Silently fails if GCS is disabled or any error occurs.
 */
export async function writeCachedExtraction(
  url: string,
  data: { title?: string; text: string; quotes: string[] },
): Promise<void> {
  if (!isEnabled()) return;

  try {
    const storage = await getStorage();
    if (!storage) return;

    const key = urlToKey(url);
    const file = storage.bucket(getBucket()).file(`extractions/${key}.json`);
    const cached: CachedExtraction = { ...data, cachedAtMs: Date.now() };
    await file.save(JSON.stringify(cached), { contentType: "application/json" });
  } catch {
    // Silently fail - GCS caching is best-effort
  }
}
