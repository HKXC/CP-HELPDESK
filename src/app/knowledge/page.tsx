"use client";
import AppShell from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

const GUIDES = [
  { title: "คอมเปิดไม่ติด มีเสียง beep", body: "1) ถอดปลั๊ก 30 วินาที 2) ถอด-เสียบ RAM 3) ถ่ายรูปเลขทรัพย์สิน + Serial แนบใบแจ้งซ่อม", tag: "คอมพิวเตอร์", icon: "🖥️" },
  { title: "ปริ้นเตอร์กระดาษติด", body: "1) ดึงถาดกระดาษออกช้าๆ 2) เช็กว่าไม่มีเศษกระดาษค้าง 3) ใช้กระดาษ 80 แกรม ไม่ยับ", tag: "ปริ้นเตอร์", icon: "🖨️" },
  { title: "Wi-Fi ช้า / หลุดบ่อย", body: "1) Restart AP 2) เช็กจำนวนผู้ใช้ 3) แจ้งตำแหน่ง + เวลาเกิดเหตุในใบแจ้งซ่อม", tag: "เน็ตเวิร์ก", icon: "📶" },
  { title: "วิธีแจ้งซ่อมให้ช่างทำงานเร็ว", body: "ระบุเลขทรัพย์สิน + Serial + รูปอาการ + เบอร์ติดต่อ จะลดเวลาซ่อมเฉลี่ย 40%", tag: "ทิป", icon: "💡" },
];

export default function KnowledgePage() {
  return (
    <AppShell>
      <PageHeader title="คู่มือ / บทความ" sub="แก้เบื้องต้นเองได้ • ถ้าไม่หายค่อยกดแจ้งซ่อม" />
      <div className="grid gap-3 stagger sm:grid-cols-2">
        {GUIDES.map((g) => (
          <div key={g.title} className="glass-card-interactive p-5 animate-slide-up">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>{g.icon}</span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "rgba(99,102,241,0.12)", color: "var(--text-accent)", border: "1px solid rgba(99,102,241,0.25)" }}>{g.tag}</span>
            </div>
            <h2 className="mb-1 font-bold text-white">{g.title}</h2>
            <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{g.body}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
