# CP Helpdesk — ระบบแจ้งซ่อมอุปกรณ์ครุภัณฑ์

Side Navigation แบบ Toolfolio + ระบบ Helpdesk ครบ flow

## วิธีรัน
```bash
# ดับเบิลคลิก E:\HELPDESK 004\run-4502.bat (พอร์ต 4502)
# หรือรันเอง: npm run dev:4502
```
เปิด http://localhost:4502 → จะเด้งไป `/login`

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
