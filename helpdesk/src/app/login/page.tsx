"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("user@jp.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  const quick = (em: string) => {
    setEmail(em);
    setPassword("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4" style={{ background: "var(--bg-primary)" }}>
      {/* Ambient glow orbs */}
      <div
        className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        className="absolute top-1/4 right-1/4 h-[300px] w-[300px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)", filter: "blur(60px)" }}
      />

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="glass-card p-8">
          <div className="mb-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/cp-logo.png" alt="CP" className="h-12 w-12 rounded-2xl object-contain" style={{ background: "rgba(255,255,255,0.1)", padding: "4px" }} />
            <div>
              <h1 className="text-xl font-extrabold text-white">CP Helpdesk</h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                ระบบแจ้งซ่อมอุปกรณ์ครุภัณฑ์
              </p>
            </div>
          </div>

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                อีเมล
              </label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input mt-1 w-full px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                รหัสผ่าน
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input mt-1 w-full px-3 py-2.5 text-sm" />
            </div>
            {error && (
              <p
                className="rounded-lg px-3 py-2 text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                {error}
              </p>
            )}
            <button disabled={loading} className="btn-gradient w-full py-2.5 text-sm disabled:opacity-60">
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>

          <div className="mt-6 rounded-xl p-4 text-xs" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
            <p className="mb-3 font-semibold" style={{ color: "var(--text-secondary)" }}>
              บัญชีทดสอบ:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "User", em: "user@jp.local", color: "rgba(16,185,129,0.15)", text: "#34d399" },
                { label: "Tech", em: "tech@jp.local", color: "rgba(59,130,246,0.15)", text: "#60a5fa" },
                { label: "Admin", em: "admin@jp.local", color: "rgba(139,92,246,0.15)", text: "#a78bfa" },
              ].map((acc) => (
                <button
                  key={acc.label}
                  onClick={() => quick(acc.em)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105"
                  style={{ background: acc.color, color: acc.text, border: `1px solid ${acc.text}30` }}
                >
                  {acc.label}: {acc.em}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
