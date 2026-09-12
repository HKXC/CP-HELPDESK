import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency_ms = Date.now() - start;
    return NextResponse.json({
      status: "ok",
      db: "connected",
      latency_ms,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[GET /api/health] DB error", e);
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
