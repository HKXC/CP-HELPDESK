import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { transitionTicket } from "@/lib/ticket-service";
import { TicketStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // Authorization: USER can reopen own CLOSED/RESOLVED, TECH/ADMIN can reopen assigned
    if (session.role === "USER" && ticket.requester_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role === "TECH" && ticket.technician_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["CLOSED", "RESOLVED"].includes(ticket.status)) {
      return NextResponse.json({ error: "Only CLOSED or RESOLVED tickets can be reopened" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const note = body.note || body.reason || "Reopened by requester";

    const updated = await transitionTicket({
      ticket_id: id,
      new_status: TicketStatus.REOPENED,
      actor_id: session.id,
      note,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
