# CHANGELOG — CP Helpdesk

## 2026-09-15 (ดึก) — เอาฟีเจอร์ Terminal ออก + ฟอนต์ไทย

- ลบ `/terminal` ทั้งหน้า+เมนูตามคำสั่งผู้ใช้: ลบ `src/app/terminal/` (608 บรรทัด) + ตัด `Terminal` icon/nav/active-case ใน `src/components/AppShell.tsx`; API `health/overview/tickets/logs` คงอยู่ครบ (หน้า `/admin` ใช้อยู่)
- `SKILL2.md`: decision record ใหม่ทับ 2 มติเดิม (เก็บ `/terminal` ไว้) — ห้ามสร้าง `/terminal` ใหม่โดยไม่มีคำสั่ง
- ฟอนต์ไทย: `globals.css` + terminal stack เดิมไม่มี fallback ไทย (JetBrains Mono/Inter ไม่มี glyph ไทย) — เพิ่ม `Noto Sans Thai` + `Leelawadee UI`/`Tahoma` (ยืนยันใน CSS ที่เสิร์ฟจริงแล้ว)
- Docs sync: `KB_web.md` (root+Terminal_run), `KB.md`, `summary.txt`, `KB_GuildME.md` (§4.5), `ACCEPTANCE #28`
- Verify: `tsc` ผ่าน, `npm run build` ผ่าน (26 routes — ไม่มี `/terminal` แล้ว)

## 2026-09-15 (เย็น) — LAN mode + Vercel findings + storage scoping + docs sync

- `src/lib/storage.ts`: อ่านไฟล์ disk เฉพาะใต้ `uploads/` + `turbopackIgnore` — build warning หาย (`npm run build` exit 0, 27 routes), upload/download ตรงทั้งก่อนและหลังแก้ (re-verify 2 รอบ)
- LAN mode: รัน `npx next dev --port 4502 -H 0.0.0.0` → เครื่องอื่นใน Wi-Fi เดียวกันเปิด `http://10.195.255.147:4502/login` ได้โดยไม่ต้องลงอะไร (login ผ่าน IP 200; firewall inbound 4502 ยังไม่เปิด — ไม่มีสิทธิ์ admin)
- Vercel: link project `cp-helpdesk` แล้ว (`vercel env ls` ว่าง — ไม่มี env เลย), deployment ล่าสุด Ready แต่ติดกำแพง SSO (Deployment Protection เปิดอยู่) + ขาด `DATABASE_URL`/`DIRECT_URL`/`BLOB_READ_WRITE_TOKEN` — วิธีแก้อยู่ใน `DEPLOY_VERCEL.md` (ปิด Protection + ใส่ env)
- Login investigation: API login 3 roles 200 ปกติ ปัญหาอยู่ที่ผู้ใช้ (ปุ่มลัดกรอกแค่ email + ล้างช่องรหัส ต้องพิมพ์รหัสจาก `.env` เอง) — ไม่ต้องแก้โค้ด
- Docs sync: `KB_web.md` (root+Terminal_run), `KB_GuildME.md` (+วิธี LAN), `ACCEPTANCE_CHECKLIST.md` (notes รอบเย็นข้อ 2/6 + test data ค้าง), `DEPLOY_VERCEL.md` (SSO-wall + env)
- หมายเหตุ: test data ค้างใน DB local เพิ่ม — `HD-26-0023` (TRIAGED) + ไฟล์ `smoke.txt`/`fresh.txt` (ลบได้); `SKILL2.md` ไม่แตะ (เป็นสเปก — ยังไม่มีมติใหม่)
- ไฟล์เปลี่ยนรอบนี้: `src/lib/storage.ts`, `helpdesk/.gitignore` (dedupe หลัง `vercel link`), `DEPLOY_VERCEL.md`, `KB_web.md`, `KB_Terminal_run/*` (2 ไฟล์), `ACCEPTANCE_CHECKLIST.md`, `CHANGELOG.md`

## 2026-09-15 — Portable-path + ปิดงานค้าง + API smoke 28/28

- `src/lib/storage.ts`: local disk เก็บ **relative path** (`uploads/<ticket>/<file>`) แทน absolute — ย้ายเครื่อง/ไดรฟ์แล้วแถวเก่าไม่พัง; `getAttachmentBytes` แปลง relative→absolute ตอนรัน + อ่าน absolute เก่าได้เหมือนเดิม (fallback)
- `SKILL2.md`: decision record ยกเลิก Gap #5 (Operator Console ใน `.bat`) — วิธีรันมาตรฐาน Docker + `dev:4502`, `/terminal` คงเป็น ADMIN read-only
- Docs sync: `KB_web.md` (root+Terminal_run), `summary.txt`, `KB.md`, `KB_GuildME.md`, `AGENTS.md`, root `README.md` (มีวิธีติดตั้งเครื่องใหม่), `ACCEPTANCE_CHECKLIST.md` (กรอก 21 ข้อ API)
- ไม่มี `encrypted_content` ในโค้ด (grep ทั้ง repo ไม่เจอ) — สาเหตุย้ายเครื่องไม่ได้ที่พิสูจน์ได้คือ `.env` ไม่ติด git + absolute path + DB ว่าง ซึ่งปิดทั้ง 3 จุดแล้ว (คู่มือย้ายเครื่องใน `README.md`)
- Verify: `tsc --noEmit` ผ่าน, `npm run build` ผ่าน exit 0 (27 routes), API smoke **28/28** (auth 3 role, users matrix 403/200, tickets scope, create HD-, NEW→CLOSED 400, version 409, internal filter, upload<10MB 201+download ตรง, 11MB→400, hash 3/3, storage relative), lifecycle **8/8** (NEW→…→CLOSED→REOPENED + ผูก asset)
- หมายเหตุ: มี ticket ทดสอบ `smoke/lifecycle/manual-asset/UNREGISTERED + comment INTERNAL-SMOKE` ค้างใน DB local (ลบได้); ข้อ UI 23,24,26,27 รอผู้ใช้คลิกจริง
- ไฟล์เปลี่ยนรอบนี้: `src/lib/storage.ts`, `SKILL2.md`, `ACCEPTANCE_CHECKLIST.md`, `KB_web.md`, `KB_Terminal_run/*` (4 ไฟล์), `helpdesk/AGENTS.md`, `helpdesk/README.md`, `README.md` (root), `CHANGELOG.md` (+งานค้างเดิม: attachments route, layout noscript, terminal, track/[id], ลบ run-4502.bat)

## 2026-09-14 — ยกเลิก run-4502.bat (ตามคำสั่งผู้ใช้)

- ลบ `E:\HELPDESK 004\run-4502.bat` ทั้งไฟล์ มาตรฐานรันใหม่ = Docker (`docker-compose.yml` Postgres 17) + `npm run dev:4502` / prod บน Vercel (`DEPLOY_VERCEL.md`)
- ยกเลิกแผน Operator Console ใน startup script (SKILL2 Gap #5) — `/terminal` ยังเก็บไว้เป็นหน้า ADMIN read-only (health/overview/tickets/logs)
- ไฟล์ที่แก้รอบนี้: `helpdesk/README.md`, `helpdesk/AGENTS.md`, `KB_web.md`, `ACCEPTANCE_CHECKLIST.md` (ข้อ 21,22,28,29 → N/A + ล้างขยะท้ายไฟล์), `src/app/terminal/page.tsx` (conn-status + svc-meta เลิกอ้าง localhost:4502)
- Verify รอบนี้: `tsc --noEmit` + `npm run build` ต้องผ่าน (ดูผลด้านล่างหลังเทส)

## 2026-09-13 — รอบ Vercel deploy prep (F2–F3)

### F2 — Code changes สำหรับ Vercel ($0 + Neon + Blob)
- `package.json`: `build` → `prisma generate && next build`, เพิ่ม `db:deploy` (`prisma migrate deploy`), `engines: node 22.x`, เพิ่ม `@vercel/blob`
- `prisma/schema.prisma`: เพิ่ม `directUrl = env("DIRECT_URL")` (Neon pooler 6543 เป็น `DATABASE_URL`, direct 5432 เป็น `DIRECT_URL`; local ใส่ค่าเดียวกันทั้งคู่)
- ใหม่ `src/lib/storage.ts`: `putAttachment`/`getAttachmentBytes` — มี `BLOB_READ_WRITE_TOKEN` ใช้ Vercel Blob (key สุ่มเดาไม่ได้) ไม่มีใช้ disk `uploads/` เหมือนเดิม
- `api/tickets/[id]/attachments/route.ts`: ใช้ storage abstraction แทน `fs` ตรงๆ; response ตัด `storage_path` ออก
- `api/attachments/[id]/route.ts`: ดาวน์โหลดผ่าน storage helper (Blob URL หรือ disk) หลัง authz เดิม
- `api/tickets/[id]/route.ts`: `attachments` ใน response เหลือ metadata (`id/filename/content_type/size/uploaded_by/uploaded_at`) ไม่ส่ง `storage_path` ออกไป — raw URL ไม่รั่ว
- ใหม่ `.env.example`: ครบ `DATABASE_URL/DIRECT_URL/BLOB_READ_WRITE_TOKEN/SEED_*`
- Verify: `tsc --noEmit` ผ่าน, `npm run build` ผ่าน 27 routes

### F3 — Vercel config
- ไม่ต้องมี `vercel.json` — build script + nodejs default + proxy edge-safe ครบแล้ว
- ไม่มี git repo ในเครื่อง (`not a git repository`) — ต้อง `git init` + push GitHub แล้ว import ใน Vercel **หรือ** deploy ตรงด้วย `npx vercel`
- Verify: build ผ่าน (มี `prisma generate` ใน build แล้ว)

### F4 — รอของจากผู้ใช้ (ทำต่อไม่ได้จนกว่าจะได้)
- Neon: `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) → ตั้งใน Vercel Env + รัน `prisma migrate deploy` + seed จากเครื่อง
- Vercel Blob store → `BLOB_READ_WRITE_TOKEN` ใน Vercel Env
- เลือกทาง deploy: GitHub import หรือ `npx vercel` CLI

## 2026-09-13 — Smoke local หลังแก้ Vercel-prep (dev server :4502, DB local)

- `/api/health`: `ok/connected` (DIRECT_URL ใหม่ใช้งานได้)
- ADMIN login 200 / รหัสผิด 401 / `me` = ADMIN
- `tickets` total=2, `assets` count=2 + detail 200, ticket detail history/attachments ครบ และ **ไม่รั่ว `storage_path`**
- `/api/users`: USER full→403, USER ?role=TECH→403, TECH ?role=TECH→200, TECH full→403, ADMIN full→200 (3 users)
- `POST comments` ด้วย USER→201, history 1→2, USER ไม่เห็น internal
- หมายเหตุ: มี history `smoke-test comment ลบทิ้งได้` 1 แถวใน DB local (ลบได้)
- Dev server ยังรันค้างที่ :4502 หลัง smoke (ดับเบิลคลิก `run-4502.bat` จะ kill ตัวเก่าแล้วรันใหม่เอง)

## 2026-09-13 — Prod-mode proof (`next start` :4503 จาก build เดียวกับที่จะขึ้น Vercel)

- `/api/health` → `ok/connected` (latency 2ms), `/login` → 200, `/api/tickets` ไม่มี session → 401 (proxy ทำงาน)
- หยุด prod server หลังเทสแล้ว — เครื่องว่างสำหรับ `run-4502.bat` (dev :4502) ตามปกติ


## 2026-09-12 — รอบ P1–P5 (ตามแผน SKILL2.md / KB_web.md)

### P1 — ฟอร์มแจ้งซ่อม
- `src/app/new-ticket/page.tsx`: เพิ่มฟิลด์ `contact/department/impact/urgency` (optional) + ส่งใน POST body
- Backend `POST /api/tickets` + `ticket-service:createTicket` รองรับอยู่แล้ว ไม่ต้องแก้
- Verify: `tsc --noEmit` ผ่าน

### P2 — หน้า Detail งาน
- `src/app/track/[id]/page.tsx`: เพิ่ม input `diagnosis/work_performed/parts_used/resolution`, checkbox `is_internal`, `window.confirm` ก่อน `CLOSED`, ช่อง comment + แสดงไฟล์แนบ
- ใหม่ `POST /api/tickets/[id]/comments/route.ts`: comment โดยไม่เปลี่ยนสถานะ (USER เห็นเฉพาะ non-internal, staff ตั้ง internal ได้, บันทึก `ticket.commented` ใน transaction)
- Backend `PATCH /api/tickets/[id]` รองรับ 4 ฟิลด์ + `is_internal` อยู่แล้ว
- Verify: `tsc` ผ่าน; **ยังไม่ได้ verify ด้วยตาจริง (repro: เปิด track/[id] เป็น TECH กด CLOSED ต้องมี confirm, USER ต้องไม่เห็น internal)**

### P3 — Asset/Admin/List + สิทธิ์
- ใหม่ `src/app/assets/[id]/page.tsx`: detail + ประวัติซ่อม 10 ใบ (ใช้ `GET /api/assets/[id]` ที่มีแล้ว); `assets/page.tsx` ลิงก์ไป detail
- `src/app/api/users/route.ts`: ล็อก full list ให้ ADMIN-only; TECH/ADMIN ดู `?role=TECH|ADMIN` ได้ (assignment dropdown ยังใช้ได้)
- `my-tickets/page.tsx`: เพิ่ม sort (`created_at/updated_at/priority/status`) + order
- `admin/page.tsx`: เพิ่ม tab `users`, filter `from/to`, sort, pagination (`page/limit`, API รองรับแล้ว)
- Verify: `tsc` ผ่าน, `build` ผ่าน

### P4 — ไฟล์แนบ
- ใหม่ `POST /api/tickets/[id]/attachments/route.ts`: multipart upload สูงสุด 10MB เก็บไฟล์ใน `helpdesk/uploads/<ticket_id>/` + metadata ใน DB + `activityLog`
- ใหม่ `GET /api/attachments/[id]/route.ts`: ดาวน์โหลดพร้อม authz ตาม parent ticket
- `.gitignore`: เพิ่ม `/uploads`
- Verify: `tsc` ผ่าน; **ยังไม่ได้ verify อัปโหลดจริง (ต้องรัน dev + ลองแนบไฟล์)**

### P5 — Startup script
- `E:\HELPDESK 004\run-4502.bat` **หายจาก disk จึงสร้างใหม่**: คงพฤติกรรมเดิม + เพิ่ม `[2/5]` ตรวจ `DATABASE_URL` ใน `.env` + `prisma migrate status` ล้มแล้ว exit 1, `[5/5]` poll `/api/health` 60 วินาที ล้มแล้ว exit 1 (fail-loud ตาม SKILL2.md)
- Design polish (ลด gradient/all-caps ตาม SKILL2.md:66-70) **เลื่อน**: เสี่ยง ghost rewrite ทั้งไฟล์ ขอแยกเป็นรอบเฉพาะ ไม่รวมกับฟีเจอร์รอบนี้

### P6 — ตรวจสอบรวม
- `npx tsc --noEmit`: ผ่าน (no output)
- `npm run build`: ผ่าน — 27 routes (ใหม่: `/assets/[id]`, `/api/tickets/[id]/comments`, `/api/tickets/[id]/attachments`, `/api/attachments/[id]`)
- `npx prisma migrate status`: **timeout 60s ยังไม่ได้ verify — ต้องให้ผู้ใช้รันเองเมื่อ DB พร้อม**
- Smoke 50 concurrent + รีวิว 4 role: **ยังไม่ได้ทำ**

### ไฟล์เปลี่ยนจริง (รอบนี้)
`new-ticket/page.tsx`, `track/[id]/page.tsx`, `assets/page.tsx`, `assets/[id]/page.tsx` (ใหม่), `my-tickets/page.tsx`, `admin/page.tsx`, `api/users/route.ts`, `api/tickets/[id]/comments/route.ts` (ใหม่), `api/tickets/[id]/attachments/route.ts` (ใหม่), `api/attachments/[id]/route.ts` (ใหม่), `.gitignore`, `run-4502.bat` (สร้างใหม่), `CHANGELOG.md` (ใหม่)
