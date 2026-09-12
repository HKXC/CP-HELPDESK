import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { getAttachmentBytes } from "@/lib/storage";

// GET /api/attachments/[id] — download with same authz as parent ticket
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const att = await prisma.attachment.findUnique({
      where: { id },
      include: { ticket: { select: { requester_id: true, technician_id: true } } },
    });
    if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (session.role === "USER" && att.ticket.requester_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role === "TECH" && att.ticket.technician_id !== session.id && att.ticket.technician_id !== null) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buf = await getAttachmentBytes(att.storage_path);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": att.content_type,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
        "Content-Length": String(att.size),
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
