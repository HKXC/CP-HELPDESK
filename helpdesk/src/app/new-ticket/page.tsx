"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Field, PageHeader } from "@/components/ui";

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  serial_number: string;
  location: string | null;
  tags: string[];
}

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export default function NewTicketPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState({ title: "", description: "", category: "คอมพิวเตอร์", priority: "MEDIUM" as Priority, asset_code: "", location: "", contact: "", department: "", impact: "", urgency: "" });
  const [assetInfo, setAssetInfo] = useState<Asset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/assets?limit=100", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((d) => setAssets(d.assets || []))
      .catch(() => setAssets([]));
  }, []);

  useEffect(() => {
    // Same microtask deferral as assets/page.tsx (react-hooks/set-state-in-effect).
    void Promise.resolve().then(() => {
      const found = assets.find((a) => a.asset_code === form.asset_code) || null;
      setAssetInfo(found);
      if (form.asset_code && found && !form.location) {
        setForm((f) => ({ ...f, location: found.location || "" }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.asset_code, assets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.description.trim()) {
      setError("กรุณากรอกหัวข้อและรายละเอียด");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
          asset_code: form.asset_code || undefined,
          serial_number: assetInfo?.serial_number || undefined,
          asset_id: assetInfo?.id || undefined,
          location: form.location || undefined,
          contact: form.contact || undefined,
          department: form.department || undefined,
          impact: form.impact || undefined,
          urgency: form.urgency || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ส่งใบแจ้งไม่สำเร็จ");
        return;
      }
      router.push(`/track/${data.id}`);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="แจ้งซ่อมใหม่" sub="กรอกอาการให้ละเอียด • ระบุเลขทรัพย์สิน / Serial เพื่อให้ช่างทำงานเร็วขึ้น" />
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card space-y-4 p-5 animate-slide-up lg:col-span-2 sm:p-6">
          <Field label="หัวข้อปัญหา *">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น คอมเปิดไม่ติด, ปริ้นเตอร์กระดาษติด" className="glass-input w-full px-3 py-2.5 text-sm" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="หมวดอุปกรณ์">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="glass-select w-full px-3 py-2.5 text-sm">
                {["คอมพิวเตอร์", "ปริ้นเตอร์", "เน็ตเวิร์ก", "ซอฟต์แวร์", "ไฟฟ้าทั่วไป", "อื่นๆ"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="ความเร่งด่วน">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="glass-select w-full px-3 py-2.5 text-sm">
                <option value="LOW">ต่ำ</option>
                <option value="MEDIUM">ปานกลาง</option>
                <option value="HIGH">สูง</option>
                <option value="URGENT">ด่วนมาก</option>
              </select>
            </Field>
          </div>
          <Field label="รายละเอียดอาการ *">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="อธิบายอาการ, สิ่งที่ลองทำแล้ว, ผลกระทบต่อการทำงาน…" className="glass-input w-full px-3 py-2.5 text-sm" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="เลขทรัพย์สิน (ถ้ามี)">
              <input value={form.asset_code} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} list="asset-list" placeholder="เช่น JP-PC-001" className="glass-input w-full px-3 py-2.5 text-sm" />
              <datalist id="asset-list">{assets.map((a) => <option key={a.id} value={a.asset_code}>{a.name}</option>)}</datalist>
            </Field>
            <Field label="สถานที่">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="เช่น ห้องบัญชี ชั้น 2" className="glass-input w-full px-3 py-2.5 text-sm" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ช่องทางติดต่อ">
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="เช่น โทร 1234, Line ID" className="glass-input w-full px-3 py-2.5 text-sm" />
            </Field>
            <Field label="แผนก">
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="เช่น บัญชี, IT" className="glass-input w-full px-3 py-2.5 text-sm" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ผลกระทบ (Impact)">
              <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} className="glass-select w-full px-3 py-2.5 text-sm">
                <option value="">— ไม่ระบุ —</option>
                {["งานหยุดชะงักทั้งแผนก", "งานบางส่วนช้าลง", "ผลกระทบเล็กน้อย", "ยังทำงานได้"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="ความเร่งด่วน (Urgency)">
              <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} className="glass-select w-full px-3 py-2.5 text-sm">
                <option value="">— ไม่ระบุ —</option>
                {["ต้องแก้ทันที", "ภายในวันนี้", "ภายในสัปดาห์", "ทำเมื่อว่าง"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          {error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</p>}
          <button disabled={submitting} className="btn-gradient w-full py-2.5 text-sm sm:w-auto sm:px-8 disabled:opacity-60">
            {submitting ? "กำลังส่ง…" : "ส่งใบแจ้งซ่อม"}
          </button>
        </div>
        <div className="glass-card h-fit p-5 text-sm animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="mb-3 font-bold text-white">ข้อมูลครุภัณฑ์ที่เลือก</h2>
          {assetInfo ? (
            <div className="space-y-2 text-xs leading-6" style={{ color: "var(--text-secondary)" }}>
              {[
                ["ชื่อ", assetInfo.name],
                ["เลขทรัพย์สิน", assetInfo.asset_code],
                ["Serial", assetInfo.serial_number],
                ["Tags", assetInfo.tags.join(", ") || "-"],
                ["ที่ตั้ง", assetInfo.location || "-"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl p-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
                  <p style={{ color: "var(--text-muted)" }}>{k}</p>
                  <p className="font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-6" style={{ color: "var(--text-muted)" }}>พิมพ์หรือเลือกเลขทรัพย์สินเพื่อดึง Serial/Tags อัตโนมัติ</p>
          )}
        </div>
      </form>
    </AppShell>
  );
}
