import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "helpdesk_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, department: true },
    });
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const err = new Error("Unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return session;
}

// Helper to check if user can view a ticket
export function canViewTicket(
  user: SessionUser,
  ticket: { requester_id: string; technician_id: string | null }
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "TECH") return true; // tech can view assigned + unclaimed NEW/TRIAGED/ASSIGNED
  return ticket.requester_id === user.id;
}

export function canManageTicket(
  user: SessionUser,
  ticket: { requester_id: string; technician_id: string | null }
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "TECH" && ticket.technician_id === user.id) return true;
  return false;
}
