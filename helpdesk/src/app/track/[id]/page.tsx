"use client";
import { use, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { Chip, Empty } from "@/components/ui";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import type { TicketStatus } from "@/lib/constants";

// Allowed transitions for UI buttons
const ALLOWED: Record<string, TicketStatus[]> = {
  NEW: ["TRIAGED", "CANCELLED"],
  TRIAGED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_PARTS", "WAITING_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_REQUESTER: ["IN_PROGRESS", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["TRIAGED", "ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

interface Ticket {
  id: string;
  ticket_no: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: TicketStatus;
  asset_code: string | null;
  serial_number: string | null;
  location: string | null;
  requester_id: string;
  requester: { name: string };
  technician_id: string | null;
  technician: { name: string } | null;
  solution: string | null;
  diagnosis: string | null;
  work_performed: string | null;
  parts_used: string | null;
  resolution: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  asset: { asset_code: string; name: string } | null;
}

interface HistoryItem {
  id: string;
  from_status: string;
  to_status: string;
  note: string | null;
  is_internal: boolean;
  created_at: string;
  actor: { name: string };
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface Attachment {
  id: string;
  filename: string;
  size: number;
  uploaded_at: string;
}

export default function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [note, setNote] = useState("");
  const [solution, setSolution] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [resolution, setResolution] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [comment, setComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [assetSerial, setAssetSerial] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const reload = async () => {
    try {
      setLoading(true);
      const [ticketRes, meRes, usersRes] = await Promise.all([
        fetch(`/api/tickets/${id}`, { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/users?role=TECH", { cache: "no-store" }),
      ]);
      if (!ticketRes.ok) {
        const d = await ticketRes.json();
        throw new Error(d.error || "โหลด Ticket ไม่สำเร็จ");
      }
      const data = await ticketRes.json();
      setTicket(data.ticket);
      setSolution(data.ticket.solution || data.ticket.resolution || "");
      setDiagnosis(data.ticket.diagnosis || "");
      setWorkPerformed(data.ticket.work_performed || "");
      setPartsUsed(data.ticket.parts_used || "");
      setResolution(data.ticket.resolution || "");
      setAssetCode(data.ticket.asset_code || "");
      setAssetSerial(data.ticket.serial_number || "");
      setHistory(data.history || []);
      setAttachments(data.attachments || []);
      if (meRes.ok) setMe(await meRes.json());
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u.users || []);
        // Also fetch admins for assignment
        const adminRes = await fetch("/api/users?role=ADMIN", { cache: "no-store" });
        if (adminRes.ok) {
          const ad = await adminRes.json();
          setUsers((prev) => [...prev, ...(ad.users || [])]);
        }
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Same microtask deferral as assets/page.tsx (react-hooks/set-state-in-effect).
    void Promise.resolve().then(() => reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <AppShell><div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div></AppShell>;
  if (error) return <AppShell><Empty text={error} /></AppShell>;
  if (!ticket) return <AppShell><Empty text="ไม่พบ Ticket นี้" /></AppShell>;

  const canManage = me && (me.role === "ADMIN" || me.role === "TECH");
  const nextStatuses = (ALLOWED[ticket.status] || []) as TicketStatus[];
  const stepIdx = STATUS_ORDER.indexOf(ticket.status);

  const changeStatus = async (to: TicketStatus) => {
    setActionError("");
    // Confirm before closing — requester-visible terminal state
    if (to === "CLOSED") {
      const ok = window.confirm("ยืนยันปิดงานนี้? ตรวจสอบว่า resolution ถูกต้องแล้ว");
      if (!ok) return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: to,
          note: note || undefined,
          solution: solution || undefined,
          diagnosis: diagnosis || undefined,
          work_performed: workPerformed || undefined,
          parts_used: partsUsed || undefined,
          resolution: resolution || undefined,
          is_internal: isInternal || undefined,
          version: ticket.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "เปลี่ยนสถานะไม่สำเร็จ");
        return;
      }
      setNote("");
      await reload();
    } catch {
      setActionError("เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  const saveSolution = async () => {
    setActionError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solution,
          diagnosis: diagnosis || undefined,
          work_performed: workPerformed || undefined,
          parts_used: partsUsed || undefined,
          resolution: resolution || undefined,
          version: ticket.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "บันทึกไม่สำเร็จ");
        return;
      }
      await reload();
    } catch {
      setActionError("เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  const saveAsset = async () => {
    setActionError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_code: assetCode.trim() || null,
          serial_number: assetSerial.trim() || null,
          version: ticket.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "บันทึกครุภัณฑ์ไม่สำเร็จ");
        return;
      }
      await reload();
    } catch {
      setActionError("เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  const assign = async () => {
    if (!assignTo) return;
    setActionError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_id: assignTo, version: ticket.version }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "มอบหมายไม่สำเร็จ");
        return;
      }
      await reload();
    } catch {
      setActionError("เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    setActionError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || "Reopened" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Reopen ไม่สำเร็จ");
        return;
      }
      await reload();
    } catch {
      setActionError("เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setActionError("");
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: comment, is_internal: canManage ? isInternal : false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "ส่งความคิดเห็นไม่สำเร็จ");
        return;
      }
      setComment("");
      await reload();
    } catch {
      setActionError("เกิดข้อผิดพลาด");
    } finally {
      setCommentLoading(false);
    }
  };

  const uploadFile = async (f: File) => {
    setActionError("");
    if (f.size > 10 * 1024 * 1024) {
      setActionError("ไฟล์ใหญ่เกินกำหนด (สูงสุด 10MB)");
      return;
    }
    setActionLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`/api/tickets/${ticket.id}/attachments`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || "อัปโหลดไม่สำเร็จ");
        return;
      }
      await reload();
    } catch {
      setActionError("เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="animate-fade-in">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ticket.ticket_no} • {new Date(ticket.created_at).toLocaleString("th-TH")}</p>
        <h1 className="mb-3 mt-1 bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">{ticket.title}</h1>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge status={ticket.status} />
          <Chip>{ticket.category} • {ticket.priority}</Chip>
          <Chip>ผู้แจ้ง: {ticket.requester.name}</Chip>
          {ticket.technician && <Chip>ช่าง: {ticket.technician.name}</Chip>}
          <Chip>v{ticket.version}</Chip>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card mb-4 p-4 animate-slide-up">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_ORDER.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 text-[11px]">
              <span
                className="rounded-full px-2.5 py-1 font-semibold transition-all"
                style={i <= stepIdx
                  ? { background: "var(--gradient-accent)", color: "#fff", boxShadow: "var(--shadow-glow-sm)" }
                  : { background: "var(--bg-glass)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
              >
                {STATUS_LABEL[s]}
              </span>
              {i < STATUS_ORDER.length - 1 && <span style={{ color: "var(--text-muted)" }}>›</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-glass)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((stepIdx + 1) / STATUS_ORDER.length) * 100}%`, background: "var(--gradient-accent)" }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="glass-card p-5 text-sm animate-slide-up sm:p-6" style={{ animationDelay: "0.05s" }}>
            <h2 className="mb-2 font-bold text-white">รายละเอียดปัญหา</h2>
            <p className="whitespace-pre-wrap leading-7" style={{ color: "var(--text-secondary)" }}>{ticket.description}</p>
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              {[
                ["เลขทรัพย์สิน", ticket.asset_code || "-"],
                ["Serial", ticket.serial_number || "-"],
                ["สถานที่", ticket.location || "-"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
                  <p style={{ color: "var(--text-muted)" }}>{k}</p>
                  <p className="mt-0.5 font-bold text-white">{v}</p>
                </div>
              ))}
            </div>
            {(ticket.diagnosis || ticket.work_performed || ticket.parts_used || ticket.resolution) && (
              <div className="mt-4 space-y-2">
                {ticket.diagnosis && <div className="rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Diagnosis</p><p className="text-sm text-white">{ticket.diagnosis}</p></div>}
                {ticket.work_performed && <div className="rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Work performed</p><p className="text-sm text-white">{ticket.work_performed}</p></div>}
                {ticket.parts_used && <div className="rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Parts used</p><p className="text-sm text-white">{ticket.parts_used}</p></div>}
                {ticket.resolution && <div className="rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Resolution</p><p className="text-sm text-white">{ticket.resolution}</p></div>}
              </div>
            )}
          </div>
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="mb-3 font-bold text-white">ประวัติการดำเนินงาน</h2>
            <div className="space-y-2 text-sm">
              {history.map((h) => (
                <div key={h.id} className="rounded-xl p-3 text-xs leading-6" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  <p><b className="text-white">{h.actor.name}</b> • {new Date(h.created_at).toLocaleString("th-TH")} {h.is_internal && <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">internal</span>}</p>
                  <p>{h.from_status} → <b style={{ color: "var(--text-accent)" }}>{h.to_status}</b></p>
                  {h.note && <p style={{ color: "var(--text-muted)" }}>หมายเหตุ: {h.note}</p>}
                </div>
              ))}
              {history.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีประวัติ</p>}
            </div>
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border-subtle)" }}>
              <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>ติดตามเพิ่มเติม / ถามช่าง</label>
              <div className="flex gap-2">
                <input value={comment} onChange={(e) => setComment(e.target.value)} className="glass-input w-full px-3 py-2 text-xs" placeholder="พิมพ์ข้อความติดตาม…" />
                <button onClick={addComment} disabled={commentLoading || !comment.trim()} className="shrink-0 rounded-xl px-4 text-xs font-semibold disabled:opacity-50" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-medium)", color: "var(--text-secondary)" }}>
                  ส่ง
                </button>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "0.12s" }}>
            <h2 className="mb-3 font-bold text-white">ไฟล์แนบ ({attachments.length})</h2>
            <div className="space-y-2 text-xs">
              {attachments.map((a) => (
                <a key={a.id} href={`/api/attachments/${a.id}`} className="flex items-center justify-between rounded-xl p-3 hover:underline" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  <span className="truncate">{a.filename}</span>
                  <span style={{ color: "var(--text-muted)" }}>{(a.size / 1024).toFixed(1)} KB</span>
                </a>
              ))}
              {attachments.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีไฟล์แนบ</p>}
            </div>
            <label className="mt-3 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>อัปโหลด (สูงสุด 10MB)</label>
            <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} className="mt-1 w-full text-xs" style={{ color: "var(--text-secondary)" }} />
          </div>
        </div>

        {canManage && (
          <div className="glass-card h-fit space-y-3 p-5 text-sm animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-bold text-white">จัดการงาน (ช่าง/แอดมิน)</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>วิธีแก้ / บันทึกช่าง</label>
              <textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={3} className="glass-input w-full px-3 py-2 text-sm" placeholder="เช่น เปลี่ยน RAM แล้วใช้งานได้ปกติ" />
              <div className="mt-2 grid gap-2">
                <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Diagnosis — ผลวินิจฉัย" />
                <input value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Work performed — งานที่ทำ" />
                <input value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Parts used — อะไหล่ที่ใช้" />
                <input value={resolution} onChange={(e) => setResolution(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Resolution — สรุปวิธีแก้" />
              </div>
              <button onClick={saveSolution} disabled={actionLoading} className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-medium)", color: "var(--text-secondary)" }}>
                บันทึกโน้ต
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>ผูกครุภัณฑ์ (เลขทรัพย์สิน / Serial)</label>
              <div className="grid gap-2">
                <input value={assetCode} onChange={(e) => setAssetCode(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="เลขทรัพย์สิน (เช่น JP-PC-001)" />
                <input value={assetSerial} onChange={(e) => setAssetSerial(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Serial number" />
              </div>
              <button onClick={saveAsset} disabled={actionLoading} className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-medium)", color: "var(--text-secondary)" }}>
                บันทึกครุภัณฑ์
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>หมายเหตุการเปลี่ยนสถานะ</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="เช่น รออะไหล่จาก supplier" />
              <label className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                บันทึกเป็น internal (requester มองไม่เห็น)
              </label>
            </div>
            {actionError && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{actionError}</p>}
            <div className="grid grid-cols-2 gap-2">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={actionLoading}
                  className="rounded-xl px-2 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-medium)", color: "var(--text-secondary)" }}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
              {nextStatuses.length === 0 && <p className="col-span-2 text-xs" style={{ color: "var(--text-muted)" }}>ไม่มีสถานะถัดไป</p>}
            </div>
            {(ticket.status === "CLOSED" || ticket.status === "RESOLVED") && (
              <button onClick={handleReopen} disabled={actionLoading} className="w-full rounded-xl py-2 text-xs font-semibold" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.3)", color: "#f472b6" }}>
                Reopen งานนี้
              </button>
            )}
            {me?.role === "ADMIN" && (
              <div className="pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>มอบหมายช่าง</label>
                <div className="flex gap-2">
                  <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="glass-select w-full px-2 py-2 text-xs">
                    <option value="">— เลือกช่าง —</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                  <button onClick={assign} disabled={actionLoading || !assignTo} className="btn-gradient shrink-0 px-4 text-xs disabled:opacity-50">มอบหมาย</button>
                </div>
              </div>
            )}
          </div>
        )}
        {!canManage && (ticket.status === "CLOSED" || ticket.status === "RESOLVED") && (
          <div className="glass-card h-fit p-5 text-sm animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-bold text-white">การดำเนินการ</h2>
            <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>หากปัญหายังไม่หาย สามารถเปิดงานใหม่ได้</p>
            <div>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="glass-input w-full px-3 py-2 text-xs" placeholder="เหตุผลที่ reopen" />
              <button onClick={handleReopen} disabled={actionLoading} className="mt-2 w-full rounded-xl py-2 text-xs font-semibold" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.3)", color: "#f472b6" }}>
                Reopen งานนี้
              </button>
            </div>
            {actionError && <p className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{actionError}</p>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
