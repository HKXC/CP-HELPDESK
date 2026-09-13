"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { Empty, PageHeader } from "@/components/ui";
import type { TicketStatus } from "@/lib/constants";

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "NEW", label: "ใหม่" },
  { value: "TRIAGED", label: "คัดกรองแล้ว" },
  { value: "ASSIGNED", label: "มอบหมายแล้ว" },
  { value: "IN_PROGRESS", label: "กำลังซ่อม" },
  { value: "WAITING_REQUESTER", label: "รอข้อมูล" },
  { value: "WAITING_PARTS", label: "รออะไหล่" },
  { value: "RESOLVED", label: "แก้ไขแล้ว" },
  { value: "CLOSED", label: "ปิดงาน" },
  { value: "REOPENED", label: "เปิดใหม่" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

interface Ticket {
  id: string;
  ticket_no: string;
  title: string;
  category: string;
  priority: string;
  status: TicketStatus;
  created_at: string;
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = async (status: string, sortBy: string, sortOrder: string) => {
    setLoading(true);
    setError("");
    try {
      const url = status === "ALL"
        ? `/api/tickets?limit=100&sort=${sortBy}&order=${sortOrder}`
        : `/api/tickets?status=${status}&limit=100&sort=${sortBy}&order=${sortOrder}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(filter, sort, order);
  }, [filter, sort, order]);

  return (
    <AppShell>
      <PageHeader title="รายการของฉัน" sub="งานที่คุณแจ้งไว้ทั้งหมด • กดเพื่อดูความคืบหน้า" />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="glass-select px-3 py-1.5">
          <option value="created_at">เรียง: วันที่สร้าง</option>
          <option value="updated_at">เรียง: อัปเดตล่าสุด</option>
          <option value="priority">เรียง: ความสำคัญ</option>
          <option value="status">เรียง: สถานะ</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value)} className="glass-select px-3 py-1.5">
          <option value="desc">มาก → น้อย</option>
          <option value="asc">น้อย → มาก</option>
        </select>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className="rounded-full px-3.5 py-1.5 font-semibold transition-all"
            style={
              filter === s.value
                ? { background: "var(--gradient-accent)", color: "#fff", boxShadow: "var(--shadow-glow-sm)" }
                : { background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }
            }
          >
            {s.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <div className="grid gap-2.5 stagger">
          {tickets.map((t) => (
            <Link key={t.id} href={`/track/${t.id}`} className="glass-card-interactive flex items-center gap-3 p-4 animate-slide-up">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{t.ticket_no} • {t.title}</p>
                <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {t.category} • {new Date(t.created_at).toLocaleString("th-TH")}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
      )}
      {!loading && tickets.length === 0 && !error && <Empty text="ไม่พบรายการ" />}
    </AppShell>
  );
}
