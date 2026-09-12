"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Empty, Field, PageHeader } from "@/components/ui";

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  serial_number: string;
  tags: string[];
  location: string | null;
  status: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ asset_code: "", name: "", category: "คอมพิวเตอร์", serial_number: "", tags: "", location: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const load = async (query?: string) => {
    setLoading(true);
    try {
      const url = query ? `/api/assets?q=${encodeURIComponent(query)}&limit=100` : "/api/assets?limit=100";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setRole(u?.role || null));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.asset_code.trim() || !form.name.trim() || !form.serial_number.trim()) {
      setError("กรุณากรอกเลขทรัพย์สิน ชื่อ และ Serial");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_code: form.asset_code.trim(),
          name: form.name.trim(),
          category: form.category,
          serial_number: form.serial_number.trim(),
          tags: form.tags,
          location: form.location,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "บันทึกไม่สำเร็จ");
        return;
      }
      setForm({ asset_code: "", name: "", category: "คอมพิวเตอร์", serial_number: "", tags: "", location: "" });
      load(q);
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("ลบครุภัณฑ์นี้?")) return;
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "ลบไม่สำเร็จ");
      return;
    }
    load(q);
  };

  return (
    <AppShell>
      <PageHeader title="ครุภัณฑ์" sub="ค้นหาด้วยเลขทรัพย์สิน • Tags • Serial number" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา JP-PC-001 / SN-… / ปริ้นเตอร์…" className="glass-input mb-4 w-full max-w-lg px-4 py-2.5 text-sm" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2.5 lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {assets.map((a) => (
                <div key={a.id} className="glass-card p-4 text-sm animate-slide-up">
                  <div className="flex items-start gap-3">
                    <Link href={`/assets/${a.id}`} className="min-w-0 flex-1">
                      <p className="font-bold text-white hover:underline">{a.asset_code} • {a.name}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>SN: {a.serial_number || "-"} • {a.location} • {a.category} • {a.status}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.tags.map((t) => (
                          <span key={t} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: "rgba(99,102,241,0.12)", color: "var(--text-accent)", border: "1px solid rgba(99,102,241,0.25)" }}>{t}</span>
                        ))}
                      </div>
                    </Link>
                    {role === "ADMIN" && (
                      <button onClick={() => del(a.id)} className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-red-500/10" style={{ color: "#f87171" }}>ลบ</button>
                    )}
                  </div>
                </div>
              ))}
              {assets.length === 0 && <Empty text="ไม่พบครุภัณฑ์" />}
            </>
          )}
        </div>
        {role === "ADMIN" ? (
          <form onSubmit={add} className="glass-card h-fit space-y-3 p-5 text-sm animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-bold text-white">เพิ่มครุภัณฑ์</h2>
            {error && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{error}</p>}
            <Field label="เลขทรัพย์สิน *">
              <input value={form.asset_code} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} placeholder="เช่น JP-PC-010" className="glass-input w-full px-3 py-2 text-sm" />
            </Field>
            <Field label="ชื่อครุภัณฑ์ *">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ชื่อครุภัณฑ์" className="glass-input w-full px-3 py-2 text-sm" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="หมวด">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="glass-select w-full px-3 py-2 text-sm">
                  {["คอมพิวเตอร์", "ปริ้นเตอร์", "เน็ตเวิร์ก", "ซอฟต์แวร์", "อื่นๆ"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Serial *">
                <input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="Serial number" className="glass-input w-full px-3 py-2 text-sm" />
              </Field>
            </div>
            <Field label="Tags (คั่นด้วย ,)">
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="เช่น สำนักงาน, ชั้น2" className="glass-input w-full px-3 py-2 text-sm" />
            </Field>
            <Field label="ที่ตั้ง">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="ที่ตั้ง" className="glass-input w-full px-3 py-2 text-sm" />
            </Field>
            <button disabled={submitting} className="btn-gradient w-full py-2 text-sm disabled:opacity-60">{submitting ? "กำลังบันทึก…" : "บันทึกครุภัณฑ์"}</button>
          </form>
        ) : (
          <div className="glass-card h-fit p-5 text-sm animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>เฉพาะ ADMIN เท่านั้นที่เพิ่ม/ลบครุภัณฑ์ได้</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
