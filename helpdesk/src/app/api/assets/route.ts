import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AssetStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (q) {
      (where as Record<string, unknown>).OR = [
        { asset_code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { serial_number: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
    }
    if (status) (where as Record<string, string>).status = status;

    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100);
    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where: where as never,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.asset.count({ where: where as never }),
    ]);

    return NextResponse.json({ assets, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    if (!body.asset_code?.trim()) return NextResponse.json({ error: "asset_code is required" }, { status: 400 });
    if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!body.category?.trim()) return NextResponse.json({ error: "category is required" }, { status: 400 });
    if (!body.serial_number?.trim()) return NextResponse.json({ error: "serial_number is required" }, { status: 400 });

    // Check duplicates
    const existing = await prisma.asset.findFirst({
      where: {
        OR: [{ asset_code: body.asset_code }, { serial_number: body.serial_number }],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Duplicate: asset_code or serial_number already exists (${existing.asset_code})` },
        { status: 409 }
      );
    }

    // Parse tags
    let tags: string[] = [];
    if (Array.isArray(body.tags)) tags = body.tags;
    else if (typeof body.tags === "string") tags = body.tags.split(",").map((t: string) => t.trim()).filter(Boolean);

    const status = body.status && Object.values(AssetStatus).includes(body.status) ? body.status : AssetStatus.ACTIVE;

    const asset = await prisma.asset.create({
      data: {
        asset_code: body.asset_code.trim(),
        name: body.name.trim(),
        category: body.category.trim(),
        serial_number: body.serial_number.trim(),
        tags,
        location: body.location || null,
        brand: body.brand || null,
        model: body.model || null,
        department: body.department || null,
        owner: body.owner || null,
        purchase_date: body.purchase_date ? new Date(body.purchase_date) : null,
        warranty: body.warranty || null,
        status,
        notes: body.notes || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        actor_id: session.id,
        action: "asset.created",
        entity_type: "Asset",
        entity_id: asset.id,
        details: { asset_code: asset.asset_code },
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
