// Shared constants — single source of truth for status workflow (10 statuses)
import type { TicketStatus, Priority, Role } from "@prisma/client";

export type { TicketStatus, Priority, Role };

export const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: "ใหม่",
  TRIAGED: "คัดกรองแล้ว",
  ASSIGNED: "มอบหมายแล้ว",
  IN_PROGRESS: "กำลังซ่อม",
  WAITING_REQUESTER: "รอข้อมูลผู้แจ้ง",
  WAITING_PARTS: "รออะไหล่",
  RESOLVED: "แก้ไขแล้ว",
  CLOSED: "ปิดงาน",
  REOPENED: "เปิดใหม่",
  CANCELLED: "ยกเลิก",
};

export const STATUS_ORDER: TicketStatus[] = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_REQUESTER",
  "WAITING_PARTS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

// For timeline display — linear progress workflow (excluding branches)
export const STATUS_PROGRESS: TicketStatus[] = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "ต่ำ",
  MEDIUM: "ปานกลาง",
  HIGH: "สูง",
  URGENT: "ด่วนมาก",
};

export const ROLE_LABEL: Record<Role, string> = {
  USER: "ผู้แจ้ง",
  TECH: "ช่าง",
  ADMIN: "แอดมิน",
};
