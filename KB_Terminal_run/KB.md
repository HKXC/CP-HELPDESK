# KB — CP Helpdesk ระบบแจ้งซ่อมครุภัณฑ์ (Knowledge Base)

> เอกสารกลางรวมทุกอย่างของระบบ: วัตถุประสงค์, ฟีเจอร์ละเอียดรายหน้า,
> ข้อมูล, workflow, สิทธิ์, สถานะงานจริง, ของที่ทำแล้ว/ของที่ค้าง
> อัปเดตล่าสุด: 2026-09-11 • ไฟล์นี้เป็น **as-built + spec** คู่กับ `SKILL2.md` (สัญญา DoD)

---

## 1. Purpose

สร้างระบบ Helpdesk สำหรับรับแจ้งปัญหาและแจ้งซ่อมอุปกรณ์ครุภัณฑ์/ระบบ IT
แบบเป็นระบบ ใช้งานผ่านเว็บ โครงสร้าง **Side Navigation** ตามตัวอย่าง
`https://toolfolio.com/` (ใช้เฉพาะแพทเทิร์นเมนูซ้าย ไม่คัดลอกแบรนด์/โค้ดของเขา)

**จุดประสงค์ 7 ข้อ + สถานะการ implement:**

| # | วัตถุประสงค์ | สถานะ | อยู่ที่ไหน |
|---|---|---|---|
| 1 | รับแจ้งปัญหา/แจ้งซ่อม IT อย่างเป็นระบบ | ✅ มีแล้ว | `src/app/new-ticket/page.tsx` ฟอร์ม + เลข `HD-YY-XXXX` อัตโนมัติ |
| 2 | ผู้ใช้แจ้ง + ติดตามสถานะสะดวก | ✅ มีแล้ว | `src/app/my-tickets/page.tsx`, `src/app/track/page.tsx`, `src/app/track/[id]/page.tsx` (timeline + progress bar) |
| 3 | เจ้าหน้าที่รับ/มอบหมาย/จัดการงานมีประสิทธิภาพ | ✅ มีแล้ว (พื้นฐาน) | `src/app/technician/page.tsx`, แผงจัดการใน `[id]`, มอบหมายช่าง (Admin) |
| 4 | ลดงานตกหล่น + ลดเอกสาร | ✅ มีแล้ว (พื้นฐาน) | `src/app/page.tsx` แดชบอร์ดนับงานค้าง — ยังขาด SLA/`due_at` (รอเฟส 4) |
| 5 | เก็บประวัติ ตรวจสอบย้อนหลังได้ | ✅ มีแล้ว (LocalStorage) | `ticket_history` ใน `src/lib/store.ts` + หน้า detail — ต้องย้ายลง Postgres พร้อม `actor_id` (รอเฟส 2) |
| 6 | รวบรวมข้อมูลวิเคราะห์ + ทำรายงาน | ✅ มีแล้ว (พื้นฐาน) | `src/app/admin/page.tsx?tab=reports` กราฟแท่ง + Export CSV (BOM) — ยังขาดรายงานตามช่วงเวลา/ช่าง/ SLA (รอเฟส 4) |
| 7 | เก็บเลขทรัพย์สิน (tags, Serial number) | ✅ มีแล้ว | `src/app/assets/page.tsx` ค้นหา asset_code/tags/serial + ผูกกับใบแจ้งซ่อม |

---

## 2. Roles and Permissions

### 2.1 Requester (USER) — มีแล้ว
- สร้างใบแจ้งซ่อม (`/new-ticket`)
- ดูเฉพาะงานที่ตัวเองแจ้ง (`/my-tickets` กรอง `requester_id`)
- ดูสถานะ + ประวัติของงานตัวเอง (`/track/[id]`)
- ยังทำไม่ได้: คอมเมนต์ติดตามเพิ่ม, กดยืนยันปิดงาน/แจ้งว่ายังไม่หาย (รอเฟส 4)

### 2.2 Technician (TECH) — มีแล้ว
- ดูคิวงาน (`/technician` = งานที่ `technician_id` ตรงกับตัวเอง + งาน `PENDING`/`ACCEPTED` รอรับ)
- รับงาน/เปลี่ยนสถานะ 5 ปุ่ม (รับเรื่อง/กำลังซ่อม/รออะไหล่/ซ่อมเสร็จ/ปิดงาน)
- บันทึกวิธีแก้ (`solution`) + หมายเหตุเปลี่ยนสถานะ
- ดูข้อมูลครุภัณฑ์ที่ผูกกับงาน
- ยังทำไม่ได้: บันทึก diagnosis/parts แยกฟิลด์, แนบไฟล์, ส่งงานกลับขอข้อมูลเพิ่ม (รอเฟส 4)

### 2.3 Supervisor — ยังไม่มี (สเปก SKILL2.md บังคับ)
- ตามสเปก: triage, จัดลำดับความสำคัญ, assign/reassign, ดู workload/SLA/รายงาน
- แผน: เพิ่มเป็น role ที่ 4 (`SUPERVISOR`) ใช้หน้าจอ admin ร่วมกันก่อน แล้วค่อยแยกมุมมอง

### 2.4 Administrator (ADMIN) — มีแล้ว
- ดูงานทั้งหมด (`/admin`), มอบหมาย/เปลี่ยนช่าง (`/admin` → detail), รายงาน + Export CSV
- จัดการครุภัณฑ์ (เพิ่ม/ลบ ผ่าน `/assets`)
- ยังทำไม่ได้: จัดการผู้ใช้/แผนก/หมวดหมู่, ตั้งค่า SLA/retention (รอเฟส 4)

### 2.5 บัญชีทดสอบ (seed ปัจจุบัน — LocalStorage)

| Role | อีเมล | รหัสผ่าน | หมายเหตุ |
|---|---|---|---|
| USER | `user@jp.local` | (ดูใน `.env` — ไม่ commit) | ชื่อ "พนักงานทั่วไป" แผนกบัญชี |
| TECH | `tech@jp.local` | (ดูใน `.env` — ไม่ commit) | ชื่อ "ช่างสมชาย" แผนก IT Support |
| ADMIN | `admin@jp.local` | (ดูใน `.env` — ไม่ commit) | ชื่อ "แอดมิน JP" แผนก IT |

> ⚠️ รหัสยังเป็น **plaintext** ใน seed — ตอนย้าย PostgreSQL ต้อง hash ด้วย bcrypt จาก ENV
> (`SEED_*_PASSWORD`, ไม่ set = seed ล้มดังๆ) ตามกติกาที่ล็อกไว้

### 2.6 การบังคับสิทธิ์ปัจจุบัน
- ฝั่ง client: `AppShell` เช็ก session ถ้าไม่มีเด้ง `/login`; เมนูช่าง/แอดมินซ่อนตาม role
- ⚠️ ยังไม่มีการบังคับฝั่ง server (ไม่มี API) — ต้องทำตอนเฟส 3 (ห้ามซ่อนปุ่มอย่างเดียว)

---

## 3. Ticket Data (ฟิลด์ใบแจ้งซ่อม)

### 3.1 ฟิลด์ที่มีแล้ว (ใน `Ticket` — `src/lib/store.ts`)

| ฟิลด์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | string (uid) | stable id ภายใน |
| `ticket_no` | string UNIQUE | ฟอร์แมต `HD-YY-XXXX` (นับจากจำนวนใน browser — ⚠️ 50 คนกดพร้อมกันเลขชนได้ ต้องเปลี่ยนเป็น DB sequence เฟส 2) |
| `title` | string * | หัวข้อ (required) |
| `description` | string * | อาการ (required) |
| `category` | enum | คอมพิวเตอร์/ปริ้นเตอร์/เน็ตเวิร์ก/ซอฟต์แวร์/ไฟฟ้าทั่วไป/อื่นๆ |
| `priority` | LOW/MEDIUM/HIGH/URGENT | |
| `status` | 6 สถานะ (ดูข้อ 5) | |
| `asset_code` | string? | พิมพ์เองหรือเลือกจาก datalist |
| `serial_number` | string? | ดึงอัตโนมัติเมื่อเลือก asset |
| `location` | string? | ดึงอัตโนมัติจาก asset ได้ |
| `requester_id/name` | string | |
| `technician_id/name` | string? | |
| `solution` | string? | บันทึกช่าง (เห็นทุกคน — ⚠️ ยังไม่แยก internal notes) |
| `created_at/updated_at` | ISO string | |

### 3.2 ฟิลด์ที่สเปกบังคับแต่ยังไม่มี (เฟส 4)
`contact` (เบอร์/ช่องทางติดต่อ), `department`, `impact/urgency`,
`asset_id FK` (ผูก asset จริง คงช่อง manual ไว้ตาม SKILL2.md:161),
`due_at` (SLA), `accepted/started/resolved/closed_at` แยก timestamp,
`diagnosis/work_performed/parts_used/resolution` แยกจากกัน,
`internal_notes` (+ flag `is_internal`), `requester_confirmation`,
`version` (optimistic locking กัน 50 คนเขียนชน), ไฟล์แนบ (metadata ใน DB + ไฟล์ใน storage)

---

## 4. Asset Data (ครุภัณฑ์)

### 4.1 ฟิลด์ที่มีแล้ว (`Asset` — `src/lib/store.ts` + `src/app/assets/page.tsx`)
`asset_code` UNIQUE (เช่น `JP-PC-001`), `name`, `category`,
`serial_number`, `tags[]` (คั่นด้วย comma ตอนกรอก), `location`, `status`

Seed ตัวอย่าง 4 ชิ้น: `JP-PC-001` (PC Dell), `JP-PR-012` (Canon LBP6230),
`JP-NB-007` (ThinkPad), `JP-NET-003` (UniFi U6)

### 4.2 พฤติกรรมที่มีแล้ว
- ค้นหาด้วย asset_code / ชื่อ / serial / ที่ตั้ง / tags (case-insensitive)
- ฟอร์มแจ้งซ่อมมี datalist เลือก asset → เติม serial/location อัตโนมัติ + แสดง Tags
- เพิ่ม/ลบครุภัณฑ์ (ลบมี confirm)

### 4.3 ของที่ยังไม่มี (เฟส 2–4)
`brand/model`, `department/owner`, `purchase_date`, `warranty`,
`asset lifecycle status`, `tags` เป็น native array (Postgres `String[]`),
UNIQUE + index บน `asset_code/serial_number`, แจ้ง conflict แทนเขียนทับ,
ประวัติซ่อมราย asset (ดึงจาก tickets ที่ผูก `asset_id`)

---

## 5. Status Workflow

### 5.1 ปัจจุบัน (6 สถานะ — ใช้อยู่จริง)

```
PENDING(รอดำเนินการ) → ACCEPTED(รับเรื่องแล้ว) → IN_PROGRESS(กำลังซ่อม)
  → WAITING_PARTS(รออะไหล่) → DONE(ซ่อมเสร็จ) → CLOSED(ปิดงาน)
```

แสดงเป็น timeline + progress bar ใน `src/app/track/[id]/page.tsx`
ทุกการเปลี่ยนสถานะเขียน `ticket_history` (from→to + คนทำ + หมายเหตุ + เวลา)

### 5.2 เป้าหมายตาม SKILL2.md (10 สถานะ — เฟส 4)

| เป้าหมาย | map จากปัจจุบัน |
|---|---|
| New | PENDING |
| Triaged | (ใหม่ — แอดมิน/Supervisor ตรวจรับ + จัด priority) |
| Assigned | ACCEPTED (ผูกช่าง) |
| In progress | IN_PROGRESS |
| Waiting requester | (ใหม่ — รอข้อมูลจากผู้แจ้ง) |
| Waiting parts | WAITING_PARTS |
| Resolved | DONE (ช่างลง resolution) |
| Closed | CLOSED (ผู้แจ้งยืนยัน/เจ้าหน้าที่ปิด) |
| Reopened | (ใหม่ — DoD บังคับ) |
| Cancelled | (ใหม่ — ต้องมีเหตุผล) |

กฎ: ทุก transition บันทึก actor/timestamp/from/to/reason + ห้าม mutate เงียบ
(ฝั่ง DB = transaction เดียวกับ history ตาม SKILL2.md:358)

---

## 6. Screens (รายละเอียดรายหน้า)

### 6.1 `/login` — เข้าสู่ระบบ
- การ์ด glass กลางจอ + ambient glow, โลโก้ CP (`/logo/cp-logo.png`), ฟอร์ม email/password
- ปุ่มลัดบัญชีทดสอบ 3 สีแยกตาม role, error box แดงเมื่อ login ผิด
- ไฟล์: `src/app/login/page.tsx`

### 6.2 `/` — แดชบอร์ด
- การ์ดสถิติ 4 ใบ (รอดำเนินการ/กำลังซ่อม/รออะไหล่/เสร็จ+ปิด) นับจากข้อมูลจริง
- งานล่าสุด 6 ใบ (กดเข้า detail), ครุภัณฑ์ตัวอย่าง 5 ชิ้น
- ว่าง = empty state อธิบาย + ปุ่ม action (ห้ามเลขตกแต่ง)
- ไฟล์: `src/app/page.tsx`

### 6.3 `/new-ticket` — แจ้งซ่อมใหม่
- ฟิลด์ required ชัดเจน (`*`): หัวข้อ, รายละเอียดอาการ
- เลือก asset จาก datalist → เติม serial/location + แสดง Tags ให้ตรวจก่อนส่ง
- validate ก่อนส่ง, ส่งสำเร็จพาไปหน้า detail ของใบที่สร้าง (เห็นเลข ticket ทันที)
- ไฟล์: `src/app/new-ticket/page.tsx`
- ยังขาด: กันกดส่งซ้ำ, คงข้อมูลเมื่อ validate ล้ม, ช่อง contact/department (เฟส 4)

### 6.4 `/my-tickets` — รายการของฉัน
- เฉพาะงานของตัวเอง + ฟิลเตอร์ 7 ปุ่ม (ทั้งหมด + 6 สถานะ)
- ไฟล์: `src/app/my-tickets/page.tsx` — ยังขาด sort/pagination (เฟส 3)

### 6.5 `/track` — ติดตามสถานะ
- ช่องค้นหาเดียวครอบคลุม ticket_no/หัวข้อ/อาการ/asset_code/serial/ผู้แจ้ง
- รองรับ `?q=` จากช่อง search บน Topbar/Sidebar
- ไฟล์: `src/app/track/page.tsx`

### 6.6 `/track/[id]` — รายละเอียด Ticket
- หัวข้อ + badge สถานะ (สี+ตัวอักษร ไม่พึ่งสีอย่างเดียว) + chips หมวด/ผู้แจ้ง/ช่าง
- Timeline 6 ขั้น + progress bar, กล่องรายละเอียด + การ์ด asset/serial/สถานที่
- ประวัติการดำเนินงานเรียงใหม่→เก่า
- แผงช่าง/แอดมิน: บันทึกวิธีแก้, หมายเหตุ, ปุ่มเปลี่ยนสถานะ 5 ปุ่ม, มอบหมายช่าง (Admin)
- ไฟล์: `src/app/track/[id]/page.tsx`
- ยังขาด: แยก internal/requester-visible, ปุ่ม reopen/confirm-close, แนบไฟล์ (เฟส 4)

### 6.7 `/assets` — ครุภัณฑ์
- ตามข้อ 4.1–4.2; ฟอร์มเพิ่มอยู่ข้างขวา (desktop) / ต่อท้าย (mobile)
- ไฟล์: `src/app/assets/page.tsx` — ยังขาดหน้า detail + ประวัติซ่อมราย asset (เฟส 4)

### 6.8 `/knowledge` — คู่มือ/บทความ
- การ์ด 4 เรื่อง (คอม beep/กระดาษติด/Wi-Fi/ทิปแจ้งซ่อม) มี tag + ไอคอน
- ไฟล์: `src/app/knowledge/page.tsx`

### 6.9 `/technician` — งานที่ได้รับมอบหมาย
- งานของตัวเอง + งานรอรับ พร้อม chips ผู้แจ้ง/สถานที่/priority
- ไฟล์: `src/app/technician/page.tsx`

### 6.10 `/admin` — ผู้ดูแลระบบ
- แท็บงานทั้งหมด/รายงาน (+ลิงก์ครุภัณฑ์)
- รายงาน: กราฟแท่ง 6 สถานะ (สีตาม severity) + สรุปตามหมวด + Export CSV (มี BOM)
- ไฟล์: `src/app/admin/page.tsx`
- ยังขาด: รายงานตามช่วงเวลา/ช่าง/แผนก/SLA, จัดการผู้ใช้ (เฟส 4)

### 6.11 `/terminal` — ยังไม่สร้าง (ADMIN-only ตามแผน)
- ลอก token/layout จาก `E:\HELPDESK 004\cp-helpdesk-terminal-ui.html` (ม็อกอัพ ข้อมูลปลอม ห้ามใช้จริง)
- 4 blocks ผูก API จริง: status (`/api/health` วัด ms จริง), overview (`/api/overview`),
  ตาราง 5 งานล่าสุด (query จริง), logs (จาก `activity_logs` จริง)
- กฎเหล็ก: ว่าง = empty state ห้ามเลขแต่ง; ไม่มีระบบเมล = ตัดแถว Email ทิ้ง

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
    └── Terminal `/terminal` (เฟส 5, ADMIN-only)
Topbar: ปุ่มย่อ sidebar + search (ส่ง ?q= ไป /track) + badge role + ชื่อผู้ใช้
```

ไฟล์: `src/components/AppShell.tsx:12-29` (นิยามเมนู)

---

## 8. Shared UI + Design Tokens

- Tokens กลาง: `src/app/globals.css:5-44` (palette/gradient/shadow/radius) +
  คลาส `glass-card`, `glass-card-interactive`, `btn-gradient`, `glass-input`,
  `glass-select`, animations (`fade-in/slide-up/slide-in-left`, stagger)
- คอมโพเนนต์ร่วม: `src/components/ui.tsx` (`PageHeader` หัว gradient,
  `Empty`, `Field`, `Chip`), `src/components/StatusBadge.tsx`
  (badge มี dot + ตัวอักษร ไม่พึ่งสีอย่างเดียว)
- ⚠️ งานค้างตาม SKILL2.md:66-70: ลด gradient ประดับ (เก็บไว้เฉพาะ primary action),
  ลด all-caps labels — ทำพร้อมเฟส 4

---

## 9. Data Layer

### 9.1 ปัจจุบัน: LocalStorage (ชั่วคราว)
`src/lib/store.ts` — keys `jp_users/jp_assets/jp_tickets/jp_history/jp_session`
+ seed user 3 คน/asset 4 ชิ้น/ticket 2 ใบ + `nextTicketNo()` (นับจาก array — ไม่ปลอดภัย concurrent)

### 9.2 เป้าหมาย: PostgreSQL (เฟส 2)
- DB server: PostgreSQL 17 ในเครื่อง (`postgresql-x64-17`, Running)
- ติดตั้งแล้ว: `prisma@6.19.3`, `@prisma/client@6.19.3`, `pg`, `bcryptjs`, types
- Schema ปัจจุบัน `prisma/schema.prisma` ยังเป็น **SQLite** — ต้องเขียนใหม่เป็น
  `postgresql`: enums (Role 4 ค่า/Status 10 ค่า/Priority), ตาราง
  `users/assets/tickets/ticket_history/activity_logs/attachments(meta)` + FK จริง +
  index ทุกฟิลด์ค้นหา + `tickets.version` (optimistic locking) + pool
  `connection_limit=10–15`
- API (เฟส 3): `GET/POST /api/tickets` (search/filter/sort/pagination),
  `GET/PATCH /api/tickets/[id]` (transaction + version check),
  `POST /api/tickets/[id]/reopen`, `GET/POST /api/assets`,
  `GET /api/overview`, `GET /api/health`, `GET /api/logs`
- กฎ: validate ซ้ำฝั่ง server ทุก write; timestamps เก็บ UTC แสดงผลแปลง local ที่ UI;
  ห้าม commit `.env`/secret; ไฟล์แนบเก็บ metadata ใน DB + binary ใน storage แยก

### 9.3 กติกา seed (ล็อกแล้ว)
1. User 4 role hash bcrypt จาก ENV (`SEED_*_PASSWORD`) ไม่ set = seed ล้มดังๆ
   ห้าม plaintext ในไฟล์ seed เด็ดขาด
2. Asset ตัวอย่าง insert ตรงได้
3. ห้าม `createMany` ประวัติปลอม — seed ticket ผ่าน `lib/ticket-service.ts`
   (`createTicket`/`transitionTicket`, ฟังก์ชันเดียวกับที่ API ใช้) ให้ history/
   activity เกิดจากการกระทำจริงเท่านั้น

---

## 10. Operator Console + Startup Script

> ยกเลิกแล้ว 2026-09-14: `run-4502.bat` ถูกลบทั้งไฟล์ (ดูวิธีรันปัจจุบันที่ข้อ 13 ด้านล่าง / `KB_web.md` ที่เป็นปัจจุบันกว่า)
> ประวัติเดิม (.bat 4 ขั้น — ไม่ต้องทำตามแล้ว):
> 1. Preflight node/npm 2. เช็กพอร์ต 4502 (kill node เก่าแล้วรันใหม่)
> 3. สตาร์ท `npm run dev:4502` 4. รอ Ready แล้วเปิดเบราว์เซอร์อัตโนมัติ

---

## 11. Branding

- โลโก้: `public/logo/cp-logo.png` (จาก `Logo CP.png` ต้นฉบับ 50,163 bytes)
  ใช้บน Sidebar (`AppShell.tsx:72`), Login, favicon (`layout.tsx:7`)
- ชื่อ: **CP Helpdesk** (ลบ `logo-jp.svg` + ไฟล์ตัวอย่าง Next.js แล้ว)

---

## 12. Definition of Done (เช็กลิสต์รวม)

- [x] แจ้งซ่อมได้ + ได้เลข unique
- [x] ค้นหา/ติดตามงานได้
- [x] มอบหมาย + เปลี่ยนสถานะ + ประวัติแสดง
- [x] ผูก asset tags/Serial กับใบแจ้ง
- [x] รายงาน + Export CSV
- [x] Side nav desktop/mobile + build ผ่าน
- [ ] ย้าย Postgres + migrations + bcrypt (ติดรหัส superuser)
- [ ] API + บังคับสิทธิ์ฝั่ง server + กันเขียนชน (version)
- [ ] 10 สถานะ + Reopen + confirm-close + internal notes + contact/department/due_at/SLA
- [ ] Supervisor role + จัดการผู้ใช้
- [ ] แนบไฟล์ (metadata + storage + สิทธิ์)
- [ ] `/terminal` ADMIN-only ข้อมูลจริง 100%
- [ ] Smoke 50 concurrent + รีวิว 4 role

---

## 13. วิธีรัน (Docker — ไม่มี .bat แล้ว)

1. `docker compose -f ../docker-compose.yml up -d` (ครั้งแรกตั้ง `POSTGRES_PASSWORD` ก่อน) — native Postgres ข้ามได้
2. ใน `helpdesk/`: สร้าง `.env` จาก `.env.example` → `npx prisma migrate deploy` → `npx prisma db seed` (ครั้งแรกครั้งเดียว)
3. `npm run dev:4502` → เปิด `http://localhost:4502` → `/login` (บัญชีตามข้อ 2.5, รหัสจาก `.env` ของเครื่องนั้น)
4. `ERR_CONNECTION_REFUSED` = เซิร์ฟเวอร์ยังไม่รัน กลับไปข้อ 3
