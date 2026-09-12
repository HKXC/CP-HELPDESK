"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  Search,
  Package,
  BookOpen,
  Wrench,
  ShieldCheck,
  BarChart3,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Terminal,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "TECH" | "ADMIN";
  department?: string | null;
}

const NAV_USER = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/new-ticket", label: "แจ้งซ่อมใหม่", icon: PlusCircle },
  { href: "/my-tickets", label: "รายการของฉัน", icon: ListChecks },
  { href: "/track", label: "ติดตามสถานะ", icon: Search },
  { href: "/assets", label: "ครุภัณฑ์", icon: Package },
  { href: "/knowledge", label: "คู่มือ / บทความ", icon: BookOpen },
];

const NAV_TECH = [{ href: "/technician", label: "งานที่ได้รับมอบหมาย", icon: Wrench }];

const NAV_ADMIN = [
  { href: "/admin", label: "จัดการงานทั้งหมด", icon: ShieldCheck },
  { href: "/admin?tab=assets", label: "จัดการครุภัณฑ์", icon: ClipboardList },
  { href: "/admin?tab=reports", label: "รายงาน", icon: BarChart3 },
  { href: "/terminal", label: "Terminal", icon: Terminal },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const u = await res.json();
          if (!cancelled) setUser(u);
        } else {
          if (!cancelled) setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    fetchMe();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!ready)
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400">กำลังโหลด…</p>
        </div>
      </div>
    );

  // หน้า login ไม่ใช้ shell
  if (path === "/login") return <>{children}</>;

  if (!user) {
    router.replace("/login");
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <p className="text-sm text-slate-400">กำลังไปหน้าเข้าสู่ระบบ…</p>
      </div>
    );
  }

  const items = [
    ...NAV_USER,
    ...(user.role === "TECH" || user.role === "ADMIN" ? NAV_TECH : []),
    ...(user.role === "ADMIN" ? NAV_ADMIN : []),
  ];

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/track?q=${encodeURIComponent(q.trim())}`);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const sidebar = (
    <div className="flex h-full flex-col" style={{ background: "var(--gradient-sidebar)" }}>
      {/* Logo header */}
      <div className="flex items-center gap-3 border-b px-4 py-4" style={{ borderColor: "var(--border-subtle)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/cp-logo.png"
          alt="CP Logo"
          className="h-10 w-10 shrink-0 rounded-xl object-contain"
          style={{ background: "rgba(255,255,255,0.1)", padding: "4px" }}
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold tracking-tight text-white">CP Helpdesk</p>
            <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
              แจ้งซ่อมครุภัณฑ์ IT
            </p>
          </div>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <form onSubmit={submitSearch} className="px-3 pt-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}
          >
            <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาเลข Ticket / อาการ…"
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "var(--text-primary)" }}
            />
            <kbd
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              ⌘K
            </kbd>
          </div>
        </form>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {!collapsed ? "เมนูหลัก" : "•"}
        </p>
        {items.slice(0, 6).map((m) => (
          <SideLink
            key={m.href + m.label}
            href={m.href}
            label={m.label}
            icon={m.icon}
            active={path === m.href}
            collapsed={collapsed}
            onClick={() => setMobileOpen(false)}
          />
        ))}
        {(user.role === "TECH" || user.role === "ADMIN") && (
          <>
            <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {!collapsed ? "ช่างซ่อม" : "•"}
            </p>
            {items.slice(6, 7).map((m) => (
              <SideLink
                key={m.label}
                href={m.href}
                label={m.label}
                icon={m.icon}
                active={path.startsWith("/technician")}
                collapsed={collapsed}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </>
        )}
        {user.role === "ADMIN" && (
          <>
            <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {!collapsed ? "ผู้ดูแลระบบ" : "•"}
            </p>
            {items.slice(7).map((m) => (
              <SideLink
                key={m.label}
                href={m.href}
                label={m.label}
                icon={m.icon}
                active={m.href === "/terminal" ? path === "/terminal" : path.startsWith("/admin")}
                collapsed={collapsed}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </>
        )}
      </nav>

      {/* User panel */}
      <div className="p-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        {!collapsed && (
          <div className="mb-2 rounded-xl p-3 text-xs" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "var(--gradient-accent)" }}
              >
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{user.name}</p>
                <p style={{ color: "var(--text-muted)" }}>
                  {user.role} • {user.department}
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
            e.currentTarget.style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <LogOut className="h-4 w-4" /> {!collapsed && "ออกจากระบบ"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Ambient glow effects */}
      <div className="ambient-glow" style={{ background: "#6366f1", top: "-200px", left: "-200px" }} />
      <div className="ambient-glow" style={{ background: "#8b5cf6", bottom: "-200px", right: "-100px" }} />

      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 md:block transition-all duration-300 ${collapsed ? "w-[76px]" : "w-[280px]"}`}
        style={{ borderRight: "1px solid var(--border-subtle)" }}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[300px] animate-slide-in-left" style={{ borderRight: "1px solid var(--border-subtle)" }}>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col relative z-10">
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
          style={{ background: "rgba(11, 15, 26, 0.8)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <button
            className="rounded-lg p-2 md:hidden transition-colors"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            className="hidden rounded-lg p-2 md:block transition-colors"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
          <form onSubmit={submitSearch} className="hidden max-w-md flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm sm:flex glass-input">
            <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา Ticket / เลขทรัพย์สิน / Serial…"
              className="w-full bg-transparent outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </form>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden rounded-full px-3 py-1 text-xs font-semibold text-white sm:block" style={{ background: "var(--gradient-accent)" }}>
              {user.role}
            </span>
            <span className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
              {user.name}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 animate-fade-in">{children}</main>

        <footer className="px-6 py-3 text-xs" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
          © 2026 CP Helpdesk • ระบบแจ้งซ่อมครุภัณฑ์
        </footer>
      </div>
    </div>
  );
}

function SideLink({ href, label, icon: Icon, active, collapsed, onClick }: { href: string; label: string; icon: React.ElementType; active: boolean; collapsed: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        active ? "text-white shadow-[0_0_12px_rgba(99,102,241,0.2)]" : "hover:bg-white/5"
      }`}
      style={active ? { background: "var(--gradient-accent)" } : { color: "var(--text-secondary)" }}
      title={label}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
