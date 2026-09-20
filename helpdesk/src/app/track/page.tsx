"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { Empty, PageHeader } from "@/components/ui";
import type { TicketStatus } from "@/lib/constants";

interface Ticket {
  id: string;
  ticket_no: string;
  title: string;
  status: TicketStatus;
  asset_code: string | null;
  serial_number: string | null;
  requester: { name: string };
}

function TrackInner() {
  const params = useSearchParams();
  const qParam = params.get("q") || "";
  const [text, setText] = useState(qParam);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTickets = async (q: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/tickets?q=${encodeURIComponent(q)}&limit=50` : "/api/tickets?limit=50";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Same microtask deferral as assets/page.tsx (react-hooks/set-state-in-effect).
    void Promise.resolve().then(() => {
      setText(qParam);
      fetchTickets(qParam);
    });
  }, [qParam]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets(text);
    // Update URL without full reload
    const url = text ? `/track?q=${encodeURIComponent(text)}` : "/track";
    window.history.replaceState(null, "", url);
  };

  return (
    <AppShell>
      <PageHeader title="ติดตามสถานะ" sub="ค้นหาด้วยเลข Ticket / เลขทรัพย์สิน / Serial / อาการ" />
      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์เพื่อค้นหา…" className="glass-input w-full max-w-lg px-4 py-2.5 text-sm" />
        <button type="submit" className="btn-gradient shrink-0 px-6 text-sm">ค้นหา</button>
      </form>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-2.5 stagger">
          {tickets.map((t) => (
            <Link key={t.id} href={`/track/${t.id}`} className="glass-card-interactive p-4 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{t.ticket_no} • {t.title}</p>
                  <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-muted)" }}>
                    {t.asset_code || "ไม่ระบุครุภัณฑ์"} • SN: {t.serial_number || "-"} • {t.requester.name}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
      {!loading && tickets.length === 0 && <Empty text="ไม่พบงานที่ค้นหา" />}
    </AppShell>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-slate-400">กำลังโหลด…</div>}>
      <TrackInner />
    </Suspense>
  );
}
