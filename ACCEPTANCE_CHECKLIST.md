# CP Helpdesk — Acceptance Checklist (ความจริงกลาง ณ วันที่ทดสอบ)

> วิธีใช้: ให้ opencode ทดสอบ**ทีละแถว**จริงๆ (คลิกจริง/ดูผลจริง ไม่ใช่เดาจากโค้ด)
> แล้วกรอกคอลัมน์ "ผลจริง" เป็น ✅ ผ่าน / ❌ ไม่ผ่าน / ⚠️ ใช้ได้บางส่วน เท่านั้น
> ห้ามข้ามแถวไหนไปโดยไม่ทดสอบ ห้ามเดาว่า "น่าจะผ่าน"
>
> เป้าหมายของไฟล์นี้คือให้มี**จุดอ้างอิงเดียว**ว่าอะไรใช้ได้จริง ณ ตอนนี้
> แทนที่จะต้องจำจากความรู้สึกหรือจาก session ก่อนหน้า

**วันที่ทดสอบ:** 2026-09-15
**ทดสอบโดย:** opencode (API-only — ข้อ UI เหลือว่างไว้รอผู้ใช้คลิกจริง)
**แผนเพิ่ม:** 2026-09-16 — ส่วนที่ 5 (ข้อ 30–37, Portable/Vercel/Domain) เป็นแผนที่อนุมัติแล้ว ยังไม่ implement/ยังไม่ทดสอบ

## ส่วนที่ 1 — Flow หลักของ Requester

| # | สถานการณ์ทดสอบ | ผลที่ควรเกิด | ผลจริง | หมายเหตุ/อาการ (ถ้าไม่ผ่าน) |
|---|---|---|---|---|
| 1 | Login ด้วยบัญชี Requester | เข้าระบบได้ เห็นเฉพาะเมนู/งานของตัวเอง | ✅ ผ่าน | API: login 200 role=USER, list กรองเฉพาะของตัวเอง (ข้อ UI เมนูรอคลิก) |
| 2 | สร้าง Repair Request ใหม่ | บันทึกสำเร็จ ได้เลขที่ใบงาน (unique ID) | ✅ ผ่าน | API: POST 201 ได้เลข HD-… (smoke 2026-09-15; re-verify เย็น: `HD-26-0023` 201 → TRIAGED 200) |
| 3 | ใส่ Asset tag / Serial number ตอนแจ้ง (ที่ยังไม่ขึ้นทะเบียน) | ระบบรับค่าที่พิมพ์เองได้ ไม่บังคับเลือกจากทะเบียน | ✅ ผ่าน | API: create พร้อม asset_code ที่ไม่อยู่ในทะเบียน → 201 เก็บค่าครบ |
| 4 | ค้นหาใบงานตัวเองผ่าน `/track` | เจอใบงาน แสดงสถานะปัจจุบัน | ✅ ผ่าน | API: GET /api/tickets?q= เจอใบตัวเอง (UI /track รอคลิก) |
| 5 | ลองเข้าดูใบงานของคนอื่น (เดา URL/ID) | ต้องถูกบล็อก ไม่เห็นข้อมูล | ✅ ผ่าน | API: USER เปิด ticket คนอื่น → 403 |
| 6 | แนบไฟล์ในใบงานตัวเอง ขนาด < 10MB | อัปโหลดสำเร็จ แสดงตัวอย่าง/ลิงก์ไฟล์ | ✅ ผ่าน | API: upload 201 + download 200 เนื้อหาตรง (UI preview รอคลิก; re-verify เย็น 2 รอบรวมหลังแก้ `storage.ts` — ตรงทั้งคู่) |
| 7 | แนบไฟล์เกิน 10MB | ระบบแจ้ง error ชัดเจน ไม่ค้าง/ไม่ crash | ✅ ผ่าน | API: ไฟล์ 11MB → 400 ข้อความชัด |

## ส่วนที่ 2 — Flow ของ Technician

| # | สถานการณ์ทดสอบ | ผลที่ควรเกิด | ผลจริง | หมายเหตุ |
|---|---|---|---|---|
| 8 | Login ด้วยบัญชี Technician | เห็นเฉพาะงานที่ถูก assign หรือที่มีสิทธิ์ | ✅ ผ่าน | API: login 200 role=TECH (UI หน้า technician รอคลิก) |
| 9 | เปลี่ยนสถานะใบงานตามลำดับ workflow (เช่น New → Triaged → Assigned → In progress) | เปลี่ยนได้ตามลำดับที่กำหนด | ✅ ผ่าน | API: เดิน NEW→TRIAGED→ASSIGNED→IN_PROGRESS→RESOLVED ครบ 200 |
| 10 | พยายามข้ามขั้น (เช่น New → Closed ตรงๆ) | ระบบไม่ให้ข้าม ต้องเดินตามขั้น | ✅ ผ่าน | API: NEW→CLOSED ตรง → 400 |
| 11 | บันทึก diagnosis/resolution ในใบงาน | บันทึกได้ แสดงในประวัติ | ✅ ผ่าน | API: PATCH solution/resolution → 200, GET แสดงค่าครบ |
| 12 | ปิดใบงานจากสถานะ "แก้ไขแล้ว" เท่านั้น | ปิดได้เฉพาะจากสถานะที่กำหนดไว้ | ✅ ผ่าน | API: RESOLVED→CLOSED 200 (confirm ฝั่ง UI รอคลิก) |
| 13 | เปิด 2 browser tab แก้ใบงานเดียวกันพร้อมกัน แล้วบันทึกทั้งคู่ | tab ที่ 2 ต้องเจอ error "Data was modified by another user" | ✅ ผ่าน | API: PATCH ด้วย version เก่าซ้ำ → 409 ข้อความตรง |

## ส่วนที่ 3 — Flow ของ Administrator

| # | สถานการณ์ทดสอบ | ผลที่ควรเกิด | ผลจริง | หมายเหตุ |
|---|---|---|---|---|
| 14 | Login ด้วยบัญชี Administrator | เห็นทุกใบงาน ทุกเมนู รวม Reports | ✅ ผ่าน | API: login 200, tickets total ครบ, /api/overview ข้อมูลจริง (UI tab Reports รอคลิก) |
| 15 | ดู Internal notes ของใบงาน | เห็นได้ (staff-only) | ✅ ผ่าน | API: ADMIN เห็น internal note ใน history |
| 16 | Login ด้วยบัญชี Requester แล้วดูใบงานเดียวกัน | ต้อง**ไม่เห็น** internal notes | ✅ ผ่าน | API: USER เห็นเฉพาะ non-internal |
| 17 | ผูก asset ที่พิมพ์เอง (ข้อ 3) เข้ากับทะเบียนภายหลัง | ผูกสำเร็จ ข้อมูลใบงานเดิมไม่หาย | ✅ ผ่าน | API: PATCH asset_code/serial → 200 ค่าใหม่อยู่ครบ |
| 18 | เปิดหน้า Reports | แสดงข้อมูลจริงจาก PostgreSQL ไม่ใช่ mock/placeholder | ✅ ผ่าน | API: /api/overview นับจาก DB จริง (UI กราฟรอคลิก) |
| 19 | ดู Repair history ของใบงานใดๆ | เห็น timeline การเปลี่ยนสถานะครบ พร้อม actor/เวลา | ✅ ผ่าน | API: history มี from/to/actor/created_at ครบทุกรายการ |
| 20 | Reopen ใบงานที่ปิดไปแล้ว | ทำได้ตามสิทธิ์ที่กำหนด สถานะกลับมาเป็น Reopened | ✅ ผ่าน | API: POST reopen จาก CLOSED → REOPENED 200 |

## ส่วนที่ 4 — ระบบ/โครงสร้างพื้นฐาน

| # | สถานการณ์ทดสอบ | ผลที่ควรเกิด | ผลจริง | หมายเหตุ |
|---|---|---|---|---|
| 21 | ~~รัน `run-4502.bat` ตอน DB ยังไม่พร้อม/ต่อไม่ติด~~ → ยกเลิก .bat แล้ว ใช้ `docker compose up` + `/api/health` แทน | N/A — ยกเลิก .bat 2026-09-14 | ดู health check ผ่าน Docker/Vercel แทน |
| 22 | ~~รัน `run-4502.bat` ตอนทุกอย่างปกติ~~ → รัน Docker + `npm run dev:4502` | N/A — ยกเลิก .bat 2026-09-14 | เทสด้วยวิธีรันใหม่แทน |
| 23 | เปิดเว็บบนมือถือ/หน้าจอแคบ | Side nav และ flow หลักใช้งานได้ ไม่พังเลย์เอาต์ | | |
| 24 | ปิด JavaScript หรือทำ network ช้า (loading state) | มี loading/empty/error state ที่ชัดเจน ไม่ใช่จอขาว/ค้าง | | |
| 25 | เช็คว่า password ใน DB เป็น hash | ไม่มี plaintext password หลงเหลือในตาราง users | ✅ ผ่าน | DB: 3/3 ขึ้นต้น bcrypt ($2…) ผ่าน tsx+prisma |
| 26 | เปิดเว็บทุกหน้า สังเกต animation ตอนโหลด/hover | ไม่มี fade-in/stagger/hover-lift แบบประดับทั่วทุกหน้า เหลือ motion เฉพาะตอนสื่อสารการเปลี่ยนสถานะจริง (บันทึกสำเร็จ, panel เปิด, สถานะเปลี่ยน) | | |
| 27 | สังเกตหน้าตาโดยรวม (การ์ด/หัวข้อ/ปุ่ม) เทียบกับก่อนแก้ | ไม่ใช่ glass-card+shadow+gradient เหมือนกันหมดทุกที่แบบ generic SaaS — มีความจงใจแยกแต่ละส่วน ยังอ่านง่ายและเป็นระบบเดียวกัน | | |
| 28 | ~~ดับเบิลคลิก `run-4502.bat` โดยไม่ต้อง login~~ → ~~เปิด `/terminal` (ADMIN) ดู health/overview/logs~~ | N/A — ยกเลิก .bat 2026-09-14; `/terminal` เอาออกทั้งหน้า+เมนู 2026-09-15 ตามคำสั่งผู้ใช้ (ดูข้อมูลผ่าน `/admin` แทน) |
| 29 | ~~ปิด PostgreSQL ก่อนรัน `.bat`~~ → ปิด DB แล้วเปิดเว็บ/`/api/health` | N/A — ยกเลิก .bat 2026-09-14 | เทส fail-loud ผ่าน Docker/health แทน |

## ส่วนที่ 5 — แผน Portable / รันเครื่องอื่น + Vercel/Domain (อนุมัติ 2026-09-16 — ยังไม่ทดสอบ)

> ที่มา: ผู้ร้องขอ 2026-09-16 — "รันเครื่องอื่นได้ ห้าม hardcode credential; Postgres เป็นที่เก็บข้อมูล (system of record) ตัวเว็บวิ่งบน Vercel หรือ domain service; เอา setup script (.ps1); `.env.example` มี default แก้ได้"
> วิธีตรวจ: รันจริงบนเครื่องใหม่/DB ปลายทางตามแถว ไม่เดาจากโค้ด; secret จริงห้ามปรากฏใน repo/log/จอ

| # | สถานการณ์ทดสอบ | ผลที่ควรเกิด | ผลจริง | หมายเหตุ/อาการ (ถ้าไม่ผ่าน) |
|---|---|---|---|---|
| 30 | Clone ใหม่ → `setup.ps1 -Db docker` → เปิด `/login` | `GET /api/health` → `ok/connected`; login 3 roles ได้ | | ต้องมี Node 22 + Docker; `.env` สร้างจาก `.env.example` อัตโนมัติถ้ายังไม่มี |
| 31 | Clone ใหม่ → native Postgres (ข้าม Docker) | `migrate deploy` + `seed` ผ่าน ไม่ต้องแก้โค้ด | | ใช้ `DATABASE_URL`/`DIRECT_URL` ชี้ native (local ใส่ค่าเดียวกันทั้งคู่) |
| 32 | ชี้ DB ไป Neon/managed → เว็บบน Vercel | อ่าน/เขียน ticket/asset/ไฟล์แนบได้จริง | | `DATABASE_URL`=pooled `:6543`, `DIRECT_URL`=direct `:5432`; migrate+seed จากเครื่อง local; `BLOB_READ_WRITE_TOKEN` ตั้งบน Vercel |
| 33 | เว็บบน domain service (`npm run build` + `start -p $PORT` หลัง reverse proxy) | เปิดผ่าน domain ได้; session cookie ทำงาน | | `NODE_ENV=production` (cookie `secure`); `PORT` override ได้เมื่อ 4502 ชน |
| 34 | `.env.example` ก๊อปแล้วรัน local ได้ | แก้เฉพาะรหัส demo แล้วรันผ่าน | | ใน repo มีแค่ค่า demo (`change-me-*`) ห้ามมี URL/token จริงของ Neon/Vercel |
| 35 | grep ทั้ง repo หา credential จริง | ไม่เจอ connection string/token/รหัสจริง | | เจอได้แค่ demo (`change-me-*`, `*@jp.local`, ชื่อฟิลด์ `password`) |
| 36 | เช็ค `.env`/`uploads/`/`logs/` ไม่หลุดขึ้น git | `git status --ignored` ขึ้น `!!` ครบ; `git ls-files` ไม่มี secret | | `.env.example` ต้อง tracked (`??`→`A`), `.env`/`.env.local` ต้อง ignored |
| 37 | พอร์ต 4502 ชน → ตั้ง `PORT` ใหม่ | รันบนพอร์ตใหม่ได้ ไม่ต้องแก้โค้ด | | `dev:4502` คงไว้กันเปลี่ยน behavior; ทาง domain ใช้ `$PORT` |
| 38 | ทำ bundle offline (`make-bundle.ps1`) แล้วตรวจไม่มี secret | bundle มี `.env.example` ไม่มี `.env`/`.env.local`, manifest ตรง HEAD | ✅ ผ่าน | รันจริง 2026-09-16: 70 tracked + node_modules ~30k files, secret-check ผ่าน, ข้าม `CLAUDE.md` ที่ลบแบบยังไม่ commit พร้อม warning |
| 39 | เอา bundle ไปเครื่อง offline (ไม่มีเน็ต) + รัน `setup.ps1` | `migrate deploy` + `seed` ผ่านโดยไม่ใช้เน็ต, `/api/health` ok | | ต้องให้ผู้ใช้ลองบนเครื่อง offline จริง (มี `README-OFFLINE.txt` ใน bundle) |
| 40 | รัน `setup.ps1` ซ้ำบนเครื่องเดิม (idempotent) | ไม่เขียน `.env` ทับ, migrate no-op, ไม่พัง | ✅ ผ่าน | รันจริง 2026-09-16 ด้วย `-SkipSeed`: Node/DB ผ่าน, `No pending migrations`, จบครบ |

---

## สรุปผลรวม (กรอกหลังทดสอบครบ)

- จำนวนข้อที่ผ่าน: 21 / 25 (API — ไม่นับข้อ N/A 4 ข้อ: 21,22,28,29 ที่ยกเลิก .bat แล้ว)
- จำนวนข้อที่ไม่ผ่าน: 0
- จำนวนข้อที่ใช้ได้บางส่วน: 0
- เหลือรอคลิก UI ด้วยตา (4 ข้อ): 23 (mobile), 24 (noscript/loading), 26–27 (design/animation)
- จำนวนข้อ N/A: 4 (21,22,28,29)
- แผนรอบ 2026-09-16 (ยังไม่ทดสอบ, ไม่นับในผลรวม): ข้อ 30–37 (8 ข้อ — Portable Docker/native/Neon + Vercel/domain + `.env.example` default + no-hardcode grep + gitignored + `PORT`)
- รอบ offline 2026-09-16: ข้อ 38 ✅ / 40 ✅ (รันจริงบนเครื่องนี้), ข้อ 39 รอเครื่อง offline จริง
- re-verify เย็น 2026-09-15 (API): login 3 roles 200 + รหัสผิด 401 + USER เปิด `/api/users` 403 ตรงครบ, login ผ่าน LAN IP (`10.195.255.147:4502`) 200, `tsc` + `npm run build` ผ่าน 27 routes ไม่มี warning (แก้ `storage.ts` แล้ว)
- หมายเหตุ: มี test data ค้างใน DB local เพิ่มจากรอบเช้า — ticket `HD-26-0023` (`smoke-beep-test`, TRIAGED) + ไฟล์แนบ `smoke.txt`/`fresh.txt` (ลบได้); ข้อ UI 23,24,26,27 ยังรอคลิกเหมือนเดิม

**ข้อที่ไม่ผ่าน ให้ระบุเป็น task แยกแต่ละข้อ** (ไม่ต้องแก้รวมกันทีเดียว) แล้วอ้างอิงกลับมาที่เลขข้อในไฟล์นี้เวลาสั่งงาน เช่น "แก้ข้อ 10 — workflow ยอมให้ข้ามขั้นได้ ต้องปิดช่องโหว่นี้"

ไฟล์นี้ควร**รันซ้ำเป็นระยะ** (เช่นทุกครั้งที่รู้สึกไม่มั่นใจ หรือก่อนบอกใครว่า "ระบบเสร็จแล้ว") ไม่ใช่ทำครั้งเดียวจบ
