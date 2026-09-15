# DEPLOY Vercel ($0) — Runbook

> ไฟล์นี้มีแต่คำสั่ง ช่อง `[...]` คือค่าที่ต้องก๊อปจาก Neon / Vercel ห้าม commit ค่าจริงลง git

## 0. ของที่ต้องเตรียม (ทำในเว็บ)

1. **Neon** (free tier, 0.5GB): สร้าง project → Connections → ก๊อป 2 ค่า
   - `DATABASE_URL` = pooled (`...@ep-xxx-pooler...:6543/...?sslmode=require`)
   - `DIRECT_URL` = direct (`...@ep-xxx...:5432/...?sslmode=require`)
2. **Vercel**: สร้าง Blob store → ก๊อป `BLOB_READ_WRITE_TOKEN`
3. **Vercel project**: `cp-helpdesk` มีอยู่แล้ว (scope `chatphot182007-8931s-projects`, local link ไว้แล้ว) → import/ใช้ตัวเดิม อย่าสร้างซ้ำ → Environment → ใส่ 3 ค่า
   - `DATABASE_URL=[pooled]`
   - `DIRECT_URL=[direct]`
   - `BLOB_READ_WRITE_TOKEN=[token]`
   - (ไม่ต้องใส่ `SEED_*` บน Vercel)
4. **ปิด Deployment Protection** (สำคัญ — แอปมีหน้า login ของตัวเองอยู่แล้ว): Dashboard → project → Settings → Deployment Protection → **Disabled** ไม่เช่นนั้นทุกคนจะเจอกำแพง login ของ Vercel ก่อนถึงหน้า `/login` ของแอป

## 1. Push โค้ดขึ้น GitHub (repo root คือ `E:\HELPDESK 004`)

```powershell
# remote ตั้งไว้แล้ว: https://github.com/HKXC/CP-HELPDESK.git
git push origin main
```

> ตอน import ใน Vercel dashboard ตั้ง **Root Directory = `helpdesk`**
> (repo root มี docs + docker-compose ส่วนแอป Next.js อยู่ใน subdir `helpdesk/`)

## 2. Migrate + Seed DB prod (รันจากเครื่องนี้ครั้งเดียว ห้ามใส่รหัสในไฟล์)

```powershell
$env:DATABASE_URL="[pooled Neon URL]"
$env:DIRECT_URL="[direct Neon URL]"
npx prisma migrate deploy
$env:SEED_ADMIN_PASSWORD="[ตั้งเอง]"
$env:SEED_TECH_PASSWORD="[ตั้งเอง]"
$env:SEED_USER_PASSWORD="[ตั้งเอง]"
npx prisma db seed
```

## 3. Smoke บน prod (`[app]` = URL vercel.app)

- `https://[app]/api/health` → `{"status":"ok","db":"connected"}`
- เปิด `/login` ล็อกอิน ADMIN → สร้างใบแจ้ง → assign → resolve → close → reopen
- แนบไฟล์ → redeploy 1 รอบ → โหลดไฟล์กลับต้องยังได้
- ล็อกอิน USER → เปิด `/api/users` ตรงๆ ต้อง 403

## 4. คุมงบ Neon 0.5GB

- ไฟล์แนบอยู่ Blob ไม่กิน Postgres (DB เก็บแค่ metadata)
- ถ้าใกล้เต็ม: ลบ `ActivityLog` เก่า หรือลบไฟล์แนบเก่าผ่าน Vercel dashboard

## Rollback

- Vercel → Deployments → Promote to production ตัวก่อนหน้า
- DB: `migrate deploy` รอบนี้มีแค่ `init` + ไม่แก้ schema เดิม — ไม่มี down migration ให้รัน
