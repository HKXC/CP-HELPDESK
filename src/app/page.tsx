"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import type { TicketStatus } from "@/lib/constants";

interface Overview {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  recent: Array<{
    id: string;
    ticket_no: string;
    title: string;
    status: TicketStatus;
    asset_code: string | null;
    requester: { name: string };
    technician: { name: string } | null;
  }>;
  overdue: number;
}

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  serial_number: string;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [ovRes, assetRes] = await Promise.all([
          fetch("/api/overview", { cache: "no-store" }),
          fetch("/api/assets?limit=5", { cache: "no-store" }),
        ]);
        if (!ovRes.ok) throw new Error("Failed to load overview");
        const ov = await ovRes.json();
        setOverview(ov);
        if (assetRes.ok) {
          const a = await assetRes.json();
          setAssets(a.assets || []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const count = (status: string) => overview?.byStatus[status] || 0;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <p className="text-sm text-red-400">{error}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">แดชบอร์ด</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          ภาพรวมงานแจ้งซ่อม • ลดงานตกหล่น • ติดตามได้แบบเรียลไทม์
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger">
        <Stat label="ใหม่ / คัดกรอง" value={count("NEW") + count("TRIAGED")} color="#f59e0b" gradient="linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))" />
        <Stat label="กำลังซ่อม" value={count("ASSIGNED") + count("IN_PROGRESS")} color="#8b5cf6" gradient="linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))" />
        <Stat label="รอข้อมูล/อะไหล่" value={count("WAITING_REQUESTER") + count("WAITING_PARTS")} color="#f97316" gradient="linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))" />
        <Stat label="แก้ไขแล้ว / ปิดงาน" value={count("RESOLVED") + count("CLOSED")} color="#10b981" gradient="linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))" />
      </div>
      {overview && overview.overdue > 0 && (
        <div className="mt-3 rounded-xl px-4 py-2 text-xs font-medium" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          ⚠ งานเกินกำหนด {overview.overdue} งาน
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass-card p-5 lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-white">งานล่าสุด</h2>
            <Link href="/new-ticket" className="btn-gradient rounded-full px-4 py-1.5 text-xs font-semibold">
              + แจ้งซ่อมใหม่
            </Link>
          </div>
          <div className="space-y-2">
            {overview?.recent.map((t) => (
              <Link key={t.id} href={`/track/${t.id}`} className="glass-card-interactive flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {t.ticket_no} • {t.title}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                    {t.asset_code || "-"} • {t.requester.name}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            ))}
            {overview?.recent.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีงานแจ้งซ่อม</p>}
          </div>
        </div>

        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="mb-3 font-bold text-white">ครุภัณฑ์ (ตัวอย่าง)</h2>
          <div className="space-y-2 text-sm">
            {assets.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
                <p className="font-semibold text-white">{a.asset_code}</p>
                <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {a.name} • SN: {a.serial_number}
                </p>
              </div>
            ))}
            {assets.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีครุภัณฑ์</p>}
          </div>
          <Link href="/assets" className="mt-3 block text-center text-xs font-semibold underline" style={{ color: "var(--text-accent)" }}>
            ดูครุภัณฑ์ทั้งหมด
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color, gradient }: { label: string; value: number; color: string; gradient: string }) {
  return (
    <div className="glass-card p-4 animate-slide-up">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: gradient }}>
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
