"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { Empty, PageHeader } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/constants";
import type { TicketStatus } from "@/lib/constants";

const BAR_COLORS: Record<string, string> = {
  NEW: "#f59e0b",
  TRIAGED: "#38bdf8",
  ASSIGNED: "#60a5fa",
  IN_PROGRESS: "#8b5cf6",
  WAITING_REQUESTER: "#eab308",
  WAITING_PARTS: "#f97316",
  RESOLVED: "#10b981",
  CLOSED: "#64748b",
  REOPENED: "#ec4899",
  CANCELLED: "#ef4444",
};

interface Ticket {
  id: string;
  ticket_no: string;
  title: string;
  category: string;
  priority: string;
  status: TicketStatus;
  asset_code: string | null;
  serial_number: string | null;
  requester: { name: string };
  technician: { name: string } | null;
  created_at: string;
}

function AdminInner() {
  const params = useSearchParams();
  const tab = params.get("tab") || "tickets";
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string; department: string | null }[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("created_at");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (tab === "users") {
          const res = await fetch("/api/users", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            setUsers(data.users || []);
          }
        } else {
          const q = new URLSearchParams({ limit: "20", page: String(page), sort, order: "desc" });
          if (from) q.set("from", from);
          if (to) q.set("to", to);
          const res = await fetch(`/api/tickets?${q}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            setTickets(data.tickets || []);
            setTotalPages(data.totalPages || 1);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tab, from, to, sort, page]);

  const byStatus = (s: string) => tickets.filter((t) => t.status === s).length;
  const byCat: Record<string, number> = {};
  tickets.forEach((t) => {
    byCat[t.category] = (byCat[t.category] || 0) + 1;
  });

  const exportCSV = () => {
    const rows = [
      ["ticket_no", "title", "category", "priority", "status", "asset_code", "serial", "requester", "technician", "created_at"],
      ...tickets.map((t) => [t.ticket_no, `"${t.title.replace(/"/g, '""')}"`, t.category, t.priority, t.status, t.asset_code || "", t.serial_number || "", t.requester.name, t.technician?.name || "", t.created_at]),
    ];
    const blob = new Blob(["\uFEFF" + rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cp-helpdesk-report.csv";
    a.click();
  };

  return (
    <AppShell>
      <PageHeader
        title="ผู้ดูแลระบบ"
        sub="จัดการงานทั้งหมด • มอบหมายช่าง • รายงานวิเคราะห์"
        action={
          tab === "reports" && tickets.length > 0 ? (
            <button onClick={exportCSV} className="btn-gradient rounded-full px-5 py-2 text-xs">Export CSV</button>
          ) : undefined
        }
      />
      <div className="mb-4 flex gap-2 text-sm">
        {[
          { href: "/admin", label: "งานทั้งหมด", active: tab === "tickets" },
          { href: "/admin?tab=reports", label: "รายงาน", active: tab === "reports" },
          { href: "/admin?tab=users", label: "ผู้ใช้", active: tab === "users" },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-full px-4 py-1.5 font-semibold transition-all"
            style={
              t.active
                ? { background: "var(--gradient-accent)", color: "#fff", boxShadow: "var(--shadow-glow-sm)" }
                : { background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }
            }
          >
            {t.label}
          </Link>
        ))}
        <Link href="/assets" className="rounded-full px-4 py-1.5 font-semibold transition-all" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
          ครุภัณฑ์
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : tab === "users" ? (
        <div className="glass-card p-5">
          <h2 className="mb-3 font-bold text-white">ผู้ใช้ทั้งหมด ({users.length})</h2>
          <div className="space-y-2 text-sm">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
                <div><p className="font-bold text-white">{u.name}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email} • {u.department || "-"}</p></div>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-medium)", color: "var(--text-secondary)" }}>{u.role}</span>
              </div>
            ))}
            {users.length === 0 && <Empty text="ยังไม่มีผู้ใช้" />}
          </div>
        </div>
      ) : tab === "reports" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-card p-5 animate-slide-up">
            <h2 className="mb-4 font-bold text-white">สรุปตามสถานะ</h2>
            {(Object.keys(BAR_COLORS) as (keyof typeof BAR_COLORS)[]).map((s) => (
              <div key={s} className="mb-3 flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate text-xs" style={{ color: "var(--text-secondary)" }}>{STATUS_LABEL[s as TicketStatus] ?? s}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-glass)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${tickets.length ? (byStatus(s) / tickets.length) * 100 : 0}%`, background: BAR_COLORS[s], boxShadow: `0 0 8px ${BAR_COLORS[s]}60` }} />
                </div>
                <b className="w-6 text-right text-white">{byStatus(s)}</b>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูล</p>}
          </div>
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="mb-3 font-bold text-white">สรุปตามหมวดอุปกรณ์</h2>
            {Object.entries(byCat).map(([c, n]) => (
              <div key={c} className="mb-2 flex justify-between py-1.5 text-sm" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>{c}</span><b className="text-white">{n}</b>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูล</p>}
            <p className="mt-3 text-xs leading-5" style={{ color: "var(--text-muted)" }}>ใช้ข้อมูลนี้วิเคราะห์งานซ้ำ ปรับแผน PM และสต็อกอะไหล่ ลดการใช้เอกสารตามวัตถุประสงค์ข้อ 4-6</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="glass-input px-3 py-1.5" />
            <span style={{ color: "var(--text-muted)" }}>ถึง</span>
            <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="glass-input px-3 py-1.5" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="glass-select px-3 py-1.5">
              <option value="created_at">เรียง: วันที่สร้าง</option>
              <option value="updated_at">เรียง: อัปเดตล่าสุด</option>
              <option value="priority">เรียง: ความสำคัญ</option>
              <option value="status">เรียง: สถานะ</option>
            </select>
          </div>
          <div className="grid gap-2.5 stagger">
          {tickets.map((t) => (
            <Link key={t.id} href={`/track/${t.id}`} className="glass-card-interactive flex items-center gap-3 p-4 animate-slide-up">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{t.ticket_no} • {t.title}</p>
                <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-muted)" }}>{t.requester.name} → {t.technician?.name || "ยังไม่มอบหมาย"} • {t.priority}</p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
            {tickets.length === 0 && <Empty text="ยังไม่มีงาน" />}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-full px-4 py-1.5 disabled:opacity-40" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>ก่อนหน้า</button>
            <span style={{ color: "var(--text-muted)" }}>หน้า {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full px-4 py-1.5 disabled:opacity-40" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>ถัดไป</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function AdminPage() {
  return <Suspense fallback={<div className="p-10 text-sm text-slate-400">กำลังโหลด…</div>}><AdminInner /></Suspense>;
}
