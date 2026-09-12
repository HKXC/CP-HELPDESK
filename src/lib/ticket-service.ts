import { prisma } from "./prisma";
import { TicketStatus, Priority, type Prisma } from "@prisma/client";

// ── Types ──────────────────────────────────────────

export interface CreateTicketInput {
  title: string;
  description: string;
  category: string;
  priority?: Priority;
  asset_code?: string;
  serial_number?: string;
  asset_id?: string;
  location?: string;
  contact?: string;
  department?: string;
  impact?: string;
  urgency?: string;
  requester_id: string;
  due_at?: Date;
}

export interface TransitionInput {
  ticket_id: string;
  new_status: TicketStatus;
  actor_id: string;
  note?: string;
  is_internal?: boolean;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  category?: string;
  priority?: Priority;
  asset_code?: string;
  serial_number?: string;
  asset_id?: string;
  location?: string;
  contact?: string;
  department?: string;
  impact?: string;
  urgency?: string;
  technician_id?: string | null;
  diagnosis?: string;
  work_performed?: string;
  parts_used?: string;
  resolution?: string;
  solution?: string;
  due_at?: Date | null;
}

// ── Allowed transitions ─────────────────────────────

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.TRIAGED, TicketStatus.CANCELLED],
  TRIAGED: [TicketStatus.ASSIGNED, TicketStatus.CANCELLED],
  ASSIGNED: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_REQUESTER, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.WAITING_PARTS, TicketStatus.WAITING_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  WAITING_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  WAITING_PARTS: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  CLOSED: [TicketStatus.REOPENED],
  REOPENED: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.TRIAGED, TicketStatus.CANCELLED],
  CANCELLED: [],
};

// ── Functions ──────────────────────────────────────

export async function nextTicketNo(): Promise<string> {
  // Use DB sequence for concurrency safety
  // Create sequence if not exists (idempotent)
  await prisma.$executeRaw`CREATE SEQUENCE IF NOT EXISTS ticket_no_seq START WITH 1`;
  const result = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('ticket_no_seq') as nextval`;
  const seq = Number(result[0].nextval);
  const yy = new Date().getFullYear().toString().slice(2);
  return `HD-${yy}-${String(seq).padStart(4, "0")}`;
}

export async function createTicket(input: CreateTicketInput) {
  // Validation
  if (!input.title?.trim()) throw new Error("Title is required");
  if (!input.description?.trim()) throw new Error("Description is required");
  if (!input.category?.trim()) throw new Error("Category is required");
  if (!input.requester_id) throw new Error("requester_id is required");

  return prisma.$transaction(async (tx) => {
    const ticket_no = await nextTicketNo();

    const ticket = await tx.ticket.create({
      data: {
        ticket_no,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        priority: input.priority || Priority.MEDIUM,
        status: TicketStatus.NEW,
        asset_code: input.asset_code || null,
        serial_number: input.serial_number || null,
        asset_id: input.asset_id || null,
        location: input.location || null,
        contact: input.contact || null,
        department: input.department || null,
        impact: input.impact || null,
        urgency: input.urgency || null,
        requester_id: input.requester_id,
        due_at: input.due_at || null,
      },
    });

    await tx.ticketHistory.create({
      data: {
        ticket_id: ticket.id,
        actor_id: input.requester_id,
        from_status: TicketStatus.NEW,
        to_status: TicketStatus.NEW,
        note: "สร้างใบแจ้งซ่อม",
        is_internal: false,
      },
    });

    await tx.activityLog.create({
      data: {
        actor_id: input.requester_id,
        action: "ticket.created",
        entity_type: "Ticket",
        entity_id: ticket.id,
        details: { ticket_no },
      },
    });

    return ticket;
  });
}

export async function transitionTicket(input: TransitionInput) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: input.ticket_id } });

    const allowed = ALLOWED_TRANSITIONS[ticket.status];
    if (!allowed.includes(input.new_status)) {
      throw Object.assign(
        new Error(`Cannot transition from ${ticket.status} to ${input.new_status}`),
        { status: 400 }
      );
    }

    const updateData: Prisma.TicketUpdateInput = {
      status: input.new_status,
      version: { increment: 1 },
    };

    // Set timestamp fields based on new status
    const now = new Date();
    if (input.new_status === TicketStatus.ASSIGNED && !ticket.accepted_at) updateData.accepted_at = now;
    if (input.new_status === TicketStatus.IN_PROGRESS && !ticket.started_at) updateData.started_at = now;
    if (input.new_status === TicketStatus.RESOLVED) updateData.resolved_at = now;
    if (input.new_status === TicketStatus.CLOSED) updateData.closed_at = now;

    // Optimistic locking — ensure version hasn't changed
    const updated = await tx.ticket.update({
      where: { id: input.ticket_id, version: ticket.version },
      data: updateData,
    });

    await tx.ticketHistory.create({
      data: {
        ticket_id: input.ticket_id,
        actor_id: input.actor_id,
        from_status: ticket.status,
        to_status: input.new_status,
        note: input.note || null,
        is_internal: input.is_internal || false,
      },
    });

    await tx.activityLog.create({
      data: {
        actor_id: input.actor_id,
        action: "ticket.status_changed",
        entity_type: "Ticket",
        entity_id: input.ticket_id,
        details: { from: ticket.status, to: input.new_status },
      },
    });

    return updated;
  });
}

export async function updateTicket(
  ticket_id: string,
  input: UpdateTicketInput,
  actor_id: string
) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: ticket_id } });

    // Build update data, only include defined fields
    const data: Prisma.TicketUncheckedUpdateInput = { version: { increment: 1 } };
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.asset_code !== undefined) data.asset_code = input.asset_code;
    if (input.serial_number !== undefined) data.serial_number = input.serial_number;
    if (input.asset_id !== undefined) data.asset_id = input.asset_id;
    if (input.location !== undefined) data.location = input.location;
    if (input.contact !== undefined) data.contact = input.contact;
    if (input.department !== undefined) data.department = input.department;
    if (input.impact !== undefined) data.impact = input.impact;
    if (input.urgency !== undefined) data.urgency = input.urgency;
    if (input.diagnosis !== undefined) data.diagnosis = input.diagnosis;
    if (input.work_performed !== undefined) data.work_performed = input.work_performed;
    if (input.parts_used !== undefined) data.parts_used = input.parts_used;
    if (input.resolution !== undefined) data.resolution = input.resolution;
    if (input.solution !== undefined) data.solution = input.solution;
    if (input.due_at !== undefined) data.due_at = input.due_at;
    if (input.technician_id !== undefined) {
      // Use unchecked input to set FK directly
      (data as Prisma.TicketUncheckedUpdateInput).technician_id = input.technician_id;
      // Auto-move to ASSIGNED if currently NEW/TRIAGED and assigning
      if (input.technician_id && ([TicketStatus.NEW, TicketStatus.TRIAGED] as TicketStatus[]).includes(ticket.status)) {
        data.status = TicketStatus.ASSIGNED;
        (data as Record<string, unknown>).accepted_at = new Date();
      }
    }

    const updated = await tx.ticket.update({
      where: { id: ticket_id, version: ticket.version },
      data,
    });

    // If status changed due to assignment, log history
    if ((data as Record<string, unknown>).status && (data as Record<string, unknown>).status !== ticket.status) {
      await tx.ticketHistory.create({
        data: {
          ticket_id,
          actor_id,
          from_status: ticket.status,
          to_status: (data as Record<string, unknown>).status as TicketStatus,
          note: input.technician_id ? `มอบหมายให้ช่าง` : null,
          is_internal: false,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        actor_id,
        action: "ticket.updated",
        entity_type: "Ticket",
        entity_id: ticket_id,
        details: { changed: Object.keys(input) },
      },
    });

    return updated;
  });
}
