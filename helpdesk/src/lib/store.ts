// Deprecated — kept for backward compat, re-exports new constants
// All data now lives in PostgreSQL via Prisma + API routes
export { STATUS_LABEL, STATUS_ORDER, PRIORITY_LABEL, ROLE_LABEL } from "./constants";
export type { TicketStatus, Priority, Role } from "./constants";

// Legacy interfaces kept for type compat (prefer Prisma types)
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "USER" | "TECH" | "ADMIN";
  department?: string;
}
export interface Asset {
  id: string;
  asset_code: string;
  tags: string[];
  serial_number: string;
  name: string;
  category: string;
  location: string;
  status: string;
}
export interface Ticket {
  id: string;
  ticket_no: string;
  title: string;
  description: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: import("./constants").TicketStatus;
  asset_code?: string;
  serial_number?: string;
  location?: string;
  requester_id: string;
  requester_name: string;
  technician_id?: string;
  technician_name?: string;
  solution?: string;
  created_at: string;
  updated_at: string;
}
export interface HistoryItem {
  id: string;
  ticket_id: string;
  from_status: string;
  to_status: string;
  by_name: string;
  note?: string;
  created_at: string;
}
// Deprecated LocalStorage helpers — no-op, data is in DB now
export function seedIfEmpty() { /* no-op: data in PostgreSQL */ }
export function getUsers(): User[] { console.warn("getUsers() deprecated — use /api/users"); return []; }
export function getAssets(): Asset[] { console.warn("getAssets() deprecated — use /api/assets"); return []; }
export function saveAssets(_: Asset[]) { console.warn("saveAssets() deprecated"); }
export function getTickets(): Ticket[] { console.warn("getTickets() deprecated — use /api/tickets"); return []; }
export function saveTickets(_: Ticket[]) { console.warn("saveTickets() deprecated"); }
export function getHistory(_: string): HistoryItem[] { console.warn("getHistory() deprecated — use /api/tickets/[id]"); return []; }
export function pushHistory(_: HistoryItem) { console.warn("pushHistory() deprecated"); }
export function getSession(): User | null { console.warn("getSession() deprecated — use /api/auth/me"); return null; }
export function setSession(_: User | null) { console.warn("setSession() deprecated — use /api/auth/login|logout"); }
export function nextTicketNo(): string { console.warn("nextTicketNo() deprecated — server generates ticket_no"); return "HD-XX-XXXX"; }
export function uid(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 9)}`; }
