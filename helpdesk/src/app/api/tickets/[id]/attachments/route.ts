import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { putAttachment } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/tickets/[id]/attachments — multipart file upload (TECH/ADMIN + requester own ticket)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (session.role === "USER" && ticket.requester_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role === "TECH" && ticket.technician_id !== session.id && ticket.technician_id !== null) {
      const isQueue = !ticket.technician_id && ["NEW", "TRIAGED", "ASSIGNED"].includes(ticket.status);
      if (!isQueue) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let file: File | null;
    try {
      const form = await req.formData();
      file = form.get("file") as File | null;
    } catch {
      // Body เกิน limit ของ server (เช่น >10MB) ทำให้ parse multipart ไม่ได้
      return NextResponse.json({ error: "ไฟล์ใหญ่เกินกำหนด (สูงสุด 10MB)" }, { status: 400 });
    }
    if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    // Blob on Vercel (prod) when BLOB_READ_WRITE_TOKEN is set, local disk in dev.
    // storage_path holds a blob URL or a local path — never exposed to clients.
    const storage_path = await putAttachment(
      id,
      file.name,
      file.type || "application/octet-stream",
      bytes
    );

    const row = await prisma.$transaction(async (tx) => {
      const att = await tx.attachment.create({
        data: {
          ticket_id: id,
          filename: file.name.slice(0, 200),
          content_type: file.type || "application/octet-stream",
          size: file.size,
          storage_path,
          uploaded_by: session.id,
        },
      });
      await tx.activityLog.create({
        data: {
          actor_id: session.id,
          action: "ticket.attachment_added",
          entity_type: "Ticket",
          entity_id: id,
          details: { filename: file.name, size: file.size },
        },
      });
      return att;
    });

    // Strip the internal storage reference before responding (never expose raw paths).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { storage_path: _storage_path, ...publicRow } = row;

    return NextResponse.json(publicRow, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
