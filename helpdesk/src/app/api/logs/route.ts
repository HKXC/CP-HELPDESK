import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
        include: { actor: { select: { name: true, email: true } } },
      }),
      prisma.activityLog.count(),
    ]);

    return NextResponse.json({ logs, total, limit, offset });
  } catch (e) {
    return handleApiError(e);
  }
}
