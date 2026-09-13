import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    // Least-privilege: full user list is ADMIN-only.
    // TECH/ADMIN may list TECH+ADMIN for assignment dropdowns.
    const isStaffList = role === "TECH" || role === "ADMIN";
    if (!isStaffList && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isStaffList && session.role !== "ADMIN" && session.role !== "TECH") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: Record<string, string> = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where: where as never,
      select: { id: true, name: true, email: true, role: true, department: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch (e) {
    return handleApiError(e);
  }
}
