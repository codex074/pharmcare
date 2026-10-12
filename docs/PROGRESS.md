# ความคืบหน้า

อัปเดตล่าสุด: 2026-10-12

## สถานะ

| ขั้น | งาน | สถานะ |
|---|---|---|
| 0 | สร้าง repo + โครงโฟลเดอร์ | ✅ เสร็จ |
| – | นำดีไซน์จาก Claude Design เข้า repo (`docs/design/`) | ✅ เสร็จ |
| 1 | Scaffold Next.js + theme.css จากดีไซน์ + Drizzle + docker compose สำหรับ dev | ✅ เสร็จ |
| 2 | Auth: login / logout / requireUser / rate limit | ✅ เสร็จ |
| 3 | Schema + migrations + triggers + grants | ⬜ |
| 4 | ฟังก์ชันคำนวณ (eGFR, TTR, Naranjo, คะแนนเทคนิค) + checklist + unit tests | ⬜ |
| 5 | หน้ากรอก HN + การ์ดผู้ป่วย + ประวัติ + เลือกประเภทการบริบาล | ⬜ |
| 6 | แฟ้มผู้ป่วย + ฟอร์มบริบาลทุกชนิด | ⬜ |
| 7 | ตัวชี้วัด, ส่งออก CSV, ประวัติแก้ไข | ⬜ |
| 8 | Deploy: pve1 → mirror VPS → failover → backup → restore drill | ⬜ |
| 9 | `his-relay` + เชื่อม API ผู้ป่วยของโรงพยาบาล | ⬜ |

## รอผู้ใช้

- [ ] ยืนยันว่าการอนุมัติ PDPA ของโรงพยาบาลครอบคลุมการเก็บชื่อ-สกุลเต็ม
- [ ] เปิด Swagger ของโปรแกรมคิว (`/api/docs`) ดูว่ามี endpoint ค้นคลินิกจาก HN หรือ VN ไหม
- [ ] ขอ token ของ API กลาง (`/api/hosxp/patient`) และ service account ของโปรแกรมคิว
- [ ] เลือกเครื่องในโรงพยาบาลที่จะลง `his-relay`

## ไม่อยู่ในขอบเขตรอบนี้

- ระบบนัดติดตาม

## บันทึก

- 2026-10-12: สร้าง repo
- 2026-10-12: ขั้น 1 เสร็จ — Next.js 16.3.8 (แทน 14 ที่หมดซัพพอร์ต), theme.css + Noto Sans Thai, ฐานข้อมูล dev จำลองโครง production (`npm run db:up`), `/api/health` ตอบ 503 เมื่อ DB ล่ม, lint/typecheck/build ผ่าน
- 2026-10-12: ขั้น 2 เสร็จ — login ด้วยบัญชี PharmShift (เฉพาะเภสัช/admin), rate limit 5/บัญชี 30/IP ใน 15 นาที, session 12 ชม. แบบ sliding, ถอนสิทธิ์ใน PharmShift แล้วหลุดภายใน 5 นาที, ตาราง `login_attempts` (app เพิ่ม/อ่านได้ ลบ/แก้ไม่ได้) ทดสอบกับ dev DB ครบ 8 บัญชี
- 2026-10-12: นำดีไซน์ 20 หน้าจอ + theme.css + โลโก้เข้า repo เลิกใช้ Tailwind ใช้ CSS จากดีไซน์แทน
