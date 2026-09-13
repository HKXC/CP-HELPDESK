import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

// POST /api/tickets/[id]/comments — follow-up message without status change.
// Creates a TicketHistory entry with from_status == to_status == current status.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // USER can comment only on own tickets; TECH on assigned/unassigned queue; ADMIN all
    if (session.role === "USER" && ticket.requester_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role === "TECH" && ticket.technician_id !== session.id && ticket.technician_id !== null) {
      const isUnassignedQueue = !ticket.technician_id && ["NEW", "TRIAGED", "ASSIGNED"].includes(ticket.status);
      if (!isUnassignedQueue) {
        return NextResponse.json({ error: "Forbidden — not assigned to you" }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const note = body.note?.trim() || body.comment?.trim();
    if (!note) return NextResponse.json({ error: "Comment is required" }, { status: 400 });

    // USER comments are always requester-visible; staff may mark internal
    const is_internal = session.role !== "USER" ? !!body.is_internal : false;

    const entry = await prisma.$transaction(async (tx) => {
      const h = await tx.ticketHistory.create({
        data: {
          ticket_id: id,
          actor_id: session.id,
          from_status: ticket.status,
          to_status: ticket.status,
          note,
          is_internal,
        },
      });
      await tx.activityLog.create({
        data: {
          actor_id: session.id,
          action: "ticket.commented",
          entity_type: "Ticket",
          entity_id: id,
          details: { is_internal },
        },
      });
      return h;
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
