# ความคืบหน้า

อัปเดตล่าสุด: 2026-10-12

## สถานะ

| ขั้น | งาน | สถานะ |
|---|---|---|
| 0 | สร้าง repo + โครงโฟลเดอร์ | ✅ เสร็จ |
| 1 | Scaffold Next.js + Tailwind + Drizzle + docker compose สำหรับ dev | ⬜ |
| 2 | Auth: login / logout / requireUser / rate limit | ⬜ |
| 3 | Schema + migrations + triggers + grants | ⬜ |
| 4 | ฟังก์ชันคำนวณ (eGFR, TTR, Naranjo, คะแนนเทคนิค) + checklist + unit tests | ⬜ |
| 5 | หน้ากรอก HN + การ์ดผู้ป่วย + ประวัติ + เลือกประเภทการบริบาล | ⬜ |
| 6 | แฟ้มผู้ป่วย + ฟอร์มบริบาลทุกชนิด | ⬜ |
| 7 | ตัวชี้วัด, ส่งออก CSV, ประวัติแก้ไข | ⬜ |
| 8 | Deploy: pve1 → mirror VPS → failover → backup → restore drill | ⬜ |
| 9 | `his-relay` + เชื่อม API ผู้ป่วยของโรงพยาบาล | ⬜ |

## รอผู้ใช้

- [ ] ออกแบบหน้าจอด้วย Claude Design (prompt อยู่ในแชต) แล้วส่งผลกลับมา
- [ ] ยืนยันว่าการอนุมัติ PDPA ของโรงพยาบาลครอบคลุมการเก็บชื่อ-สกุลเต็ม
- [ ] เปิด Swagger ของโปรแกรมคิว (`/api/docs`) ดูว่ามี endpoint ค้นคลินิกจาก HN หรือ VN ไหม
- [ ] ขอ token ของ API กลาง (`/api/hosxp/patient`) และ service account ของโปรแกรมคิว
- [ ] เลือกเครื่องในโรงพยาบาลที่จะลง `his-relay`

## ไม่อยู่ในขอบเขตรอบนี้

- ระบบนัดติดตาม

## บันทึก

- 2026-10-12: สร้าง repo
