"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { Chip, Empty, PageHeader } from "@/components/ui";
import type { TicketStatus } from "@/lib/constants";

interface Ticket {
  id: string;
  ticket_no: string;
  title: string;
  status: TicketStatus;
  priority: string;
  location: string | null;
  requester: { name: string };
  technician_id: string | null;
}

export default function TechnicianPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, tRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/tickets?limit=100", { cache: "no-store" }),
        ]);
        let myId: string | null = null;
        if (meRes.ok) {
          const me = await meRes.json();
          myId = me.id;
          setMeId(myId);
        }
        if (tRes.ok) {
          const data = await tRes.json();
          const all: Ticket[] = data.tickets || [];
          // Filter: assigned to me OR unassigned NEW/TRIAGED/ASSIGNED
          const filtered = all.filter((t) => t.technician_id === myId || (!t.technician_id && ["NEW", "TRIAGED", "ASSIGNED"].includes(t.status)));
          setTickets(filtered);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell>
      <PageHeader title="งานที่ได้รับมอบหมาย" sub={`งานของคุณ + งานรอรับ • ทั้งหมด ${tickets.length} งาน`} />
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-2.5 stagger">
          {tickets.map((t) => (
            <Link key={t.id} href={`/track/${t.id}`} className="glass-card-interactive flex items-center gap-3 p-4 animate-slide-up">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{t.ticket_no} • {t.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                  <Chip>{t.requester.name}</Chip>
                  <Chip>{t.location || "-"}</Chip>
                  <Chip>{t.priority}</Chip>
                  {t.technician_id === meId && <Chip>ของคุณ</Chip>}
                  {!t.technician_id && <Chip>รอรับ</Chip>}
                </div>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
      )}
      {!loading && tickets.length === 0 && <Empty text="ยังไม่มีงานในคิว" />}
    </AppShell>
  );
}
