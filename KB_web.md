# KB_web — งานที่ทำไปแล้ว (as-built จริงจากโค้ด)

> อัปเดต: 2026-09-15 (เย็น) • อ่านจากโค้ดจริงใน `helpdesk/src` + `prisma/` + `CHANGELOG.md`
> ไฟล์นี้ตอบคำถามเดียว: **อะไรทำเสร็จแล้วบ้าง** (ไม่รวมสเปก/แผน)

## 1. ภาพรวมที่เสร็จแล้ว

- Next.js 16.3.4 + React 19 + Prisma 6.19.3 + PostgreSQL 17 + bcryptjs
- หน้าเว็บ 12 หน้า (ทุกหน้าหุ้ม `AppShell` ยกเว้น `/login`)
- API 15 routes (auth 3 + tickets 5 + assets 2 + attachments 1 + users/overview/health/logs อย่างละ 1)
- DB 6 ตาราง + 4 enums + `ticket_no_seq` + seed ผู้ใช้ 3 คน + ครุภัณฑ์ 4 ชิ้น
- รันด้วย Docker (Postgres 17) + `npm run dev:4502` / prod บน Vercel (ยกเลิก `run-4502.bat` แล้ว 2026-09-14)
- เครื่องอื่นใน Wi-Fi เดียวกันเปิดผ่าน LAN ได้เลยไม่ต้องลงอะไร: รัน `npx next dev --port 4502 -H 0.0.0.0` ที่ `http://10.195.255.147:4502/login` (IP ของเครื่อง host ณ 2026-09-15, ถ้า IP เปลี่ยนให้เช็กด้วย `Get-NetIPAddress`; ต้องเปิด firewall inbound 4502 ถ้าเข้าไม่ได้)
- เตรียมขึ้น Vercel แล้ว (build ผ่าน 27 routes, push ถึง `main` แล้ว, link project `cp-helpdesk` แล้ว) — ติด 2 อย่าง: Deployment Protection เปิดอยู่ (ต้อง Disabled) + ยังไม่มี env (`DATABASE_URL`/`DIRECT_URL`/`BLOB_READ_WRITE_TOKEN` จาก Neon/Vercel — ดู `DEPLOY_VERCEL.md`)

## 2. หน้าเว็บ (12 หน้า — เสร็จทั้งหมด)

| หน้า | ทำอะไรไปแล้ว |
|---|---|
| `/login` | ฟอร์ม email/password → `POST /api/auth/login`, ปุ่มลัด 3 role, กล่อง error แดง |
| `/` Dashboard | ดึง `GET /api/overview` + `GET /api/assets?limit=5`, การ์ดสถิติ 4 ใบ, แถบเตือน overdue, งานล่าสุดกดไป detail ได้ |
| `/new-ticket` | ฟิลด์หัวข้อ*/รายละเอียด* + หมวด/ความเร่งด่วน + contact/department/impact/urgency (optional) + เลือก asset จาก datalist, กันกดซ้ำ, สำเร็จพาไป `/track/[id]` |
| `/my-tickets` | ของ USER เห็นเฉพาะของตัวเอง (กรอง server-side), ฟิลเตอร์ 11 ปุ่ม (ทั้งหมด + 10 สถานะ), sort ตาม created/updated/priority/status + order |
| `/track` | ช่องค้นหาเดียว `?q=` (เลข/หัวข้อ/อาการ/asset/serial/คนแจ้ง), รองรับ `?q=` จาก sidebar/topbar |
| `/track/[id]` | หัวข้อ + StatusBadge + timeline 10 ขั้น + progress bar, กล่อง diagnosis/work/parts/resolution, ประวัติ (USER ไม่เห็น internal), ไฟล์แนบ + อัปโหลด 10MB, แผงช่าง (บันทึกโน้ต/เปลี่ยนสถานะ/checkbox internal/confirm ก่อน CLOSED/Reopen), ADMIN มอบหมายช่างได้, ส่ง version กันเขียนชน (409) |
| `/assets` | ค้นหา debounce 300ms, การ์ดรายเครื่องกดไป detail, ฟอร์มเพิ่ม (ADMIN, 409 เมื่อเลข/Serial ชน), ปุ่มลบ (มีใบงานผูก → กลายเป็น RETIRED แทน) |
| `/assets/[id]` | อ่านอย่างเดียว 9 ช่อง + ประวัติซ่อม 10 ใบล่าสุดกดไป ticket ได้ |
| `/knowledge` | static 4 การ์ด (คอม beep/กระดาษติด/Wi-Fi/ทิปแจ้งซ่อม) — อนุมัติให้เก็บถาวรแล้ว |
| `/technician` | งานของตัวเอง + งานว่าง (NEW/TRIAGED/ASSIGNED), การ์ดกดไป detail |
| `/admin` | tab งานทั้งหมด (filter วัน + sort + แบ่งหน้า 20 ใบ) / tab รายงาน (กราฟ 10 สถานะ + หมวด + Export CSV มี BOM) / tab ผู้ใช้ (อ่านอย่างเดียว) |
| `/terminal` | ADMIN-only, 4 blocks ข้อมูลจริง: health + overview + tickets 5 ใบล่าสุด + logs 20 บรรทัด, empty state ชัดเจน |

โครง `AppShell` (`src/components/AppShell.tsx`): เช็ก session ทุกครั้งที่เปลี่ยนหน้า, เมนูตาม role (USER 6 / TECH 7 / ADMIN 11), sidebar ย่อ 280↔76px + drawer มือถือ, topbar มีค้นหา + badge role, ปุ่ม logout

## 3. Backend / API (15 routes — เสร็จทั้งหมด)

- Auth: `POST /api/auth/login` (bcrypt compare + cookie `helpdesk_session` 8 ชม.), `POST /api/auth/logout`, `GET /api/auth/me`
- Tickets: `GET+POST /api/tickets` (ค้นหา/filter/sort/page ครบ, USER ถูกกรอง `requester_id`), `GET+PATCH /api/tickets/[id]` (เปลี่ยนสถานะตาม ALLOWED + อัปเดตฟิลด์ + version check), `POST .../reopen`, `POST .../comments` (comment โดยไม่เปลี่ยนสถานะ), `POST .../attachments` (multipart สูงสุด 10MB)
- Assets: `GET+POST /api/assets`, `GET+PATCH+DELETE /api/assets/[id]`
- อื่นๆ: `GET /api/attachments/[id]` (ดาวน์โหลดผ่าน authz ไม่รั่ว `storage_path`), `GET /api/users` (ล็อก ADMIN-only สำหรับ full list), `GET /api/overview`, `GET /api/health` (public), `GET /api/logs` (ADMIN)
- บังคับสิทธิ์ 2 ชั้น: `src/proxy.ts` (ไม่มี cookie → redirect `/login` หรือ 401 สำหรับ API) + ทุก route เรียก `getSession()/requireRole()`
- กันเขียนชน: ทุก PATCH ส่ง `version`, ชน = 409 `Data was modified by another user`

## 4. Database (PostgreSQL — เสร็จทั้งหมด)

- `prisma/schema.prisma`: 4 enums (Role 3 ค่า / TicketStatus 10 ค่า / Priority / AssetStatus) + 6 ตาราง (User/Asset/Ticket/TicketHistory/Attachment/ActivityLog) + FK จริงทุกความสัมพันธ์ + index ทุกฟิลด์ค้นหา + `version` optimistic locking + `TicketHistory.is_internal`
- เลขใบงาน `HD-YY-XXXX` จาก `ticket_no_seq` (sequence กันชน concurrent)
- Migration: `prisma/migrations/20260912043824_init/migration.sql` (213 บรรทัด)
- Seed (`prisma/seed.ts`): bcrypt cost 12 จาก ENV `SEED_*_PASSWORD` (ไม่ set = seed ล้ม, ไม่มี plaintext), user 3 คน (`admin/tech/user@jp.local`), asset 4 ชิ้น (`JP-PC-001/PR-012/NB-007/NET-003`), ticket ตัวอย่าง 2 ใบสร้างผ่าน `ticket-service` ให้ history เกิดจาก transaction จริง
- ทุกเปลี่ยนสถานะเขียน `TicketHistory` + `ActivityLog` ใน transaction เดียวกัน
- ไฟล์แนบ: metadata ใน DB + binary ลง disk `uploads/<ticket_id>/` (local, เก็บเป็น **relative path** ย้ายเครื่อง/ไดรฟ์ได้ แถวเก่าที่เป็น absolute ยังอ่านได้) หรือ Vercel Blob (prod) ผ่าน `src/lib/storage.ts` — response ตัด `storage_path` ออกแล้ว

## 5. Workflow 10 สถานะ (เสร็จทั้งหมด)

`NEW → TRIAGED → ASSIGNED → IN_PROGRESS → WAITING_REQUESTER/WAITING_PARTS → RESOLVED → CLOSED`, แยก `REOPENED` (จาก RESOLVED/CLOSED) และ `CANCELLED` (ทางตัน) — กติกาอยู่ใน `ALLOWED_TRANSITIONS` (`src/lib/ticket-service.ts:55`) + UI ปุ่ม dynamic + timeline + `StatusBadge` 10 สี (มี dot + ตัวอักษร ไม่พึ่งสีอย่างเดียว)

## 6. Infra — Docker / Vercel (ยกเลิก startup .bat แล้ว 2026-09-14)

- วิธีรันมาตรฐาน: `docker compose up -d` (Postgres 17) → `npm run dev:4502` ใน `helpdesk/` → เปิด http://localhost:4502; ถ้าจะให้เครื่องอื่นใช้ผ่าน LAN รัน `npx next dev --port 4502 -H 0.0.0.0` แล้วเปิด `http://<IP-host>:4502/login` (เช่น `http://10.195.255.147:4502/login`); prod ดู `DEPLOY_VERCEL.md`
- ติดตั้งบนเครื่องใหม่: ก๊อป `.env.example` → `.env` (ใส่ `DATABASE_URL`/`DIRECT_URL`/`SEED_*_PASSWORD`) → `npx prisma migrate deploy` → `npx prisma db seed` → `npm run dev:4502` (`.env` ไม่ถูก commit ทุกเครื่องสร้างเอง; ย้ายเครื่อง backup `uploads/` มาด้วย)
- `/terminal` ยังเก็บไว้เป็นหน้า ADMIN read-only (health + overview + tickets 5 ใบ + logs 20 บรรทัด) — ไม่ใช่ startup console อีกต่อไป
- `docker-compose.yml`: Postgres 17 (วิธีหลัก local); native Postgres เดิมใช้ได้แต่ไม่ใช่ค่าตั้งต้นแล้ว
- Vercel prep: `build` = `prisma generate && next build`, `engines node 22.x`, `directUrl` (Neon pooler/direct), `src/lib/storage.ts` (Blob/prod + disk/dev — อ่าน disk เฉพาะใต้ `uploads/` + `turbopackIgnore` แล้ว ไม่มี build warning), lockfile มี Linux optional binaries แล้ว (deploy บน Vercel ได้), link project `cp-helpdesk` แล้ว, `DEPLOY_VERCEL.md` (มีขั้นตอนปิด Deployment Protection ด้วย)
- Verify ที่ผ่านแล้ว: `tsc --noEmit` ผ่าน, `npm run build` ผ่าน 27 routes, smoke local (`/api/health` ok, login 3 roles, tickets/assets/comments, users matrix 403/200), prod-mode `next start` proof ผ่าน; รอบเย็น 2026-09-15 re-verify: login 3 roles + 401/403 matrix ผ่าน, สร้าง `HD-26-0023` → TRIAGED 200, upload/download ตรง 2 รอบ (รวมรอบหลังแก้ storage), login ผ่าน LAN IP 200

## 7. ของที่ยังไม่ทำ (สั้นๆ — รายละเอียดดู SKILL2.md § Known Gaps)

1. Neon `DATABASE_URL` + `DIRECT_URL` + `BLOB_READ_WRITE_TOKEN` ยังไม่ได้จากผู้ใช้ + ปิด Deployment Protection บน project `cp-helpdesk` (โค้ด push + link แล้ว — ดู `DEPLOY_VERCEL.md`)
2. Smoke 50 concurrent + รีวิว 4 role ยังไม่ได้รัน (smoke เดี่ยวผ่านแล้ว)
3. `due_at`/SLA UI + รายงานตามช่วงเวลา/ช่าง (DB มีฟิลด์แล้ว)
4. ลด gradient/all-caps/animation ประดับตามสเปก (แยกเป็นรอบ design โดยเฉพาะ ไม่รวมกับฟีเจอร์)
