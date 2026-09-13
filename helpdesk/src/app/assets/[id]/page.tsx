"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { Empty, PageHeader } from "@/components/ui";

interface AssetTicket {
  id: string;
  ticket_no: string;
  title: string;
  status: string;
  created_at: string;
  requester: { name: string };
}

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  serial_number: string;
  tags: string[];
  location: string | null;
  brand: string | null;
  model: string | null;
  department: string | null;
  owner: string | null;
  status: string;
  notes: string | null;
  tickets?: AssetTicket[];
}

export default function AssetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "โหลดข้อมูลไม่สำเร็จ");
        setAsset(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppShell>
      <PageHeader title="รายละเอียดครุภัณฑ์" sub={asset ? `${asset.asset_code} • ${asset.name}` : "ข้อมูลครุภัณฑ์และประวัติซ่อม"} />
      {loading ? (
        <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : !asset ? (
        <Empty text="ไม่พบครุภัณฑ์นี้" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-card space-y-2 p-5 text-sm lg:col-span-1">
            {[
              ["เลขทรัพย์สิน", asset.asset_code],
              ["ชื่อ", asset.name],
              ["หมวด", asset.category],
              ["Serial", asset.serial_number],
              ["Tags", asset.tags.join(", ") || "-"],
              ["ที่ตั้ง", asset.location || "-"],
              ["ยี่ห้อ/รุ่น", [asset.brand, asset.model].filter(Boolean).join(" ") || "-"],
              ["แผนก/ผู้รับผิดชอบ", [asset.department, asset.owner].filter(Boolean).join(" / ") || "-"],
              ["สถานะ", asset.status],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{k}</p>
                <p className="font-semibold text-white">{v}</p>
              </div>
            ))}
            {asset.notes && <p className="text-xs leading-6" style={{ color: "var(--text-secondary)" }}>{asset.notes}</p>}
          </div>
          <div className="glass-card p-5 lg:col-span-2">
            <h2 className="mb-3 font-bold text-white">ประวัติซ่อม ({asset.tickets?.length || 0} ใบล่าสุด)</h2>
            <div className="space-y-2">
              {(asset.tickets || []).map((t) => (
                <Link key={t.id} href={`/track/${t.id}`} className="glass-card-interactive flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{t.ticket_no} • {t.title}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.requester.name} • {new Date(t.created_at).toLocaleString("th-TH")}</p>
                  </div>
                  <StatusBadge status={t.status as never} />
                </Link>
              ))}
              {(!asset.tickets || asset.tickets.length === 0) && <Empty text="ยังไม่มีประวัติซ่อมของครุภัณฑ์นี้" />}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
