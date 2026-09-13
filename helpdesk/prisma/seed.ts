import { PrismaClient, Role, TicketStatus, Priority, AssetStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Validate ENV vars — fail loudly if not set
  const adminPass = process.env.SEED_ADMIN_PASSWORD;
  const techPass = process.env.SEED_TECH_PASSWORD;
  const userPass = process.env.SEED_USER_PASSWORD;

  if (!adminPass || !techPass || !userPass) {
    throw new Error(
      "SEED_*_PASSWORD env vars required. Set SEED_ADMIN_PASSWORD, SEED_TECH_PASSWORD, SEED_USER_PASSWORD in .env — no plaintext fallback."
    );
  }

  // Ensure sequence exists
  await prisma.$executeRaw`CREATE SEQUENCE IF NOT EXISTS ticket_no_seq START WITH 1`;

  // ── Users ───────────────────────────────────────
  const hashedAdmin = await bcrypt.hash(adminPass, 12);
  const hashedTech = await bcrypt.hash(techPass, 12);
  const hashedUser = await bcrypt.hash(userPass, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@jp.local" },
    update: { password: hashedAdmin, name: "แอดมิน JP", role: Role.ADMIN, department: "IT" },
    create: {
      id: "u_admin",
      name: "แอดมิน JP",
      email: "admin@jp.local",
      password: hashedAdmin,
      role: Role.ADMIN,
      department: "IT",
    },
  });

  const tech = await prisma.user.upsert({
    where: { email: "tech@jp.local" },
    update: { password: hashedTech, name: "ช่างสมชาย", role: Role.TECH, department: "IT Support" },
    create: {
      id: "u_tech",
      name: "ช่างสมชาย",
      email: "tech@jp.local",
      password: hashedTech,
      role: Role.TECH,
      department: "IT Support",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@jp.local" },
    update: { password: hashedUser, name: "พนักงานทั่วไป", role: Role.USER, department: "บัญชี" },
    create: {
      id: "u_user",
      name: "พนักงานทั่วไป",
      email: "user@jp.local",
      password: hashedUser,
      role: Role.USER,
      department: "บัญชี",
    },
  });

  console.log("✓ Users seeded:", admin.email, tech.email, user.email);

  // ── Assets ──────────────────────────────────────
  const assetsData = [
    {
      id: "a1",
      asset_code: "JP-PC-001",
      name: "PC Dell OptiPlex 7010",
      category: "คอมพิวเตอร์",
      serial_number: "SN-PC88-001",
      tags: ["คอมพิวเตอร์", "สำนักงาน"],
      location: "ห้องบัญชี ชั้น 2",
      status: AssetStatus.ACTIVE,
    },
    {
      id: "a2",
      asset_code: "JP-PR-012",
      name: "Printer Canon LBP6230",
      category: "ปริ้นเตอร์",
      serial_number: "SN-PR-Canon-012",
      tags: ["ปริ้นเตอร์", "เลเซอร์"],
      location: "ห้องธุรการ ชั้น 1",
      status: AssetStatus.ACTIVE,
    },
    {
      id: "a3",
      asset_code: "JP-NB-007",
      name: "Notebook Lenovo ThinkPad E14",
      category: "คอมพิวเตอร์",
      serial_number: "SN-NB-Lenovo-007",
      tags: ["โน้ตบุ๊ก", "IT"],
      location: "ห้อง IT",
      status: AssetStatus.IN_REPAIR,
    },
    {
      id: "a4",
      asset_code: "JP-NET-003",
      name: "Access Point UniFi U6",
      category: "เน็ตเวิร์ก",
      serial_number: "SN-AP-Unifi-003",
      tags: ["เน็ตเวิร์ก", "AP"],
      location: "โถงชั้น 2",
      status: AssetStatus.ACTIVE,
    },
  ];

  for (const a of assetsData) {
    await prisma.asset.upsert({
      where: { asset_code: a.asset_code },
      update: {
        name: a.name,
        category: a.category,
        serial_number: a.serial_number,
        tags: a.tags,
        location: a.location,
        status: a.status,
      },
      create: a,
    });
  }
  console.log("✓ Assets seeded: 4");

  // ── Tickets via ticket-service (ensures history/activity) ─────
  // Import after users exist to avoid circular
  const { createTicket, transitionTicket } = await import("../src/lib/ticket-service");

  // Clean existing tickets if any (idempotent development seed)
  const existingCount = await prisma.ticket.count();
  if (existingCount > 0) {
    console.log(`⚠ Tickets already exist (${existingCount}), skipping ticket seed`);
    return;
  }

  const t1 = await createTicket({
    title: "คอมเปิดไม่ติด มีเสียง beep",
    description: "เปิดเครื่องแล้วมีเสียง beep 3 ครั้ง จอดำ ใช้งานไม่ได้ตั้งแต่เช้า",
    category: "คอมพิวเตอร์",
    priority: Priority.HIGH,
    asset_code: "JP-PC-001",
    serial_number: "SN-PC88-001",
    location: "ห้องบัญชี ชั้น 2",
    requester_id: user.id,
  });
  console.log(`✓ Ticket created: ${t1.ticket_no} (${t1.id})`);

  // Move t1 through workflow: NEW -> TRIAGED -> ASSIGNED -> IN_PROGRESS
  await transitionTicket({
    ticket_id: t1.id,
    new_status: TicketStatus.TRIAGED,
    actor_id: admin.id,
    note: "คัดกรองแล้ว — ความสำคัญสูง",
  });
  await transitionTicket({
    ticket_id: t1.id,
    new_status: TicketStatus.ASSIGNED,
    actor_id: admin.id,
    note: "มอบหมายให้ช่างสมชาย",
  });
  // Update technician assignment explicitly
  await prisma.ticket.update({
    where: { id: t1.id },
    data: { technician_id: tech.id },
  });
  await transitionTicket({
    ticket_id: t1.id,
    new_status: TicketStatus.IN_PROGRESS,
    actor_id: tech.id,
    note: "กำลังตรวจสอบ RAM",
  });
  console.log(`✓ Ticket ${t1.ticket_no} progressed to IN_PROGRESS`);

  const t2 = await createTicket({
    title: "ปริ้นเตอร์กระดาษติดบ่อย",
    description: "กระดาษติดทุกครั้งที่พิมพ์เกิน 5 แผ่น ไฟกระพริบสีส้ม",
    category: "ปริ้นเตอร์",
    priority: Priority.MEDIUM,
    asset_code: "JP-PR-012",
    serial_number: "SN-PR-Canon-012",
    location: "ห้องธุรการ ชั้น 1",
    requester_id: user.id,
  });
  console.log(`✓ Ticket created: ${t2.ticket_no} (${t2.id}) — stays NEW`);

  // Set ticket_no sequence to avoid collision on next create
  const maxSeq = 2;
  await prisma.$executeRaw`SELECT setval('ticket_no_seq', ${maxSeq})`;

  console.log("✓ Seed complete");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
