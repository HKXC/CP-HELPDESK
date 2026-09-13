# CP Helpdesk — ระบบแจ้งซ่อมอุปกรณ์ครุภัณฑ์

Side Navigation แบบ Toolfolio + ระบบ Helpdesk ครบ flow

## วิธีรัน
```bash
cd "E:\HELPDESK 004\helpdesk"
npm install
npm run dev
```
เปิด http://localhost:3000 → จะเด้งไป `/login`

## บัญชีทดสอบ
- User: `user@CP.local` / `[redacted]` — แจ้งซ่อม + ติดตาม
- Tech: `tech@CP.local` / `[redacted]` — รับงาน + อัปเดตสถานะ
- Admin: `admin@CP.local` / `[redacted]` — มอบหมายช่าง + รายงาน + Export CSV

## ฟีเจอร์ตามวัตถุประสงค์
1. รับแจ้งเป็นระบบ — ฟอร์มแจ้งซ่อม + เลข HD-YY-XXXX
2. แจ้ง + ติดตาม — หน้า track/[id] มี Timeline
3. รับ/มอบหมาย — Admin assign, Tech อัปเดต + solution
4. ลดตกหล่น — Dashboard นับงานค้าง
5. ประวัติย้อนหลัง — ticket_history ทุกการเปลี่ยนสถานะ
6. รายงาน — /admin?tab=reports + Export CSV
7. เลขทรัพย์สิน — /assets ค้นหา asset_code / tags / serial_number

## โลโก้
`public/logo-cp.svg` วาดจากรูป JP ที่แนบมา ใช้บน Sidebar + Login + favicon

## ย้ายไป SQLite จริง
```
npm i prisma @prisma/client
npx prisma migrate dev --name init
```
schema อยู่ที่ `prisma/schema.prisma` fields ตรงกับ `src/lib/store.ts` ทั้งหมด
