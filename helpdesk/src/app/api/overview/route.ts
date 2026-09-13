import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Scope: USER sees only own tickets, others see all
    const ticketWhere = session.role === "USER" ? { requester_id: session.id } : {};

    const [total, byStatus, byCategory, recent, overdue] = await Promise.all([
      prisma.ticket.count({ where: ticketWhere }),
      prisma.ticket.groupBy({ by: ["status"], where: ticketWhere, _count: true }),
      prisma.ticket.groupBy({ by: ["category"], where: ticketWhere, _count: true }),
      prisma.ticket.findMany({
        where: ticketWhere,
        orderBy: { created_at: "desc" },
        take: 6,
        include: {
          requester: { select: { name: true } },
          technician: { select: { name: true } },
        },
      }),
      // Overdue if due_at passed and not closed/resolved/cancelled
      prisma.ticket.count({
        where: {
          ...ticketWhere,
          due_at: { lt: new Date() },
          status: { notIn: ["CLOSED", "RESOLVED", "CANCELLED"] },
        },
      }),
    ]);

    // Format byStatus as object
    const statusCounts: Record<string, number> = {};
    for (const g of byStatus) statusCounts[g.status] = g._count;

    const categoryCounts: Record<string, number> = {};
    for (const g of byCategory) categoryCounts[g.category] = g._count;

    return NextResponse.json({
      total,
      byStatus: statusCounts,
      byCategory: categoryCounts,
      recent,
      overdue,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
