<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!--
หมายเหตุ: บล็อกด้านบนนี้ Next.js สร้าง/แก้ให้เองตอนรัน `next dev`
ห้ามลบหรือแก้เนื้อหาในบล็อกนี้ด้วยมือ — ปล่อยให้เครื่องมือจัดการเอง
ส่วนของโปรเจกต์เขียนต่อจากบรรทัดนี้ลงไป
-->

# CP Helpdesk — Agent Instructions

## Required Reading (อ่านก่อนเริ่มงานทุกครั้ง ทุก session)

ห้ามเริ่มเขียนโค้ด แก้ไข หรือให้คำแนะนำเชิงสถาปัตยกรรมใดๆ ก่อนอ่านไฟล์ต่อไปนี้ให้ครบก่อน:

1. **`SKILL2.md`** — สเปกหลักของระบบ (Definition of Done, roles, workflow, tech stack, known gaps) ถือเป็น**แหล่งความจริงเดียว (source of truth)** ของโปรเจกต์นี้ ห้ามย่อหรือตัดข้อกำหนดออกเมื่อทำงานจากไฟล์นี้
2. **`KB/KB_web.md`** — เอกสาร as-built ล่าสุดของหน้าเว็บ/โครงสร้างที่สร้างไปแล้วจริง (อัปเดตล่าสุด: ดูวันที่ในไฟล์) ใช้เทียบว่าของจริงตรงกับสเปกใน SKILL2.md แค่ไหน

ถ้าเนื้อหาสองไฟล์นี้ขัดกัน ให้หยุดและถามผู้ร้องขอก่อน อย่าตัดสินใจเอง เว้นแต่จะระบุไว้ชัดเจนแล้วใน SKILL2.md ว่าเป็น "Resolved — decision recorded"

## Scope

ดู **`SKILL2.md § Scope (Locked Baseline)`** ก่อนเริ่มงานใดๆ ที่อยู่นอกเหนือขอบเขตที่ระบุไว้ (In Scope) ต้องหยุดและถามผู้ร้องขอก่อน ห้ามเดาเองหรือขยายขอบเขตโดยไม่ยืนยัน

## Change Discipline (บังคับใช้ทุกครั้งที่แก้โค้ด)

รายละเอียดเต็มอยู่ใน **`SKILL2.md § Change Discipline`** สรุปกติกาหลัก:

1. **Verify-before-claim** — ห้ามบอกว่า "แก้แล้ว/เสร็จแล้ว" จนกว่าจะตรวจสอบซ้ำตาม repro steps จริงแล้วเท่านั้น ถ้า verify เองไม่ได้ ต้องบอกตรงๆ ว่ายังไม่ได้ verify
2. **Minimal diff** — แก้เฉพาะจุดที่เกี่ยวข้อง ห้ามเขียนไฟล์ใหม่ทั้งไฟล์ถ้าแก้จุดเดียวพอ และต้องรายงานว่าไฟล์ไหนเปลี่ยนตรงจุดไหนจริง
3. **Freeze list** — ห้ามแตะ DB schema ที่ migrate แล้ว, design token ที่ล็อกไว้แล้ว, หรือ route structure ที่ใช้งานจริงแล้ว โดยไม่ขอก่อน
4. **Task log** — สรุปก่อน/หลังทำงานทุกรอบว่าจะแก้อะไร/แก้อะไรไปแล้วจริง

## Project Summary

- **ระบบ:** CP Helpdesk — ระบบแจ้งซ่อม/บริหารจัดการงานซ่อมอุปกรณ์และครุภัณฑ์ IT
- **โครงสร้าง path:** `E:\HELPDESK 004\helpdesk`
- **Tech stack:** Next.js 16.3.4 + React 19 + Prisma 6.19.3 + PostgreSQL 17 + bcryptjs
- **รันด้วย:** Docker (`docker-compose.yml` Postgres 17) + `npm run dev:4502` / prod บน Vercel (`DEPLOY_VERCEL.md`) — ยกเลิก `run-4502.bat` แล้ว (2026-09-14)
- **ติดตั้งเครื่องใหม่:** ก๊อป `.env.example` → `.env` (`.env` ไม่ถูก commit) → `migrate deploy` → `db seed` → `dev:4502` (ดู `README.md`); ไฟล์แนบ local เก็บ relative path `uploads/<ticket>/<file>` ย้ายไดรฟ์ได้
- **โครงสร้าง UI:** Side Navigation ตามแพทเทิร์นของ `toolfolio.com` (ใช้อ้างอิงเฉพาะโครงสร้าง ห้าม copy branding/เนื้อหา/โค้ดจากเว็บต้นแบบ)
- **จำนวนแดชบอร์ด/วิว:** 7 วิวหลัก (ดูรายละเอียดใน SKILL2.md § Required Product Shape / Main Screens)
- **Roles:** 3 บทบาท — Requester, Technician, Administrator (Administrator ครอบคลุมหน้าที่ Supervisor ไปในตัว — **ไม่มี** role Supervisor แยกต่างหาก ตามที่ตกลงไว้ใน `SKILL2.md:109`)
- **สถานะงานซ่อม:** 10 สถานะ (New, Triaged, Assigned, In progress, Waiting for requester, Waiting for parts/external service, Resolved, Closed, Reopened, Cancelled — ดู `SKILL2.md` § Repair Status Workflow)

## Known Open Items (ห้ามลืมก่อนปิดงาน)

อ้างอิงจาก SKILL2.md § Known Gaps — สิ่งที่ยังไม่ปิดและต้องเช็คก่อนบอกว่า "เสร็จแล้ว":

- Internal notes ต้องแยกการมองเห็นระหว่าง requester กับ staff-only (`is_internal` flag)
- Password ต้อง hash ด้วย bcrypt/argon2 เท่านั้น ห้ามมี plaintext หลงเหลือ
- ต้องมี optimistic locking (`version` หรือ `updated_at`) บนตารางที่แก้ไขพร้อมกันได้ (requests, assets)
- PostgreSQL hosting ยังไม่ตัดสินใจ — ห้าม hard-code host/port/credential ต้องอ่านจาก `DATABASE_URL` เท่านั้น

## Working Principles

- ยึดสเปกใน `SKILL2.md` เป็นหลักเสมอ ไม่ตัดหรือย่อข้อกำหนดเมื่อแปลงเป็น task
- แก้เท่าที่จำเป็น (smallest coherent change) ไม่ refactor ส่วนที่ไม่เกี่ยวข้อง
- ห้ามอ้างว่าฟีเจอร์เสร็จแล้วถ้ายังไม่ต่อกับ workflow จริง หรือยังเป็นแค่ fixture
- ถามก่อนตัดสินใจเอง เฉพาะกรณีที่กระทบ data ownership, authorization, หรือแนวทาง implementation อย่างมีนัยสำคัญ
- ก่อน commit ให้รัน type check / lint / build ที่เกี่ยวข้องกับส่วนที่แก้เท่านั้น