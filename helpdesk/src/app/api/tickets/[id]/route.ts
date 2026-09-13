import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { transitionTicket, updateTicket } from "@/lib/ticket-service";
import { TicketStatus, Priority } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
        technician: { select: { id: true, name: true, email: true } },
        asset: true,
      },
    });

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // Authorization: USER can only view own tickets
    if (session.role === "USER" && ticket.requester_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch history — filter internal notes for USER
    const historyWhere: Record<string, unknown> = { ticket_id: id };
    if (session.role === "USER") {
      (historyWhere as Record<string, boolean>).is_internal = false;
    }

    const history = await prisma.ticketHistory.findMany({
      where: historyWhere as never,
      orderBy: { created_at: "desc" },
      include: { actor: { select: { name: true } } },
    });

    // Metadata only — storage_path (blob URL / disk path) never leaves the server.
    // Downloads go through /api/attachments/[id] with parent-ticket authorization.
    const attachments = await prisma.attachment.findMany({
      where: { ticket_id: id },
      orderBy: { uploaded_at: "desc" },
      select: {
        id: true,
        filename: true,
        content_type: true,
        size: true,
        uploaded_by: true,
        uploaded_at: true,
      },
    });

    return NextResponse.json({ ticket, history, attachments });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // Authorization check for updates
    if (session.role === "USER") {
      // USER can only update own tickets for limited actions (reopen, confirm)
      // For now deny all PATCH for USER except via reopen endpoint
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role === "TECH" && ticket.technician_id !== session.id && ticket.technician_id !== null) {
      // TECH can only manage assigned tickets or unassigned queue
      // Allow if ticket is unassigned and status is NEW/TRIAGED/ASSIGNED
      const isUnassignedQueue = !ticket.technician_id && ["NEW", "TRIAGED", "ASSIGNED"].includes(ticket.status);
      if (!isUnassignedQueue && ticket.technician_id !== session.id) {
        return NextResponse.json({ error: "Forbidden — not assigned to you" }, { status: 403 });
      }
    }

    const body = await req.json();

    // Handle status transition separately
    if (body.status && body.status !== ticket.status) {
      if (!Object.values(TicketStatus).includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      // Check version for optimistic locking if provided
      if (body.version !== undefined && body.version !== ticket.version) {
        return NextResponse.json(
          { error: "Data was modified by another user. Please refresh." },
          { status: 409 }
        );
      }
      try {
        const updated = await transitionTicket({
          ticket_id: id,
          new_status: body.status as TicketStatus,
          actor_id: session.id,
          note: body.note || body.reason || undefined,
          is_internal: body.is_internal || false,
        });

        // Handle additional fields alongside status change (diagnosis etc) if provided
        const extraFields: Record<string, unknown> = {};
        if (body.diagnosis !== undefined) extraFields.diagnosis = body.diagnosis;
        if (body.work_performed !== undefined) extraFields.work_performed = body.work_performed;
        if (body.parts_used !== undefined) extraFields.parts_used = body.parts_used;
        if (body.resolution !== undefined) extraFields.resolution = body.resolution;
        if (body.solution !== undefined) extraFields.solution = body.solution;

        let finalTicket = updated;
        if (Object.keys(extraFields).length > 0) {
          finalTicket = await updateTicket(id, extraFields as never, session.id);
        }

        const full = await prisma.ticket.findUnique({
          where: { id },
          include: {
            requester: { select: { id: true, name: true } },
            technician: { select: { id: true, name: true } },
          },
        });
        return NextResponse.json(full);
      } catch (e: unknown) {
        const err = e as Error & { status?: number };
        if (err.status === 400) return NextResponse.json({ error: err.message }, { status: 400 });
        throw e;
      }
    }

    // Regular field updates
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "title",
      "description",
      "category",
      "priority",
      "asset_code",
      "serial_number",
      "asset_id",
      "location",
      "contact",
      "department",
      "impact",
      "urgency",
      "diagnosis",
      "work_performed",
      "parts_used",
      "resolution",
      "solution",
      "due_at",
      "technician_id",
    ];
    for (const f of allowedFields) {
      if (body[f] !== undefined) updateData[f] = body[f];
    }

    // Validate priority if provided
    if (updateData.priority && !Object.values(Priority).includes(updateData.priority as Priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    // Version check for optimistic locking
    if (body.version !== undefined && body.version !== ticket.version) {
      return NextResponse.json(
        { error: "Data was modified by another user. Please refresh." },
        { status: 409 }
      );
    }

    // Only ADMIN can reassign technician
    if (updateData.technician_id !== undefined && session.role !== "ADMIN" && session.role !== "TECH") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (updateData.technician_id !== undefined && session.role === "TECH") {
      // TECH can only assign to self
      if (updateData.technician_id !== session.id && updateData.technician_id !== null) {
        return NextResponse.json({ error: "Technicians can only assign to themselves" }, { status: 403 });
      }
    }

    // Handle due_at date parsing
    if (updateData.due_at !== undefined) {
      updateData.due_at = updateData.due_at ? new Date(updateData.due_at as string) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await updateTicket(id, updateData as never, session.id);

    const full = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(full);
  } catch (e) {
    return handleApiError(e);
  }
}
