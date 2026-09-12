import type { ReactNode } from "react";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 animate-fade-in">
      <div>
        <h1 className="bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
          {title}
        </h1>
        {sub && <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="glass-card flex flex-col items-center gap-2 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
        📭
      </div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{text}</p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
      {children}
    </span>
  );
}
