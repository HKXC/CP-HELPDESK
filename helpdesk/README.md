# CP Helpdesk — ระบบแจ้งซ่อมอุปกรณ์ครุภัณฑ์

Side Navigation แบบ Toolfolio + ระบบ Helpdesk ครบ flow

## วิธีรัน (Docker / Vercel — ไม่มี .bat แล้ว)
```bash
# local ผ่าน Docker DB + Next dev (รันใน helpdesk/)
docker compose -f ../docker-compose.yml up -d
npm run dev:4502
```
เปิด http://localhost:4502 → จะเด้งไป `/login`
- prod ดู `DEPLOY_VERCEL.md` (Neon pooled `DATABASE_URL` + `DIRECT_URL` + `BLOB_READ_WRITE_TOKEN`)

## ติดตั้งบนเครื่องใหม่ (ครั้งแรกครั้งเดียว)

```powershell
# 1. DB: Docker (ตั้งรหัสก่อน) หรือ native Postgres ที่มีอยู่แล้ว
$env:POSTGRES_PASSWORD="[ตั้งเอง]"
docker compose -f ../docker-compose.yml up -d

# 2. .env + migrate + seed (ไฟล์ .env ไม่ถูก commit — ทุกเครื่องสร้างเองจาก .env.example)
Copy-Item .env.example .env   # ใส่ DATABASE_URL / DIRECT_URL / SEED_ADMIN_PASSWORD / SEED_TECH_PASSWORD / SEED_USER_PASSWORD
npx prisma migrate deploy
npx prisma db seed

# 3. รันเว็บ
npm run dev:4502
```

- ย้ายเครื่อง: backup โฟลเดอร์ `uploads/` มาด้วย (ไฟล์แนบ local เก็บ binary ในนั้น, DB เก็บแค่ metadata + relative path `uploads/<ticket>/<file>` ที่ย้ายไดรฟ์ได้)
- เช็ก: `GET /api/health` → `{"status":"ok","db":"connected"}`

## บัญชีทดสอบ
รหัสผ่านตั้งผ่าน ENV ตอน seed (`SEED_ADMIN_PASSWORD` / `SEED_TECH_PASSWORD` / `SEED_USER_PASSWORD` ใน `.env` ซึ่งไม่ถูก commit) — ดู `prisma/seed.ts`
- User: `user@jp.local` — แจ้งซ่อม + ติดตาม
- Tech: `tech@jp.local` — รับงาน + อัปเดตสถานะ
- Admin: `admin@jp.local` — มอบหมายช่าง + รายงาน + Export CSV

## ฟีเจอร์ตามวัตถุประสงค์
1. รับแจ้งเป็นระบบ — ฟอร์มแจ้งซ่อม + เลข HD-YY-XXXX
2. แจ้ง + ติดตาม — หน้า track/[id] มี Timeline
3. รับ/มอบหมาย — Admin assign, Tech อัปเดต + solution
4. ลดตกหล่น — Dashboard นับงานค้าง
5. ประวัติย้อนหลัง — ticket_history ทุกการเปลี่ยนสถานะ
6. รายงาน — /admin?tab=reports + Export CSV
7. เลขทรัพย์สิน — /assets ค้นหา asset_code / tags / serial_number

## โลโก้
`public/logo/cp-logo.png` ใช้บน Sidebar + Login + favicon

## Database
PostgreSQL ผ่าน Prisma — schema อยู่ที่ `prisma/schema.prisma`, migrate ด้วย `npx prisma migrate deploy`
