# การพัฒนาในเครื่อง

ต้องมี Node 22+ และ Docker

```bash
npm install
cp .env.example .env.local      # แล้วใส่ SESSION_JWT_SECRET (openssl rand -base64 48)
npm run db:up                   # Postgres 17 ที่ 127.0.0.1:54329
npm run dev
```

ฐานข้อมูล dev จำลองโครงเดียวกับ production: คลัสเตอร์เดียว มี database `postgres` (ตาราง `users` ปลอมของ PharmShift) และ database `pharmcare` พร้อม role `pharmcare_owner` / `pharmcare_app` ดูสคริปต์ที่ `dev/initdb/`

บัญชีทดสอบใน `dev/initdb/01-pharmshift-users.sql` ครอบคลุมทุกกรณีของการ login (เภสัช, admin, เจ้าพนักงาน, ถูกระงับ, ต้องเปลี่ยนรหัส, รหัสแบบเก่า)

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run db:reset` | ล้างฐาน dev แล้วสร้างใหม่จาก `dev/initdb/` |
| `npm run db:generate` / `db:migrate` | สร้าง / รัน migration ด้วย `pharmcare_owner` |
| `npm run lint` / `typecheck` / `test` / `build` | ตรวจก่อน push |
| `npm run db:seed` | ใส่ผู้ป่วยตัวอย่าง (สมมติ) HN 6900001, 6900002 รันซ้ำได้ ทำงานเฉพาะฐานใน 127.0.0.1 |
| `npm run test:db` | ทดสอบกฎในฐานข้อมูล (ห้ามลบ, audit, แก้ได้เฉพาะเจ้าของ, ยกเลิก) ต้อง `db:up` + `db:migrate` ก่อน — ใช้ซ้ำตอนซ้อม restore |
