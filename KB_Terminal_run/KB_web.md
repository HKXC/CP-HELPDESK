# KB — CP Helpdesk ระบบแจ้งซ่อมครุภัณฑ์ (Knowledge Base)

> เอกสารกลางรวมทุกอย่างของระบบ: วัตถุประสงค์, ฟีเจอร์ละเอียดรายหน้า,
> ข้อมูล, workflow, สิทธิ์, สถานะงานจริง, ของที่ทำแล้ว/ของที่ค้าง
> อัปเดตล่าสุด: 2026-09-16 • ไฟล์นี้เป็น **as-built + spec** คู่กับ `SKILL2.md` (สัญญา DoD)
> รอบ 2026-09-16: บันทึกแผน Portable ที่อนุมัติแล้ว (ดู §15 ท้ายไฟล์) — เนื้อหา §1–§14 ยังเป็นของรอบ 2026-09-15 ไม่ rewrite

---

## 1. Purpose

สร้างระบบ Helpdesk สำหรับรับแจ้งปัญหาและแจ้งซ่อมอุปกรณ์ครุภัณฑ์/ระบบ IT
แบบเป็นระบบ ใช้งานผ่านเว็บ โครงสร้าง **Side Navigation** ตามตัวอย่าง
`https://toolfolio.com/` (ใช้เฉพาะแพทเทิร์นเมนูซ้าย ไม่คัดลอกแบรนด์/โค้ดของเขา)

**จุดประสงค์ 7 ข้อ + สถานะการ implement (อัปเดต 2026-09-13):**

| # | วัตถุประสงค์ | สถานะ | อยู่ที่ไหน |
|---|---|---|---|
| 1 | รับแจ้งปัญหา/แจ้งซ่อม IT อย่างเป็นระบบ | ✅ มีแล้ว (DB) | `src/app/new-ticket/page.tsx` → `POST /api/tickets` → `ticket-service.ts:createTicket` เลข `HD-YY-XXXX` จาก `ticket_no_seq` |
| 2 | ผู้ใช้แจ้ง + ติดตามสถานะสะดวก | ✅ มีแล้ว (API) | `my-tickets`/`track`/`track/[id]` ดึง `GET /api/tickets` + timeline 10 ขั้น |
| 3 | เจ้าหน้าที่รับ/มอบหมาย/จัดการงานมีประสิทธิภาพ | ✅ มีแล้ว (API+สิทธิ์) | `technician` + แผงจัดการใน `[id]` + `PATCH /api/tickets/[id]` (version check) |
| 4 | ลดงานตกหล่น + ลดเอกสาร | ✅ มีแล้ว (DB) | `page.tsx` → `GET /api/overview` นับงานจริง + overdue — ยังขาด UI ตั้ง `due_at`/SLA (รอเฟส 4) |
| 5 | เก็บประวัติ ตรวจสอบย้อนหลังได้ | ✅ มีแล้ว (PostgreSQL) | `TicketHistory`+`ActivityLog` ใน Postgres (`actor_id` FK) + `GET /api/tickets/[id]` history |
| 6 | รวบรวมข้อมูลวิเคราะห์ + ทำรายงาน | ✅ มีแล้ว (พื้นฐาน, DB) | `admin?tab=reports` กราฟแท่ง 10 สถานะ + `byCategory` + Export CSV — ยังขาดรายงานช่วงเวลา/ช่าง/SLA (รอเฟส 4) |
| 7 | เก็บเลขทรัพย์สิน (tags, Serial number) | ✅ มีแล้ว (PostgreSQL) | `Asset` (`String[]` tags) + `GET /api/assets` + ผูก `asset_id` FK |

---

## 2. Roles and Permissions

### 2.1 Requester (USER) — มีแล้ว (API + UI)
- สร้างใบแจ้งซ่อม (`/new-ticket` → `POST /api/tickets`)
- ดูเฉพาะงานที่ตัวเองแจ้ง (`/my-tickets` → `GET /api/tickets` กรอง `requester_id` ฝั่ง server)
- ดูสถานะ + ประวัติของงานตัวเอง (`/track/[id]` → `GET /api/tickets/[id]`; `is_internal=false` เท่านั้น)
- Reopen ได้เมื่อ `RESOLVED`/`CLOSED` → `POST /api/tickets/[id]/reopen`
- ยังทำไม่ได้: คอมเมนต์ติดตามเพิ่ม, ยืนยันปิดงานแบบละเอียด (รอเฟส 4)

### 2.2 Technician (TECH) — มีแล้ว (API + 10 สถานะ)
- ดูคิวงาน (`/technician` = `GET /api/tickets` กรอง `technician_id == me` หรือ `NEW/TRIAGED/ASSIGNED` รอรับ)
- เปลี่ยนสถานะตาม `ALLOWED_TRANSITIONS` 10 สถานะ (→ `PATCH /api/tickets/[id]` + `version` check)
- บันทึก `solution`/`diagnosis`/`resolution` + หมายเหตุเปลี่ยนสถานะ (`is_internal` ได้)
- ดูข้อมูลครุภัณฑ์ที่ผูกกับงาน
- ยังทำไม่ได้: บันทึก diagnosis/parts แยกฟิลด์ละเอียด, แนบไฟล์, ส่งงานกลับขอข้อมูลเพิ่มเป็น UI ปุ่มเฉพาะ (รอเฟส 4 — API รองรับ `WAITING_REQUESTER` แล้ว)

### 2.3 Supervisor — ไม่มี (ตามมติ SKILL2.md: 3 roles)
- ตามสเปกปัจจุบัน: ใช้ 3 roles (Requester, Technician, Administrator) — Administrator รวมหน้าที่ triage/Supervisor แล้ว
- ถ้าปริมาณ triage มากจน ADMIN ได้สิทธิ์เกินควร ค่อยแยก `SUPERVISOR` ใหม่ (SKILL2.md:120)

### 2.4 Administrator (ADMIN) — มีแล้ว (API)
- ดูงานทั้งหมด (`/admin` → `GET /api/tickets?limit=100`), มอบหมาย/เปลี่ยนช่าง (`PATCH ... technician_id`), รายงาน + Export CSV
- จัดการครุภัณฑ์ (`POST/PATCH/DELETE /api/assets`, `409` เมื่อ `asset_code`/`serial_number` ชน)
- เข้า Terminal ~~(`/terminal` ADMIN-only, 4 blocks ข้อมูลจริง)~~ — เอาออกแล้ว 2026-09-15 ตามคำสั่งผู้ใช้ (ดู health/overview/tickets/logs ผ่าน API และ `/admin` แทน)
- ยังทำไม่ได้: จัดการผู้ใช้/แผนก/หมวดหมู่, ตั้งค่า SLA/retention (รอเฟส 4)

### 2.5 บัญชีทดสอบ (seed ใน PostgreSQL — bcrypt)

| Role | อีเมล | รหัสผ่าน (ENV) | ชื่อ | หมายเหตุ |
|---|---|---|---|---|
| USER | `user@jp.local` | `SEED_USER_PASSWORD` | พนักงานทั่วไป | แผนกบัญชี |
| TECH | `tech@jp.local` | `SEED_TECH_PASSWORD` | ช่างสมชาย | IT Support |
| ADMIN | `admin@jp.local` | `SEED_ADMIN_PASSWORD` | แอดมิน JP | IT |

> ✅ รหัส hash ด้วย **bcrypt (cost 12)** ใน `prisma/seed.ts` จาก ENV (`SEED_*_PASSWORD` ไม่ set = seed ล้ม) — ไม่มี plaintext ใน DB/seed แล้ว (ปิด Gap SKILL2.md #4)

### 2.6 การบังคับสิทธิ์ปัจจุบัน
- ฝั่ง client: `AppShell` → `GET /api/auth/me` ถ้าไม่มีเด้ง `/login`; เมนูช่าง/แอดมินซ่อนตาม role; `proxy.ts` redirect หน้า (`307 → /login`) และ `401` สำหรับ `/api/*` ถ้าไม่มี `helpdesk_session`
- ✅ ฝั่ง server: ทุก `API` เรียก `getSession()`/`requireRole()`; `USER` เห็นเฉพาะ `requester_id==me`, `TECH`/`ADMIN` เขียนได้เฉพาะงานที่ได้รับมอบหมายตาม `ALLOWED_TRANSITIONS` + `version` check; `is_internal` กรองที่ `GET /api/tickets/[id]` แล้ว

---

## 3. Ticket Data (ฟิลด์ใบแจ้งซ่อม)

### 3.1 ฟิลด์ที่มีแล้ว (PostgreSQL `Ticket` — `prisma/schema.prisma:51`)

| ฟิลด์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | `cuid()` | stable id |
| `ticket_no` | `String @unique` | `HD-YY-XXXX` จาก `ticket_no_seq` (concurrent-safe) |
| `title` | `String` * | required, validate server |
| `description` | `String` * | required |
| `category` | `String` | คอมพิวเตอร์/ปริ้นเตอร์/เน็ตเวิร์ก/ซอฟต์แวร์/ไฟฟ้าทั่วไป/อื่นๆ |
| `priority` | `Priority` enum | LOW/MEDIUM/HIGH/URGENT |
| `status` | `TicketStatus` enum 10 ค่า | NEW/TRIAGED/ASSIGNED/IN_PROGRESS/WAITING_REQUESTER/WAITING_PARTS/RESOLVED/CLOSED/REOPENED/CANCELLED |
| `asset_code` | `String?` | manual คงไว้ตาม SKILL2.md:161 |
| `serial_number` | `String?` | ดึงจาก Asset เมื่อผูก `asset_id` |
| `asset_id` | `String? FK → Asset.id` | ผูกครุภัณฑ์จริง |
| `location` | `String?` |  |
| `contact` | `String?` | DB มีแล้ว, UI ยังไม่เพิ่ม (รอเฟส 4) |
| `department` | `String?` | DB มีแล้ว, UI ยังไม่เพิ่ม |
| `impact/urgency` | `String?` | DB มีแล้ว, UI ยังไม่เพิ่ม |
| `requester_id` | `FK → User.id` | |
| `technician_id` | `String? FK` | |
| `diagnosis/work_performed/parts_used/resolution` | `String?` | DB มีแล้ว, UI ยังแสดงรวมใน `solution` (รอเฟส 4 แยกฟิลด์) |
| `solution` | `String?` | legacy, ยังใช้ |
| `accepted_at/started_at/resolved_at/closed_at/due_at` | `DateTime?` | DB มีแล้ว, UI ยังแสดงแค่ `created_at` (รอเฟส 4) |
| `version` | `Int @default(1)` | optimistic locking — `PATCH` ต้องส่ง `version` ตรงกัน ไม่งั้น `409` |
| `created_at/updated_at` | `DateTime` | เก็บ UTC, แสดง local ที่ UI |

`Requester`/`Technician` → `User` FK จริง, `Asset` FK จริง, index ทุกฟิลด์ค้นหา (`status/priority/category/requester_id/technician_id/created_at/asset_code/serial_number/ticket_no`)

### 3.2 ฟิลด์ที่ DB มีแล้วแต่ UI ยังไม่เปิด (เฟส 4)
`contact`/`department`/`impact`/`urgency` (ฟอร์ม), `asset_id` FK เต็มรูปแบบ, `due_at` (SLA), `accepted/started/resolved/closed_at` แสดงแยก, `diagnosis/work_performed/parts_used/resolution` แยก, `internal_notes` (`is_internal` มีแล้วที่ `TicketHistory`), `requester_confirmation`, ไฟล์แนบ (`Attachment` model มีแล้ว แต่ยังไม่มี upload/download API)

---

## 4. Asset Data (ครุภัณฑ์)

### 4.1 ฟิลด์ที่มีแล้ว (`Asset` — `prisma/schema.prisma:28`)

`asset_code` UNIQUE, `name`, `category`, `serial_number` UNIQUE, `tags` `String[]` native Postgres, `location`, `brand`, `model`, `department`, `owner`, `purchase_date`, `warranty`, `status` (`ACTIVE/IN_REPAIR/RETIRED/LOST`), `notes`, `version`, `created_at/updated_at`, `@@index`

Seed 4 ชิ้น: `JP-PC-001` (PC Dell), `JP-PR-012` (Canon LBP6230), `JP-NB-007` (ThinkPad), `JP-NET-003` (UniFi U6) — smoke เพิ่ม `JP-PC-999` ลบแล้ว

### 4.2 พฤติกรรมที่มีแล้ว (API)
- `GET /api/assets?q=` ค้นหา `asset_code/name/serial/location/tags` (case-insensitive, `String[] has`)
- `POST /api/assets` (ADMIN-only, `409` เมื่อ `asset_code`/`serial_number` ชน)
- `PATCH /api/assets/[id]` (`version` check), `DELETE /api/assets/[id]` (ถ้ามี ticket ผูก → `RETIRED` แทนลบ)
- ฟอร์มแจ้งซ่อม `new-ticket` datalist `GET /api/assets?limit=100` → เติม `serial/location` + แสดง Tags

### 4.3 ของที่ยังไม่มี (เฟส 4)
หน้า detail `/assets/[id]` + ประวัติซ่อมราย asset (ดึงจาก `Ticket` ที่ `asset_id` เดียวกัน), ฟอร์ม `brand/model/department/owner/purchase_date/warranty` ใน UI (DB มีแล้ว)

---

## 5. Status Workflow

### 5.1 ปัจจุบัน (10 สถานะ — ใช้จริงใน DB + API + UI)

```
NEW(ใหม่) → TRIAGED(คัดกรองแล้ว) → ASSIGNED(มอบหมายแล้ว) → IN_PROGRESS(กำลังซ่อม)
  → WAITING_REQUESTER(รอข้อมูล) / WAITING_PARTS(รออะไหล่) → RESOLVED(แก้ไขแล้ว) → CLOSED(ปิดงาน)
  ↘ CANCELLED(ยกเลิก)   และ  REOPENED(เปิดใหม่) ← RESOLVED/CLOSED
```

`STATUS_LABEL`/`STATUS_ORDER` ใน `src/lib/constants.ts` (10 ค่า), `ALLOWED_TRANSITIONS` ใน `src/lib/ticket-service.ts`, `TicketStatus` enum ใน `prisma/schema.prisma`
API: `PATCH /api/tickets/[id]` → `transitionTicket()` (transaction + `version` optimistic locking), `POST /api/tickets/[id]/reopen`
UI: `StatusBadge.tsx` 10 สี, `track/[id]/page.tsx` timeline 10 ขั้น + progress bar + ปุ่ม `nextStatuses` ตาม `ALLOWED`, ปุ่ม Reopen

Map จาก 6 สถานะเดิม: `PENDING→NEW`, `ACCEPTED→ASSIGNED`, `IN_PROGRESS→IN_PROGRESS`, `WAITING_PARTS→WAITING_PARTS`, `DONE→RESOLVED`, `CLOSED→CLOSED`

### 5.2 กฎ
ทุก transition บันทึก `actor_id/timestamp/from/to/note/is_internal` ใน `TicketHistory` + `ActivityLog` (transaction เดียว, SKILL2.md:358) + ห้าม mutate เงียบ

---

## 6. Screens (รายละเอียดรายหน้า)

### 6.1 `/login` — เข้าสู่ระบบ
- การ์ด glass กลางจอ + ambient glow, โลโก้ CP (`/logo/cp-logo.png`), ฟอร์ม email/password → `POST /api/auth/login` (bcrypt compare, httpOnly `helpdesk_session`, `maxAge 8h`)
- ปุ่มลัดบัญชีทดสอบ 3 สี, error box แดง
- ไฟล์: `src/app/login/page.tsx` (client, ไม่ใช้ `AppShell`)

### 6.2 `/` — แดชบอร์ด
- ดึง `GET /api/overview` (total, `byStatus`, `byCategory`, `recent` 6 ใบ, `overdue`)
- การ์ดสถิติ 4 ใบ (ใหม่/กำลังซ่อม/รออะไหล่-ข้อมูล/เสร็จ+ปิด) + overdue warning, งานล่าสุด 6 ใบ (`StatusBadge`), ครุภัณฑ์ตัวอย่าง `GET /api/assets?limit=5`
- ว่าง = empty state อธิบาย
- ไฟล์: `src/app/page.tsx` (client, `useEffect` fetch)

### 6.3 `/new-ticket` — แจ้งซ่อมใหม่
- ฟิลด์ required `*`: หัวข้อ, รายละเอียดอาการ; `category`/`priority`
- เลือก asset จาก `datalist` (`GET /api/assets`) → เติม `serial/location` + แสดง Tags
- `POST /api/tickets` (validate server, `asset_id` FK, `ticket_no` จาก sequence, `409` กันชน)
- สำเร็จพาไป `/track/[id]` (เห็นเลข ticket ทันที), กันกดซ้ำ (`submitting` disable)
- ไฟล์: `src/app/new-ticket/page.tsx`
- ยังขาด: ช่อง `contact`/`department`/`impact`/`urgency` (DB มีแล้ว, UI รอเฟส 4)

### 6.4 `/my-tickets` — รายการของฉัน
- `GET /api/tickets?status=&limit=100` (server กรอง `requester_id==me` ถ้า USER)
- ฟิลเตอร์ 11 ปุ่ม (ALL + 10 สถานะ)
- ไฟล์: `src/app/my-tickets/page.tsx` — ยังขาด sort ฝั่ง UI (API รองรับ `sort/order`)

### 6.5 `/track` — ติดตามสถานะ
- ช่องค้นหาเดียว `GET /api/tickets?q=` ครอบคลุม `ticket_no/title/description/asset_code/serial/requester.name`
- รองรับ `?q=` จาก Topbar/Sidebar, ปุ่มค้นหา
- ไฟล์: `src/app/track/page.tsx`

### 6.6 `/track/[id]` — รายละเอียด Ticket
- หัวข้อ + `StatusBadge` (สี+ตัวอักษร) + chips หมวด/ผู้แจ้ง/ช่าง + `v{version}`
- Timeline 10 ขั้น + progress bar (`STATUS_ORDER.indexOf`), กล่องรายละเอียด + การ์ด asset/serial/สถานที่
- ประวัติเรียงใหม่→เก่า (กรอง `is_internal` ถ้า USER) + `is_internal` badge
- แผงช่าง/แอดมิน: `solution` textarea + หมายเหตุ + ปุ่มเปลี่ยนสถานะตาม `ALLOWED[ticket.status]` (dynamic), `version` check `409` เมื่อเขียนชน, ปุ่ม Reopen (`POST /api/tickets/[id]/reopen`), มอบหมายช่าง (`PATCH technician_id`, ADMIN-only ใน UI)
- ไฟล์: `src/app/track/[id]/page.tsx`
- ยังขาด: แยก `diagnosis/work_performed/parts_used/resolution` เป็นฟิลด์เดี่ยว, แนบไฟล์, คอมเมนต์ติดตาม (รอเฟส 4)

### 6.7 `/assets` — ครุภัณฑ์
- ค้นหา `q` (`GET /api/assets?q=`, debounce 300ms), รายการ `asset_code/name/SN/location/status/tags`
- ฟอร์มเพิ่มอยู่ข้างขวา (ADMIN-only, `POST /api/assets`, `409` เมื่อชน), ลบ (`DELETE /api/assets/[id]`, ถ้ามี ticket ผูก → `RETIRED`)
- ไฟล์: `src/app/assets/page.tsx` — ยังขาดหน้า detail `/assets/[id]` + ประวัติซ่อมราย asset (รอเฟส 4)

### 6.8 `/knowledge` — คู่มือ/บทความ
- การ์ด 4 เรื่อง (คอม beep/กระดาษติด/Wi-Fi/ทิปแจ้งซ่อม) มี tag + ไอคอน
- ไฟล์: `src/app/knowledge/page.tsx` (static)

### 6.9 `/technician` — งานที่ได้รับมอบหมาย
- `GET /api/auth/me` + `GET /api/tickets?limit=100` → กรอง `technician_id==me || (!technician_id && NEW/TRIAGED/ASSIGNED)`
- chips ผู้แจ้ง/สถานที่/priority + `StatusBadge`
- ไฟล์: `src/app/technician/page.tsx`

### 6.10 `/admin` — ผู้ดูแลระบบ
- แท็บงานทั้งหมด/รายงาน (+ลิงก์ครุภัณฑ์)
- `GET /api/tickets?limit=100` ทั้งหมด (ADMIN), รายงาน: กราฟแท่ง 10 สถานะ (สีตาม severity) + สรุปตามหมวด + Export CSV (BOM, `requester.name`/`technician.name`)
- ไฟล์: `src/app/admin/page.tsx`
- ยังขาด: รายงานตามช่วงเวลา/ช่าง/แผนก/SLA, จัดการผู้ใช้/แผนก/หมวดหมู่, sort/pagination (API รองรับ `page/limit/sort/order` แล้ว)

### 6.11 `/terminal` — ❌ เอาออกแล้ว 2026-09-15 (ตามคำสั่งผู้ใช้ — ลบ `src/app/terminal/` + เมนูใน `AppShell`)
- เดิม: หน้าต่าง terminal ลอยกลางจอ, 4 blocks ข้อมูลจริง (`status`/`overview`/`db --recent`/`logs --tail`), ADMIN-only
- ทดแทน: `GET /api/health`, `GET /api/overview`, `GET /api/tickets`, `GET /api/logs` (API คงอยู่ครบ) + หน้า `/admin`

---

## 7. Navigation

```
Sidebar (desktop 280px ย่อได้เหลือ 76px / mobile drawer)
├── เมนูหลัก (ทุก role)
│   ├── แดชบอร์ด `/`
│   ├── แจ้งซ่อมใหม่ `/new-ticket`
│   ├── รายการของฉัน `/my-tickets`
│   ├── ติดตามสถานะ `/track`
│   ├── ครุภัณฑ์ `/assets`
│   └── คู่มือ / บทความ `/knowledge`
├── ช่างซ่อม (TECH/ADMIN)
│   └── งานที่ได้รับมอบหมาย `/technician`
└── ผู้ดูแลระบบ (ADMIN)
    ├── จัดการงานทั้งหมด `/admin`
    ├── รายงาน `/admin?tab=reports`
    └── จัดการครุภัณฑ์ `/admin?tab=assets`
Topbar: ปุ่มย่อ sidebar + search (ส่ง ?q= ไป /track) + badge role + ชื่อผู้ใช้
```

ไฟล์: `src/components/AppShell.tsx` (NAV_USER/TECH/ADMIN), `proxy.ts:1` (redirect `307 → /login` ถ้าไม่มี `helpdesk_session`, `401` สำหรับ `/api/*`)

---

## 8. Shared UI + Design Tokens

- Tokens กลาง: `src/app/globals.css:5-44` (palette/gradient/shadow/radius) +
  คลาส `glass-card`, `glass-card-interactive`, `btn-gradient`, `glass-input`,
  `  glass-select`, animations (`fade-in/slide-up/slide-in-left`, stagger)
- คอมโพเนนต์ร่วม: `src/components/ui.tsx` (`PageHeader` หัว gradient,
  `Empty`, `Field`, `Chip`), `src/components/StatusBadge.tsx`
  (badge 10 สี มี dot + ตัวอักษร ไม่พึ่งสีอย่างเดียว)
- ⚠️ งานค้างตาม SKILL2.md:66-70: ลด gradient ประดับ (เก็บไว้เฉพาะ primary action),
  ลด all-caps labels — ทำพร้อมเฟส 4

---

## 9. Data Layer

### 9.1 ปัจจุบัน: PostgreSQL (เฟส 2 ✅) — `src/lib/store.ts` deprecated
`src/lib/store.ts` เหลือ re-export `STATUS_LABEL`/`STATUS_ORDER` จาก `constants.ts` + legacy interfaces; ฟังก์ชัน `seedIfEmpty`/`getTickets`/`saveTickets`/`getSession` เป็น no-op + `console.warn` (ข้อมูลอยู่ใน DB แล้ว)

### 9.2 PostgreSQL (เฟส 2 — เสร็จ 2026-09-12)
- DB server: PostgreSQL 17 `postgresql-x64-17` Running, `helpdesk` DB (`helpdesk` user, รหัสผ่านอยู่ใน `.env` ที่ไม่ commit), `postgres` superuser `postgres`
- `prisma@6.19.3` + `@prisma/client` + `pg` + `bcryptjs` + `tsx`
- `prisma/schema.prisma` → `provider = "postgresql"` + `env("DATABASE_URL")` + 4 enums (`Role`/`TicketStatus` 10 ค่า/`Priority`/`AssetStatus`) + 6 tables (`User`/`Asset`/`Ticket`/`TicketHistory`/`Attachment`/`ActivityLog`) + FK จริง + index ทุกฟิลด์ + `version` optimistic locking + `TicketHistory.is_internal`
- Migrations: `prisma/migrations/20260912043824_init/migration.sql` (213 บรรทัด) + `ticket_no_seq` (`CREATE SEQUENCE`, `SELECT nextval`, `setval`)
- `.env` (gitignored): `DATABASE_URL`, `SEED_ADMIN_PASSWORD`, `SEED_TECH_PASSWORD`, `SEED_USER_PASSWORD`
- `docker-compose.yml` (รากโปรเจกต์) สำหรับทางเลือก Docker (ยังไม่ได้ใช้ — ใช้ native)
- `prisma/seed.ts` (bcrypt 12, `upsert` user 3 คน, asset 4 ชิ้น, `createTicket`/`transitionTicket` สร้าง `HD-26-0001` IN_PROGRESS + `HD-26-0002` NEW, history/activity เกิดจาก transaction จริง)
- `src/lib/prisma.ts` (singleton), `src/lib/constants.ts` (10 สถานะ), `src/lib/auth.ts` (`helpdesk_session` httpOnly 8h), `src/lib/ticket-service.ts` (`nextTicketNo` sequence, `ALLOWED_TRANSITIONS`, `createTicket`/`transitionTicket`/`updateTicket` transaction + `version` check), `src/lib/api-helpers.ts`

### 9.3 API (เฟส 3 — เสร็จ 2026-09-12)

| Method | Path | Auth | หมายเหตุ |
|---|---|---|---|
| `POST` | `/api/auth/login` | public | bcrypt compare, set `helpdesk_session` |
| `POST` | `/api/auth/logout` | auth | clear cookie |
| `GET` | `/api/auth/me` | auth | return session |
| `GET` | `/api/tickets` | auth | `q/status/priority/category/technician_id/requester_id/from/to/page/limit/sort/order`, `USER` กรอง `requester_id` |
| `POST` | `/api/tickets` | auth | validate, `asset_code`→`asset_id`, `ticket-service:createTicket` |
| `GET` | `/api/tickets/[id]` | auth | `USER` ดูเฉพาะของตัวเอง + กรอง `is_internal`, history + attachments |
| `PATCH` | `/api/tickets/[id]` | `TECH/ADMIN` | status transition (`version` 409) หรือ field update, `TECH` เฉพาะงานตัวเอง, `ADMIN` reassign |
| `POST` | `/api/tickets/[id]/reopen` | auth | `CLOSED/RESOLVED → REOPENED` |
| `GET` | `/api/assets` | auth | `q/status/page/limit`, `tags has` |
| `POST` | `/api/assets` | `ADMIN` | `409` เมื่อ `asset_code/serial_number` ชน |
| `GET` | `/api/assets/[id]` | auth | + `tickets` 10 ใบล่าสุด |
| `PATCH` | `/api/assets/[id]` | `ADMIN` | `version` 409 |
| `DELETE` | `/api/assets/[id]` | `ADMIN` | ถ้ามี ticket ผูก → `RETIRED` |
| `GET` | `/api/users` | auth | `?role=` |
| `GET` | `/api/overview` | auth | `total/byStatus/byCategory/recent/overdue` (role-scoped) |
| `GET` | `/api/health` | public | `SELECT 1`, `latency_ms` |
| `GET` | `/api/logs` | `ADMIN` | `limit/offset`, `activity_logs` |

กฎ: validate ซ้ำฝั่ง server ทุก write; timestamps UTC แสดง local; ห้าม commit `.env`/secret; ไฟล์แนบ `Attachment` metadata ใน DB (binary ยังไม่มี storage — รอเฟส 4)

### 9.4 กติกา seed (ล็อกแล้ว — ทำแล้ว)
1. User hash bcrypt จาก ENV (`SEED_*_PASSWORD`) ไม่ set = seed ล้ม — ห้าม plaintext ✅
2. Asset insert ตรง ✅
3. ห้าม `createMany` ประวัติปลอม — seed ticket ผ่าน `lib/ticket-service.ts` (`createTicket`/`transitionTicket`) ให้ history/activity เกิดจาก transaction จริง ✅

---

## 10. Operator Console + Startup Script

**Terminal page — เอาออกแล้ว 2026-09-15 (ตามคำสั่งผู้ใช้):** ลบ `src/app/terminal/page.tsx` + เมนูใน `AppShell` แล้ว ดู health/overview/tickets/logs ผ่าน API routes และ `/admin` แทน

**Startup script — ยกเลิกแล้ว 2026-09-14 (ตามคำสั่งผู้ใช้):** `E:\HELPDESK 004\run-4502.bat` ถูกลบทั้งไฟล์ วิธีรันมาตรฐานใหม่ = `docker compose up -d` (Postgres 17) → `npm run dev:4502` ใน `helpdesk/` → เปิด `http://localhost:4502`; ถ้าให้เครื่องอื่นใน Wi-Fi เดียวกันใช้โดยไม่ต้องลงอะไร รัน `npx next dev --port 4502 -H 0.0.0.0` แล้วเปิด `http://<IP-host>:4502/login` (เช่น `http://10.195.255.147:4502/login` ณ 2026-09-15; ต้องเปิด firewall inbound 4502); prod ดู `DEPLOY_VERCEL.md`
- ประวัติ (ไม่ต้องทำตามแล้ว): .bat เดิมมี 5 ด่าน (preflight node/npm → ตรวจ `DATABASE_URL` + `migrate status` → kill node เก่าที่ค้างพอร์ต 4502 → สตาร์ท `dev:4502` เท log → poll `/api/health` 60 วินาที) เทส end-to-end ผ่าน 2026-09-13; ข้อควรจำเดิม: ไฟล์ .bat ต้อง ASCII-only (เคยใส่ไทยแล้ว `cmd` พัง)

**Proxy:** `src/proxy.ts` (export default `proxy`, `config.matcher`) — ตรวจ `helpdesk_session` ทุก `/*` (ยกเว้น `/_next`, `/logo`, `favicon`, `*.png/jpg/svg/css/js/woff2`, `PUBLIC_PATHS: /login,/api/auth/login,/api/health`)

---

## 11. Branding

- โลโก้: `public/logo/cp-logo.png` (จาก `Logo CP.png` ต้นฉบับ 50,163 bytes)
  ใช้บน Sidebar (`AppShell.tsx:124`), Login, favicon (`layout.tsx:7`)
- ชื่อ: **CP Helpdesk** (ลบ `logo-jp.svg` + ไฟล์ตัวอย่าง Next.js แล้ว)

---

## 12. Definition of Done (เช็กลิสต์รวม — อัปเดต 2026-09-13)

- [x] แจ้งซ่อมได้ + ได้เลข unique (`ticket_no_seq` concurrent-safe)
- [x] ค้นหา/ติดตามงานได้ (`GET /api/tickets?q=`)
- [x] มอบหมาย + เปลี่ยนสถานะ + ประวัติแสดง (`PATCH` + `version` + `TicketHistory`)
- [x] ผูก asset tags/Serial กับใบแจ้ง (`asset_code`/`serial_number`/`asset_id` FK + `GET /api/assets` autocomplete)
- [x] รายงาน + Export CSV (10 สถานะ, `byCategory`, BOM)
- [x] Side nav desktop/mobile + build ผ่าน (`npm run build` 26 routes — เอา `/terminal` ออกแล้ว, `ƒ Proxy`)
- [x] ย้าย Postgres + migrations + bcrypt (PostgreSQL 17 `helpdesk` DB, `prisma/migrations/20260912043824_init`, `bcrypt` 12, `SEED_*_PASSWORD` ENV, `ticket_no_seq`)
- [x] API + บังคับสิทธิ์ฝั่ง server + กันเขียนชน (version) (`getSession`/`requireRole` ทุก route, `USER`/`TECH`/`ADMIN` matrix, `version` 409, `is_internal` กรอง)
- [x] 10 สถานะ + Reopen (`TicketStatus` 10 ค่า, `ALLOWED_TRANSITIONS`, `StatusBadge` 10 สี, `track/[id]` dynamic `nextStatuses` + Reopen `POST .../reopen` + timeline 10 ขั้น)
- [x] confirm-close + internal notes UI + contact/department (เสร็จ 2026-09-13: ฟอร์ม `contact/department/impact/urgency`, หน้า detail แยก `diagnosis/work_performed/parts_used/resolution` + `is_internal` checkbox + confirm ก่อน CLOSED + comment `POST .../comments`) — คงเหลือ: `due_at`/SLA UI, รายงานตามช่วงเวลา/ช่าง/SLA
- [x] Supervisor role + จัดการผู้ใช้ — มติ 3 roles (ADMIN รวม Supervisor), มี `/admin/users` + `/assets/[id]` + sort/pagination แล้ว (2026-09-13); ล็อก `GET /api/users` (USER ดูไม่ได้, TECH ดูได้เฉพาะ `?role=TECH|ADMIN`)
- [x] แนบไฟล์ (เสร็จ 2026-09-13: `POST /api/tickets/[id]/attachments` สูงสุด 10MB + `GET /api/attachments/[id]`, เก็บ disk `uploads/` ฝั่ง local / Vercel Blob ฝั่ง prod ผ่าน `src/lib/storage.ts`, response ไม่รั่ว `storage_path`)
- [x] `/terminal` ~~ADMIN-only ข้อมูลจริง 100%~~ — เอาออกแล้ว 2026-09-15 (API health/overview/tickets/logs คงอยู่ครบ)
- [ ] Smoke 50 concurrent + รีวิว 4 role — smoke เดี่ยวผ่าน (login 3 roles, `/api/users` matrix 403/200 ครบ, comment 201 + history งอก, prod-mode `next start` health ok; รอบเย็น 2026-09-15 re-verify: สร้าง `HD-26-0023` → TRIAGED 200, upload/download ตรง 2 รอบรวมหลังแก้ storage, login ผ่าน LAN IP 200), ยังไม่ได้รัน 50 concurrent

---

## 13. วิธีรัน (Docker — ไม่มี .bat แล้ว)

1. `docker compose -f ../docker-compose.yml up -d` (Postgres 17; ครั้งแรกตั้ง `POSTGRES_PASSWORD` ใน shell ก่อน) — ถ้าใช้ native Postgres ข้ามข้อนี้
2. ใน `helpdesk/`: ก๊อป `.env.example` เป็น `.env` แล้วใส่ `DATABASE_URL`/`DIRECT_URL` (+ `SEED_*_PASSWORD` ถ้าจะ seed) → `npx prisma migrate deploy` → `npx prisma db seed` (ครั้งแรกครั้งเดียว)
3. `npm run dev:4502` (ครั้งแรก compile 60–90 วินาที) → เปิด `http://localhost:4502` → `/login` (บัญชีตามข้อ 2.5, รหัสจาก `.env` ของเครื่องนั้น)
3b. ให้เครื่องอื่นใช้โดยไม่ต้องลงอะไร (2026-09-15): ที่เครื่อง host รัน `npx next dev --port 4502 -H 0.0.0.0` → เครื่องอื่นใน Wi-Fi เดียวกันเปิด `http://<IP-host>:4502/login` (IP ดูด้วย `Get-NetIPAddress`; ถ้าเข้าไม่ได้ให้เปิด firewall inbound พอร์ต 4502)
4. ทดสอบ: `GET /api/health` → `{"status":"ok","db":"connected"}` (หน้า `/terminal` เอาออกแล้ว 2026-09-15 — ดูข้อมูลผ่าน `/admin` แทน)
5. `ERR_CONNECTION_REFUSED` = เซิร์ฟเวอร์ยังไม่รัน กลับไปข้อ 3

---

## 14. Phase Summary (2026-09-13)

| Phase | สถานะ | สิ่งที่เสร็จ | สิ่งที่ค้าง |
|---|---|---|---|
| **1 — LocalStorage Prototype** | ✅ เสร็จ | 10 หน้า, 6 สถานะ, `store.ts`, glassmorphism | — |
| **2 — PostgreSQL Migration** | ✅ เสร็จ | `postgresql` provider, 10 สถานะ enum, 6 tables + FK + index + `version` + `sequence`, `prisma/seed.ts` bcrypt | — |
| **3 — API + Auth** | ✅ เสร็จ | 13 endpoints, `httpOnly` cookie, `proxy.ts`, `ticket-service` transaction + optimistic locking | — |
| **4 — Full Features** | ✅ เสร็จหลัก | ฟอร์ม `contact/department/impact/urgency`, detail แยก `diagnosis/parts` + `is_internal` + confirm-close + comments, `/assets/[id]`, `/admin/users` + sort/pagination, attachments 10MB + authz, ล็อก `/api/users` | `due_at`/SLA UI, รายงานช่วงเวลา/ช่าง, ลด gradient/all-caps (แยกเฟส) |
| **5 — Terminal** | ❌ เอาออก 2026-09-15 | เคยมี `/terminal` 4 blocks ข้อมูลจริง — ลบทั้งหน้า+เมนูตามคำสั่งผู้ใช้, API คงอยู่ | — |
| **5.1 — Startup script test** | ⏸️ ยกเลิก 2026-09-14 | เคยเทส end-to-end ผ่าน 2026-09-13 (5 ด่านถึงเปิดเบราว์เซอร์) — .bat ถูกลบแล้ว ไม่ต้องทำตาม | — |
| **6 — Vercel prep** | ⏳ รอ secret + ปิด SSO wall | `prisma generate` ใน build, `engines node 22`, `directUrl`, `src/lib/storage.ts` (Blob/prod + disk/dev — อ่าน disk เฉพาะใต้ `uploads/` + `turbopackIgnore`, ไม่มี build warning), lockfile มี Linux optional binaries, link project `cp-helpdesk` แล้ว, push ถึง `main` แล้ว, `DEPLOY_VERCEL.md` (มีขั้นตอนปิด Deployment Protection) | Neon 2 URLs + Blob token + ปิด Deployment Protection (F4 — `vercel env ls` ยังว่าง, prod เจอกำแพง SSO อยู่ ณ 2026-09-15) |

**ไฟล์สำคัญที่เพิ่ม/แก้ 2026-09-11→12:**
- `docker-compose.yml` (ทางเลือก Docker), `.env` (DATABASE_URL + SEED_*_PASSWORD)
- `prisma/schema.prisma` (postgresql, 10 statuses, 6 tables), `prisma/migrations/20260912043824_init/migration.sql`, `prisma/seed.ts`
- `src/lib/prisma.ts`, `src/lib/constants.ts`, `src/lib/auth.ts`, `src/lib/ticket-service.ts`, `src/lib/api-helpers.ts`, `src/proxy.ts` (ex-`middleware.ts`), `src/lib/store.ts` (deprecated re-export)
- `src/app/api/*` (13 routes), `src/components/StatusBadge.tsx` (10 สี), `src/components/AppShell.tsx`, `src/app/*` (login/page/new-ticket/my-tickets/track/technician/admin/assets — ย้ายเป็น fetch)
- `package.json` (+`tsx`, `db:seed`, `db:reset`, `prisma.seed`)

---

## 15. Addendum 2026-09-16 — แผน Portable (อนุมัติแล้ว ยังไม่ implement)

- มติผู้ร้องขอ: รันได้ทุกเครื่อง ห้าม hardcode credential; Postgres เป็น system of record ทั้งหมด (ไม่ใช่แค่ log); เว็บบน Vercel (prod) หรือ domain service ใดๆ (`build` + `start -p $PORT`, `NODE_ENV=production`); DB ได้ทุกแบบ (Docker/native/Neon/on-prem) ผ่าน env เท่านั้น
- `.env.example` กลับมา tracked แล้ว (commit `51a45cc`); `.env`/`.env.local` ยัง ignored; แผนต่อ: `.env.example` ใส่ default local (`change-me-*`) + `setup.ps1`/`check.ps1` + `PORT` override + docs 3 ทาง + domain service
- กฎห้าม hardcode ยังคงเดิม (SKILL2 § Known Gaps ข้อ 9); test แผนอยู่ `ACCEPTANCE_CHECKLIST.md` ข้อ 30–37 (ยังไม่รัน); สถานะสั้นๆ ดู `KB_web.md` (root)

