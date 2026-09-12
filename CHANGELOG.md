# CHANGELOG — CP Helpdesk

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
