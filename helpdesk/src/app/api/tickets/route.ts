import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { createTicket } from "@/lib/ticket-service";
import { TicketStatus, Priority } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);

    const where: Record<string, unknown> = {};

    // Role-based filtering: USER sees only own tickets
    if (session.role === "USER") {
      (where as Record<string, string>).requester_id = session.id;
    }

    // Search across multiple fields
    const q = searchParams.get("q")?.trim();
    if (q) {
      (where as Record<string, unknown>).OR = [
        { ticket_no: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { asset_code: { contains: q, mode: "insensitive" } },
        { serial_number: { contains: q, mode: "insensitive" } },
        { requester: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    // Filters
    const status = searchParams.get("status");
    if (status && status !== "ALL") {
      if (Object.values(TicketStatus).includes(status as TicketStatus)) {
        (where as Record<string, string>).status = status;
      }
    }
    const priority = searchParams.get("priority");
    if (priority) (where as Record<string, string>).priority = priority;
    const category = searchParams.get("category");
    if (category) (where as Record<string, string>).category = category;
    const technician_id = searchParams.get("technician_id");
    if (technician_id) (where as Record<string, string>).technician_id = technician_id;
    const requester_id = searchParams.get("requester_id");
    if (requester_id) (where as Record<string, string>).requester_id = requester_id;

    // Date range
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      (where as Record<string, unknown>).created_at = {};
      if (from) (where.created_at as Record<string, Date>).gte = new Date(from);
      if (to) (where.created_at as Record<string, Date>).lte = new Date(to);
    }

    // Pagination
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100);
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = searchParams.get("sort") || "created_at";
    const allowedSort = ["created_at", "updated_at", "ticket_no", "priority", "status"];
    const sortBy = allowedSort.includes(sortField) ? sortField : "created_at";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: where as never,
        include: {
          requester: { select: { id: true, name: true, email: true } },
          technician: { select: { id: true, name: true, email: true } },
          asset: { select: { id: true, asset_code: true, name: true } },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where: where as never }),
    ]);

    return NextResponse.json({ tickets, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Server-side validation
    const errors: string[] = [];
    if (!body.title?.trim()) errors.push("Title is required");
    if (!body.description?.trim()) errors.push("Description is required");
    if (!body.category?.trim()) errors.push("Category is required");
    if (errors.length) return NextResponse.json({ error: errors.join(", ") }, { status: 400 });

    // Priority validation
    const priority = body.priority && Object.values(Priority).includes(body.priority) ? body.priority : Priority.MEDIUM;

    // Asset linkage: if asset_code provided, try to find asset_id
    let asset_id: string | undefined = body.asset_id || undefined;
    let serial_number: string | undefined = body.serial_number || undefined;
    if (body.asset_code && !asset_id) {
      const asset = await prisma.asset.findUnique({ where: { asset_code: body.asset_code } });
      if (asset) {
        asset_id = asset.id;
        serial_number = serial_number || asset.serial_number;
      }
    }

    const ticket = await createTicket({
      title: body.title,
      description: body.description,
      category: body.category,
      priority,
      asset_code: body.asset_code || undefined,
      serial_number: serial_number || undefined,
      asset_id,
      location: body.location || undefined,
      contact: body.contact || undefined,
      department: body.department || undefined,
      impact: body.impact || undefined,
      urgency: body.urgency || undefined,
      requester_id: session.id,
      due_at: body.due_at ? new Date(body.due_at) : undefined,
    });

    // Fetch with relations for response
    const full = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        requester: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
