import { GoogleGenAI } from "@google/genai";

export type GenAiMode = "developer" | "vertex";

export function isVertexMode() {
  return String(process.env.GOOGLE_GENAI_USE_VERTEXAI ?? "").toLowerCase() === "true";
}

export function createGenAiClient(): { ai: GoogleGenAI; mode: GenAiMode } {
  if (isVertexMode()) {
    const project = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION ?? process.env.GCP_REGION;
    if (!project || !location) {
      throw new Error(
        "Vertex AI mode requires GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION (or GCP_PROJECT/GCP_REGION)."
      );
    }
    return {
      ai: new GoogleGenAI({ vertexai: true, project, location }),
      mode: "vertex",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY/GOOGLE_API_KEY (Developer API mode).");
  }
  return {
    ai: new GoogleGenAI({ apiKey }),
    mode: "developer",
  };
}
