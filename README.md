# CP-HELPDESK — ระบบแจ้งซ่อมอุปกรณ์ครุภัณฑ์

Next.js 16 + Prisma + PostgreSQL 17. โค้ดแอปอยู่ใน `helpdesk/` (วิธีรัน/สเปกฉบับเต็มดู `helpdesk/README.md`)

## รันบนเครื่องใหม่ (ครั้งแรกครั้งเดียว)

```powershell
# 1. ฐานข้อมูล (เลือกอย่างใดอย่างหนึ่ง)
$env:POSTGRES_PASSWORD="[ตั้งเอง]"
docker compose -f docker-compose.yml up -d   # หรือใช้ native Postgres ที่มีอยู่แล้ว

# 2. สร้าง .env + migrate + seed (ใน helpdesk/)
Copy-Item .env.example .env   # แล้วใส่ DATABASE_URL / DIRECT_URL / SEED_*_PASSWORD ให้ครบ
npx prisma migrate deploy
npx prisma db seed

# 3. รันเว็บ
npm run dev:4502   # เปิด http://localhost:4502 → /login
```

> `.env` ไม่ถูก commit (ดู `.gitignore`) — ทุกเครื่องต้องสร้างเองจาก `.env.example`.
> ไฟล์แนบเก็บแค่ metadata ใน DB + binary ใน `uploads/` (local) หรือ Vercel Blob (prod) — ย้ายเครื่องให้ backup `uploads/` เอง.
> prod ดู `helpdesk/DEPLOY_VERCEL.md`.

## ติดตั้งแบบ offline (เครื่องเป้าหมายไม่มีเน็ต — หิ้ว USB ไป)

บนเครื่องที่มีเน็ต (repo นี้): `powershell -ExecutionPolicy Bypass -File make-bundle.ps1`
→ ได้ bundle ที่ `%TEMP%\opencode\helpdesk-bundle` (repo + `node_modules` ~1GB, **ไม่มี secret**)
ก๊อปลง USB (≥2GB) พร้อม installer 2 ตัว: Node 22 LTS + PostgreSQL 17 (x64) แล้วทำตาม `README-OFFLINE.txt` ใน bundle (สรุป: ติดตั้ง 2 ตัว → สร้าง DB/user → `setup.ps1` → `setup.ps1 -Start`).
