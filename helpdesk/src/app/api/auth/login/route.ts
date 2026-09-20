import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email?.trim() && !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่าน (รหัสบัญชีทดสอบดูในไฟล์ helpdesk/.env บรรทัด SEED_*_PASSWORD)" },
        { status: 400 }
      );
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "กรุณากรอกอีเมล" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json(
        { error: "กรุณากรอกรหัสผ่าน (รหัสบัญชีทดสอบดูในไฟล์ helpdesk/.env บรรทัด SEED_*_PASSWORD)" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (!user) {
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    const res = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    });

    res.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (e) {
    console.error("[POST /api/auth/login]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
