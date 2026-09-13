import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AssetStatus } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        tickets: {
          orderBy: { created_at: "desc" },
          take: 10,
          include: { requester: { select: { name: true } } },
        },
      },
    });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json(asset);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const body = await req.json();

    // Version check
    if (body.version !== undefined && body.version !== asset.version) {
      return NextResponse.json({ error: "Data was modified by another user. Please refresh." }, { status: 409 });
    }

    const data: Record<string, unknown> = { version: { increment: 1 } };
    const fields = ["asset_code", "name", "category", "serial_number", "location", "brand", "model", "department", "owner", "warranty", "notes", "status"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) data.tags = body.tags;
      else if (typeof body.tags === "string") data.tags = body.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    }
    if (body.purchase_date !== undefined) {
      data.purchase_date = body.purchase_date ? new Date(body.purchase_date) : null;
    }
    if (body.status !== undefined && !Object.values(AssetStatus).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check duplicates if changing codes
    if (body.asset_code || body.serial_number) {
      const conflict = await prisma.asset.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(body.asset_code ? [{ asset_code: body.asset_code }] : []),
            ...(body.serial_number ? [{ serial_number: body.serial_number }] : []),
          ],
        },
      });
      if (conflict) {
        return NextResponse.json({ error: `Duplicate: conflicts with ${conflict.asset_code}` }, { status: 409 });
      }
    }

    const updated = await prisma.asset.update({
      where: { id, version: asset.version },
      data: data as never,
    });

    await prisma.activityLog.create({
      data: {
        actor_id: session.id,
        action: "asset.updated",
        entity_type: "Asset",
        entity_id: id,
        details: { changed: Object.keys(body) },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    // Check if asset has linked tickets
    const linked = await prisma.ticket.count({ where: { asset_id: id } });
    if (linked > 0) {
      // Soft: set to RETIRED instead of delete
      const updated = await prisma.asset.update({
        where: { id },
        data: { status: AssetStatus.RETIRED },
      });
      return NextResponse.json({ message: "Asset has linked tickets, set to RETIRED instead", asset: updated });
    }

    await prisma.asset.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actor_id: session.id,
        action: "asset.deleted",
        entity_type: "Asset",
        entity_id: id,
        details: { asset_code: asset.asset_code },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
