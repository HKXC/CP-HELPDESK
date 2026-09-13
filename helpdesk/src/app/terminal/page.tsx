"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

// Types
interface Health {
  status: string;
  db: string;
  latency_ms: number;
  timestamp: string;
}
interface Overview {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  recent: Array<{
    id: string;
    ticket_no: string;
    title: string;
    status: string;
    asset_code: string | null;
    category: string;
    requester: { name: string };
    location: string | null;
    created_at: string;
  }>;
  overdue: number;
}
interface TicketRow {
  id: string;
  ticket_no: string;
  title: string;
  status: string;
  asset_code: string | null;
  category: string;
  requester: { name: string };
  location: string | null;
  created_at: string;
}
interface LogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
  actor: { name: string; email: string };
}

const STATUS_THAI: Record<string, string> = {
  NEW: "ใหม่",
  TRIAGED: "คัดกรองแล้ว",
  ASSIGNED: "มอบหมายแล้ว",
  IN_PROGRESS: "กำลังซ่อม",
  WAITING_REQUESTER: "รอข้อมูล",
  WAITING_PARTS: "รออะไหล่",
  RESOLVED: "แก้ไขแล้ว",
  CLOSED: "ปิดงาน",
  REOPENED: "เปิดใหม่",
  CANCELLED: "ยกเลิก",
};

function Pill({ status }: { status: string }) {
  const cls = status === "NEW" || status === "TRIAGED" || status === "ASSIGNED" ? "open"
    : status === "IN_PROGRESS" || status === "WAITING_REQUESTER" || status === "WAITING_PARTS" || status === "REOPENED" ? "progress"
    : status === "RESOLVED" || status === "CLOSED" ? "closed"
    : status === "CANCELLED" ? "cancelled"
    : "open";
  return <span className={`pill ${cls}`}>{STATUS_THAI[status] || status}</span>;
}

export default function TerminalPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLatency, setHealthLatency] = useState<number | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("blk-status");
  const [ticketApiLatency, setTicketApiLatency] = useState<number | null>(null);
  const [ticketApiOk, setTicketApiOk] = useState<"ok" | "warn" | "down">("ok");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Check auth first
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (meRes.ok) {
          const me = await meRes.json();
          if (!cancelled) setMeRole(me.role);
        } else {
          if (!cancelled) setMeRole(null);
        }
      } catch {
        if (!cancelled) setMeRole(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }

      // Health
      try {
        const t0 = Date.now();
        const r = await fetch("/api/health", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) {
          setHealth(j);
          setHealthLatency(Date.now() - t0);
          if (!r.ok) setHealthError(j.db || "disconnected");
        }
      } catch (e) {
        if (!cancelled) setHealthError(e instanceof Error ? e.message : "fetch failed");
      }

      // Overview
      try {
        const r = await fetch("/api/overview", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) setOverview(j);
        } else {
          const j = await r.json().catch(() => ({}));
          if (!cancelled) setOverviewError(j.error || `HTTP ${r.status}`);
        }
      } catch (e) {
        if (!cancelled) setOverviewError(e instanceof Error ? e.message : "fetch failed");
      }

      // Tickets recent
      try {
        const t0 = Date.now();
        const r = await fetch("/api/tickets?limit=5&sort=created_at&order=desc", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) {
            setTickets(j.tickets || []);
            const lat = Date.now() - t0;
            setTicketApiLatency(lat);
            if (lat > 1000) setTicketApiOk("down");
            else if (lat > 500) setTicketApiOk("warn");
            else setTicketApiOk("ok");
          }
        } else {
          if (!cancelled) {
            setTicketsError(`HTTP ${r.status}`);
            setTicketApiOk("down");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setTicketsError(e instanceof Error ? e.message : "fetch failed");
          setTicketApiOk("down");
        }
      }

      // Logs
      try {
        const r = await fetch("/api/logs?limit=20", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) setLogs(j.logs || []);
        } else {
          const j = await r.json().catch(() => ({}));
          // 403 for non-admin is expected - show empty rather than error
          if (r.status === 403) {
            if (!cancelled) setLogs([]);
          } else {
            if (!cancelled) setLogsError(j.error || `HTTP ${r.status}`);
          }
        }
      } catch (e) {
        if (!cancelled) setLogsError(e instanceof Error ? e.message : "fetch failed");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const scrollTo = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (meLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (meRole !== "ADMIN") {
    return (
      <AppShell>
        <div className="glass-card mx-auto mt-10 max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>⛔</div>
          <h1 className="text-lg font-bold text-white">เข้าถึงได้เฉพาะ ADMIN</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Terminal เป็นเครื่องมือสำหรับผู้ดูแลระบบเท่านั้น</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Your role: {meRole || "none"}</p>
        </div>
      </AppShell>
    );
  }

  const dbOk = health?.db === "connected" && health?.status === "ok";
  const dbLatency = healthLatency ?? health?.latency_ms ?? null;
  const dbState: "ok" | "warn" | "down" = !health ? "down" : healthError ? "down" : dbOk ? (dbLatency !== null && dbLatency > 800 ? "warn" : "ok") : "down";
  const devServerState: "ok" = "ok"; // page rendered means dev server is up

  const total = overview?.total ?? 0;
  const maxBar = Math.max(total, 1);

  return (
    <AppShell>
      {/* JetBrains Mono for terminal */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="terminal-wrapper">
        <style>{`
          .terminal-wrapper {
            --void: #080C14;
            --term-bg: #0E1520;
            --panel: #131B29;
            --panel-raised: #17202F;
            --border: #223047;
            --border-soft: #192335;
            --text-hi: #E3EAF3;
            --text-mid: #93A2B7;
            --text-dim: #4C5B72;
            --cyan: #5EEAD4;
            --blue: #7DA6FF;
            --green: #4ADE80;
            --amber: #F2B84B;
            --red: #FF6E6E;
            --mono: 'JetBrains Mono', ui-monospace, monospace;
            --ui: 'Inter', system-ui, sans-serif;
          }
          .terminal-window{
            width:100%;
            max-width: 980px;
            margin: 0 auto;
            background: var(--term-bg);
            border:1px solid var(--border);
            border-radius: 12px;
            box-shadow: 0 40px 80px -20px rgba(0,0,0,0.6);
            overflow:hidden;
            animation: windowIn .5s ease-out;
          }
          @keyframes windowIn{
            from{ opacity:0; transform: translateY(8px) scale(.99); }
            to{ opacity:1; transform: translateY(0) scale(1); }
          }
          .title-bar{
            display:flex; align-items:center; gap:14px;
            padding: 12px 16px;
            background: var(--panel);
            border-bottom:1px solid var(--border);
          }
          .dots{ display:flex; gap:7px; }
          .dot{ width:11px; height:11px; border-radius:50%; }
          .dot.r{ background:#FF5F57; } .dot.y{ background:#FEBC2E; } .dot.g{ background:#28C840; }
          .title-bar .name{
            font-size:13px; color: var(--text-mid); font-weight:500;
            display:flex; align-items:center; gap:8px;
          }
          .title-bar .name b{ color: var(--text-hi); font-weight:600; }
          .conn-status{
            margin-left:auto;
            display:flex; align-items:center; gap:7px;
            font-size:12px; color: var(--text-mid);
          }
          .pulse{
            width:7px; height:7px; border-radius:50%;
            background: var(--green);
            box-shadow:0 0 0 0 rgba(74,222,128,.6);
            animation: pulse 2.2s infinite;
          }
          @keyframes pulse{
            0%{ box-shadow:0 0 0 0 rgba(74,222,128,.55); }
            70%{ box-shadow:0 0 0 7px rgba(74,222,128,0); }
            100%{ box-shadow:0 0 0 0 rgba(74,222,128,0); }
          }
          .tab-bar{
            display:flex; gap:2px;
            padding: 8px 12px 0;
            background: var(--panel);
            border-bottom:1px solid var(--border);
            overflow-x:auto;
          }
          .tab{
            font-family: var(--ui);
            font-size:12.5px; font-weight:500;
            color: var(--text-mid);
            background:transparent;
            border:none;
            padding:9px 14px 11px;
            cursor:pointer;
            border-bottom:2px solid transparent;
            white-space:nowrap;
            display:flex; align-items:center; gap:7px;
            transition: color .15s ease;
          }
          .tab .tag{ font-family:var(--mono); font-size:11px; color:var(--text-dim); }
          .tab:hover{ color: var(--text-hi); }
          .tab.active{ color: var(--cyan); border-bottom-color: var(--cyan); }
          .tab.active .tag{ color: var(--cyan); opacity:.7; }
          .terminal-body{
            padding: 20px 22px 12px;
            max-height: 66vh;
            overflow-y:auto;
            font-family: var(--mono);
            background: var(--term-bg);
          }
          .terminal-body::-webkit-scrollbar{ width:8px; }
          .terminal-body::-webkit-scrollbar-thumb{ background: var(--border); border-radius:4px; }
          .block{
            margin-bottom: 26px;
            opacity:0;
            animation: blockIn .45s ease-out forwards;
          }
          @keyframes blockIn{
            from{ opacity:0; transform: translateY(6px); }
            to{ opacity:1; transform: translateY(0); }
          }
          .prompt-line{
            display:flex; align-items:baseline; gap:8px;
            font-size:13.5px;
            margin-bottom:10px;
            flex-wrap: wrap;
          }
          .prompt-line .user{ color: var(--cyan); font-weight:600; }
          .prompt-line .path{ color: var(--blue); }
          .prompt-line .sym{ color: var(--text-dim); }
          .prompt-line .cmd{ color: var(--text-hi); font-weight:500; }
          .output{
            background: var(--panel);
            border: 1px solid var(--border-soft);
            border-radius: 8px;
            padding: 16px 18px;
          }
          .output.err{ border-left:3px solid var(--red); }
          .output.ok-border{ border-left:3px solid var(--green); }
          .status-grid{
            display:grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 14px;
          }
          .svc{ font-size:13px; }
          .svc-head{ display:flex; align-items:center; gap:8px; margin-bottom:4px; }
          .svc-dot{ width:8px; height:8px; border-radius:50%; flex-shrink:0; }
          .svc-dot.ok{ background:var(--green); box-shadow:0 0 8px rgba(74,222,128,.5); }
          .svc-dot.warn{ background:var(--amber); }
          .svc-dot.down{ background:var(--red); }
          .svc-name{ color:var(--text-hi); font-weight:600; }
          .svc-meta{ color:var(--text-dim); font-size:11.5px; padding-left:16px; }
          .svc-state{ padding-left:16px; font-size:12px; margin-top:2px; }
          .svc-state.ok{ color:var(--green); } .svc-state.warn{ color:var(--amber); } .svc-state.down{ color:var(--red); }
          .kv-row{
            display:flex; align-items:center; gap:14px;
            padding:7px 0;
            border-bottom:1px dashed var(--border-soft);
            font-size:13px;
          }
          .kv-row:last-child{ border-bottom:none; }
          .kv-label{ color: var(--text-mid); width:170px; flex-shrink:0; }
          .kv-value{ color: var(--text-hi); font-weight:600; width:56px; flex-shrink:0; }
          .kv-bar-track{ flex:1; height:6px; background:var(--panel-raised); border-radius:3px; overflow:hidden; }
          .kv-bar-fill{ height:100%; border-radius:3px; }
          .db-table{ width:100%; border-collapse:collapse; font-size:12.5px; }
          .db-table th{
            text-align:left; color: var(--text-dim); font-weight:500;
            padding:0 12px 8px 0; border-bottom:1px solid var(--border);
            font-size:11px;
          }
          .db-table td{
            padding:8px 12px 8px 0; color: var(--text-hi);
            border-bottom:1px solid var(--border-soft);
            white-space:nowrap;
          }
          .db-table tr:last-child td{ border-bottom:none; }
          .pill{
            font-size:10.5px; padding:2px 8px; border-radius:20px;
            font-weight:600; display:inline-block;
          }
          .pill.open{ background:rgba(255,110,110,.12); color:var(--red); }
          .pill.progress{ background:rgba(242,184,75,.12); color:var(--amber); }
          .pill.closed{ background:rgba(74,222,128,.12); color:var(--green); }
          .pill.cancelled{ background:rgba(239,68,68,.12); color:var(--red); }
          .log-line{
            display:flex; gap:10px; font-size:12.5px; padding:5px 0;
            border-bottom:1px solid var(--border-soft);
          }
          .log-line:last-child{ border-bottom:none; }
          .log-time{ color: var(--text-dim); flex-shrink:0; width:78px; font-size:11px; }
          .log-level{ flex-shrink:0; width:52px; font-weight:700; font-size:11px; }
          .log-level.ERROR{ color:var(--red); }
          .log-level.WARN{ color:var(--amber); }
          .log-level.INFO{ color:var(--blue); }
          .log-msg{ color:var(--text-mid); flex:1; min-width: 0; word-break: break-word; }
          .log-msg b{ color:var(--text-hi); font-weight:600; }
          .log-src{ color: var(--text-dim); font-size:11px; }
          .live-prompt{
            display:flex; align-items:center; gap:8px; font-size:13.5px;
            padding: 4px 0 4px;
          }
          .cursor{
            width:7px; height:15px; background: var(--cyan);
            animation: blink 1.05s steps(1) infinite;
          }
          @keyframes blink{ 50%{ opacity:0; } }
          @media (max-width:640px){
            .kv-label{ width:120px; }
            .db-table{ display:block; overflow-x:auto; }
          }
          .empty-terminal{
            color: var(--text-dim);
            font-size: 12.5px;
            padding: 12px 0;
            text-align: center;
          }
        `}</style>

        <div className="terminal-window">
          <div className="title-bar">
            <div className="dots"><span className="dot r"></span><span className="dot y"></span><span className="dot g"></span></div>
            <div className="name"><b>CP HELPDESK</b> — ระบบแจ้งซ่อมครุภัณฑ์</div>
            <div className="conn-status"><span className="pulse"></span> localhost:4502</div>
          </div>

          <div className="tab-bar" id="tabBar">
            <button className={`tab ${activeTab === "blk-status" ? "active" : ""}`} onClick={() => scrollTo("blk-status")}><span className="tag">$</span>status</button>
            <button className={`tab ${activeTab === "blk-overview" ? "active" : ""}`} onClick={() => scrollTo("blk-overview")}><span className="tag">$</span>overview</button>
            <button className={`tab ${activeTab === "blk-db" ? "active" : ""}`} onClick={() => scrollTo("blk-db")}><span className="tag">$</span>db --recent</button>
            <button className={`tab ${activeTab === "blk-errors" ? "active" : ""}`} onClick={() => scrollTo("blk-errors")}><span className="tag">$</span>logs --level=error</button>
          </div>

          <div className="terminal-body" id="termBody">
            {/* BLOCK 1 — STATUS */}
            <div className="block" id="blk-status" style={{ animationDelay: ".05s" }}>
              <div className="prompt-line">
                <span className="user">cp@helpdesk</span><span className="sym">:</span>
                <span className="path">~/HELPDESK 004/helpdesk</span>
                <span className="sym">$</span><span className="cmd">helpdesk status</span>
              </div>
              <div className={`output ${healthError || dbState === "down" ? "err" : dbState === "warn" ? "" : "ok-border"}`}>
                {healthError && (
                  <div className="mb-3 rounded px-3 py-2 text-xs font-semibold" style={{ background: "rgba(255,110,110,0.08)", color: "var(--red)", border: "1px solid rgba(255,110,110,0.2)" }}>
                    ✖ Database connection failed: {healthError}
                  </div>
                )}
                <div className="status-grid">
                  <div className="svc">
                    <div className="svc-head"><span className={`svc-dot ${devServerState}`}></span><span className="svc-name">Dev Server</span></div>
                    <div className="svc-meta">npm run dev:4502</div>
                    <div className={`svc-state ${devServerState}`}>RUNNING · localhost:4502</div>
                  </div>
                  <div className="svc">
                    <div className="svc-head"><span className={`svc-dot ${dbState}`}></span><span className="svc-name">Database</span></div>
                    <div className="svc-meta">PostgreSQL 17 · helpdesk</div>
                    <div className={`svc-state ${dbState}`}>
                      {dbState === "ok" ? `CONNECTED · ${dbLatency ?? health?.latency_ms ?? "-"}ms latency` : dbState === "warn" ? `SLOW · ${dbLatency ?? "?"}ms latency` : `DOWN · ${healthError || "disconnected"}`}
                    </div>
                  </div>
                  <div className="svc">
                    <div className="svc-head"><span className={`svc-dot ${ticketApiOk}`}></span><span className="svc-name">Ticket API</span></div>
                    <div className="svc-meta">/api/tickets · /api/overview</div>
                    <div className={`svc-state ${ticketApiOk}`}>
                      {ticketApiOk === "ok" ? `OK · ${ticketApiLatency ?? "-"}ms` : ticketApiOk === "warn" ? `SLOW · ${ticketApiLatency}ms p95` : `DOWN · timeout`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCK 2 — OVERVIEW */}
            <div className="block" id="blk-overview" style={{ animationDelay: ".12s" }}>
              <div className="prompt-line">
                <span className="user">cp@helpdesk</span><span className="sym">:</span>
                <span className="path">~/HELPDESK 004/helpdesk</span>
                <span className="sym">$</span><span className="cmd">helpdesk overview --today</span>
              </div>
              <div className="output">
                {overviewError ? (
                  <div className="empty-terminal">✖ Failed to load overview: {overviewError}</div>
                ) : !overview ? (
                  <div className="empty-terminal">Loading…</div>
                ) : overview.total === 0 ? (
                  <div className="empty-terminal">ยังไม่มีข้อมูล — สร้างใบแจ้งซ่อมแรกเพื่อดูสรุปที่นี่</div>
                ) : (
                  <>
                    <div className="kv-row">
                      <div className="kv-label">แจ้งซ่อมทั้งหมด</div>
                      <div className="kv-value">{overview.total}</div>
                      <div className="kv-bar-track"><div className="kv-bar-fill" style={{ width: "100%", background: "var(--blue)" }}></div></div>
                    </div>
                    <div className="kv-row">
                      <div className="kv-label">ใหม่ / คัดกรอง</div>
                      <div className="kv-value">{(overview.byStatus["NEW"] || 0) + (overview.byStatus["TRIAGED"] || 0)}</div>
                      <div className="kv-bar-track"><div className="kv-bar-fill" style={{ width: `${Math.round(((overview.byStatus["NEW"] || 0) + (overview.byStatus["TRIAGED"] || 0)) / maxBar * 100)}%`, background: "var(--red)" }}></div></div>
                    </div>
                    <div className="kv-row">
                      <div className="kv-label">กำลังซ่อม</div>
                      <div className="kv-value">{(overview.byStatus["ASSIGNED"] || 0) + (overview.byStatus["IN_PROGRESS"] || 0) + (overview.byStatus["WAITING_REQUESTER"] || 0) + (overview.byStatus["WAITING_PARTS"] || 0)}</div>
                      <div className="kv-bar-track"><div className="kv-bar-fill" style={{ width: `${Math.round(((overview.byStatus["ASSIGNED"] || 0) + (overview.byStatus["IN_PROGRESS"] || 0) + (overview.byStatus["WAITING_REQUESTER"] || 0) + (overview.byStatus["WAITING_PARTS"] || 0)) / maxBar * 100)}%`, background: "var(--amber)" }}></div></div>
                    </div>
                    <div className="kv-row">
                      <div className="kv-label">ซ่อมเสร็จ / ปิดงาน</div>
                      <div className="kv-value">{(overview.byStatus["RESOLVED"] || 0) + (overview.byStatus["CLOSED"] || 0)}</div>
                      <div className="kv-bar-track"><div className="kv-bar-fill" style={{ width: `${Math.round(((overview.byStatus["RESOLVED"] || 0) + (overview.byStatus["CLOSED"] || 0)) / maxBar * 100)}%`, background: "var(--green)" }}></div></div>
                    </div>
                    {overview.overdue > 0 && (
                      <div className="kv-row">
                        <div className="kv-label">เกินกำหนด</div>
                        <div className="kv-value" style={{ color: "var(--red)" }}>{overview.overdue}</div>
                        <div className="kv-bar-track"><div className="kv-bar-fill" style={{ width: `${Math.round(overview.overdue / maxBar * 100)}%`, background: "var(--red)" }}></div></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* BLOCK 3 — DB DATA */}
            <div className="block" id="blk-db" style={{ animationDelay: ".19s" }}>
              <div className="prompt-line">
                <span className="user">cp@helpdesk</span><span className="sym">:</span>
                <span className="path">~/HELPDESK 004/helpdesk</span>
                <span className="sym">$</span><span className="cmd">helpdesk db --table=tickets --recent 5</span>
              </div>
              <div className="output">
                {ticketsError ? (
                  <div className="empty-terminal">✖ {ticketsError}</div>
                ) : tickets.length === 0 ? (
                  <div className="empty-terminal">ยังไม่มีข้อมูล — ตารางว่าง</div>
                ) : (
                  <table className="db-table">
                    <thead>
                      <tr><th>ID</th><th>ครุภัณฑ์</th><th>หน่วยงาน</th><th>ผู้แจ้ง</th><th>สถานะ</th><th>วันที่แจ้ง</th></tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id}>
                          <td>{t.ticket_no}</td>
                          <td>{t.asset_code || t.category}</td>
                          <td>{t.location || "-"}</td>
                          <td>{t.requester.name}</td>
                          <td><Pill status={t.status} /></td>
                          <td>{new Date(t.created_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* BLOCK 4 — LOGS */}
            <div className="block" id="blk-errors" style={{ animationDelay: ".26s" }}>
              <div className="prompt-line">
                <span className="user">cp@helpdesk</span><span className="sym">:</span>
                <span className="path">~/HELPDESK 004/helpdesk</span>
                <span className="sym">$</span><span className="cmd">helpdesk logs --tail 20</span>
              </div>
              <div className={`output ${logs.some(l => l.action.includes("error")) ? "err" : ""}`}>
                {logsError ? (
                  <div className="empty-terminal">✖ {logsError}</div>
                ) : logs.length === 0 ? (
                  <div className="empty-terminal">No logs yet — activity will appear here</div>
                ) : (
                  logs.map((log) => {
                    const d = new Date(log.created_at);
                    const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
                    const isError = log.action.includes("error") || log.action.includes("failed");
                    const level = isError ? "ERROR" : log.action.includes("warn") ? "WARN" : "INFO";
                    return (
                      <div key={log.id} className="log-line">
                        <div className="log-time">{time}</div>
                        <div className={`log-level ${level}`}>{level}</div>
                        <div className="log-msg"><b>{log.action}</b> — {log.entity_type} {log.entity_id.slice(0,8)} <span className="log-src">({log.actor.name})</span></div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* live prompt */}
            <div className="live-prompt">
              <span className="user" style={{ color: "var(--cyan)", fontWeight: 600 }}>cp@helpdesk</span><span className="sym" style={{ color: "var(--text-dim)" }}>:</span>
              <span className="path" style={{ color: "var(--blue)" }}>~/HELPDESK 004/helpdesk</span>
              <span className="sym" style={{ color: "var(--text-dim)" }}>$</span>
              <span className="cursor"></span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
