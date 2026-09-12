import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(e: unknown) {
  const err = e as Error & { status?: number; code?: string };
  // Prisma P2025 = record not found
  if (err.code === "P2025") return jsonError("Not found", 404);
  // Optimistic locking failure P2025 also or version mismatch
  if (err.message?.includes("Record to update does not exist")) {
    return jsonError("Data was modified by another user. Please refresh.", 409);
  }
  if (err.status === 401) return jsonError("Unauthorized", 401);
  if (err.status === 403) return jsonError("Forbidden", 403);
  if (err.status === 400) return jsonError(err.message || "Bad request", 400);
  console.error("[API Error]", err);
  return jsonError(err.message || "Internal server error", 500);
}
